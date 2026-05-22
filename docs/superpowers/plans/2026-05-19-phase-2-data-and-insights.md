# Phase 2 — 数据与洞察 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现用量追踪、成本可视化、会话历史、供应商测速、预算告警五大数据模块。

**Architecture:** 在 Phase 1 已有 infrastructure 上增量开发。主进程新增数据库表、查询模块、后台定时任务；渲染进程新增 4 个页面（用量、会话历史、测速、预算），通过 IPC 获取数据。代理服务器的 logger 增强以捕获真实 Token 用量和缓存命中率。Recharts 图表在前端渲染。

**Tech Stack:** Electron 33 + React 18 + Recharts + better-sqlite3 + chokidar

---

## File Structure

```
apps/desktop/src/main/
  database/
    index.ts          — MODIFY: 添加 sessions/speed_tests/budget_alerts 表
    usage.ts          — CREATE: 用量统计查询（按天/供应商/模型聚合）
    sessions.ts       — CREATE: 会话 CRUD + 消息存储 + 搜索
    speed-tests.ts    — CREATE: 测速记录存储
    budget-alerts.ts  — CREATE: 预算查询 + 检查逻辑
  proxy/
    logger.ts         — MODIFY: 解析响应体获取真实 token 数
  speed-test/
    index.ts          — CREATE: 定时测速模块
  budget-checker/
    index.ts          — CREATE: 定时预算检查模块
  ipc-handlers.ts     — MODIFY: 添加新 IPC handler
  index.ts            — MODIFY: 启动 speed-test/budget-checker

apps/desktop/src/preload/
  index.ts            — MODIFY: 暴露新 API

packages/shared/src/types/
  session.ts          — CREATE: Session/SessionMessage 接口
  usage.ts            — CREATE: UsageStats/DailyUsage 接口
  index.ts            — MODIFY: 更新导出

apps/desktop/src/renderer/
  hooks/
    useUsage.ts       — CREATE: 用量数据 hook
    useSessions.ts    — CREATE: 会话 hook
    useSpeedTests.ts  — CREATE: 测速 hook
    useBudget.ts      — CREATE: 预算 hook
  pages/
    Usage.tsx          — CREATE: 用量成本页面（Recharts）
    Sessions.tsx       — CREATE: 会话历史页面
    SessionDetail.tsx  — CREATE: 会话详情/回放
    SpeedTest.tsx      — CREATE: 供应商测速页面
    Budget.tsx         — CREATE: 预算告警页面
  components/
    Sidebar.tsx        — MODIFY: 添加新导航项
    UsageChart.tsx     — CREATE: Recharts 图表封装组件
  router.tsx           — MODIFY: 添加新路由
```

---

### Task 1: Shared 类型 + 数据库迁移

**Files:**
- Create: `packages/shared/src/types/session.ts`
- Create: `packages/shared/src/types/usage.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/types/settings.ts`
- Modify: `apps/desktop/src/main/database/index.ts`
- Create: `apps/desktop/src/main/database/usage.ts`
- Create: `apps/desktop/src/main/database/sessions.ts`
- Create: `apps/desktop/src/main/database/speed-tests.ts`
- Create: `apps/desktop/src/main/database/budget-alerts.ts`

- [ ] **Step 1: 创建 shared/types/session.ts**

```typescript
export interface Session {
  id: string;
  cliTool: string;
  providerId: string;
  providerName: string;
  modelId: string;
  startedAt: string;
  endedAt: string | null;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  summary: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: number;
  timestamp: string;
  metadata: string; // JSON string for extra data
}

export interface SessionFilter {
  cliTool?: string;
  providerId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  page: number;
  pageSize: number;
}

export interface SessionListResult {
  sessions: Session[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 2: 创建 shared/types/usage.ts**

```typescript
export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  cacheHitRate: number;
  periodStart: string;
  periodEnd: string;
}

export interface DailyUsage {
  date: string;
  promptTokens: number;
  completionTokens: number;
  cacheHitTokens: number;
  cost: number;
  requests: number;
}

export interface ProviderUsageSummary {
  providerId: string;
  providerName: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
}

export interface ModelUsageSummary {
  modelId: string;
  providerName: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
}

