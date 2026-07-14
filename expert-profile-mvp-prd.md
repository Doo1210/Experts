# 专家管理模块 MVP 产品需求文档

Status: design proposal
Author: product draft
Target: Hermes 项目协作空间 · 专家管理模块

## 1. 背景与目标

`project-kanban-mvp-prd.md` 定义了「项目 = Kanban Board、专家 = Hermes Profile、任务 = Kanban task」的结构。`task-session-mvp-prd.md` 定义了「任务上下文下用户与专家 profile 的对话体验」。两份 PRD 都把「专家」作为已存在的前置概念，但没有解决「专家本身如何被创建、配置和管理」的问题。

本文档定义专家管理模块：用户可以可视化地创建、配置、管理自定义领域专家（Hermes Profile），并将专家的人设、技能、工具、MCP、记忆、IM 渠道等能力以 Tab 维度组织成统一管理界面。

### 1.1 与已有 PRD 的关系

- **kanban PRD** 定义「项目 — 任务 — 专家」结构，专家作为项目成员从 Hermes profiles 中选择。
- **task-session PRD** 定义「任务对话页面」，一个任务对应一个 session；**工作目录** = session `cwd`（该任务 workspace，通常为工作空间根下子目录）；profile **工作空间根** = `terminal.cwd`（**所有 session 可访问**，见 `task-session-mvp-prd.md` §2.3）。
- **本 PRD** 定义「专家本身的生命周期管理」：创建、配置、查看关联任务、编辑人设、启停技能/工具。
- 三份 PRD 互为补充：本 PRD 产出的专家，被 kanban PRD 选为项目成员，被 task-session PRD 用于任务对话。

### 1.2 设计动机

Hermes 的 profile 机制已经足够灵活（一个 profile = 一个完整 HERMES_HOME 目录，自带 `config.yaml`、`.env`、`SOUL.md`、`skills/`、`memories/`、`sessions/`、gateway 配置）。本 PRD 不重做这套机制，而是**把 Hermes 的文件系统和配置映射成 B 端用户能理解的 UI**。

**关键架构约束**：

- **hub 技能安装必须用子进程**：`hermes -p <profile> skills install <id>`，不能用 HERMES_HOME override（`tools/skills_hub.py` 在模块导入时绑定 `SKILLS_DIR`，上下文切换对已导入的全局变量无效）。
- **hub 安装是异步的**：立即返回 PID，UI 需要轮询进度。

这两条约束决定了创建向导不包含 hub 技能安装：向导必须同步、原子；hub 安装推到专家详情页的「技能」Tab，复用现有 SkillsPage 的异步安装 + 进度展示组件。

**本 PRD 的关键简化**：

- **单步向导**（弹窗一张表单）：用户填「来源 + 身份信息 + 模型」即可创建一个可用的专家壳。
- **不在向导中配置人设/技能/工具/MCP/工作空间**：这些维度的精细化配置全部进入详情页对应 Tab。
  - 人设（SOUL.md）→ 默认留空，由用户在「人设」Tab 编辑。
  - 技能 → 全部 seed 内置技能 + 默认全部启用，由用户在「技能」Tab 用开关启停或安装 hub 技能。
  - 工具 → 默认继承 `_HERMES_CORE_TOOLS`，由用户在「工具」Tab 以全部列表 + 开关调整。
  - MCP → 「从零开始」不预置；「复制 default / 复制其他专家」沿用 Hermes `--clone`，**保留**源专家的 `mcp_servers`（产品层不 strip）。详情页「MCP」Tab 对缺密钥 / 连通失败显示红色状态。
  - 工作空间根 → 后端默认创建 `<HERMES_HOME>/workspace/`，（空目录，不预置子目录），由用户在「工作空间」Tab 更改路径。

这使得创建向导成为完全同步的原子事务，并极大降低首次创建门槛（用户填一张表单即可拿到一个可用的专家壳）。

### 1.3 设计目标

1. **轻量可视化创建专家**：单步向导引导用户完成身份信息 + 来源选择（从零 / 复制 default / 复制其他专家），其余配置（人设、技能、工具、MCP、工作空间）全部进入详情页。
2. **全维度管理**：专家详情页以 Tab 结构展示人设、工作空间、任务、记忆、技能、工具、MCP、IM 渠道八个维度。
3. **复用 Hermes 原生能力**：不复刻 Hermes 已有的 profile/skills/tools 机制，而是把 Hermes 的文件系统和配置映射成 B 端用户能理解的 UI。
4. **MVP 聚焦核心路径**：记忆 Tab MVP 只做只读展示；IM 渠道 Tab MVP 做企业微信（AI Bot + 自建应用回调两种形态）、钉钉、飞书的基础启用/凭据配置，消息路由、统计等高级管理放后续版本。

## 2. 产品定位

### 2.1 产品定义

专家管理模块是 Hermes Profile 的可视化 CRUD + 全维度配置入口。一个专家等价于一个 Hermes Profile，即一个完全隔离的 HERMES_HOME 目录，自带 `config.yaml`、`.env`、`SOUL.md`、`skills/`、`memories/`、`sessions/`、`gateway` 配置。

### 2.2 核心原则

1. **专家等价于 Hermes Profile**
   - 产品层展示为「专家」。
   - 底层使用 Hermes Profile（`~/.hermes/profiles/<name>/`）。
   - 每个 profile 是独立岛屿，有自己的 config、env、sessions、skills、memory、gateway。

2. **人设等价于 SOUL.md**
   - 专家的核心身份定义存储在 `<HERMES_HOME>/SOUL.md`。
   - 系统提示词的 stable 层第一个组成部分就是 `SOUL.md or DEFAULT_AGENT_IDENTITY`（`agent/system_prompt.py`）。
   - 人设编辑器直接读写这个文件。

3. **工作空间与工作目录（与 task-session PRD 对齐）**
   - **工作空间根**（profile `terminal.cwd`）：专家级目录树根；**该 profile 下所有 session 均可访问**（浏览整棵树、读取任意子路径文件），与某 session 工作目录是否为根本身**无关**。
   - **工作目录**（session `cwd`）：**该任务的 workspace**，对齐 Hermes（读 + 写 + terminal 默认锚点）；通常为工作空间根下子目录（如 `工位8/`），不是把 profile 工作空间缩小成单个文件夹。
   - **产物约定**：任务产出须落在**工作目录**内，由 SOUL/skill 约定。
   - 本 PRD 负责工作空间根的创建与配置；session 工作目录由任务对话页 / 任务 Tab 管理。详见 `task-session-mvp-prd.md` §2.3。

4. **创建向导是原子事务**
   - 单步向导只做身份信息 + 来源选择，全部是同步文件写入，无异步操作。
   - SOUL.md 默认留空，技能全部 seed 并默认启用，toolset 默认继承 `_HERMES_CORE_TOOLS`；MCP 在「从零开始」时不预置，「复制」时随 Hermes `--clone` 保留 `mcp_servers`；工作空间根默认 `<HERMES_HOME>/workspace`。
   - 提交时一次落盘，无需 PID 轮询、无需进度页。
   - 上述各维度的精细化配置（人设编辑、hub 技能安装、toolset 调整、MCP 增删启停、工作空间根更改）全部在详情页对应 Tab 完成。

5. **Profile 隔离，不做实时继承**
   - profile 之间不设计实时配置继承（AGENTS.md 明确）。
   - `hermes profile create --clone` 是支持的「从默认起步」路径。
   - 编辑某个专家的配置不会影响其他专家。

6. **Prompt 缓存神圣不可破**
   - 系统提示词一次会话内字节稳定，只在上下文压缩时重建。
   - 人设（SOUL.md）/技能/工具（toolset）的修改**仅下次会话生效**（MVP 不提供「立即生效」）。UI 保存时必须提示用户。
   - MCP 服务器的启用/配置变更影响工具发现与连接；MVP 以「新会话生效」为主，并在 UI 提示连接状态。
   - 这是 Hermes 的核心成本约束（Prompt 缓存神圣不可破），人设 Tab 的「保存」必须明确提示「将在新会话生效」。

## 3. MVP 范围

### 3.1 MVP 包含

- 专家列表页
  - 卡片网格展示所有专家
  - 新建专家入口
  - 删除专家（硬删除 + 二次确认）
  - 发起任务 / 管理两个快捷操作
- 创建专家向导（**单步弹窗**）
  - 字段：来源（从零 / 复制 default / 复制其他专家）、头像、专家名称（中英文）、专家介绍、擅长领域（tag）、默认模型（Base URL + API Key + 模型名称）
  - 不在向导中配置人设（SOUL.md 默认留空，由用户进详情页「人设」Tab 编辑）
  - 不在向导中配置技能（自动 seed 内置技能 + 全部启用；详情页「技能」Tab 用开关启停 / Hub 安装）
  - 不在向导中配置工具（默认继承 `_HERMES_CORE_TOOLS`；详情页「工具」Tab 全部可配置 + 开关）
  - 不在向导中单独配置 MCP：「从零开始」无预置；「复制」时沿用 Hermes `--clone` 保留源 `mcp_servers`（不 strip），由用户在详情页「MCP」Tab 补密钥 / 启停 / 增删
  - 不在向导中配置工作空间根（后端默认创建 `<HERMES_HOME>/workspace/`，由用户在详情页「工作空间」Tab 调整）
- 专家详情页
  - 顶部信息卡（头像、名称、简介、标签、编辑、发起任务、返回）
  - Tab 导航（8 个，带数量角标）
  - 人设 Tab：读写 SOUL.md，保存默认下次会话生效
  - 工作空间 Tab：展示 workspace_root 完整目录树；支持配置/变更工作空间根、上传文件
  - 任务 Tab：列出该专家的进行中/已就绪任务（含工作目录、最近活跃列），跳转任务对话页
  - 技能 Tab：全部已安装技能 + 启用开关 + 用量（使用/补丁/最近使用）+ hub 安装入口
  - 工具 Tab：全部可配置 toolset + 启用开关（复用 `/api/tools/toolsets`）；无「添加/解绑」
  - MCP Tab：本模块内嵌轻量 CRUD；缺密钥或连通失败显示红色状态
  - IM 渠道 Tab：企业微信（`wecom` + `wecom_callback`）、钉钉、飞书的启用/禁用 + 凭据配置 + 访问策略
- 发起任务：从专家详情页或列表卡片的「发起任务」按钮跳转任务对话页

### 3.2 MVP 不包含

- 记忆 Tab 的高级管理（手动增删改查记忆卡片、provider 切换 UI）
  - MVP 阶段记忆 Tab 只做只读展示 `memories/MEMORY.md` + `USER.md`。
  - provider 切换走 `hermes memory setup` 命令。
- IM 渠道的高级管理（消息路由规则、群聊精细化策略、送达统计、消息模板）
  - MVP 阶段 IM 渠道 Tab 做企业微信（AI Bot + 自建应用回调）、钉钉、飞书的启用/禁用 + 凭据 + 基础访问策略。
  - Telegram、Discord、Slack 等其他平台放后续版本。
- MCP 的高级管理（Catalog 一键安装、OAuth 登录流、`tools.include/exclude` 细过滤、mTLS / 自定义 CA）
  - MVP 阶段 MCP Tab 只做列表 + 启用/禁用 + HTTP/stdio 简化添加 + 删除 + 缺密钥/连通失败红点状态。
  - 创建时**不** strip 源专家经 `--clone` 带来的 `mcp_servers`（对齐 Hermes 默认行为）。
- 专家列表页的搜索和筛选
  - MVP 阶段专家数量预期 < 50，不做搜索。
- 任务统计、专家画像分析
- 多专家协作编排（由 kanban PRD 承载）
- 专家分享、专家模板
- 创建向导的 Review 步骤
- 软删除（MVP 走硬删除 + 二次确认）

## 4. 核心概念映射

| 产品概念 | Hermes 概念 | 文件/存储位置 | per-profile? | CLI 入口 |
|---|---|---|---|---|
| 专家 | `Profile` / `ProfileInfo` | `~/.hermes/profiles/<name>/` | 是（即 profile 本身） | `hermes profile create/use/delete` |
| 专家名称（中文） | `profile.yaml` `display_name`（**新增**） | `<HERMES_HOME>/profile.yaml` | 是 | 产品层维护 |
| 专家 slug | profile 目录名 | `~/.hermes/profiles/<name>/` | 是 | `hermes profile create <name>` |
| 专家简介 | `profile.yaml` `description` | `<HERMES_HOME>/profile.yaml` | 是 | `hermes profile create --description` |
| 专家头像 | `profile.yaml` `avatar`（**新增**） | `<HERMES_HOME>/profile.yaml` + 头像文件 | 是 | 产品层维护 |
| 领域标签 | `profile.yaml` `tags`（**新增**） | `<HERMES_HOME>/profile.yaml` | 是 | 产品层维护 |
| 模型 / Provider | `config.yaml` `model` / `providers` | `<HERMES_HOME>/config.yaml` | 是 | `hermes setup model` |
| 人设 | `SOUL.md` + `DEFAULT_SOUL_MD` + `build_system_prompt_parts()` | `<HERMES_HOME>/SOUL.md` | 是 | 直接编辑文件 |
| 工作空间根 | `terminal.cwd`（profile 级） | `config.yaml` `terminal.cwd` + 物理目录 | 是 | 创建时后端默认 `<HERMES_HOME>/workspace/` / 工作空间 Tab |
| 工作目录 | session `cwd` | `<HERMES_HOME>/state.db` sessions 表 | 否（per session） | 任务对话页 `_set_session_cwd` |
| 任务 | `SessionDB.sessions` + `kanban_db.tasks.session_id` | `<HERMES_HOME>/state.db` + 共享 kanban DB | sessions 是 / kanban 共享 | `hermes sessions` / `hermes kanban` |
| 记忆 | `MemoryManager` + `MemoryProvider` ABC + `MEMORY.md`/`USER.md` | `<HERMES_HOME>/memories/` + provider 后端 | 是 | `hermes memory setup` |
| 技能 | `skills/` + `skills.disabled` + `tools/skill_usage.py` + Hub | `<HERMES_HOME>/skills/` + `.usage.json` | 是 | `hermes skills` / `hermes skills install` |
| 工具 | `CONFIGURABLE_TOOLSETS` + `platform_toolsets.cli` + `_HERMES_CORE_TOOLS` | `config.yaml` → `platform_toolsets` | 是 | `hermes tools` / `GET/PUT /api/tools/toolsets` |
| MCP | `mcp_servers` config | `config.yaml` `mcp_servers` 段 + `.env`（凭据） | 是 | 产品层 API 读写；底层兼容 `hermes mcp` |
| IM 渠道 | `BasePlatformAdapter` + 各平台配置 + `acquire_scoped_lock` | `config.yaml` (`wecom` / `wecom_callback` / `dingtalk` / `feishu`…) + `.env` (tokens) | 是 | `hermes setup gateway` / Dashboard Channels |
| 活动状态（活跃/待命） | session `status='running'` + `gateway.pid` PID 存活 | `<HERMES_HOME>/state.db` sessions 表 + `gateway.pid` | 是 | 观察值，非开关 |

### 4.0 活动状态（非启用/停用）

Profile 本身是磁盘目录，没有「启用/停用」开关 -- 只要目录存在，`hermes -p <name>` 随时可用。本 PRD **不设计**「启用/停用」产品概念，因为 Hermes core 不认这个标志，手动加 `disabled` 字段会导致「UI 显示停用但 CLI/cron 照常运行」的认知偏差。

产品层展示的是**活动状态**（观察值，非用户可拨的开关）：

| 产品概念 | 含义 | 视觉 | 数据来源 |
|---------|------|------|---------|
| 活跃 | 有 ≥1 个运行中 session | 🟢 绿点 + 运行中 session 数 | `GET /api/profiles/<name>/sessions?status=running` 计数 > 0 |
| 待命 | 无运行中 session，profile 在磁盘上可用 | 不显示状态点 | 同上计数 = 0 |

**关键**：活动状态是**观察值**，不是用户可操作的开关。发起任务自然变活跃，任务结束自然回到待命。用户不能手动切换。

### 4.1 `profile.yaml` 扩展

Hermes 现有的 `profile.yaml` 只有 `name`、`description`、`model`、`provider`。本 PRD 新增三个产品层元数据字段：

```yaml
# 现有字段
name: human-robot-collab          # slug，目录名
description: 聚焦协作机器人、AGV调度与人机工效优化...
model: gpt-4o
provider: openai

# 新增字段（产品层元数据，Hermes 核心不依赖）
display_name: 人机协作专家        # 中文名，区别于 slug
avatar: profiles/human-robot-collab/avatar.png  # 头像路径（相对 HERMES_HOME）
tags:                            # 领域标签，自由文本
  - 协作机器人应用
  - AGV调度策略
  - 柔性产线布局
```

读取走 `ProfileInfo` dataclass 扩展。`AGENTS.md` 的 profile-safe 规则要求所有路径用 `get_hermes_home()`，本 PRD 遵守。

### 4.2 卡片标签的决策

专家列表页卡片和详情页头部展示的标签是**领域标签**（`profile.yaml` `tags`），不是技能名。理由：

