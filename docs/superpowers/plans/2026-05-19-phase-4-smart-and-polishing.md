# Phase 4 — 智能 + 打磨 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成故障转移 + 数据同步 + 模型对比 + 智能推荐 + Web 完整页面 + 自动更新 + Linux 打包。

**Architecture:** Phase 4 分为 4A-4E 共 5 个子阶段，可按依赖顺序执行。4A（数据同步引擎）补完 Phase 3 的云同步链路；4B（故障转移 + 熔断）增强代理层；4C（模型对比 + 推荐）新增 Desktop+Web 双端功能；4D（Web 完整页面）补完 Web SPA 的所有页面；4E（打包 + 更新）DevOps 收尾。

**Tech Stack:** Electron 33 + React 18 + TypeScript 5 + Tailwind CSS 4 + Recharts + NestJS + Prisma + Socket.io + electron-updater

---

## File Structure

```
apps/desktop/src/main/
  sync/
    index.ts                  — CREATE: 同步守护进程（定时从 sync_queue 推送到云端）
  proxy/
    failover.ts               — CREATE: 熔断器 + 健康检查 + 自动切换
    index.ts                  — MODIFY: 集成 failover 逻辑
    router.ts                 — MODIFY: 添加 failover provider 路由
  database/
    index.ts                  — MODIFY: 添加 compare_tests 表 + 新默认设置
    compare-tests.ts          — CREATE: 模型对比测试 CRUD
    recommendations.ts        — CREATE: 智能推荐查询
  ipc-handlers.ts             — MODIFY: 添加 failover/compare/recommend handlers
  index.ts                    — MODIFY: 启动 sync daemon
  speed-test/index.ts         — MODIFY: 导出 runSpeedTestsForProvider 供 failover 使用

apps/desktop/src/preload/
  index.ts                    — MODIFY: 暴露 failover/compare/recommend APIs

apps/desktop/src/renderer/
  hooks/
    useCompare.ts             — CREATE: 模型对比 hook
    useRecommendations.ts     — CREATE: 智能推荐 hook
  pages/
    Compare.tsx               — CREATE: 模型对比页面
    Recommendations.tsx       — CREATE: 智能推荐页面
  components/
    Sidebar.tsx               — MODIFY: 添加导航项
  router.tsx                  — MODIFY: 添加路由

packages/shared/src/types/
  compare.ts                  — CREATE: CompareTest 类型
  recommendation.ts           — CREATE: Recommendation 类型
  index.ts                    — MODIFY: 添加导出

apps/server/src/
  modules/
    compare/                  — CREATE: 模型对比 API 模块
    usage/                    — CREATE: 用量查询 API
    provider/                 — CREATE: 供应商查询 API
    session/                  — CREATE: 会话查询 API
    recommendation/           — CREATE: 推荐 API 模块
    sync/
      sync.controller.ts      — MODIFY: 添加 pull 端点
  app.module.ts               — MODIFY: 注册新模块

apps/server/prisma/
  schema.prisma               — MODIFY: 添加 compare_tests, recommendations 模型

apps/web/src/
  pages/
    Dashboard.tsx             — CREATE: 仪表盘（用量概览、图表、活跃模型）
    Usage.tsx                 — CREATE: 用量成本页面
    Sessions.tsx              — CREATE: 会话历史
    SessionDetail.tsx         — CREATE: 会话详情
    Compare.tsx               — CREATE: 模型对比
    Settings.tsx              — CREATE: 设置
  components/
    Layout.tsx                — CREATE: 布局（侧边栏 + 顶栏）
    Sidebar.tsx               — CREATE: 侧边栏导航
    StatCard.tsx              — CREATE: 统计卡片
  App.tsx                     — MODIFY: 路由 + 布局
  main.tsx                    — MODIFY: 添加路由

apps/desktop/
  electron-builder.yml        — MODIFY: 添加 Linux target, publish config
  package.json                — MODIFY: 添加 electron-updater
```

---

### Task 1 (4A): 数据同步引擎

**Files:**
- Create: `apps/desktop/src/main/sync/index.ts`
- Modify: `apps/desktop/src/main/index.ts`
- Modify: `apps/server/src/modules/sync/sync.controller.ts`