export interface UsageFilter {
  dateFrom?: string;
  dateTo?: string;
  providerId?: string;
  modelId?: string;
  groupBy: 'day' | 'provider' | 'model';
}
```

- [ ] **Step 3: 修改 shared/types/settings.ts — 添加预算设置字段**

```typescript
export interface AppSettings {
  theme: Theme;
  locale: Locale;
  autoStart: boolean;
  lightweightMode: boolean;
  proxyPort: number;
  autoConfigCli: boolean;
  syncEnabled: boolean;
  syncInterval: number;
  // Phase 2 settings
  monthlyBudgetLimit: number;       // 月度预算上限（美元）
  budgetNotifyThreshold: number;    // 通知阈值百分比 0-100
  speedTestInterval: number;        // 测速间隔（分钟），0=禁用
}
```

- [ ] **Step 4: 更新 shared/types/index.ts**

```typescript
export * from './provider';
export * from './model';
export * from './settings';
export * from './session';
export * from './usage';
```

- [ ] **Step 5: 修改 database/index.ts — 添加新表**

在 `initDatabase()` 的 `db.exec()` 调用中，在创建 usage_records 之后添加以下 SQL：

```typescript
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      cli_tool TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      provider_name TEXT NOT NULL DEFAULT '',
      model_id TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS session_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
      content TEXT NOT NULL DEFAULT '',
      tokens INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      metadata TEXT NOT NULL DEFAULT '{}',
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_session_messages_session ON session_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp);
    CREATE INDEX IF NOT EXISTS idx_usage_provider ON usage_records(provider_id);

    CREATE TABLE IF NOT EXISTS speed_tests (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL DEFAULT '',
      latency_ms REAL NOT NULL,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT DEFAULT '',
      tested_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_speed_tests_provider ON speed_tests(provider_id, tested_at);

    CREATE TABLE IF NOT EXISTS budget_alerts (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      total_cost REAL NOT NULL DEFAULT 0,
      limit_amount REAL NOT NULL DEFAULT 0,
      threshold_pct INTEGER NOT NULL DEFAULT 80,
      notified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_month ON budget_alerts(month);
```

同时更新 `insertDefaultSettings()` 添加默认值：

```typescript
function insertDefaultSettings(): void {
  const defaults: Record<string, string> = {
    theme: 'system',
    locale: 'zh-CN',
    autoStart: 'false',
    lightweightMode: 'false',
    proxyPort: '15721',
    autoConfigCli: 'true',
    syncEnabled: 'false',
    syncInterval: '60',
    monthlyBudgetLimit: '50',
    budgetNotifyThreshold: '80',
    speedTestInterval: '30',
  };
  // ... rest stays same
}
```

- [ ] **Step 6: 创建 database/usage.ts**

```typescript
import { getDb } from './index';
import type { UsageStats, DailyUsage, ProviderUsageSummary, ModelUsageSummary, UsageFilter } from '@ccmodels/shared';

export function getUsageStats(filter: { dateFrom?: string; dateTo?: string }): UsageStats {
  const db = getDb();
  let where = '';
  const params: any[] = [];
  if (filter.dateFrom) { where += ' AND timestamp >= ?'; params.push(filter.dateFrom); }
  if (filter.dateTo) { where += ' AND timestamp <= ?'; params.push(filter.dateTo); }

  const row = db.prepare(`
    SELECT
      COALESCE(SUM(prompt_tokens + completion_tokens), 0) as total_tokens,
      COALESCE(SUM(cost), 0) as total_cost,
      COUNT(*) as total_requests,
      COALESCE(SUM(cache_hit_tokens), 0) as total_cache,
      COALESCE(SUM(prompt_tokens + completion_tokens + cache_hit_tokens), 0) as total_all_tokens
    FROM usage_records WHERE 1=1 ${where}
  `).get(...params) as any;

  return {
    totalTokens: row.total_tokens,
    totalCost: row.total_cost,
    totalRequests: row.total_requests,
    cacheHitRate: row.total_all_tokens > 0 ? row.total_cache / row.total_all_tokens : 0,
    periodStart: filter.dateFrom ?? '',
    periodEnd: filter.dateTo ?? '',
  };
}

export function getDailyUsage(dateFrom: string, dateTo: string): DailyUsage[] {
  return getDb().prepare(`
    SELECT
      date(timestamp) as date,
      COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
      COALESCE(SUM(completion_tokens), 0) as completion_tokens,
      COALESCE(SUM(cache_hit_tokens), 0) as cache_hit_tokens,
      COALESCE(SUM(cost), 0) as cost,
      COUNT(*) as requests
    FROM usage_records
    WHERE date(timestamp) >= ? AND date(timestamp) <= ?
    GROUP BY date(timestamp)
    ORDER BY date ASC
  `).all(dateFrom, dateTo) as DailyUsage[];
}

export function getProviderUsage(dateFrom: string, dateTo: string): ProviderUsageSummary[] {
  return getDb().prepare(`
    SELECT
      u.provider_id as providerId,
      COALESCE(p.name, 'Unknown') as providerName,
      COALESCE(SUM(u.prompt_tokens + u.completion_tokens), 0) as totalTokens,
      COALESCE(SUM(u.cost), 0) as totalCost,
      COUNT(*) as requestCount
    FROM usage_records u
    LEFT JOIN providers p ON p.id = u.provider_id
    WHERE date(u.timestamp) >= ? AND date(u.timestamp) <= ?
    GROUP BY u.provider_id
    ORDER BY totalCost DESC
  `).all(dateFrom, dateTo) as ProviderUsageSummary[];
}

export function getModelUsage(dateFrom: string, dateTo: string): ModelUsageSummary[] {
  return getDb().prepare(`
    SELECT
      u.model_id as modelId,
      COALESCE(p.name, 'Unknown') as providerName,
      COALESCE(SUM(u.prompt_tokens + u.completion_tokens), 0) as totalTokens,
      COALESCE(SUM(u.cost), 0) as totalCost,
      COUNT(*) as requestCount
    FROM usage_records u
    LEFT JOIN providers p ON p.id = u.provider_id
    WHERE date(u.timestamp) >= ? AND date(u.timestamp) <= ?
    GROUP BY u.model_id
    ORDER BY totalCost DESC
  `).all(dateFrom, dateTo) as ModelUsageSummary[];
}

export function getMonthlyCost(year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const row = getDb().prepare(`
    SELECT COALESCE(SUM(cost), 0) as total
    FROM usage_records WHERE timestamp LIKE ?
  `).get(`${prefix}%`) as any;
  return row.total;
}
```

- [ ] **Step 7: 创建 database/sessions.ts**

```typescript
import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import type { Session, SessionMessage, SessionFilter, SessionListResult } from '@ccmodels/shared';

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
  const { cliTool, providerId, dateFrom, dateTo, searchQuery, page, pageSize } = filter;
  let where = '1=1';
  const params: any[] = [];

  if (cliTool) { where += ' AND cli_tool = ?'; params.push(cliTool); }
  if (providerId) { where += ' AND provider_id = ?'; params.push(providerId); }
  if (dateFrom) { where += ' AND started_at >= ?'; params.push(dateFrom); }
  if (dateTo) { where += ' AND started_at <= ?'; params.push(dateTo); }
  if (searchQuery) { where += ' AND (summary LIKE ? OR id LIKE ?)'; params.push(`%${searchQuery}%`, `%${searchQuery}%`); }

  const total = (getDb().prepare(`SELECT COUNT(*) as count FROM sessions WHERE ${where}`).get(...params) as any).count;
  const offset = (page - 1) * pageSize;
  const rows = getDb().prepare(`SELECT * FROM sessions WHERE ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as any[];

  return { sessions: rows.map(mapSession), total, page, pageSize };
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
  return { ...row, providerName: row.provider_name, cliTool: row.cli_tool };
}
```

- [ ] **Step 8: 创建 database/speed-tests.ts**

```typescript
import { getDb } from './index';
import { randomUUID } from 'node:crypto';

export interface SpeedTestResult {
  id: string;
  providerId: string;
  latencyMs: number;
  success: boolean;
  testedAt: string;
}

export function recordSpeedTest(providerId: string, latencyMs: number, success: boolean, errorMessage = ''): void {
  const id = randomUUID();
  getDb().prepare(`
    INSERT INTO speed_tests (id, provider_id, latency_ms, success, error_message, tested_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(id, providerId, latencyMs, success ? 1 : 0, errorMessage);
}

export function getLatestSpeedTests(limit = 50): SpeedTestResult[] {
  return getDb().prepare(`
    SELECT id, provider_id as providerId, latency_ms as latencyMs, success, tested_at as testedAt
    FROM speed_tests ORDER BY tested_at DESC LIMIT ?
  `).all(limit) as SpeedTestResult[];
}

export function getProviderAvgLatency(providerId: string, days = 7): number | null {
  const row = getDb().prepare(`
    SELECT AVG(latency_ms) as avg FROM speed_tests
    WHERE provider_id = ? AND success = 1 AND tested_at >= datetime('now', ?)
  `).get(providerId, `-${days} days`) as any;
  return row.avg ?? null;
}

export function getProviderSuccessRate(providerId: string, days = 7): number {
  const row = getDb().prepare(`
    SELECT
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
      COUNT(*) as total
    FROM speed_tests
    WHERE provider_id = ? AND tested_at >= datetime('now', ?)
  `).get(providerId, `-${days} days`) as any;
  return row.total > 0 ? row.successes / row.total : 0;
}
```

- [ ] **Step 9: 创建 database/budget-alerts.ts**

```typescript
import { getDb } from './index';
import { randomUUID } from 'node:crypto';
import { getSettings } from './settings';

export interface BudgetStatus {
  month: string;
  totalCost: number;
  limitAmount: number;
  thresholdPct: number;
  notified: boolean;
  usagePct: number;
}

export function getBudgetStatus(): BudgetStatus {
  const settings = getSettings();
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const limitAmount = settings.monthlyBudgetLimit;

  // Calculate total cost for current month
  const costRow = getDb().prepare(`
    SELECT COALESCE(SUM(cost), 0) as total FROM usage_records
    WHERE timestamp LIKE ?
  `).get(`${month}%`) as any;
  const totalCost = costRow.total;

  // Get or create budget alert record
  let alert = getDb().prepare('SELECT * FROM budget_alerts WHERE month = ?').get(month) as any;
  if (!alert) {
    const id = randomUUID();
    getDb().prepare(`
      INSERT INTO budget_alerts (id, month, total_cost, limit_amount, threshold_pct)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, month, totalCost, limitAmount, settings.budgetNotifyThreshold);
    alert = getDb().prepare('SELECT * FROM budget_alerts WHERE month = ?').get(month) as any;
  }

  return {
    month,
    totalCost,
    limitAmount,
    thresholdPct: settings.budgetNotifyThreshold,
    notified: !!alert.notified,
    usagePct: limitAmount > 0 ? (totalCost / limitAmount) * 100 : 0,
  };
}

export function checkBudgetThreshold(): { exceeded: boolean; pct: number; message: string } | null {
  const status = getBudgetStatus();
  if (status.limitAmount <= 0) return null;

  const pct = status.usagePct;
  if (pct >= status.thresholdPct && !status.notified) {
    return {
      exceeded: true,
      pct,
      message: `Budget usage reached ${Math.round(pct)}% of $${status.limitAmount} monthly limit`,
    };
  }
  if (pct >= 100) {
    return {
      exceeded: true,
      pct,
      message: `Monthly budget of $${status.limitAmount} has been exceeded! Current: $${status.totalCost.toFixed(2)}`,
    };
  }
  return null;
}

export function markBudgetNotified(): void {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  getDb().prepare('UPDATE budget_alerts SET notified = 1, updated_at = datetime(\'now\') WHERE month = ?').run(month);
}
```

- [ ] **Step 10: 安装 Recharts 依赖并 Commit**

```bash
cd /d/Works/GIT/CC-Switch
pnpm --filter @ccmodels/desktop add recharts
git add packages/shared/src/types/session.ts packages/shared/src/types/usage.ts packages/shared/src/types/index.ts packages/shared/src/types/settings.ts apps/desktop/src/main/database/index.ts apps/desktop/src/main/database/usage.ts apps/desktop/src/main/database/sessions.ts apps/desktop/src/main/database/speed-tests.ts apps/desktop/src/main/database/budget-alerts.ts
git commit -m "feat: add Phase 2 types, DB migrations, and data access modules"
```

---

### Task 2: 增强代理日志 + 用量统计 IPC

**Files:**
- Modify: `apps/desktop/src/main/proxy/logger.ts`
- Modify: `apps/desktop/src/main/ipc-handlers.ts`
- Modify: `apps/desktop/src/preload/index.ts`

- [ ] **Step 1: 增强 logger.ts — 解析响应头获取真实 Token 数**

代理服务器日志当前只记录基础信息，但 LLM API 返回的响应头中包含真实用量。通过捕获响应头 `x-ratelimit-*` 或标准 `openai-*` 头，以及解析响应体中的 usage 字段来获取真实 Token 数。

```typescript
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
    `).run(id, log.providerId, log.modelId, timestamp, log.promptTokens, log.completionTokens, log.cacheHitTokens ?? 0, log.cost, log.cliTool);
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
      // Rough cost estimate: use model-specific pricing if available
      const cost = estimateCost(promptTokens, completionTokens, modelId);
      return { promptTokens, completionTokens, cacheHitTokens, cost };
    }
    return null;
  } catch {
    return null;
  }
}

function estimateCost(promptTokens: number, completionTokens: number, _modelId: string): number {
  // Default pricing: $3/M input, $15/M output (rough Claude 3.5 Sonnet pricing)
  // In production, look up from models table
  const inputPrice = 3 / 1_000_000;
  const outputPrice = 15 / 1_000_000;
  return promptTokens * inputPrice + completionTokens * outputPrice;
}
```

- [ ] **Step 2: 修改 proxy/index.ts 中的 handleRequest 函数，捕获响应体并解析用量**

在 proxy/index.ts 的 `proxyRes` 回调中，改用 buffer 收集响应体而不是直接 pipe，解析后再转发给客户端：

在 `handleRequest` 函数中找到 proxyRes 处理回调，将直接 `.pipe(res)` 替换为：

```typescript
(proxyRes) => {
  const chunks: Buffer[] = [];
  proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
  proxyRes.on('end', () => {
    const responseBody = Buffer.concat(chunks).toString('utf-8');
    const latencyMs = Date.now() - startTime;

    // Try to parse usage from response body
    const usage = parseUsageFromResponse(responseBody, modelId);

    if (usage) {
      logRequestWithUsage({
        providerId: route.providerId,
        modelId,
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        statusCode: proxyRes.statusCode ?? 200,
        latencyMs,
        cliTool: cliTool ?? 'unknown',
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        cacheHitTokens: usage.cacheHitTokens,
        cost: usage.cost,
      });
    } else {
      logRequest({
        providerId: route.providerId,
        modelId,
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        statusCode: proxyRes.statusCode ?? 200,
        latencyMs,
        cliTool: cliTool ?? 'unknown',
      });
    }

    // Forward response to client
    res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
    res.end(responseBody);
  });
}
```

同时更新文件头部的 import:

```typescript
import { logRequest, logRequestWithUsage, parseUsageFromResponse } from './logger';
```

- [ ] **Step 3: 在 ipc-handlers.ts 添加用量/会话/测速/预算 handler**

```typescript
import * as usageDb from './database/usage';
import * as sessionDb from './database/sessions';
import * as speedTestDb from './database/speed-tests';
import * as budgetDb from './database/budget-alerts';
```

在 `registerIpcHandlers` 末尾追加：

```typescript
  // ── Usage handlers ──
  ipcMain.handle('usage:stats', (_e, filter) => usageDb.getUsageStats(filter));
  ipcMain.handle('usage:daily', (_e, dateFrom, dateTo) => usageDb.getDailyUsage(dateFrom, dateTo));
  ipcMain.handle('usage:byProvider', (_e, dateFrom, dateTo) => usageDb.getProviderUsage(dateFrom, dateTo));
  ipcMain.handle('usage:byModel', (_e, dateFrom, dateTo) => usageDb.getModelUsage(dateFrom, dateTo));

  // ── Session handlers ──
  ipcMain.handle('session:list', (_e, filter) => sessionDb.listSessions(filter));
  ipcMain.handle('session:get', (_e, id) => sessionDb.getSessionById(id));
  ipcMain.handle('session:messages', (_e, sessionId) => sessionDb.getSessionMessages(sessionId));

  // ── Speed test handlers ──
  ipcMain.handle('speedtest:latest', (_e, limit) => speedTestDb.getLatestSpeedTests(limit));
  ipcMain.handle('speedtest:avgLatency', (_e, providerId, days) => speedTestDb.getProviderAvgLatency(providerId, days));
  ipcMain.handle('speedtest:successRate', (_e, providerId, days) => speedTestDb.getProviderSuccessRate(providerId, days));

  // ── Budget handlers ──
  ipcMain.handle('budget:status', () => budgetDb.getBudgetStatus());
  ipcMain.handle('budget:check', () => budgetDb.checkBudgetThreshold());
```

- [ ] **Step 4: 在 preload/index.ts 暴露新 API**

在 `electronAPI` 对象中追加：

```typescript
  // Usage
  getUsageStats: (filter: any) => ipcRenderer.invoke('usage:stats', filter),
  getDailyUsage: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('usage:daily', dateFrom, dateTo),
  getUsageByProvider: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('usage:byProvider', dateFrom, dateTo),
  getUsageByModel: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('usage:byModel', dateFrom, dateTo),

  // Sessions
  listSessions: (filter: any) => ipcRenderer.invoke('session:list', filter),
  getSession: (id: string) => ipcRenderer.invoke('session:get', id),
  getSessionMessages: (sessionId: string) => ipcRenderer.invoke('session:messages', sessionId),

  // Speed tests
  getLatestSpeedTests: (limit?: number) => ipcRenderer.invoke('speedtest:latest', limit),
  getProviderAvgLatency: (providerId: string, days?: number) => ipcRenderer.invoke('speedtest:avgLatency', providerId, days),
  getProviderSuccessRate: (providerId: string, days?: number) => ipcRenderer.invoke('speedtest:successRate', providerId, days),

  // Budget
  getBudgetStatus: () => ipcRenderer.invoke('budget:status'),
  checkBudget: () => ipcRenderer.invoke('budget:check'),
```

- [ ] **Step 5: 验证构建并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop
npx tsc -p tsconfig.main.json --noEmit
git add apps/desktop/src/main/proxy/logger.ts apps/desktop/src/main/proxy/index.ts apps/desktop/src/main/ipc-handlers.ts apps/desktop/src/preload/index.ts
git commit -m "feat: enhance proxy logger with real token parsing, add IPC handlers for Phase 2"
```

---

### Task 3: SpeedTest 后台模块

**Files:**
- Create: `apps/desktop/src/main/speed-test/index.ts`
- Modify: `apps/desktop/src/main/index.ts`
- Modify: `apps/desktop/src/main/budget-checker/index.ts` (optional, combined with speed-test timing)

- [ ] **Step 1: 创建 speed-test/index.ts**

```typescript
import http from 'node:http';
import https from 'node:https';
import { getActiveProvider } from '../database/providers';
import { recordSpeedTest } from '../database/speed-tests';
import { getSettings } from '../database/settings';

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startSpeedTesting(): void {
  stopSpeedTesting();

  const intervalMinutes = getSettings().speedTestInterval;
  if (intervalMinutes <= 0) return;

  intervalHandle = setInterval(() => {
    runSpeedTests();
  }, intervalMinutes * 60 * 1000);

  // Run immediately on start
  runSpeedTests();
}

export function stopSpeedTesting(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export async function runSpeedTests(): Promise<void> {
  const provider = getActiveProvider();
  if (!provider) return;

  for (const model of provider.models.slice(0, 1)) {
    const startTime = Date.now();
    try {
      await pingProvider(provider.apiBase, provider.apiKey);
      const latencyMs = Date.now() - startTime;
      recordSpeedTest(provider.id, latencyMs, true);
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      recordSpeedTest(provider.id, latencyMs, false, err.message);
    }
  }
}

async function pingProvider(apiBase: string, apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(apiBase);
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/v1/models',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
      (res) => {
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.resume();
      },
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}
```

- [ ] **Step 2: 修改 main/index.ts — 启动 speed-test**

```typescript
import { startSpeedTesting, stopSpeedTesting } from './speed-test';
```

在 `bootstrap()` 的 `initTray` 后面追加：

```typescript
  startSpeedTesting();
```

在 `app.on('will-quit')` 回调中追加：

```typescript
  stopSpeedTesting();
```

- [ ] **Step 3: Commit**

```bash
cd /d/Works/GIT/CC-Switch
git add apps/desktop/src/main/speed-test/ apps/desktop/src/main/index.ts
git commit -m "feat: add automated speed testing module"
```

---

### Task 4: React UI — 用量成本页面 (Recharts)

**Files:**
- Create: `apps/desktop/src/renderer/hooks/useUsage.ts`
- Create: `apps/desktop/src/renderer/components/UsageChart.tsx`
- Create: `apps/desktop/src/renderer/pages/Usage.tsx`
- Modify: `apps/desktop/src/renderer/components/Sidebar.tsx`
- Modify: `apps/desktop/src/renderer/router.tsx`

- [ ] **Step 1: 创建 hooks/useUsage.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { UsageStats, DailyUsage, ProviderUsageSummary, ModelUsageSummary } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function useUsage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [providerUsage, setProviderUsage] = useState<ProviderUsageSummary[]>([]);
  const [modelUsage, setModelUsage] = useState<ModelUsageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    const end = dateTo ?? new Date().toISOString().split('T')[0];
    const start = dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [s, d, p, m] = await Promise.all([
      api.getUsageStats({ dateFrom: start, dateTo: end }),
      api.getDailyUsage(start, end),
      api.getUsageByProvider(start, end),
      api.getUsageByModel(start, end),
    ]);
    setStats(s);
    setDailyUsage(d);
    setProviderUsage(p);
    setModelUsage(m);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, dailyUsage, providerUsage, modelUsage, loading, refresh };
}
```

- [ ] **Step 2: 创建 components/UsageChart.tsx**

```typescript
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { DailyUsage, ProviderUsageSummary } from '@ccmodels/shared';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

