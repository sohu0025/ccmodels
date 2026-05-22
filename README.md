# CC Models

<div align="center">

**一站式 AI 模型网关 & 桌面管理工具**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33+-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)

</div>

**CC Models** 是一个开源的 AI 模型代理网关 + 桌面管理应用。它充当本地 HTTP 代理，将各种 AI CLI 工具的请求路由到不同的模型供应商，并提供统一的使用统计、会话管理、预算告警等功能。

简单说：**一个应用管理所有 AI 工具**。

---

## 功能

### 核心代理网关

- **统一代理** — 本地 `127.0.0.1:15721`，接收 Claude Code、Codex、Gemini CLI、OpenClaw、Hermes、OpenCode 等工具的请求
- **智能路由** — 按 CLI 工具将请求转发到不同供应商，支持故障自动切换
- **格式转换** — Anthropic Messages → OpenAI Chat Completions、Google Gemini → OpenAI 格式互转
- **实时流式转发** — SSE 流透传，保持低延迟

### 桌面管理 (Electron)

- **供应商管理** — 添加/编辑/启停供应商（OpenAI、Anthropic、DeepSeek、SiliconFlow 等 30+ 预设）
- **一键配置** — 自动写入各 CLI 工具的配置文件，无需手动编辑
- **会话历史** — 记录所有 CLI 工具的会话，回放对话内容
- **使用统计** — 每日/每月 Token 消耗和费用图表
- **预算告警** — 设置月度预算上限，超阈值通知
- **模型对比** — 同一个问题发送给多模型，并列对比输出
- **速度测试** — 测试各供应商的响应延迟
- **智能推荐** — 根据使用习惯推荐最佳模型
- **MCP 管理** — 添加/启停 MCP 服务器
- **Skills & Prompts** — 自定义技能和提示词模板
- **广告位** — 可配置的展示广告
- **多主题** — 浅色/深色主题切换
- **国际化** — 中英文界面

### 云端同步 (NestJS)

- **用户认证** — 注册/登录 JWT
- **数据同步** — 多设备间同步使用记录和配置
- **Web 管理面板** — 浏览器访问的同功能面板
- **管理后台** — 供应商管理、系统设置、数据统计

---

## 截图

| 仪表盘 | 供应商管理 |
|--------|-----------|
| Dashboard | Providers |
| 会话历史 | 使用统计 |

---

## 快速开始

### 下载桌面端

从 [Releases](https://releases.cc-models.app) 下载对应系统安装包。

| 平台 | 格式 |
|------|------|
| Windows | MSI 安装包 |
| macOS | DMG (Intel + Apple Silicon) |
| Linux | AppImage / deb / rpm |

### 使用方式

1. 安装后启动 CC Models
2. 在「供应商」页面添加 API 供应商（如 DeepSeek、OpenAI）
3. 点击「配置」按钮，自动配置你使用的 CLI 工具
4. 正常使用你的 CLI 工具即可 — 所有请求会经过代理路由到对应供应商

#### 支持的 CLI 工具

| 工具 | 配置路径 |
|------|---------|
| Claude Code | `~/.claude/settings.json` |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Codex | `~/.codex/config.toml` |
| Gemini CLI | `~/.gemini/.env` |
| OpenClaw | `~/.openclaw/openclaw.json` |
| OpenCode | `~/.config/opencode/opencode.jsonc` |
| Hermes Agent | `~/.hermes/config.yaml` |

---

## 自托管后端服务

可选部署后端服务用于多设备同步和 Web 面板：

```bash
# 使用 Docker Compose（推荐）
docker compose up -d

# 或直接部署
pnpm install
pnpm --filter @ccmodels/shared build
pnpm --filter @ccmodels/web build
pnpm --filter @ccmodels/server build
node apps/server/dist/main.js
```

详细部署说明见 [docs/deploy-linux.md](docs/deploy-linux.md)。

---

## 项目架构

```
cc-models/
├── apps/
│   ├── desktop/                 # Electron 桌面应用
│   │   ├── src/
│   │   │   ├── main/            # 主进程
│   │   │   │   ├── proxy/       # 代理网关核心
│   │   │   │   │   ├── index.ts           # 代理入口 + 请求/响应转换
│   │   │   │   │   ├── router.ts          # 路由解析
│   │   │   │   │   ├── failover.ts        # 故障切换
│   │   │   │   │   └── logger.ts          # 日志记录
│   │   │   │   ├── config-manager/        # CLI 工具配置管理
│   │   │   │   ├── database/              # SQLite 数据库模块
│   │   │   │   ├── mcp-manager/           # MCP 进程管理
│   │   │   │   ├── speed-test/            # 速度测试
│   │   │   │   ├── sync/                  # 云端同步
│   │   │   │   └── ...                    # 窗口、托盘、更新器等
│   │   │   └── renderer/         # 渲染进程（React UI）
│   │   │       ├── pages/        # 页面组件
│   │   │       └── components/   # 通用组件
│   │   └── electron-builder.yml  # 打包配置
│   ├── server/                   # NestJS 后端
│   │   ├── src/
│   │   │   ├── modules/          # 功能模块（auth/sync/usage/session...）
│   │   │   └── main.ts           # 入口（含 SPA 托管）
│   │   └── prisma/               # 数据库 schema
│   └── web/                      # Web 版 SPA（独立部署）
│       └── src/
│           ├── pages/            # 页面组件
│           └── api.ts            # API 客户端
├── packages/
│   └── shared/                   # 公共类型、常量、国际化
├── docs/                         # 文档
└── pnpm-workspace.yaml           # Monorepo 配置
```

### 代理工作流程

```
CLI 工具 (Claude Code / Codex / Gemini CLI ...)
    │
    ▼  HTTP 请求
127.0.0.1:15721 (CC Models 代理)
    │
    ├── 工具识别（按请求路径/UA）
    ├── 路由解析（按工具选择供应商）
    ├── 格式转换（Anthropic/Google → OpenAI 格式）
    ├── 故障切换（供应商不可用时自动切换）
    └── 日志记录（Token、费用、会话）
    │
    ▼  HTTP 请求
目标供应商 API (DeepSeek / OpenAI / Anthropic ...)
```

---

## 开发

```bash
# 克隆
git clone https://github.com/你的用户名/cc-models.git
cd cc-models

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build
```

### 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Electron 33 |
| 前端 | React 18 + TypeScript + Tailwind CSS 4 + DaisyUI 5 |
| 后端 | NestJS 10 + Fastify + Prisma |
| 数据库 | SQLite（本地）/ MySQL（可选云端）|
| 构建 | Turborepo + pnpm workspace |
| 包管理 | pnpm |
| 图标 | @lobehub/icons |

---

## 许可证

MIT License

---

## 相关项目

- [CC Switch](https://ccswitch.io) — 原始灵感来源
