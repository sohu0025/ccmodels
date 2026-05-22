# Phase 3 — 高级功能 + 云端 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 MCP/Skills/Prompts 三大管理模块、NestJS 后端、MySQL 数据库、数据同步引擎、Web SPA。

**Architecture:** Phase 3 分为两个逻辑阶段：3A（桌面端 MCP/Skills/Prompts 三大模块，自包含不依赖后端）和 3B（NestJS 后端 + MySQL + 数据同步 + Web SPA）。桌面端继续沿用 Electron + SQLite + IPC 模式。后端使用 NestJS + Fastify + Prisma + MySQL。Web 版使用 React SPA 连接后端 API。

**Tech Stack:** NestJS 10 + Fastify + Prisma + MySQL 8 + Socket.io + JWT + React 18 + Tailwind CSS 4

---

## File Structure

### Desktop (MCP/Skills/Prompts)
```
apps/desktop/src/main/
  database/
    index.ts            — MODIFY: 添加 mcp_servers/skills/prompts/sync_queue 表
    mcp.ts              — CREATE: MCP 服务器 CRUD
    skills.ts           — CREATE: Skills CRUD + 冲突检测
    prompts.ts          — CREATE: Prompts CRUD
    sync-queue.ts        — CREATE: 同步队列入队/出队
  mcp-manager/
    index.ts            — CREATE: MCP 进程管理（启动/停止 stdio 进程）
  ipc-handlers.ts        — MODIFY: 添加 MCP/Skills/Prompts/Sync handler
  index.ts               — MODIFY: 启动 MCP 管理器

apps/desktop/src/preload/
  index.ts               — MODIFY: 暴露 MCP/Skills/Prompts/Sync API

packages/shared/src/types/
  mcp.ts                 — CREATE: MCPServer 接口
  skill.ts               — CREATE: Skill 接口
  prompt.ts              — CREATE: PromptConfig 接口
  sync.ts                — CREATE: SyncQueueItem 接口
  index.ts               — MODIFY: 更新导出

apps/desktop/src/renderer/
  hooks/
    useMcp.ts            — CREATE
    useSkills.ts         — CREATE
    usePrompts.ts        — CREATE
  pages/
    Mcp.tsx              — CREATE: MCP 管理页面
    Skills.tsx           — CREATE: Skills 管理页面
    Prompts.tsx          — CREATE: Prompts 管理页面
  components/
    Sidebar.tsx          — MODIFY: 添加新导航项
  router.tsx             — MODIFY: 添加新路由
```

### Backend + Web
```
apps/server/
  package.json           — CREATE
  tsconfig.json          — CREATE
  src/
    main.ts              — CREATE: NestJS bootstrap
    app.module.ts         — CREATE
    prisma/
      schema.prisma       — CREATE: MySQL schema
    modules/
      auth/              — Auth module (JWT)
      sync/              — Sync module
      usage/             — Usage queries
      provider/          — Provider queries
      session/           — Session queries

apps/web/
  package.json           — CREATE
  vite.config.ts         — CREATE
  src/
    App.tsx              — Web App (uses API, not Electron IPC)
    pages/               — Dashboard, Usage, Sessions, Compare
```

---

### Task 1: Shared 类型 + 数据库迁移（MCP/Skills/Prompts/Sync）

**Files:**
- Create: `packages/shared/src/types/mcp.ts`
- Create: `packages/shared/src/types/skill.ts`
- Create: `packages/shared/src/types/prompt.ts`
- Create: `packages/shared/src/types/sync.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `apps/desktop/src/main/database/index.ts`

- [ ] **Step 1: 创建 shared/types/mcp.ts**

```typescript
export type MCPTransport = 'stdio' | 'http' | 'sse';

export interface MCPServer {
  id: string;
  name: string;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  envVars?: Record<string, string>;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MCPServerFormData {
  name: string;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  envVars?: Record<string, string>;
}
```

- [ ] **Step 2: 创建 shared/types/skill.ts**

```typescript
export interface Skill {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  sourceUrl: string;
  installPath: string;
  isActive: boolean;
  config: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
}

export interface SkillFormData {
  name: string;
  sourceUrl: string;
  config?: Record<string, unknown>;
}
```

- [ ] **Step 3: 创建 shared/types/prompt.ts**

```typescript
export type PromptTarget = 'claude' | 'gemini' | 'codex' | 'all';

export interface PromptConfig {
  id: string;
  name: string;
  content: string;
  target: PromptTarget;
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptFormData {
  name: string;
  content: string;
  target: PromptTarget;
  tags: string[];
}
```

- [ ] **Step 4: 创建 shared/types/sync.ts**

```typescript
export type SyncAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  tableName: string;
  recordId: string;
  action: SyncAction;
  payload: string; // JSON serialized data
  createdAt: string;
  syncedAt: string | null;
  retryCount: number;
}

export interface SyncStatus {
  queueSize: number;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  isSyncing: boolean;
}
```

- [ ] **Step 5: 更新 shared/types/index.ts**

```typescript
export * from './provider';
export * from './model';
export * from './settings';
export * from './session';
export * from './usage';
export * from './mcp';
export * from './skill';
export * from './prompt';
export * from './sync';
```

- [ ] **Step 6: 修改 database/index.ts — 添加 4 张新表**

在 `initDatabase()` 的 `db.exec()` 调用中，在 budget_alerts 之后追加：

```sql
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      transport TEXT NOT NULL CHECK(transport IN ('stdio','http','sse')),
      command TEXT,
      args TEXT DEFAULT '[]',
      url TEXT,
      headers TEXT DEFAULT '{}',
      env_vars TEXT DEFAULT '{}',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '0.1.0',
      description TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL,
      install_path TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      config TEXT NOT NULL DEFAULT '{}',
      installed_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      target TEXT NOT NULL CHECK(target IN ('claude','gemini','codex','all')),
      is_active INTEGER NOT NULL DEFAULT 1,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced_at, retry_count);
