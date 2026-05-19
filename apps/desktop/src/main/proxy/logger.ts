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