1. 技能名是技术 ID（如 `hermes-agent-dev`、`kanban`），对 B 端用户不友好。
2. 领域标签是用户在创建向导中主动填的自由文本，天然用于分类和检索。
3. 设计稿内容匹配领域标签。

技能 Tab 角标展示**已启用**技能数（不在 `skills.disabled` 中的数量）。

### 4.3 工作空间与工作目录（本模块职责边界）

与 `task-session-mvp-prd.md` §2.3 对齐：

| 层级 | 概念 | 本 PRD（专家管理） | task-session PRD |
|---|---|---|---|
| Profile | 工作空间根 | 创建时初始化、工作空间 Tab 配置/上传文件 | 侧边栏目录树根（**所有 session 可浏览**） |
| Session | 工作目录 | 任务 Tab 展示 `cwd` | 切换/高亮、输入区、新建任务默认值 |
| 约定 | 任务产物 | SOUL 模板：产物写在当前工作目录内 | 运行时 SOUL/skill 执行 |

**所有 session 共享 profile 工作空间根**：session `cwd` 默认即工作空间根，用户可改为子目录；各任务仍可在 UI 浏览整棵树，agent 读工作空间内任意文件用绝对路径或 `../`（见 task-session §2.3.4）。

创建专家时后端只创建工作空间根本身（空目录），不预置任何子目录；用户自行组织文件结构。

### 4.4 记忆语义（重要）

专家记忆底层是 Hermes 的两份文件，产品层需让 B 端用户看懂语义：

| 底层文件 | 产品层语义 | 写入机制 | 内容举例（工艺专家） |
|---------|-----------|---------|---------------------|
| `<HERMES_HOME>/memories/MEMORY.md` | **专家经验** — 专家在历次任务中沉淀的方法论、项目背景、约定 | 模型主动调用 `memory(action="add")` 工具时同步落盘；可选外部 provider 异步抽取（MVP 不启用） | 「该产线良率基线 92%，目标 95%」「SPC 控制图统一用 Minitab 输出」 |
| `<HERMES_HOME>/memories/USER.md` | **用户画像** — 专家对该用户的认知 | 同上 | 「用户是工艺工程师背景，熟悉 SPC 术语」「偏好结论先行」 |

**关键属性**：

1. **两者都是专家主动「学」的，不是对话自动录制的**。`memory_enabled` 默认为 `True` 只代表 `memory` 工具被注入、模型「有能力」写；真正落盘需要模型在对话中主动调用 `memory` 工具，或配置 `memory.provider` 激活外部 provider 的每轮自动同步。MVP 阶段不启用外部 provider，所有写入均来自模型主动调用。
2. **容量受 config 上限约束**：`memory_char_limit=2200`、`user_char_limit=1375`。记忆是 curated 沉淀，不是无限录像。
3. **写入时机**：模型在对话中判断「值得记」时调用 `memory` 工具同步写盘；用户也可在对话中直接说「记住：……」触发写入。
4. **生效时机**：`MemoryStore` 内容在会话启动时被快照进系统提示词 volatile 层（`agent/system_prompt.py`），会话内修改文件不影响已运行会话，新会话加载新内容（遵循 §10.1 prompt 缓存约束）。
5. **per-profile 独立**：每个专家 = 独立 HERMES_HOME = 独立 `memories/`，专家之间互不可见（§10.2）。

> 本节语义在 §8.8 记忆 Tab 的展示与引导中体现。

## 5. 信息架构

### 5.1 模块整体结构

```text
专家管理模块
├─ 专家列表页
│  └─ 卡片网格 + 新建专家入口
├─ 创建专家向导（弹窗，单步）
│  └─ 来源（从零 / 复制 default / 复制其他专家）+ 身份信息 + 模型
└─ 专家详情页（Tab 结构）
   ├─ 人设 Tab
   ├─ 工作空间 Tab
   ├─ 任务 Tab
   ├─ 记忆 Tab（P1，MVP 只读）
   ├─ 技能 Tab
   ├─ 工具 Tab（Hermes 内置 toolset）
   ├─ MCP Tab（外部 MCP 服务，本模块内嵌轻量 CRUD）
   └─ IM 渠道 Tab（企业微信两种 + 钉钉 / 飞书，MVP 基础配置）
```

### 5.2 页面跳转关系

```text
专家列表页
  ├─ 点击「新建专家」 → 创建专家向导（弹窗）
  │    └─ 完成创建 → 跳转专家详情页
  ├─ 点击卡片「发起任务」 → 任务对话页（新建 session）
  └─ 点击卡片「管理」 → 专家详情页

专家详情页
  ├─ 点击「发起任务」 → 任务对话页（新建 session）
  ├─ 点击「返回」 → 专家列表页
  ├─ 任务 Tab 点击任务行 → 任务对话页（resume session）
  └─ 工作空间 Tab → 复用 task-session PRD 目录树（工作空间根；工作目录切换在对话页）
```

### 5.3 与其他 PRD 的页面边界

- **任务对话页**：由 `task-session-mvp-prd.md` 定义。本 PRD 的「发起任务」和「任务 Tab 点击任务行」都跳转到该页面。
- **项目看板**：由 `project-kanban-mvp-prd.md` 定义。本 PRD 不涉及项目结构，专家作为项目成员被 kanban PRD 引用。
- **技能管理页 / 工具管理页 / MCP 管理页**：本 PRD 的「技能」「工具」「MCP」Tab 是单专家维度的启停与配置入口。技能对齐 Hermes `skills.disabled`（opt-out）；工具对齐 `platform_toolsets.cli`（opt-in 列表 + 开关 UI），不另造「绑定」表。本产品**不依赖** Hermes Dashboard（如 `/mcp` McpPage）；MCP 的增删启停在专家详情「MCP」Tab 内完成。工具列表/启停优先复用 Dashboard 已有 `/api/tools/toolsets`。

## 6. 专家列表页

### 6.1 定位

专家列表页是专家管理模块的入口，展示所有已创建的专家，支持新建、管理、发起任务、删除。

### 6.2 页面结构

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [专家]  [项目]                                                       │
├──────────────────────────────────────────────────────────────────────┤
│  专家                                                                │
│  共 9 位智能体专家 · 发起任务或管理专家配置           [+ 新建专家]    │
├──────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │ 专家卡片  │  │ 专家卡片  │  │ 专家卡片  │                          │
│  └──────────┘  └──────────┘  └──────────┘                          │
│  ...                                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.3 顶部区域

| 元素 | 内容 | 来源 |
|---|---|---|
| 页面标题 | `专家` | 静态 |
| 副标题 | `共 N 位智能体专家 · 发起任务或管理专家配置` | 扫描 `~/.hermes/profiles/` 目录数 |
| 新建专家按钮 | 蓝色 + 加号图标 | 点击触发创建向导 |

### 6.4 专家卡片

每个卡片展示单个 profile 的核心信息：

```text
┌──────────────────────────────────────┐
│ (头像)  人机协作专家   🟢 2  (⋯)      │
│                                      │
│ 聚焦协作机器人、AGV调度与人机工效优 │
│ 化，具备柔性产线布局设计与机器人编程 │
│ 调试的丰富项目经验。                 │
│                                      │
│ [协作机器人应用] [AGV调度策略]      │
│ [柔性产线布局]                       │
│                                      │
│ [发起任务]      [管理]               │
└──────────────────────────────────────┘
```

> 当该专家有运行中 session 时，专家名称右侧显示 🟢 绿点 + 运行中 session 数（如 `🟢 2`）。无运行中 session 时不显示状态点（不显示灰点）。

卡片字段映射：

| 卡片元素 | 数据来源 | 说明 |
|---|---|---|
| 头像 | `profile.yaml` `avatar` | 默认占位头像 |
| 专家名称 | `profile.yaml` `display_name` | 回退到 slug |
| 活动状态 | `GET /api/profiles/<name>/sessions?status=running` 计数 | 有运行中 session 时显示 🟢 + 数量；无运行中 session 时不显示 |
| 更多操作（⋯） | 产品层 | 弹出删除等操作 |
| 简介 | `profile.yaml` `description` | 截断显示 |
| 领域标签（3 个） | `profile.yaml` `tags` | 超出 3 个折叠 |
| 发起任务按钮 | 产品层 | 跳转任务对话页，新建 session |
| 管理按钮 | 产品层 | 跳转专家详情页 |

### 6.5 卡片操作

#### 6.5.1 发起任务

点击「发起任务」按钮：

1. 为该 profile 新建一个 Hermes session。
2. 初始化 session `cwd`（工作目录）为**工作空间根**（`terminal.cwd`），`explicit_cwd=true`；用户可在创建前选子目录，或创建后在侧边栏/下拉修改。**不**自动创建 `tasks/<session-id>/`。
3. 跳转到任务对话页（`task-session-mvp-prd.md` 定义）。
4. session 的 `profile` 字段绑定当前专家。

MVP 阶段不弹出任务表单，直接进入空白对话页，用户在对话页输入框填写任务指令。

#### 6.5.2 管理

点击「管理」按钮跳转到专家详情页（见第 8 节）。

#### 6.5.3 删除（更多操作）

点击「⋯」弹出操作菜单，选择「删除」：

1. 查询该 profile 的运行中 session 数 `running_count`（`GET /api/profiles/<name>/sessions?status=running`）。
2. 弹出二次确认弹窗（统一要求输入专家名确认，无论是否有运行中会话）：

```text
┌─ 删除专家 ───────────────────────────────────────────┐
│                                                       │
│  ⚠ 确定删除专家『人机协作专家』？                     │
│                                                       │
│  [若有运行中会话时显示此段]                           │
│  该专家当前有 2 个运行中会话，删除将强制终止这些      │
│  会话，未保存的对话上下文可能丢失。                   │
│                                                       │
│  此操作不可恢复，将清除该专家的所有配置、技能、       │
│  记忆、会话历史。                                     │
│                                                       │
│  请输入专家名称以确认：                               │
│  ┌────────────────────────────────┐                   │
│  │                                │                   │
│  └────────────────────────────────┘                   │
│                                                       │
│  [取消]                              [强制删除] (灰)   │
└───────────────────────────────────────────────────────┘
```

- 弹窗始终要求输入专家 `display_name` 确认。
- 输入内容 == 专家 `display_name` 时，「强制删除」按钮变红可点击；否则灰色不可点击。
- `running_count > 0` 时，弹窗额外显示警告行（「该专家当前有 N 个运行中会话…」），按钮文案为「强制删除」。
- `running_count == 0` 时，不显示警告行，按钮文案为「删除」，仍需输入专家名确认。
3. 用户确认后执行 `hermes profile delete <name>`（后端自动停 gateway + Desktop 后端进程 + rmtree）。
4. 硬删除：移除 `~/.hermes/profiles/<name>/` 整个目录、移除别名、移除相关 service。
5. 列表刷新。

**MVP 不做软删除**。AGENTS.md 没有软删除机制，硬删除 + 输入名称确认是 supported path。

### 6.6 数据来源

列表页数据来自扫描 `~/.hermes/profiles/` 目录：

- 每个 subdirectory 是一个 profile（排除 `default`，default profile 不在专家列表展示）。
- 读取每个 profile 的 `profile.yaml` 获取 `display_name`、`description`、`avatar`、`tags`。
- 计数：`len(profiles_dir.glob("*/"))` 排除 default。

### 6.7 MVP 不做

- 搜索（按名称/标签搜索专家）
- 筛选（按标签筛选）
- 排序（按创建时间/最近使用排序）
- 分页（专家数量预期 < 50，一页展示）

以上放 v1.1。

## 7. 创建专家向导

### 7.1 整体规则

创建向导采用**单步弹窗**流程：用户在一张表单内完成「来源 + 身份信息 + 模型」三组配置，点击「创建并进入」提交。

**设计动机**：四步向导在「创建专家」这个动作上太重。用户的真实使用路径是「先创建占位，进详情页边用边配置」。把人设/技能/工具/MCP/工作空间的精细化配置全部挪到详情页，弹窗只保留「让专家能被建出来并可工作」的最低字段。

通用规则：

- 「取消」关闭弹窗，丢弃所有未填写内容（弹出二次确认）。
- 必填项校验通过才能提交。不同来源校验项不同（见 §7.2 字段表 + §7.6 底部操作）。
- 提交时一次落盘（原子事务），无中间状态。
- 创建完成后**直接跳转到该专家的详情页**（默认打开「人设」Tab，并显示首次使用引导）。
- 列表页数据在跳转后刷新。

**弹窗内不出现**的字段（由详情页对应 Tab 接管）：

- 人设（SOUL.md）→ 详情页「人设」Tab，默认留空。
- 技能启停 → 详情页「技能」Tab（全部列表 + 开关），创建时全部 seed 并默认启用。
- 工具集（toolset）→ 详情页「工具」Tab（全部可配置 + 开关），默认继承 `_HERMES_CORE_TOOLS`。
- MCP 服务器 → 详情页「MCP」Tab。「从零开始」无预置；「复制」时保留 Hermes `--clone` 带来的 `mcp_servers`（产品层不 strip），缺密钥 / 连通失败用红色状态提示。
- 工作空间根路径 → 详情页「工作空间」Tab，后端默认创建 `<HERMES_HOME>/workspace/`，（空目录，不预置子目录）。

### 7.2 弹窗字段

| 字段 | 必填 | 说明 | 校验规则 |
|---|---|---|---|
| 来源 | 是 | 单选：「从零开始」/「复制 default」/「复制其他专家」 | 默认「从零开始」；选「复制其他专家」时，下方展开一个 profile 选择下拉（列出所有非 default 的 profile） |
| 头像 | 否 | 点击上传头像，支持 JPG/PNG，最大 2MB | 默认提供占位头像；存储在 `<HERMES_HOME>/avatar.{ext}`，`profile.yaml` 记录相对路径 |
| 专家名称（中文） | 是 | 中文展示名，如「首席工艺专家」 | 1-32 字符 |
| 专家 slug | 自动生成，可编辑 | 拼音/英文 slug | 从名称自动生成；符合 `^[a-z0-9][a-z0-9_-]{0,63}$`；不可与已有 profile 重名；与 `_RESERVED_NAMES`、`_HERMES_SUBCOMMANDS` 冲突时给出明确错误 |
| 专家介绍 | 是 | 简要描述专家能力与经验背景 | 1-200 字符 |
| 擅长领域 | 否 | 领域标签，回车或按钮添加 | 最多 10 个标签，每个 ≤ 20 字符 |
| 默认模型 | 「从零开始」必填；「复制 default / 复制其他专家」灰显 | 自定义模型配置：Base URL + API Key + 模型名称（+ 可选 Provider 名称）。作为专家的默认模型，对话任务未选择其他模型时使用此模型 | 「从零开始」时必填 Base URL、API Key、模型名称；「复制」时沿用源 profile，UI 上模型配置区灰显并提示「沿用自源 profile」 |

默认模型子字段：

| 子字段 | 必填 | 说明 | 校验规则 |
|---|---|---|---|
| Base URL | 是 | OpenAI 兼容 API 端点，如 `https://api.openai.com/v1` | 合法 URL（含 scheme + host） |
| API Key | 是 | 模型服务的 API 密钥 | 非空；密码框输入，不回显 |
| 模型名称 | 是 | 模型 ID，如 `gpt-4o`、`deepseek-chat`、`llama-3.1-70b` | 非空 |
| Provider 名称 | 否 | 自定义 provider 显示名；留空则从 Base URL host 自动生成 | 1-32 字符 |

> **默认模型（自定义模式）**：MVP 阶段采用自定义模式，用户直接填写 Base URL + API Key + 模型名称。此模型作为专家的**默认模型** -- 对话任务未通过模型下拉切换其他模型时使用此模型。配置写入新 profile 的 `config.yaml` `providers.` 段 + `.env`，遵循 Hermes 原生格式（`_normalize_custom_provider_entry` 兼容）。后续版本将对接独立的「模型管理」功能，支持 provider 预设模板、模型清单管理等高级能力。

> **复制来源的语义**：
> - 「从零开始」：调用 `hermes profile create <slug>`，后端自动 seed 一份完整的内置技能包并默认全部启用。
> - 「复制 default」：调用 `hermes profile create <slug> --clone --clone-from default`，把 default 的 `config.yaml`、`.env`、`SOUL.md`、已安装 skills 复制到新 profile。
> - 「复制其他专家 <X>」：调用 `hermes profile create <slug> --clone --clone-from <X>`，把指定 profile 的上述文件复制过来。「复制其他专家」下拉只展示非 default 的 profile，选项名取自 `display_name`，回退到 slug。

### 7.3 布局

```text
┌─ 新建专家 ──────────────────────────────────────────────┐
│ 来源: ◉ 从零开始  ○ 复制 default  ○ 复制其他专家 ▾      │
│                                                          │
│ ┌──┐   专家名称 *                                        │
│ │头│   如:首席工艺专家                                   │
│ │像│   slug: shouxi-gongyi (自动生成)                    │
│ └──┘   专家介绍 *                                        │
│        简要描述专家能力与经验背景                       │
│                                                          │
│ 擅长领域:  [SPC] [良率分析] [工艺优化] [+]              │
│                                                          │
│ 默认模型 *                                               │
│ Base URL:    [https://api.openai.com/v1        ]        │
│ API Key:     [•••••••••••••••••••••••••••••••   ]        │
│ 模型名称:    [gpt-4o                            ]        │
│ Provider 名称:[我的模型服务 (可选)               ]        │
│                                                          │
│ [取消]                                       [创建并进入] │
└──────────────────────────────────────────────────────────┘
```