```

Also update `insertDefaultSettings()` to add:
```typescript
    mcpAutoStart: 'true',
    syncEnabled: 'false',
    syncInterval: '60',
    syncServerUrl: '',
    syncAuthToken: '',
```

- [ ] **Step 7: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop
npx tsc -p tsconfig.main.json --noEmit
git -C /d/Works/GIT/CC-Switch add packages/shared/src/types/mcp.ts packages/shared/src/types/skill.ts packages/shared/src/types/prompt.ts packages/shared/src/types/sync.ts packages/shared/src/types/index.ts apps/desktop/src/main/database/index.ts
git -C /d/Works/GIT/CC-Switch commit -m "feat: add MCP/Skills/Prompts/Sync types and DB migrations"
```

---

### Task 2: Database 查询模块（MCP/Skills/Prompts/Sync）

**Files:**
- Create: `apps/desktop/src/main/database/mcp.ts`
- Create: `apps/desktop/src/main/database/skills.ts`
- Create: `apps/desktop/src/main/database/prompts.ts`
- Create: `apps/desktop/src/main/database/sync-queue.ts`

- [ ] **Step 1: 创建 database/mcp.ts**

```typescript
import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { MCPServer, MCPServerFormData } from '@ccmodels/shared';

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
```

- [ ] **Step 2: 创建 database/skills.ts**

```typescript
import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { Skill, SkillFormData } from '@ccmodels/shared';

export function getAllSkills(): Skill[] {
  return getDb().prepare('SELECT * FROM skills ORDER BY installed_at DESC').all().map(mapSkillRow);
}

export function getSkillById(id: string): Skill | null {
  const row = getDb().prepare('SELECT * FROM skills WHERE id = ?').get(id);
  return row ? mapSkillRow(row as any) : null;
}

export function createSkill(data: SkillFormData): Skill {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO skills (id, name, source_url, config)
    VALUES (?, ?, ?, ?)
  `).run(id, data.name, data.sourceUrl, JSON.stringify(data.config ?? {}));
  return getSkillById(id)!;
}

export function updateSkill(id: string, data: Partial<SkillFormData>): Skill | null {
  const existing = getSkillById(id);
  if (!existing) return null;
  const name = data.name ?? existing.name;
  const sourceUrl = data.sourceUrl ?? existing.sourceUrl;
  const config = JSON.stringify(data.config ?? existing.config);
  getDb().prepare("UPDATE skills SET name=?, source_url=?, config=?, updated_at=datetime('now') WHERE id=?").run(name, sourceUrl, config, id);
  return getSkillById(id);
}

export function deleteSkill(id: string): void {
  getDb().prepare('DELETE FROM skills WHERE id = ?').run(id);
}

export function setSkillActive(id: string, active: boolean): void {
  getDb().prepare("UPDATE skills SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(active ? 1 : 0, id);
}

export function checkSkillConflict(name: string, excludeId?: string): Skill | null {
  const row = excludeId
    ? getDb().prepare('SELECT * FROM skills WHERE name = ? AND id != ?').get(name, excludeId)
    : getDb().prepare('SELECT * FROM skills WHERE name = ?').get(name);
  return row ? mapSkillRow(row as any) : null;
}

function mapSkillRow(row: any): Skill {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description,
    author: row.author,
    sourceUrl: row.source_url,
    installPath: row.install_path,
    isActive: !!row.is_active,
    config: JSON.parse(row.config || '{}'),
    installedAt: row.installed_at,
    updatedAt: row.updated_at,
  };
}
```

- [ ] **Step 3: 创建 database/prompts.ts**

```typescript
import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { PromptConfig, PromptFormData } from '@ccmodels/shared';

export function getAllPrompts(): PromptConfig[] {
  return getDb().prepare('SELECT * FROM prompts ORDER BY created_at DESC').all().map(mapPromptRow);
}

export function getPromptById(id: string): PromptConfig | null {
  const row = getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(id);
  return row ? mapPromptRow(row as any) : null;
}

