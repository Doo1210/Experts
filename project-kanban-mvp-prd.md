# 项目协作空间 MVP 产品需求文档

Status: feasible with P0 product-adapter work
Author: product draft
Target: Hermes project collaboration prototype
Feasibility review: 2026-09-08

## 今日修改记录

| 日期 | 修改区域 | 修改内容 |
|---|---|---|
| 2026-09-08 | 创建任务弹窗 | 删除高级设置，以及额外 Skill、Goal Mode、最大运行时长和失败重试字段 |
| 2026-09-08 | 项目详情布局 | 删除页面底部常驻的发起目标区域，释放看板纵向空间 |
| 2026-09-08 | Header | 在「项目成员」按钮左侧新增「发起目标」主按钮 |
| 2026-09-08 | 发起目标弹窗 | 新增标题、描述、拆解模型表单，并在标题栏提供「发起记录」入口 |
| 2026-09-08 | 新建项目 | 删除工作目录字段，创建项目时由系统生成并绑定默认工作目录 |

## 1. 背景与目标

当前希望基于 Hermes 改造出一个面向业务协作的「项目」概念：一个项目包含多个专家（Hermes profiles），项目下承载任务、工作目录和执行动态。已有原型采用三栏布局，包含项目看板、沟通与日志、项目成员/工作空间等区域。

经过与研发讨论，Hermes 现有 `kanban board` 与「项目」概念高度接近：

- 一个 `board` 是一个隔离的任务协作空间。
- 一个 `board` 下有多条任务。
- 任务可以指派给不同 profile，即专家。
- 任务有状态、评论、事件、执行记录和工作区。

因此 MVP 不新增一套完整项目协作模型，而是将「项目」作为 `kanban board` 的业务化展示层，以最小改造复用 Hermes Kanban 能力。

### 1.1 可行性结论

结论：**可行，但不是“只换一层 UI 文案即可上线”**。现有 Hermes 已覆盖约 70% 的底座能力：

- 可直接复用：board、task、依赖、评论、运行记录、事件流、日志、附件、profile 列表、dispatcher。
- 必须补充产品适配层：项目成员、目标记录、限定成员范围的目标拆解、单次拆解模型覆盖、项目动态 REST 聚合。
- 必须新增受限文件服务：工作目录浏览、上传和新建文件夹；Kanban dashboard 目前没有 board 级文件管理 API。

以下约束决定 MVP 的技术边界：

1. 当前 `decompose` 使用**发起该请求的 Hermes 后端进程**所绑定 profile 的
   `config.yaml -> auxiliary.kanban_decomposer`，并读取全部已安装 profiles。root task
   的 `assignee` 不决定拆解模型，也不会自动把候选人限制为项目成员。
2. `kanban.orchestrator_profile`、`default_assignee`、`auto_decompose` 是进程配置，
   不是 board 级配置。MVP 不把这些概念做成项目设置；root owner 和 fallback 由服务
   profile 的现有配置在后台解析。
3. UI 不应执行 `claim <task_id>` 后再执行 `dispatch <task_id>`：`dispatch` 没有
   `task_id` 参数，而且手工 claim 会先把任务置为 running，却不会启动 worker。
4. assigned 且 ready 的任务会被 gateway dispatcher 自动领取；Hermes 当前没有
   “已指派但保证不执行”的 todo 草稿语义。
5. Hermes 的拆解包含一次最长可达分钟级的 LLM 调用；只有最终写入任务图的数据库事务
   是原子的。因此产品层需要“拆解中 / 拆解失败”的请求态，不能把拆解视为瞬时操作。
6. Kanban boards、board DB 和工作目录是后端机器上的共享资源，不随 profile 隔离。
   dashboard session 鉴权也不等于项目成员权限；项目访问控制和路径权限必须由产品层负责。
7. `agent.auxiliary_client.call_llm` 已支持单次调用的 `provider/model` 覆盖，但当前
   `/tasks/{id}/decompose` 未暴露这两个字段。模型下拉需要做一次小型透传扩展，不能
   通过修改进程 `config.yaml` 实现，否则并发项目会相互影响。

据此，MVP 采用“Kanban 领域能力 + 项目适配服务”的架构，不修改 Kanban task 核心 schema。

### 1.2 当前原型成熟度

当前 `D:\CodingWorkSpace\IndustryAgentPlatform\数字员工` 中的项目模块是完整度较高的
交互原型，不是可直接接 Hermes 的前端：

- 项目、成员、任务、动态和工作空间文件都保存在浏览器 `localStorage`。
- `sidecar-api.js` 没有 project / board / kanban API。
- 目标拆解是按标题匹配模板并同步生成 mock tasks，运行日志也为演示数据。
- 原型路由使用 project UUID，生产接口使用 `project_slug === board_slug`。

因此实施工作量主要在产品适配服务、真实状态机接入和 mock store 替换，不应按“已有
后端、只需接口联调”估算。

## 2. 产品定位

### 2.1 产品定义

「项目协作空间」是面向业务问题的多专家协作工作台。用户可以创建一个项目，选择参与项目的专家，并通过结构化看板指令创建、指派和推进任务。

### 2.2 核心原则

1. **项目等价于 Kanban Board**
   - 产品层展示为「项目」。
   - 底层使用 Hermes `kanban board`。
   - `project_slug` 与 `board_slug` 保持一致。
   - 注意 Hermes 另有用于代码仓库上下文的 `projects_db` / `hermes project` 概念；本
     PRD 的“项目”默认指业务协作 board。仅当需要绑定代码仓库时，才使用 board
     `project_id` 关联 Hermes Project，二者不能混为一个实体。

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
   - 目标式下发：用户填写目标标题和描述，可选拆解模型；系统使用 auxiliary
     decomposer 自动生成任务图并派发。
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
- 动态 Tab
  - 项目动态时间线
- 工作空间 Tab
  - 项目绑定工作目录的展示与管理
- 项目成员侧边栏
- 项目适配服务
  - 项目成员
  - 目标记录及拆解请求状态
  - 成员白名单约束
  - 单次拆解模型覆盖
- 下发任务入口
  - Header「发起目标」按钮：位于「项目成员」按钮左侧，点击后打开目标弹窗；弹窗包含目标标题、目标描述和可选模型
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
| 项目成员 | selected profiles | 产品适配层持久化成员列表 |
| 任务 | kanban task | 复用 Kanban tasks |
| 任务负责人 | task assignee | `--assignee <profile>` |
| 任务状态 | task status | 状态视图展示 |
| 项目动态 | task events/comments/runs | 首版主要使用 `task_events` |
| 目标式下发 | 产品目标记录 + triage/root task + decompose adapter | 标题、描述和可选模型；限定项目成员 roster 后自动拆解并派发 |
| 表单式下发 | kanban create | 用户直接创建具体任务 |
| 工作空间 | board `default_workdir` | 项目直接绑定一个工作目录，不区分资料和产物 |

## 5. 信息架构

### 5.1 页面结构

项目详情页采用以下结构：

```text
项目详情页
  Header：项目信息 + 发起目标 + 项目成员徽章按钮（带成员数）+ 设置
  Tabs：看板 / 动态 / 工作空间
  Main：当前 Tab 内容区
  Drawer：任务详情 / 项目成员
  Modal：发起目标弹窗 / 创建任务弹窗
```

推荐默认打开「看板」Tab。

任务下发拆为两条独立路径：

- **Header「发起目标」按钮 →「发起目标」弹窗**：承载目标式下发。按钮固定在「项目成员」左侧；用户只填写标题、描述和可选模型，系统拆解目标并分派给项目成员。
- **Todo 列列头 `+` 按钮 → 「创建任务」弹窗**：承载表单式下发。用户已经知道要做什么、谁来做时，点击 Todo 列列头右上角 `+` 唤起弹窗（见 8.5），直接创建具体 Kanban task。

