import { getDb } from '../database';
import { randomUUID } from 'node:crypto';
import { enqueueSync } from '../database/sync-queue';
import { createSession, updateSessionEnd } from '../database/sessions';
import { getProviderById } from '../database/providers';

export interface RequestLog {
  providerId: string;
  modelId: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  cliTool: string;
}

/**
 * Simple session tracking: group requests into sessions by provider+model+cliTool
 * with a 30-minute idle timeout.
 */
export interface SessionKey {
  providerId: string;
  modelId: string;
  cliTool: string;
}

let activeSessions = new Map<string, { sessionId: string; lastActivity: number }>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function getSessionKey(key: SessionKey): string {
  return `${key.providerId}:${key.modelId}:${key.cliTool}`;
}

export function getOrCreateSession(key: SessionKey): string {
  const sk = getSessionKey(key);
  const now = Date.now();
  const existing = activeSessions.get(sk);

  if (existing && (now - existing.lastActivity) < SESSION_TIMEOUT_MS) {
    existing.lastActivity = now;
    return existing.sessionId;
  }

  // Create new session — resolve provider name from the actual provider used
  const provider = getProviderById(key.providerId);
  const session = createSession(
    key.cliTool,
    key.providerId,
    provider?.name ?? 'Unknown',
    key.modelId,
  );

  activeSessions.set(sk, { sessionId: session.id, lastActivity: now });

  // Enqueue for sync
  enqueueSync('sessions', session.id, 'INSERT', {
    id: session.id,
    cliTool: session.cliTool,
    providerId: session.providerId,
    providerName: session.providerName,
    modelId: session.modelId,
    summary: session.summary,
    messageCount: 0,
    totalTokens: 0,
    totalCost: 0,
    startedAt: session.startedAt,
  });

  return session.id;
}

export function logRequest(log: RequestLog, sessionId?: string): void {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  try {
    getDb().prepare(`
      INSERT INTO usage_records (id, session_id, provider_id, model_id, timestamp, prompt_tokens, completion_tokens, cost, cli_tool)
      VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)
    `).run(id, sessionId ?? null, log.providerId, log.modelId, timestamp, log.cliTool);

    // Update session end time + message count even for failed requests
    if (sessionId) {
      updateSessionEnd(sessionId, 0, 0);
    }

    // Enqueue for sync
    enqueueSync('usage_records', id, 'INSERT', {
      id,
      providerId: log.providerId,
      providerName: '',
      modelId: log.modelId,
      timestamp,
      promptTokens: 0,
      completionTokens: 0,
      cacheHitTokens: 0,
      cost: 0,
      cliTool: log.cliTool,
      sessionId,
    });
  } catch (err) {
    console.error('[CC Models] Failed to log request:', err);
  }
}

export function logRequestWithUsage(
  log: RequestLog & { promptTokens: number; completionTokens: number; cacheHitTokens?: number; cost: number },
): void {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  try {
    // Get or create session
    const sessionId = getOrCreateSession({
      providerId: log.providerId,
      modelId: log.modelId,
      cliTool: log.cliTool,
    });

    getDb().prepare(`
      INSERT INTO usage_records (id, session_id, provider_id, model_id, timestamp, prompt_tokens, completion_tokens, cache_hit_tokens, cost, cli_tool)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, sessionId, log.providerId, log.modelId, timestamp,
      log.promptTokens, log.completionTokens, log.cacheHitTokens ?? 0, log.cost, log.cliTool,
    );

    // Update session end
    updateSessionEnd(sessionId, log.promptTokens + log.completionTokens + (log.cacheHitTokens ?? 0), log.cost);

    // Get updated session for sync
    const session = getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
    if (session) {
      enqueueSync('sessions', sessionId, 'UPDATE', {
        id: session.id,
        cliTool: session.cli_tool,
        providerId: session.provider_id,
        providerName: session.provider_name,
        modelId: session.model_id,
        summary: session.summary,
        messageCount: session.message_count,
        totalTokens: session.total_tokens,
        totalCost: session.total_cost,
        startedAt: session.started_at,
        endedAt: session.ended_at,
      });
    }

    // Enqueue usage for sync
    const provider = getProviderById(log.providerId);
    enqueueSync('usage_records', id, 'INSERT', {
      id,
      providerId: log.providerId,
      providerName: provider?.name ?? '',
      modelId: log.modelId,
      timestamp,
      promptTokens: log.promptTokens,
      completionTokens: log.completionTokens,
      cacheHitTokens: log.cacheHitTokens ?? 0,
      cost: log.cost,
      cliTool: log.cliTool,
      sessionId,
    });
  } catch (err) {
    console.error('[CC Models] Failed to log usage:', err);
  }
}

export function parseUsageFromResponse(
  body: string,
  modelId: string,
): { promptTokens: number; completionTokens: number; cacheHitTokens: number; cost: number } | null {
  try {
    const json = JSON.parse(body);
    if (json.usage) {
      // Chat Completions format: prompt_tokens / completion_tokens
      // Anthropic Messages format: input_tokens / output_tokens
      const promptTokens = json.usage.prompt_tokens ?? json.usage.input_tokens ?? json.usage.promptTokens ?? 0;
      const completionTokens = json.usage.completion_tokens ?? json.usage.output_tokens ?? json.usage.completionTokens ?? 0;
      const cacheHitTokens = json.usage.cache_hit_tokens ?? json.usage.cacheReadTokens ?? json.usage.cache_creation_input_tokens ?? 0;
      const inputPrice = 3 / 1_000_000;
      const outputPrice = 15 / 1_000_000;
      const cost = promptTokens * inputPrice + completionTokens * outputPrice;
      return { promptTokens, completionTokens, cacheHitTokens, cost };
    }
    // Google Gemini format: usageMetadata with promptTokenCount / candidatesTokenCount
    if (json.usageMetadata) {
      const promptTokens = json.usageMetadata.promptTokenCount ?? json.usageMetadata.prompt_tokens ?? 0;
      const completionTokens = json.usageMetadata.candidatesTokenCount ?? json.usageMetadata.completion_tokens ?? 0;
      const inputPrice = 3 / 1_000_000;
      const outputPrice = 15 / 1_000_000;
      return { promptTokens, completionTokens, cacheHitTokens: 0, cost: promptTokens * inputPrice + completionTokens * outputPrice };
    }
    return null;
  } catch {
    return null;
  }
}