export function createPrompt(data: PromptFormData): PromptConfig {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO prompts (id, name, content, target, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.name, data.content, data.target, JSON.stringify(data.tags));
  return getPromptById(id)!;
}

export function updatePrompt(id: string, data: Partial<PromptFormData>): PromptConfig | null {
  const existing = getPromptById(id);
  if (!existing) return null;
  const name = data.name ?? existing.name;
  const content = data.content ?? existing.content;
  const target = data.target ?? existing.target;
  const tags = JSON.stringify(data.tags ?? existing.tags);
  getDb().prepare("UPDATE prompts SET name=?, content=?, target=?, tags=?, updated_at=datetime('now') WHERE id=?").run(name, content, target, tags, id);
  return getPromptById(id);
}

export function deletePrompt(id: string): void {
  getDb().prepare('DELETE FROM prompts WHERE id = ?').run(id);
}

export function setPromptActive(id: string, active: boolean): void {
  getDb().prepare("UPDATE prompts SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(active ? 1 : 0, id);
}

function mapPromptRow(row: any): PromptConfig {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    target: row.target,
    isActive: !!row.is_active,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
```

- [ ] **Step 4: 创建 database/sync-queue.ts**

```typescript
import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { SyncQueueItem, SyncAction, SyncStatus } from '@ccmodels/shared';

export function enqueueSync(tableName: string, recordId: string, action: SyncAction, data: Record<string, unknown>): void {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO sync_queue (id, table_name, record_id, action, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, tableName, recordId, action, JSON.stringify(data));
}

export function dequeuePending(limit = 50): SyncQueueItem[] {
  return getDb().prepare(`
    SELECT * FROM sync_queue WHERE synced_at IS NULL AND retry_count < 5
    ORDER BY created_at ASC LIMIT ?
  `).all(limit).map(mapSyncRow);
}

export function markSynced(id: string): void {
  getDb().prepare("UPDATE sync_queue SET synced_at = datetime('now') WHERE id = ?").run(id);
}

export function markFailed(id: string): void {
  getDb().prepare('UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?').run(id);
}

export function getSyncStatus(): SyncStatus {
  const queueSize = (getDb().prepare("SELECT COUNT(*) as c FROM sync_queue WHERE synced_at IS NULL").get() as any).c;
  const lastRow = getDb().prepare("SELECT synced_at FROM sync_queue WHERE synced_at IS NOT NULL ORDER BY synced_at DESC LIMIT 1").get() as any;
  return { queueSize, lastSyncAt: lastRow?.synced_at ?? null, lastSyncError: null, isSyncing: false };
}

export function cleanOldSynced(daysToKeep = 7): void {
  getDb().prepare("DELETE FROM sync_queue WHERE synced_at IS NOT NULL AND synced_at < datetime('now', ?)").run(`-${daysToKeep} days`);
}

function mapSyncRow(row: any): SyncQueueItem {
  return {
    id: row.id,
    tableName: row.table_name,
    recordId: row.record_id,
    action: row.action,
    payload: row.payload,
    createdAt: row.created_at,
    syncedAt: row.synced_at,
    retryCount: row.retry_count,
  };
}
```

- [ ] **Step 5: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop
npx tsc -p tsconfig.main.json --noEmit
git -C /d/Works/GIT/CC-Switch add apps/desktop/src/main/database/
git -C /d/Works/GIT/CC-Switch commit -m "feat: add MCP, Skills, Prompts, and Sync Queue database modules"
```

---

### Task 3: MCP Manager + IPC/Preload

**Files:**
- Create: `apps/desktop/src/main/mcp-manager/index.ts`
- Modify: `apps/desktop/src/main/ipc-handlers.ts`
- Modify: `apps/desktop/src/preload/index.ts`
- Modify: `apps/desktop/src/main/index.ts`

- [ ] **Step 1: 创建 mcp-manager/index.ts**

```typescript
import { ChildProcess, spawn } from 'node:child_process';
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
    const child = spawn(server.command, args, { env, stdio: ['pipe', 'pipe', 'pipe'] });
    child.on('exit', (code) => {
      console.log(`[CC Switch] MCP server ${server.name} exited with code ${code}`);
      processes.delete(server.id);
    });
    child.on('error', (err) => {
      console.error(`[CC Switch] MCP server ${server.name} error:`, err.message);
      processes.delete(server.id);
    });
    processes.set(server.id, child);
    console.log(`[CC Switch] Started MCP server: ${server.name}`);
    return true;
  } catch (err: any) {
    console.error(`[CC Switch] Failed to start MCP server ${server.name}:`, err.message);
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
```

- [ ] **Step 2: 修改 ipc-handlers.ts**

添加 import:
```typescript
import * as mcpDb from './database/mcp';
import * as skillDb from './database/skills';
import * as promptDb from './database/prompts';
import * as syncQueueDb from './database/sync-queue';
import { startMcpServer, stopMcpServer, getMcpProcessStatus } from './mcp-manager';
```

在 registerIpcHandlers 末尾添加 handler:
```typescript
  // ── MCP handlers ──
  ipcMain.handle('mcp:list', () => mcpDb.getAllMcpServers());
  ipcMain.handle('mcp:get', (_e, id) => mcpDb.getMcpServerById(id));
  ipcMain.handle('mcp:create', (_e, data) => mcpDb.createMcpServer(data));
  ipcMain.handle('mcp:update', (_e, id, data) => mcpDb.updateMcpServer(id, data));
  ipcMain.handle('mcp:delete', (_e, id) => { mcpDb.deleteMcpServer(id); });
  ipcMain.handle('mcp:setEnabled', (_e, id, enabled) => { mcpDb.setMcpEnabled(id, enabled); if (enabled) startMcpServer(mcpDb.getMcpServerById(id)!); else stopMcpServer(id); });
  ipcMain.handle('mcp:start', (_e, id) => { const s = mcpDb.getMcpServerById(id); return s ? startMcpServer(s) : false; });
  ipcMain.handle('mcp:stop', (_e, id) => stopMcpServer(id));
  ipcMain.handle('mcp:status', (_e, id) => getMcpProcessStatus(id));

  // ── Skills handlers ──
  ipcMain.handle('skill:list', () => skillDb.getAllSkills());
  ipcMain.handle('skill:get', (_e, id) => skillDb.getSkillById(id));
  ipcMain.handle('skill:create', (_e, data) => skillDb.createSkill(data));
  ipcMain.handle('skill:update', (_e, id, data) => skillDb.updateSkill(id, data));
  ipcMain.handle('skill:delete', (_e, id) => { skillDb.deleteSkill(id); });
  ipcMain.handle('skill:setActive', (_e, id, active) => { skillDb.setSkillActive(id, active); });
  ipcMain.handle('skill:checkConflict', (_e, name, excludeId) => skillDb.checkSkillConflict(name, excludeId));

  // ── Prompts handlers ──
  ipcMain.handle('prompt:list', () => promptDb.getAllPrompts());
  ipcMain.handle('prompt:get', (_e, id) => promptDb.getPromptById(id));
  ipcMain.handle('prompt:create', (_e, data) => promptDb.createPrompt(data));
  ipcMain.handle('prompt:update', (_e, id, data) => promptDb.updatePrompt(id, data));
  ipcMain.handle('prompt:delete', (_e, id) => { promptDb.deletePrompt(id); });
  ipcMain.handle('prompt:setActive', (_e, id, active) => { promptDb.setPromptActive(id, active); });

  // ── Sync handlers ──
  ipcMain.handle('sync:status', () => syncQueueDb.getSyncStatus());
  ipcMain.handle('sync:trigger', () => { /* sync logic in Phase 3b */ return { success: false, message: 'Cloud server not configured' }; });
```

- [ ] **Step 3: 修改 preload/index.ts**

在 `checkBudget` 之后和 `});` 之前追加:

```typescript
  // MCP
  listMcpServers: () => ipcRenderer.invoke('mcp:list'),
  getMcpServer: (id: string) => ipcRenderer.invoke('mcp:get', id),
  createMcpServer: (data: any) => ipcRenderer.invoke('mcp:create', data),
  updateMcpServer: (id: string, data: any) => ipcRenderer.invoke('mcp:update', id, data),
  deleteMcpServer: (id: string) => ipcRenderer.invoke('mcp:delete', id),
  setMcpEnabled: (id: string, enabled: boolean) => ipcRenderer.invoke('mcp:setEnabled', id, enabled),
  startMcpServer: (id: string) => ipcRenderer.invoke('mcp:start', id),
  stopMcpServer: (id: string) => ipcRenderer.invoke('mcp:stop', id),
  getMcpStatus: (id: string) => ipcRenderer.invoke('mcp:status', id),

  // Skills
  listSkills: () => ipcRenderer.invoke('skill:list'),
  getSkill: (id: string) => ipcRenderer.invoke('skill:get', id),
  createSkill: (data: any) => ipcRenderer.invoke('skill:create', data),
  updateSkill: (id: string, data: any) => ipcRenderer.invoke('skill:update', id, data),
  deleteSkill: (id: string) => ipcRenderer.invoke('skill:delete', id),
  setSkillActive: (id: string, active: boolean) => ipcRenderer.invoke('skill:setActive', id, active),
  checkSkillConflict: (name: string, excludeId?: string) => ipcRenderer.invoke('skill:checkConflict', name, excludeId),

  // Prompts
  listPrompts: () => ipcRenderer.invoke('prompt:list'),
  getPrompt: (id: string) => ipcRenderer.invoke('prompt:get', id),
  createPrompt: (data: any) => ipcRenderer.invoke('prompt:create', data),
  updatePrompt: (id: string, data: any) => ipcRenderer.invoke('prompt:update', id, data),
  deletePrompt: (id: string) => ipcRenderer.invoke('prompt:delete', id),
  setPromptActive: (id: string, active: boolean) => ipcRenderer.invoke('prompt:setActive', id, active),

  // Sync
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),
```

- [ ] **Step 4: 修改 index.ts 启动 MCP**

添加 import:
```typescript
import { startAllMcpServers, stopAllMcpServers } from './mcp-manager';
```

在 bootstrap 的 `initTray(mainWindow);` 后添加:
```typescript
  startAllMcpServers();
```

在 will-quit 的 stopBudgetChecking 后添加:
```typescript
  stopAllMcpServers();
```

- [ ] **Step 5: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop
npx tsc -p tsconfig.main.json --noEmit
git -C /d/Works/GIT/CC-Switch add apps/desktop/src/main/mcp-manager/ apps/desktop/src/main/ipc-handlers.ts apps/desktop/src/preload/index.ts apps/desktop/src/main/index.ts
git -C /d/Works/GIT/CC-Switch commit -m "feat: add MCP process manager, IPC handlers, and preload APIs"
```

---

### Task 4: React UI — MCP/Skills/Prompts 页面

**Files:**
- Create: `apps/desktop/src/renderer/hooks/useMcp.ts`
- Create: `apps/desktop/src/renderer/hooks/useSkills.ts`
- Create: `apps/desktop/src/renderer/hooks/usePrompts.ts`
- Create: `apps/desktop/src/renderer/pages/Mcp.tsx`
- Create: `apps/desktop/src/renderer/pages/Skills.tsx`
- Create: `apps/desktop/src/renderer/pages/Prompts.tsx`
- Modify: `apps/desktop/src/renderer/router.tsx`
- Modify: `apps/desktop/src/renderer/components/Sidebar.tsx`

- [ ] **Step 1: 创建 hooks/useMcp.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { MCPServer, MCPServerFormData } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function useMcp() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await api.listMcpServers();
    setServers(list);
    const stats: Record<string, string> = {};
    for (const s of list) stats[s.id] = await api.getMcpStatus(s.id);
    setStatuses(stats);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: MCPServerFormData) => { await api.createMcpServer(data); refresh(); };
  const update = async (id: string, data: Partial<MCPServerFormData>) => { await api.updateMcpServer(id, data); refresh(); };
  const remove = async (id: string) => { await api.deleteMcpServer(id); refresh(); };
  const toggleEnabled = async (id: string, enabled: boolean) => { await api.setMcpEnabled(id, enabled); refresh(); };
  const startStop = async (id: string, start: boolean) => {
    if (start) await api.startMcpServer(id); else await api.stopMcpServer(id);
    refresh();
  };

  return { servers, statuses, loading, refresh, create, update, remove, toggleEnabled, startStop };
}
```

- [ ] **Step 2: 创建 hooks/useSkills.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { Skill, SkillFormData } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setSkills(await api.listSkills());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: SkillFormData) => { await api.createSkill(data); refresh(); };
  const update = async (id: string, data: Partial<SkillFormData>) => { await api.updateSkill(id, data); refresh(); };
  const remove = async (id: string) => { await api.deleteSkill(id); refresh(); };
  const toggleActive = async (id: string, active: boolean) => { await api.setSkillActive(id, active); refresh(); };
  const checkConflict = (name: string, excludeId?: string) => api.checkSkillConflict(name, excludeId);

  return { skills, loading, refresh, create, update, remove, toggleActive, checkConflict };
}
```

- [ ] **Step 3: 创建 hooks/usePrompts.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { PromptConfig, PromptFormData } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function usePrompts() {
  const [prompts, setPrompts] = useState<PromptConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setPrompts(await api.listPrompts());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (data: PromptFormData) => { await api.createPrompt(data); refresh(); };
  const update = async (id: string, data: Partial<PromptFormData>) => { await api.updatePrompt(id, data); refresh(); };
  const remove = async (id: string) => { await api.deletePrompt(id); refresh(); };
  const toggleActive = async (id: string, active: boolean) => { await api.setPromptActive(id, active); refresh(); };

  return { prompts, loading, refresh, create, update, remove, toggleActive };
}
```