右侧抽屉仅承载任务详情和项目成员侧边栏，不再承载下发任务表单。

### 5.2 页面示意

```text
┌──────────────────────────────────────────────────────────────┐
│ 项目图标  项目名称 / 项目描述 [发起目标] [项目成员 4] [设置]  │
├──────────────────────────────────────────────────────────────┤
│ [看板] [动态] [工作空间]                                      │
│                                                              │
│              看板区（按状态分栏）                             │
│                                                              │
│        Todo 列列头右上角 + 唤起「创建任务」                  │
└──────────────────────────────────────────────────────────────┘
```

点击 Header「发起目标」后打开弹窗（详细交互见 12.1）：

```text
┌──────────────────────────────────────────────────────────┐
│ 发起目标                              [发起记录]     [✕] │
├──────────────────────────────────────────────────────────┤
│ 💡 描述目标，系统会自动拆解并分配给相关专家。             │
│                                                          │
│ 目标标题 *  [________________________________________]   │
│ 目标描述 *  [________________________________________]   │
│             [________________________________________]   │
│             [________________________________________]   │
│ 拆解模型    [系统默认                              ▾]   │
│             默认使用当前服务配置的拆解模型               │
├──────────────────────────────────────────────────────────┤
│                                      [取消] [发起目标]   │
└──────────────────────────────────────────────────────────┘
```

点击 Todo 列列头右上角 `+` 时，弹出创建任务弹窗（见 8.5）：

```text
┌──────────────────────────────────────────────────────┐
│ 创建任务                                        [✕]  │
├──────────────────────────────────────────────────────┤
│ 任务标题 *  [____________________________]           │
│ 任务说明    [____________________________]           │
│ 负责人 *    [选择项目成员 ▾]                         │
│ 启动方式    [加入执行队列] 优先级 [中 ▾]             │
│ 父任务      [选择已有任务 ▾]（可选）                 │
│ 工作目录    [继承项目工作目录 ▾]                     │
│                                                      │
│                       [取消]  [创建并加入执行队列]   │
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

字段要求：

| 字段 | 必填 | 说明 |
|---|---|---|
| 项目名称 | 是 | 展示名称，例如：12寸产线良率提升项目 |
| 项目描述 | 是 | 简要描述项目目标和背景 |
| 项目图标 | 否 | MVP 使用预设 emoji/短文本；上传图片需由产品媒体存储托管，不能把 data URL 直接塞入 `board.json` |

系统行为：

- 根据项目名称生成 `project_slug`。
- 新建项目页面不展示工作目录字段。
- board 创建后，后端创建
  `kanban_db.board_dir(project_slug) / "project-workspace"`，并将其绝对路径写入
  board `default_workdir`；前端不参与路径生成。
- Step 1 不立即创建 board，避免用户取消时产生半成品项目。

### 6.3 Step 2：项目成员

用户从专家列表中多选项目成员。

MVP 至少选择 1 位成员，作为目标拆解时允许分派的候选 roster。产品不再要求用户设置
协作专家或项目经理；root task 的技术 assignee 和未知任务的 fallback 由服务 profile
的 Hermes 配置在后台解析，不作为项目概念展示。

专家卡片展示：

- 专家名称
- 专家简介
- 是否已选择

支持能力：

- 搜索专家名称
- 搜索专家介绍
- 显示已选人数
- 多选专家

Hermes 当前 `GET /api/plugins/kanban/profiles` 返回 canonical `name`、`description`、
`skill_count`、model/provider 等字段，不返回独立的 `tags` 或 `display_name`。MVP
以 name + description 展示和搜索；若后续需要“擅长领域标签”，应由专家目录产品模型
明确提供，不能假定它是 profile 原生字段。

### 6.4 创建项目提交行为

点击「创建项目」后执行：

1. 创建 Kanban board。
2. 创建系统默认工作目录，并更新 board `default_workdir`。
3. 在产品适配层保存成员。
4. 全部成功后进入项目详情页；任一步失败时保留可重试的幂等创建记录，或归档刚创建
   的空 board，不能留下“有 board、无工作目录/项目配置”的半成品。

`project_slug` 必须先查重并生成唯一值。`POST /boards` 对同名 slug 是幂等返回已有
board，而不是冲突报错；产品层不能因此把新项目误绑定到旧 board。

对应 Kanban 指令示例：

```bash
hermes kanban boards create yield-improvement-12inch \
  --name "12寸产线良率提升项目" \
  --description "针对近期良率波动，组织工艺、质量、设备专家联合攻关" \
  --icon "factory"
```

创建 board 后由产品后端调用 `kanban_db.board_dir(project_slug)` 解析路径，创建
`project-workspace` 子目录，再通过 board PATCH 接口写入其绝对路径。禁止由浏览器
拼接 `~/.hermes` 或本机路径。

产品请求始终显式携带 `board=<project_slug>`，不依赖或修改进程级 current-board
指针；多用户服务中使用 `--switch` 会让并发请求互相影响。

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

### 6.5 删除项目

- 默认“删除项目”调用 board archive，并把产品层项目配置标记为 archived，可恢复。
- 永久删除必须是独立危险操作、二次确认，并先校验无 running worker。
- 产品层清理顺序与 board 删除结果需可重试；不能先删成员/目标映射后因 board 删除失败
  留下不可管理的任务。
- `default` board 不能作为普通业务项目删除，产品项目必须使用命名 board。

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

进度口径：分母为非归档、非目标 root 的执行任务；分子仅统计其中 `done`。目标 root
由“发起记录”单独展示，`archived` 不等于完成，二者都不能抬高项目完成率。当前原型
把目标 root/archived 混入统计，联调时需修正。

「项目成员」徽章数字取自当前项目成员列表长度；点击后打开右侧成员侧边栏（见第 11 节）。成员为 0 时按钮文案退化为「添加成员」。

设置按钮用于修改项目名称、描述和图标等信息；工作空间路径不提供用户配置入口。

目标式下发通过 Header 右侧「发起目标」按钮唤起弹窗完成（按钮位于「项目成员」左侧，
见第 12 节）；表单式下发通过 Todo 列列头右上角 `+` 按钮唤起弹窗完成（见第 8.5 节）。

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

1. **用户发起的目标**：其 root task id 已登记在产品层 `project_goals`，不在看板展示，归入「发起记录」管理。
2. **系统阻塞循环升级**：任务反复 block/unblock 达到 `BLOCK_RECURRENCE_LIMIT`
   后，由 `block_loop_detected` 事件进入 `triage`。这类任务**保留在看板 Todo
   列**，卡片标注「需人工拆解」，操作为 `specify` 或 `decompose`。

不得借用 `tenant` 或 `idempotency_key` 充当类型字段：前者用于租户隔离，后者用于
请求去重。目标身份以产品层映射为权威，Kanban 的 `decomposed` 事件作为审计依据。

推荐展示列：

| UI 状态列 | 包含的 Hermes status | 子状态展示区分 | 说明 |
|---|---|---|---|
| Todo | triage（系统踢回）、todo、scheduled、ready | 不同底层状态操作不同；有未完成父依赖的任务标注「等待父任务」；系统踢回的 triage 标注「需人工拆解」 | 尚未开始执行的任务 |
| Running | running、review | review 状态显示「评审中」标记，表示系统正在自动评审 | 正在执行或评审中的任务 |
| Blocked | blocked | 显示「需人工介入」 | 需要人工处理的任务 |
| Done | done、archived | archived 用灰色/折叠区分 | 已完成或已归档的任务 |

子状态说明：

- **Todo 列**：
  - `triage`（系统踢回）：因反复 block/unblock 达到 `BLOCK_RECURRENCE_LIMIT` 被系统升级到 triage 的任务。卡片标注「需人工拆解」。悬停主操作为「拆解」（对应 `decompose`）或「补充说明」（对应 `specify`，triage -> todo）。项目目标 root 由产品层 `project_goals` 映射过滤，不在此展示。
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
│                       [取消]  [创建并加入执行队列]    │
└──────────────────────────────────────────────────────┘
```

