import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { getAllMcpServers } from '../database/mcp';
import type { MCPServer } from '@ccmodels/shared';

const processes = new Map<string, ChildProcess>();

export function startAllMcpServers(): void {
  const servers = getAllMcpServers();
  for (const server of servers) {
    if (server.isEnabled && server.transport === 'stdio' && server.command) {
      startMcpServer(server);
    }
  }
}

export function startMcpServer(server: MCPServer): boolean {
  if (processes.has(server.id)) return true;
  if (server.transport !== 'stdio' || !server.command) return false;

  try {
    const args = server.args ?? [];
    const env = { ...process.env, ...server.envVars };
    const child = spawn(server.command, args, { env, stdio: ['pipe', 'ignore', 'ignore'] });
    child.on('exit', (code) => {
      console.log(`[CC Models] MCP server ${server.name} exited with code ${code}`);
      processes.delete(server.id);
    });
    child.on('error', (err) => {
      console.error(`[CC Models] MCP server ${server.name} error:`, err.message);
      processes.delete(server.id);
    });
    processes.set(server.id, child);
    console.log(`[CC Models] Started MCP server: ${server.name}`);
    return true;
  } catch (err: any) {
    console.error(`[CC Models] Failed to start MCP server ${server.name}:`, err.message);
    return false;
  }
}

export function stopMcpServer(id: string): boolean {
  const child = processes.get(id);
  if (!child) return false;
  child.kill();
  processes.delete(id);
  return true;
}

export function stopAllMcpServers(): void {
  for (const [id] of processes) stopMcpServer(id);
}

export function getMcpProcessStatus(id: string): 'running' | 'stopped' | 'not-found' {
  if (!processes.has(id)) return 'not-found';
  const child = processes.get(id)!;
  return child.exitCode === null ? 'running' : 'stopped';
}