- [ ] **Step 4: 创建 pages/Mcp.tsx**

```typescript
import { useState } from 'react';
import { useMcp } from '../hooks/useMcp';
import type { MCPTransport, MCPServerFormData } from '@ccmodels/shared';

export function Mcp() {
  const { servers, statuses, loading, create, update, remove, toggleEnabled, startStop } = useMcp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MCPServerFormData & { id?: string }>({ name: '', transport: 'stdio', command: '', args: [], url: '', headers: {}, envVars: {} });

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">MCP Servers</h2>
          <p className="text-sm text-text-secondary mt-1">Manage MCP servers (stdio, HTTP, SSE)</p>
        </div>
        <button onClick={() => { setEditing(true); setForm({ name: '', transport: 'stdio', command: '', args: [], url: '', headers: {}, envVars: {} }); }}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover">+ Add MCP</button>
      </div>

      <div className="space-y-3">
        {servers.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No MCP servers configured</p>
        ) : servers.map((s) => (
          <div key={s.id} className="rounded-xl border border-border p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${statuses[s.id] === 'running' ? 'bg-success' : 'bg-text-secondary'}`} />
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary">{s.transport}</span>
              </div>
              {s.command && <p className="text-xs text-text-secondary font-mono">{s.command} {(s.args ?? []).join(' ')}</p>}
              {s.url && <p className="text-xs text-text-secondary">{s.url}</p>}
            </div>
            <div className="flex items-center gap-2">
              {s.transport === 'stdio' && (
                <button onClick={() => startStop(s.id, statuses[s.id] !== 'running')}
                  className={`text-xs px-2 py-1 rounded ${statuses[s.id] === 'running' ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                  {statuses[s.id] === 'running' ? 'Stop' : 'Start'}
                </button>
              )}
              <button onClick={() => { setEditing(true); setForm({ id: s.id, name: s.name, transport: s.transport, command: s.command, args: s.args, url: s.url, headers: s.headers, envVars: s.envVars }); }}
                className="text-xs px-2 py-1 rounded border border-border">Edit</button>
              <button onClick={() => remove(s.id)} className="text-xs px-2 py-1 rounded border border-border text-danger">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(false)}>
          <div className="bg-bg-primary rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{form.id ? 'Edit' : 'Add'} MCP Server</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm" />
              <select value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value as MCPTransport })} className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm">
                <option value="stdio">stdio</option>
                <option value="http">http</option>
                <option value="sse">sse</option>
              </select>
              {form.transport === 'stdio' && (
                <>
                  <input value={form.command ?? ''} onChange={(e) => setForm({ ...form, command: e.target.value })} placeholder="Command (e.g. node)" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono" />
                  <input value={(form.args ?? []).join(' ')} onChange={(e) => setForm({ ...form, args: e.target.value.split(' ') })} placeholder="Args (space separated)" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono" />
                </>
              )}
              {(form.transport === 'http' || form.transport === 'sse') && (
                <input value={form.url ?? ''} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="URL" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono" />
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={async () => {
                if (form.id) await update(form.id, form);
                else await create(form);
                setEditing(false);
              }} className="px-3 py-2 rounded-lg bg-accent text-white text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 创建 pages/Skills.tsx**

```typescript
import { useState } from 'react';
import { useSkills } from '../hooks/useSkills';
import type { SkillFormData, Skill } from '@ccmodels/shared';

export function Skills() {
  const { skills, loading, create, update, remove, toggleActive, checkConflict } = useSkills();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SkillFormData & { id?: string }>({ name: '', sourceUrl: '', config: {} });

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Skills</h2>
          <p className="text-sm text-text-secondary mt-1">Manage installed skills</p>
        </div>
        <button onClick={() => { setEditing(true); setForm({ name: '', sourceUrl: '', config: {} }); }}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover">+ Install Skill</button>
      </div>

      <div className="space-y-3">
        {skills.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No skills installed. Add a skill from a community repo URL.</p>
        ) : skills.map((s: Skill) => (
          <div key={s.id} className="rounded-xl border border-border p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-success' : 'bg-text-secondary'}`} />
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-xs text-text-secondary">v{s.version}</span>
              </div>
              <p className="text-xs text-text-secondary truncate max-w-md">{s.description || s.sourceUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(s.id, !s.isActive)}
                className="text-xs px-2 py-1 rounded border border-border">{s.isActive ? 'Disable' : 'Enable'}</button>
              <button onClick={() => remove(s.id)} className="text-xs px-2 py-1 rounded border border-border text-danger">Uninstall</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(false)}>
          <div className="bg-bg-primary rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">Install Skill</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Skill name" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm" />
              <input value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="Source URL (GitHub repo)" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={async () => {
                const conflict = await checkConflict(form.name);
                if (conflict) { alert(`Skill "${form.name}" is already installed`); return; }
                await create(form);
                setEditing(false);
              }} className="px-3 py-2 rounded-lg bg-accent text-white text-sm">Install</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: 创建 pages/Prompts.tsx**

```typescript
import { useState } from 'react';
import { usePrompts } from '../hooks/usePrompts';
import type { PromptTarget, PromptFormData, PromptConfig } from '@ccmodels/shared';

export function Prompts() {
  const { prompts, loading, create, update, remove, toggleActive } = usePrompts();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PromptFormData & { id?: string }>({ name: '', content: '', target: 'claude', tags: [] });

  const handleSave = async () => {
    if (form.id) await update(form.id, form);
    else await create(form);
    setEditing(false);
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Prompts</h2>
          <p className="text-sm text-text-secondary mt-1">Manage CLAUDE.md, AGENTS.md, GEMINI.md system prompts</p>
        </div>
        <button onClick={() => { setEditing(true); setForm({ name: '', content: '', target: 'claude', tags: [] }); }}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover">+ Add Prompt</button>
      </div>

      <div className="space-y-3">
        {prompts.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No prompts configured. Add system prompts for your CLI tools.</p>
        ) : prompts.map((p: PromptConfig) => (
          <div key={p.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary">{p.target}</span>
                <span className={`text-xs ${p.isActive ? 'text-success' : 'text-text-secondary'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(p.id, !p.isActive)}
                  className="text-xs px-2 py-1 rounded border border-border">{p.isActive ? 'Disable' : 'Enable'}</button>
                <button onClick={() => { setEditing(true); setForm({ id: p.id, name: p.name, content: p.content, target: p.target, tags: p.tags }); }}
                  className="text-xs px-2 py-1 rounded border border-border">Edit</button>
                <button onClick={() => remove(p.id)} className="text-xs px-2 py-1 rounded border border-border text-danger">Delete</button>
              </div>
            </div>
            <pre className="text-xs text-text-secondary bg-bg-secondary p-3 rounded-lg max-h-32 overflow-auto font-mono whitespace-pre-wrap">{p.content}</pre>
            {p.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {p.tags.map((t) => <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary">{t}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(false)}>
          <div className="bg-bg-primary rounded-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-4">{form.id ? 'Edit' : 'Add'} Prompt</h3>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm" />
              <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value as PromptTarget })} className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm">
                <option value="claude">Claude (CLAUDE.md)</option>
                <option value="gemini">Gemini (GEMINI.md)</option>
                <option value="codex">Codex (AGENTS.md)</option>
                <option value="all">All tools</option>
              </select>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="System prompt content..." rows={8}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm font-mono" />
              <input value={form.tags.join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="Tags (comma separated)" className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditing(false)} className="px-3 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={handleSave} className="px-3 py-2 rounded-lg bg-accent text-white text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: 修改 router.tsx**

添加 import:
```typescript
import { Mcp } from './pages/Mcp';
import { Skills } from './pages/Skills';
import { Prompts } from './pages/Prompts';
```

在 Route 中追加:
```typescript
        <Route path="/mcp" element={<Mcp />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/prompts" element={<Prompts />} />
```

- [ ] **Step 8: 修改 Sidebar.tsx**

在 `{ to: '/budget', ... }` 之前添加:
```typescript
  { to: '/mcp', label: 'MCP 管理', icon: '🔧' },
  { to: '/skills', label: 'Skills', icon: '🧩' },
  { to: '/prompts', label: 'Prompts', icon: '📝' },
```

- [ ] **Step 9: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop
npx vite build 2>&1
git -C /d/Works/GIT/CC-Switch add apps/desktop/src/renderer/
git -C /d/Works/GIT/CC-Switch commit -m "feat: add MCP, Skills, and Prompts management pages"
```

---

### Task 5: NestJS 后端 + Prisma + MySQL

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/main.ts`
- Create: `apps/server/src/app.module.ts`
- Create: `apps/server/prisma/schema.prisma`
- Create: `apps/server/src/modules/auth/auth.module.ts`
- Create: `apps/server/src/modules/auth/auth.service.ts`
- Create: `apps/server/src/modules/auth/auth.controller.ts`
- Create: `apps/server/src/modules/sync/sync.module.ts`
- Create: `apps/server/src/modules/sync/sync.controller.ts`
- Create: `apps/server/.env.example`

- [ ] **Step 1: 创建 apps/server/package.json**

```json
{
  "name": "@ccmodels/server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:push": "prisma db push"
  },
  "dependencies": {
    "@ccmodels/shared": "workspace:*",
    "@fastify/static": "^7.0.0",
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/platform-fastify": "^10.4.0",
    "@nestjs/websockets": "^10.4.0",
    "@prisma/client": "^5.20.0",
    "bcryptjs": "^2.4.3",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "socket.io": "^4.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/node": "^22.0.0",
    "@types/passport-jwt": "^4.0.0",
    "prisma": "^5.20.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: 创建 apps/server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: 创建 apps/server/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String   @default("")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model UserProvider {
  id       String @id @default(uuid())
  userId   String @map("user_id")
  provider String
  apiKey   String @map("api_key")
  settings String @default("{}")

  @@map("user_providers")
}

model UsageRecord {
  id               String   @id @default(uuid())
  userId           String   @map("user_id")
  providerId       String   @map("provider_id")
  modelId          String   @map("model_id")
  timestamp        DateTime @default(now())
  promptTokens     Int      @default(0) @map("prompt_tokens")
  completionTokens Int      @default(0) @map("completion_tokens")
  cacheHitTokens   Int      @default(0) @map("cache_hit_tokens")
  cost             Float    @default(0)
  cliTool          String   @map("cli_tool")

  @@index([userId, timestamp])
  @@map("usage_records")
}

model SyncLog {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  tableName String    @map("table_name")
  recordId  String    @map("record_id")
  action    String
  syncedAt  DateTime  @default(now()) @map("synced_at")

  @@map("sync_log")
}
```

- [ ] **Step 4: 创建 apps/server/src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.enableCors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true });
  await app.listen(3000, '0.0.0.0');
  console.log('[CC Switch Server] Running on http://localhost:3000');
}
bootstrap();
```

- [ ] **Step 5: 创建 apps/server/src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'cc-switch-secret', signOptions: { expiresIn: '7d' } }),
    AuthModule,
    SyncModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: 创建 auth module 文件**

`apps/server/src/modules/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'cc-switch-secret', signOptions: { expiresIn: '7d' } })],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

