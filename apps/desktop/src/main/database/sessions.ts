import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { Session, SessionMessage, SessionFilter, SessionListResult } from '@ccswitch/shared';

export function createSession(cliTool: string, providerId: string, providerName: string, modelId: string): Session {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO sessions (id, cli_tool, provider_id, provider_name, model_id, started_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, cliTool, providerId, providerName, modelId, now);
  return getSessionById(id)!;
}

export function getSessionById(id: string): Session | null {
  const row = getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
  return row ? mapSession(row) : null;
}

export function listSessions(filter: SessionFilter): SessionListResult {
  let where = '1=1';
  const params: any[] = [];

  if (filter.cliTool) { where += ' AND cli_tool = ?'; params.push(filter.cliTool); }
  if (filter.providerId) { where += ' AND provider_id = ?'; params.push(filter.providerId); }
  if (filter.dateFrom) { where += ' AND started_at >= ?'; params.push(filter.dateFrom); }
  if (filter.dateTo) { where += ' AND started_at <= ?'; params.push(filter.dateTo); }
  if (filter.searchQuery) {
    where += ' AND (summary LIKE ? OR id LIKE ?)';
    params.push(`%${filter.searchQuery}%`, `%${filter.searchQuery}%`);
  }

  const total = (getDb().prepare(`SELECT COUNT(*) as count FROM sessions WHERE ${where}`).get(...params) as any).count;
  const offset = (filter.page - 1) * filter.pageSize;
  const rows = getDb().prepare(`SELECT * FROM sessions WHERE ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`).all(...params, filter.pageSize, offset) as any[];

  return { sessions: rows.map(mapSession), total, page: filter.page, pageSize: filter.pageSize };
}

export function getSessionMessages(sessionId: string): SessionMessage[] {
  return getDb().prepare('SELECT * FROM session_messages WHERE session_id = ? ORDER BY timestamp ASC').all(sessionId) as SessionMessage[];
}

export function addSessionMessage(sessionId: string, role: string, content: string, tokens: number, metadata = '{}'): SessionMessage {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO session_messages (id, session_id, role, content, tokens, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, sessionId, role, content, tokens, now, metadata);
  return { id, sessionId, role: role as any, content, tokens, timestamp: now, metadata };
}

export function updateSessionEnd(sessionId: string, totalTokens: number, totalCost: number): void {
  const now = new Date().toISOString();
  const msgCount = (getDb().prepare('SELECT COUNT(*) as count FROM session_messages WHERE session_id = ?').get(sessionId) as any).count;
  getDb().prepare(`
    UPDATE sessions SET ended_at=?, message_count=?, total_tokens=total_tokens+?, total_cost=total_cost+? WHERE id=?
  `).run(now, msgCount, totalTokens, totalCost, sessionId);
}

function mapSession(row: any): Session {
  return {
    id: row.id,
    cliTool: row.cli_tool,
    providerId: row.provider_id,
    providerName: row.provider_name,
    modelId: row.model_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    messageCount: row.message_count,
    totalTokens: row.total_tokens,
    totalCost: row.total_cost,
    summary: row.summary,
  };
}