export function DailyCostChart({ data }: { data: DailyUsage[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-secondary)" />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-secondary)" />
        <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }} />
        <Bar dataKey="cost" fill="var(--color-accent)" radius={[4, 4, 0, 0]} name="Cost ($)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TokenChart({ data }: { data: DailyUsage[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-text-secondary)" />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--color-text-secondary)" />
        <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }} />
        <Line type="monotone" dataKey="promptTokens" stroke="#6366f1" name="Prompt" strokeWidth={2} />
        <Line type="monotone" dataKey="completionTokens" stroke="#22c55e" name="Completion" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ProviderPieChart({ data }: { data: ProviderUsageSummary[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="totalCost" nameKey="providerName" cx="50%" cy="50%" outerRadius={100} label>
          {data.map((_, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: 创建 pages/Usage.tsx**

```typescript
import { useState } from 'react';
import { useUsage } from '../hooks/useUsage';
import { DailyCostChart, TokenChart, ProviderPieChart } from '../components/UsageChart';

export function Usage() {
  const { stats, dailyUsage, providerUsage, loading, refresh } = useUsage();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const handleFilter = () => refresh(dateFrom, dateTo);

  if (loading && !stats) return <div className="p-8 text-text-secondary">加载中...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">用量成本</h2>
          <p className="text-sm text-text-secondary mt-1">查看 Token 消耗和费用统计</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-3 mb-6">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-bg-primary text-sm" />
        <span className="text-text-secondary">—</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-bg-primary text-sm" />
        <button onClick={handleFilter}
          className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover">
          筛选
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-text-secondary mb-1">总消耗</p>
            <p className="text-2xl font-bold">{(stats.totalTokens / 1_000_000).toFixed(2)}M</p>
            <p className="text-xs text-text-secondary mt-1">{stats.totalRequests} 次请求</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-text-secondary mb-1">总费用</p>
            <p className="text-2xl font-bold">${stats.totalCost.toFixed(4)}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-text-secondary mb-1">缓存命中率</p>
            <p className="text-2xl font-bold">{(stats.cacheHitRate * 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-text-secondary mb-1">平均请求成本</p>
            <p className="text-2xl font-bold">
              ${stats.totalRequests > 0 ? (stats.totalCost / stats.totalRequests).toFixed(6) : '0'}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div className="rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">每日费用</h3>
          <DailyCostChart data={dailyUsage} />
        </div>
        <div className="rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">Token 趋势</h3>
          <TokenChart data={dailyUsage} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">供应商费用分布</h3>
          {providerUsage.length > 0 ? <ProviderPieChart data={providerUsage} /> : (
            <p className="text-sm text-text-secondary">暂无数据</p>
          )}
        </div>
        <div className="rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">模型用量排名</h3>
          {modelUsage.length > 0 ? (
            <div className="space-y-2">
              {modelUsage.slice(0, 10).map((m, i) => (
                <div key={m.modelId} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary w-5">{i + 1}.</span>
                    <span className="text-sm">{m.providerName}/{m.modelId}</span>
                  </div>
                  <span className="text-sm font-mono">${m.totalCost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">暂无数据</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 修改 router.tsx — 添加 Usage 路由**

```typescript
import { Usage } from './pages/Usage';

// 在 Route 列表中添加：
<Route path="/usage" element={<Usage />} />
```

- [ ] **Step 5: 修改 Sidebar.tsx — 添加导航项**

```typescript
const navItems = [
  { to: '/', label: '仪表盘', icon: '📊' },
  { to: '/usage', label: '用量成本', icon: '💰' },
  { to: '/providers', label: '供应商', icon: '🔌' },
  { to: '/settings', label: '设置', icon: '⚙️' },
];
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/renderer/hooks/useUsage.ts apps/desktop/src/renderer/components/UsageChart.tsx apps/desktop/src/renderer/pages/Usage.tsx apps/desktop/src/renderer/router.tsx apps/desktop/src/renderer/components/Sidebar.tsx
git commit -m "feat: add usage/cost page with Recharts charts"
```

---

### Task 5: React UI — 会话历史 + 供应商测速 + 预算告警

**Files:**
- Create: `apps/desktop/src/renderer/hooks/useSessions.ts`
- Create: `apps/desktop/src/renderer/hooks/useSpeedTests.ts`
- Create: `apps/desktop/src/renderer/hooks/useBudget.ts`
- Create: `apps/desktop/src/renderer/pages/Sessions.tsx`
- Create: `apps/desktop/src/renderer/pages/SessionDetail.tsx`
- Create: `apps/desktop/src/renderer/pages/SpeedTest.tsx`
- Create: `apps/desktop/src/renderer/pages/Budget.tsx`
- Modify: `apps/desktop/src/renderer/router.tsx`
- Modify: `apps/desktop/src/renderer/components/Sidebar.tsx`

- [ ] **Step 1: 创建 hooks/useSessions.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { Session, SessionMessage, SessionFilter, SessionListResult } from '@ccmodels/shared';

const api = (window as any).electronAPI;

export function useSessions(initialFilter?: Partial<SessionFilter>) {
  const [result, setResult] = useState<SessionListResult | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (filter?: Partial<SessionFilter>) => {
    setLoading(true);
    const defaultFilter: SessionFilter = { page: 1, pageSize: 20, ...initialFilter, ...filter };
    const r = await api.listSessions(defaultFilter);
    setResult(r);
    setLoading(false);
  }, [initialFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  return { sessions: result?.sessions ?? [], total: result?.total ?? 0, loading, refresh };
}

export function useSessionDetail(id: string | undefined) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.getSession(id), api.getSessionMessages(id)]).then(([s, m]) => {
      setSession(s);
      setMessages(m);
      setLoading(false);
    });
  }, [id]);

  return { session, messages, loading };
}
```

- [ ] **Step 2: 创建 hooks/useSpeedTests.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';

const api = (window as any).electronAPI;

export function useSpeedTests() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await api.getLatestSpeedTests(50);
    setResults(r);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { results, loading, refresh };
}
```

- [ ] **Step 3: 创建 hooks/useBudget.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';

const api = (window as any).electronAPI;

export function useBudget() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const s = await api.getBudgetStatus();
    setStatus(s);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { status, loading, refresh };
}
```

- [ ] **Step 4: 创建 pages/Sessions.tsx**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessions } from '../hooks/useSessions';
import type { Session } from '@ccmodels/shared';

export function Sessions() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { sessions, total, loading, refresh } = useSessions({ page, pageSize: 20 });

  const handleSearch = () => {
    refresh({ searchQuery: search, page: 1 });
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    refresh({ searchQuery: search, page: newPage });
  };

  const totalPages = Math.ceil(total / 20);

  if (loading) return <div className="p-8 text-text-secondary">加载中...</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">会话历史</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="搜索会话..."
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-sm"
        />
        <button onClick={handleSearch}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover">搜索</button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <p className="text-lg mb-2">暂无会话</p>
          <p className="text-sm">当有 API 请求通过代理时，会话将自动记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s: Session) => (
            <div key={s.id}
              onClick={() => navigate(`/sessions/${s.id}`)}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-accent cursor-pointer transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary">{s.cliTool}</span>
                  <span className="text-sm font-medium truncate">{s.summary || s.modelId || s.id.slice(0, 8)}</span>
                </div>
                <p className="text-xs text-text-secondary">
                  {s.providerName} · {new Date(s.startedAt).toLocaleString()} · {s.messageCount} 条消息
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="text-sm font-mono">${s.totalCost.toFixed(4)}</p>
                <p className="text-xs text-text-secondary">{(s.totalTokens / 1000).toFixed(1)}K tokens</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => handlePageChange(page - 1)}
            className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50">上一页</button>
          <span className="px-3 py-1 text-sm text-text-secondary">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => handlePageChange(page + 1)}
            className="px-3 py-1 rounded border border-border text-sm disabled:opacity-50">下一页</button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 创建 pages/SessionDetail.tsx**

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionDetail } from '../hooks/useSessions';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, messages, loading } = useSessionDetail(id);

  if (loading) return <div className="p-8 text-text-secondary">加载中...</div>;
  if (!session) return <div className="p-8 text-text-secondary">会话不存在</div>;

  return (
    <div className="p-8">
      <button onClick={() => navigate('/sessions')} className="text-sm text-accent mb-4 block">&larr; 返回会话列表</button>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">{session.summary || session.modelId || '会话详情'}</h2>
        <span className="text-xs px-2 py-0.5 rounded bg-bg-tertiary">{session.cliTool}</span>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-text-secondary">消息数</p>
          <p className="text-lg font-bold">{session.messageCount}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-text-secondary">总 Token</p>
          <p className="text-lg font-bold">{(session.totalTokens / 1000).toFixed(1)}K</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-text-secondary">总费用</p>
          <p className="text-lg font-bold">${session.totalCost.toFixed(4)}</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs text-text-secondary">时间</p>
          <p className="text-lg font-bold text-sm">{new Date(session.startedAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`p-4 rounded-xl ${msg.role === 'user' ? 'bg-accent/5 border border-accent/20' : 'bg-bg-secondary border border-border'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase">{msg.role}</span>
              <span className="text-xs text-text-secondary">{msg.tokens} tokens</span>
            </div>
            <pre className="text-sm whitespace-pre-wrap font-sans">{msg.content}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 创建 pages/SpeedTest.tsx**

```typescript
import { useSpeedTests } from '../hooks/useSpeedTests';

export function SpeedTest() {
  const { results, loading, refresh } = useSpeedTests();

  if (loading) return <div className="p-8 text-text-secondary">加载中...</div>;

  const successCount = results.filter((r: any) => r.success).length;
  const successRate = results.length > 0 ? (successCount / results.length * 100) : 0;
  const avgLatency = results.filter((r: any) => r.success).reduce((a: number, r: any) => a + r.latencyMs, 0) / (successCount || 1);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">供应商测速</h2>
          <p className="text-sm text-text-secondary mt-1">API 供应商延迟和可用率检测</p>
        </div>
        <button onClick={refresh}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover">刷新</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary mb-1">测试次数</p>
          <p className="text-2xl font-bold">{results.length}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary mb-1">平均延迟</p>
          <p className="text-2xl font-bold">{avgLatency.toFixed(0)} ms</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary mb-1">可用率</p>
          <p className="text-2xl font-bold">{(successRate).toFixed(1)}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">历史记录</h3>
        </div>
        <div className="divide-y divide-border">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">暂无测速数据。设置测速间隔后自动检测。</p>
          ) : results.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${r.success ? 'bg-success' : 'bg-danger'}`} />
                <span className="text-sm">{r.providerId?.slice(0, 8)}...</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono">{r.latencyMs?.toFixed(0)} ms</span>
                <span className="text-xs text-text-secondary ml-3">{new Date(r.testedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 创建 pages/Budget.tsx**

```typescript
import { useBudget } from '../hooks/useBudget';

export function Budget() {
  const { status, loading, refresh } = useBudget();

  if (loading) return <div className="p-8 text-text-secondary">加载中...</div>;

  const pct = status?.usagePct ?? 0;
  const barColor = pct >= 100 ? 'bg-danger' : pct >= (status?.thresholdPct ?? 80) ? 'bg-warning' : 'bg-success';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">预算告警</h2>
          <p className="text-sm text-text-secondary mt-1">监控 API 费用，防止超支</p>
        </div>
        <button onClick={refresh}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover">刷新</button>
      </div>

      {status ? (
        <>
          <div className="rounded-xl border border-border p-6 mb-6">
            <h3 className="font-semibold mb-4">月度概览 — {status.month}</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-xs text-text-secondary mb-1">已用</p>
                <p className="text-2xl font-bold">${status.totalCost.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">限额</p>
                <p className="text-2xl font-bold">${status.limitAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">使用率</p>
                <p className="text-2xl font-bold">{pct.toFixed(1)}%</p>
              </div>
            </div>
            <div className="w-full bg-bg-tertiary rounded-full h-4 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="text-xs text-text-secondary mt-2">
              通知阈值：{status.thresholdPct}% · {status.notified ? '已通知' : '未通知'}
            </p>
          </div>

          <div className="rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-2">设置提醒</h3>
            <p className="text-sm text-text-secondary mb-4">
              前往"设置"页面配置月度预算上限和通知阈值百分比。
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-16 text-text-secondary">
          <p className="text-lg">加载预算数据...</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: 修改 router.tsx — 添加所有新路由**

```typescript
import { Usage } from './pages/Usage';
import { Sessions } from './pages/Sessions';
import { SessionDetail } from './pages/SessionDetail';
import { SpeedTest } from './pages/SpeedTest';
import { Budget } from './pages/Budget';

{/* 在 Route 定义中追加 */}
<Route path="/usage" element={<Usage />} />
<Route path="/sessions" element={<Sessions />} />
<Route path="/sessions/:id" element={<SessionDetail />} />
<Route path="/speed-test" element={<SpeedTest />} />
<Route path="/budget" element={<Budget />} />
```

- [ ] **Step 9: 修改 Sidebar.tsx — 添加新导航项**

```typescript
const navItems = [
  { to: '/', label: '仪表盘', icon: '📊' },
  { to: '/usage', label: '用量成本', icon: '💰' },
  { to: '/sessions', label: '会话历史', icon: '💬' },
  { to: '/speed-test', label: '供应商测速', icon: '⚡' },
  { to: '/budget', label: '预算告警', icon: '🔔' },
  { to: '/providers', label: '供应商', icon: '🔌' },
  { to: '/settings', label: '设置', icon: '⚙️' },
];
```

- [ ] **Step 10: 验证 Vite 构建并 Commit**

```bash
cd /d/Works/GIT/CC-Switch/apps/desktop
npx vite build 2>&1
git add apps/desktop/src/renderer/
git commit -m "feat: add sessions, speed test, and budget pages"
```

---

### Phase 2 总览

| Task | 内容 | 文件数 |
|------|------|--------|
| 1 | Shared 类型 + 数据库迁移 + 查询模块 | 9 |
| 2 | 增强代理日志 + IPC handlers | 3 |
| 3 | SpeedTest 后台模块 | 2 |
| 4 | 用量成本页面 + Recharts | 4 |
| 5 | 会话/测速/预算页面 | 8 |

**Phase 2 预计新增：~26 个文件，约 3-4 周工作量**