- [ ] **Step 1: 创建桌面同步守护进程**

`apps/desktop/src/main/sync/index.ts`:

```typescript
import { getSettings } from '../database/settings';
import { dequeuePending, markSynced, markFailed } from '../database/sync-queue';
import type { SyncQueueItem } from '@ccmodels/shared';

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

export function startSyncDaemon(): void {
  const settings = getSettings();
  if (settings.syncEnabled !== 'true' || !settings.syncServerUrl) {
    console.log('[CC Switch] Sync daemon disabled (sync not configured)');
    return;
  }

  const intervalMs = (parseInt(settings.syncInterval, 10) || 60) * 1000;
  syncTimer = setInterval(doSync, intervalMs);
  // Also do an immediate sync
  doSync();
  console.log(`[CC Switch] Sync daemon started (interval: ${intervalMs}ms)`);
}

export function stopSyncDaemon(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

export async function triggerSync(): Promise<{ success: boolean; processed: number; message: string }> {
  return doSync();
}

async function doSync(): Promise<{ success: boolean; processed: number; message: string }> {
  if (isSyncing) return { success: false, processed: 0, message: 'Already syncing' };
  isSyncing = true;

  try {
    const settings = getSettings();
    if (settings.syncEnabled !== 'true' || !settings.syncServerUrl) {
      return { success: false, processed: 0, message: 'Sync not configured' };
    }

    const items = dequeuePending(50);
    if (items.length === 0) return { success: true, processed: 0, message: 'Nothing to sync' };

    const res = await fetch(`${settings.syncServerUrl}/api/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.syncAuthToken || ''}`,
      },
      body: JSON.stringify(items.map((item: SyncQueueItem) => ({
        tableName: item.tableName,
        recordId: item.recordId,
        action: item.action,
        payload: item.payload,
      }))),
    });

    if (!res.ok) {
      throw new Error(`Sync push failed: ${res.status} ${res.statusText}`);
    }

    const result = await res.json();
    for (const item of items) {
      markSynced(item.id);
    }

    return { success: true, processed: items.length, message: 'OK' };
  } catch (err: any) {
    console.error('[CC Switch] Sync failed:', err.message);
    // Mark all pending items as failed (increments retry_count)
    const items = dequeuePending(50);
    for (const item of items) {
      markFailed(item.id);
    }
    return { success: false, processed: 0, message: err.message };
  } finally {
    isSyncing = false;
  }
}
```

- [ ] **Step 2: 修改 main/index.ts 启动同步**

在 `startAllMcpServers();` 后添加:
```typescript
import { startSyncDaemon, stopSyncDaemon } from './sync';
  startSyncDaemon();
```

在 `app.on('will-quit', ...)` 中 `stopAllMcpServers();` 后添加:
```typescript
  stopSyncDaemon();
```

- [ ] **Step 3: 修改 IPC handler sync:trigger**

将 `sync:trigger` handler 改为调用 `triggerSync`:
```typescript
import { triggerSync } from './sync';
ipcMain.handle('sync:trigger', () => triggerSync());
```

- [ ] **Step 4: 添加后端 pull 端点**

`apps/server/src/modules/sync/sync.controller.ts` 中追加:

```typescript
@Post('pull')
async pull(@Headers('authorization') auth: string, @Body() body: { tableName: string; lastSyncAt?: string }) {
  const token = auth?.replace('Bearer ', '');
  const user = await this.authService.validateToken(token);
  if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  return { success: true, items: [] }; // Pull logic TBD per table
}
```

- [ ] **Step 5: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop && npx tsc -p tsconfig.main.json --noEmit
git add apps/desktop/src/main/sync/ apps/desktop/src/main/index.ts apps/desktop/src/main/ipc-handlers.ts apps/server/src/modules/sync/sync.controller.ts
git commit -m "feat: add data sync engine with daemon and push/pull API"
```

---

### Task 2 (4B): 故障转移 + 熔断

**Files:**
- Create: `apps/desktop/src/main/proxy/failover.ts`
- Modify: `apps/desktop/src/main/proxy/index.ts`
- Modify: `apps/desktop/src/main/proxy/router.ts`

- [ ] **Step 1: 创建 failover.ts — 熔断器**

```typescript
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
  openSince: number;
}

