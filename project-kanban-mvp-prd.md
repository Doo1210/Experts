# 项目协作空间 MVP 产品需求文档

Status: design proposal
Author: product draft
Target: Hermes project collaboration prototype

## 1. 背景与目标

当前希望基于 Hermes 改造出一个面向业务协作的「项目」概念：一个项目包含多个专家（Hermes profiles），项目下承载任务、工作目录和执行动态。已有原型采用三栏布局，包含项目看板、沟通与日志、项目成员/工作空间等区域。

经过与研发讨论，Hermes 现有 `kanban board` 与「项目」概念高度接近：

- 一个 `board` 是一个隔离的任务协作空间。
- 一个 `board` 下有多条任务。
- 任务可以指派给不同 profile，即专家。
- 任务有状态、评论、事件、执行记录和工作区。

因此 MVP 不新增一套完整项目协作模型，而是将「项目」作为 `kanban board` 的业务化展示层，以最小改造复用 Hermes Kanban 能力。

## 2. 产品定位

### 2.1 产品定义

「项目协作空间」是面向业务问题的多专家协作工作台。用户可以创建一个项目，选择参与项目的专家，并通过结构化看板指令创建、指派和推进任务。

### 2.2 核心原则

1. **项目等价于 Kanban Board**
   - 产品层展示为「项目」。
   - 底层使用 Hermes `kanban board`。
   - `project_slug` 与 `board_slug` 保持一致。

2. **专家等价于 Hermes Profile**
   - 项目成员从 Hermes profiles 中选择。
   - 任务负责人使用 Kanban task 的 `assignee` 字段。

3. **项目沟通不做自由群聊**
   - MVP 不做多专家实时聊天。
   - 原「沟通与日志」改为「项目动态」。
   - 用户操作通过结构化「下发任务」入口完成。

4. **任务推进以 Kanban 指令为核心**
   - 创建任务、指派任务、完成任务、阻塞任务、添加评论等均映射到现有 `hermes kanban` 能力。

5. **保留两种任务下发方式**
   - 目标式下发：用户给协调专家一个项目级或阶段级目标，由 Orchestrator/Decomposer 自动拆解并派发给项目成员。
   - 表单式下发：用户通过结构化表单直接创建具体 Kanban task，自行控制标题、说明、负责人、父任务和优先级。

6. **MVP 不做任务图人工确认**
   - 目标式下发提交后，系统自动进入拆解和派发流程。
   - MVP 不提供「先生成任务图草稿、用户确认后再下发」的确认环节。
   - 用户如需调整结果，可在看板中编辑、改派、评论、阻塞或追加任务。

## 3. MVP 范围

### 3.1 MVP 包含

- 创建项目
- 选择项目成员
- 项目详情页
- 看板 Tab
  - 状态视图
  - 专家视图
- 动态 Tab
  - 项目动态时间线
- 工作空间 Tab
  - 项目绑定工作目录的展示与管理
- 项目成员侧边栏
- 下发任务入口
  - 底部「发起目标」表单：用户给出项目级目标，表头展示「协作专家：<profile> [设置]」和「记录」入口，由协作专家自动拆解并派发
  - Todo 列列头 `+` 按钮 + 弹窗：用户直接创建具体 Kanban task（见 8.5）
  - 看板卡片操作菜单：分状态提供编辑、删除、添加评论、指派、完成、阻塞、归档等
  - 任务详情侧边栏：Status Banner、runs/events 时间线、运行日志 tail、诊断与完整执行上下文（见 12.2.2）
  - 记录：查看已发起的目标及拆解进度，可补充说明

### 3.2 MVP 不包含

- 真正的项目群聊
- 多专家自由对话
- 任务关系图视图
- 复杂项目权限体系
- board-level 独立资料/产物文件库
- 自然语言自由指令解析
- 任务图人工确认和草稿编辑
- 多专家自动讨论与汇总
- 项目级记忆系统
- Agent 完整对话 transcript（任务详情侧边栏不展示；Kanban 不存储）

## 4. 核心概念映射

| 产品概念 | Hermes 概念 | MVP 实现方式 |
|---|---|---|
| 项目 | Kanban Board | 复用 `hermes kanban boards` |
| 项目 ID | board slug | `project_slug === board_slug` |
| 项目名称 | board name | `boards create --name` |
| 项目描述 | board description | `boards create --description` |
| 项目图标 | board icon | `boards create --icon` |
| 专家 | profile | 从 Hermes profile 列表中选择 |
| 项目成员 | selected profiles | 产品层维护成员列表 |
| 任务 | kanban task | 复用 Kanban tasks |
| 任务负责人 | task assignee | `--assignee <profile>` |
| 任务状态 | task status | 状态视图展示 |
| 项目动态 | task events/comments/runs | 首版主要使用 `task_events` |
| 协调专家 | Orchestrator profile / decomposer | 目标式下发时负责拆解目标、创建子任务并分配 assignee |
| 目标式下发 | triage/root task + decompose | 创建待拆解根任务，自动拆解并派发 |
| 表单式下发 | kanban create | 用户直接创建具体任务 |
| 工作空间 | board `default_workdir` | 项目直接绑定一个工作目录，不区分资料和产物 |

## 5. 信息架构

### 5.1 页面结构

项目详情页采用以下结构：

```text
项目详情页
  Header：项目信息 + 项目成员徽章按钮（带成员数）+ 设置
  Tabs：看板 / 动态 / 工作空间
  Main：当前 Tab 内容区
  底部发起目标区：常驻表单（仅在项目详情页可见）
  Drawer：任务详情 / 项目成员
  Modal：创建任务弹窗（由 Todo 列列头 `+` 唤起）
```

推荐默认打开「看板」Tab。

任务下发拆为两条独立路径：

- **底部「发起目标」表单**：常驻于项目详情页底部，承载目标式下发。用户提出项目级目标，由协作专家（协调专家 / 项目经理角色）自动拆解为子任务并分派给项目成员。
- **Todo 列列头 `+` 按钮 → 「创建任务」弹窗**：承载表单式下发。用户已经知道要做什么、谁来做时，点击 Todo 列列头右上角 `+` 唤起弹窗（见 8.5），直接创建具体 Kanban task。

右侧抽屉仅承载任务详情和项目成员侧边栏，不再承载下发任务表单。

### 5.2 页面示意

```text
┌──────────────────────────────────────────────────────────────┐
│ 项目图标  项目名称 / 项目描述  [项目成员 4] [设置]            │
├──────────────────────────────────────────────────────────────┤
│ [看板] [动态] [工作空间]                                      │
│                                                              │
│              看板区（按状态分栏）                             │
│                                                              │
│        Todo 列列头右上角 + 唤起「创建任务」                  │
├──────────────────────────────────────────────────────────────┤
│ 协作专家：<profile>  [设置]                       [记录 v]│
│ 💡 描述你的项目目标，系统会自动拆解为具体任务并分配...        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 目标标题 *  [______________]   优先级 [中 ▾]  [发起]   │  │
│ │ 目标描述 *  [______________]                            │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

底部发起目标区为常驻表单，高度固定（约 180px），不让出过多看板空间。

点击 Todo 列列头右上角 `+` 时，弹出创建任务弹窗（见 8.5）：

```text
┌──────────────────────────────────────────────────────┐
│ 创建任务                                        [✕]  │
├──────────────────────────────────────────────────────┤
│ 任务标题 *  [____________________________]           │
│ 任务说明    [____________________________]           │
│ 负责人 *    [选择项目成员 ▾]                         │
│ 任务状态    [执行中 ▾]   优先级 [中 ▾]              │
│ 父任务      [选择已有任务 ▾]（可选）                 │
│ 工作目录    [继承项目工作目录 ▾]                     │
│                                                      │
│ ▾ 高级设置                                           │
│   额外 Skill / Goal Mode / 最大运行时长 / 失败重试   │
│                                                      │
│                            [取消]  [创建并派发]      │
└──────────────────────────────────────────────────────┘
```

右侧抽屉只承载任务详情和项目成员，不再承载下发任务表单。多个抽屉不同时打开。

## 6. 新建项目流程

### 6.1 流程概述

新建项目采用两步向导：

```text
Step 1：项目信息
Step 2：项目成员
```

### 6.2 Step 1：项目信息

用户填写：

- 项目图标
- 项目名称
- 项目描述
- 工作目录

字段要求：

| 字段 | 必填 | 说明 |
|---|---|---|
| 项目名称 | 是 | 展示名称，例如：12寸产线良率提升项目 |
| 项目描述 | 是 | 简要描述项目目标和背景 |
| 项目图标 | 否 | 可选预设图标或上传图标 |
| 工作目录 | 否 | 项目默认工作目录；未填写时可后续配置 |

系统行为：

- 根据项目名称生成 `project_slug`。
- Step 1 不立即创建 board，避免用户取消时产生半成品项目。

### 6.3 Step 2：项目成员

用户从专家列表中多选项目成员。

专家卡片展示：

- 专家名称
- 专家简介
- 擅长领域标签
- 是否已选择

支持能力：

- 搜索专家名称
- 搜索专家介绍
- 搜索擅长领域
- 显示已选人数
- 多选专家

### 6.4 创建项目提交行为

点击「创建项目」后执行：

1. 创建 Kanban board。
2. 保存项目成员关系。
3. 进入项目详情页。

对应 Kanban 指令示例：

```bash
hermes kanban boards create yield-improvement-12inch \
  --name "12寸产线良率提升项目" \
  --description "针对近期良率波动，组织工艺、质量、设备专家联合攻关" \
  --icon "factory" \
  --default-workdir "D:\\Projects\\yield-improvement-12inch" \
  --switch