要点：

- 「来源」单选 + 「复制其他专家」联动下拉，节省弹窗高度。
- 头像与「专家名称」同行对齐，与原设计稿视觉一致。
- 擅长领域用 chip + 「+」按钮，符合原设计稿。
- 默认模型用自定义表单（Base URL + API Key + 模型名称 + 可选 Provider 名称），作为专家的默认模型，对话任务未选择其他模型时使用。MVP 不提供 provider 预设下拉。「复制」路径时此区灰显。
- 底部「创建并进入」按钮文案明确表达「创建后直接进入详情页」。

### 7.4 头像上传

- 虚线圆形上传占位图标，提示「点击上传头像」。
- 规则说明：`支持 JPG、PNG，最大 2MB`。
- 上传后预览头像。
- 头像文件存储在 `<HERMES_HOME>/avatar.png`（或 `avatar.jpg`），`profile.yaml` `avatar` 字段记录相对路径。

### 7.5 擅长领域标签

- 输入框 + 「+」按钮。
- 回车添加标签。
- 已添加标签以浅底色 chip 展示，每个 chip 右侧提供「×」移除按钮。
- 标签数量上限 10 个，超出时输入框禁用。
- 这些标签存入 `profile.yaml` `tags` 字段，用于列表页卡片展示。

### 7.6 底部操作

```text
[取消]                                          [创建并进入]
```

- 取消：弹出二次确认「放弃当前填写？」，确认后关闭弹窗。
- 创建并进入：校验必填项。「从零开始」校验（来源、名称、slug、介绍、默认模型的 Base URL、API Key、模型名称）；「复制 default / 复制其他专家」校验（来源、源 profile 有效、名称、slug、介绍）。通过后执行 §7.7 提交逻辑。

### 7.7 提交行为

点击「创建并进入」后，系统执行以下原子事务：

#### 7.7.1 落盘步骤

```text
1. 校验 slug 合法性、唯一性、与 reserved/subcommand 列表的冲突。
2. 根据「来源」调用对应的 CLI：
   - 从零开始：       hermes profile create <slug> --description "<介绍>"
   - 复制 default：   hermes profile create <slug> --description "<介绍>" --clone --clone-from default
   - 复制其他 X：     hermes profile create <slug> --description "<介绍>" --clone --clone-from <X>
   → 创建 ~/.hermes/profiles/<slug>/ 目录 + 基础结构（_PROFILE_DIRS）
3. 写入 profile.yaml 扩展字段（display_name、avatar、tags）。「从零开始」时还写入默认模型配置（见步骤 3a）；「复制 default / 复制其他专家」时默认模型沿用源 profile（CLI 已通过 --clone 复制 config.yaml），产品层不覆盖。

   **3a.「从零开始」时的默认模型写入（自定义模式）**：
   - 生成 provider slug：从「Provider 名称」字段生成（若留空则从 Base URL host 自动生成），slug 化后作为 `providers.` 段的 key。
   - 写入 `config.yaml` 的 `providers.<slug>` 段：
     ```yaml
     providers:
       <slug>:
         name: "<Provider 名称或自动生成>"
         base_url: "<用户填写的 Base URL>"
         api_mode: "chat_completions"
         default_model: "<用户填写的模型名称>"
     ```
   - 写入 `.env` 的 `<SLUG>_API_KEY=<用户填写的 API Key>`，权限 `0o600`（遵循 §10.5 凭据进 `.env` 约束）。
   - 写入 `config.yaml` 的 `model` 段：
     ```yaml
     model:
       provider: <slug>
       default: <模型名称>
     ```

4. 写入 config.yaml 的 `terminal.cwd = <HERMES_HOME>/workspace`（无论来源，强制覆盖源 profile 的 `terminal.cwd`，避免跨机器绝对路径不可移植）。
   - 「复制 default / 复制其他专家」时不写 model（已通过 --clone 复制 config.yaml）。
5. SOUL.md 留空（不写入任何内容；用户进详情页「人设」Tab 编辑）。如果「复制 default」或「复制其他专家」时源 profile 已有 SOUL.md，则已通过 --clone 复制过来，用户在详情页可继续编辑。
6. 创建 workspace 物理目录 `<HERMES_HOME>/workspace/`（空目录，不预置子目录）。无论来源，强制覆盖源 profile 的 `terminal.cwd`。
7. 记忆初始化（与 SOUL.md 不同，强制清空，见 §4.4 语义）：
   - 「从零开始」：不创建 `memories/MEMORY.md` / `USER.md`，目录保持空。
   - 「复制 default」/「复制其他专家」：若 `--clone` 已把源 profile 的 `memories/` 复制过来，产品层**清空**这两份文件（删除文件或清空内容，保留 `memories/` 空目录）。
   - 理由：MEMORY.md 是「专家经验」、USER.md 是「专家对该用户的认知」，属专家个人沉淀；A 专家的经验不应作为 B 专家的起点，否则会污染新专家的判断。这与 SOUL.md（人设，可继承）语义不同。
8. 技能用量初始化（见 §8.9.6）：
   - 「从零开始」：seed 后无用量记录 → 全部 0 / 「—」。
   - 「复制 default」/「复制其他专家」：若 `--clone` 已拷贝源 profile 的 `skills/.usage.json`，产品层**删除或清空**该文件。
   - 理由：用量是本专家自己的使用热度（per-profile），不应继承源专家。
```

所有步骤同步执行，无 PID 轮询。任一步骤失败回滚（删除已创建的 profile 目录）。

#### 7.7.2 技能与工具的默认行为

- **技能**：创建时调用 `seed_profile_skills()`（已存在于 `hermes_cli/profiles.py`），把内置技能包（built-in + optional）全部 seed 到 `<HERMES_HOME>/skills/`，并默认**全部启用**（不写入 `disabled` 列表）。用户进详情页「技能」Tab 以「全部 + 开关」启停，或从 Hub 安装；复制来源时清空 `.usage.json`（§8.9.6）。
- **工具（toolset）**：创建时默认继承 `_HERMES_CORE_TOOLS`（不强制写满 `platform_toolsets.cli`）。用户进详情页「工具」Tab 以「全部可配置 + 开关」启停可选 toolset（落盘 `_save_platform_tools` / `platform_toolsets.cli`）。
- **MCP 服务器**：
  - 「从零开始」：不预置 `mcp_servers`。
  - 「复制 default / 复制其他专家」：沿用 Hermes `hermes profile create --clone` / `--clone-from` 行为，**完整保留**源 profile `config.yaml` 中的 `mcp_servers`；产品层**不**再 strip。`--clone` 同时会复制 `.env`（Hermes 原生），产品层也不额外清除 MCP 相关密钥，以尽量不偏离 Hermes。
  - 用户进详情页「MCP」Tab 查看 / 补密钥 / 启停 / 增删。若条目存在但缺必要密钥，或连通探测失败，UI 显示红色状态（见 §8.11.3）。

#### 7.7.3 完成跳转

创建成功后：

1. 关闭向导弹窗。
2. 跳转到新创建专家的详情页（`/profiles/<slug>`），**默认打开「人设」Tab**。
3. 详情页检测到 SOUL.md 为空，触发**首次使用引导**：顶部展示一条提示横幅「这是该专家的人设定义，目前为空。建议先填写核心职责、工作流程与行为准则（10-15 分钟）。」
4. 列表页数据刷新（在用户后续返回列表页时通过 store 失效或路由钩子触发）。

#### 7.7.4 指令映射示例

```bash
# 从零开始
hermes profile create shouxi-gongyi --description "首席工艺专家介绍..."

# 复制 default
hermes profile create shouxi-gongyi --description "..." --clone --clone-from default

# 复制其他专家 coder
hermes profile create work-bot --description "..." --clone --clone-from coder
```

产品层在 CLI 之后做 best-effort 写入：profile.yaml 扩展字段、config.yaml 的 `providers.` 段 + `model` 段（默认模型）+ `terminal.cwd`、`.env` 的 API Key、workspace 物理目录。

MVP 阶段建议扩展 `ProfileCreate` API（参考 §9.2），将单步向导的所有字段一次性传入，后端在 `create_profile()` 后追加 best-effort 写入步骤。

## 8. 专家详情页

### 8.1 定位

专家详情页是单个专家的全维度管理界面，以 Tab 结构展示人设、工作空间、任务、记忆、技能、工具、MCP、IM 渠道八个维度。

### 8.2 页面结构

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ←  (头像) 人机协作专家  [gpt-4o]  🟢 2 个运行中会话      [发起任务]    │
│      聚焦协作机器人、AGV调度与人机工效优化，具备柔性产线布局设计     │
│      与机器人编程调试的丰富项目经验。                               │
│      [协作机器人应用] [AGV调度策略] [柔性产线布局]      (编辑)       │
├──────────────────────────────────────────────────────────────────────┤
│ [人设] [工作空间] [任务·3] [记忆] [技能·2] [工具·1] [MCP·0] [IM渠道·1] │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                       当前 Tab 内容区                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

> 专家名称右侧显示默认模型标签（如 `[gpt-4o]`，来自 `config.yaml` `model.default`），表明该专家对话任务未选择其他模型时使用的默认模型。点击可展开 tooltip 显示 provider 名称和 base_url。
>
> 默认模型标签右侧显示活动状态：有运行中 session 时显示 🟢 + 「N 个运行中会话」（可点击，跳转任务 Tab 并筛选「进行中」）；无运行中 session 时不显示状态信息。

### 8.3 顶部信息卡

| 元素 | 内容 | 来源 |
|---|---|---|
| 返回按钮 | 左上角箭头 | 返回专家列表页 |
| 头像 | 圆形头像 | `profile.yaml` `avatar` |
| 专家名称 | 加粗展示 | `profile.yaml` `display_name` |
| 默认模型 | 模型名称标签，如 `[gpt-4o]`，位于专家名称右侧 | `config.yaml` `model.default`；点击可展开 tooltip 显示 provider 名称和 base_url |
| 活动状态 | 🟢 + 运行中会话数 | `GET /api/profiles/<name>/sessions?status=running` 计数；有运行中 session 时显示并可点击跳转任务 Tab，无运行中 session 时不显示 |
| 专家简介 | 灰色文字 | `profile.yaml` `description` |
| 领域标签 | 浅底色 chip | `profile.yaml` `tags` |
| 编辑按钮 | 卡片右上角铅笔图标 | 打开基础信息编辑弹窗（含默认模型配置区，见 §8.3.1） |
| 发起任务 | 蓝色按钮 + 纸飞机图标 | 跳转任务对话页，新建 session |

### 8.3.1 基础信息编辑弹窗

点击顶部信息卡的「编辑」按钮，弹出基础信息编辑弹窗。弹窗包含两部分：

1. **基础信息区**：头像、专家名称、专家介绍、擅长领域标签（与创建向导字段一致，可编辑）。
2. **默认模型配置区**：展示并可修改当前默认模型配置。字段与创建向导 §7.2 一致：

```text
┌─ 编辑专家 ──────────────────────────────────────────────┐
│                                                          │
│ ┌──┐   专家名称 *                                        │
│ │头│   如:首席工艺专家                                   │
│ │像│   slug: shouxi-gongyi (只读)                       │
│ └──┘   专家介绍 *                                        │
│        简要描述专家能力与经验背景                       │
│                                                          │
│ 擅长领域:  [SPC] [良率分析] [工艺优化] [+]              │
│                                                          │
│ ── 默认模型 ──────────────────────────────────────────  │
│ 当前默认模型: gpt-4o (via https://api.openai.com/v1)   │
│                                                          │
│ 修改默认模型？  ◉ 保持当前配置  ○ 修改为新的配置        │
│                                                          │
│ [选中「修改为新的配置」时展开以下表单]                   │
│ Base URL:    [https://api.openai.com/v1        ]        │
│ API Key:     [•••••••••••••••••••••••••••••••   ]        │
│ 模型名称:    [gpt-4o                            ]        │
│ Provider 名称:[我的模型服务 (可选)               ]        │
│                                                          │
│ [取消]                                         [保存]    │
└──────────────────────────────────────────────────────────┘
```

默认模型编辑规则：

- 默认展示当前默认模型信息（模型名称 + provider 名称 + base_url，只读）。API Key 不回显，以占位符 `••••••` 展示。
- 默认选中「保持当前配置」，用户无需修改即可保存其他基础信息。
- 选「修改为新的配置」时展开表单（Base URL + API Key + 模型名称 + 可选 Provider 名称），校验规则同创建向导 §7.2。
- 保存时写入 `config.yaml` 的 `providers.` 段 + `model` 段 + `.env`，遵循 prompt 缓存约束：
  - **默认下次会话生效**：当前正在运行的 session 不受影响（已启动的 session 会继续使用原模型），新 session 使用新默认模型。
  - 保存成功 toast 提示（根据运行中会话数动态展示）：
    - 有运行中会话（N > 0）：「已保存。该专家当前有 N 个运行中会话，修改将在新会话生效。」
    - 无运行中会话（N = 0）：「已保存。修改将在新会话生效。」
  - 运行中会话数来源：`GET /api/profiles/<name>/sessions?status=running`。

### 8.4 Tab 导航

Tab 顺序及角标：

| Tab | 角标含义 | MVP 状态 |
|---|---|---|
| 人设 | 无角标 | P0 |
| 工作空间 | 无角标 | P0 |
| 任务 | 进行中 + 已就绪的任务数 | P0 |
| 记忆 | 无角标 | P1（MVP 只读） |
| 技能 | 已启用技能数（∉ `skills.disabled`） | P0 |
| 工具 | 已启用 toolset 数 | P0 |
| MCP | 已启用 MCP 服务器数；若存在缺密钥/连通失败项，角标旁可加小红点 | P0 |
| IM 渠道 | 已启用渠道数 | P0 |

默认打开「人设」Tab。

### 8.5 人设 Tab

#### 8.5.1 定位

人设 Tab 管理专家的核心身份设定（System Prompt）。内容存储在 `<HERMES_HOME>/SOUL.md`。

#### 8.5.2 布局

左右分栏：

- 左栏：soul.md markdown 编辑器 + 工具栏。
- 右栏：实时预览区。
- 顶部操作区：左侧「导入 soul.md」/「导出 soul.md」，右侧「保存」按钮。

#### 8.5.3 首次使用引导（重要）

当用户从创建向导跳转进入新专家的详情页时，如果 `<HERMES_HOME>/SOUL.md` 为空（或仅含首尾空白），人设 Tab 顶部展示**首次使用引导横幅**：

> 这是该专家的人设定义，目前为空。建议先填写核心职责、工作流程与行为准则（约 10-15 分钟）。  
> 引导提示内容：该专家当前调用模型时会使用 Hermes 的 default 人格（`DEFAULT_SOUL_MD`），不会基于您填写的「专家名称/介绍/标签」自动生成。

引导横幅支持「知道了」按钮关闭，并在该 profile 的 `profile.yaml` 中写入 `soul_onboarded: true` 标记，下次进入不再展示。

引导横幅下方提供两个 CTA：
- 「从模板创建」：自动填充 §7.3.3 的标准化 SOUL 模板（含核心职责 / 工作流程 / 行为准则 / 工作目录与产物约定），用户在此基础上填写。
- 「导入 soul.md」：从本地 `.md` 文件导入。

#### 8.5.4 保存规则（重要）

人设内容修改后点击「保存」：

1. 写入 `<HERMES_HOME>/SOUL.md`。
2. **仅下次会话生效**（MVP **不提供**「立即生效」）：当前正在运行的 session 不受影响，只有新建 / 之后打开的 session 才会加载新人设。
3. 保存成功后 **必须提示**用户生效时机（根据运行中会话数动态展示）：
   - 有运行中会话（N > 0）：「已保存。修改将在**新会话**生效；该专家当前有 N 个运行中会话，仍使用旧人设。」
   - 无运行中会话（N = 0）：「已保存。修改将在**新会话**生效。」
4. 编辑器顶部常驻提示（保存前后均可见）：「人设变更默认在新会话生效，不影响已打开的对话。」

此规则遵循 AGENTS.md 的「Prompt 缓存神圣不可破」约束。系统提示词一次会话内字节稳定，只在上下文压缩时重建。运行中会话数来源：`GET /api/profiles/<name>/sessions?status=running`。

#### 8.5.5 模块说明

顶部展示说明文字：「人设：定义专家的核心职责、工作流程与行为准则。保存后默认在新会话生效。」

### 8.6 工作空间 Tab

#### 8.6.1 定位

工作空间 Tab 展示该专家**工作空间根**（profile `terminal.cwd`）的完整目录树，用于浏览文件、查看各任务**工作目录**及其中的产物。与任务对话页侧边栏**同源**。

- 目录树根 = 工作空间根。
- ★ 高亮：从任务 Tab / 对话页跳转时可传入 session 工作目录。
- 本 Tab **不**修改 session 工作目录（切换在任务对话页 `_set_session_cwd`）。