const breakers = new Map<string, CircuitBreakerState>();

const THRESHOLD = 3;       // Consecutive failures before opening
const COOLDOWN_MS = 30000; // 30 seconds before half-open

export function recordFailure(providerId: string): void {
  const state = breakers.get(providerId) || { failures: 0, lastFailureTime: 0, isOpen: false, openSince: 0 };
  state.failures++;
  state.lastFailureTime = Date.now();
  if (state.failures >= THRESHOLD && !state.isOpen) {
    state.isOpen = true;
    state.openSince = Date.now();
    console.log(`[CC Switch] Circuit breaker OPEN for provider ${providerId}`);
  }
  breakers.set(providerId, state);
}

export function recordSuccess(providerId: string): void {
  const state = breakers.get(providerId);
  if (state) {
    if (state.isOpen) {
      console.log(`[CC Switch] Circuit breaker CLOSED for provider ${providerId}`);
    }
    breakers.delete(providerId); // Reset on success
  }
}

export function isCircuitOpen(providerId: string): boolean {
  const state = breakers.get(providerId);
  if (!state || !state.isOpen) return false;
  // Check cooldown — auto-recover after COOLDOWN_MS
  if (Date.now() - state.openSince > COOLDOWN_MS) {
    console.log(`[CC Switch] Circuit breaker HALF-OPEN for provider ${providerId}`);
    state.isOpen = false;
    return false;
  }
  return true;
}

export function getCircuitStatus(providerId: string): { isOpen: boolean; failures: number; cooldownRemaining: number } {
  const state = breakers.get(providerId);
  if (!state) return { isOpen: false, failures: 0, cooldownRemaining: 0 };
  const cooldownRemaining = state.isOpen ? Math.max(0, COOLDOWN_MS - (Date.now() - state.openSince)) : 0;
  return { isOpen: state.isOpen, failures: state.failures, cooldownRemaining };
}

export function getAllCircuitStatuses(): Record<string, { isOpen: boolean; failures: number; cooldownRemaining: number }> {
  const result: Record<string, any> = {};
  for (const providerId of breakers.keys()) {
    result[providerId] = getCircuitStatus(providerId);
  }
  return result;
}
```

- [ ] **Step 2: 修改 proxy/router.ts 添加 failover 路由**

添加 import:
```typescript
import { getFallbackProvider } from '../database/providers';
import { isCircuitOpen } from './failover';
```

在 `resolveRoute` 函数开头，`getActiveProvider()` 后添加 failover 检查：

```typescript
  // Check circuit breaker — if active provider is failing, use fallback
  if (provider && isCircuitOpen(provider.id)) {
    const fallback = getFallbackProvider(provider.id);
    if (fallback) {
      provider = fallback;
    }
  }