```

项目成员关系 MVP 推荐由产品层维护：

```json
{
  "project_slug": "yield-improvement-12inch",
  "members": [
    "process-expert",
    "equipment-director",
    "quality-consultant"
  ]
}
```

## 7. 项目详情页

### 7.1 Header 区域

展示：

- 项目图标
- 项目名称
- 项目描述
- 项目进度摘要
- 「项目成员」按钮（含成员数徽章，例如 `项目成员 4`）
- 「设置」按钮

项目进度摘要示例：

```text
1/3 已完成
```

「项目成员」徽章数字取自当前项目成员列表长度；点击后打开右侧成员侧边栏（见第 11 节）。成员为 0 时按钮文案退化为「添加成员」。

设置按钮用于修改项目信息、协作专家、工作目录等配置。

下发任务不再放在 Header。目标式下发通过页面底部常驻的「发起目标」表单完成（见第 12 节）；表单式下发通过 Todo 列列头右上角 `+` 按钮唤起弹窗完成（见第 8.5 节）。

### 7.2 Tab 结构

Tab 顺序推荐：

```text
看板 / 动态 / 工作空间
```

原因：

- MVP 的核心是任务推进。
- 用户进入项目后最关注任务状态。
- 动态和工作空间是辅助信息。

## 8. 看板 Tab

### 8.1 定位

看板 Tab 是项目详情页的核心区域，用于查看和推进项目任务。

### 8.2 二级视图

看板 Tab 在 MVP 阶段仅展示「按状态」视图，对应 4 个主流程状态列（见 8.3）。「按专家」视图在 v1.1 引入，届时在看板 Tab 顶部增加视图切换条 `任务状态 | 分配专家`。

MVP 阶段不再为「创建任务」单设顶部按钮——该入口由 Todo 列列头右上角的 `+` 按钮承担（见 8.5）；同时，**看板 Tab 顶部不再保留视图切换栏右侧的「+ 创建任务」按钮**。

### 8.3 按状态视图

按任务状态分组展示。MVP 看板固定展示 4 个状态列：`Todo / Running / Blocked / Done`，每个状态列内部按底层 Hermes status 细分，不同底层状态的任务可展示不同内容和操作。

`triage`（待拆解）状态的任务有两个来源，需区分处理：

1. **用户发起的目标**（通过 12.1 节「发起目标」表单创建，带目标标记）：不在看板展示，归入「记录」入口管理（见 12.1.6）。
2. **系统 block_recurrence 升级**：任务反复 block/unblock 达到 `BLOCK_RECURRENCE_LIMIT`（默认 2 次）后，被系统从 `blocked` 踢到 `triage`（`kanban_db.py:4654-4658`）。这类任务**保留在看板 Todo 列**展示，卡片标注「需人工拆解」标记，操作为 `specify`（triage -> todo）或 `decompose`。

> **待定问题**：如何标记「用户发起的目标」root task 以区分两类 triage？`tasks` 表当前无 metadata 列，`create` 命令无 `--metadata` 参数。候选方案：(A) 用 `idempotency_key` 前缀 `goal:` 标记 [倾向]；(B) 用 `tenant` 字段；(C) 扩展 tasks 表加 metadata 列（触及 core）。见第 21 章「已知设计问题」Q2。

推荐展示列：

| UI 状态列 | 包含的 Hermes status | 子状态展示区分 | 说明 |
|---|---|---|---|
| Todo | triage（系统踢回）、todo、scheduled、ready | 不同底层状态操作不同；有未完成父依赖的任务标注「等待父任务」；系统踢回的 triage 标注「需人工拆解」 | 尚未开始执行的任务 |
| Running | running、review | review 状态显示「评审中」标记，表示系统正在自动评审 | 正在执行或评审中的任务 |
| Blocked | blocked | 显示「需人工介入」 | 需要人工处理的任务 |
| Done | done、archived | archived 用灰色/折叠区分 | 已完成或已归档的任务 |

子状态说明：

- **Todo 列**：
  - `triage`（系统踢回）：因反复 block/unblock 达到 `BLOCK_RECURRENCE_LIMIT` 被系统升级到 triage 的任务。卡片标注「需人工拆解」。悬停主操作为「拆解」（对应 `decompose`）或「补充说明」（对应 `specify`，triage -> todo）。注意：用户发起的目标 root task 虽也是 triage，但带目标标记，不在此展示（见上方说明）。
  - `todo`：依赖未清或尚未就绪的任务。有未完成父依赖时卡片标注「等待父任务：T3, T5」。
  - `scheduled`：已排期，等待时间触发或人工激活。
  - `ready`：已可执行，等待调度。这是短暂中间态，通常很快被 dispatcher 领取执行。
- **Running 列**：
  - `running`：worker 正在执行。
  - `review`：worker 创建 PR 后进入评审，由 dispatcher 自动 spawn review agent（加载 sdlc-review skill）验证 PR。评审通过自动 `-> done`，评审不通过自动退回 `running` 让 worker 修复。用户无需也无法手动 promote review 任务。
- **Blocked 列**：
  - `blocked`：需要人工介入。`dependency` 类型的阻塞实际停在 `todo`（走父任务门控），不进此列；`needs_input`/`capability`/`transient` 类型进入此列。
- **Done 列**：
  - `done`：已完成（终态）。
  - `archived`：已归档（软删除终态），默认折叠/灰色展示。

任务卡片展示：

- 任务标题
- 负责人
- 状态（含子状态标记，如「评审中」「等待父任务」）
- 优先级（可选）
- 评论数（可选）
- 最近摘要（可选）

Todo 列的列头右上角提供 `+` 按钮，点击后唤起「创建任务」弹窗（见 8.5）。MVP 阶段不在看板 Tab 顶部工具栏额外提供「+ 创建任务」按钮。

任务卡片本身提供悬停快捷按钮和「…」下拉菜单，承载按状态分级的任务操作（编辑、删除、添加评论、指派、完成、阻塞、归档等）。完整操作矩阵见第 12.8 节。

### 8.4 按专家视图

按项目成员，即 selected profiles，分组展示任务。该视图在 **v1.1** 引入；MVP 看板仅展示按状态分栏的视图，Todo 列列头的 `+` 按钮已能覆盖「创建任务」入口，「按专家」分组留待 v1.1 接入。

### 8.5 创建任务

#### 8.5.1 定位

创建任务是表单式下发的入口。用户已经知道要做什么、谁来做时，通过 Todo 列列头右上角的 `+` 按钮唤起弹窗，直接创建具体 Kanban task。

#### 8.5.2 打开方式

支持以下入口，统一唤起同一个弹窗：

1. **Todo 列列头右上角的 `+` 按钮**（MVP 阶段看板内唯一入口）。
2. 项目成员侧边栏点击「给 TA 创建任务」（预填负责人）。
3. 任务详情或卡片操作菜单中点击「创建后续任务」（预填父任务）。

#### 8.5.3 弹窗字段

```text
┌──────────────────────────────────────────────────────┐
│ 创建任务                                        [✕]  │
├──────────────────────────────────────────────────────┤
│ 任务标题 *  [____________________________]           │
│ 任务说明    [____________________________]           │
│ 负责人 *    [选择项目成员 ▾]                         │
│ 父任务      [选择已有任务 ▾]（可选）                 │
│ 优先级      [中 ▾]                                    │
│ 工作目录    [☑ 继承项目工作目录]                      │
│                                                      │
│ ▾ 高级设置                                           │
│   初始状态 / 额外 Skill / Goal Mode / 最大运行时长    │
│   / 失败重试上限                                      │
│                                                      │
│                    [取消]  [创建]  [创建并派发]      │
└──────────────────────────────────────────────────────┘
```

| 字段 | 必填 | Hermes 映射 | 说明 |
|---|---|---|---|
| 任务标题 | 是 | `create <title>` | 新任务标题 |
| 任务说明 | 否 | `--body` | 任务背景、要求和验收标准 |
| 负责人 | 是 | `--assignee` | 限制为项目成员 |
| 父任务 | 否 | `--parent`（可重复） | 选择已有任务作为依赖；创建后续任务时预填 |
| 优先级 | 否 | `--priority` | 高/中/低 -> 3/2/1，默认中 |
| 工作目录 | 否 | `--workspace dir:<path>` | 默认勾选「继承项目工作目录」；不勾选则用 scratch |
| 初始状态（高级） | 否 | `--initial-status blocked` | 默认不传（自动 ready/todo）；可选 blocked 创建阻塞任务 |
| 额外 Skill（高级） | 否 | `--skill`（可重复） | 折叠到高级设置 |
| Goal Mode（高级） | 否 | `--goal --goal-max-turns` | 折叠到高级设置 |
| 最大运行时长（高级） | 否 | `--max-runtime` | 接受秒数或时长（90s / 30m / 2h / 1d） |
| 失败重试上限（高级） | 否 | `--max-retries` | 对应 `kanban.failure_limit` |

高级设置默认折叠，普通用户只需填写前 6 项。

**初始状态说明**：不传 `--initial-status` 时，任务根据父依赖状态自动创建为 `ready`（无父依赖或父依赖均已完成）或 `todo`（有未完成父依赖），都落在 Todo 列。只有需要创建阻塞任务时才在高级设置中选择 `blocked`。

#### 8.5.4 提交行为

提供两个提交按钮：

- **「创建」**：创建任务，落在 Todo 列，不自动执行。
- **「创建并派发」**：创建任务后，立即执行 12.2.5 节的「开始执行」流程（promote + claim + dispatch），任务从 Todo 列移到 Running 列。

指令映射：

```bash
# 创建（不传 --initial-status，自动 ready/todo）
hermes kanban --board <project_slug> create "<任务标题>" \
  --assignee <profile> --body "<任务说明>" \
  --parent <parent_task_id> --priority <int> \
  --workspace dir:<board.default_workdir>

# 创建并派发（创建后立即执行开始执行流程）
# 产品层先执行上述 create，拿到 task_id 后：
hermes kanban --board <project_slug> promote <task_id> --force
hermes kanban --board <project_slug> claim <task_id>
hermes kanban --board <project_slug> dispatch <task_id>
```

提交后弹窗关闭，动态 Tab 记录任务创建事件。「创建」后任务出现在 Todo 列；「创建并派发」后任务出现在 Running 列。

如果从成员侧边栏进入，负责人默认填入当前成员；从任务详情的「创建后续任务」进入，父任务默认填入当前任务。

## 9. 动态 Tab

### 9.1 定位

动态 Tab 用于展示项目发生了什么，不承担自由聊天能力。

动态来源：

- Kanban task events
- Kanban task comments
- Kanban task runs

MVP 首版主要使用 `task_events`，并通过 `task_id` 补充任务标题。

### 9.2 展示形式

采用时间线样式。

示例：

```text
今天 15:20
  创建任务「设备关联分析」
  负责人：设备运维总监

今天 15:18
  首席工艺专家完成了「良率根因分析」

今天 15:05
  质量体系建设顾问评论了「SPC 数据分析」

今天 14:50
  项目创建，成员 3 人
```

### 9.3 动态类型

MVP 展示以下动态类型：

- 项目创建
- 任务创建
- 任务指派
- 任务评论
- 任务完成
- 任务阻塞
- 任务解除阻塞
- 执行失败
- 执行超时

其他事件可归入「其他任务事件」或暂不展示。

### 9.4 交互

- 点击动态，定位到对应任务。
- 动态可按类型筛选：全部 / 任务 / 评论 / 执行 / 异常。
- 新事件实时追加到顶部。

### 9.5 Hermes 能力映射

动态 Tab 的数据底座是 Hermes Kanban 的 `task_events` 表（append-only 事件流，定义于 `hermes_cli/kanban_db.py:1195`）。Hermes 已具备的能力：

| 能力 | Hermes 现状 | 动态 Tab 用途 |
|---|---|---|
| 事件持久化 | `task_events` 表（append-only，WAL 模式） | 动态数据的唯一权威来源 |
| 实时事件流 | WebSocket `GET /api/plugins/kanban/events?board=<slug>&since=<event_id>` | 新事件实时追加到时间线顶部 |
| 单任务事件列表 | `GET /api/plugins/kanban/tasks/{task_id}` 返回含 `events` 字段 | 点击动态跳转任务详情时的补充信息 |
| 任务评论 | `task_comments` 表 + `comment` 命令 | 「任务评论」动态类型 |
| 执行记录 | `task_runs` 表 + `runs` 命令 | 「执行失败 / 超时」动态类型 |
| 任务详情 | `GET /api/plugins/kanban/tasks/{task_id}` + `/log` | 详情侧边栏 runs/events/诊断/日志（见 12.2.2） |
| CLI 实时流 | `hermes kanban watch --kinds ...` | 调试与命令行查看（非产品功能） |

结论：动态 Tab 的数据获取链路 Hermes 已完整支持，MVP 无需改动 Hermes core。产品层的工作集中在事件语义化翻译、board 级时间线列表接口、以及「项目创建」事件的合成。

### 9.6 实现方案

动态数据获取分三层：

#### 9.6.1 实时事件流（直接复用）

前端直接连接已有的 WebSocket：

```text
GET /api/plugins/kanban/events?board=<project_slug>&since=<event_id>
```

- 每 0.3s 轮询 `task_events`，WAL 模式下几乎零开销。
- 返回增量事件 + `cursor`，前端以 `cursor` 作为下次 `since` 参数。
- 支持 `?board=` 板级过滤，天然对应项目级动态。
- 鉴权复用 dashboard 的 `_SESSION_TOKEN`（WebSocket 通过 query string 传递）。

返回结构：

```json
{
  "events": [
    {
      "id": 123,
      "task_id": "T12",
      "run_id": null,
      "kind": "assigned",
      "payload": {"assignee": "equipment-director"},
      "created_at": 1234567890
    }
  ],
  "cursor": 123
}
```

#### 9.6.2 时间线 REST 列表（产品层补充）

PRD 13.5 节建议的 `GET /projects/{project_slug}/timeline?limit=50` 目前 Hermes 不存在——`/events` 是 WebSocket 流，不是 REST 列表。MVP 由产品层补充：

- 方案 A（推荐）：产品层直查 board DB，执行一条 SQL：

```sql
SELECT e.id, e.task_id, t.title AS task_title,
       e.kind, e.payload, e.created_at