#### 8.6.2 工作空间根的默认值（重要）

专家的工作空间根**不在创建向导中配置**，由后端在创建时设置默认值：

- 默认值：`<HERMES_HOME>/workspace/`
- 物理目录自动创建，空目录，不预置子目录；用户自行组织文件结构。

默认值写入 `config.yaml` 的 `terminal.cwd` 段，与 PRD §4.3 推荐结构一致。用户在本 Tab 可通过「更改路径」修改（写入 `terminal.cwd` 并 `mkdir -p` 新路径），二次确认。

如果用户**复制 default** 或**复制其他专家**创建新 profile，新 profile 的工作空间根**重新设为默认值** `<HERMES_HOME>/workspace/`，不沿用源 profile 的 `terminal.cwd`。理由：源 profile 的工作空间根是绝对路径，跨机器/跨用户复制时不可移植；统一用相对 HERMES_HOME 的默认路径更安全。

#### 8.6.3 布局

```text
工作空间
专家工作空间根；所有 task 共享此目录树，工作目录默认为根，用户可改为子目录

<HERMES_HOME>/workspace  (工作空间根)     [更改路径]  [新建文件夹]  [上传文件]

| 名称                | 类型   | 来源       | 更新时间           | 大小  | 操作       |
|---------------------|--------|------------|--------------------|-------|------------|
| 工位8               | 文件夹 | 任务工作区 | 2026-06-11 06:09   | -     | 打开任务 ⋯ |
| 工位8/报告.md      | 文件 | 任务生成 | ...     | 65 B  | 预览 下载 ⋯|
```

「更改路径」更新 profile `terminal.cwd`（二次确认）。

#### 8.6.4 复用 task-session 组件

复用 `task-session-mvp-prd.md` 第 9 节目录树 + 内嵌文件列表；专家详情页为 Tab 常驻展示，对话页为侧边栏按需打开。

#### 8.6.5 文件来源标记

- **用户上传**：由用户通过工作空间 Tab 或对话页上传的文件。
- **任务生成**：位于某 session **工作目录**内的文件。

来源由路径启发式判断（session `cwd` 前缀匹配 → 任务生成）。

### 8.7 任务 Tab

#### 8.7.1 定位

任务 Tab 展示该专家名下的对话任务列表，支持新建、搜索、状态筛选、跳转任务对话页。

#### 8.7.2 布局

```text
对话任务
当前专家下的对话任务，可新建、打开或管理

任务总数 3 · 运行中 1 · 已就绪 2    [搜索框]  [状态: 全部 ▾]  [+ 新建任务]

| 任务ID              | 任务名称              | 工作目录            | 状态   | 最近活跃           | 操作          |
|---------------------|----------------------|---------------------|--------|--------------------|---------------|
| id_mq93taur_k1jyn5  | 工位8视觉检测工站部署 | .                   | 进行中 | 2026-06-11 06:09   | 打开 编辑 删除|
| id_mq93r6a0_5gm6v5  | 协作机器人产线布局优化| 工位8               | 待开始 | 2026-06-10 05:40   | 打开 编辑 删除|
| id_mq93r6a0_hr54jo  | AGV调度算法调优       | .                   | 待开始 | 2026-06-08 08:10   | 打开 编辑 删除|
```

「工作目录」列展示 session `cwd` 相对工作空间根的路径；点击可跳转工作空间 Tab 并高亮。

#### 8.7.3 任务数据来源

任务列表来自该 profile 的 SessionDB（`<HERMES_HOME>/state.db`）：

- 任务 ID = session ID。
- 任务名称 = session 的 title（由 `auxiliary.title_generation` 自动生成，或用户手动命名）。
- 工作目录 = session 的 `cwd`，创建任务时**默认 = 工作空间根**（见 task-session PRD §8.4）。
- **最近活跃**（`last_activity_at`）= 该 session 内用户最近一条消息的时间；尚未发送任何用户消息时回退为 session 创建时间（`created_at`）。列表默认按此字段降序排列（与任务对话页任务列表一致，见 `task-session-mvp-prd.md` §8.2）。
- 状态映射：
  - 运行中 = session 当前正在执行。
  - 已就绪 = session 已创建但未运行，或已暂停。
  - 已完成 = session 已结束（MVP 默认隐藏，可切换展示）。

#### 8.7.4 操作

- **打开**：跳转任务对话页，resume 该 session。
- **编辑**：弹出编辑弹窗，修改任务名称。
- **删除**：删除 session（硬删除 + 二次确认）。
- **新建任务**：新建 session，工作目录**默认 = 工作空间根**（`terminal.cwd`），用户可在创建前选子目录；跳转任务对话页。**不**自动创建 `tasks/<session-id>/`。

#### 8.7.5 搜索与筛选

- 搜索框：按任务名称或 ID 模糊匹配。
- 状态筛选：全部 / 进行中 / 已就绪 / 已完成。

### 8.8 记忆 Tab（P1，MVP 只读）

#### 8.8.1 MVP 范围

MVP 阶段记忆 Tab 只做只读展示（语义见 §4.4）：

- 展示 `<HERMES_HOME>/memories/MEMORY.md` 内容（**专家经验**：专家在历次任务中沉淀的方法论、项目背景、约定）。
- 展示 `<HERMES_HOME>/memories/USER.md` 内容（**用户画像**：专家对该用户的认知）。
- 以卡片或文本块形式渲染，每份文件一张卡片。
- 不支持新增、编辑、删除记忆。

**卡片元信息（只读）**：每张卡片头部展示：

| 字段 | 来源 | 说明 |
|------|------|------|
| 容量指示 | 文件字符数 / `memory_char_limit`（2200）或 `user_char_limit`（1375） | 例：「512 / 2200 字符」。让用户感知记忆是 curated 沉淀，有上限 |
| 上次更新时间 | 文件 mtime | 例：「2026-06-11 06:09 更新」 |
| 来源说明 | 静态文案 | MEMORY.md 卡片：「专家在任务对话中主动记下的经验与约定」；USER.md 卡片：「专家对您的认知，不同专家对您的认知可能不同」 |

**空状态引导**：当两份文件都为空（或文件不存在）时，记忆 Tab 展示一张引导卡片替代空白：

> 这位专家还没有任何记忆。
>
> 专家在任务对话中会主动记下重要的项目背景、约定和您的偏好；您也可以在对话中直接说「记住：……」来触发写入。
>
> 记忆会在该专家的所有未来任务中可用。

引导卡片支持「知道了」按钮关闭，并在该 profile 的 `profile.yaml` 中写入 `memory_onboarded: true` 标记，下次进入且仍为空时不再展示全屏引导，仅保留卡片头部的来源说明。

> 空状态引导避免 B 端用户看到空白以为功能损坏，同时讲清楚「主动写入」语义，防止「聊过就有记忆」的错误预期。

#### 8.8.2 P1 完整设计

P1 阶段补全：

- 搜索记忆（按关键词）。
- 按分类/来源筛选（用户偏好、项目背景、领域知识等）。
- 手动新增记忆卡片。
- 编辑、删除记忆。
- memory provider 切换（走 `hermes memory setup` 命令，不在 UI 内做）。

**手动编辑的生效规则（遵循 §10.1 prompt 缓存约束）**：

手动新增/编辑/删除记忆等价于修改 `MEMORY.md` / `USER.md` 文件。`MemoryStore` 内容在会话启动时被快照进系统提示词 volatile 层（`agent/system_prompt.py`），会话内修改文件不影响已运行会话，新会话加载新内容。因此 P1 的手动编辑与人设保存一致，**仅下次会话生效**（不提供「立即生效」）：

1. **仅下次会话生效**：当前正在运行的 session 不受影响，新 session 加载新的记忆。
2. 保存成功 toast 根据运行中会话数动态展示（文案同 §8.5.4）：
   - 有运行中会话（N > 0）：「已保存。修改将在**新会话**生效；该专家当前有 N 个运行中会话，仍使用旧记忆。」
   - 无运行中会话（N = 0）：「已保存。修改将在**新会话**生效。」
3. 运行中会话数来源：`GET /api/profiles/<name>/sessions?status=running`。

#### 8.8.3 架构约束

- **不新增 in-tree memory provider**（AGENTS.md 2026 年 5 月政策）。现有内置 provider 集合已封闭：honcho、mem0、supermemory、byterover、hindsight、holographic、openviking、retaindb。新 backend 必须作为独立插件 repo 发布。
- 记忆召回由 `MemoryManager` 自动处理，专家对话时自动匹配召回相关记忆注入上下文，UI 不干预召回逻辑。

### 8.9 技能 Tab

#### 8.9.1 定位

技能 Tab 管理**该专家 profile 下已安装技能**的启停、用量观察与 Hub 安装。对齐 Hermes 原生模型，**不发明「绑定」概念**：

| Hermes 概念 | 产品表达 | 落盘 |
|---|---|---|
| 磁盘上有 `SKILL.md` | 已安装 | `<HERMES_HOME>/skills/`（+ optional / hub / external_dirs） |
| 不在 `skills.disabled` | 已启用 | `config.yaml` → `skills.disabled`（**opt-out**） |
| 在 `skills.disabled` | 已禁用 | 同上；**不删文件** |

创建专家时 `seed_profile_skills()` 会装入内置技能并默认全部启用；本 Tab 的默认视图是 **全部已安装技能 + 启用开关**（与 Dashboard SkillsPage / `hermes skills` 一致），用户按需关闭不需要的技能，或从 Hub 安装新技能。

#### 8.9.2 列表布局

```text
技能
管理本专家已安装的技能（启停 / 用量 / Hub 安装）

已安装 N 项 · 已启用 M 项          [搜索]  [分类 ▾]  [从 Hub 安装]

| 启用 | 技能名           | 描述              | 分类            | 使用 | 补丁 | 最近使用 | 来源    |
|------|------------------|-------------------|-----------------|------|------|----------|---------|
| [✓]  | plan             | Create…           | software-dev…   | 12   | 0    | 2 小时前 | bundled |
| [✓]  | github-code-…   | Review PRs…       | github          | 3    | 1    | 昨天     | bundled |
| [ ]  | apple-notes      | Manage Notes…     | apple           | 0    | 0    | —        | bundled |
```

**默认视图**：全部已安装 + 每行启用开关（不默认只显示已启用）。支持：

- 按名称 / 描述搜索。
- 按**目录分类**筛选（见 §8.9.3）；「未分类」对应无 category 目录的技能。
- 可选筛选：全部 / 仅已启用 / 仅已禁用。
- 排序：默认按分类再按名称（对齐 `_sort_skills`）；可选按「最近使用」降序（从未使用沉底）。

Tab 角标：已启用数 `M`（不在 `skills.disabled` 中的数量）。

#### 8.9.3 字段来源（复用 Hermes，不另造元数据）

| 列 | 来源 | 说明 |
|---|---|---|
| 技能名 | `SKILL.md` frontmatter `name`，缺省用目录名 | `_find_all_skills()` |
| 描述 | frontmatter `description`；缺省取正文首行非标题文字；仍空则 UI 显示「暂无描述」 | **不**维护产品侧中文文案库 |
| 分类 | 目录路径 `skills/<category>/<name>/SKILL.md` → `category`；无中间目录 → 未分类 | `_get_category_from_path()`；MVP 直接展示目录名（如 `github`、`productivity`），不做第二套分类树；后续可加薄显示名映射 |
| 启用 | `name ∉ skills.disabled` | `get_disabled_skills` / `PUT …/toggle` |
| 使用次数 | `<HERMES_HOME>/skills/.usage.json` → `use_count` | `tools/skill_usage.py`；**per-profile** |
| 补丁次数 | 同上 → `patch_count` | `skill_manage` 编辑时 bump |
| 最近使用 | 同上 → `last_used_at` | **仅**真正使用（`bump_use`）；不用 `latest_activity_at`（后者含 view/patch）。从未使用 → 「—」 |
| 来源 | `hub` / `bundled` / `agent` | 与 Dashboard `GET /api/skills` 的 `provenance` 一致；用于角标与权限暗示（如 bundled 不可删） |

**用量与 profile 绑定**：`.usage.json` 位于该专家自己的 `HERMES_HOME/skills/`，专家之间互不可见。Dashboard 现有 `GET /api/skills` 只返回折叠的 `usage = activity_count`（use+view+patch 之和）；本 Tab 需要拆开字段时，在 profile 作用域 API 上展开 `use_count` / `patch_count` / `last_used_at`（仍读同一 sidecar，不另建统计库）。`view_count` MVP 不展示。

#### 8.9.4 启用 / 禁用

行内开关切换启用状态：

- **关闭**：把技能名写入 `config.yaml` → `skills.disabled`（不删除 `skills/` 下文件）。
- **打开**：从 `skills.disabled` 移除。

对齐现有 `PUT /api/skills/toggle`。操作遵循 prompt 缓存约束（§10.1），**仅下次会话生效**。toast：

- 有运行中会话（N > 0）：「已启用/已禁用。该专家当前有 N 个运行中会话，修改将在新会话生效。」
- 无运行中会话（N = 0）：「已启用/已禁用。修改将在新会话生效。」

运行中会话数来源：`GET /api/profiles/<name>/sessions?status=running`。

#### 8.9.5 从 Hub 安装（异步）

点击「从 Hub 安装」打开 hub 技能搜索界面（复用现有 SkillsPage 异步安装 + 进度组件）：

- 搜索 hub 上的技能。
- 选中后调用 `hermes -p <profile> skills install <id>`（子进程；`tools/skills_hub.py` 在模块导入时绑定 `SKILLS_DIR`，HERMES_HOME override 对已导入全局无效）。
- 立即返回 PID，UI 展示安装进度。
- 安装完成后技能出现在本列表，**默认启用**（不在 `disabled` 中）；用量从 0 / 「—」起算。

MVP **不**提供「从已安装池多选绑定」浮层——已安装技能已在默认列表中，用开关启用/禁用即可。

#### 8.9.6 创建 / 复制时的用量初始化

与记忆清空同理（§7.7.1）：用量是**本专家自己的使用热度**，不应继承源专家。

- 「从零开始」：seed 后无 `.usage.json` 或为空 → 全部 0 / 「—」。
- 「复制 default / 复制其他专家」：若 `--clone` 已拷贝源 profile 的 `skills/.usage.json`，产品层**删除或清空**该文件，避免继承源专家的 `use_count` / `last_used_at`。

技能文件本身（SKILL.md）按 Hermes seed / clone 规则保留；仅清用量 sidecar。

#### 8.9.7 架构约束

- **复用优先**：列表元数据走 `_find_all_skills`；启停走 `skills.disabled` + toggle API；用量走 `skill_usage.load_usage`；Hub 走现有子进程安装。不新建绑定表、不新建分类树、不新建用量库。
- 启停 / 安装后的会话生效规则见 §10.1；Hub 异步性见 §10.3。

### 8.10 工具 Tab

#### 8.10.1 定位

工具 Tab 管理该专家可调用的 **Hermes 内置 / 插件工具集（toolset）**。不包含外部 MCP 服务（见 §8.11）。

对齐 Dashboard / `hermes tools`：**列出全部可配置 toolset + 行内启用开关**，不发明「绑定 / 解绑」心智。

| Hermes 概念 | 产品表达 | 落盘 |
|---|---|---|
| `_get_effective_configurable_toolsets()` 中的项 | 可配置工具集（含插件 toolset） | — |
| 在 `platform_toolsets.cli` 中 | 已启用 | `config.yaml` → `platform_toolsets.cli`（**opt-in 列表**） |
| 不在该列表中 | 已禁用 | 同上；不删除 toolset 实现 |
| `_HERMES_CORE_TOOLS` | 核心工具（始终可用基线） | 创建时默认继承；本 Tab「额外启用数」为 0 时专家仍有核心能力 |

与技能的差异（写进 PRD 以免混用）：技能是 `skills.disabled` **opt-out**；工具是 `platform_toolsets.cli` **opt-in**。UI 都用「全部 + 开关」，但落盘路径不同。

工具与 MCP 对照：

| | 工具（本 Tab） | MCP（§8.11） |
|---|---|---|
| 是什么 | Hermes 内置 / 插件能力包 | 外部 MCP 服务暴露的工具 |
| 配置键 | `platform_toolsets.cli`（经 `_save_platform_tools`） | `mcp_servers.<name>` |
| 操作形态 | 全部列表 + 开关（+ 缺密钥时配置） | 增删服务器 + 启停 + 连接 |
| 用量统计 | **无**（不做 use_count / 最近使用） | — |

#### 8.10.2 列表布局

```text
工具
管理本专家可调用的 Hermes 内置工具集
当前有 N 个运行中会话，变更将在新会话生效

已启用 M / 共 K 个                              [搜索]

| 启用 | 工具集            | 描述              | 工具数 | 就绪     | 操作 |
|------|-------------------|-------------------|--------|----------|------|
| [✓]  | Terminal          | Terminal/command… | 5      | 🟢       | 详情 |
| [ ]  | Browser           | Browser automati… | 12     | 🟢       | 详情 |
| [✓]  | Web               | Web research…     | 2      | 🔴 缺密钥 | 配置 |
```

