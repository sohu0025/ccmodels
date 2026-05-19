# CC Switch 克隆版 — 完整设计文档

## 概述

克隆 [CC Switch](https://ccswitch.io) 桌面应用的全部功能，并新增模型对比、智能推荐、预算告警、会话历史、供应商测速、主题/国际化等功能。面向大众用户的跨平台桌面应用。

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 33+ |
| 打包 | electron-builder (MSI/DMG/AppImage) |
| 前端 | React 18 + TypeScript 5 + Tailwind CSS 4 |
| UI 组件 | Radix UI + Framer Motion |
| 图表 | Recharts |
| 本地数据库 | better-sqlite3 (SQLite，加密存储 API Key) |
| 后端框架 | NestJS + Fastify |
| ORM | Prisma |
| 云端数据库 | MySQL 8 |
| 实时通信 | Socket.io (WebSocket) |
| Monorepo | pnpm + Turborepo |
| 文件监听 | chokidar |

## 项目结构

```
cc-switch/
├── apps/
│   ├── desktop/              # Electron 桌面应用
│   │   ├── src/
│   │   │   ├── main/         # 主进程
│   │   │   │   ├── config-manager/   # 配置管理器
│   │   │   │   │   ├── scanner.ts    # CLI 工具扫描
│   │   │   │   │   ├── adapters/     # 每种 CLI 适配器
│   │   │   │   │   ├── backup.ts    # 配置备份/恢复
│   │   │   │   │   ├── watcher.ts   # 文件系统监听
│   │   │   │   │   └── conflict.ts  # 冲突检测
│   │   │   │   ├── proxy/           # 本地代理 :15721
│   │   │   │   │   ├── server.ts    # HTTP 代理服务
│   │   │   │   │   ├── router.ts    # 供应商路由
│   │   │   │   │   ├── logger.ts    # 请求日志
│   │   │   │   │   └── failover.ts  # 故障转移
│   │   │   │   ├── sync/            # 数据同步服务
│   │   │   │   ├── tray/            # 系统托盘
│   │   │   │   └── database/        # SQLite 操作
│   │   │   ├── preload/      # 预加载脚本
│   │   │   └── renderer/     # React UI
│   │   └── electron-builder.yml
│   │
│   ├── web/                  # Web 版 SPA
│   │   └── src/
│   │
│   └── server/               # NestJS 后端
│       └── src/
│           ├── modules/
│           │   ├── auth/
│           │   ├── sync/
│           │   ├── usage/
│           │   ├── provider/
│           │   └── mcp/
│           └── database/
│
├── packages/
│   ├── shared/               # 共享类型、常量、工具
│   │   ├── types/
│   │   ├── constants/        # 供应商预设
│   │   ├── utils/
│   │   └── i18n/             # 中/英
│   │
│   └── ui/                   # 共享 UI 组件库
│       ├── components/
│       └── hooks/
│
└── tools/                    # 构建脚本
```

## 数据模型

### 桌面端 SQLite（13 张表）

- **providers** — 供应商：name, type, api_base, api_key, models[], cli_urls{}（按 CLI 工具不同端点）, headers, is_active
- **models** — 模型：provider_id, name, max_tokens, pricing_input, pricing_output, capabilities[], context_window
- **usage_records** — 用量：provider_id, model_id, timestamp, prompt_tokens, completion_tokens, cache_hit_tokens, cost, cli_tool, session_id
- **mcp_servers** — MCP：name, transport(stdio/http/sse), command, args[], url, headers, env_vars[], is_enabled
- **skills** — Skills：name, version, source_url, install_path, is_active, config
- **prompts** — 系统提示词：name, content, target(claude/gemini/codex), is_active, tags[]
- **proxy_rules** — 代理路由：provider_id, target_url, headers_override, is_enabled
- **failover_config** — 故障转移：provider_id, backup_provider_id, circuit_breaker_threshold, health_check_interval
- **budget_alerts** — 预算告警：name, monthly_limit, current_usage, notify_threshold_pct, is_enabled
- **sessions** — 会话：cli_tool, provider_id, model_id, started_at, ended_at, message_count, total_tokens, total_cost
- **session_messages** — 消息：session_id, role, content, tokens, timestamp, metadata
- **speed_tests** — 测速：provider_id, latency_ms, success, tested_at
- **sync_queue** — 同步队列：table_name, record_id, action, synced_at

### 云端 MySQL（14 张表）

- users, user_providers, user_models, usage_records, user_mcp_servers, user_skills, user_prompts, user_sessions, session_messages, user_budget_alerts, speed_tests, compare_tests, sync_log

### 同步策略

- 桌面端为权威源（Last Write Wins）
- 写入本地 → 写入 sync_queue → 定时/实时推送到云端
- 网络断开时积压，恢复后批量推送
- API Key 不同步到云端

## 功能模块（15 项）

| # | 模块 | 桌面版 | Web 版 |
|---|------|--------|--------|
| 1 | 仪表盘 — 用量概览、费用摘要、活跃模型 | ✅ 全功能 | ✅ 全功能 |
| 2 | 供应商管理 — 预设模板、自定义、API Key、按 CLI 区分端点 | ✅ 全功能 | 👁 只读 |
| 3 | 模型管理 — 列表、价格、能力标签 | ✅ 全功能 | 👁 只读 |
| 4 | 模型对比 — 同 prompt 多模型并排、速度价格对比 | ✅ 全功能 | ✅ 全功能 |
| 5 | 用量成本 — 图表、Token/费用、缓存命中率、导出 | ✅ 全功能 | ✅ 全功能 |
| 6 | MCP 管理 — stdio/HTTP/SSE、启停控制 | ✅ 全功能 | 👁 只读 |
| 7 | Skills 管理 — 安装/更新/卸载、冲突检测、社区搜索 | ✅ 全功能 | 👁 只读 |
| 8 | Prompts 管理 — CLAUDE.md/AGENTS.md/GEMINI.md | ✅ 全功能 | 👁 只读 |
| 9 | 会话历史 — 对话记录、全文搜索、回放 | ✅ 全功能 | ✅ 全功能 |
| 10 | 供应商测速 — 延迟排名、可用率、定时检测 | ✅ 全功能 | ✅ 全功能 |
| 11 | 智能推荐 — 按任务类型推荐模型、性价比排序 | ✅ 全功能 | ✅ 全功能 |
| 12 | 预算告警 — 月度限额、阈值桌面通知 | ✅ 通知 | 👁 查看 |
| 13 | 本地代理 — HTTP 代理 :15721、请求日志、路由 | ✅ 全功能 | — |
| 14 | 故障转移 — 熔断、备用供应商、健康检查 | ✅ 全功能 | — |
| 15 | 设置 — 暗/亮主题、中/英、同步配置、托盘 | ✅ 全功能 | ✅ 全功能 |

## 自动配置劫持

### 支持的 CLI 工具及配置路径

- **Claude Code**: `~/.claude/settings.json` (Windows: `%APPDATA%/Claude/settings.json`)
- **Codex**: `~/.codex/config.toml`
- **Gemini CLI**: `~/.gemini/config.json`
- **OpenCode**: `~/.opencode/config.json`
- **OpenClaw**: `~/.openclaw/config.yaml`
- **Hermes Agent**: `~/.hermes/config.json`

### 机制

1. 启动时扫描所有 CLI 配置文件 → 备份原文件 → 修改 API Base URL 指向 localhost:15721
2. chokidar 监听配置文件目录，检测新装 CLI 工具自动配置
3. 切换供应商只改代理路由表，不碰配置文件
4. 卸载时从备份恢复原始配置

### 安全措施

- 每次修改前自动备份（带时间戳）
- 检测外部修改时弹窗询问，不做静默覆盖
- 设置中提供"手动模式"开关，关闭自动配置

## 预设供应商清单（国内主流）

内置 API 地址和模型列表，用户仅需填写 API Key：

- DeepSeek — api.deepseek.com
- 智谱 GLM — open.bigmodel.cn/api/paas/v4
- Kimi (Moonshot) — api.moonshot.cn
- MiniMax — api.minimax.chat
- 通义千问 (DashScope) — dashscope.aliyuncs.com/compatible-mode/v1
- 字节豆包 — ark.cn-beijing.volces.com/api/v3
- 百川 (Baichuan) — api.baichuan-ai.com
- 讯飞星火 — spark-api-open.xf-yun.com
- 腾讯混元 — api.hunyuan.cloud.tencent.com
- SiliconFlow — api.siliconflow.cn
- OpenRouter — openrouter.ai/api/v1
- Anthropic Official — api.anthropic.com
- OpenAI Official — api.openai.com/v1
- Google Gemini — generativelanguage.googleapis.com

## 开发阶段

### Phase 1 — MVP 核心（4-6 周）
Monorepo 初始化、Electron 壳（窗口/托盘/轻量模式/自启）、供应商管理（CRUD + 预设 + API Key + 按 CLI 区分端点）、本地代理（:15721 转发 + 日志）、ConfigManager（自动劫持 6 种 CLI 配置）、SQLite 存储（加密 Key）、暗/亮主题 + 中英 i18n、打包（MSI + DMG）

### Phase 2 — 数据与洞察（3-4 周）
用量追踪（Token/请求计数）、成本可视化（Recharts 图表、筛选、导出）、会话历史（存储 + 搜索 + 回放）、供应商测速（延迟/可用率/定时检测）、预算告警（限额 + 阈值通知）

### Phase 3 — 高级功能 + 云端（3-4 周）
MCP 管理（stdio/HTTP/SSE）、Skills 管理（安装/更新/冲突检测）、Prompts 管理（编辑器）、NestJS 后端（Auth/API/WebSocket）、MySQL 数据库、数据同步（离线积压/冲突处理）、Web 版（仪表盘/用量/对比/历史）

### Phase 4 — 智能 + 打磨（2-3 周）
模型对比测试（同 prompt 多模型并排）、智能推荐（任务类型→模型推荐）、故障转移（熔断/自动切换/健康监控）、自动更新（electron-updater）、Linux 打包（deb/rpm/AppImage）、官网落地页

**总计：12-17 周**

## 系统托盘

- 右键菜单：快速切换供应商、显示当前用量/费用
- 预算告警桌面通知
- 轻量模式（隐藏主窗口，仅托盘运行）
- 开机自启选项

## 国际化

- 默认中文（zh-CN），支持英文（en-US）
- 使用 i18next + react-i18next
- UI 文本、通知、错误提示全覆盖