FROM task_events e
LEFT JOIN tasks t ON e.task_id = t.id
ORDER BY e.created_at DESC, e.id DESC
LIMIT ?;
```

  每个 board 是独立 DB 文件，查询天然是 board（项目）级。

- 方案 B：在 kanban dashboard plugin 中新增 `GET /timeline` 路由（类似已有的 `/diagnostics`、`/stats` 等只读路由）。属于 plugin 层扩展，不触及 core。

#### 9.6.3 事件语义化翻译（产品层做）

`task_events.kind` 是面向机器的标识（如 `gave_up`、`protocol_violation`）。产品层维护一张映射表，翻译为用户友好文案。完整映射见 9.7 节。

#### 9.6.4 「项目创建」动态（产品层合成）

Hermes 没有 board 级事件表，`task_events` 只记录 task 级事件。「项目创建，成员 N 人」这类动态需产品层合成：

- 推荐：创建项目时由产品层在自身动态表（或复用 board 的 `task_comments` 表挂一条特殊记录）写入「项目创建」事件。
- 降级：从 board 的 `created_at` 字段推导时间线首条「项目创建于 {时间}」展示，不依赖事件表。

### 9.7 动态事件 kind 与文案映射表

下表是 `task_events.kind` 到 PRD 9.3 节动态类型的完整映射。`payload` JSON 中已携带所需字段，`task_title` 通过 join `tasks` 表补充。

| Hermes 事件 kind | PRD 动态类型 | payload 关键字段 | 展示文案模板 |
|---|---|---|---|
| `created` | 任务创建 | `by` | 创建任务「{task_title}」 |
| `assigned` | 任务指派 | `assignee` | {assignee} 被指派到「{task_title}」 |
| `commented` | 任务评论 | `author`, `len` | {author} 评论了「{task_title}」 |
| `completed` | 任务完成 | `summary`, `artifacts` | {assignee} 完成了「{task_title}」 |
| `blocked` | 任务阻塞 | `reason`, `kind`, `recurrences` | 「{task_title}」被阻塞：{reason} |
| `unblocked` | 任务解除阻塞 | `status` | 「{task_title}」解除阻塞 |
| `crashed` | 执行失败 | `pid`, `exit_code` | 执行失败「{task_title}」 |
| `gave_up` | 执行失败 | `recurrences` | 执行失败「{task_title}」（已放弃） |
| `protocol_violation` | 执行失败 | `pid`, `exit_code` | 执行异常「{task_title}」 |
| `timed_out` | 执行超时 | `run_id` | 执行超时「{task_title}」 |
| `rate_limited` | 执行异常 | `pid`, `exit_code` | 「{task_title}」触发限流，已重新排队 |
| `decomposed` | 拆解（扩展） | `child_count` | 「{task_title}」已拆解为 {child_count} 个子任务 |
| `specified` | 补充说明（扩展） | - | 「{task_title}」补充了说明 |
| `promoted` / `reclaimed` / `scheduled` / `spawned` / `linked` / `archived` | 其他任务事件 | 各异 | 归入「其他」或暂不展示 |

说明：

- MVP 首版仅展示前 10 行（对应 PRD 9.3 节列出的动态类型），`decomposed`/`specified` 作为「其他任务事件」或暂不展示。
- `commented` 事件的 payload 只含 `{"author", "len"}`，不含评论正文。MVP 展示「X 评论了任务 Y」即可；评论正文需点击跳转任务详情查看 `task_comments` 表。PRD v1.1 才要求「动态时间线支持评论正文」。
- 异常类（`crashed`/`gave_up`/`protocol_violation`）在 UI 上可统一归为「执行失败」，`rate_limited`/`timed_out` 归为「执行异常」，细节通过 payload 展示。

## 10. 工作空间 Tab

### 10.1 定位

工作空间用于展示和管理当前项目绑定的工作目录。MVP 不再区分「项目资料」和「项目产物」，也不单独建设文件库；项目相关输入、输出、临时文件和任务产物都默认落在同一个工作目录中。

### 10.2 MVP 内容

工作空间 Tab 展示一个项目级工作目录，叠加**轻量文件浏览**能力。

核心信息：

- 当前工作目录路径
- 目录是否已配置 / 是否可访问
- 工作目录内的文件夹与文件列表（只读浏览）
- 「新建文件夹」与「上传文件」入口（写入工作目录）
- 最近使用说明或提示
- 打开目录 / 复制路径等基础操作

展示示例：

```text
工作目录
D:\\Projects\\yield-improvement-12inch

该目录将作为当前项目的默认工作空间。项目任务、专家执行过程中的输入文件、
输出文件和分析产物都可以放在该目录下统一管理。

[新建文件夹]  [上传文件]

文件夹  0  |  文件  0
（暂无内容）
```

工作空间 Tab **不区分**「项目资料」和「项目产物」，所有输入、输出、临时文件与任务产物都默认落在同一工作目录中。

### 10.3 新建项目时的工作目录

新建项目 Step 1 可增加「工作目录」字段。

字段要求：

| 字段 | 必填 | 说明 |
|---|---|---|
| 工作目录 | 否 | 项目默认工作目录；未填写时可后续配置 |

如果用户填写工作目录，创建 board 时映射为 Hermes Kanban board 的 `default_workdir`。

指令映射：

```bash
hermes kanban boards create <project_slug> \
  --name "<项目名称>" \
  --description "<项目描述>" \
  --icon "<项目图标>" \
  --default-workdir "<工作目录>" \
  --switch
```

### 10.4 修改工作目录

项目创建后，用户可以在工作空间 Tab 修改项目绑定的工作目录。

指令映射：

```bash
hermes kanban boards set-default-workdir <project_slug> "<工作目录>"
```

清空工作目录时：

```bash
hermes kanban boards set-default-workdir <project_slug>
```

### 10.5 实现策略

MVP 不做完整的文件管理能力。

策略：

- 一个项目只绑定一个工作目录。
- 不区分项目资料和项目产物。
- 提供的写入能力：**新建文件夹**、**上传文件**——两者都作用于绑定的工作目录。
- 提供的读取能力：**目录列表（文件夹 / 文件）**、**打开目录**（调系统资源管理器）、**复制路径**。
- **不**做：文件版本管理、文件权限与共享、文件下载（用户在系统资源管理器中自行管理）、文件预览 / 编辑（在外部工具中完成）、多目录挂载。
- 工作空间 Tab 的目录配置入口仍保留在 10.4 节所述的「设置」流程中；「新建文件夹 / 上传文件」操作作用于当前绑定的工作目录，未配置工作目录时按钮置灰。
- 后续任务创建时可默认继承该 board 的 `default_workdir`。
- 如果需要更复杂的文件能力（预览、共享、外部同步），留到 v1.1 / v2。

## 11. 项目成员侧边栏

### 11.1 打开方式

点击 Header 右上角「项目成员」徽章按钮（带成员数，如 `项目成员 4`），右侧滑出成员侧边栏。Header 同时提供「+ 添加成员」入口（成员为 0 时该入口更突出）。

### 11.2 展示内容

每个成员展示：

- 专家名称
- 专家简介
- 擅长领域标签
- 当前任务数
- 完成任务数
- 操作按钮

示例：

```text
首席工艺专家
擅长：良率提升 / 工艺窗口优化 / DOE
任务：1/2 已完成
[给 TA 创建任务]
```

### 11.3 操作

MVP 支持：

- 查看成员
- 添加成员
- 移除成员
- 给该成员创建任务

「给 TA 创建任务」会唤起「创建任务」弹窗（与 Todo 列列头 `+` 唤起的是同一个弹窗，见 8.5）：

- 负责人自动填入当前成员。
- 任务状态默认 `running`（Hermes 不支持 `todo` 作为初始状态）。
- 其他字段（任务标题、说明、优先级等）由用户补充。

## 12. 任务下发与操作

任务下发拆为两条独立路径，由不同的 UI 入口承载：

- **底部「发起目标」表单**：常驻于项目详情页底部，承载目标式下发。MVP 唯一的目标式下发入口。
- **Todo 列列头 `+` 按钮 →「创建任务」弹窗**：承载表单式下发。详见第 8.5 节。

任务推进过程中的评论、指派、完成、阻塞等操作，由看板卡片的悬停快捷按钮和「…」下拉菜单承载，按任务状态分级开放（见 12.8 节）。

### 12.1 底部「发起目标」表单

#### 12.1.1 定位

底部「发起目标」表单是目标式下发的唯一入口。用户提出项目级或阶段级目标，由协作专家（项目经理角色）自动拆解为子任务并分派给项目成员。

表单常驻于项目详情页底部，高度固定（约 180px），不提供展开/收起。当用户切到「动态」或「工作空间」Tab 时，表单可隐藏或保留——MVP 推荐保留，便于用户随时发起目标。

#### 12.1.2 表单结构

```text
+----------------------------------------------------------------------+
| 协作专家：首席工艺专家  [设置]                          [记录 v]  |
+----------------------------------------------------------------------+
| 💡 描述你的项目目标，系统会自动拆解为具体任务并分配给相关专家。      |
| +--------------------------------------------------------------+    |
| | 目标标题 *  [____________________________________]            |    |
| | 目标描述 *  [____________________________________]            |    |
| |              [____________________________________]            |    |
| |              [____________________________________]            |    |
| |                              [优先级: 中 v]      [发起]        |    |
| +--------------------------------------------------------------+    |
+----------------------------------------------------------------------+
```

表头一行「协作专家：<profile> [设置]」承载项目的协作专家选择。点击「设置」打开项目级协作专家选择弹窗（弹窗内可重新指派 / 切换协作专家），修改后会立即持久化（见 13.3）。MVP 阶段每次提交「发起」前会读取当前项目的协作专家作为 root task 的 `--assignee`。

「记录 v」入口在协作专家行的右侧，点击后展开下拉浮层/侧拉面板（见 12.1.6）。

#### 12.1.3 提示文案

表单顶部固定显示一行提示，向 B 端用户说明流程，不暴露 Hermes 术语：

```text
💡 描述你的项目目标，系统会自动拆解为具体任务并分配给相关专家。
```

要点：

- 不出现「协调专家 / Orchestrator / Decomposer / Kanban」等术语。
- 用「自动拆解 + 分配」类比 orchestrator + decomposer 的两步动作。
- 让用户对结果有预期：提交后会生成子任务并自动派发。
#### 12.1.4 字段

| 字段 | 必填 | Hermes 映射 | 说明 |
|---|---|---|---|
| 目标标题 | 是 | `create <title>` 位置参数 | 一句话概括目标 |
| 目标描述 | 是 | `--body` | 多行富文本；v1.1 起支持 `@file:` 引用工作目录文件 |
| 优先级 | 否 | `--priority` | 高/中/低 → 3/2/1，默认中 |
| 协作专家 | 否 | `--assignee`（root task） | 表头展示当前项目协作专家，「设置」可在项目级重新指派；未配置时回退到默认协调专家 |

所属项目不显示为字段——这是项目详情页，默认绑定当前 `project_slug`。

附件上传能力（落到 `default_workdir` 后 `@file:` 引用）推迟到 v1.1。MVP 阶段如需在目标描述中引用文件，建议用户在系统资源管理器中把文件先放到工作目录，目标描述里手写相对路径。

#### 12.1.5 提交行为

点击「发起」按钮后：

1. 创建一个 `triage` 状态的 root task，带目标标记（如 `idempotency_key` 前缀 `goal:`）。root task 在「记录」入口中可见，看板默认过滤不展示（见第 21 章「已知设计问题」Q1）。
2. 自动触发 `decompose`，由协调专家拆解为子任务并派发给项目成员。decompose 成功后 root task 从 `triage` 变为 `todo`（`kanban_db.py:5163`），成为所有子任务的 parent，继续存活但仍在看板被过滤。
3. 表单清空，看板出现拆解后的子任务。
4. 记录列表新增一条，状态为「进行中」。
5. 动态 Tab 记录任务创建、拆解和派发事件。

指令映射：

```bash
hermes kanban --board <project_slug> create "<目标标题>" --triage --assignee <orchestrator_profile> --body "<目标描述>" --priority <int> --created-by <user>