| 字段 | 必填 | Hermes 映射 | 说明 |
|---|---|---|---|
| 任务标题 | 是 | `create <title>` | 新任务标题 |
| 任务说明 | 否 | `--body` | 任务背景、要求和验收标准 |
| 负责人 | 是 | `--assignee` | 限制为项目成员 |
| 父任务 | 否 | `--parent`（可重复） | 选择已有任务作为依赖；创建后续任务时预填 |
| 优先级 | 否 | `--priority` | 高/中/低 -> 3/2/1，默认中 |
| 工作目录 | 否 | `workspace_kind` / `workspace_path` | 默认使用 board 返回的 `default_workspace_kind`；Git 目录优先为每个任务创建独立 worktree |

**状态说明**：任务根据父依赖状态创建为 `ready`（无未完成依赖）或 `todo`
（有未完成依赖）。assigned + ready 的任务会被 gateway dispatcher 自动执行，因此
不能把 ready 当作“已保存但不会执行”的草稿。用户主动声明需要人工输入或权限时，
应走单独的阻塞操作，不能用 blocked 模拟普通草稿。

#### 8.5.4 提交行为

MVP 只提供一个主提交按钮。Web 产品优先调用 Kanban dashboard API，不通过 shell
拼接 CLI：

```text
POST /api/plugins/kanban/tasks?board=<project_slug>
POST /api/plugins/kanban/dispatch?board=<project_slug>&max=8
```

- 第一个请求创建 task；无未完成依赖时状态为 ready，有依赖时为 todo。
- 第二个请求只催促一次 board dispatcher，避免等待下一次 tick；它不承诺只启动刚创建的任务。
- UI 先显示 Todo/可执行，收到 `claimed` / `spawned` 事件后再移动到 Running，不能提前伪造 running。
- 禁止由 UI 手工调用 `claim`。`claim` 是 dispatcher 协调原语，单独调用会产生没有 worker 的 running task。

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

动态 Tab 的任务级数据底座是 Hermes Kanban 的 append-only `task_events` 表。Hermes 已具备的能力：

| 能力 | Hermes 现状 | 动态 Tab 用途 |
|---|---|---|
| 事件持久化 | `task_events` 表（append-only，WAL 模式） | 动态数据的唯一权威来源 |
| 实时事件流 | WebSocket `GET /api/plugins/kanban/events?board=<slug>&since=<event_id>` | 新事件实时追加到时间线顶部 |
| 单任务事件列表 | `GET /api/plugins/kanban/tasks/{task_id}` 返回含 `events` 字段 | 点击动态跳转任务详情时的补充信息 |
| 任务评论 | `task_comments` 表 + `comment` 命令 | 「任务评论」动态类型 |
| 执行记录 | `task_runs` 表 + `runs` 命令 | 「执行失败 / 超时」动态类型 |
| 任务详情 | `GET /api/plugins/kanban/tasks/{task_id}` + `/log` | 详情侧边栏 runs/events/诊断/日志（见 12.2.2） |
| CLI 实时流 | `hermes kanban watch --kinds ...` | 调试与命令行查看（非产品功能） |

结论：实时任务事件链路可直接复用；历史时间线 REST 列表和项目级事件仍需产品适配层补齐，无需修改 Kanban task schema。

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

PRD 13.5 节建议的 `GET /projects/{project_slug}/timeline?limit=50` 目前 Hermes 不存在——`/events` 是 WebSocket 流，不是 REST 列表。MVP 在产品/Kanban plugin 适配层新增只读路由：

```sql
SELECT e.id, e.task_id, t.title AS task_title,
       e.kind, e.payload, e.created_at
FROM task_events e
LEFT JOIN tasks t ON e.task_id = t.id
ORDER BY e.created_at DESC, e.id DESC
LIMIT ?;
```

每个 board 是独立 DB 文件，查询天然是 board 级。前端不得直接访问 SQLite；SQL、
board slug 校验、游标分页和事件 payload 解析封装在后端路由中，避免把数据库路径和
schema 耦合泄漏到浏览器。

#### 9.6.3 事件语义化翻译（产品层做）

`task_events.kind` 是面向机器的标识（如 `gave_up`、`protocol_violation`）。产品层维护一张映射表，翻译为用户友好文案。完整映射见 9.7 节。

#### 9.6.4 「项目创建」动态（产品层合成）

Hermes 没有 board 级事件表，`task_events` 只记录 task 级事件。「项目创建，成员 N 人」这类动态需产品层合成：

- 推荐：创建项目时由产品适配层在项目事件表写入「项目创建」事件。
- 降级：从 board 的 `created_at` 字段推导时间线首条「项目创建于 {时间}」展示，不依赖事件表。

不得把项目级事件伪装成特殊 task comment；评论必须始终关联真实 task。

### 9.7 动态事件 kind 与文案映射表

下表是 `task_events.kind` 到 PRD 9.3 节动态类型的完整映射。`payload` JSON 中已携带所需字段，`task_title` 通过 join `tasks` 表补充。

| Hermes 事件 kind | PRD 动态类型 | payload 关键字段 | 展示文案模板 |
|---|---|---|---|
| `created` | 任务创建 | `assignee`, `status`, `parents` | 创建任务「{task_title}」 |
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
| `decomposed` | 拆解（扩展） | `child_ids`, `root_assignee` | 「{task_title}」已拆解为 {len(child_ids)} 个子任务 |
| `specified` | 补充说明（扩展） | - | 「{task_title}」补充了说明 |
| `promoted` / `reclaimed` / `scheduled` / `spawned` / `linked` / `archived` | 其他任务事件 | 各异 | 归入「其他」或暂不展示 |

说明：

- MVP 首版仅展示前 10 行（对应 PRD 9.3 节列出的动态类型），`decomposed`/`specified` 作为「其他任务事件」或暂不展示。
- `commented` 事件的 payload 只含 `{"author", "len"}`，不含评论正文。MVP 展示「X 评论了任务 Y」即可；评论正文需点击跳转任务详情查看 `task_comments` 表。PRD v1.1 才要求「动态时间线支持评论正文」。
- `completed` payload 不含 assignee；模板中的 `{assignee}` 与 `task_title` 一样从
  `tasks` join 获取，不能直接从事件 payload 读取。
- 异常类（`crashed`/`gave_up`/`protocol_violation`）在 UI 上可统一归为「执行失败」，`rate_limited`/`timed_out` 归为「执行异常」，细节通过 payload 展示。

## 10. 工作空间 Tab

### 10.1 定位

工作空间用于展示和管理当前项目绑定的工作目录。MVP 不再区分「项目资料」和「项目产物」，也不单独建设文件库。

Kanban 现有 API 只提供**任务附件**，不提供 board 默认目录的列目录、上传或新建文件夹
接口。因此该 Tab 依赖一个 P0 的产品文件适配服务，不属于纯前端复用。

### 10.2 MVP 内容

工作空间 Tab 展示一个项目级工作目录，叠加**轻量文件管理**能力。

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

### 10.3 新建项目时的系统默认工作目录

新建项目页面不提供工作目录字段。系统在 board 创建后自动完成以下操作：

1. 使用 `kanban_db.board_dir(project_slug) / "project-workspace"` 生成托管目录。
2. 在 Hermes backend 所在机器上创建该目录。
3. 将解析后的绝对路径写入 board `default_workdir`。
4. 返回项目详情时展示该路径。