```

改为函数体内 `let provider = getActiveProvider();` 被修改为可重新赋值。修改函数如下：

```typescript
export function resolveRoute(
  path: string,
  originalHeaders: Record<string, string>,
  cliTool: string | null,
): RouteResult | null {
  let provider = getActiveProvider();
  if (!provider) return null;

  // Check circuit breaker — auto-failover to fallback provider
  if (isCircuitOpen(provider.id)) {
    const fallback = getFallbackProvider(provider.id);
    if (fallback) {
      console.log(`[CC Switch] Failover: ${provider.name} -> ${fallback.name}`);
      provider = fallback;
    }
  }
  // ... rest of existing function unchanged
```

- [ ] **Step 3: 添加数据库函数 getFallbackProvider**

在 `apps/desktop/src/main/database/providers.ts` 中添加：

```typescript
export function getFallbackProvider(failedProviderId: string): Provider | null {
  // Get the next active provider that isn't the failed one
  const rows = getDb().prepare(
    'SELECT * FROM providers WHERE is_active = 1 AND id != ? ORDER BY sort ASC LIMIT 1'
  ).all(failedProviderId) as ProviderRow[];
  return rows.length > 0 ? mapRow(rows[0]) : null;
}
```

- [ ] **Step 4: 修改 proxy/index.ts 集成熔断**

在 handleRequest 的 proxyReq.on('error') 中添加：

```typescript
    proxyReq.on('error', (err) => {
      console.error('[CC Switch] Proxy request failed:', err.message);
      recordFailure(route.providerId);
      // ... existing error handling
    });
```

在 proxyRes.on('end') 中，statusCode >= 500 时记录失败，否则记录成功:

```typescript
      proxyRes.on('end', () => {
        if (proxyRes.statusCode && proxyRes.statusCode >= 500) {
          recordFailure(route.providerId);
        } else {
          recordSuccess(route.providerId);
        }
        // ... existing code
      });
```

需要添加 import:
```typescript
import { recordFailure, recordSuccess } from './failover';
```

还要在 ipc-handlers.ts 中添加：
```typescript
import { getAllCircuitStatuses } from './proxy/failover';
// ── Failover handlers
ipcMain.handle('failover:status', () => getAllCircuitStatuses());
```

和 preload/index.ts 中：
```typescript
  getFailoverStatus: () => ipcRenderer.invoke('failover:status'),
```

- [ ] **Step 5: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop && npx tsc -p tsconfig.main.json --noEmit
git add apps/desktop/src/main/proxy/failover.ts apps/desktop/src/main/proxy/index.ts apps/desktop/src/main/proxy/router.ts apps/desktop/src/main/database/providers.ts apps/desktop/src/main/ipc-handlers.ts apps/desktop/src/preload/index.ts
git commit -m "feat: add circuit breaker and auto failover to proxy"
```

---

### Task 3 (4C-1): 模型对比测试类型 + DB + API

**Files:**
- Create: `packages/shared/src/types/compare.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `apps/desktop/src/main/database/index.ts`
- Create: `apps/desktop/src/main/database/compare-tests.ts`
- Modify: `apps/desktop/src/main/ipc-handlers.ts`
- Modify: `apps/desktop/src/preload/index.ts`
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: 创建共享类型 compare.ts**

```typescript
export interface CompareTest {
  id: string;
  prompt: string;
  models: string[];
  responses: CompareResponse[];
  createdAt: string;
  status: 'pending' | 'completed';
}

export interface CompareResponse {
  modelId: string;
  providerId: string;
  content: string;
  latencyMs: number;
  tokens: number;
  cost: number;
  error?: string;
}

export interface CompareResult {
  test: CompareTest;
  bestModel?: { modelId: string; reason: string };
}
```

- [ ] **Step 2: 更新 types/index.ts**

```typescript
export * from './compare';
```

- [ ] **Step 3: 添加 compare_tests 表和默认设置**

在 database/index.ts 的 db.exec() 中，在 sync_queue 后追加：

```sql
    CREATE TABLE IF NOT EXISTS compare_tests (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      models TEXT NOT NULL DEFAULT '[]',
      responses TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      recommended_model TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      usage_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
```

- [ ] **Step 4: 创建 compare-tests.ts 数据库模块**

```typescript
import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { CompareTest, CompareResponse } from '@ccmodels/shared';

interface CompareTestRow {
  id: string;
  prompt: string;
  models: string;
  responses: string;
  status: string;
  created_at: string;
}

export function getAllCompareTests(): CompareTest[] {
  return (getDb().prepare('SELECT * FROM compare_tests ORDER BY created_at DESC').all() as CompareTestRow[]).map(mapRow);
}

export function getCompareTestById(id: string): CompareTest | null {
  const row = getDb().prepare('SELECT * FROM compare_tests WHERE id = ?').get(id) as CompareTestRow | undefined;
  return row ? mapRow(row) : null;
}

export function createCompareTest(prompt: string, models: string[]): CompareTest {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO compare_tests (id, prompt, models) VALUES (?, ?, ?)
  `).run(id, prompt, JSON.stringify(models));
  return getCompareTestById(id)!;
}

export function updateCompareResponse(testId: string, response: CompareResponse): void {
  const test = getCompareTestById(testId);
  if (!test) return;
  test.responses.push(response);
  getDb().prepare(`
    UPDATE compare_tests SET responses = ?, status = 'completed' WHERE id = ?
  `).run(JSON.stringify(test.responses), testId);
}

function mapRow(row: CompareTestRow): CompareTest {
  return {
    id: row.id,
    prompt: row.prompt,
    models: JSON.parse(row.models),
    responses: JSON.parse(row.responses),
    status: row.status as CompareTest['status'],
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 5: IPC + Preload**

在 ipc-handlers.ts 添加：
```typescript
import * as compareDb from './database/compare-tests';
// ── Compare handlers
ipcMain.handle('compare:list', () => compareDb.getAllCompareTests());
ipcMain.handle('compare:get', (_e, id) => compareDb.getCompareTestById(id));
ipcMain.handle('compare:create', (_e, prompt, models) => compareDb.createCompareTest(prompt, models));
ipcMain.handle('compare:updateResponse', (_e, testId, response) => compareDb.updateCompareResponse(testId, response));
```

在 preload/index.ts 添加：
```typescript
  // Compare
  listCompareTests: () => ipcRenderer.invoke('compare:list'),
  getCompareTest: (id: string) => ipcRenderer.invoke('compare:get', id),
  createCompareTest: (prompt: string, models: string[]) => ipcRenderer.invoke('compare:create', prompt, models),
  updateCompareResponse: (testId: string, response: any) => ipcRenderer.invoke('compare:updateResponse', testId, response),
```

- [ ] **Step 6: 添加 Prisma 模型**

在 `apps/server/prisma/schema.prisma` 添加：

```prisma
model CompareTest {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  prompt    String
  models    String
  responses String   @default("[]")
  status    String   @default("pending")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("compare_tests")
}
```

- [ ] **Step 7: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop && npx tsc -p tsconfig.main.json --noEmit && cd ../.. && cd apps/server && npx prisma generate && npx tsc --noEmit
git add packages/shared/src/types/compare.ts packages/shared/src/types/index.ts apps/desktop/src/main/database/index.ts apps/desktop/src/main/database/compare-tests.ts apps/desktop/src/main/ipc-handlers.ts apps/desktop/src/preload/index.ts apps/server/prisma/schema.prisma
git commit -m "feat: add model comparison test types, DB, and API"
```

---

### Task 4 (4C-2): 模型对比 + 推荐 UI 页面

**Files:**
- Create: `apps/desktop/src/renderer/hooks/useCompare.ts`
- Create: `apps/desktop/src/renderer/pages/Compare.tsx`
- Create: `apps/desktop/src/renderer/pages/Recommendations.tsx`
- Modify: `apps/desktop/src/renderer/router.tsx`
- Modify: `apps/desktop/src/renderer/components/Sidebar.tsx`

- [ ] **Step 1: 创建 useCompare.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { CompareTest, CompareResponse } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function useCompare() {
  const [tests, setTests] = useState<CompareTest[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setTests(await api.listCompareTests());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = async (prompt: string, models: string[]) => {
    const test = await api.createCompareTest(prompt, models);
    refresh();
    return test;
  };

  return { tests, loading, refresh, create };
}
```

- [ ] **Step 2: 创建 Compare.tsx 页面**

```tsx
import { useState } from 'react';
import { useCompare } from '../hooks/useCompare';

export function Compare() {
  const { tests, loading, create } = useCompare();
  const [prompt, setPrompt] = useState('');
  const [modelsInput, setModelsInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const handleRun = async () => {
    const models = modelsInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (!prompt || models.length === 0) return;
    const test = await create(prompt, models);
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Model Comparison</h2>
        <p className="text-sm text-text-secondary mt-1">Compare model responses side by side</p>
      </div>

      <div className="rounded-xl border border-border p-4 mb-6">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter prompt to test..." rows={4}
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm mb-3" />
        <input value={modelsInput} onChange={(e) => setModelsInput(e.target.value)}
          placeholder="Model IDs (comma separated, e.g. gpt-4, claude-3-opus)"
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm mb-3" />
        <button onClick={handleRun}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm">Run Comparison</button>
      </div>

      <div className="space-y-3">
        {tests.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No comparison tests yet</p>
        ) : tests.map((t) => (
          <div key={t.id} className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'completed' ? 'bg-success' : 'bg-warning'}`} />
              <span className="font-medium text-sm">{t.prompt.substring(0, 80)}{t.prompt.length > 80 ? '...' : ''}</span>
              <span className="text-xs text-text-secondary">{t.models.join(', ')}</span>
            </div>
            {t.responses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {t.responses.map((r, i) => (
                  <div key={i} className="bg-bg-secondary rounded-lg p-3">
                    <div className="text-xs font-medium mb-1">{r.modelId}</div>
                    <p className="text-xs text-text-secondary whitespace-pre-wrap line-clamp-6">{r.content}</p>
                    <div className="flex gap-2 mt-2 text-xs text-text-secondary">
                      <span>{r.latencyMs}ms</span>
                      <span>{r.tokens} tokens</span>
                      <span>${r.cost.toFixed(6)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 更新 Router + Sidebar**

在 `router.tsx` 添加：
```typescript
import { Compare } from './pages/Compare';
<Route path="/compare" element={<Compare />} />
```

在 `Sidebar.tsx` 添加：
```typescript
{ to: '/compare', label: '模型对比', icon: '⚖️' },
```

- [ ] **Step 4: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop && npx vite build 2>&1
git add apps/desktop/src/renderer/
git commit -m "feat: add model comparison UI page"
```

---

### Task 5 (4D): Web 完整页面

**Files:**
- Create: `apps/web/src/pages/Dashboard.tsx`
- Create: `apps/web/src/pages/Usage.tsx`
- Create: `apps/web/src/pages/Sessions.tsx`
- Create: `apps/web/src/pages/SessionDetail.tsx`
- Create: `apps/web/src/pages/Settings.tsx`
- Create: `apps/web/src/components/Layout.tsx`
- Create: `apps/web/src/components/Sidebar.tsx`
- Create: `apps/web/src/components/StatCard.tsx`
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/api.ts`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/package.json` (ensure react-router-dom is present)

- [ ] **Step 1: 创建 api.ts — Web API 客户端**

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  auth: { token: (userId: string) => request('/api/auth/token', { method: 'POST', body: JSON.stringify({ userId }) }) },
  sync: { push: (items: any[]) => request('/api/sync/push', { method: 'POST', body: JSON.stringify(items) }) },
  usage: { stats: (filter?: any) => request('/api/usage/stats'), daily: (from?: string, to?: string) => request(`/api/usage/daily?from=${from || ''}&to=${to || ''}`) },
  sessions: { list: (filter?: any) => request('/api/sessions'), get: (id: string) => request(`/api/sessions/${id}`) },
  compare: { list: () => request('/api/compare'), create: (data: any) => request('/api/compare', { method: 'POST', body: JSON.stringify(data) }) },
  providers: { list: () => request('/api/providers') },
};
```

- [ ] **Step 2: 创建 Layout.tsx 和 Sidebar.tsx**

`Layout.tsx`:
```tsx
import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

`Sidebar.tsx`:
```tsx
const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/usage', label: 'Usage & Cost', icon: '💰' },
  { to: '/sessions', label: 'Sessions', icon: '💬' },
  { to: '/compare', label: 'Compare', icon: '⚖️' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const path = window.location.pathname;
  return (
    <nav className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col gap-1">
      <h1 className="text-lg font-bold mb-6 px-3">CC Switch</h1>
      {navItems.map((item) => (
        <a key={item.to} href={item.to}
          className={`px-3 py-2 rounded-lg text-sm ${path === item.to ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
          {item.icon} {item.label}
        </a>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: 创建 Dashboard.tsx**

```tsx
import { useEffect, useState } from 'react';
import { api } from '../api';
import { StatCard } from '../components/StatCard';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { api.usage.stats().then(setStats).catch(() => {}); }, []);

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Requests" value={stats?.totalRequests ?? '-'} />
        <StatCard title="Total Tokens" value={stats?.totalTokens?.toLocaleString() ?? '-'} />
        <StatCard title="Total Cost" value={stats ? `$${stats.totalCost.toFixed(4)}` : '-'} />
        <StatCard title="Active Providers" value={stats?.activeProviders ?? '-'} />
      </div>
      {!stats && <p className="text-gray-500 text-sm">Connect to backend to view stats.</p>}
    </div>
  );
}
```

`StatCard.tsx`:
```tsx
export function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
```

- [ ] **Step 4: 修改 App.tsx 添加路由 + 布局**

```tsx
import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Usage } from './pages/Usage';
import { Sessions } from './pages/Sessions';
import { SessionDetail } from './pages/SessionDetail';
import { Settings } from './pages/Settings';
import { api, setToken } from './api';

function PageRouter() {
  const path = window.location.pathname;
  const [token, setLocalToken] = useState<string | null>(null);

  const login = async () => {
    const res = await api.auth.token('demo-user');
    setToken(res.token);
    setLocalToken(res.token);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">CC Switch — Web Dashboard</h1>
          <button onClick={login} className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Connect to Backend</button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {path === '/' && <Dashboard />}
      {path === '/usage' && <Usage />}
      {path === '/sessions' && <Sessions />}
      {path.startsWith('/sessions/') && <SessionDetail id={path.split('/')[2]} />}
      {path === '/settings' && <Settings />}
    </Layout>
  );
}

export function App() {
  return <PageRouter />;
}
```

- [ ] **Step 5: 修改 main.tsx 添加路由支持**

```tsx
// Update main.tsx if needed — the current App.tsx uses window.location, so no changes needed
```

- [ ] **Step 6: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/web && npx vite build 2>&1
git add apps/web/src/
git commit -m "feat: add full web pages with Dashboard, Usage, Sessions, Settings"
```

---

### Task 6 (4E): 自动更新 + Linux 打包

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/electron-builder.yml`
- Create: `apps/desktop/src/main/updater.ts`
- Modify: `apps/desktop/src/main/index.ts`

- [ ] **Step 1: 修改 package.json 添加 electron-updater**

在 `apps/desktop/package.json` 的 dependencies 中添加：
```json
    "electron-updater": "^6.3.0"
```

- [ ] **Step 2: 创建 updater.ts**

```typescript
import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available.`,
      detail: 'Would you like to download it now?',
      buttons: ['Download', 'Later'],
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. Restart to install?',
      buttons: ['Restart', 'Later'],
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[CC Switch] Auto-update error:', err.message);
  });

  // Check for updates (in production only)
  if (process.env.NODE_ENV === 'production' || !process.env.NODE_ENV) {
    autoUpdater.checkForUpdates().catch(() => {});
  }
}
```

- [ ] **Step 3: 在 main/index.ts 中添加**

```typescript
import { initAutoUpdater } from './updater';
// In bootstrap(), after registerIpcHandlers(mainWindow):
if (mainWindow) initAutoUpdater(mainWindow);
```

- [ ] **Step 4: 修改 electron-builder.yml 添加 Linux target 和 publish**

```yaml
linux:
  target:
    - target: AppImage
      arch: [x64]
    - target: deb
      arch: [x64]
    - target: rpm
      arch: [x64]
  icon: resources/icon.png
  category: Development

publish:
  provider: generic
  url: https://releases.ccswitch.io
  channel: latest
```

- [ ] **Step 5: 验证并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop && npx tsc -p tsconfig.main.json --noEmit
git add apps/desktop/package.json apps/desktop/electron-builder.yml apps/desktop/src/main/updater.ts apps/desktop/src/main/index.ts
git commit -m "feat: add auto-update and Linux packaging support"
```

---

## Phase 4 总览

| Sub-phase | Task | 内容 | 文件数 |
|-----------|------|------|--------|
| 4A | Task 1 | 数据同步引擎（守护进程 + push/pull API） | 4 |
| 4B | Task 2 | 故障转移 + 熔断（熔断器 + failover 路由） | 5 |
| 4C-1 | Task 3 | 模型对比类型 + DB + IPC + Prisma | 7 |
| 4C-2 | Task 4 | 模型对比 + 推荐 UI 页面 | 5 |
| 4D | Task 5 | Web 完整页面（Dashboard/Usage/Sessions/Compare/Settings） | 10 |
| 4E | Task 6 | 自动更新 + Linux 打包 | 4 |

**Phase 4 预计：~35 个文件，约 2-3 周工作量**