hermes kanban --board <project_slug> decompose <root_task_id>
```

如果项目配置 `kanban.auto_decompose=true`，第二步由 dispatcher 自动触发；否则由产品层在创建后立即调用 `decompose`。

MVP 不提供任务图人工确认环节。用户如需调整拆解结果，在看板中通过卡片操作菜单编辑、改派、评论、阻塞或追加任务。

#### 12.1.6 记录

表单表头右侧提供「记录 v」入口（与协作专家同一行），点击后展开侧拉面板（或下拉浮层），列出当前用户在本项目发起过的目标。带目标标记的 root task（即用户发起的目标）在此处集中管理，跨状态追踪（triage -> todo -> done），看板默认过滤这类任务不展示。

每条记录展示：

| 字段 | 来源 | 说明 |
|---|---|---|
| 目标标题 | root task title | |
| 发起时间 | `created_at` | |
| 状态 | root task status + 子任务进度 | 待拆解 / 进行中 / 已完成 / 已归档 |
| 子任务数 | 统计 child tasks | 例如「5 个子任务，2 已完成」 |

状态计算规则（产品层聚合，非 Hermes 原生状态）：

- **待拆解**：root task 仍为 `triage`（未触发 decompose 或 decompose 失败）。
- **进行中**：root task 已离开 triage（decompose 成功变 todo，或后续推进中），且子任务未全部 done。展示「N/M 子任务完成」。
- **已完成**：root task 为 `done`（所有子任务完成后自动 promote），或子任务全部 done。展示「M/M 子任务完成」。
- **已归档**：root task 为 `archived`。

> **注意**：不存在「拆解中」状态。decompose 是原子操作（`kanban_db.py:5015` 验证 + 5163 翻转在同一 `write_txn`），瞬间完成。`auto_decompose=true` 时的异步窗口为秒级，不作为持久状态展示。

示例：

```text
记录
-----------------------------------------
• 针对近期良率波动组织专家排查
  今天 15:20 · 进行中 · 3/5 子任务完成
  [查看详情] [补充说明]

• 12 寸产线工艺窗口复盘
  昨天 10:08 · 已完成 · 4/4 子任务完成
  [查看详情] [补充说明]

• 数据治理规范建设
  3 天前 · 待拆解 · 未拆解
  [查看详情] [补充说明]
-----------------------------------------
```

**查看详情**：展开后看到目标原文（标题 + 描述）、拆解出的子任务列表（每个子任务：标题、负责人、状态）、关键事件时间线。

点击记录卡片或「查看详情」时，看板进入「目标聚焦」模式：

- 属于该目标的子任务（通过 `child_ids(root_task_id)` 查询，`kanban_db.py:2895`）高亮显示：加边框 + 目标徽章（如「目标：良率排查」）。
- 不属于该目标的任务降低不透明度（如 40%）。
- 顶部浮条：「正在查看目标：xxx · N/M 子任务完成 · [退出聚焦]」。
- 点击「退出聚焦」或按 Esc 恢复正常看板视图。

**补充说明**：用户对已发起的目标追加说明，对应 `kanban comment <root_task_id>`。提交后追加为 root task 的 comment，被协调专家在后续拆解/调度时读取。工业场景下用户发起目标后发现遗漏背景信息，可随时补充。

指令映射：

```bash
# 列出当前用户在本项目发起的目标（跨状态，按目标标记过滤）
# 待定：list 命令当前不支持按 idempotency_key 过滤，
# 产品层需直查 DB：SELECT * FROM tasks WHERE idempotency_key LIKE 'goal:<project_slug>:%'
# 或扩展 list 增加 --idempotency-key 过滤参数（见第 21 章「已知设计问题」Q2）
hermes kanban --board <project_slug> list --json
# 产品层在返回结果中按 idempotency_key 前缀过滤

# 查看某个目标的拆解结果
hermes kanban --board <project_slug> show <root_task_id>

# 补充说明
hermes kanban --board <project_slug> comment <root_task_id> "<补充说明>"

# 手动触发拆解（若未开启 auto_decompose）
hermes kanban --board <project_slug> decompose <root_task_id>

# 分配/更换协调专家
hermes kanban --board <project_slug> assign <root_task_id> <profile>