`apps/server/src/modules/auth/auth.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateToken(token: string): Promise<{ userId: string } | null> {
    try { return this.jwtService.verify(token); }
    catch { return null; }
  }

  signToken(userId: string): string {
    return this.jwtService.sign({ userId });
  }
}
```

`apps/server/src/modules/auth/auth.controller.ts`:
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('token')
  async getToken(@Body() body: { userId: string }) {
    const token = this.authService.signToken(body.userId);
    return { token };
  }
}
```

- [ ] **Step 7: 创建 sync module**

`apps/server/src/modules/sync/sync.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SyncController } from './sync.controller';

@Module({ imports: [AuthModule], controllers: [SyncController] })
export class SyncModule {}
```

`apps/server/src/modules/sync/sync.controller.ts`:
```typescript
import { Controller, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('api/sync')
export class SyncController {
  constructor(private authService: AuthService) {}

  @Post('push')
  async push(@Headers('authorization') auth: string, @Body() items: any[]) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    for (const item of items) {
      await prisma.syncLog.create({
        data: {
          userId: user.userId,
          tableName: item.tableName,
          recordId: item.recordId,
          action: item.action,
        },
      });
    }
    return { success: true, processed: items.length };
  }
}
```

- [ ] **Step 8: 创建 .env.example**

```env
DATABASE_URL=mysql://root:password@localhost:3306/cc_switch
JWT_SECRET=cc-switch-secret-change-in-production
```

- [ ] **Step 9: 安装依赖并验证编译**

```bash
cd /d/Works/GIT/CC-Switch
pnpm --filter @ccmodels/server install
cd apps/server
npx tsc --noEmit
npx prisma generate
```

- [ ] **Step 10: Commit**

```bash
git -C /d/Works/GIT/CC-Switch add apps/server/
git -C /d/Works/GIT/CC-Switch commit -m "feat: add NestJS backend with Prisma, JWT auth, and sync API"
```

---

### Task 6: Web SPA 骨架

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/pages/Dashboard.tsx`
- Create: `apps/web/src/pages/Usage.tsx`
- Create: `apps/web/src/styles/globals.css`

