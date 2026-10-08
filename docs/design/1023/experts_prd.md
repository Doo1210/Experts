# 1023 产品需求（按产品结构）

Status: 持续完善  
Date: 2026-09-30  
Scope: 专家、项目、专家模板

## 文档说明

本文按产品页面组织 1023 的**已明确增量需求**。详细规则与验收以同目录的 [prd.md](./prd.md) 为准；已有能力沿用 `docs/design/` 下的专家管理、任务对话和项目看板 MVP PRD。用户提供的六张截图用于识别**当前页面结构**，不把截图中的旧文案或旧交互当作 1023 的最终需求。例如专家管理页截图仍显示「人设」和左右预览，1023 已确定改为「岗位说明」和单栏编辑。

Hermes Agent 本地源码仓库：`D:/CodingWorkSpace/PublicProjects/hermes-agent-main`。本文首轮核对的提交为 `b63cfdf1257d7b7735e6075f039fb7986844410e`。源码核对记录放在文末；**源码现状与产品决定分别记录**。

共同约束：延续「专家 = Profile、对话任务 = Session、项目 = Kanban Board」；不另建平行模型。岗位说明、技能、记忆、MCP 等进入系统提示词或工具 schema 的配置变更默认只对**新会话**生效，保持已打开会话的提示词缓存。优先复用 Hermes 现有配置、会话、CLI 和适配层，不新增核心模型工具。1023 **不提供独立定时任务**：按时间触发的专家工作由事件中心的 Timer 触发源进入「自主任务（事件中心）」。

## 1. 专家

### 1.1 专家列表页

页面定位：展示「我的专家」，从专家卡片进入专家管理页，或发起该专家的对话任务。截图 1 是当前页面参考；列表卡片、创建专家和卡片菜单的 MVP 行为仍以专家管理 MVP PRD 为准，1023 暂无已拍板的列表布局改版。

1023 已明确的跨页规则：