该目录与 board 一同由产品管理；创建流程必须幂等，重试时复用同一路径，不创建带随机
后缀的重复目录。用户不能填写、清空或修改该路径。

### 10.4 工作空间路径展示

项目创建后，工作空间 Tab 只读展示系统分配的路径和“系统默认”标记，提供复制路径；
不提供输入框、保存、清空或更换目录入口。远程部署时，该路径表示 Hermes backend
上的目录，前端不得将其解释为用户本机路径。

### 10.5 实现策略

MVP 不做完整的文件管理能力。

策略：

- 一个项目只绑定一个工作目录。
- 工作目录由系统自动初始化，用户不可配置。
- 不区分项目资料和项目产物。
- 提供的写入能力：**新建文件夹**、**上传文件**——两者都作用于绑定的工作目录。
- 提供的读取能力：**目录列表（文件夹 / 文件）**、**打开目录**（调系统资源管理器）、**复制路径**。
- **不**做：文件版本管理、文件权限与共享、文件下载（用户在系统资源管理器中自行管理）、文件预览 / 编辑（在外部工具中完成）、多目录挂载。
- 「新建文件夹 / 上传文件」操作始终作用于系统默认工作空间；空目录时仍可使用。仅当目录初始化失败、不可访问或权限不足时禁用并显示错误原因。
- 产品文件服务必须把所有路径 `resolve()` 后校验仍位于 `default_workdir` 内，拒绝
  `..`、绝对子路径越界和 symlink 逃逸；同时限制单文件大小、文件名和覆盖行为。
- “打开目录”仅适用于前端与 Hermes backend 同机的桌面部署。远程 backend 场景只能
  展示/复制 backend 路径，不能假装打开用户本机资源管理器。
- 任务不应无条件共享同一写目录。产品读取 board 的 `default_workspace_kind`：Git
  仓库使用独立 worktree；普通目录才使用 `dir`，并提示并发写冲突风险。
- 如果需要更复杂的文件能力（预览、共享、外部同步），留到 v1.1 / v2。

**原型校正**：当前原型的工作空间列表包含“下载、删除”，而本 MVP 明确不包含这两项。
联调前应从原型移除，或单独提升为有后端鉴权、审计和二次确认的需求。

## 11. 项目成员侧边栏

### 11.1 打开方式

点击 Header 右上角「项目成员」徽章按钮（带成员数，如 `项目成员 4`），右侧滑出成员侧边栏。Header 同时提供「+ 添加成员」入口（成员为 0 时该入口更突出）。

### 11.2 展示内容

每个成员展示：

- 专家名称
- 专家简介
- 当前任务数
- 完成任务数
- 操作按钮

示例：

```text
首席工艺专家
简介：负责良率提升、工艺窗口优化与 DOE 分析
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
- 提交后任务进入 ready/todo 执行队列；只有 dispatcher claim 成功后才进入 running。
- 其他字段（任务标题、说明、优先级等）由用户补充。

成员限制必须在产品 API 后端再次校验，不能只依赖下拉框。Kanban 原生 assignee
可引用任何已安装 profile，项目成员在 MVP 中是产品边界，不是 Kanban 权限边界。

## 12. 任务下发与操作

任务下发拆为两条独立路径，由不同的 UI 入口承载：

- **Header「发起目标」按钮 →「发起目标」弹窗**：按钮位于「项目成员」左侧，承载目标式下发，是 MVP 唯一的目标式下发入口。
- **Todo 列列头 `+` 按钮 →「创建任务」弹窗**：承载表单式下发。详见第 8.5 节。

任务推进过程中的评论、指派、完成、阻塞等操作，由看板卡片的悬停快捷按钮和「…」下拉菜单承载，按任务状态分级开放（见 12.8 节）。

### 12.1 Header「发起目标」按钮与弹窗

#### 12.1.1 定位

Header 右侧「发起目标」按钮是目标式下发的唯一入口，固定放在「项目成员」按钮
左侧。点击后打开居中的「发起目标」弹窗。用户提出项目级或阶段级目标，
系统使用 auxiliary decomposer 生成任务图并分派给项目成员。Hermes 仍会为内部
root task 解析一个技术 assignee，但产品不展示或要求用户配置该角色。

弹窗建议宽度 640px，内容区不超过视口高度；目标描述区域可纵向扩展。关闭弹窗时，
若已有未提交内容，需二次确认。

#### 12.1.2 表单结构

```text
┌──────────────────────────────────────────────────────────┐
│ 发起目标                              [发起记录]     [✕] │
├──────────────────────────────────────────────────────────┤
│ 💡 描述目标，系统会自动拆解并分配给相关专家。             │
│                                                          │
│ 目标标题 *  [________________________________________]   │
│ 目标描述 *  [________________________________________]   │
│             [________________________________________]   │
│             [________________________________________]   │
│ 拆解模型    [系统默认                              ▾]   │
│             默认使用当前服务配置的拆解模型               │
├──────────────────────────────────────────────────────────┤
│                                      [取消] [发起目标]   │
└──────────────────────────────────────────────────────────┘
```

「发起记录」入口位于弹窗标题栏右侧。点击后关闭弹窗并打开记录侧栏，避免叠加两个
Modal/Drawer 蒙层（见 12.1.6）。

#### 12.1.3 提示文案

弹窗内容顶部固定显示一行提示，向 B 端用户说明流程，不暴露 Hermes 术语：

```text
💡 描述你的项目目标，系统会自动拆解为具体任务并分配给相关专家。
```

要点：

- 不出现「协调专家 / Orchestrator / Decomposer / Kanban」等术语。
- 用「自动拆解 + 分配」说明系统行为。
- 让用户对结果有预期：提交后会生成子任务并自动派发。
#### 12.1.4 字段

| 字段 | 必填 | Hermes 映射 | 说明 |
|---|---|---|---|
| 目标标题 | 是 | `create <title>` 位置参数 | 一句话概括目标 |
| 目标描述 | 是 | `--body` | 多行富文本；v1.1 起支持 `@file:` 引用工作目录文件 |
| 拆解模型 | 否 | `call_llm(provider=..., model=...)` | 默认跟随当前服务 profile 的 `auxiliary.kanban_decomposer`；选项来自 `/model-options` |

所属项目不显示为字段——这是项目详情页，默认绑定当前 `project_slug`。

交互规则：

- 标题为空或描述为空时，不允许提交，并在对应字段下方显示校验提示。
- 拆解模型默认选择「系统默认」；模型列表加载失败时仍保留该选项，不阻塞发起目标。
- 提交期间「发起目标」按钮显示 loading 并禁用取消/重复提交。
- 提交失败时弹窗保持打开并保留输入，在表单顶部显示可重试错误。
- 提交成功后关闭弹窗、清空草稿，并提示“目标已提交，可在发起记录中查看进度”。

附件上传能力（落到 `default_workdir` 后 `@file:` 引用）推迟到 v1.1。MVP 阶段如需在目标描述中引用文件，建议用户在系统资源管理器中把文件先放到工作目录，目标描述里手写相对路径。

#### 12.1.5 提交行为

点击「发起目标」按钮后：

1. 产品层先创建 `project_goals` 记录，保存 board、发起人、所选 provider/model 和
   **成员 roster 快照**，状态为 `submitted`。
2. 创建 `triage` root task，并将返回的 `root_task_id` 写入目标记录。使用独立请求
   id 做幂等控制，但不靠 `idempotency_key` 判断“它是不是目标”。
3. 产品目标适配器将目标置为 `decomposing`，调用复用现有 decomposer 的受限入口：
   `allowed_profiles` 只包含 roster 快照；如用户选择模型，则把经过服务端白名单校验的
   provider/model 作为本次 `call_llm` 覆盖参数。未选择时沿用服务 profile 配置。
4. LLM 返回后，Hermes 原子写入子任务图并把 root 从 triage 置为 todo。**依赖方向是
   每个生成任务 -> root**，即 root 等待全部生成任务完成；root 不是这些任务的上游父任务。
5. 适配器把返回的 `child_ids` 持久化到目标记录，状态改为 `running`；前端刷新看板。
6. 任一步失败都保留 root 和错误信息，目标状态为 `decompose_failed`，允许重试，不静默吞错。

现有通用接口：

```text
POST /api/plugins/kanban/tasks?board=<project_slug>       # triage=true
POST /api/plugins/kanban/tasks/<root_task_id>/decompose  # 通用版，不满足成员白名单
```

MVP 不能直接使用第二个通用接口完成项目目标：它读取全部 profiles，且请求体不接受
provider/model 覆盖。需新增项目适配入口（例如
`POST /projects/{slug}/goals`），在服务端复用 decomposer 与
`decompose_triage_task`，同时注入项目 roster 和可选模型覆盖。root task 的内部
assignee 与 fallback 继续沿用服务 profile 的现有 Hermes 配置。
MVP 部署使用的 service profile 必须配置 `kanban.auto_decompose: false`，所有项目目标
由产品适配器自动拆解；普通 triage task 由看板手动触发。否则 gateway 可能在产品
适配器之前用“全部 profiles + 全局 routing”抢先拆解，成员白名单无法保证。后续若
Hermes 增加 per-task/per-board auto-decompose policy，再取消这一部署约束。

MVP 不提供任务图人工确认环节。用户如需调整拆解结果，在看板中通过卡片操作菜单编辑、改派、评论、阻塞或追加任务。

#### 12.1.6 记录

目标弹窗标题栏右侧提供「发起记录」入口，点击后打开侧拉面板，列出当前用户在本项目发起过的目标。产品层 `project_goals` 中登记的 root task 在此集中管理，看板默认过滤这些 task id。

每条记录展示：

| 字段 | 来源 | 说明 |
|---|---|---|
| 目标标题 | root task title | |
| 发起时间 | `created_at` | |
| 状态 | 目标请求态 + root task status + 子任务进度 | 待拆解 / 拆解中 / 拆解失败 / 进行中 / 已完成 / 已归档 |
| 子任务数 | 统计 child tasks | 例如「5 个子任务，2 已完成」 |

状态计算规则（产品层聚合，非 Hermes 原生状态）：

- **待拆解**：目标已提交，尚未开始 decomposer 请求。
- **拆解中**：auxiliary LLM 请求正在执行，root 仍为 triage。
- **拆解失败**：请求超时、模型输出无效或数据库拒绝任务图；展示错误和重试入口。
- **进行中**：root task 已离开 triage（decompose 成功变 todo，或后续推进中），且子任务未全部 done。展示「N/M 子任务完成」。
- **已完成**：root task 为 `done`。子任务全部完成只表示 root 已具备执行汇总的条件，不应提前宣告整个目标完成。
- **已归档**：root task 为 `archived`。

> 数据库任务图写入是原子的，但前置 LLM 调用不是。`decomposing` 是产品请求态，
> 不是新增 Kanban status。

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

- 属于该目标的生成任务按 `project_goals.child_ids` 高亮。该列表来自成功 decompose
  响应/`decomposed` 事件的 `payload.child_ids`；不能使用 `child_ids(root_task_id)`，
  因为 Hermes 中这些生成任务是 root 的上游 parents。
- 不属于该目标的任务降低不透明度（如 40%）。
- 顶部浮条：「正在查看目标：xxx · N/M 子任务完成 · [退出聚焦]」。
- 点击「退出聚焦」或按 Esc 恢复正常看板视图。

**补充说明**：用户对已发起的目标追加说明，对应 root task comment。该评论会进入
root 后续汇总 worker 的上下文，但当前 decomposer 只读取 root 的 title/body，不读取
comments。若目标仍处于待拆解/拆解失败，产品层需先把补充内容合并进本次
decomposer 输入，才能影响重新拆解。

指令映射：

```bash
# 列表：查询产品层 project_goals，再批量读取对应 root/child tasks

