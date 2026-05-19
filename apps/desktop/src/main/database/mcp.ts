import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { MCPServer, MCPServerFormData } from '@ccswitch/shared';

export function getAllMcpServers(): MCPServer[] {
  return getDb().prepare('SELECT * FROM mcp_servers ORDER BY created_at').all().map(mapMcpRow);
}

export function getMcpServerById(id: string): MCPServer | null {
  const row = getDb().prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id);
  return row ? mapMcpRow(row as any) : null;
}

export function createMcpServer(data: MCPServerFormData): MCPServer {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO mcp_servers (id, name, transport, command, args, url, headers, env_vars)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.transport, data.command ?? null, JSON.stringify(data.args ?? []), data.url ?? null, JSON.stringify(data.headers ?? {}), JSON.stringify(data.envVars ?? {}));
  return getMcpServerById(id)!;
}

export function updateMcpServer(id: string, data: Partial<MCPServerFormData>): MCPServer | null {
  const existing = getMcpServerById(id);
  if (!existing) return null;
  const name = data.name ?? existing.name;
  const transport = data.transport ?? existing.transport;
  const command = data.command !== undefined ? data.command : existing.command;
  const args = JSON.stringify(data.args ?? existing.args ?? []);
  const url = data.url !== undefined ? data.url : existing.url;
  const headers = JSON.stringify(data.headers ?? existing.headers ?? {});
  const envVars = JSON.stringify(data.envVars ?? existing.envVars ?? {});
  getDb().prepare(`
    UPDATE mcp_servers SET name=?, transport=?, command=?, args=?, url=?, headers=?, env_vars=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, transport, command, args, url, headers, envVars, id);
  return getMcpServerById(id);
}

export function deleteMcpServer(id: string): void {
  getDb().prepare('DELETE FROM mcp_servers WHERE id = ?').run(id);
}

export function setMcpEnabled(id: string, enabled: boolean): void {
  getDb().prepare("UPDATE mcp_servers SET is_enabled = ?, updated_at = datetime('now') WHERE id = ?").run(enabled ? 1 : 0, id);
}

function mapMcpRow(row: any): MCPServer {
  return {
    id: row.id,
    name: row.name,
    transport: row.transport,
    command: row.command,
    args: JSON.parse(row.args || '[]'),
    url: row.url,
    headers: JSON.parse(row.headers || '{}'),
    envVars: JSON.parse(row.env_vars || '{}'),
    isEnabled: !!row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