- 列表中的专家名称、简介和标签用于展示与检索，**不会自动写入 `SOUL.md`**，也不会替代岗位职责。岗位说明在专家管理页单独编辑（[prd.md §3.1](./prd.md#31-用户怎么理解)）。
- 从列表发起新的对话任务时，默认工作目录为该专家的工作空间根；若用户在新建前选择已有子目录，则以所选目录创建 session。新建时显式传入 cwd，不自动建立 `tasks/<session-id>/`（[prd.md §5.6.3](./prd.md#563-新建对话)）。
- 新建专家时初始化自己的空工作空间，并预建 `消息渠道/`、`自主任务/`；不预建 `定时任务/` 或 `inputs/outputs/tmp`。从零创建且岗位说明未填写时，只在管理页的工作规范编辑缓冲预填默认句，保存前不写盘。

### 1.2 专家管理页

页面定位：管理一个专家的资料与能力。截图 2 是当前页面参考。1023 在现有 Tab 上做增量，主要涉及**岗位说明、工作空间、任务、记忆、技能、MCP、消息渠道**；顶部名称、简介、标签仍是专家列表资料。

#### 1.2.1 岗位说明 Tab

对应 [prd.md §3](./prd.md#3-岗位说明设计与实现)，覆盖现有「人设」Tab。

- Tab 改名为「岗位说明」，下设**岗位职责、作业流程、工作规范**三个子 Tab。单栏编辑 Markdown 源码；无工具栏、无实时预览。
- 三段只用于界面编辑。保存、导入、导出都针对**一份** `SOUL.md`；继续使用 `GET/PUT /api/profiles/{name}/soul`，不拆文件或接口。
- 三段可以全空。保存全空时保留内容为空的文件；新会话使用 Hermes 默认人格，不按专家名称生成职责。与 Hermes 默认 `SOUL.md` 一致的自动种入内容，在界面视为未填写。
- 从零创建且磁盘未填写时，只在**工作规范的未保存缓冲**预填工作目录规则；复制专家不额外预填。岗位说明的「使用模板」只有一套通用骨架，点击后先改缓冲，保存后才落盘。
- 保存、导出按职责、流程、规范顺序拼成一篇 Markdown；导出使用当前缓冲。拼装结果超过 **20000 字符**时禁止保存。
- 保存后仅新会话生效；若该专家有运行中会话，成功提示说明它们仍使用旧岗位说明。

**预置问题（1023 新增）**

- 原「人设」Tab 改名后，预置问题配置仍放在**岗位说明 Tab**，与 `SOUL.md` 正文分开。提供默认关闭的开关；开启时可进入配置弹窗，维护该专家的问题列表。问题是对话输入辅助文案，**不写进 `SOUL.md`、不注入模型提示词**，保存后即可在该专家对话页使用。
- 按已修改原型，弹窗支持添加、删除、拖拽排序；开启时至少保存一条非空问题，最多 20 条，每条最多 200 字符。保存前去首尾空白并去重；关闭开关保留已配置内容，再开启可继续使用。
- 专家对话页在开关开启且列表非空时显示「预置问题」。点击某条只把文字填入输入框，用户仍可编辑并自行发送，**不自动提交**。现有输入草稿的覆盖方式与示例问题的默认来源，见附录 C 待确认项。

#### 1.2.2 工作空间 Tab

对应 [prd.md §5](./prd.md#5-工作空间与工作目录设计与实现)。

- 工作空间属于专家，根路径来自该 profile 的 `terminal.cwd`。文件树展示整棵工作空间，支持更改根路径、新建文件夹、上传文件及浏览文件。
- 从零创建专家时，工作空间默认预建 `消息渠道/`、`自主任务/` 两个顶层目录。`自主任务/` 统一承载事件中心 Timer、WebHook、Pulsar、Kafka、MQTT 等触发的专家动作产物；不按触发源另建「定时任务」目录。复制专家时工作空间根仍重置为新专家自己的目录，不沿用源专家的绝对路径。
- 更改工作空间根只影响新对话的默认 cwd、新自主任务运行的默认目录和文件树根；已有对话及已有运行记录的 cwd 不自动迁移。界面须说明这一点，并对落在新根之外的旧 cwd 给出提示。
- 文件与文件夹支持复选、多选及「全选当前列表」，选中后显示「删除 n」。同时选中父目录及其子项时按父目录删除一次；工作空间根不可选、不可删。
- 批量删除前二次确认文件和文件夹数量。若范围含某条任务的当前工作目录，提示删除后任务 cwd 不会自动改变。仅删除解析后仍在根内的路径，拒绝指向根外的符号链接；单项失败不影响其它项，结束后报告成功／失败数并保留失败项勾选。删除文件不改任何 session cwd，也不删对话记录（[prd.md §5.5.4](./prd.md#554-多选删除文件和文件夹)）。
- 本 Tab 管理专家文件树，**不直接修改某条对话的工作目录**；对话的 cwd 在专家对话任务页切换。

#### 1.2.3 任务 Tab

任务 Tab 分为**对话｜消息渠道｜自主任务（事件中心）**。没有独立「定时」分段或定时任务创建入口。Timer 是事件中心的一种触发源，命中专家动作后与其他触发源一样进入自主任务。人工对话、消息会话、事件中心专家动作及其每次执行记录是不同对象，列表不可只靠一个 `status` 混排；对话归档规则见 [prd.md §12](./prd.md#12-任务归档)。

**对话段**

- 只列人工对话 session，排除 `source=cron`、消息渠道平台 source 与 `source=event_center`。未归档默认表的状态筛选只有**全部、进行中、已就绪**；已归档通过状态筛选旁独立的「已归档 n」入口查看。
- 行内保留「打开」和 `⋯`。未归档行的菜单为编辑名称、归档、删除；已归档行改为编辑名称、恢复、删除。归档使用 session 的 `archived` 软标记，保留消息和工作目录文件；删除仍是硬删并二次确认。
- 从已归档入口打开任务可查看历史并继续发消息，但它仍不出现在对话页右侧列表。归档不等于看板卡归档或自主任务的启停。

**消息渠道段（1023 新增）**

- 展示该专家通过企业微信 AI Bot、钉钉、飞书收到消息后形成的 **IM session**，按平台、会话对象、最近活跃时间和执行状态查看。仅配置／连接渠道不产生任务；消息进入 agent 执行流程时才创建或续接 session。后续消息按 Hermes 路由键续接，`/new` 或重置后形成新的 session。
- 一条消息渠道任务对应一条 IM session，可查看其历史与工作目录；它不归入人工「对话」段，也不等于渠道连接状态。是否允许从 Web 输入框续接 IM session、消息任务的归档／删除规则，待确认。
- 新专家工作空间预建 `消息渠道/`。建议每条新 IM session 默认使用 `消息渠道/<平台>/<首次 session_id>/`，以 session id 区分同一聊天的多轮任务，并避免把用户或群 ID 直接放进磁盘路径。压缩续接沿用原 cwd；明确 `/new` 才建立新的目录。此目录规则需在 Hermes gateway 的 session 解析之后接入，详见附录 B。

**自主任务（事件中心）段（1023 新增）**

- 展示事件中心中绑定当前专家的**「专家」执行动作**及其运行记录。截图所示，一个事件可有多个分支、每个分支可并行执行多个动作；同一事件还可同时执行工作流、工具或「智能体」动作。因此专家绑定应落在稳定的**执行动作 ID** 上，而不是整条事件根记录上。
- 事件中心负责事件接入、条件分支、动作顺序、发布版本和触发记录。专家任务 Tab 只展示／配置与当前专家相关的动作以及每次自主执行的结果；不复制一份事件源或处理流程。事件中心的「智能体」动作与「专家」动作是不同类型，不能全部算作本专家的任务。
- Timer 的「指定时间点／按间隔重复／Cron 表达式」及 WebHook、Pulsar、Kafka、MQTT 均由事件中心配置。专家任务 Tab 展示与该专家有关的动作和运行记录，可显示触发源类型，但不再提供另一套定时规则或 Hermes cron job 管理界面。
- 每次命中专家动作时创建**独立的一次执行记录和 Hermes session**，保存事件 ID、发布版本、分支 ID、动作 ID、专家 ID、输入快照、session ID、状态、结果与产物目录。不得续接人工对话或 IM session，也不创建 Hermes cron job。该次执行不写 `MEMORY.md`／`USER.md`。
- 新专家工作空间预建 `自主任务/`；建议产物按 `自主任务/<动作 ID>/runs/<执行 ID>/` 存放，该次 session 的 cwd 指向本次 runs 目录。Timer 与其它触发源沿用同一目录规则；多个分支／动作即使来自同一事件，也不共用一个 cwd。
- 旧 [prd.md §6 与 §6.10](./prd.md#6-独立定时任务历史方案已取消) 分别以 Hermes cron 和根级 `handler_type=expert`、`expert_id` 为前提，已被本次决定覆盖并在原文标为历史方案；专家删除时停用其动作并保留运行记录，复制专家不复制绑定。

#### 1.2.4 记忆 Tab

对应 [prd.md §7](./prd.md#7-记忆开关设计与实现)。

- 提供一个「启用记忆」总闸。打开时 `memory.memory_enabled` 和 `memory.user_profile_enabled` 都为 `true`；关闭时两项都为 `false`，一次保存写齐。新专家默认打开；复制专家继承开关，但记忆文件仍按 MVP 规则清空。
- 关闭后，新会话不注入两份记忆文件，也不提供内置 `memory` 工具。磁盘上的 `MEMORY.md`、`USER.md` 保留，Tab 继续只读展示并标明已关闭。切换仅新会话生效。
- 自主任务每次运行的记忆隔离不受总闸打开状态影响。Memory Provider 绑定、配置与解绑不在本期。

#### 1.2.5 技能 Tab

沿用 MVP 的技能展示及启用／禁用。1023 提出的「允许更新技能」是另一条控制轴，但 Hub 更新、agent `skill_manage`、curator 归档如何受控以及默认值均未拍板；本文件暂不把它写成确定开关（[prd.md §8](./prd.md#8-技能更新开关)）。

#### 1.2.6 MCP Tab

对应 [prd.md §15](./prd.md#15-mcp-优化导入--测通--填密钥)。

- 保留原有列表、启停和删除；「添加」弹窗提供粘贴配置与手动添加，另有「从平台导入」选择已有服务。手动添加支持 Streamable HTTP、SSE、本地命令 stdio。导入按服务器名称合并；同名覆盖并提示，不删除 JSON 未提及的服务器。
- 接受 `mcpServers`、`mcp_servers` 或名称到配置的 map；每项必须有 `command` 或 `url`。`url` 加 `transport: sse` 明确显示为 SSE，未指定时为 Streamable HTTP；`command` 为 stdio。导入失败不写盘；缺密钥时用一张表一次填齐。
- 明文密钥写入该专家 `.env`，`config.yaml` 仅存变量引用；导入不覆盖已有非空密钥，列表不回传明文。每行始终有「测试连通」「配置」；导入或保存密钥后自动测受影响服务器。
- 测试必须真实连接并获取工具列表。配置变更仅新会话生效。本期支持 SSE 传输切换与平台已有服务导入；不做 Hermes Catalog 一键安装、界面内 OAuth、工具过滤编辑和 TLS 高级项。

#### 1.2.7 消息渠道 Tab 与在线状态

对应 [prd.md §9](./prd.md#9-消息渠道设计与实现) 和 [§4](./prd.md#4-开启了消息渠道的专家启动策略)。产品只支持企业微信 AI Bot（`wecom`）、钉钉和飞书，不做 `wecom_callback`。

- 渠道页保留凭据、Home 和设置指南，精简无关配置。钉钉、飞书提供默认开启的「群聊需 @」；企微不提供。企微和飞书提供扫码配置。
- 每渠道增加默认关闭的「主动沟通」，以及「可私聊的人」「可发的群」两张名单。显示人名／群名、存平台 ID；发送前仅在名单内匹配，重名需选择，未匹配则停止。企微另受最近会话限制。
- 在群里 @ 别人，只限主动沟通已开启且在可发群名单中的群；企微不支持平台 @。文件和 @ 需分开发送时，按平台能力分成消息。
- 每渠道增加默认关闭的「允许收发文件」，覆盖图片、文件、语音、视频。当前 IM 对话的入站文件由适配器落地；发出的文件从该对话工作目录取。按名单主动发文件还要求主动沟通开启。
- 主动沟通和文件发送均使用**机器人身份**：企业微信 AI Bot、钉钉应用机器人、飞书应用 Bot；厂商 CLI 的登录态／应用凭据仅用于调用接口，不改变消息发送者。专家可以直接在终端调用对应机器人命令。若「主动沟通」开关和名单要成为不能绕过的强制规则，产品再提供受控出站入口统一校验；两种方式的取舍见附录 D。渠道已启用时，产品需要让该专家 gateway 在线；事件中心 Timer 由事件中心调度，**不因存在 Timer 就要求专家 IM gateway 常驻**。渠道完整重启、退避与失败态策略仍待拍板。

### 1.3 专家对话任务页

页面定位：与一个专家的某条人工对话 session 交互，右侧显示该专家未归档的对话任务列表。截图 3 是当前页面参考；当前流式回复、工具卡、HITL 和输入区的 MVP 行为仍沿用任务对话 MVP PRD。

#### 1.3.1 工作目录与文件

- **工作目录**属于当前人工对话，默认等于专家工作空间根，可改为已有子目录。相对路径读写、终端和附件都以当前 cwd 为锚点；默认产物写在 cwd。本期不加阻止绝对路径写出 cwd 的硬沙箱，也不预设 `inputs/outputs/tmp`。消息渠道与事件中心自主执行分别使用其专属默认目录，不改变人工对话的根目录默认值。
- 对话页同时展示专家工作空间和当前工作目录；文件侧边栏从工作空间根展示整棵树，并标出当前 cwd。更改工作目录仅在空闲时允许，运行中禁用；切换影响后续相对路径和附件，不重建本会话已缓存的 `AGENTS.md` 或提示词。
- 用户 `@file` 的相对路径从当前 cwd 解析，但允许引用工作空间根内的文件；补全插入的路径必须按此规则可解析。旧 cwd 已在新工作空间根外时，允许范围回退为当前 cwd 并提示用户。

#### 1.3.2 任务列表与归档

- 右侧人工对话任务列表排除 `source=cron`、消息渠道平台 source、`source=event_center` 和已归档 session。卡片 `⋯` 提供编辑名称、归档、删除；点菜单不应触发任务切换。
- 归档当前正在看的任务后，右侧立刻移除它，主区切到下一条未归档任务或空态。从管理页已归档入口打开任务时，主区可查看历史和继续发送，并提示「已归档」与恢复入口，但右侧仍不显示它。
- 归档保留消息和工作目录文件；删除仍二次确认并硬删 session（[prd.md §12](./prd.md#12-任务归档)）。

#### 1.3.3 问题快速定位（1023 新增）

将专家对话主区边缘的**可见纵向滑动条**改为「问题快速定位」导航轨，视觉参考本次截图：细线段表示历史提问，当前位置对应的线段突出显示，悬停时在轨道旁出现问题预览卡。

- **一个标记对应一次用户提问**，按对话时间顺序排列。锚点取本 session 中用户主动发送且实际展示的 `role=user` 消息；内部通知、审批选择、专家回复、思考、工具调用、状态提示和 HITL 卡片不单独产生标记。只有附件而没有正文的提问，用附件名称／「发送了文件」作标题。
- 标记位置对应提问在整段对话内容中的位置，而不是平均分布。点击标记将该问题滚动到对话区可视范围的顶部附近，并保留紧随其后的专家回答；高亮当前浏览位置所属的问题。切换任务时重新生成该 session 的标记，不沿用上一任务的定位。
- 悬停或键盘聚焦标记时，在轨道旁显示预览卡：**用户问题**首行作为标题，**该问题对应的第一段可见专家答复**取开头摘要，最多两行；不拿思考或工具日志充当回答。过长文本截断，未回答时显示进行中／待回答状态。附件问题以类型／名称作标题。预览只读，不改变会话内容。点击标记后仍可正常滚轮、触控、键盘滚动。
- 新消息、流式回复、工具卡片展开／收起、窗口尺寸变化都会改变内容高度，标记位置须随实际布局更新。手动跳到历史问题时暂停自动滚到底部，并继续提供现有「回到最新」入口；跳到最新后恢复现有自动滚动规则。
- 对话没有用户问题时不显示导航轨；只有一个问题时显示一个标记。标记密集时须保证相邻问题仍可点选和预览；具体聚合样式见附录 C 待确认项。

这是一项**对话阅读与导航能力**，不需要改变 Hermes session、transcript、消息顺序或模型上下文。原生滚动能力仍保留，只替换可见的滚动导航表达。

验收：同一 session 的 N 次用户提问可定位到 N 个问题起点；悬停预览能区分问题与对应回答；点击历史标记后流式更新不强制拉回底部；切换任务后只展示新任务的标记；「回到最新」、滚轮和键盘滚动仍可用。

#### 1.3.4 待细化的对话体验

岗位说明 Tab 配置的「预置问题」在本页输入区供用户一键填入，**不自动发送**。它是专家预先维护的问题列表；[prd.md §11](./prd.md#11-快捷指令) 所说的用户可配置快捷指令仍是另一项待细化能力，不能与预置问题或 Hermes 的 `quick_commands` 斜杠 `exec`／`alias` 混为一项。工具卡折叠、长回复扫读、HITL 提醒、运行状态等 [prd.md §10](./prd.md#10-对话区优化) 方向，仍需另补交互稿与验收条件。

## 2. 项目

### 2.1 项目列表页

页面定位：展示项目卡片并进入项目详情页，截图 4 为当前页面参考。项目列表的创建、展示和管理沿用项目看板 MVP PRD；**1023 当前没有已拍板的项目列表页增量需求**。不要因本文件加入专家对话归档或自主任务而改变项目卡片的数据对象或列表语义。

### 2.2 项目详情页

页面定位：项目看板、项目工作空间、目标与成员等，截图 5 为当前页面参考。现有看板状态及项目交互沿用项目看板 MVP PRD；**1023 当前没有已拍板的项目详情页改版需求**。

需保持的边界：项目工作目录属于看板共享资源，**不是**专家工作空间；看板卡归档与人工对话 session 的 `archived` 是两套独立能力。自主任务不自动创建看板卡（[prd.md §5.8](./prd.md#58-和其它模块的边界)、[§12.1](./prd.md#121-和别的归档分清)）。

## 3. 专家模板

页面定位：浏览可复用的专家模板，截图 6 为当前页面参考。模板列表和从模板创建专家的既有行为沿用专家管理 MVP PRD；**1023 当前没有已拍板的专家模板页增量需求**。

这里的「专家模板」是独立产品入口；专家管理页岗位说明空态的「使用模板」只是一套通用的 `SOUL.md` 编辑骨架。两者不是同一对象，不能把岗位说明骨架当成专家模板页的新增模板（[prd.md §3.5](./prd.md#35-模板预填导入导出)）。

## 附录 A. Hermes 源码首轮核对

以下是已直接读到的源码行为，供后续分析定位；尚未做运行验证或全模块审计。路径相对文首所列 Hermes 仓库。

- `hermes_cli/web_routers/profiles.py`：已有 `GET/PUT /api/profiles/{name}/soul`，读写单份 `SOUL.md`；三段编辑和 20000 字符限制是产品新增规则。
- `tui_gateway/methods_session.py`：`session.create` 接收 cwd，有效的显式目录会标记 `explicit_cwd`；`session.cwd.set` 在 running 时返回 `4009 session busy`。
- `tui_gateway/prompt_turn.py`：当前 `@file` 预处理仍为 `cwd=cwd, allowed_root=cwd`；扩到专家工作空间根尚待实现。
- `cron/scheduler.py`：Hermes 自带 cron 与 gateway ticker 的实现仍存在，但 1023 产品不再用其创建或管理定时专家任务。事件中心 Timer 属于产品事件接入与调度能力。
- `agent/agent_init.py`：`skip_memory=True` 主要跳过外挂 Provider；显式启用 `memory` toolset 时内置记忆仍可加载，自主任务的记忆隔离需同时核对工具集。
- `hermes_cli/web_routers/sessions.py`：`PATCH /api/sessions/{id}` 可设置 `archived`；列表支持 `archived=exclude|only|include`。
- `hermes_cli/web_routers/mcp.py`：已有真实探测单台服务的接口；整表 `PUT /api/mcp/servers` 是**替换**语义，不能直接用于合并导入。
- `hermes_cli/config.py`、`cli.py`：现有 `quick_commands` 属于斜杠命令的 `exec`／`alias`，不是输入框提示词模板。
- `plugins/platforms/wecom/adapter.py`、`plugins/platforms/dingtalk/adapter.py`、`plugins/platforms/feishu/adapter.py`：接收入站消息后构造含平台、聊天类型、聊天 ID、用户 ID、可选线程 ID 的 `SessionSource`，再交给 gateway；各适配器本身不直接新建 SessionDB 任务。
- `gateway/session.py`、`gateway/run_turn.py`：`build_session_key` 用 profile、平台、聊天类型、聊天／线程／用户身份组成稳定路由键；`SessionStore.get_or_create_session` 根据该键复用或创建 session，并在 SessionDB 写入平台 `source` 与来源元数据。普通后续消息会续接同一 session；重置产生新 session。
- `gateway/run.py`、`gateway/run_turn_runner.py`：gateway 每轮在所属 profile 的配置／凭据作用域内执行，并以 session ID 作为 agent `task_id`。当前 `_set_session_env` 没有传入专属 cwd，SessionStore 新建行也没有传入 cwd；仅靠创建 `消息渠道/` 目录**不会**让 IM 文件默认落到那里。
- `gateway/platforms/base.py`、各渠道媒体适配器：部分入站媒体会写到 profile 的 `cache/images|audio|documents` 等缓存目录，另一些适配器先保留下载 URL；目前没有统一保存到工作空间中消息任务目录的路径。产品要求「收到的文件落当前任务目录」时，需要在接纳消息并确定 session 后处理下载／归档与引用路径。
- `hermes_state_sessions.py`、`run_agent.py`：SessionDB 的 `source` 是字符串，支持明确保存 `cwd` 和 `profile_name`；一次性 agent 可以用独立 session ID 与自定义 `source` 落库，但 `AIAgent` 默认只为本地 CLI 自动写入启动 cwd，事件执行器须显式绑定并持久化本次 cwd。
- `js/expert-detail-page.js`、`js/chat-composer.js`、`js/store.js`：已修改原型的预置问题配置支持开关、增删、拖拽、最多 20 条及每条 200 字符；对话页点击后只填输入框。当前数据保存在原型的本地 store，并非 Hermes 的 `SOUL.md` 或已实现的服务端接口。
- `js/expert-tasks-page.js`、`css/app.css`：当前对话区是 `.chat-messages` 原生滚动容器，`onChatScroll` 判断是否离开底部，「回到最新」负责恢复自动滚动；`chatGroups` 已按 user 消息与 expert turn 分组。问题导航可在产品前端据 user 消息建锚点，不需要修改 Hermes transcript。

## 附录 B. 新增任务的 session 与目录方案（待确认）

### B.1 消息渠道任务

1. 渠道适配器接纳消息，生成 `SessionSource`；gateway 先按现有 `SessionStore` 路由键取得 `session_id`。同一聊天是否按用户拆 session 仍由 Hermes 的 `group_sessions_per_user` 等设置决定，产品不要单独用 `chat_id` 猜任务身份。
2. 对新建的 session，创建 `消息渠道/<平台>/<首次 session_id>/`；对已有 session，优先读取 SessionDB 保存的 cwd。压缩产生的子 session 沿用父 cwd；`/new` 新建 session 时才分配新目录。
3. 在调用 agent 前把 cwd 写入 SessionDB，并在该轮的 session context 与 `task_id=session_id` 对应的工具 cwd 中绑定。只修改专家级 `terminal.cwd` 会影响其它任务，不能实现本需求。
4. 入站文件在适配器缓存后、交给 agent 前，保存到该 session 目录并把引用路径改为该文件路径；需处理同名、非法文件名、重复消息与单项下载失败。关闭「允许收发文件」时仍按渠道需求拒绝落地／交给专家。任务列表使用 SessionDB 的 profile + `source` 平台字段筛选，不用文件夹反推 session。

### B.2 自主任务（事件中心）

1. 事件中心先保存事件接入与发布版本；一条事件进入分支后，只有命中的**专家类型执行动作**会创建本专家任务。动作记录保存稳定 `action_id`、`expert_id`、指令模板及必要的投递配置；其他动作仍由事件中心执行。
2. 每次命中动作，事件中心先用「事件投递 ID + 发布版本 + 动作 ID」等稳定键去重，生成唯一 `execution_id` 并记录输入快照，再创建 `自主任务/<action_id>/runs/<execution_id>/`。Timer 与其它触发源使用同一规则；重复投递或重试应回到同一逻辑执行记录，不能无故生成第二条任务。
3. 专家执行器在对应 profile 的配置、密钥与终端策略作用域中，以**独立 session ID**运行一次 agent；在 SessionDB 写 `source=event_center`、`profile_name`、本次 `cwd`，并在事件中心执行记录中保存这个 session ID。事件 payload 作为本次用户输入按模板渲染，不写进 `SOUL.md` 或固定系统提示词。
4. 执行结束后，分别记录 agent 结果、文件产物及 IM 投递结果。运行记录始终归属事件中心动作；专家任务 Tab 按 `expert_id` 查询动作和执行，不靠 SessionDB `source` 猜动作关系。`session_id` 用于打开只读 transcript，失败重试、人工干预及能否续聊需另定规则。

此方案借用 Hermes 已有的 SessionDB、profile 作用域和一次性 agent 运行能力；事件中心 Timer 与其它触发源共用动作执行链，不往 Hermes cron 建 job，也不让不同事件触发共享一个会话的提示词缓存。[prd.md §6 与 §6.10](./prd.md#6-独立定时任务历史方案已取消) 已标为历史方案，后续详细规格按本节的动作级绑定展开。

## 附录 C. 待确认事项

以下事项不应从当前页面截图或草案方向推断为已拍板：

1. **专家管理页／任务 Tab**：自主任务本期纳入；需确认事件中心现有持久化结构中，专家动作的稳定 ID、发布版本、执行记录与去重键如何存放。旧 [prd.md §6 与 §6.10](./prd.md#6-独立定时任务历史方案已取消) 已标为历史方案。
2. **专家管理页／消息渠道**：渠道进程的多专家启动顺序、资源上限、退出重试和「待重启」处理仍待定。
3. **专家管理页／消息渠道**：消息任务按 session 分目录、压缩续接沿用 cwd 的方案待确认；IM 任务是否允许在 Web 续聊，以及归档／删除策略待确认。需明确开关／名单是产品引导还是强制约束：前者可直接调用机器人 CLI，后者需让实际发送经过产品校验。各专家 CLI 的调用凭据仍需隔离，发送身份均为机器人。
4. **专家管理页／技能**：Hub 更新、`skill_manage` 和 curator 如何受「允许更新技能」总闸控制，以及默认值，仍待定。
5. **专家管理页／岗位说明**：正文若包含 `## 作业流程` 等保留标题，现有拆段规则无法保证保存后再打开仍还原原三段，需补规则。
6. **岗位说明／专家对话任务页**：点击预置问题时，若输入框已有未发送内容，是覆盖、追加还是确认后覆盖？原型当前直接覆盖。示例问题应来自通用默认、专家模板还是人工填写，也需确认。
7. **专家对话任务页**：对话区优化缺交互稿与验收条件；独立的快捷指令功能，其归属、存储、变量和预置内容未定。
8. **专家对话任务页／问题快速定位**：大量问题时标记如何聚合；鼠标拖动导航轨空白区域是否用于连续滚动；窄屏下如何收起预览卡，需在交互稿中确认。截图中的书签图标不自动视为本期书签功能。

后续每解决一个问题，就在对应页面补充产品决定、源码依据与验收条件，并更新此清单。

## 附录 D. 实现方案概要（源码与厂商 CLI 核对）

以下是可落地的技术路径，供设计和研发拆分；厂商 CLI 命令以接入时所安装版本的 `--help`／Schema 再核对。本轮只读核对了本机 `dws v1.0.59` 的发送和资源下载 Schema，未向任何渠道发送测试消息；`wecom-cli`、`lark-cli` 在本机未安装，依据其官方 CLI 仓库文档判断。

### D.1 Hermes 可复用能力

- **专家资料与配置**：一个专家对应一个 Hermes Profile；岗位说明复用 `SOUL.md` 的 `GET/PUT /api/profiles/{name}/soul`。预置问题、名单及页面开关由产品按专家存储，不写入 `SOUL.md`。
- **人工对话与文件**：复用 `session.create(cwd=工作空间根)`、`session.cwd.set`、SessionDB 和 `terminal.cwd`。`@file` 的 `allowed_root` 扩到专家工作空间根；批量删除在产品文件接口校验真实路径与符号链接，不新增模型工具。
- **消息渠道任务**：复用 Hermes 适配器产生的 `SessionSource`、`SessionStore.get_or_create_session` 和 SessionDB 的平台 `source`。在拿到新 `session_id` 后创建 `消息渠道/<平台>/<首次 session_id>/`，将 cwd 同时写入 SessionDB、轮次上下文和该 `task_id` 的工具 cwd；入站媒体从缓存／下载源归档到该目录后再交给 agent。
- **自主任务**：事件中心负责 Timer 等触发、版本、分支、动作和去重；执行器在目标 Profile 的配置／凭据作用域中复用 Hermes `AIAgent` + SessionDB，每次动作独立创建 `source=event_center` 的 session、绑定 `自主任务/<动作 ID>/runs/<执行 ID>/` 为 cwd，并把 session ID 回写事件中心运行记录。产品不调用 Hermes cron 创建 job；记忆隔离同时关闭 memory 工具集，不能只设置 `skip_memory=True`。
- **归档、记忆、MCP**：人工对话归档复用 `sessions.archived`；记忆总闸写 `memory_enabled`、`user_profile_enabled`；MCP 复用现有服务列表与真探针，导入须逐台合并，不能调用整表替换接口。
- **对话页轻交互**：预置问题作为专家级产品配置由对话页读取，点击后只更新输入缓冲；问题快速定位从已展示的用户消息与其首段可见答复建立前端锚点，复用现有滚动容器和「回到最新」，无需改 Hermes transcript。

### D.2 三家渠道的主动沟通与文件

当前会话回复优先沿用 Hermes gateway 适配器：企微和飞书适配器已有本地文件上传发送路径，钉钉 session webhook 适配器仅支持文本／Markdown，本地文件使用钉钉机器人 CLI。**主动发给名单中的人或群也可以由专家直接调用机器人 CLI**，不需要真人代发或厂商要求的产品出站服务。这里有两种产品控制强度：若开关／名单是专家行为引导，在岗位说明或技能里先查配置再直调 CLI；若它们是不可绕过的强制限制，则由产品受控入口持有调用凭据、校验目标和文件后调用同一套机器人 CLI。通用终端可直接使用完整凭据时，单靠 UI 开关与提示词无法保证强制限制。

「CLI 授权」在本节只指**调用资格**：安装机器上的登录态、应用凭据、API 权限或目标会话可达范围；它与最终消息显示的**发送者身份**分开。企微 `message aibot send`、钉钉 `send-by-bot`、飞书 `--as bot` 都以机器人名义发消息和文件。

- **企业微信 AI Bot**：根据 [WecomTeam 消息 CLI](https://github.com/WecomTeam/wecom-cli/blob/main/skills/wecomcli-message/SKILL.md)，授权人用 `wecom-cli identity whoami`，其他目标先用 `wecom-cli message aibot sessions list` 获取**本次**可发送会话，再调用以智能机器人身份发送的 `wecom-cli message aibot send --json ...`。本地媒体先用 [媒体 CLI](https://github.com/WecomTeam/wecom-cli/blob/main/skills/wecomcli-media/SKILL.md) 的 `wecom-cli media upload --json '{"file_path":"..."}'` 取得 `media_id`，再发送相应的图片／文件／语音／视频消息；语音原生发送要求 AMR。CLI 的 [扫码初始化与授权状态检查](https://github.com/WecomTeam/wecom-cli/blob/main/skills/wecomcli-shared/SKILL.md)是取得调用资格，**不表示以扫码人的身份发送**；不能假定填入 Hermes Bot ID／Secret 后此 CLI 就已可用。名单目标不在当次 `sessions list` 时应停止发送。
- **钉钉机器人**：本机 `dws v1.0.59` 的 `dws chat +messages-send --as bot --robot-code ...` 可发群／单聊文本、Markdown 和 @，但其 Schema 明确**不支持 bot 富媒体**。机器人发本地文件走 [DWS 机器人原子命令](https://github.com/DingTalk-Real-AI/dingtalk-workspace-cli/blob/main/skills/multi/dingtalk-chat/references/chat/chat-bot.md) `dws chat message send-by-bot --robot-code ... --group <openConversationId>` 或 `--users <userId>`，配 `--msg-type file --file-path ./报告.pdf`；群内 @ 用 `--at-user-ids`／`--at-open-dingtalk-ids`。本地图片也以文件附件发送；公网图片 URL 才可用 `--msg-type image --image-url`。`--group` 与 `--users` 互斥，文件和带 @ 文本需要分开发送。
- **飞书机器人**：根据 [larksuite 消息 CLI](https://github.com/larksuite/cli/blob/main/skills/lark-im/references/lark-im-messages-send.md)，用 `lark-cli im +messages-send --as bot --chat-id oc_... --text/--markdown` 发群，或 `--user-id ou_...` 发单聊；`--file ./报告.pdf`、`--image`、`--video`、`--audio` 会自动上传后发送，但本地路径必须相对 CLI 工作目录且解析后留在其中，原生音频需 Opus。[Bot 身份](https://github.com/larksuite/cli/blob/main/skills/lark-shared/references/lark-shared-identity-and-permissions.md)使用应用 appId／appSecret 和已开通的 scope，无需真人 `auth login`。群 @ 先用 `im +chat-members-list --as bot` 确认成员，再在文本／富文本中使用 `<at user_id="ou_...">...</at>`；文件与 @ 文本可分两条。Bot 可搜索和列出可见群，但[不能列出单聊会话](https://github.com/larksuite/cli/blob/main/skills/lark-im/references/lark-im-chat-list.md)；「可私聊的人」需要从已有入站身份或经授权的通讯录流程取得 `open_id`，不能从 Bot 群列表推断。Bot 发送还受应用权限、可用范围、群成员身份和既有单聊关系约束。

**收文件**与主动发送分开：当前 IM 对话的附件首先由 Hermes 适配器接收／缓存，产品将可用文件归档到该消息 session 的 cwd。历史资源补拉可按需使用飞书 [`+messages-resources-download --as bot`](https://github.com/larksuite/cli/blob/main/skills/lark-im/references/lark-im-messages-resources-download.md)、钉钉 `dws chat +messages-resource-download` 或企微 `wecom-cli media download`，但必须以真实消息 ID／资源 ID 和各 CLI 可访问的身份为前提；历史补拉不是实时收文件的前置步骤。原生语音／视频格式受平台限制，不能把“能发送文件附件”表述成所有平台都支持原生语音或视频消息。