**默认视图**：全部可配置 toolset + 每行启用开关（与 `GET /api/tools/toolsets` / Dashboard 一致）。支持按名称 / 描述 / label 搜索；可选筛选全部 / 仅已启用 / 仅已禁用。

Tab 角标：已启用数 `M`（`platform_toolsets.cli` 中的可配置 toolset 数）。

顶部说明必须讲清核心基线：

> 未额外开启可选工具集时，专家仍可使用默认核心工具（`_HERMES_CORE_TOOLS`：文件、终端、搜索等）。本列表用于开启 browser、vision、web 等可选能力。

**不做**「+ 添加工具」浮层、「解绑」操作——已列出全部项，开关即启停。

#### 8.10.3 字段来源（复用 Hermes，不另造元数据）

数据优先复用现有 `GET /api/tools/toolsets?profile=<name>`（或专家模块等价封装），字段来自 `_get_effective_configurable_toolsets` + `resolve_toolset` + `_toolset_has_keys`：

| 列 | 来源 | 说明 |
|---|---|---|
| 启用 | `enabled`（name ∈ `platform_toolsets.cli`） | 行内开关 |
| 工具集 | `label` 为主标题，`name` 为次要 ID | `gui_toolset_label`；**禁止**主副标题同文案重复堆叠 |
| 描述 | `description` | TOOLSETS / 可配置表自带文案；空则「暂无描述」。不维护产品侧第二套中文库（MVP） |
| 工具数 | `len(tools)` | `resolve_toolset(name)`；可点开「详情」展开 `tools[]` 名单 |
| 就绪 | `configured` | 需密钥的 toolset：齐全 🟢 / 缺密钥 🔴「缺密钥」；无需密钥则 🟢 或不展示 |
| 操作 | 详情 / 配置 | 缺密钥时「配置」打开配置抽屉（复用 Dashboard `ToolsetConfigDrawer` 能力：provider / env） |

**明确不做**：toolset 级使用次数、最近使用——Hermes 无对应 sidecar，不另建统计。

#### 8.10.4 启用 / 禁用

行内开关：

- **打开**：把 toolset name 加入 `platform_toolsets.cli`（经 `_save_platform_tools`，与 `hermes tools` / `PUT /api/tools/toolsets/{name}` 同路径）。
- **关闭**：从该列表移除（不删除工具实现代码）。

遵循 prompt 缓存约束（§10.1），**仅下次会话生效**。toast：

- 有运行中会话（N > 0）：「已启用/已禁用。该专家当前有 N 个运行中会话，修改将在新会话生效。」
- 无运行中会话（N = 0）：「已启用/已禁用。修改将在新会话生效。」

运行中会话数来源：`GET /api/profiles/<name>/sessions?status=running`。

#### 8.10.5 缺密钥配置（P1 可做，MVP 至少红点）

- MVP：列表展示 `configured` 红点 +「缺密钥」文案，引导用户补全。
- 推荐同步复用现有 toolset config API（`GET/PUT /api/tools/toolsets/{name}/config|env|provider`）在本 Tab 内打开配置抽屉，避免跳转 CLI。
- 配置变更同样提示新会话生效。

#### 8.10.6 架构约束

- **复用优先**：列表 / 启停 / 密钥状态走 Dashboard tools API + `hermes_cli/tools_config.py`，不新建绑定表、不另造描述库、不做用量统计。
- **Footprint Ladder**（AGENTS.md）：本 Tab **不发明新 core tool**；外部能力走 MCP（§8.11）。
- 列表范围 = 可配置 toolset（`CONFIGURABLE_TOOLSETS` + 插件 toolset），不含平台聚合包（如整包 `cli` / `messaging`）的二次暴露，除非已出现在可配置表中。
- 启停生效规则见 §10.1。

### 8.11 MCP Tab

#### 8.11.1 定位

MCP Tab 管理该专家连接的 **外部 MCP 服务**（Model Context Protocol）。配置落在本 profile 的 `config.yaml` → `mcp_servers`，凭据进 `.env`。

本产品**不依赖** Hermes Web Dashboard 的 `McpPage`（`/mcp`），也不要求用户跳转 CLI。MCP 的增删启停在本 Tab **内嵌轻量完成**（方案 B）。

#### 8.11.2 MVP 范围

MVP 包含：

- 已配置服务器列表（名称、传输类型、启用状态、连接/密钥状态）
- 启用 / 禁用（写 `mcp_servers.<name>.enabled`）
- 添加服务器（简化表单：HTTP 或 stdio）
- 删除服务器（从 `mcp_servers` 移除条目；**不删除** `.env` 中可能残留的凭据，避免误伤）
- **状态红点**：缺必要 API Key / 密钥，或连通探测失败时显示红色状态，引导用户补全或修复

MVP 不包含（放入 v1.1）：

- Catalog / 官方目录一键安装
- OAuth 登录流（`hermes mcp login`）
- `tools.include` / `tools.exclude` 细粒度过滤
- mTLS、自定义 CA、`ssl_verify` 高级 TLS
- 完整连接诊断面板

#### 8.11.3 布局与状态模型

```text
MCP
接入外部 MCP 服务，扩展专家可调用的外部工具

已启用 2 台 · 其中 1 台需处理                     [+ 添加]

| 服务器名     | 类型  | 状态              | 操作              |
|--------------|-------|-------------------|-------------------|
| filesystem   | stdio | 🟢 正常           | 禁用  删除        |
| github-api   | HTTP  | 🔴 未配置密钥     | 填写密钥  禁用 删除 |
| legacy-fs    | stdio | 🔴 连接失败       | 重试  禁用  删除  |
| old-svc      | HTTP  | — 已禁用          | 启用  删除        |

(空状态)
尚未接入外部 MCP 服务。MCP 用于连接 GitHub、数据库、文件系统等外部工具。
点击「添加」配置一台服务。
```

**状态约定（MVP）：**

| 状态 | 条件 | UI |
|---|---|---|
| 🟢 正常 | `enabled: true`，必要密钥已具备，且连通探测成功（或 MVP 暂不做探测时：密钥齐全即视为正常） | 绿色 |
| 🔴 未配置密钥 | `mcp_servers` 有条目，但所需 API Key / token / 必要 env 缺失或为空 | 红色 + 文案「未配置密钥」；提供「填写密钥」入口 |
| 🔴 连接失败 | 密钥齐全但连通探测失败（路径无效、服务不可达、命令错误等） | 红色 + 简短错误摘要；提供「重试」 |
| — 已禁用 | `enabled: false` | 灰色；**不计入** Tab 角标「已启用数」 |

**缺密钥判定（启发式，产品层）：**

- `mcp_servers.<name>.env` 中引用的变量在 `.env` 中不存在或值为空。
- HTTP 类服务器声明了需要 Authorization / API Key，但 headers / `.env` 对应键缺失。
- 用户手动「添加」时勾选了密钥字段却未填写。

复制来源创建后：Hermes `--clone` 会同时复制 `config.yaml`（含 `mcp_servers`）与 `.env`。若密钥已随 `.env` 拷贝齐全，条目可直接为 🟢；若源配置本身就不完整，或 stdio `args` 中的绝对路径对新专家无效，则显示 🔴，由用户在本 Tab 修复——**产品层不因此删除 `mcp_servers`**。

Tab 角标：已启用服务器数（`enabled: true`）；可选在角标旁用小红点表示「存在需处理项」（缺密钥或连接失败），避免角标数字被污染。

#### 8.11.4 添加服务器（简化表单）

点击「+ 添加」弹出表单：

| 字段 | 必填 | 说明 |
|---|---|---|
| 名称 | 是 | 写入 `mcp_servers` 的 key；`^[a-z0-9][a-z0-9_-]{0,63}$`；不可与已有重名 |
| 类型 | 是 | `HTTP` 或 `本地命令（stdio）` |
| URL | 类型=HTTP 时必填 | 写入 `url` |
| Command | 类型=stdio 时必填 | 写入 `command` |
| Args | 否 | 空格/逗号分隔，写入 `args` 列表 |
| Env | 否 | 多行 `KEY=VALUE`；非密钥可写 `mcp_servers.<name>.env`，密钥建议写入 `.env`（产品层按 key 名启发式或用户勾选「作为密钥」） |
| 启用 | 默认开 | 写入 `enabled: true/false` |

提交后同步写入本 profile 的 `config.yaml`。不调用 Dashboard API；由本模块后端（HERMES_HOME override 或 profile-scoped API）落盘。若必填密钥未填，保存后该行立即显示 🔴 未配置密钥。

#### 8.11.5 启用 / 禁用 / 删除

- **启用/禁用**：切换 `mcp_servers.<name>.enabled`。
- **填写密钥**：针对 🔴 未配置密钥，弹出密钥表单，写入 `.env`（或更新 `env`），保存后重新判定状态。
- **删除**：从 `mcp_servers` 删除该 key；二次确认「确定删除 MCP 服务『xxx』？删除后专家将无法调用该服务暴露的工具。」；不自动清理 `.env`。
- 变更后 toast：默认提示「将在新会话生效」；若有运行中会话，附带 N 的说明（同工具 Tab）。

#### 8.11.6 与创建向导 / Hermes clone 的关系

原则：**尽量不改 Hermes 原有行为**。

| 创建来源 | `mcp_servers` | `.env`（含 MCP 密钥） | 产品层动作 |
|---|---|---|---|
| 从零开始 | 空 | 新建空/占位 `.env` | 不预置 MCP |
| 复制 default / 复制其他专家 | **保留**（随 `--clone` 拷贝 `config.yaml`） | **保留**（随 `--clone` 拷贝 `.env`） | **不 strip** `mcp_servers`，不额外清 MCP 密钥 |

- 用户在 MCP Tab 看到从源专家继承的服务器列表；缺密钥或连通失败用红色状态引导修复，而不是创建时静默丢掉配置。
- 工作空间根仍按产品策略重写为 `<HERMES_HOME>/workspace/`（与 MCP 无关）；stdio `args` 若含源专家绝对路径，可能表现为 🔴 连接失败，文案提示检查路径。

#### 8.11.7 架构约束

- 落盘格式对齐 Hermes `mcp_servers` 原生结构，保证 CLI `hermes -p <name> mcp` 与产品 UI 读写同一份配置。
- 创建路径对齐 Hermes `--clone`：**不**在产品层删除已 clone 的 `mcp_servers`。
- 不发明新的 core tool；外部能力优先走 MCP（Footprint Ladder）。
- 本 Tab 是专家管理模块的自建 UI，**不是**对 Hermes Dashboard `McpPage` 的嵌入或跳转。

### 8.12 IM 渠道 Tab

#### 8.12.1 定位

IM 渠道 Tab 让专家能通过 IM 平台被用户触达。MVP 阶段支持以下平台的启用/禁用 + 凭据配置 + 基础访问策略：

| platform id | 产品名 | Hermes 适配器 |
|---|---|---|
| `wecom` | 企业微信 · AI Bot | `plugins/platforms/wecom` → `WeComAdapter`（WebSocket） |
| `wecom_callback` | 企业微信 · 自建应用 | 同插件 → `WecomCallbackAdapter`（HTTP 回调） |
| `dingtalk` | 钉钉 | `plugins/platforms/dingtalk` |
| `feishu` | 飞书 / Lark | `plugins/platforms/feishu` |

专家配置好 IM 渠道后，用户在 IM 端 @机器人或私聊即可与该专家对话（由 gateway 路由到对应 profile 的 session）。本 Tab 是上述已注册适配器的可视化配置入口，不重做底层机制。优先复用 Dashboard `ChannelsPage` / `GET|PUT /api/messaging/platforms?profile=`（MVP 过滤上述四个 id）。

> **为什么企业微信要拆成两项**：Hermes 将两种接入方式注册为**两个独立 platform**（不同凭据、不同连接模型、不同 `platforms.<name>.enabled`）。产品层左栏须分开展示，避免用户把「智能机器人 Bot ID」填进「自建应用 Corp ID」表单。同一专家可以只开其中一种，也可以两种都开（互不替代）。

#### 8.12.2 MVP 范围

- 支持四个渠道条目：**企业微信 AI Bot（wecom）**、**企业微信自建应用（wecom_callback）**、**钉钉（dingtalk）**、**飞书（feishu）**。
- 左栏：渠道列表，每条展示图标 + 名称 + 启用开关 + 连接状态（建议对齐 Hermes messaging `state`：`connected` / `disabled` / `not_configured` / `pending_restart` / `gateway_stopped` / `fatal` 等）。
- 右栏：选中渠道的配置区，按渠道展示对应凭据字段 + 基础访问策略 + 保存 / 测试连接 / 设置指南；保存后「重启 gateway」。
- 启用/禁用开关：写入 `platforms.<name>.enabled`；关闭后 gateway 不加载该适配器。
- 凭据保存后提示「需重启 gateway 生效」（`pending_restart`），并提供「重启 gateway」按钮（`hermes -p <profile> gateway restart` 或 Dashboard 等价 API）。
- Telegram、Discord、Slack、个人微信（`weixin`）等其他平台放后续版本，MVP 不在 UI 暴露（仍可通过 `hermes setup gateway` / Dashboard Channels 全量页配置）。

MVP 不做：消息路由规则、群聊精细化策略（per-group allowlist/blacklist UI 编辑）、送达统计、消息模板、AI Card 模板配置；`wecom_callback` 的多应用 `apps[]` 高级编排（MVP 只做单应用扁平凭据）。

#### 8.12.3 渠道列表布局

```text
IM 渠道
配置专家可被触达的 IM 渠道（企业微信两种形态 / 钉钉 / 飞书）

┌────────────────────────────┐  ┌──────────────────────────────────────┐
│ 渠道                        │  │ 企业微信 · AI Bot                     │
│                            │  │ 💼 WebSocket · 已启用 · 待重启        │
│ 💼 企业微信 · AI Bot  [开] │  │                                        │
│ 💼 企业微信 · 自建应用 [关] │  │ 凭据配置                              │
│ 🐳 钉钉             [关] │  │  Bot ID / Secret …                     │
│ 🪽 飞书             [开] │  │                                        │
│                            │  │ 访问策略（折叠）                       │
│ (MVP 仅以上 4 个)           │  │  [设置指南] [测试连接] [保存] [重启]   │
└────────────────────────────┘  └──────────────────────────────────────┘
```

渠道卡片元素：

| 卡片元素 | 数据来源 | 说明 |
|---|---|---|
| 渠道图标 | 平台 `emoji` | 企业微信两种均为 💼；钉钉 🐳；飞书 🪽 |
| 渠道名称 | 平台 `label` | 「企业微信 · AI Bot」「企业微信 · 自建应用」「钉钉」「飞书」 |
| 启用开关 | `platforms.<name>.enabled` | 开/关 |
| 连接状态 | messaging API `state` + runtime | 见 §8.12.2；勿仅用蓝/灰两点掩盖 `pending_restart` / `not_configured` |

#### 8.12.4 各渠道凭据与配置详情

四个渠道条目的凭据 / 访问策略均对齐 Hermes 已有适配器与 messaging catalog。凭据写入 `<HERMES_HOME>/.env`，行为配置写入 `<HERMES_HOME>/config.yaml` 的 `platforms.<name>` 段。

##### 8.12.4.1 企业微信 · AI Bot（`wecom`）

企业微信 **智能机器人 / AI Bot** 走 WebSocket 长连接（`WeComAdapter`），**无需公网回调端点**，适合内网/本地部署。

**凭据（写入 `.env`）：**

| 字段 | 环境变量 | 必填 | 说明 |
|---|---|---|---|
| Bot ID | `WECOM_BOT_ID` | 是 | 智能机器人 bot_id |
| Secret | `WECOM_SECRET` | 是 | 对应 secret |

获取方式：企业微信管理后台 → 应用工作台 → 智能机器人 → 创建智能机器人 → 选 API 模式，复制 Bot ID 和 Secret。Hermes CLI 已支持扫码自动获取（`qr_scan_for_bot_info()`）；MVP 可先手动填写，P1 再提供扫码浮层 / `hermes -p <profile> gateway setup wecom` 子进程。

**访问策略（写入 `.env`）：**

| 字段 | 环境变量 | 默认 | 选项 | 说明 |
|---|---|---|---|---|
| DM 策略 | `WECOM_DM_POLICY` | `pairing` | `open` / `allowlist` / `pairing` / `disabled` | 私聊准入策略 |
| 允许用户 | `WECOM_ALLOWED_USERS` | 空 | 逗号分隔 user_id | `allowlist` 模式下生效 |
| 开放访问 | `WECOM_ALLOW_ALL_USERS` | 空 | `true`/`false` | `open` 模式下需设为 true |
| Home 渠道 | `WECOM_HOME_CHANNEL` | 空 | chat_id | cron/通知默认投递渠道 |

> 群聊策略（`group_policy`、`group_allow_from`、per-group `groups`）属高级管理，MVP 不在 UI 暴露。

**config.yaml：**

```yaml
platforms:
  wecom:
    enabled: true
    extra:
      bot_id: "..."          # 可选：与 WECOM_BOT_ID env 二选一，env 优先
      secret: "..."
      websocket_url: "wss://openws.work.weixin.qq.com"
      dm_policy: "pairing"
```