# 归档目标（移出记录列表）
hermes kanban --board <project_slug> archive <root_task_id>
```

### 12.2 任务卡片与详情侧边栏

任务的信息展示和操作按三层架构组织：任务卡片（L1）承载极简信息和高频操作，详情侧边栏（L2）承载**完整执行上下文**与全部操作，操作弹窗（L3）承载需要填表单的操作。

#### 12.2.1 任务卡片（L1）

卡片是看板列内的最小展示单元，只展示一眼需要看到的信息和 1 个最高频操作。卡片本身不承载复杂操作。

**卡片布局：**

```text
┌──────────────────────────────────────┐
│ ▌ 任务标题                       [⋯] │
│ @负责人 · 子状态标记 · 💬 3          │
│                                      │
│           [ 悬停主操作按钮 ]          │
└──────────────────────────────────────┘
```

**卡片信息字段：**

| 字段 | 展示方式 | 说明 |
|---|---|---|
| 优先级 | 左侧 3px 色条 | 红=高 / 橙=中 / 灰=低 |
| 任务标题 | 主文本 | 超长截断 |
| 负责人 | `@profile名` | 灰色小字 |
| 子状态标记 | 标签 | 如「评审中」「已排期」「可执行」「等待父任务:T3」 |
| 评论数 | `💬 N` | 0 时不显示 |
| `⋯` 菜单 | 右上角 | 点击展开次级操作（见 12.2.3） |

**各列卡片的悬停主操作：**

| 看板列 | 子状态 | 悬停主操作 | 说明 |
|---|---|---|---|
| Todo | todo（无未完成父依赖） | **开始执行** | 产品层翻译为 promote+claim+dispatch（见 12.2.5） |
| Todo | todo（有未完成父依赖） | **开始执行**（置灰） | tooltip 显示「等待父任务: T3, T5」 |
| Todo | scheduled | **激活** | 对应 unblock，回到 ready/todo |
| Todo | ready | **开始执行** | 产品层翻译为 claim+dispatch |
| Running | running | **完成** | 打开完成弹窗（见 12.2.4） |
| Running | review | **查看进度** | 打开详情侧边栏，无操作按钮 |
| Blocked | blocked | **重启** | 对应 unblock（需校验 orchestrator 权限） |
| Done | done | **查看** | 打开详情侧边栏 |
| Done | archived | **查看** | 打开详情侧边栏 |

**卡片交互规则：**

- 点击卡片空白处（非按钮/菜单区域）-> 打开详情侧边栏。
- 悬停时显示主操作按钮；主操作按钮根据子状态动态变化。
- `⋯` 菜单点击后展开次级操作列表（3-5 个高频项）。

#### 12.2.2 详情侧边栏（L2）

详情侧边栏从右侧滑出，承载任务的**完整执行上下文**和全部操作。点击卡片空白处、动态 Tab 条目、或记录中的「查看详情」均可打开。

**设计原则：**

1. **第一眼回答「现在怎么了、我该怎么办」**——优先展示当前状况（阻塞原因、诊断、最新产出），而非仅罗列创建时间等静态字段。
2. **单任务视角**——侧边栏展示该任务的 runs / events / 日志；不复刻项目动态 Tab 的全局时间线。
3. **渐进披露**——Above-the-fold 放摘要与告警；执行详情默认可折叠，Running / Blocked 状态默认展开。
4. **Hermes 原生数据优先**——不新增后端字段；复用 `show` / Kanban dashboard API 已有 payload。

**信息分层（自上而下）：**

| 层级 | 名称 | 默认可见性 | 职责 |
|---|---|---|---|
| Header | 标题 + 状态徽章 + 负责人 | 固定 | 任务身份 |
| ① | **当前状况** | 始终可见 | Status Banner：阻塞原因、诊断、最新产出、进度 |
| ② | **执行详情** | Running/Blocked 默认展开 | runs 时间线、events 时间线、运行日志 |
| ③ | **任务上下文** | 默认展开 | 说明、依赖、工作目录、配置元数据 |
| ④ | **协作** | 固定底部输入框上方 | 评论列表 + 添加评论 |
| Footer | **操作区** | 固定底部 | 按看板列分级开放的操作按钮 |

**布局结构：**

```text
┌──────────────────────────────────────┐
│ [✕]  设备关联分析          [Blocked] │  ← Header
│ @设备运维总监 · 高优先级              │
├──────────────────────────────────────┤
│ ⚠ 需人工介入：缺少 SPC 原始数据权限   │  ← ① 当前状况 Banner
│   类型：capability · 已重试 2/2 次   │
├──────────────────────────────────────┤
│ ▾ 最新产出                            │
│   已定位温度漂移，待补数据后验证...    │  ← latest_summary / result
├──────────────────────────────────────┤
│ ▾ 执行记录 (2)                        │  ← ② runs（可展开）
│   ● Run #2  blocked  3m12s  今天15:45│
│     摘要: ...                         │
│     错误: Permission denied ...       │
│   ○ Run #1  timed_out  10m00s        │
├──────────────────────────────────────┤
│ ▾ 执行事件                            │  ← ② events 时间线
│   15:45 blocked — needs_input         │
│   15:32 spawned → 设备运维总监        │
│   15:20 created                       │
├──────────────────────────────────────┤
│ ▾ 运行日志              [刷新]       │  ← ② log tail（Running/Blocked/Done）
│   ... worker stdout 末 50 行 ...      │
├──────────────────────────────────────┤
│ ▾ 任务说明 / 依赖 / 工作目录          │  ← ③ 上下文（可折叠）
├──────────────────────────────────────┤
│ ── 评论 ──                            │  ← ④ 协作
│ [工艺专家] 建议同步检查冷却系统       │
│ ┌────────────────────────────────┐  │
│ │ 添加评论...                    │  │
│ └────────────────────────────────┘  │
├══════════════════════════════════════┤
│ [重启] [转交] [添加评论] [归档]       │  ← Footer 操作区
└──────────────────────────────────────┘
```

##### ① 当前状况（Status Banner）

Header 下方固定一条 **Status Banner**，按任务状态与子状态动态渲染。用户打开侧边栏时无需滚动即可看到「现在怎么了」。

| 看板列 / 子状态 | Banner 内容 | Hermes 数据来源 |
|---|---|---|
| **Blocked** | 阻塞原因（大字）+ block_kind 中文标签 + 连续失败次数 | 最近 `blocked` 事件 payload、`tasks.block_kind`、`consecutive_failures` |
| **Running** | 已运行时长 + 当前 Run # + 最近 heartbeat 时间 | `started_at`、`current_run_id`、`last_heartbeat_at` |
| **Todo（等依赖）** | 「等待父任务：T3, T5」（可点击跳转） | `task_links` + 父任务 status |
| **Done** | 完成时间 + 结果摘要首行 | `completed_at`、`latest_summary` / `result` |
| **review** | 「系统自动评审中」+ 评审说明 | 固定文案（见下方评审区块） |
| **有诊断** | ⚠/!! 诊断标题 + 建议操作（可点击） | `GET /tasks/{id}` 的 `diagnostics[]` |

block_kind 产品层中文映射：

| Hermes kind | UI 文案 |
|---|---|
| `needs_input` | 需人工决策 |
| `capability` | 能力/权限不足 |
| `transient` | 临时故障 |
| `dependency` | 等待依赖（通常不进 Blocked 列，Banner 仅在 Todo 等依赖时出现） |
| （未分类） | 需人工介入 |

##### ② 执行详情

**运行记录（runs）——可展开时间线**

每条 run 默认展示一行摘要；点击展开完整详情。Running 状态下 **当前 active run 高亮并默认展开**。

| 字段 | 列表行 | 展开后 | Hermes 来源 |
|---|---|---|---|
| Run 序号 | ✅ | ✅ | `task_runs.id` |
| 执行专家 | ✅ | ✅ | `task_runs.profile` |
| 结果 outcome | ✅（中文标签） | ✅ | `task_runs.outcome` / `status` |
| 耗时 | ✅ | ✅ | `ended_at - started_at` |
| 摘要 summary | 首行截断 | 全文 | `task_runs.summary` |
| 错误 error | — | ✅（失败类 outcome 时） | `task_runs.error` |
| 结构化 metadata | — | ✅（JSON 只读展示） | `task_runs.metadata` |
| 起止时间 | — | ✅ | `started_at` / `ended_at` |

outcome 产品层中文映射（常用）：`completed`→完成、`blocked`→阻塞、`crashed`→崩溃、`timed_out`→超时、`spawn_failed`→启动失败、`gave_up`→已放弃、`reclaimed`→已回收、`scheduled`→已排期。

**执行事件（events）——单任务时间线**

runs 下方展示该任务的 **执行事件** 时间线（与项目动态 Tab 互补，非重复）：

- MVP 展示高频 kind：`created` / `spawned` / `assigned` / `completed` / `blocked` / `unblocked` / `crashed` / `timed_out` / `gave_up` / `decomposed`
- 每条：时间 + 中文标签 + payload 关键字段（如 `reason`、`assignee`、`exit_code`）
- 其余 kind 归入「其他事件」折叠或暂不展示（完整清单见 13.5.5）

数据来源：`task_events`（`show` / `GET /tasks/{id}` 的 `events[]`）。

**运行日志（worker log）——内嵌面板**

Running / Blocked / Done 状态下，侧边栏内嵌 **运行日志** 折叠区（不仅依赖底部操作按钮）：

- 默认展示 **tail 末 50 行**；提供「展开全部」「刷新」
- 任务从未 spawn 时显示「暂无运行日志」
- 操作区保留「在新窗口查看完整日志」作为辅助入口（可选）

数据来源：`GET /tasks/{task_id}/log?tail=65536` 或 `hermes kanban log <task_id>`。单任务日志磁盘上限约 4 MiB（Hermes 轮转策略）。

**最新产出 vs 完成说明（Done 状态）**

Hermes 中两个字段来源不同，Done 状态分开展示：

| UI 区块 | Hermes 字段 | 说明 |
|---|---|---|
| **执行摘要** | `latest_summary`（来自 `task_runs.summary`） | worker handoff，最常见 |
| **完成说明** | `tasks.result` | 仅当 `complete --result` 显式传入时有值 |

##### ③ 任务上下文

可折叠区块，默认展开。

| 区块 | 内容 | Hermes 来源 | MVP |
|---|---|---|---|
| **任务说明** | body 全文 | `tasks.body` | P0 |
| **依赖关系** | 父/子任务列表，未完成父任务标注 ⏳，可点击跳转 | `task_links` + `parent_ids` / `child_ids` | P0 |
| **父任务产出** | 已完成父任务旁「查看摘要」展开 | `parent_results()` / 父任务 `latest_summary` | P1 |
| **子任务进度** | 「N/M 已完成」+ 子任务状态列表（有 children 时） | `child_ids` + 批量查 status | P1 |
| **工作目录** | workspace 路径 + 「在工作空间中打开」链接 | `workspace_kind` / `workspace_path` | P0 |
| **配置元数据** | 创建者、开始/完成时间、总耗时、Skills、连续失败、最近错误 | `tasks.*` | P0 |
| **评审信息** | 仅 review：「系统自动评审中」；评审通过→done，不通过→running | 固定文案 + status | P0 |
| **任务附件** | 只读列表 + 下载（有附件时） | `task_attachments` / `GET .../attachments` | P1 |
| **高级信息** | claim_lock、worker_pid、idempotency_key 等 | `tasks.*` | 默认折叠隐藏 |

配置元数据展示规则：`consecutive_failures > 0` 或存在 `last_failure_error` 时在 Blocked / 失败任务上突出显示。

##### ④ 协作

- 评论列表（作者、正文、时间）+ 底部固定「添加评论」输入框
- 对应 `hermes kanban comment <task_id> "<内容>"`

##### 诊断与恢复建议（Diagnostics）

当 `diagnostics[]` 非空时，在 Status Banner 下方或 Banner 内嵌展示：

```text
⚠ Agent crashed 2x: rate limit exceeded
  → 建议：转交给其他专家 / 重启任务
```

数据来源：`GET /tasks/{id}` 返回的 `diagnostics[]`（`hermes_cli.kanban_diagnostics` 规则引擎，Kanban dashboard 已集成）。**MVP P1**，零新增后端。

##### 数据接口

侧边栏打开时，产品层一次拉取任务详情（避免 N+1）：

```text
# 推荐：复用 Kanban dashboard API（与 Hermes 原生 dashboard 一致）
GET /api/plugins/kanban/tasks/{task_id}?board=<project_slug>

# 返回含：task、comments、events、attachments、links、runs、diagnostics（若有）
```

运行日志按需懒加载（展开日志区或点击刷新时）：

```text
GET /api/plugins/kanban/tasks/{task_id}/log?board=<project_slug>&tail=65536
```

CLI 等价：

```bash
hermes kanban --board <project_slug> show <task_id> --json
hermes kanban --board <project_slug> log <task_id>
hermes kanban --board <project_slug> runs <task_id>
```

##### MVP 优先级

| 优先级 | 区块 / 能力 | 说明 |
|---|---|---|
| **P0** | Status Banner（含阻塞原因） | Blocked 任务必备 |
| **P0** | runs 可展开（summary + error） | 执行详情核心 |
| **P0** | 执行 events 时间线（高频 kind） | 补齐执行过程叙事 |
| **P0** | 最新产出 / 完成说明分开展示 | Done 任务可读性 |
| **P0** | 元数据补全（时间线、工作目录、失败计数） | 低成本高价值 |
| **P0** | 运行日志内嵌 tail | 排查必备 |
| **P1** | Diagnostics 诊断区块 | dashboard 已有 |
| **P1** | 父任务产出摘要 | 依赖场景排查 |
| **P1** | 子任务进度聚合 | 有 children 时 |
| **P1** | 任务附件只读列表 | `task_attachments` 已有 |
| **v1.1** | events WebSocket 实时追加 | dashboard WS 已有，产品层接入 |
| **v1.1** | metadata 结构化渲染（文件列表、测试结果） | 需前端解析 |
| **v1.1** | Run inspect（PID / CPU / 内存） | 运维向 |

##### 明确不做（侧边栏范围外）

- **Agent 完整对话 transcript** — Kanban 不存储；若需要须接 session / trajectory，scope 超出 MVP。
- **项目级动态时间线副本** — 项目动态 Tab 负责；侧边栏只做单任务 events。
- **title/body 假编辑** — Hermes `edit` 仅支持 done 任务补录 result/summary/metadata（见 12.8 注1）。
- **运行日志以外的全量 agent 思考链** — 不在 Hermes Kanban 数据模型内。

**操作区交互：**

- 操作区**固定显示在侧边栏底部**，不折叠、不收纳。
- 中间内容区（①–④）可上下滚动，操作区始终可见。
- 操作区按钮按看板列分级开放（见 12.2.3）。
- review 状态的操作区只显示「添加评论」输入框，不显示任何操作按钮（评审由系统自动完成，用户无需也无法手动操作）。
- 「查看运行日志」从内嵌面板承担主入口；操作区可保留「复制日志路径」等辅助项，避免与内嵌面板重复。

#### 12.2.3 操作分级开放

操作按看板列分级开放。卡片 `⋯` 菜单只放 3-5 个高频项，详情侧边栏操作区放完整列表，两者一致但侧边栏更完整。

**卡片 `⋯` 次级操作（精简）：**

| 看板列 | `⋯` 菜单内容 |
|---|---|
| Todo | 添加评论、分配负责人、标记阻塞、归档 |
| Running | 添加评论、查看运行日志、转交、标记阻塞 |
| Blocked | 添加评论、更新阻塞说明、转交、归档 |
| Done | 添加评论、创建后续任务、补录结果、归档 |

**详情侧边栏操作区（完整）：**

| 看板列 | 操作区按钮 |
|---|---|
| Todo | 添加评论、分配负责人、开始执行、移动状态、添加依赖、移除依赖、排期、标记阻塞、归档 |
| Running | 添加评论、完成、标记阻塞、转交、查看运行日志、查看运行记录、归档 |
| Blocked | 添加评论、重启（unblock）、更新阻塞说明、转交、归档 |
| Done | 添加评论、补录结果（edit）、创建后续任务、查看运行记录、归档、永久删除（仅 archived） |
| Running (review) | 添加评论（无其他操作按钮） |

#### 12.2.4 操作弹窗（L3）

以下操作点击后弹出居中 Modal 弹窗（非侧边栏），用于需要填写表单字段的操作：

| 操作 | 弹窗字段 | 说明 |
|---|---|---|
| **完成任务** | 完成说明（可选） | 对应 `complete --result` |
| **阻塞任务** | 阻塞原因（必填）、阻塞类型（可选） | 对应 `block --kind`，类型为 `dependency`/`needs_input`/`capability`/`transient` |
| **转交任务** | 新负责人（必选，从项目成员中选） | running 状态自动带 `--reclaim` |
| **补录结果** | result（必填）、summary（可选）、metadata（可选） | 对应 `edit`，仅 done 状态可用 |
| **创建后续任务** | 复用创建任务弹窗，预填父任务 | 对应 `create --parent` |
| **移动状态** | 目标状态选择器 | 按底层 status 动态展示可选项（见 12.7 节） |

#### 12.2.5 「开始执行」的统一翻译

合并状态后，Todo 列内的 todo/ready/scheduled 都是"未开始执行"的子状态，用户看到的是一个统一的「开始执行」按钮。产品层根据任务底层 status 翻译成不同的 Hermes 指令序列：

```text
用户点击「开始执行」
  │
  ├─ 底层是 todo：
  │   ├─ 有未完成父依赖？ -> 按钮置灰，tooltip 显示「等待父任务: T3, T5」
  │   └─ 无未完成父依赖？ -> promote --force -> claim -> dispatch
  │
  ├─ 底层是 ready：
  │   └─ claim -> dispatch
  │
  └─ 底层是 scheduled：
      └─ 先 unblock（回到 ready/todo）-> 再按上述流程