# 查看某个目标的拆解结果
hermes kanban --board <project_slug> show <root_task_id>

# 补充说明
hermes kanban --board <project_slug> comment <root_task_id> "<补充说明>"

# 重试拆解：调用项目目标适配接口，不直接调用通用 decompose

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
| Todo | todo（无未完成父依赖） | **加入执行队列** | PATCH ready 后催促 board dispatcher（见 12.2.5） |
| Todo | todo（有未完成父依赖） | **开始执行**（置灰） | tooltip 显示「等待父任务: T3, T5」 |
| Todo | scheduled | **激活** | 对应 unblock，回到 ready/todo |
| Todo | ready | **催促执行** | 调用 board 级 dispatch nudge，等待 claimed/spawned 事件 |
| Running | running | **完成** | 打开完成弹窗（见 12.2.4） |
| Running | review | **查看进度** | 打开详情侧边栏，无操作按钮 |
| Blocked | blocked | **重启** | 对应 unblock（需校验项目访问权限） |
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

数据来源：`GET /tasks/{task_id}/log?tail=65536` 或 `hermes kanban log <task_id>`。
当前活动日志在 2 MiB 时轮转，并保留一个 `.log.1`，因此单任务磁盘占用约 4 MiB。

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
| **父任务产出** | 已完成父任务旁「查看摘要」展开 | 先读 `links.parents`，再批量获取父任务 `latest_summary`；现有单任务响应不直接返回 parent results | P1 |
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
- **绕过领域接口直接改 DB** — title/body/priority 统一调用 dashboard
  `PATCH /tasks/{id}`；CLI `edit` 仅用于 done 任务补录 result/summary/metadata。
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

合并状态后，Todo 列内的 todo/ready/scheduled 都是“未开始执行”的子状态。产品层
只负责把任务恢复到可领取状态并催促 dispatcher，**不直接 claim，也不直接写
running**：

```text
用户点击「开始执行」
  │
  ├─ 底层是 todo：
  │   ├─ 有未完成父依赖？ -> 按钮置灰，tooltip 显示「等待父任务: T3, T5」
  │   └─ 无未完成父依赖？ -> PATCH status=ready -> POST /dispatch
  │
  ├─ 底层是 ready：
  │   └─ POST /dispatch
  │
  └─ 底层是 scheduled：
      └─ PATCH status=ready（内部走 unblock 并重新检查依赖）-> POST /dispatch
```

`POST /dispatch` 是 board 级调度催促，可能先领取同 board 中优先级更高的其他任务。
任务只有在事件流确认 `claimed` / `spawned` 后才进入 Running。若产品必须保证“点击后
精确启动这一条”，则需新增专用的服务端 claim-and-spawn API；当前 Hermes 没有该接口。

**失败处理：**

- PATCH ready 返回 409 且包含阻塞 parent 时，提示“父任务尚未完成”并刷新任务。
- dispatch 后任务仍为 ready 时，展示“已加入执行队列”，不能假报“已开始执行”。

**API 映射：**