**连接检查**：`WECOM_BOT_ID`（及 Secret）已配置；runtime `state=connected` 表示 WebSocket 握手成功。

##### 8.12.4.2 企业微信 · 自建应用回调（`wecom_callback`）

企业微信 **自建应用** 走 HTTP 回调（`WecomCallbackAdapter`），gateway 在本机监听回调端口，**需要企业微信能访问到该回调地址**（公网或内网穿透）。与 AI Bot 是不同 platform，凭据命名空间完全独立（`WECOM_CALLBACK_*`）。

**凭据（写入 `.env`）：**

| 字段 | 环境变量 | 必填 | 说明 |
|---|---|---|---|
| Corp ID | `WECOM_CALLBACK_CORP_ID` | 是 | 企业 ID |
| Corp Secret | `WECOM_CALLBACK_CORP_SECRET` | 是 | 应用 Secret |
| Agent ID | `WECOM_CALLBACK_AGENT_ID` | 是 | 应用 AgentId |
| Token | `WECOM_CALLBACK_TOKEN` | 建议 | 回调 URL 校验 Token（与企微后台一致） |
| EncodingAESKey | `WECOM_CALLBACK_ENCODING_AES_KEY` | 建议 | 回调加解密密钥 |

获取方式：企业微信管理后台 → 应用管理 → 自建应用 → 复制 CorpId / Secret / AgentId；在「接收消息」里配置回调 URL，并填写 Token / EncodingAESKey。

**连接相关（写入 `.env` 或 `platforms.wecom_callback.extra`）：**

| 字段 | 环境变量 / extra | 默认 | 说明 |
|---|---|---|---|
| 监听 Host | `WECOM_CALLBACK_HOST` / `extra.host` | 适配器默认 | 回调服务绑定地址 |
| 监听 Port | `WECOM_CALLBACK_PORT` / `extra.port` | 适配器默认（如 8645） | 须在企微后台回调 URL 中可达；端口占用会导致启动失败 |

MVP UI：展示 Host/Port（只读或可编辑）+ 提示「须保证企业微信服务器能访问到该回调地址」；多应用 `extra.apps[]` 编排放 v1.1。

**访问策略（写入 `.env`）：**

| 字段 | 环境变量 | 默认 | 说明 |
|---|---|---|---|
| 允许用户 | `WECOM_CALLBACK_ALLOWED_USERS` | 空 | 逗号分隔 user_id；`*` = 任意 |
| 开放访问 | `WECOM_CALLBACK_ALLOW_ALL_USERS` | 空 | `true`/`false` |

**config.yaml：**

```yaml
platforms:
  wecom_callback:
    enabled: true
    extra:
      corp_id: "..."
      corp_secret: "..."
      agent_id: "..."
      token: "..."
      encoding_aes_key: "..."
      host: "0.0.0.0"
      port: 8645
      path: "/wecom/callback"   # 若适配器支持 path，与企微后台 URL 路径一致
```

**连接检查**：`corp_id`（或 `extra.apps`）已配置且回调服务监听成功；缺公网可达性时可能表现为 `startup_failed` / `disconnected`，UI 应用 `error_message` 提示。

**与 `wecom` 的选用指引（设置指南 / 空状态文案）：**

| 场景 | 建议 |
|---|---|
| 内网部署、不想暴露公网端口、用智能机器人 | 选 **AI Bot（`wecom`）** |
| 已有自建应用、需要经典回调模式、可暴露回调 URL | 选 **自建应用（`wecom_callback`）** |

##### 8.12.4.3 钉钉（`dingtalk`）

钉钉走 Stream Mode（`dingtalk-stream` SDK 的 WebSocket 长连接），**无需公网回调端点**。

**凭据（写入 `.env`）：**

| 字段 | 环境变量 | 必填 | 说明 |
|---|---|---|---|
| Client ID | `DINGTALK_CLIENT_ID` | 是 | 钉钉应用 App Key |
| Client Secret | `DINGTALK_CLIENT_SECRET` | 是 | 钉钉应用 App Secret |

获取方式：钉钉开发者后台 → 应用开发 → 创建企业内部应用 → 基础信息 → 复制 AppKey / AppSecret。同样支持扫码自动获取。

**访问策略（写入 `.env`）：**

| 字段 | 环境变量 | 默认 | 说明 |
|---|---|---|---|
| 允许用户 | `DINGTALK_ALLOWED_USERS` | 空 | staff_id / sender_id 列表，`*` = 任意 |
| 开放访问 | `DINGTALK_ALLOW_ALL_USERS` | 空 | `true`/`false` |
| 群聊需 @ | `DINGTALK_REQUIRE_MENTION` | `true` | 群聊是否必须 @机器人 才响应 |
| Home 渠道 | `DINGTALK_HOME_CHANNEL` | 空 | conversationId，cron/通知默认投递渠道 |

> `mention_patterns`（@唤醒词正则）、`free_response_chats`（免 @ 群列表）属高级管理，MVP 不在 UI 暴露。

**config.yaml 结构：**

```yaml
platforms:
  dingtalk:
    enabled: true
    require_mention: true   # 可与 DINGTALK_REQUIRE_MENTION env 互备
    extra:
      client_id: "..."      # 可选：与 env 二选一
      client_secret: "..."  # 可选：与 env 二选一
```

**连接检查**：`DINGTALK_CLIENT_ID` 和 `DINGTALK_CLIENT_SECRET` env 均已设置。

##### 8.12.4.4 飞书（`feishu`）

飞书支持 WebSocket 和 Webhook 两种连接模式，**WebSocket 模式无需公网端点**（默认推荐）。

**凭据（写入 `.env`）：**

| 字段 | 环境变量 | 必填 | 说明 |
|---|---|---|---|
| App ID | `FEISHU_APP_ID` | 是 | 飞书应用 App ID |
| App Secret | `FEISHU_APP_SECRET` | 是 | 飞书应用 App Secret |

获取方式：飞书开放平台 → 开发者后台 → 创建企业自建应用 → 凭证与基础信息 → 复制 App ID / App Secret。同样支持扫码创建应用自动获取。Lark（海外版）用户需额外配置 `FEISHU_DOMAIN=lark`。

**连接模式与可选凭据（写入 `.env`）：**

| 字段 | 环境变量 | 默认 | 说明 |
|---|---|---|---|
| 域名 | `FEISHU_DOMAIN` | `feishu` | `feishu`（国内）或 `lark`（海外） |
| 连接模式 | `FEISHU_CONNECTION_MODE` | `websocket` | `websocket` / `webhook` |
| 加密密钥 | `FEISHU_ENCRYPT_KEY` | 空 | webhook 模式下用于事件加密（飞书后台配置） |
| 验证 token | `FEISHU_VERIFICATION_TOKEN` | 空 | webhook 模式下第二层鉴权 |

**访问策略（写入 `.env`）：**

| 字段 | 环境变量 | 默认 | 说明 |
|---|---|---|---|
| 允许用户 | `FEISHU_ALLOWED_USERS` | 空 | open_id / user_id / union_id 列表 |
| 开放访问 | `FEISHU_ALLOW_ALL_USERS` | 空 | `true`/`false` |
| 群聊需 @ | `FEISHU_REQUIRE_MENTION` | `true` | 群聊是否必须 @机器人 |
| 群聊策略 | `FEISHU_GROUP_POLICY` | `allowlist` | `open` / `allowlist` |
| Home 渠道 | `FEISHU_HOME_CHANNEL` | 空 | chat_id，cron/通知默认投递渠道 |

> per-group `group_rules`、`admins`、`allow_bots`、webhook host/port/path 属高级管理，MVP 不在 UI 暴露。

**config.yaml 结构：**

```yaml
platforms:
  feishu:
    enabled: true
    extra:
      app_id: "..."            # 可选：与 env 二选一
      app_secret: "..."        # 可选：与 env 二选一
      domain: "feishu"         # feishu / lark
      connection_mode: "websocket"   # websocket / webhook
      require_mention: true
```

**连接检查**：`FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` env 均已设置。

#### 8.12.5 启用/禁用与生效流程

1. 用户在渠道卡片切换「启用」开关。
2. 若开启：右栏凭据表单变为可编辑，用户填写凭据 + 访问策略，点击「保存」。
3. 保存动作：
   - 凭据写入 `<HERMES_HOME>/.env`（密钥，遵循 §10.5）。
   - 行为配置写入 `<HERMES_HOME>/config.yaml` 的 `platforms.<name>` 段。
   - 启用状态写入 `platforms.<name>.enabled: true/false`。
4. 保存成功后提示：「配置已保存。需重启 gateway 生效。」并提供「重启 gateway」按钮。
5. 「重启 gateway」按钮调用 `hermes -p <profile> gateway restart`（子进程），重启后连接状态实时更新。
6. 若关闭某渠道：`platforms.<name>.enabled: false`，保存后同样需重启 gateway 才能真正卸载该平台适配器。

> **为什么需要重启 gateway**：Gateway 在启动时根据 `platforms.<name>.enabled` 加载平台适配器并建立长连接（WebSocket/Stream）。运行时增删平台涉及连接生命周期管理，MVP 不做热加载，统一走重启。这与 §10.9「Gateway 运行时配置变更需重启 gateway 进程才生效」一致。

#### 8.12.6 凭据互斥校验

保存凭据时，后端校验凭据唯一性（连接时由适配器 `acquire_scoped_lock()` 强制；产品层保存前也应预检，避免配完才发现冲突）：

- 企业微信 AI Bot（`wecom`）：以 `bot_id`（`WECOM_BOT_ID`）作为锁标识。
- 企业微信自建应用（`wecom_callback`）：以 `corp_id`（`WECOM_CALLBACK_CORP_ID`，可含 agent 维度）作为锁标识。
- 钉钉：以 `client_id` 作为锁标识。
- 飞书：以 `app_id` 作为锁标识（`_app_lock_identity = self._app_id`）。

若凭据已被其他 profile 占用，保存失败并报错：「该凭据（<标识>）正被 profile `<X>` 使用，不能复用。请为当前专家单独创建机器人/应用。」这是为了避免两个 profile 的 gateway 同时用同一凭据连接导致消息串台。`wecom` 与 `wecom_callback` 使用不同凭据命名空间，互不冲突；但同一形态下跨专家仍不可复用。

#### 8.12.7 设置指南

每个渠道配置区底部提供「设置指南 ↗」链接，跳转到 Hermes 官方文档对应章节（或 `hermes setup gateway` 的等价引导）。指南内容覆盖：

- 如何在对应平台开发者后台创建应用/机器人。
- 所需权限点（如飞书 IM 消息收发、群聊读取等 scope）。
- 凭据复制位置。
- WebSocket（AI Bot / 钉钉 / 飞书默认）vs 回调（`wecom_callback` / 飞书 webhook）选型建议。
- 常见错误（errcode 含义、token 失效、回调端口占用等）排查。

#### 8.12.8 架构约束

- **凭据互斥**（AGENTS.md `acquire_scoped_lock`）：两个 profile 不能共用同一个 bot token / corp_id / client_id / app_id。保存时校验，见 §8.12.6。
- **凭据进 `.env`，行为配置进 `config.yaml`**（AGENTS.md）：Bot ID、Secret、Corp 凭据、Client ID/Secret、App ID/Secret 等密钥写入 `.env`；启用状态、require_mention、dm_policy、websocket_url、回调 host/port 等写入 `config.yaml`。
- **不新增 `HERMES_*` 环境变量承载非密配置**：所有行为设置走 `config.yaml` 或平台已定义的 `WECOM_*` / `WECOM_CALLBACK_*` / `DINGTALK_*` / `FEISHU_*` env（这些是 Hermes 既有约定，本 PRD 不新增）。
- **渠道来源为 `plugins/platforms/` 已注册适配器**：企业微信（`plugins/platforms/wecom/` 同时注册 `wecom` + `wecom_callback`）、钉钉、飞书。本 Tab 不实现新平台适配器，只做配置 UI；优先复用 `/api/messaging/platforms`。
- **企业微信两项分开展示**：不得合并成一个「企业微信」再在内部切换模式；与 Hermes 双 platform 注册一致。
- **Profile-safe**：所有路径用 `get_hermes_home()`，凭据写入 profile 自己的 `.env`，不跨 profile 共享。
- **重启生效**：平台增删/凭据变更需重启 gateway 进程，MVP 不做热加载（§10.9）。

## 9. 数据与接口需求

### 9.1 `profile.yaml` 扩展

新增三个产品层元数据字段（Hermes 核心不依赖，仅服务于 UI 展示）：

```yaml
display_name: 人机协作专家        # str, 中文名
avatar: profiles/<name>/avatar.png  # str, 头像相对路径
tags:                            # list[str], 领域标签
  - 协作机器人应用
  - AGV调度策略
```

读取走 `ProfileInfo` dataclass 扩展（`hermes_cli/profiles.py:603`）。写入由产品层在创建向导和编辑弹窗中处理。

### 9.2 `ProfileCreate` API 扩展

扩展 `ProfileCreate` Pydantic 模型，承载单步向导的所有字段：

```python
class ModelConfig(BaseModel):
    """自定义默认模型配置（从零开始时必填）。作为专家的默认模型，对话任务未选择其他模型时使用。"""
    base_url: str                        # OpenAI 兼容 API 端点
    api_key: str                         # 明文传入，后端写入 .env
    model: str                           # 模型 ID，如 gpt-4o、deepseek-chat
    provider_name: Optional[str] = None  # 显示名，留空则从 base_url host 自动生成

class ProfileCreate(BaseModel):
    name: str                              # slug
    description: Optional[str] = None
    clone_from: Optional[str] = None      # 来源 profile；None 表示「从零开始」
    clone_all: bool = False
    # 产品层元数据
    display_name: Optional[str] = None     # 中文名
    avatar: Optional[str] = None           # 头像路径（相对 HERMES_HOME）
    tags: List[str] = []                   # 领域标签
    # 默认模型配置（从零开始时必填；复制时为 None，沿用源 profile）
    # 对话任务未选择其他模型时使用此模型（Hermes per-session model_override 可覆盖）
    model_config: Optional[ModelConfig] = None
    # 工作空间根（单步向导不传，后端默认 <HERMES_HOME>/workspace）
    workspace_root: Optional[str] = None
    # SOUL.md 留空由用户在详情页人设 Tab 编辑，POST 时不传 soul_md
```

后端在 `create_profile()` 后追加 best-effort 写入步骤，任一步骤失败不 500（profile 目录已存在，用户可从详情页修复）。

### 9.3 SOUL.md 读写

- 读：`GET /api/profiles/<name>/soul` → 返回 SOUL.md 文本内容。
- 写：`PUT /api/profiles/<name>/soul` → 写入 SOUL.md，返回 `{ "ok": true, "effective": "next_session" }`。

写入**仅** `next_session` 生效。MVP **不**支持 `immediate` / 强制丢弃 prompt 缓存。前端保存后必须 toast / 常驻提示「将在新会话生效」。

### 9.4 技能列表 / 启停 / Hub 安装

**列表（复用 Dashboard 路径，展开用量字段）**：

```text
GET /api/skills?profile=<name>
```

或专家模块等价封装 `GET /api/profiles/<name>/skills`。每条技能至少返回：

- `name`, `description`, `category`（来自 `_find_all_skills`）
- `enabled`（∉ `skills.disabled`）
- `provenance`（`hub` / `bundled` / `agent`）
- `use_count`, `patch_count`, `last_used_at`（来自该 profile 的 `skills/.usage.json`；缺省 0 / null）

相对现有 Dashboard `GET /api/skills`：保留其扫描与 provenance 逻辑；将折叠的 `usage: activity_count` **展开**为上述三字段（`view_count` 可不返回）。不另建用量存储。

**启停**：

```text
PUT /api/skills/toggle
Body: { "name": "<skill>", "enabled": true|false, "profile": "<name>" }
```

写入 `config.yaml` → `skills.disabled`；返回 `{ "ok": true, "effective": "next_session" }`。

**Hub 安装**走子进程：

```python
_spawn_hermes_action(["-p", profile, "skills", "install", identifier], "skills-install")
```

返回 `{pid, action_id}`，前端轮询 `GET /api/actions/<action_id>` 获取安装进度。复用现有 SkillsPage 的轮询机制。

### 9.5 Sessions 列表（per profile）

```text
GET /api/profiles/<name>/sessions?status=running,ready&limit=50
```

返回该 profile 的 session 列表，字段：

- `session_id`
- `title`（由 `auxiliary.title_generation` 自动生成）
- `cwd`（工作目录，相对工作空间根的路径）
- `status`（running / ready / completed）
- `created_at`（session 创建时间；`last_activity_at` 在无用户消息时的回退值）
- `last_activity_at`（用户最近一条消息时间；列表排序与「最近活跃」列展示均用此字段）

### 9.6 工作空间文件列表

```text
GET /api/profiles/<name>/workspace?path=<subdir>
```

- 根路径 = profile `terminal.cwd`（工作空间根）。
- 可选 query `session_id`：返回该 session 工作目录用于 ★ 高亮。

返回工作空间根下文件列表，字段：