```

**用户不接触底层状态名和 promote 概念。**「开始执行」由产品层翻译成 promote+claim+dispatch 序列，用户只看到卡片从 Todo 列移到 Running 列。

**失败处理：**

- 如果 claim 时被代码的父依赖检查降级回 todo（竞态情况），产品层提示「父任务状态变化，请稍后重试」。
- 如果 promote --force 失败（如并发修改），提示「任务状态已变化，请刷新看板」。

**指令映射：**

```bash
# todo -> ready（手动晋升，绕过父依赖检查）
hermes kanban --board <project_slug> promote <task_id> --force

# ready -> running（领取执行）
hermes kanban --board <project_slug> claim <task_id>
hermes kanban --board <project_slug> dispatch <task_id>

# scheduled -> ready/todo（激活排期任务）
hermes kanban --board <project_slug> unblock <task_id>
```
### 12.3 添加评论

| 字段 | 必填 | 说明 |
|---|---|---|
| 评论内容 | 是 | 评论正文 |
| 作者 | 否 | 默认当前用户 |

```bash
hermes kanban --board <project_slug> comment <task_id> "<评论内容>"
```

入口：卡片「…」菜单、任务详情抽屉、记录的「补充说明」。

### 12.4 指派 / 转交任务

| 字段 | 必填 | 说明 |
|---|---|---|
| 负责人 | 是 | 从项目成员中选择 |

```bash
# 普通指派
hermes kanban --board <project_slug> assign <task_id> <profile>

# 进行中任务的转交（需先释放 claim）
hermes kanban --board <project_slug> reassign <task_id> <profile> --reclaim --reason "<原因>"
```

进行中（running）状态的任务转交必须带 `--reclaim`，否则会被拒绝。

### 12.5 完成任务

| 字段 | 必填 | 说明 |
|---|---|---|
| 完成说明 | 否 | 完成结果摘要 |

```bash
hermes kanban --board <project_slug> complete <task_id> --result "<完成说明>"
```

完成后任务进入 `done` 状态，动态 Tab 记录完成事件。

### 12.6 阻塞 / 重启任务

#### 12.6.1 标记阻塞

| 字段 | 必填 | 说明 |
|---|---|---|
| 阻塞原因 | 是 | 为什么无法继续 |
| 阻塞类型 | 否 | `dependency` / `needs_input` / `capability` / `transient` |

```bash
hermes kanban --board <project_slug> block <task_id> "<阻塞原因>" --kind <kind>
```

`dependency` 类型的阻塞会停在 `todo`，父任务完成后自动晋升；其他类型进入 `blocked` 等待人工处理。

#### 12.6.2 重启任务（解除阻塞）

```bash
hermes kanban --board <project_slug> unblock <task_id> --reason "<重启说明>"
```

注意：`unblock` 是 orchestrator-only 操作，UI 需校验当前 profile 权限。解除阻塞后任务回到 Todo 列：无未完成父依赖时进入 `ready`，有未完成父依赖时进入 `todo`（等父任务完成后自动晋升为 `ready`）。

### 12.7 移动状态

对于需要人工调整状态的任务，提供「移动状态」操作，弹出一个状态选择器。注意：状态选择器按底层 Hermes status 级别操作，UI 需根据任务当前底层 status 动态展示可移动的目标状态。

支持的目标状态（按底层 Hermes status）：

| 当前底层状态 | 所属看板列 | 可移动到 |
|---|---|---|
| todo | Todo | ready（手动晋升）/ blocked |
| scheduled | Todo | ready 或 todo（通过 unblock，根据父依赖自动判断） |
| ready | Todo | todo / blocked |
| running | Running | blocked / ready（通过 reclaim 释放 claim） |
| review | Running | 不可手动移动（由系统自动评审，通过则 -> done，不通过则 -> running） |
| blocked | Blocked | ready 或 todo（通过 unblock，根据父依赖自动判断） |
| done | Done | 不可移动（终态，需创建后续任务） |
| archived | Done | 不可移动（终态） |

对应指令：

```bash
# todo → ready（手动晋升）
hermes kanban --board <project_slug> promote <task_id> --force

# 任意 → blocked
hermes kanban --board <project_slug> block <task_id> "<原因>"

# blocked/scheduled → ready 或 todo（根据父依赖自动判断）
hermes kanban --board <project_slug> unblock <task_id>