```text
PATCH /api/plugins/kanban/tasks/<task_id>?board=<project_slug>  {"status":"ready"}
POST  /api/plugins/kanban/dispatch?board=<project_slug>&max=8
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

解除阻塞后任务回到 Todo 列：无未完成父依赖时进入 `ready`，有未完成父依赖时进入
`todo`。`kanban_*` agent tool 对该操作有 orchestrator gate，但 dashboard REST/CLI
没有项目角色鉴权；MVP 不引入项目经理角色，产品 API 只校验调用者有当前项目的操作
权限，不能依赖 tool gate。

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
# todo → ready（仅父依赖已满足）
hermes kanban --board <project_slug> promote <task_id>

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
| **Todo** | todo | [开始执行] | 查看详情、添加评论、分配负责人、标记阻塞、归档 | `PATCH status=ready` + `POST /dispatch`（见 12.2.5）/ `comment` / `assign` / `link` / `archive` |
| **Todo** | scheduled | [激活] | 查看详情、添加评论、激活任务（取消排期）、归档 | `show` / `comment` / `unblock` / `archive` |
| **Todo** | ready | [开始执行] | 查看详情、添加评论、移动状态、转交专家、标记阻塞、排期、归档 | `POST /dispatch`（见 12.2.5）/ `comment` / `reassign` / `block` / `schedule` / `archive` |
| **Running** | running | [完成] | 查看详情、添加评论、完成任务、标记阻塞、转交专家、查看运行日志、查看运行记录、打断 | `show` / `comment` / `complete` / `block` / `reassign --reclaim` / `log` / `runs` / `tail` / `reclaim` |
| **Running** | review | [查看] | 查看详情、添加评论、查看运行记录 | `show` / `comment` / `runs`（评审由系统自动完成，用户无需也无法手动操作） |
| **Blocked** | blocked | [重启] | 查看详情、添加评论、重启任务（解除阻塞）、关闭任务（归档）、转交专家、更新阻塞说明 | `show` / `comment` / `unblock`(注2) / `archive` / `reassign` / `block` |
| **Done** | done | [查看] | 查看详情、补录结果、创建后续任务、查看运行记录、归档 | `show` / `edit --result` / `create --parent` / `runs` / `archive` |
| **Done** | archived | [查看] | 查看详情、永久删除 | `GET /tasks/{id}` / `DELETE /tasks/{id}`；CLI 等价 `archive --rm <id>` |

注1：CLI `edit` 只支持 done 任务的恢复字段；dashboard
`PATCH /tasks/{id}` 已支持 title/body/priority，UI 编辑应调用 REST API，禁止产品层直接改 DB。

注2：产品访问权限由项目适配层校验；agent tool 的 orchestrator gate 不能替代 REST 鉴权。

注3：产品目标记录中的 triage root 不在看板展示；阻塞循环升级得到的其他 triage
任务仍在 Todo 列显示，可执行 decompose/specify/assign/comment/archive。

#### 12.8.2 「重新打开」的语义

Hermes 的 `done` 是终态，**没有 reopen 指令**。如果用户需要对已完成任务追加工作：

- **创建后续任务**：通过 `create --parent <旧task_id>` 创建新任务，自动建立父子依赖。这是 MVP 推荐路径。
- 「重新打开」按钮在 UI 上等价于「创建后续任务」，预填父任务后弹出创建任务弹窗。

#### 12.8.3 「删除」的语义

Hermes 的 `archive` 是软删除（任务保留在 DB，默认从看板隐藏）。已归档任务可通过
dashboard `DELETE /tasks/{id}` 或 CLI `archive --rm <id>` 永久删除。

- 卡片菜单上的「删除」对应 `archive`，任务在 Done 列内变为已归档子状态（灰色/折叠展示）。
- 「永久删除」只在已归档状态下出现，对应上述 delete/purge 接口，不可恢复。

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

MVP 由产品适配层的独立 SQLite/服务表维护。

字段：

- project_slug
- profile_name
- role（member）
- added_at

说明：

- Hermes Kanban 当前没有强 board members 模型。
- 任务执行仍然依赖 `task.assignee`。
- `name`、`description`、`skill_count` 从 profile API 实时读取，不在成员关系里复制，
  避免资料漂移。`tags`、`display_name` 不是当前 Kanban profile API 字段。
- UI 和产品 API 都限制负责人只能从项目成员中选择；这是产品约束，不是 Kanban 原生 ACL。
- 移除仍有 active task 的成员时，必须先选择任务转交对象，或明确允许历史任务继续显示该 profile。

### 13.2.1 目标记录

产品层新增 `project_goals`：

- id
- project_slug
- root_task_id
- created_by / created_at
- status（submitted / decomposing / decompose_failed / running / completed / archived）
- member_roster_snapshot
- decomposer_provider_snapshot
- decomposer_model_snapshot
- child_ids
- error
- request_id（幂等键）

该表解决目标身份、异步状态、成员快照和跨状态查询；不扩展/滥用 Kanban tasks 表。

### 13.3 目标拆解模型

MVP 不设置项目级协作专家、项目经理或编排配置。目标表单仅允许对**本次拆解调用**
选择模型：

- 默认项：`系统默认`，使用服务 profile 的
  `config.yaml -> auxiliary.kanban_decomposer`。
- 可选项：读取 `GET /api/plugins/kanban/model-options`，按 provider 分组展示 model。
- 提交值：`decomposer_provider`、`decomposer_model`，随目标记录保存，重试默认复用
  原选择。
- 服务端只接受 `/model-options` 返回且当前服务可用的组合；前端不能提交
  `base_url`、`api_key` 或任意模型字符串。

现有 `call_llm` 已支持单次 `provider/model` 参数，实施只需让项目目标适配器及内部
decompose 调用透传它们。不得为了切换模型修改 `config.yaml`，避免并发请求互相污染。
模型选择只影响拆解 LLM，不改变后续子任务 worker 的模型。

### 13.3.1 拆解适配接口

新增产品接口（路径可按服务约定调整）：

```text
POST /projects/{project_slug}/goals                       # 202 + goal_id
POST /projects/{project_slug}/goals/{goal_id}/retry
GET  /projects/{project_slug}/goals
GET  /projects/{project_slug}/goals/{goal_id}
```

服务端职责：

1. 校验项目至少有一个成员，并冻结 member roster。
2. 校验可选 provider/model 来自服务端模型目录。
3. 先持久化目标并返回 202，由后台作业执行 LLM 请求，避免占用最长 180 秒的 HTTP 连接。
4. 创建并登记 triage root，提供请求幂等。
5. 用项目 roster 构造 decomposer prompt，只接受 roster 内 assignee。
6. 未知/空 assignee 使用服务 profile 已解析的 `default_assignee`。
7. 向辅助 LLM 透传本次 provider/model；未选择时传空值并沿用默认配置。
8. 返回并持久化 `child_ids`，暴露异步状态和错误。
9. 复用 dashboard session 鉴权；校验调用者可访问该 project_slug。

为了避免复制 Hermes prompt/parser/图写入逻辑，实施时应给现有 decomposer 增加内部
可选参数（roster、provider、model），由通用接口保持现有默认行为，项目适配接口
传显式值。

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

任务动态的权威来源是 board 对应的 `task_events`；项目创建、成员变更、项目设置变更
来自产品层 `project_events`。时间线服务按时间/稳定游标合并两类事件。

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

时间线 REST 列表，Hermes 当前不存在，需产品层后端提供：

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

该后端路由复用 Kanban DB 连接层读取事件并 join task 标题，同时合并产品层
`project_events`；浏览器不直连 DB。

#### 13.5.4 「项目创建」事件

Hermes 无 board 级事件表。「项目创建」动态由产品层合成：

- 创建项目时产品层写入自身动态表（或复用 `task_comments` 表挂特殊记录）。
- 降级方案：从 board `created_at` 字段推导时间线首条展示。

#### 13.5.5 MVP 关注的事件类型（非完整枚举）

当前 MVP 需要处理的主要 `task_events.kind`：

`created` / `assigned` / `commented` / `completed` / `blocked` /
`dependency_wait` / `block_loop_detected` / `unblocked` / `crashed` / `gave_up` /
`protocol_violation` / `timed_out` / `rate_limited` / `decomposed` / `specified` /
`promoted` / `promoted_manual` / `reclaimed` / `scheduled` / `claimed` /
`spawned` / `linked` / `unlinked` / `review_requested` / `changes_requested` /
`archived` / `status`。

事件集合会随 Hermes 演进，产品映射必须有未知 kind 的通用降级展示，不能用静态完整
枚举阻断新事件。MVP 展示 9.3 节对应种类，其余归入“其他”。

## 14. 状态映射

| Hermes status | 所属看板列 | UI 子状态文案 | 说明 |
|---|---|---|---|
| triage | 目标 root 不展示；其他 triage 在 Todo | 待拆解 / 需人工拆解 | 通过产品目标记录区分来源 |
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
3. 点击 Header 右侧、位于「项目成员」左侧的「发起目标」按钮。
4. 在弹窗填写目标标题、目标描述，并选择拆解模型或保留“系统默认”。
5. 点击「发起目标」。
6. 系统创建 root/triage task，并进入自动拆解和派发流程。
7. 看板出现拆解后的子任务。
8. 记录列表新增一条。
9. 动态 Tab 记录任务创建、拆解和派发事件。

### 15.3 手动创建并指派任务

1. 用户进入项目详情页。
2. 默认打开看板 Tab。
3. 点击 Todo 列列头右上角的 `+` 按钮（见 8.5）。
4. 在弹窗中填写任务标题、任务说明。
5. 选择负责人和工作空间策略。
6. 点击「创建并加入执行队列」。
7. 看板先显示可执行；dispatcher 领取后进入 Running。
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
4. 看板 MVP 仅展示状态视图（4 个状态列：Todo / Running / Blocked / Done），「按专家」二级视图留到 v1.1。目标 root 按产品目标记录过滤；其他 triage 在 Todo 列展示。
5. 沟通区域改为项目动态。
6. Header「发起目标」按钮位于「项目成员」左侧并打开目标弹窗；Todo 列列头 `+` 按钮打开精简后的创建任务弹窗（见 8.5）。
7. 目标式下发提交后自动拆解并派发，MVP 不做任务图人工确认。
8. 看板卡片提供按状态分级的操作菜单（编辑、添加评论、指派、完成、阻塞、归档等）。
9. 项目成员通过右侧抽屉查看和管理，Header 上的「项目成员」徽章按钮带成员数。
10. 工作空间是项目绑定工作目录的展示与轻量文件管理入口（新建文件夹 / 上传文件 / 只读浏览）。
11. 任务详情侧边栏展示完整执行上下文：Status Banner、runs/events 时间线、运行日志 tail；Blocked 任务首屏可见阻塞原因（见 12.2.2）。

## 17. 视觉与交互建议

### 17.1 Header

- 左侧显示项目图标、名称、描述。
- 右侧按钮顺序固定为「发起目标」「项目成员 4」「设置」；成员数为 0 时「项目成员」
  退化为「添加成员」并加「+」前置图标。
- 可显示总进度：`1/3 已完成`。
- 「发起目标」为 Header 主按钮，点击打开目标弹窗；表单式任务仍通过 Todo 列列头
  的 `+` 按钮完成（见 8.5）。

### 17.2 看板 Tab

- MVP 阶段只展示「按状态」视图，4 个状态列（Todo / Running / Blocked / Done）。目标 root 不展示；阻塞循环升级的 triage 在 Todo 列标记“需人工拆解”。
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
- 路径区显示“系统默认”标记，提供「复制路径」「打开目录」等基础操作，不提供修改入口。
- 路径下方提供「新建文件夹」「上传文件」两个写入操作，作用于系统默认工作空间；空目录时仍可使用。
- 文件夹 / 文件列表只读展示，**不**在产品内做预览、下载、版本管理、权限管理。
- 明确提示 MVP 不区分项目资料和项目产物。

### 17.6 发起目标弹窗 + 创建任务弹窗

**发起目标弹窗：**

- 由 Header「发起目标」按钮打开，建议宽度 640px。
- 标题栏右侧提供「发起记录」入口和关闭按钮；打开记录侧栏前先关闭弹窗。
- 内容顶部显示提示文案：「描述你的项目目标，系统会自动拆解为具体任务并分配给相关专家。」
- 字段精简：目标标题、目标描述、拆解模型（默认“系统默认”）。**附件能力推迟到 v1.1**。
- Footer 右侧为「取消」「发起目标」；提交中禁用重复提交并显示 loading。
- 有未提交内容时关闭弹窗需二次确认；提交成功后关闭弹窗并提示可在「发起记录」查看进度。
- 不展示指令预览。

**创建任务弹窗：**

- 由 Todo 列列头 `+` 按钮唤起（见 8.5）。MVP 阶段不在看板 Tab 顶部额外提供「+ 创建任务」按钮。
- 仅保留任务标题、任务说明、负责人、父任务和优先级；任务自动继承项目工作空间。
- 不展示高级设置、额外 Skill、Goal Mode、最大运行时长或失败重试配置。
- 主按钮文案：「创建并加入执行队列」。
- 从成员侧边栏进入时预填负责人；从「创建后续任务」进入时预填依赖任务。UI 不预填
  running，也不在 dispatcher 确认前伪造 running。

### 17.7 项目成员侧边栏

- 从右侧滑出。
- 展示成员任务统计。
- 提供添加成员和给成员创建任务的快捷入口（唤起创建任务弹窗，预填负责人）。

## 18. 后续版本规划

### v1.1

- 看板顶部视图切换条 `任务状态 | 分配专家`；按专家二级视图，分组来源使用项目成员列表，未分配任务归入「未指派」分组。
- 看板顶部恢复「+ 创建任务」工具栏按钮（默认 `Todo` 列）。
- `review`、`scheduled` 状态作为独立列展示（MVP 中 review 归 Running 列、scheduled 归 Todo 列），并提供「已归档」视图开关。
- 「发起目标」弹窗的附件上传能力（落到 `default_workdir` 后 `@file:` 引用）。
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
- 用户创建项目时至少选择 1 位专家。
- 新建项目页面不展示工作目录字段；创建成功后系统已生成目录并写入 board `default_workdir`。
- board 与产品成员/配置任一步写入失败时可安全重试，不产生误绑定旧 board 的项目。

### 项目详情

- 项目详情页默认展示看板 Tab。
- Header 能展示项目信息和项目进度。
- Header 右侧「发起目标」按钮位于「项目成员」左侧，点击后打开目标弹窗。
- Header 右侧的「项目成员」徽章按钮显示成员数（如 `项目成员 4`），点击可以打开右侧成员侧边栏。

### 看板

- 状态视图按 4 个状态列展示任务：`Todo / Running / Blocked / Done`；Todo 还展示非目标 root 的 triage。产品目标记录中的 root task 不在看板展示。
- 「按专家」二级视图推迟到 v1.1；MVP 看板顶部不出现视图切换条。
- 未分配任务在 v1.1 引入「按专家」视图时再单独分组，MVP 通过状态列的 assignee 字段区分。
- Todo 列列头右上角存在 `+` 按钮；MVP 不在看板 Tab 顶部额外提供「+ 创建任务」按钮。
- 任务卡片悬停时显示快捷按钮，「…」菜单按状态分级开放操作（见 12.8 节）。

### 任务下发与操作

- 页面底部不存在常驻发起目标区域。
- Header「发起目标」按钮可打开目标弹窗。
- 用户可以填写目标标题、目标描述，选择拆解模型或沿用系统默认后提交。**MVP 不提供附件入口**。
- 提交后系统创建内部 root/triage task，进入异步拆解和派发流程，并可观察拆解中/失败状态。
- 拆解生成任务的 assignee 全部属于提交时的项目成员 roster 快照。
- 模型下拉只影响本次 decomposer 调用，不改变子任务 worker 模型，也不修改全局配置。
- 目标弹窗标题栏右侧存在「发起记录」入口，可查看已发起目标并补充说明。
- Todo 列列头 `+` 按钮可唤起创建任务弹窗（见 8.5）。
- 创建任务弹窗不展示高级设置，仅提供标题、说明、负责人、父任务和优先级；不提供工作目录字段。
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
- 项目创建时由系统自动初始化工作目录并映射到 Kanban board 的 `default_workdir`。
- 新建项目、项目设置和创建任务弹窗均不提供工作目录输入。
- 工作空间 Tab 提供「新建文件夹」「上传文件」写入入口，空目录时仍保持可用。
- 工作空间 Tab 提供文件夹 / 文件列表（只读浏览），不提供文件预览、下载、版本管理、权限管理。

## 20. 关键决策总结

1. 项目使用 Kanban board，不新增核心项目任务模型。
2. 项目成员 MVP 由产品层维护，不改 Kanban schema。
3. 不做项目群聊，改为项目动态。
4. 不做自由文本聊天输入，改为结构化任务下发。
5. 任务下发拆为两条独立路径：Header「发起目标」按钮唤起目标弹窗（目标式下发）、
   Todo 列列头 `+` 按钮唤起「创建任务」弹窗（表单式下发，见 8.5）。
   MVP 看板 Tab 顶部不提供额外的「+ 创建任务」按钮。
6. MVP 不做任务图人工确认；目标式下发提交后自动进入拆解和派发流程。
7. 看板 MVP 只展示「按状态」视图（4 个状态列：`Todo / Running / Blocked / Done`）；每列内部按底层 Hermes status 细分。「按专家」推迟到 v1.1。产品目标映射中的 triage root 不展示；具有 `block_loop_detected` 的其他 triage 在 Todo 列标记“需人工拆解”。`review` 归 Running，`scheduled` 归 Todo，`archived` 归 Done。
8. 工作空间先做工作目录绑定与展示，叠加轻量文件浏览能力（只读列表 + 新建文件夹 + 上传文件），不做预览、下载、文件版本、权限管理。
9. 右侧抽屉只承载任务详情和项目成员；目标式下发使用 Header 弹窗，表单式下发使用 Todo 列列头按钮。
10. 任务卡片操作按状态分级开放，悬停快捷按钮 + 「…」下拉菜单两层呈现（见 12.8 节操作矩阵）。
11. 「发起目标」弹窗标题栏提供「发起记录」入口，可查看已发起目标并补充说明。
12. Hermes 的 `done` 是终态，无 reopen；「重新打开」语义化为「创建后续任务」（`create --parent`）。
13. Hermes 的 `archive` 是软删除；「删除」对应 `archive`，「永久删除」对应 dashboard DELETE 或 CLI `archive --rm`。
14. MVP 不设置协作专家或项目经理；root task 的技术 assignee 由服务 profile 的
    Hermes 配置内部解析，不作为项目 UI 概念。
15. 附件能力（落到 `default_workdir` 后 `@file:` 引用）推迟到 v1.1。MVP 的目标描述如需引用文件，建议先在工作目录中放置文件并手写相对路径。
16. Header 右侧「项目成员」徽章按钮带成员数显示（如 `项目成员 4`），为 0 时退化为「添加成员」。
17. 任务详情侧边栏采用四层信息结构（当前状况 Banner / 执行详情 / 任务上下文 / 协作），复用 Hermes `show` + dashboard API 的 runs/events/log/diagnostics；不展示 Agent 完整对话 transcript。

## 21. 已闭环设计决策与原型校正

### Q1：目标身份与 triage 双来源

**决策**：使用产品层 `project_goals -> root_task_id` 映射，不借用 `tenant`、
`idempotency_key` 或新增 task metadata。目标 root 默认从看板隐藏；具有
`block_loop_detected` 事件且不在目标映射中的 triage task 在 Todo 列展示。

### Q2：拆解关系方向与目标聚焦

**决策**：Hermes 将每个生成任务链接为 root 的 upstream parent，使 root 在全部
生成任务完成后进入 ready。目标记录持久化 decompose 返回的 `child_ids`；
`decomposed.payload.child_ids` 是审计来源。禁止用 `child_ids(root)` 推导本次拆解成员。

### Q3：拆解中与失败状态

**决策**：保留产品级 `decomposing` / `decompose_failed`。数据库任务图提交是原子
操作，但 auxiliary LLM 调用可能耗时或失败。UI 必须显示进行态、错误和重试，不能
像当前 mock 那样捕获异常后仍提示成功。

### Q4：简化目标表单、模型覆盖与成员白名单

**决策**：不设置项目级协作专家/项目经理。新增受限 decompose adapter，显式传入
roster 和可选 provider/model；root owner/default assignee 沿用服务 profile 的内部
配置。现有通用 decompose 和 `/orchestration` 保持原行为，成员白名单和模型选项由
服务端二次校验。

### Q5：任务启动语义

**决策**：删除“仅创建但不执行”的按钮，主操作改为“创建并加入执行队列”。产品只
创建/晋升到 ready 并催促 board dispatcher；禁止 `claim` 后再 `dispatch`，也禁止
前端直接写 running。精确启动单 task 不在 MVP 保证范围内。

### Q6：工作空间能力

**决策**：board `default_workdir` 只提供路径配置，不提供文件 API。MVP 需实现受限
文件适配服务，并明确同机/远程行为。Git 目录默认使用 task worktree，普通目录才可
共享 `dir`。当前原型中的下载/删除与 MVP 范围冲突，联调前移除。

### Q7：当前原型需要调整的交互

1. `submitGoal()` 不能同步调用 mock decompose 后无条件报成功；改为异步状态机。
2. 目标分解不能把 root 设为 running/review；真实流程是 triage -> todo -> ready -> running。
3. 生成任务与 root 的依赖方向需反转，并记录 decompose 返回的 child ids。
4. “创建”和“创建并派发”合并为“创建并加入执行队列”。
5. “开始执行”不能直接把状态改成 running；等待 dispatcher 事件。
6. 项目创建第二步必须校验至少一位成员。
7. 项目删除默认改为归档；永久删除单独二次确认。
8. 工作空间移除下载/删除，或从 MVP 排除后单独设计安全接口。
9. 项目 Header 补充描述和统一“设置”入口；设置只覆盖项目信息，不提供工作目录配置。
10. “发起记录”补齐目标聚焦模式；查看目标时按 `project_goals.child_ids` 高亮任务。
11. 项目进度排除隐藏的目标 root 和 archived；当前 mock 统计会抬高分母或完成数。
12. 原型路由和关联键从 project UUID 统一到 `project_slug === board_slug`，或由产品层
    提供稳定的双向映射，不能把两种 ID 混用。
13. 删除原型中的 `orchestratorProfileId`、`defaultAssignee` 和
    `autoDecomposeEnabled` 项目设置；目标始终自动拆解，内部 owner/fallback 沿用
    服务 profile 配置。
14. dependency block 仍留在 Todo；不能像当前 mock 一样一律移动到 Blocked 列。
15. 项目创建时自动初始化系统工作空间，删除所有工作目录输入；空目录时仍允许“新建文件夹/上传”。优先级移除 Hermes 不支持的 `urgent` 映射，MVP 仅保留高/中/低。
16. 清理未使用的 `projectMessages`、`projectFiles` 双文件模型和旧聊天样式，避免后续
    接口实现误接到已经废弃的数据结构。
17. 删除页面底部常驻发起目标区域；在 Header「项目成员」左侧增加「发起目标」按钮，
    点击后打开 12.1 节定义的目标弹窗。
18. 删除创建任务弹窗中的整个高级设置区域，只保留 MVP 高频字段。
19. 删除新建项目、项目设置和创建任务中的工作目录字段；项目创建后由后端创建
    `board_dir(project_slug) / "project-workspace"` 并自动写入 `default_workdir`，用户不可修改。
