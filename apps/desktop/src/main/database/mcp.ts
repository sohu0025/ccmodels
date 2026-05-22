import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import { enqueueSync } from './sync-queue';
import type { MCPServer, MCPServerFormData } from '@ccmodels/shared';

interface MCPServerRow {
  id: string;
  name: string;
  transport: string;
  command: string | null;
  args: string;
  url: string | null;
  headers: string;
  env_vars: string;
  is_enabled: number;
  created_at: string;
  updated_at: string;
}

export function getAllMcpServers(): MCPServer[] {
  const rows = getDb().prepare('SELECT * FROM mcp_servers ORDER BY created_at').all() as MCPServerRow[];
  return rows.map(mapMcpRow);
}

export function getMcpServerById(id: string): MCPServer | null {
  const row = getDb().prepare('SELECT * FROM mcp_servers WHERE id = ?').get(id) as MCPServerRow | undefined;
  return row ? mapMcpRow(row) : null;
}

export function createMcpServer(data: MCPServerFormData): MCPServer {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO mcp_servers (id, name, transport, command, args, url, headers, env_vars, is_enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, data.name, data.transport, data.command ?? null, JSON.stringify(data.args ?? []), data.url ?? null, JSON.stringify(data.headers ?? {}), JSON.stringify(data.envVars ?? {}), now, now);

  const server = getMcpServerById(id)!;
  enqueueSync('mcp_servers', id, 'INSERT', {
    id,
    name: server.name,
    transport: server.transport,
    command: server.command,
    args: server.args,
    url: server.url,
    isEnabled: server.isEnabled,
    createdAt: now,
  });

  return server;
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
  const now = new Date().toISOString();

  getDb().prepare(`
    UPDATE mcp_servers SET name=?, transport=?, command=?, args=?, url=?, headers=?, env_vars=?, updated_at=?
    WHERE id=?
  `).run(name, transport, command, args, url, headers, envVars, now, id);

  const updated = getMcpServerById(id)!;
  enqueueSync('mcp_servers', id, 'UPDATE', {
    id,
    name: updated.name,
    transport: updated.transport,
    command: updated.command,
    args: updated.args,
    url: updated.url,
    isEnabled: updated.isEnabled,
    createdAt: updated.createdAt,
  });

  return updated;
}

export function deleteMcpServer(id: string): void {
  getDb().prepare('DELETE FROM mcp_servers WHERE id = ?').run(id);
  enqueueSync('mcp_servers', id, 'DELETE', { id });
}

export function setMcpEnabled(id: string, enabled: boolean): void {
  const now = new Date().toISOString();
  getDb().prepare("UPDATE mcp_servers SET is_enabled = ?, updated_at = ? WHERE id = ?").run(enabled ? 1 : 0, now, id);

  const server = getMcpServerById(id);
  if (server) {
    enqueueSync('mcp_servers', id, 'UPDATE', {
      id,
      name: server.name,
      transport: server.transport,
      command: server.command,
      args: server.args,
      url: server.url,
      isEnabled: server.isEnabled,
      createdAt: server.createdAt,
    });
  }
}

function mapMcpRow(row: MCPServerRow): MCPServer {
  return {
    id: row.id,
    name: row.name,
    transport: row.transport as MCPServer['transport'],
    command: row.command ?? undefined,
    args: JSON.parse(row.args || '[]'),
    url: row.url ?? undefined,
    headers: JSON.parse(row.headers || '{}'),
    envVars: JSON.parse(row.env_vars || '{}'),
    isEnabled: !!row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