- `name`
- `type`（file / directory）
- `source`（user_upload / task_generated / —）
- `artifact_session_id`（可选，目录为某 session 工作目录时填充）
- `updated_at`
- `size`
- `preview_url`（文本/图片可预览）

```text
PUT /api/profiles/<name>/workspace/root
Body: { "path": "D:\\workspace" }
```

更新 profile 工作空间根（`terminal.cwd`），需校验路径存在或可创建。

`source` / `artifact_session_id` 为产品层字段，Hermes 核心不维护。

### 9.7 工具（toolset）配置

**优先复用 Dashboard 现有 API**（profile 作用域）：

```text
GET  /api/tools/toolsets?profile=<name>
PUT  /api/tools/toolsets/{name}
Body: { "enabled": true|false, "profile": "<name>" }
```

- GET 返回全部可配置 toolset：`name`、`label`、`description`、`enabled`、`configured`、`tools[]`（与 `_get_effective_configurable_toolsets` + `resolve_toolset` 一致）。
- PUT 经 `_save_platform_tools` 写入 `platform_toolsets.cli`；返回 `{ "ok": true, "effective": "next_session" }`。
- 缺密钥配置（P1 / MVP 可选）：复用 `GET/PUT /api/tools/toolsets/{name}/config|env|provider` 等现有端点。

若专家模块需要统一路径前缀，可薄封装为 `GET/PUT /api/profiles/<name>/toolsets`，但**语义与落盘必须与上述 Dashboard API 一致**，禁止另造「绑定列表」读写模型。不涉及 MCP。

### 9.8 MCP 服务器配置

```text
GET    /api/profiles/<name>/mcp/servers
POST   /api/profiles/<name>/mcp/servers
Body: {
  "name": "filesystem",
  "transport": "stdio",          // "http" | "stdio"
  "url": null,
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
  "env": {},
  "enabled": true
}
PATCH  /api/profiles/<name>/mcp/servers/<server_name>
Body: { "enabled": false }       // 或其它可编辑字段
DELETE /api/profiles/<name>/mcp/servers/<server_name>
```

- 读写本 profile 的 `config.yaml` `mcp_servers`。
- POST 按 transport 写入 `url` 或 `command`/`args`/`env`。
- DELETE 只删 `mcp_servers` 条目，不清理 `.env`。
- 本 API 由专家管理模块自建；**不依赖** Hermes Dashboard `/api/mcp/*`，但落盘格式与 Hermes 原生 `mcp_servers` 对齐，便于 CLI 互通。

### 9.9 IM 渠道配置

```text
GET /api/profiles/<name>/im-channels
```

返回该 profile 的四个 IM 渠道状态（或直接复用 `GET /api/messaging/platforms?profile=` 后过滤），字段示例：

```json
{
  "channels": [
    {
      "platform": "wecom",
      "label": "企业微信 · AI Bot",
      "emoji": "💼",
      "enabled": true,
      "state": "pending_restart",
      "connected": false,
      "credentials_configured": true,
      "credentials": {"bot_id": "xxx", "secret": "<masked>"},
      "policy": {"dm_policy": "pairing", "allowed_users": ["user1"]},
      "home_channel": "..."
    },
    {
      "platform": "wecom_callback",
      "label": "企业微信 · 自建应用",
      "emoji": "💼",
      "enabled": false,
      "state": "disabled",
      "credentials_configured": false,
      "credentials": {"corp_id": null, "agent_id": null},
      "callback": {"host": "0.0.0.0", "port": 8645}
    },
    {"platform": "dingtalk", "label": "钉钉", "emoji": "🐳", "enabled": false, "state": "disabled", ...},
    {"platform": "feishu", "label": "飞书", "emoji": "🪽", "enabled": true, "state": "not_configured", ...}
  ]
}
```

- `connected` = 平台 `is_connected(config)` + gateway 进程存活探测的组合结果。
- 凭据字段返回时做掩码处理（仅显示前后若干位），明文不回传前端。

```text
PUT /api/profiles/<name>/im-channels/<platform>
Body: {
  "enabled": true,
  "credentials": {"bot_id": "xxx", "secret": "yyy"},   // 平台对应字段
  "policy": {"dm_policy": "allowlist", "allowed_users": ["u1"]}
}
```

- `platform` ∈ `wecom` / `wecom_callback` / `dingtalk` / `feishu`。
- 凭据写入 `<HERMES_HOME>/.env` 对应环境变量（见 §8.12.4；`wecom_callback` 使用 `WECOM_CALLBACK_*`）。
- 行为配置 + `enabled` 写入 `<HERMES_HOME>/config.yaml` `platforms.<platform>` 段。
- 保存前校验凭据互斥（见 §8.12.6），冲突时返回 409 + `{"conflict_profile": "<X>"}`。
- 保存成功返回 `{"restart_required": true}`，前端据此提示重启 gateway。
- **优先**：语义对齐 `PUT /api/messaging/platforms/{platform_id}?profile=`；专家模块路径可为薄封装。

```text
POST /api/profiles/<name>/gateway/restart
```

重启该 profile 的 gateway 进程（调用 `hermes -p <name> gateway restart` 子进程），返回 `{pid, action_id}`，前端轮询 `GET /api/actions/<action_id>` 确认重启完成，完成后刷新渠道连接状态。

## 10. 架构约束

### 10.1 Prompt 缓存神圣不可破

> 系统提示词一次会话内字节稳定，只在上下文压缩时重建。任何 mutate past context、swap toolsets、rebuild system prompt 的操作都禁止。

**对本 PRD 的影响**：

- 人设 Tab 的「保存」**仅下次会话生效**；MVP 不提供「立即生效」。保存后必须 toast，并常驻提示「人设变更默认在新会话生效」。
- 技能 Tab 的「启停」默认下次会话生效。
- 工具 Tab 的「启停」默认下次会话生效。
- MCP Tab 的「添加/启停/删除」默认新会话生效；UI 提示连接状态（best-effort）。
- 所有涉及系统提示词 / 工具 schema 变更的操作 UI 必须提示「下次会话生效」。

### 10.2 Profile 隔离，不做实时继承

> Profiles 是独立岛屿。`--clone` 是支持的「从默认起步」路径，不设计 live config inheritance。

**对本 PRD 的影响**：

- 编辑某个专家的配置不会影响其他专家。
- 不提供「从 default profile 同步配置」功能。
- 用户想复制配置走 `hermes profile create <new> --clone <source>`。

### 10.3 Hub 技能安装异步性

> `tools/skills_hub.py` 在模块导入时绑定 `SKILLS_DIR`，HERMES_HOME override 对已导入全局变量无效。hub 安装必须用子进程。

**对本 PRD 的影响**：

- 创建向导不包含 hub 安装（向导必须同步、原子）。
- hub 安装在专家详情页的「技能」Tab 完成，复用 SkillsPage 异步安装 + PID 轮询。

### 10.4 IM 凭据互斥

> Gateway 平台适配器用 `acquire_scoped_lock()` 防止两个 profile 共用同一个 bot token。

**对本 PRD 的影响**：

- IM 渠道 Tab（MVP）保存配置时校验凭据唯一性。
- 凭据被占用时报错「该凭据正被 profile X 使用」。
- 校验标识：`wecom` → `bot_id`；`wecom_callback` → `corp_id`；钉钉 `client_id`；飞书 `app_id`（见 §8.12.6）。

### 10.5 凭据进 `.env`，行为配置进 `config.yaml`

> `.env` 只承载密钥（API keys、tokens、passwords）。所有行为设置（timeouts、thresholds、feature flags、display prefs）进 `config.yaml`。

**对本 PRD 的影响**：

- IM 渠道配置：bot token、Corp Secret、Client secret → `.env`；启用状态、回调 host/port、超时 → `config.yaml`。
- MCP 配置：服务器连接定义 → `config.yaml` `mcp_servers`；密钥类 env → `.env`。
- 不新增 `HERMES_*` 环境变量承载非密配置。

### 10.6 不新增 in-tree memory provider，MVP 默认内置 only

> 2026 年 5 月政策：`plugins/memory/` 下的内置 provider 集合已封闭。

**对本 PRD 的影响**：

- 记忆 Tab（P1）的 provider 选择器只列已有内置 + 用户从 `~/.hermes/plugins/` 安装的独立插件。
- 不规划自研新 memory backend。

**MVP 默认配置（重要）**：

- MVP 阶段专家默认 `memory.provider: ""`（空 = 内置 only），不激活外部 provider 的每轮自动同步。
- 创建向导**不配置** `memory.provider`，沿用 Hermes 默认值。
- 理由：
  1. 内置 only 时，记忆 Tab 展示的 `MEMORY.md` / `USER.md` 就是**全部**记忆，MVP「只读展示」的承诺成立；启用外部 provider 后记忆散落在 honcho API / mem0 后端，记忆 Tab 只读内置文件会误导用户（「以为就这些，其实后端还有」）。
  2. 外部 provider 需要额外后端依赖（honcho 服务 / mem0 API key / 向量库），与创建向导「单步原子、轻量」的定位冲突。
  3. 内置 curated 写入更可解释，符合 B 端用户对「专家主动学」的心智模型。
- P1 阶段补 provider 切换 UI 时，记忆 Tab 必须同步补「外部记忆摘要」展示，否则会有信息黑洞。

### 10.7 Footprint Ladder

> 新能力优先级：extend existing code → CLI+skill → service-gated tool → plugin → MCP server → new core tool（last resort）。

**对本 PRD 的影响**：

- 工具 Tab 管理全部可配置 toolset（含插件）+ 开关，不发明新 core tool；外部能力走 MCP。
- MCP Tab 承接外部能力扩展；落盘对齐 `mcp_servers`，不依赖 Dashboard。
- 专家管理模块本身是产品层 UI，不增加 Hermes core schema footprint。

### 10.8 Profile-safe 代码

> 所有 HERMES_HOME 路径用 `get_hermes_home()`，用户可见路径用 `display_hermes_home()`。

**对本 PRD 的影响**：

- 列表页、详情页所有路径展示用 `display_hermes_home()`。
- 后端文件操作用 `get_hermes_home()`。
- 不硬编码 `~/.hermes`。

### 10.9 Profile 修改与进程生命周期

> Profile 是磁盘上的目录，本身无「启动/关闭」。但绑定到 profile 的进程（gateway、Desktop 后端、运行中 session）有生命周期，修改 profile 时需区分场景处理。产品层不设计「启用/停用」开关（Hermes core 不认这个标志），只展示活动状态（观察值）。

**对本 PRD 的影响**：

- **人设/技能/工具集/MCP 的修改**：不涉及进程停止，走缓存失效 / 新会话生效路径（§10.1）。UI 需提示运行中会话数量（§8.5.4、§8.9.4、§8.10.4、§8.11.5）。
- **删除 profile**：后端 `delete_profile()` 会先停 gateway + Desktop 后端进程（`_stop_gateway_process` + `_stop_profile_backends`），再 rmtree。UI 层需在确认弹窗中要求输入专家名确认，有运行中会话时额外警告会被强制终止（§6.5.3）。
- **重命名 profile**：同样先停 gateway 再改目录名（`rename_profile` 已实现）。
- **Gateway 运行时配置变更**（端口、平台 token、IM 渠道启用/凭据）：需重启 gateway 进程才生效（§8.12 IM 渠道 Tab 范围，MVP 统一走重启，不做热加载）。
- **活动状态来源**：列表页 / 详情页的活动状态来自 `GET /api/profiles/<name>/sessions?status=running` 计数。有运行中 session 显示 🟢 + 数量；无运行中 session 不显示状态点。

### 10.10 cron 任务的记忆隔离

> Hermes 的 cron sessions 默认 `skip_memory=True`（AGENTS.md）：被 cron 调度执行的 session 不写入任何记忆，内置 `MemoryStore` 和外部 provider 均不激活。

**对本 PRD 的影响**：

- 专家被 cron 调度执行的任务（如「每天 9 点巡检产线良率」）**不会写入专家记忆**，无论是否配置 `memory.provider`。
- 这对 B 端用户是反直觉的：用户可能期望「专家每天巡检，自然会积累经验」，但 Hermes 这么设计是为了避免无用户的自动流程污染记忆（cron 任务通常没有真实用户交互可记忆）。
- 产品层**不改变**这一默认行为，但在文档/帮助中显式说明：
  - 专家的 cron 任务默认不写入记忆。
  - 如需让 cron 任务积累经验，用户需在 cron job 级别显式开启（`hermes cron edit` 调整 `skip_memory`，或产品层在 cron job 编辑 UI 加开关 —— 属 cron 模块范畴，不在本 PRD）。
- 任务 Tab 展示的 session 列表包含 cron session（状态、cwd 等只读字段正常展示），但 cron session 不会贡献记忆写入。记忆 Tab 的「上次更新时间」仅反映真实对话 session 的写入。

## 11. 视觉与交互建议

### 11.1 配色

- 主操作按钮（新建专家、发起任务、创建专家、保存）：蓝色。
- 次操作按钮（取消、上一步、管理）：白底灰边或浅灰底。
- 删除按钮：红色文字或红色边框。
- 领域标签 chip：浅底色（蓝/灰/绿等区分类别，MVP 统一浅灰即可）。
- Tab 角标：浅蓝底 + 蓝色数字。

### 11.2 列表页卡片网格

- 3 列网格，响应式（窄屏降为 2 列或 1 列）。
- 卡片最小宽度 280px，最大宽度 360px。
- 卡片间距 16px。
- 卡片内 padding 16px。

### 11.3 详情页 Tab

- Tab 横向排列，激活 Tab 下方蓝色下划线。
- Tab 角标用小圆点 + 数字，浅蓝底。
- Tab 内容区 padding 24px。

### 11.4 创建向导弹窗

- 弹窗宽度固定 640px（单步表单，不需要 720px）。
- 弹窗最大高度 80vh，内容区超出滚动。
- 来源选择单选 + 「复制其他专家」联动下拉固定在弹窗顶部。
- 底部操作栏固定在弹窗底部。

### 11.5 人设编辑器

- 左右分栏，各占 50% 宽度。
- 左栏编辑器：等宽字体，行号可选。
- 右栏预览：markdown 渲染，与编辑器同步滚动（可选）。
- 工具栏：标题、加粗、列表、缩进调整图标按钮。

### 11.6 响应式

- 桌面端为主，最小宽度 1024px。
- 列表页卡片网格自适应列数。
- 详情页 Tab 内容区自适应剩余宽度。

## 12. 后续版本规划

### v1.1

- 独立「模型管理」功能：provider 预设模板（内置常见 base_url，如 OpenAI / Anthropic / DeepSeek / 国内云厂商）、模型清单管理、API key 集中管理、成本统计。创建向导的模型配置改为从模型管理中选择已配置的 provider + 仍支持临时自定义
- 专家列表页搜索（按名称/标签）
- 专家列表页筛选（按标签）
- 专家列表页排序（按创建时间/最近使用）
- 记忆 Tab 完整管理（手动增删改查记忆卡片）
- MCP Catalog 一键安装、OAuth 登录、`tools.include/exclude` 细过滤、高级 TLS
- IM 渠道 Tab 高级配置（消息路由规则、群聊精细化策略、送达统计、消息模板、AI Card 模板）
- IM 渠道扩展更多平台（Telegram、Discord、Slack 等）
- 工作空间 Tab 文件编辑
- 任务 Tab 高级筛选（按时间范围、按工作目录）
- 创建向导的 Review 步骤（可选）
- 专家导出/导入（profile 分发）

### v2

- 专家模板（预设人设/技能/工具组合）
- 专家画像分析（任务统计、使用频率、成本分析）
- 多专家协作编排（与 kanban PRD 深度集成）
- 专家版本管理（人设/配置变更历史）
- 专家分享（跨实例分享 profile）
- 工作空间文件版本管理
- 记忆 provider 切换 UI
- **项目级共享记忆（kanban board 级 memory）**：让多专家协作时共享一份「项目背景 / 关键约定 / 已知事实」，区别于 profile 级「专家经验」与「用户画像」。解决 §10.2 profile 隔离导致的「同一项目里专家 A 学到的项目背景，专家 B 完全不知道」痛点。需考虑与 profile 级记忆的优先级与冲突合并策略。
- IM 渠道消息路由高级配置

## 13. MVP 验收标准

### 专家列表页

- 列表页展示所有已创建专家（排除 default profile）。
- 顶部展示专家计数和副标题。
- 「新建专家」按钮可触发创建向导。
- 每个卡片展示头像、名称、简介、领域标签（最多 3 个）。
- 卡片有运行中 session 时，专家名称右侧显示 🟢 绿点 + 运行中 session 数；无运行中 session 时不显示状态点。
- 卡片「发起任务」按钮可跳转任务对话页并新建 session。
- 卡片「管理」按钮可跳转专家详情页。
- 卡片「⋯」菜单可触发删除，删除弹窗要求输入专家 `display_name` 确认；有运行中会话时额外警告会被强制终止。
- 删除后列表刷新，专家计数减少。

### 创建专家向导