- [ ] **Step 1: 创建 apps/web/package.json**

```json
{
  "name": "@ccmodels/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@ccmodels/shared": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.28.0",
    "recharts": "^3.8.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

- [ ] **Step 2: 创建 apps/web/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174 },
  build: { outDir: 'dist' },
});
```

- [ ] **Step 3: 创建 apps/web/index.html, src/main.tsx, src/App.tsx**

`index.html`:
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>CC Switch - Web</title></head>
  <body><div id="root"></div><script type="module" src="./src/main.tsx"></script></body>
</html>
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
```

`src/App.tsx`:
```tsx
import { useState } from 'react';
import type { Provider, UsageStats } from '@ccmodels/shared';

const API_BASE = 'http://localhost:3000';

export function App() {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const login = async () => {
    // Simple token auth — in production, full login flow
    const res = await fetch(`${API_BASE}/api/auth/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'demo-user' }),
    });
    const { token: t } = await res.json();
    setToken(t);
  };

  const sync = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify([{ tableName: 'usage_records', recordId: '1', action: 'INSERT' }]),
    });
    setData(await res.json());
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold mb-4">CC Switch — Web Dashboard</h1>
      {!token ? (
        <button onClick={login} className="px-4 py-2 rounded bg-blue-600 text-white">Connect</button>
      ) : (
        <div>
          <p className="text-green-600 mb-4">Connected</p>
          <button onClick={sync} className="px-4 py-2 rounded bg-blue-600 text-white mb-4">Test Sync</button>
          {data && <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 创建 apps/web/src/styles/globals.css**

```css
@import "tailwindcss";
```

- [ ] **Step 5: 创建 web tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/web
pnpm install
npx vite build 2>&1
git -C /d/Works/GIT/CC-Switch add apps/web/
git -C /d/Works/GIT/CC-Switch commit -m "feat: add web SPA scaffold with auth and sync test"
```

---

### Phase 3 总览

| Task | 内容 | 文件数 |
|------|------|--------|
| 1 | Shared types + DB migrations (MCP/Skills/Prompts/Sync) | 6 |
| 2 | Database query modules (MCP/Skills/Prompts/Sync) | 4 |
| 3 | MCP Manager + IPC/Preload + app wiring | 4 |
| 4 | MCP/Skills/Prompts UI pages | 8 |
| 5 | NestJS backend + Prisma + MySQL + Auth | 10 |
| 6 | Web SPA scaffold | 8 |

**Phase 3 预计：~40 个文件，约 3-4 周工作量**