# running → ready（释放 claim，让任务重新可被领取）
hermes kanban --board <project_slug> reclaim <task_id>
```
### 12.8 分状态操作矩阵

任务卡片上的操作按任务状态分级开放。卡片提供悬停快捷按钮（1-2 个，按状态变化）和「…」下拉菜单（完整操作）。

#### 12.8.1 操作矩阵

任务卡片上的操作按任务所属看板列及其底层 Hermes status 分级开放。同一列内不同底层状态的任务，操作菜单可能不同。

| 看板列 | 底层状态 | 悬停快捷 | 「…」菜单完整操作 | Hermes 指令 |
|---|---|---|---|---|
| **Todo** | todo | [开始执行] | 查看详情、添加评论、分配负责人、标记阻塞、归档 | `show` / `comment` / `assign` / `promote`+`claim`+`dispatch`(见12.2.5) / `link` / `archive` |
| **Todo** | scheduled | [激活] | 查看详情、添加评论、激活任务（取消排期）、归档 | `show` / `comment` / `unblock` / `archive` |
| **Todo** | ready | [开始执行] | 查看详情、添加评论、移动状态、转交专家、标记阻塞、排期、归档 | `show` / `comment` / `claim`+`dispatch`(见12.2.5) / `reassign` / `block` / `schedule` / `archive` |
| **Running** | running | [完成] | 查看详情、添加评论、完成任务、标记阻塞、转交专家、查看运行日志、查看运行记录、打断 | `show` / `comment` / `complete` / `block` / `reassign --reclaim` / `log` / `runs` / `tail` / `reclaim` |
| **Running** | review | [查看] | 查看详情、添加评论、查看运行记录 | `show` / `comment` / `runs`（评审由系统自动完成，用户无需也无法手动操作） |
| **Blocked** | blocked | [重启] | 查看详情、添加评论、重启任务（解除阻塞）、关闭任务（归档）、转交专家、更新阻塞说明 | `show` / `comment` / `unblock`(注2) / `archive` / `reassign` / `block` |
| **Done** | done | [查看] | 查看详情、补录结果、创建后续任务、查看运行记录、归档 | `show` / `edit --result` / `create --parent` / `runs` / `archive` |
| **Done** | archived | [查看] | 查看详情、永久删除 | `show --archived` / `gc --rm` |

注1：`edit` 指令当前只支持改 done 任务的 `--result/--summary/--metadata`（且 `--result` 必填），**不能改 title/body**。MVP 中如需编辑 todo 状态任务的 title/body，需要产品层直接改 DB，或标注「编辑受限」。

注2：`unblock` 是 orchestrator-only 操作（见 `tools/kanban_tools.py` 的 `_check_kanban_orchestrator_mode`），UI 需校验当前 profile 权限。

注3：`triage` 状态的任务不在看板展示，其操作（decompose/specify/assign/comment/archive）在「记录」入口中提供（见 12.1.6）。

#### 12.8.2 「重新打开」的语义

Hermes 的 `done` 是终态，**没有 reopen 指令**。如果用户需要对已完成任务追加工作：

- **创建后续任务**：通过 `create --parent <旧task_id>` 创建新任务，自动建立父子依赖。这是 MVP 推荐路径。
- 「重新打开」按钮在 UI 上等价于「创建后续任务」，预填父任务后弹出创建任务弹窗。

#### 12.8.3 「删除」的语义

Hermes 的 `archive` 是软删除（任务保留在 DB，默认从看板隐藏）。**没有硬删除**（除 `gc --rm` 清理已归档任务）。

- 卡片菜单上的「删除」对应 `archive`，任务在 Done 列内变为已归档子状态（灰色/折叠展示）。
- 「永久删除」只在已归档状态下出现，对应 `gc --rm`，不可恢复。

#### 12.8.4 卡片操作菜单的分层

任务的信息展示和操作按三层架构组织（详见 12.2 节）：

1. **任务卡片（L1）**：看板列内的最小展示单元。承载极简信息（标题、负责人、子状态标记、评论数、优先级色条）和 1 个悬停主操作按钮。右上角 `⋯` 菜单放 3-5 个高频次级操作。
2. **详情侧边栏（L2）**：右侧抽屉。承载完整信息（说明、依赖关系、运行记录、评论）和全部操作。操作区固定在底部，不折叠、不收纳；中间内容区可滚动。
3. **操作弹窗（L3）**：居中 Modal。承载需要填写表单字段的操作（完成、阻塞、转交、补录结果、移动状态等）。

review 状态的任务不暴露任何操作入口（评审由系统自动完成），卡片悬停只有「查看进度」，详情侧边栏只有查看 + 评论。

## 13. 数据与接口需求

### 13.1 项目数据

底层使用 Kanban board。

需要字段：

- slug
- name
- description
- icon
- color
- default_workdir
- created_at

### 13.2 项目成员数据

MVP 推荐由产品层维护。

字段：

- project_slug
- profile_id
- display_name
- description
- tags
- added_at

说明：

- Hermes Kanban 当前没有强 board members 模型。
- 任务执行仍然依赖 `task.assignee`。
- UI 层限制任务负责人只能从项目成员中选择。

### 13.3 项目编排配置

MVP 需要在产品层或配置层明确当前项目的协调专家（协作专家）选择，用于目标式下发。

建议字段：

- project_slug
- orchestrator_profile
- default_assignee
- auto_decompose_enabled

说明：

- `orchestrator_profile`（产品层对外文案：**协作专家**）是项目级 UI 设置项：
  - 在底部「发起目标」表单表头以「协作专家：<profile> [设置]」形式展示（见 12.1.2）。
  - 「设置」入口打开项目级协作专家选择弹窗，可从项目成员中重选或切换。
  - 修改后立即持久化到本项目配置，提交「发起」时作为 root task 的 `--assignee`。
- `auto_decompose_enabled` 表示目标式下发后是否自动触发拆解。MVP 产品语义为**自动拆解并派发**，默认 `true`。
- 如果未配置 `orchestrator_profile`，按以下顺序回退：
  1. 项目成员中标记为「默认协调专家」的人。
  2. 当前 active / default profile。
  3. 报「请先设置协作专家」错误并阻止提交。

### 13.4 任务数据

来自 Kanban tasks。

需要字段：

- id
- title
- body
- status
- assignee
- priority
- created_at
- started_at
- completed_at
- result
- latest_summary
- comment_count

### 13.5 动态数据

#### 13.5.1 数据来源

动态数据唯一权威来源是 board（项目）对应的 `task_events` 表。每个 board 是独立 SQLite 文件，查询天然是项目级。

补充数据：

- `task_comments` 表：评论正文（MVP 不在时间线展示，v1.1 接入）。
- `task_runs` 表：执行记录详情（点击动态跳转任务详情时使用）。
- `tasks` 表 join：补充 `task_title`、`assignee` 等展示字段。

#### 13.5.2 已有接口（直接复用）

实时事件流，Hermes 已提供：

```text
WebSocket GET /api/plugins/kanban/events?board=<project_slug>&since=<event_id>
```

- 每 0.3s 增量推送，`cursor` 作为下次 `since`。
- 已含 board 级过滤，无需额外参数。
- 鉴权：dashboard `_SESSION_TOKEN`，WebSocket 通过 query string 传递。

单任务事件（点击跳转时用）：`GET /api/plugins/kanban/tasks/{task_id}` 的响应已含 `events` 字段。

#### 13.5.3 待补充接口（产品层实现）

时间线 REST 列表，Hermes 当前不存在，需产品层提供。推荐两种方式之一：

方式一：产品层直查 board DB（零 Hermes 改动）：

```text
GET /projects/{project_slug}/timeline?limit=50&kinds=created,assigned,completed,...
```

返回结构：

```json
{
  "items": [
    {
      "id": 123,
      "task_id": "T12",
      "task_title": "设备关联分析",
      "kind": "assigned",
      "payload": {"assignee": "equipment-director"},
      "created_at": 1234567890
    }
  ],
  "cursor": 123
}
```

方式二：在 kanban dashboard plugin 新增 `GET /timeline` 路由（只读，不触及 core），复用 `kanban_db.connect(board=...)` 查询。

#### 13.5.4 「项目创建」事件

Hermes 无 board 级事件表。「项目创建」动态由产品层合成：

- 创建项目时产品层写入自身动态表（或复用 `task_comments` 表挂特殊记录）。
- 降级方案：从 board `created_at` 字段推导时间线首条展示。

#### 13.5.5 事件类型完整清单

`task_events.kind` 的完整取值（动态数据来源全集）：

`created` / `assigned` / `commented` / `completed` / `blocked` / `unblocked` / `crashed` / `gave_up` / `protocol_violation` / `timed_out` / `rate_limited` / `decomposed` / `specified` / `promoted` / `reclaimed` / `scheduled` / `spawned` / `linked` / `archived` / `reclaim_deferred` / `spawn_auto_blocked`（历史名，已迁移为 `gave_up`）

MVP 展示前 10 种（见 9.3 节），其余归入「其他任务事件」或暂不展示。

## 14. 状态映射

| Hermes status | 所属看板列 | UI 子状态文案 | 说明 |
|---|---|---|---|
| triage | 不在看板（归入「记录」入口，见 12.1.6） | 待拆解 | 目标式下发的 root task，由协作专家拆解 |
| todo | Todo | 待开始 | 依赖未清或尚未就绪 |
| scheduled | Todo | 已排期 | 等待时间触发或人工激活 |
| ready | Todo | 可执行 | 已可执行，等待调度（短暂中间态） |
| running | Running | 执行中 | worker 正在执行 |
| review | Running | 评审中 | 系统自动评审中（review agent 验证 PR） |
| blocked | Blocked | 需人工介入 | 需要人工处理（dependency 类型实际停在 todo） |
| done | Done | 已完成 | 终态 |
| archived | Done | 已归档 | 软删除终态，灰色/折叠展示 |

## 15. 典型用户流程

### 15.1 创建项目

1. 用户点击「新建项目」。
2. 填写项目名称、描述、图标。
3. 点击下一步。
4. 搜索并选择项目成员。
5. 点击创建项目。
6. 系统创建 Kanban board 并保存项目成员。
7. 进入项目详情页。

### 15.2 发起目标（目标式下发）

1. 用户进入项目详情页。
2. 默认打开看板 Tab。
3. 在页面底部「发起目标」表单填写目标标题、目标描述。
4. 选择优先级（可选）。
5. 点击「发起」。
6. 系统创建 root/triage task，并进入自动拆解和派发流程。
7. 看板出现拆解后的子任务。
8. 记录列表新增一条。
9. 动态 Tab 记录任务创建、拆解和派发事件。

### 15.3 手动创建并指派任务

1. 用户进入项目详情页。
2. 默认打开看板 Tab。
3. 点击 Todo 列列头右上角的 `+` 按钮（见 8.5）。
4. 在弹窗中填写任务标题、任务说明。
5. 选择负责人和任务状态。
6. 点击「创建并派发」。
7. 看板对应状态列出现新任务。
8. 动态 Tab 记录任务创建事件。

### 15.4 按专家查看任务（v1.1）

> v1.1 引入，MVP 不实现。

1. 用户进入看板 Tab。
2. 切换到「按专家」。
3. 系统按项目成员分组展示任务。
4. 用户查看每个专家的任务数量和完成情况。
5. 点击某专家的「给 TA 创建任务」可唤起创建任务弹窗，负责人自动填入。

### 15.5 处理阻塞任务

1. 用户在状态视图看到阻塞任务。
2. 点击任务的「…」菜单，选择「重启任务」。
3. 填写重启说明（可选）。
4. 提交后任务回到 Todo 列（ready 或 todo，根据父依赖自动判断），生成项目动态。
5. 也可点击任务卡片查看详情，在任务详情抽屉中添加评论或更新阻塞说明。

## 16. 原型设计重点

原型需要重点体现：

1. 项目是独立协作空间。
2. 新建项目必须先选择成员。
3. 项目详情页以看板为主。
4. 看板 MVP 仅展示状态视图（4 个状态列：Todo / Running / Blocked / Done），「按专家」二级视图留到 v1.1。`triage` 状态归入「记录」入口，不在看板展示。
5. 沟通区域改为项目动态。
6. 底部常驻「发起目标」表单承载目标式下发（表头带协作专家与记录入口），Todo 列列头 `+` 按钮承载表单式下发（见 8.5）。
7. 目标式下发提交后自动拆解并派发，MVP 不做任务图人工确认。
8. 看板卡片提供按状态分级的操作菜单（编辑、添加评论、指派、完成、阻塞、归档等）。
9. 项目成员通过右侧抽屉查看和管理，Header 上的「项目成员」徽章按钮带成员数。
10. 工作空间是项目绑定工作目录的展示与轻量文件管理入口（新建文件夹 / 上传文件 / 只读浏览）。
11. 任务详情侧边栏展示完整执行上下文：Status Banner、runs/events 时间线、运行日志 tail；Blocked 任务首屏可见阻塞原因（见 12.2.2）。

## 17. 视觉与交互建议

### 17.1 Header

- 左侧显示项目图标、名称、描述。
- 右侧显示「项目成员 4」徽章按钮（成员数为 0 时退化为「添加成员」并加「+」前置图标）和「设置」按钮。
- 可显示总进度：`1/3 已完成`。
- Header 不再承载「下发任务」主按钮。目标式下发通过底部「发起目标」表单完成，表单式下发通过 Todo 列列头的 `+` 按钮完成（见 8.5）。

### 17.2 看板 Tab

- MVP 阶段只展示「按状态」视图，4 个状态列（Todo / Running / Blocked / Done）。每列内部按底层 Hermes status 细分，不同子状态展示不同内容和操作（见 8.3）。`triage` 状态不在看板展示，归入「记录」入口（见 12.1.6）。
- 「按专家」二级视图、看板顶部 `任务状态 | 分配专家` 切换条推迟到 v1.1。
- 看板 Tab 顶部不保留「+ 创建任务」工具栏按钮。Todo 列列头右上角提供 `+` 按钮，点击后唤起创建任务弹窗（见 8.5）。
- 任务卡片信息简洁，避免过载。
- 任务卡片悬停时显示 1-2 个快捷按钮（按状态变化），「…」菜单承载完整操作（见 12.8 节）。
- 任务详情侧边栏采用四层信息结构（当前状况 / 执行详情 / 任务上下文 / 协作），Blocked 任务首屏展示阻塞原因 Banner（见 12.2.2）。

### 17.3 任务详情侧边栏

- 打开侧边栏后，Header 下方始终可见 **Status Banner**（阻塞原因、诊断、最新产出等，按状态变化）。
- **执行详情**区：runs 可展开（含 error / metadata）、单任务 events 时间线、运行日志 tail 内嵌面板（Running/Blocked/Done）。
- **任务上下文**区：说明、依赖（含 ⏳）、工作目录、时间线与失败计数；P1 含父任务摘要、子任务进度、附件列表。
- Done 任务分开展示「执行摘要」与「完成说明」。
- 运行日志以内嵌面板为主入口；操作区不重复堆叠同类按钮。
- review 状态仅展示评审提示 + 评论，无操作按钮。

### 17.4 动态 Tab

- 使用时间线布局。
- 动态类型使用图标或标签区分。
- 支持点击跳转任务（打开任务详情侧边栏）。

### 17.5 工作空间 Tab

- 顶部展示当前项目绑定的工作目录路径。
- 路径区提供「设置」入口（修改目录）、「复制路径」「打开目录」等基础操作。
- 路径下方提供「新建文件夹」「上传文件」两个写入操作，作用于绑定的工作目录；未配置工作目录时按钮置灰。
- 文件夹 / 文件列表只读展示，**不**在产品内做预览、下载、版本管理、权限管理。
- 明确提示 MVP 不区分项目资料和项目产物。

### 17.6 底部发起目标表单 + 创建任务弹窗

**底部发起目标表单：**

- 常驻于项目详情页底部，高度固定（约 180px），不提供展开/收起。
- 表头一行承载「协作专家：<profile> [设置]」+「记录 v」入口；项目级协作专家在该处展示与修改。
- 表头下方显示提示文案：「描述你的项目目标，系统会自动拆解为具体任务并分配给相关专家。」
- 字段精简：目标标题、目标描述、优先级。**附件能力推迟到 v1.1**。
- 主按钮文案：「发起」。
- 不展示指令预览。

**创建任务弹窗：**

- 由 Todo 列列头 `+` 按钮唤起（见 8.5）。MVP 阶段不在看板 Tab 顶部额外提供「+ 创建任务」按钮。
- 字段完整：任务标题、任务说明、负责人、任务状态、父任务、优先级、工作目录，高级设置折叠。
- 主按钮文案：「创建并派发」。
- 从列头 `+` 进入时预填状态（受 `--initial-status` 限制为 `running` 或 `blocked`）；从成员侧边栏进入时预填负责人（任务状态保持默认 `running`）；从「创建后续任务」进入时预填父任务。

### 17.7 项目成员侧边栏

- 从右侧滑出。
- 展示成员任务统计。
- 提供添加成员和给成员创建任务的快捷入口（唤起创建任务弹窗，预填负责人）。

## 18. 后续版本规划

### v1.1

- 看板顶部视图切换条 `任务状态 | 分配专家`；按专家二级视图，分组来源使用项目成员列表，未分配任务归入「未指派」分组。
- 看板顶部恢复「+ 创建任务」工具栏按钮（默认 `Todo` 列）。
- `review`、`scheduled` 状态作为独立列展示（MVP 中 review 归 Running 列、scheduled 归 Todo 列），并提供「已归档」视图开关。
- 底部「发起目标」表单的附件上传能力（落到 `default_workdir` 后 `@file:` 引用）。
- 动态时间线支持评论正文。
- 任务详情侧边栏：events WebSocket 实时追加、metadata 结构化渲染、侧边栏内上传附件。
- 工作空间支持目录可访问性检测、文件预览。
- 支持更多任务筛选（按 assignee、priority、created_at 等）。

### v2

- 任务关系视图。
- 项目级讨论区。
- 多专家自动讨论。
- 从自然语言生成结构化 Kanban 指令。
- board-level 文件管理和资料/产物分区。
- 项目成员权限。
- 项目模板。

## 19. MVP 验收标准

### 项目创建

- 用户可以创建一个项目。
- 项目名称、描述、图标可正确展示。
- 用户可以在创建项目时选择多个专家。

### 项目详情

- 项目详情页默认展示看板 Tab。
- Header 能展示项目信息和项目进度。
- Header 右侧的「项目成员」徽章按钮显示成员数（如 `项目成员 4`），点击可以打开右侧成员侧边栏。

### 看板

- 状态视图按 4 个状态列展示任务：`Todo / Running / Blocked / Done`；每列内部按底层 Hermes status 细分（Todo 含 todo/scheduled/ready，Running 含 running/review，Done 含 done/archived）。`triage` 状态不在看板展示，归入「记录」入口。
- 「按专家」二级视图推迟到 v1.1；MVP 看板顶部不出现视图切换条。
- 未分配任务在 v1.1 引入「按专家」视图时再单独分组，MVP 通过状态列的 assignee 字段区分。
- Todo 列列头右上角存在 `+` 按钮；MVP 不在看板 Tab 顶部额外提供「+ 创建任务」按钮。
- 任务卡片悬停时显示快捷按钮，「…」菜单按状态分级开放操作（见 12.8 节）。

### 任务下发与操作

- 页面底部存在常驻「发起目标」表单，表头一行展示「协作专家：<profile> [设置]」和「记录 v」入口。
- 「协作专家」设置入口可以打开项目级协作专家选择弹窗，修改后立即生效。
- 用户可以填写目标标题、目标描述、优先级并提交。**MVP 不提供附件入口**。
- 提交后系统创建 root/triage task（`--assignee` = 当前协作专家），并进入自动拆解和派发流程。
- 表单表头右侧存在「记录」入口，可查看已发起目标并补充说明。
- Todo 列列头 `+` 按钮可唤起创建任务弹窗（见 8.5）。
- 用户可以通过弹窗创建具体任务，指定标题、说明、负责人、状态等。
- 用户可以通过卡片「…」菜单或任务详情抽屉添加评论。
- 用户可以通过卡片「…」菜单或任务详情抽屉指派/转交任务。
- 用户可以通过卡片「…」菜单或任务详情抽屉完成任务。
- 用户可以通过卡片「…」菜单或任务详情抽屉阻塞任务。
- 用户可以通过卡片「…」菜单重启阻塞任务。
- 用户可以通过卡片「…」菜单归档任务。
- 卡片操作按状态分级开放（见 12.8 节操作矩阵）。

### 任务详情侧边栏

- 点击任务卡片可打开详情侧边栏。
- Blocked 任务首屏展示 Status Banner（阻塞原因 + block_kind 中文标签）。
- 侧边栏展示 runs 可展开列表（含 summary、error）；Running 任务当前 run 高亮。
- 侧边栏展示单任务执行 events 时间线（至少含 created/spawned/completed/blocked/crashed/timed_out/gave_up）。
- Running/Blocked/Done 任务可查看运行日志 tail（内嵌面板或等价能力）。
- Done 任务分开展示「执行摘要」（latest_summary）与「完成说明」（result，若有）。
- 依赖关系展示父/子任务，未完成父任务标注 ⏳。
- P1：有 diagnostics 时展示诊断标题与建议操作；有 attachments 时展示只读附件列表。

### 动态

- 项目动态可以展示任务事件。
- 新增任务、指派任务、完成任务、阻塞任务后，动态中有记录。
- 点击动态可以定位或打开对应任务。

### 工作空间

- 工作空间可以展示当前项目绑定的工作目录。
- 用户可以在新建项目或项目详情页配置工作目录。
- 工作目录配置可以映射到 Kanban board 的 `default_workdir`。
- 工作空间 Tab 提供「新建文件夹」「上传文件」写入入口（作用于绑定的工作目录，未配置时按钮置灰）。
- 工作空间 Tab 提供文件夹 / 文件列表（只读浏览），不提供文件预览、下载、版本管理、权限管理。

## 20. 关键决策总结

1. 项目使用 Kanban board，不新增核心项目任务模型。
2. 项目成员 MVP 由产品层维护，不改 Kanban schema。
3. 不做项目群聊，改为项目动态。
4. 不做自由文本聊天输入，改为结构化任务下发。
5. 任务下发拆为两条独立路径：底部「发起目标」表单（目标式下发）、Todo 列列头 `+` 按钮唤起的「创建任务」弹窗（表单式下发，见 8.5）。MVP 看板 Tab 顶部不提供额外的「+ 创建任务」按钮。
6. MVP 不做任务图人工确认；目标式下发提交后自动进入拆解和派发流程。
7. 看板 MVP 只展示「按状态」视图（4 个状态列：`Todo / Running / Blocked / Done`）；每列内部按底层 Hermes status 细分，不同子状态展示不同内容和操作。「按专家」二级视图推迟到 v1.1。`triage` 状态需区分两个来源：用户发起的目标（带目标标记，不在看板展示，归入「记录」入口，见 12.1.6）；系统 block_recurrence 升级的 triage（在看板 Todo 列展示，标注「需人工拆解」，见 8.3）。`review` 归入 Running 列（显示「评审中」标记），`scheduled` 归入 Todo 列，`archived` 归入 Done 列（灰色/折叠展示）。
8. 工作空间先做工作目录绑定与展示，叠加轻量文件浏览能力（只读列表 + 新建文件夹 + 上传文件），不做预览、下载、文件版本、权限管理。
9. 右侧抽屉只承载任务详情和项目成员；下发任务表单移到页面底部（目标式）和状态列列头按钮（表单式）。
10. 任务卡片操作按状态分级开放，悬停快捷按钮 + 「…」下拉菜单两层呈现（见 12.8 节操作矩阵）。
11. 底部「发起目标」表单提供「记录」入口，可查看已发起目标并补充说明。
12. Hermes 的 `done` 是终态，无 reopen；「重新打开」语义化为「创建后续任务」（`create --parent`）。
13. Hermes 的 `archive` 是软删除；「删除」对应 `archive`，「永久删除」对应 `gc --rm`。
14. 协作专家（`orchestrator_profile`）是项目级 UI 设置项，在底部「发起目标」表单表头以「协作专家：<profile> [设置]」展示与修改；提交「发起」时作为 root task 的 `--assignee`。
15. 附件能力（落到 `default_workdir` 后 `@file:` 引用）推迟到 v1.1。MVP 的目标描述如需引用文件，建议先在工作目录中放置文件并手写相对路径。
16. Header 右侧「项目成员」徽章按钮带成员数显示（如 `项目成员 4`），为 0 时退化为「添加成员」。
17. 任务详情侧边栏采用四层信息结构（当前状况 Banner / 执行详情 / 任务上下文 / 协作），复用 Hermes `show` + dashboard API 的 runs/events/log/diagnostics；不展示 Agent 完整对话 transcript。

## 21. 已知设计问题与待定决策

### Q1：root task 跨状态追踪（矛盾 1）

**问题**：`decompose` 成功后 root task 从 `triage` 变为 `todo`（`kanban_db.py:5163`），成为子任务的 parent 继续存活。若让 root task 在看板展示，会与子任务混淆；若不展示，需确保记录入口能跨状态追踪。

**采用方案**：

- root task 带目标标记，看板默认过滤不展示。
- 记录入口跨状态查询带标记的 root task，展示聚合进度。
- 点击记录卡片时看板进入「目标聚焦」模式，高亮其子任务（通过 `child_ids(root_task_id)` 查询，`kanban_db.py:2895`），非该目标的任务降低不透明度。

**影响的章节**：8.3、12.1.5、12.1.6

### Q2：triage 双来源与目标标记机制（矛盾 2）

**问题**：triage 有两个来源--用户发起的目标（`create --triage`）和系统 block_recurrence 升级（`kanban_db.py:4654-4658`，`BLOCK_RECURRENCE_LIMIT` 默认 2 次）。需区分两类，避免系统踢回的 triage 混入用户的目标记录。

**采用方案**：用标记区分。目标 root task 带标记、不在看板展示、归入记录入口；系统踢回的 triage 在看板 Todo 列展示，标注「需人工拆解」。

**待定**：标记机制尚未确定。`tasks` 表当前无 metadata 列（`kanban_db.py:1096-1139`），`create` 命令无 `--metadata` 参数（`kanban.py:307-369`），`list` 命令不支持 metadata 过滤（`kanban_db.py:2724-2773`，只支持 assignee/status/tenant/session_id/workflow_template_id/current_step_key）。候选方案：

| 方案 | 实现方式 | 优点 | 缺点 |
|---|---|---|---|
| **(A) `idempotency_key` 前缀** [倾向] | 创建时传 `--idempotency-key "goal:<project_slug>:<timestamp>"`，产品层按前缀 `goal:` 过滤 | 零改动，create 已支持 | 语义借用，idempotency_key 本意是去重；list 不支持按它过滤，需产品层直查 DB |
| **(B) `tenant` 字段** | 创建时传 `--tenant "goal:<project_slug>"`，list 支持 `--tenant` 过滤 | list 原生支持过滤 | tenant 语义是租户隔离，借用会干扰多租户场景 |
| **(C) 扩展 tasks 表** | 改 kanban_db.py schema 加 metadata 列 + create 加 `--metadata` + list 加过滤 | 语义最干净 | 触及 core（Footprint Ladder 第 6 级），需上游评估 |

**影响的章节**：8.3、12.1.5、12.1.6

### Q3：「拆解中」状态不存在（矛盾 3）

**问题**：`decompose_triage_task` 是原子操作（验证 + 翻转在同一 `write_txn`，`kanban_db.py:5015` + 5163），不存在「拆解中」中间态。

**采用方案**：记录状态改为基于 root task 当前状态 + 子任务聚合计算，去掉「拆解中」和「已拆解」，改为「待拆解 / 进行中 / 已完成 / 已归档」。

**影响的章节**：12.1.6

### Q4：动态 Tab 的实现依赖与限制（矛盾 4）

**背景**：动态 Tab 的数据底座是 Hermes Kanban 的 `task_events` 表。该表已覆盖 PRD 9.3 节要求的全部动态类型（任务创建/指派/评论/完成/阻塞/解除阻塞/执行失败/执行超时），且 Hermes 已提供实时事件流 WebSocket（`/events?board=<slug>&since=<id>`）和单任务事件 REST 接口。

**采用方案**：

- 实时事件流直接复用 Hermes 已有 WebSocket，零改造。
- 时间线 REST 列表由产品层直查 board DB 提供（`task_events` join `tasks`），不改动 Hermes core。
- 事件 `kind` 到用户文案的翻译映射由产品层维护（见 9.7 节）。
- 「项目创建」动态由产品层合成，因 Hermes 无 board 级事件表（见 13.5.4）。

**已知限制**：

1. `commented` 事件的 payload 只含 `{"author", "len"}`，不含评论正文。MVP 展示「X 评论了任务 Y」即可；评论正文需点击跳转任务详情查看 `task_comments` 表。v1.1 才要求时间线支持评论正文。
2. `task_events` 无 board 级聚合接口--WebSocket `/events` 是全量增量流，时间线 REST 列表需产品层自行 join `tasks` 表补充 `task_title`。
3. Hermes 无 board 级事件表，「项目创建」这类项目级动态无法从 `task_events` 直接获得，必须产品层合成。
4. 事件 `kind` 是面向机器的标识（如 `gave_up`、`protocol_violation`），产品层需维护完整的 kind->文案映射表（见 9.7 节），并在 Hermes 升级新增 kind 时同步更新。

**影响的章节**：9.5、9.6、9.7、13.5