- 单步弹窗，来源 + 身份信息 + 默认模型配置（自定义模式）。
- 「来源」单选：「从零开始」/「复制 default」/「复制其他专家」（后者展开 profile 下拉，选项为 `display_name` 或 slug）。
- 必填项（来源、专家名称、slug、专家介绍、Base URL、API Key、模型名称）校验生效。
- 头像可上传预览；领域标签可添加移除。
- 不在向导中配置人设（SOUL.md 默认留空，由用户在详情页「人设」Tab 编辑）。
- 不在向导中配置技能（自动 seed + 全部启用；详情页「技能」Tab 全部列表 + 开关 + 用量）。
- 不在向导中配置工具（默认继承 `_HERMES_CORE_TOOLS`；详情页「工具」Tab 全部可配置 + 开关）。
- 不在向导中单独配置 MCP：「从零开始」无预置；「复制」时沿用 Hermes `--clone` 保留源 `mcp_servers`（及 `.env`），产品层不 strip；由用户在详情页「MCP」Tab 查看状态 / 补密钥 / 启停 / 增删。
- 不在向导中配置工作空间根（后端默认创建 `<HERMES_HOME>/workspace/`（空目录，不预置子目录），由用户在详情页「工作空间」Tab 调整）。
- 取消时弹出二次确认。
- 提交后创建 profile 目录、写入 `profile.yaml` 扩展字段、写入 `config.yaml` 的 `providers.` 段 + `model` 段（默认模型）+ `terminal.cwd`、写入 `.env` 的 API Key、创建 workspace 物理目录。
- 创建成功后关闭弹窗，跳转专家详情页（默认打开「人设」Tab，触发首次使用引导）。

### 专家详情页

- 顶部信息卡展示头像、名称、默认模型标签、简介、领域标签、编辑按钮、发起任务按钮、返回按钮。
- 顶部信息卡专家名称右侧显示默认模型标签（如 `[gpt-4o]`），来自 `config.yaml` `model.default`；点击可展开 tooltip 显示 provider 名称和 base_url。
- 顶部信息卡默认模型标签右侧显示活动状态：有运行中 session 时显示 🟢 + 「N 个运行中会话」（可点击跳转任务 Tab 筛选进行中）；无运行中 session 时不显示。
- Tab 导航展示 8 个 Tab，带数量角标（人设、工作空间、任务、记忆、技能、工具、MCP、IM 渠道）。
- 默认打开「人设」Tab。
- 「发起任务」按钮可跳转任务对话页并新建 session。
- 「返回」按钮可返回专家列表页。
- 「编辑」按钮可打开基础信息编辑弹窗，弹窗含基础信息区（头像、名称、介绍、标签）和默认模型配置区。
- 编辑弹窗默认展示当前默认模型信息（模型名称 + provider 名称 + base_url，只读；API Key 以占位符展示）。
- 编辑弹窗选「修改为新的配置」时展开模型表单（Base URL + API Key + 模型名称 + 可选 Provider 名称），校验规则同创建向导。
- 保存默认模型修改后 toast 提示运行中会话状态：有运行中会话时显示「该专家当前有 N 个运行中会话，修改将在新会话生效」。

### 人设 Tab

- 左右分栏编辑器 + 预览。
- 可导入/导出 soul.md。
- 「保存」按钮**仅下次会话生效**（无「立即生效」选项）。
- 编辑器顶部常驻提示：「人设变更默认在新会话生效，不影响已打开的对话。」
- 保存后 SOUL.md 文件内容更新。
- 保存成功 toast 提示运行中会话状态：有运行中会话时显示「修改将在新会话生效；当前有 N 个运行中会话仍使用旧人设」。

### 工作空间 Tab

- 展示专家**工作空间根**下完整文件列表/目录树。
- 支持更改工作空间根、上传文件、预览/下载。
- 与任务对话页侧边栏数据同源。

### 任务 Tab

- 展示 session 列表，含**工作目录**列与**最近活跃**列（用户最近发言时间；新建未发言任务展示创建时间）。
- 列表默认按最近活跃时间降序排列。
- 展示任务总数、运行中数、已就绪数。
- 支持按名称/ID 搜索。
- 支持按状态筛选。
- 「新建任务」可新建 session 并跳转任务对话页。
- 任务行「打开」可 resume session 跳转任务对话页。
- 任务行「编辑」可修改任务名称。
- 任务行「删除」可删除 session（二次确认）。

### 技能 Tab

- 默认展示**全部已安装**技能，每行带启用开关（对齐 `skills.disabled` opt-out）。
- 列：描述（Hermes frontmatter/fallback）、分类（目录）、使用次数（`use_count`）、补丁次数（`patch_count`）、最近使用（`last_used_at`）、来源（provenance）。
- 支持按名称/描述搜索、按目录分类筛选；角标为已启用数。
- 「从 Hub 安装」可搜索 hub 技能并异步安装；安装后默认启用，用量从 0 起算。
- **无**「从已安装池多选绑定」浮层；启停即开关。
- 启停后 toast 提示运行中会话状态：有运行中会话时显示「该专家当前有 N 个运行中会话，修改将在新会话生效」。
- 创建/复制专家后 `skills/.usage.json` 为空（复制来源时产品层清空），用量不继承源专家。

### 工具 Tab

- 默认展示**全部可配置** toolset，每行带启用开关（对齐 `platform_toolsets.cli` opt-in；UI 形态与技能 Tab「全部 + 开关」一致）。
- 列：label（主）+ name（次）、description、工具数（`len(tools)`）、就绪（`configured`）；禁止主副标题同文案重复。
- **无**「+ 添加工具」浮层与「解绑」；启停即开关。
- 顶部说明核心工具基线（`_HERMES_CORE_TOOLS`）：额外启用数为 0 时专家仍有核心能力。
- 不做 toolset 使用次数 / 最近使用。
- 启停后 toast 提示运行中会话状态：有运行中会话时显示「该专家当前有 N 个运行中会话，修改将在新会话生效」。
- 列表/启停复用 `GET/PUT /api/tools/toolsets`（或语义等价封装）。

### MCP Tab

- 展示本专家已配置的 MCP 服务器列表（名称、类型 HTTP/stdio、状态）。
- 「添加」弹出简化表单（名称 + HTTP URL 或 stdio command/args/env + 启用）。
- 支持启用/禁用（写 `mcp_servers.<name>.enabled`）。
- 「删除」二次确认后从 `mcp_servers` 移除条目，不清理 `.env`。
- **状态红点**：缺必要 API Key / 密钥显示 🔴「未配置密钥」并提供「填写密钥」；密钥齐全但连通失败显示 🔴「连接失败」；正常 🟢；已禁用灰色。
- 「复制」创建的专家：列表中可见源专家经 `--clone` 保留的 `mcp_servers`；产品层不 strip；若密钥已随 `.env` 拷贝则可为 🟢，否则红点引导修复。
- 不依赖 Hermes Dashboard / McpPage；由本模块 API 落盘，格式对齐 Hermes 原生 `mcp_servers`。
- MVP 不做 Catalog、OAuth、`tools.include/exclude`、高级 TLS。
- 变更后 toast 提示新会话生效；有运行中会话时附带 N 的说明。

### 记忆 Tab（MVP 只读）

- 展示 MEMORY.md 内容（专家经验）。
- 展示 USER.md 内容（用户画像）。
- 每张记忆卡片头部展示容量指示（字符数 / 上限）、上次更新时间（文件 mtime）、来源说明（MEMORY.md：「专家在任务对话中主动记下的经验与约定」；USER.md：「专家对您的认知，不同专家对您的认知可能不同」）。
- 两份文件都为空时展示空状态引导卡片，说明「专家在对话中主动记下重要信息，您也可在对话中说『记住：……』触发写入」，支持「知道了」关闭并写入 `memory_onboarded: true` 标记。
- 不提供新增/编辑/删除操作。

### IM 渠道 Tab

- Tab 角标展示已启用渠道数（`wecom` / `wecom_callback` / `dingtalk` / `feishu` 中已 `enabled: true` 的数量）。
- 左栏列出**四个**渠道卡片（企业微信 AI Bot、企业微信自建应用、钉钉、飞书），每张卡片展示图标、名称、启用开关、连接状态（对齐 Hermes messaging `state`，至少区分已禁用 / 未配置 / 待重启 / 已连接 / 错误）。
- 右栏展示选中渠道的凭据字段 + 基础访问策略 + 设置指南；提供保存、测试连接、重启 Gateway。
- 企业微信 · AI Bot（`wecom`）：可填写 Bot ID + Secret（`WECOM_BOT_ID` / `WECOM_SECRET`），可选 DM 策略 + 允许用户；文案标明 WebSocket、无需公网回调。
- 企业微信 · 自建应用（`wecom_callback`）：可填写 Corp ID / Corp Secret / Agent ID / Token / EncodingAESKey（`WECOM_CALLBACK_*`），可选 Host/Port；文案标明需回调 URL 可达。
- 钉钉：可填写 Client ID + Client Secret，可选 require_mention + 允许用户。
- 飞书：可填写 App ID + App Secret，可选域名（feishu/lark）、连接模式、require_mention。
- 启用开关切换写入 `config.yaml` `platforms.<name>.enabled`。
- 保存凭据时校验凭据互斥：若 bot_id / corp_id / client_id / app_id 已被其他 profile 占用，报错「该凭据正被 profile X 使用」。
- 保存成功后提示「需重启 gateway 生效」，并提供「重启 gateway」按钮。
- 重启后连接状态按 messaging `state` 更新。
- 企业微信两项分开展示，不合并为单一「企业微信」入口。

## 14. 关键决策总结

1. **专家 = Hermes Profile**：复用 Hermes profile 机制，每个专家是一个独立 HERMES_HOME 目录，不新增核心数据模型。
2. **人设 = SOUL.md**：直接读写 `<HERMES_HOME>/SOUL.md`，作为系统提示词 stable 层的第一个组成部分。
3. **创建向导是单步原子事务**：弹窗只做「来源 + 身份信息 + 模型」，全部同步文件写入。人设/技能/工具/MCP/工作空间的精细化配置全部进详情页对应 Tab，hub 技能安装推「技能」Tab。
4. **卡片标签 = 领域标签**：列表页卡片和详情页头部展示 `profile.yaml` `tags`（自由文本），不展示技能名（技术 ID）。
5. **默认模型在弹窗必填（自定义模式）**：专家必须有默认模型配置才能运行。「从零开始」时用户填写 Base URL + API Key + 模型名称（+ 可选 Provider 名称），配置写入新 profile 的 `config.yaml` `providers.` 段 + `.env`，遵循 Hermes 原生格式；「复制」时沿用源 profile 的模型配置。默认模型是对话任务的起点模型，对话中可通过模型下拉切换其他模型（Hermes per-session `model_override`）。MVP 不提供 provider 预设和模型清单，后续版本对接独立的「模型管理」功能。
6. **发起任务 = 跳任务对话页**：新建 session（默认工作目录 = 工作空间根）后跳转任务对话页，不弹出任务表单。
7. **删除 = 硬删除 + 输入名称确认**：走 `hermes profile delete`，不做软删除。删除弹窗统一要求输入专家 `display_name` 确认；有运行中会话时额外警告会被强制终止，按钮文案为「强制删除」。
8. **人设（SOUL.md）仅下次会话生效**：遵循 prompt 缓存约束，MVP **不提供**「立即生效」。保存 toast + 编辑器常驻提示「将在新会话生效」；有运行中会话时额外提示仍使用旧人设。
9. **工作空间根 vs 工作目录**：profile `terminal.cwd` = **所有 session 共享**的文件树根；session `cwd` = 该任务 workspace（通常为根下子目录，不等于缩小工作空间）。
10. **工作空间 Tab 展示工作空间根**；★ 高亮当前 session 工作目录；切换工作目录在任务对话页。
11. **创建专家时初始化**：写 `terminal.cwd`，创建空工作空间目录（不预置子目录）；SOUL 约定产物须在工作目录内。
12. **记忆 Tab MVP 只读**：P1 补全手动管理，不新增 in-tree memory provider。
13. **IM 渠道 Tab MVP 做四个条目**：企业微信 AI Bot（`wecom`）、企业微信自建应用回调（`wecom_callback`）、钉钉、飞书。两项企业微信分开展示（不同凭据与连接模型）。凭据进 `.env`（`WECOM_*` / `WECOM_CALLBACK_*` / `DINGTALK_*` / `FEISHU_*`），行为配置进 `config.yaml` `platforms.<name>`。优先复用 Dashboard messaging platforms API。保存后重启 gateway 生效，MVP 不做热加载。凭据互斥校验（`bot_id` / `corp_id` / `client_id` / `app_id`）。其他平台（Telegram、Discord、Slack、`weixin` 等）和高级管理放 v1.1。
14. **profile.yaml 新增 display_name/avatar/tags**：产品层元数据，Hermes 核心不依赖。
15. **技能 Tab = 全部已安装 + 开关 + 用量观察**：对齐 Hermes `skills.disabled`（opt-out），不发明「绑定」表。描述/分类分别来自 SKILL.md frontmatter（含正文 fallback）与目录路径；用量来自该 profile 的 `skills/.usage.json`（`use_count` / `patch_count` / `last_used_at`，per-profile）。Hub 安装走子进程，复用 SkillsPage 异步进度。创建/复制时清空 `.usage.json`，不继承源专家热度。
16. **工具 Tab = 全部可配置 + 开关（无绑定/解绑）**：对齐 `platform_toolsets.cli`（opt-in）与 Dashboard `/api/tools/toolsets`；展示 label/description/工具数/`configured`；不做用量统计。与技能 UI 同形（全部 + 开关）但落盘不同（技能为 opt-out）。MCP 仍分 Tab 内嵌轻量 CRUD；创建对齐 Hermes：`--clone` 保留 `mcp_servers`（及 `.env`），产品层不 strip；MCP Tab 对缺密钥 / 连通失败显示红色状态。不依赖 Dashboard/McpPage；外部能力走 MCP，不发明新 core tool。
17. **本 PRD 的关键架构约束**：hub 技能安装必须用子进程（`tools/skills_hub.py` 在模块导入时绑定 `SKILLS_DIR`，HERMES_HOME override 无效），创建向导不包含 hub 安装。
18. **活动状态（非启用/停用）**：Profile 没有「启用/停用」开关，产品层展示活动状态（活跃/待命）作为观察值。有运行中 session 时卡片/详情页显示 🟢 + 数量；无运行中 session 时不显示状态点。不设计「离线/上线」概念。
19. **进程生命周期（§10.9）**：人设/技能/工具/MCP 修改走缓存失效或新会话生效路径，不停进程；删除/重命名 profile 后端自动停 gateway + 后端进程；Gateway 运行时配置变更（含 IM 渠道启用/凭据）需重启 gateway（MVP，不做热加载）。
20. **记忆语义（§4.4）**：`MEMORY.md` = **专家经验**（专家在历次任务中沉淀的方法论、项目背景、约定），`USER.md` = **用户画像**（专家对该用户的认知）。两者均为专家**主动写入**（模型调用 `memory` 工具或用户在对话中说「记住：……」），非对话自动录制。`memory_enabled` 默认 `True` 只代表工具被注入，不代表自动有内容。
21. **创建专家时强制清空 memories**：无论来源（从零 / 复制 default / 复制其他专家），创建后 `memories/MEMORY.md`、`USER.md` 均为空。复制来源时若 `--clone` 已带入源 profile 的 memories，产品层强制清空。理由：MEMORY.md/USER.md 是专家个人沉淀，A 专家的经验不应作为 B 专家的起点（与 SOUL.md 人设可继承的语义不同）。
22. **创建专家时强制清空技能用量**：无论来源，创建后 `skills/.usage.json` 为空（复制来源时产品层删除/清空）。用量与 profile 绑定，不继承源专家热度（§8.9.6）。
23. **MVP 默认 `memory.provider: ""`（内置 only）**：创建向导不配置 `memory.provider`，沿用 Hermes 默认空值。理由：内置 only 时记忆 Tab 展示的就是全部记忆，MVP「只读展示」承诺成立；启用外部 provider 后记忆散落在后端，记忆 Tab 只读内置文件会误导用户。P1 补 provider 切换时必须同步展示外部记忆摘要。
24. **记忆 Tab MVP 增强只读字段**：每张记忆卡片展示容量指示（字符数 / `memory_char_limit` 或 `user_char_limit`）、上次更新时间（文件 mtime）、来源说明；两份文件都为空时展示空状态引导卡片（支持 `memory_onboarded: true` 标记关闭）。讲清楚「主动写入」语义，避免「聊过就有记忆」的错误预期。
25. **P1 手动编辑记忆遵循缓存约束**：手动新增/编辑/删除记忆等价于修改 `MEMORY.md`/`USER.md`，与人设一致**仅下次会话生效**（不提供「立即生效」），toast 文案根据运行中会话数动态展示。
26. **cron 任务的记忆隔离（§10.10）**：专家被 cron 调度执行的任务默认不写入记忆（Hermes cron sessions 默认 `skip_memory=True`）。产品层不改变此默认行为，但在文档/帮助中显式说明；如需积累经验用户需在 cron job 级别显式开启。
27. **跨专家记忆共享 = v2**：MVP/v1.1 不做。profile 隔离导致同一项目里专家 A 学到的项目背景专家 B 不知道，v2 通过「项目级共享记忆（kanban board 级 memory）」解决（§12）。