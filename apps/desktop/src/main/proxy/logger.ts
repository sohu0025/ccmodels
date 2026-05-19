import { getDb } from '../database';
import { randomUUID } from 'node:crypto';

export interface RequestLog {
  providerId: string;
  modelId: string;
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  cliTool: string;
}

export function logRequest(log: RequestLog): void {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  try {
    getDb().prepare(`
      INSERT INTO usage_records (id, provider_id, model_id, timestamp, prompt_tokens, completion_tokens, cost, cli_tool)
      VALUES (?, ?, ?, ?, 0, 0, 0, ?)
    `).run(id, log.providerId, log.modelId, timestamp, log.cliTool);
  } catch (err) {
    console.error('[CC Switch] Failed to log request:', err);
  }
}

export function logRequestWithUsage(
  log: RequestLog & { promptTokens: number; completionTokens: number; cacheHitTokens?: number; cost: number },
): void {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  try {
    getDb().prepare(`
      INSERT INTO usage_records (id, provider_id, model_id, timestamp, prompt_tokens, completion_tokens, cache_hit_tokens, cost, cli_tool)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, log.providerId, log.modelId, timestamp,
      log.promptTokens, log.completionTokens, log.cacheHitTokens ?? 0, log.cost, log.cliTool,
    );
  } catch (err) {
    console.error('[CC Switch] Failed to log usage:', err);
  }
}

export function parseUsageFromResponse(
  body: string,
  modelId: string,
): { promptTokens: number; completionTokens: number; cacheHitTokens: number; cost: number } | null {
  try {
    const json = JSON.parse(body);
    if (json.usage) {
      const promptTokens = json.usage.prompt_tokens ?? json.usage.promptTokens ?? 0;
      const completionTokens = json.usage.completion_tokens ?? json.usage.completionTokens ?? 0;
      const cacheHitTokens = json.usage.cache_hit_tokens ?? json.usage.cacheReadTokens ?? 0;
      const cost = estimateCost(promptTokens, completionTokens, modelId);
      return { promptTokens, completionTokens, cacheHitTokens, cost };
    }
    return null;
  } catch {
    return null;
  }
}

function estimateCost(promptTokens: number, completionTokens: number, _modelId: string): number {
  const inputPrice = 3 / 1_000_000;
  const outputPrice = 15 / 1_000_000;
  return promptTokens * inputPrice + completionTokens * outputPrice;
}
