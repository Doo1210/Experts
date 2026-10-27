# 专家对话原型演示触发词

本文集中记录**当前前端本地模拟器**的触发词与操作，依据 `src/demo/state.js` 中的 `sendDemoMessage()`。这些词只用于检查原型效果，不代表真实模型会按关键词执行，也不属于 [专家对话页 PRD](./experts_conversation_prd.md) 的功能规则。后续新增演示场景继续补充到本文件。

**范围说明**：部分本地脚本仍能触发本期隐藏并默认关闭的工具或未开放场景，仅供旧原型、历史记录与后续版本参考，不作为本期验收入口；统一列在[§7 本期不开放](#7-本期不开放)。前面各节以本期保留的功能为主。`web_search`、`web_extract` 保留，实际调用须有可用服务提供方；本文件中的网页场景仍只是本地模拟。

除注明“界面操作”或“内置样例”的条目外，在专家对话页新建任务并单独发送表中的**完整触发词**即可触发；仅去除输入首尾空白，不把附加文字或拼接的触发词当作演示指令。未命中的文字走普通回复。已明确的组合场景见第 6 节。专项场景的处理过程通常至少持续约 6 秒，中途说明或人工等待会使总时长更长。

所有新消息都必须包含去除首尾空白后的非空文字；可同时附带本地上传文件或引用资料，不能只发资料。

**备注列读法**：工具名、事件名、关键 `args` 与返回字段均对照当前本地模拟代码填写，供研发核对原型数据流；“无工具调用”表示该触发词只生成回合、会话状态或界面事件。模拟的 `tool.start/complete` 不执行 Hermes 工具，模拟字段也不能直接当作已接入接口的验收结果。同一演示进程 ID 出现在多行，仅用于关联各独立触发词，不表示它们会自动依次调用。

## 1. 基础回复与正文

| 输入或操作 | 演示场景 | 主要检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `普通回复` 或 `你好` | 普通流式答复 | 无处理活动时，回合状态行不出现空的展开入口；完成后显示总用时。 | 无工具调用；仅模拟 `message.delta → message.complete(status=complete)`。`你好` 不依赖专用关键词。 |
| `演示过程` | 四组活动、三段中途说明及两项阶段提示 | 按“读取文件 → 中途说明 → 模型等待 → 搜索文件和执行命令 → 中途说明 → 上下文压缩 → 运行代码 → 中途说明 → 生成文件 → 修改文件 → 最终回复”的顺序呈现。等待和压缩独立成行，文件操作属于最后一组。写入及修改虽在处理过程中确认保存，本轮产出卡片仍只在最终回复收口后出现。 | 六项工具分别用独立 `tool_id` 模拟 `read_file/search_files/terminal/execute_code/write_file/patch` 的开始与完成；三次 `message.interim` 分隔四组活动。等待用 `thinking.delta`，压缩用 `status.update(compacting/compacted)`；生成与修改各发一条 `result.add`，并沿用 §2.1、§2.3 的详情及产出规则。 |
| `中途` | 仅中途说明 | 中途文字进入处理过程，与最终回复分开。 | 无工具调用；`message.delta → message.interim → message.complete`。单独使用不触发工具。 |
| `Markdown 展示` | 富文本回复 | 展示标题、表格、本地图片、强调、代码块和链接。 | 无工具调用；`message.delta/complete` 的内容为固定 Markdown 样例。 |
| 上传本地文件并输入文字 | 本轮本地资料 | 待发送卡与已发送资料卡标为“本地上传”，发送后不自动加入工作空间。 | 界面操作；提交的用户消息带 `attachments(kind=local_upload)`，上传本身不发 Hermes 工具事件。只有文件不能发送；指令文字恰好是完整演示触发词时才会另触发模拟工具。 |
| 引用知识库、知识库文档或工作空间文件并输入文字 | 本轮引用资料 | 已发送资料卡保留来源类型；工作空间文件可打开时提供预览。 | 界面操作；用户消息带 `references(kind=knowledge_library/knowledge_document/workspace_file)`，引用本身不调用工具；指令文字恰好是完整演示触发词时才会另触发场景。 |
| 打开质量分析专家内置的“多问题定位演示（72问）”任务 | 问题定位条 | 查看大量问题时的独立滚动、逐项预览和点击定位。 | 内置任务数据；不发送触发词，不产生新的工具或回合事件。 |

## 2. 过程活动与工具

本章开头的组合场景、§2.2 的异常终态和 §2.3 的产出场景，都复用 §2.1 对应工具的活动组、活动行与详情映射；组合场景只改变调用次数、事件顺序、终态或产出数据，不另设一套工具呈现规则。无演示文件时的 `list_files` 是降级读取，仍走通用工具映射。

| 输入或操作 | 演示场景 | 主要检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `核对资料`、`查看工作目录`、`处理文件` 或 `使用工具` | 普通读取活动 | 读取活动与专项“读取文件”共用实际范围及一行内容预览，不额外生成“分析任务”伪工具。 | 有演示文件时模拟 `read_file(path=当前文件) → tool.complete(content/total_lines)`；无文件时降级为 `list_files(path=workspace)`。 |
| `演示进度` 或 `查看进度` | 兼容旧触发词的网页读取演示 | 与专项“读取网页”共用网址和返回结果的呈现规则；活动行不显示逐页进度。 | 模拟 `web_extract(urls=[a,b], char_limit=15000)`；结果 `results[]` 含 2 项；当前不发送逐页 `tool.progress`。 |
| `工具详情` | 命令工具详情 | 与专项“执行命令”共用安全入参与非空命令输出。 | 模拟 `terminal(command=rg -n -F …, workdir=/workspace, timeout=30)`；返回 `exit_code=0, output=当前文件命中行`，不执行真实命令。 |
| `文件差异` | 修改文件详情 | 与专项“修改文件”共用差异详情和本轮修改产出的规则。 | 模拟 `patch(path=当前专家文件)`；保存后 `tool.complete` 带实际演示差异，并发 `result.add(operation=modified)`，仅改浏览器本地数据。 |
| `并行工具` | 读取文件与搜索文件并行 | 两项活动各保留身份，分别结算；完成顺序不改变活动行排序。 | 两个独立 `tool_id`：`read_file(path=当前文件)` 与 `search_files(target=files,pattern=*.csv 等)`；搜索进展为本地模拟，各自 `tool.complete`。 |
| `并行过程` | 并行工具与中途说明 | 中途说明与处理活动按顺序呈现。 | 同上两次工具调用，另发 `message.interim`；“过程”关键词只增加中途说明，不创建第三个工具。 |
| `请展示思考` | 逐段可见思考 | 展开“思考”行后可看到文字分段增长；正文开始后该行退出运行态，回合中始终只有一项思考活动。 | 无工具调用；多次模拟 `reasoning.delta(text=可见片段)` 合并为一项，最后 `message.complete`。不代表完整内部推理。 |
| `演示大量工具活动` | 思考、18 项多类型工具及三段中途说明 | 活动按事件顺序分成四组，组与组之间各有一段专家中途回复；共 19 项活动。每组保留自己的活动行和详情；回合结束后各组可独立展开。 | 一项 `reasoning.delta` 活动加 18 个独立 `tool_id`；工具覆盖读取／搜索文件、搜索网页／读取网页、执行命令／启动后台命令、运行代码、写入／修改文件、技能查看、后台进程查询和外部 MCP。三次 `message.interim` 将连续活动分组；写入与修改只影响浏览器本地演示文件。 |
| `演示活动组：大量活动` | 思考、32 项多类型工具及三段中途说明 | 活动按事件顺序分成四组；第一组仍含十余项活动，可验证组内限高与纵向滚动。三段专家中途回复把后续活动分开；各组标题、活动行和详情保持归属。 | 32 个独立工具调用加一项思考，复用上述类型；三次 `message.interim` 分组。写入与修改各一次，其余重复读取、检索、命令、代码、网页、技能、后台进程和外部 MCP；仅使用本地演示数据。 |

### 2.1 分类别工具活动（运行中）

下列 `演示工具：…` 均由本地事件模拟，不执行真实文件、命令、浏览器或外部服务操作。组标题以“正在推进：”或“处理经过：”引出摘要；组内活动行使用 6px 圆点，活动名称、操作对象和进展保持原有字体样式。活动组与活动行的展开图标紧邻各自文字；确实运行中的组标题与活动行有从左到右的灰色文字扫光，悬停／聚焦时暂停；等待启动及结束后保持静态。执行中组标题优先保留安全对象；活动行在对象后追加实际演示进展，展开详情归在对应活动行内。回合结束后，“处理经过”摘要只列活动名称，活动行和详情仍保留对象、进展及结果供查看。字段与降级规则见 [工具活动呈现对照表](./experts_conversation_tool_activity_matrix.md)。

#### 文件

| 触发词 | 活动组标题要点 | 活动行与展开详情检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示工具：读取文件` | 读取文件 · 当前专家的演示文件 | 完成后详情显示实际读取范围、总行数与单行内容预览；不模拟逐行进度。 | `read_file(path=当前文件, offset=1, limit=2000)`；`tool.start → tool.complete`，结果使用 `content/total_lines/truncated`。 |
| `演示工具：部分读取文件` | 读取文件 · 当前专家的演示文件 | 质量样例显示第 1–2 行、共 3 行和“本次仅返回部分内容”；不会自动续读。 | `read_file(path=当前文件, offset=1, limit=2)`；质量样例返回 `truncated=true`。文件不足 3 行时不伪造截断。 |
| `演示工具：写入文件` | 写入文件 · 报告.md | 活动行无空详情；模拟确认保存后，`报告.md` 同时进入工作空间与本回合产出，可预览、下载本轮版本。 | `write_file(path=报告.md, content=演示报告正文)`；完成结果 `verified=true` 后，本地另发 `result.add(kind=file, operation=created)`。 |
| `演示工具：修改文件` | 修改文件 · 当前专家的演示文本文件 | 质量分析专家使用 `分析资料/良率样例.csv`，运营策划专家使用 `消息渠道/运营简报.txt`；详情和产出展示真实模拟差异。 | `patch(path=当前文件, patch=演示修改)`；模拟保存后 `tool.complete` 携带差异，并发 `result.add(operation=modified)`；无目标文件则返回失败。 |
| `演示工具：搜索文件内容` | 搜索文件内容 · 良率 | 搜索范围在详情；行内更新进展，结束后列相对路径、行号、命中内容。 | `search_files(pattern=良率, target=content, path=分析资料)`；结果 `matches[].path/line/content`；演示进展来自模拟 `tool.progress`。 |
| `演示工具：搜索文件` | 搜索文件 · *.csv | 搜索范围在详情；结束后只列命中文件的相对路径。 | `search_files(pattern=*.csv, target=files, path=分析资料)`；结果 `files[]`；演示进展来自模拟 `tool.progress`。 |

#### 网页与检索

| 触发词 | 活动组标题要点 | 活动行与展开详情检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示工具：搜索网页` | 搜索网页 · 工业设备质量标准 | 活动行只保留查询词；详情先显示返回网页数，标题可新开网页，悬停标题显示最多四行的描述。 | `web_search(query=工业设备质量标准, limit=5)`；模拟结果 `success=true, data.web[]` 含 1 条网页；无逐条 `tool.progress`。 |
| `演示工具：读取网页` | 读取网页 · example.com/report/a 等 2 个网页 | 活动行不显示进度或完成数量；详情先显示已读取数，再按网页列可打开的标题，悬停标题显示最多四行的提取内容。 | `web_extract(urls=[a,b], char_limit=15000)`；`result.results[]` 含 2 条有正文的网页；无逐页 `tool.progress`。 |

#### 命令、代码与后台进程

| 触发词 | 活动组标题要点 | 活动行与展开详情检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示工具：执行命令` | 活动组只显示“执行命令”；活动行带 `rg -n -F` 核对命令摘要 | 运行参数只显示命令；从当前演示文件检索最后一条记录，`output` 与文件内容对应。 | `terminal(command=rg -n -F …, workdir=/workspace, timeout=30)`；工作目录和超时仍为调用参数，但不在运行参数展示。结果 `exit_code=0, output=当前文件命中行`，未执行命令。 |
| `演示工具：启动后台命令` | 活动组只显示“启动后台命令”；活动行带当前资料的核对脚本摘要 | 运行参数只显示命令；脚本启动后返回同一演示进程标识，工具调用结束不等于后台进程结束。 | `terminal(command=核对脚本, background=true, notify=true)`；后台运行和完成通知仍为调用参数，但不在运行参数展示。结果 `session_id=proc_4dae56ca81f6, exit_code=0` 只表示已启动。 |
| `演示工具：长详情` | 活动组只显示“执行命令” | `output` 为 60 条不同批次的抽检与良率记录；超出详情容器后在内部滚动。 | `terminal(command=批次输出脚本, workdir=/workspace)`；`tool.complete.result.output` 为 60 行；仅检查长结果滚动。 |
| `演示工具：运行代码` | 活动组只显示“运行代码”；活动行带计算代码摘要 | 根据当前演示文件中的良率数据计算样本数、平均值和最低值，代码与 `output` 对应。 | `execute_code(code=计算当前样例, reset=true)`；结果 `status=success, exit_code=0, output=计算值`。 |
| `演示工具：后台进程` | 活动组和活动行只显示“查询后台进程” | 常规查询没有活动详情，不把查询时的进程状态留在已结束的活动行。 | `process_manage(action=poll, session_id=proc_4dae56ca81f6)`；结果 `status=running, output_preview=开始核对当前文件`，仅为本次查询快照。 |
| `演示工具：等待后台进程` | 活动组和活动行只显示“等待后台进程” | 本次等待达到上限但进程仍在运行时没有活动详情，不把进程的瞬时状态当作本次等待活动的状态。 | `process_manage(action=wait, session_id=proc_4dae56ca81f6, timeout=5)`；结果 `status=timeout, process_running=true`。与启动、查询共用演示 ID，但不会自动串行调用，也不会反向更新旧活动。 |

#### 能力管理与外部连接

| 触发词 | 活动组标题要点 | 活动行与展开详情检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示工具：列出技能` | 查看可用技能 | 活动行只显示名称，成功时没有展开详情。 | 模拟 `skills_list()` 返回当前专家可用技能的 `skills/categories/count`，结果不复制到处理详情。 |
| `演示工具：查看技能` | 查看技能 · 质量分析 | 活动行显示技能名，成功时没有展开详情。 | 模拟 `skill_view(name=质量分析)` 返回 `success/name/content` 等字段；`description` 可缺失，不作为详情前提。 |
| `演示工具：更新记忆` | 更新记忆 | 活动组和活动行都只显示“更新记忆”；成功时没有展开详情，不显示文件 diff 或记忆正文。记忆关闭的专家不生成工具活动。 | 本地模拟 `memory(action=replace,target=memory,old_text=旧约定,content=新约定)` 返回成功确认；不写入真实 Hermes 记忆。内置工具没有“检索记忆”动作。 |
| `演示工具：外部 MCP` | 调用外部工具 · mcp__tickets__search | 活动组和活动行保留完整工具名；详情只显示“请求参数”和“返回结果”，不重复写工具名，也不模拟固定进度。 | 本地模拟工单搜索：`args.query=产线停机`、`args.limit=2`，结果包含 2 条工单及状态；不代表已连接真实工单服务。 |

### 2.2 工具终态与缺失事件

以下场景仍是本地模拟，用于核对单项工具与整个回合的状态边界。完成后展开“处理经过”，核对活动行及详情；回合状态行仍可为“已完成”。

活动呈现沿用 §2.1 的对应工具：搜索网页、执行命令、读取文件或写入文件。本节只覆盖失败、阻断、中断和事件缺失的差异。

| 触发词 | 工具活动预期 | 主要检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示工具：失败结果` | 未完成 | `success:false` 与错误内容结算同一工具；错误原因留在详情，回合不因单项失败自动变成处理失败。 | `web_search(query=演示异常批次)`；`tool.complete.result={success:false,error:…}`，父回合仍按自身结果收口。 |
| `演示工具：策略阻断` | 未获授权 | 明确阻断只影响该工具；不凭空生成用户审批回复。 | 使用 §2.1“执行命令”的命令参数，本地改为 `tool.complete.result={status:blocked,exit_code:-1,error:…}`；无顶层工具状态和 `approval.request`。真实执行前拦截还可能不投递完成事件。 |
| `演示工具：中断执行` | 已中断 | 工具中断与回合中断分开；活动行使用文字状态，不出现终态勾叉。 | 使用 §2.1“执行命令”的命令参数，本地改为 `tool.complete.result={status:cancelled,exit_code:-1,error:…}`。父回合仍完成仅用于验证状态独立。 |
| `演示工具：缺少结束事件` | 状态待核对 | 复用“读取文件”的对象与行内信息；回合收口后不把缺失终态误判为成功。 | 使用 §2.1“读取文件”的当前演示文件，只发 `tool.start`，故意不发 `tool.complete`，不伪造逐行进度。 |
| `演示工具：仅收到完成事件` | 已完成 | 运行时不预造活动；收到带调用 ID 的完成事件后只补建一行，不回填虚构的开始与进度。 | 使用 §2.1“写入文件”的参数和产出，只跳过 `tool.start`，收到 `tool.complete(result.verified=true)` 后仍生成对应文件卡。 |

### 2.3 结果与产物

写入文件和修改文件均复用 §2.1 的工具活动模板；本节重点检查文件卡、单次调用与产出来源的关联。工具保存成功后可先收到 `result.add`，但本轮产出卡片要在最终回复收口后才出现；中途回复以及单项写入或修改完成都不触发卡片提前展示。

| 触发词 | 展示位置 | 主要检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示工具：生成结果文件` | 工具活动＋回合文件卡 | 写入确认本身无详情；文件名下方显示 `workspace/演示核对报告.md`，卡片分别提供预览、下载，均使用本轮快照。该文件会加入工作空间；不是真实 Hermes 工具执行。 | `write_file(path=演示核对报告.md,content=演示正文)`；`verified=true` 后，本地 `result.add(operation=created,sourceToolId=本次调用)`。 |
| `演示产出：多个文件` | 12 张新建文件卡 | 不显示额外标题与数量汇总；文件卡随宽度分列，最多四列，路径位于文件名下方并以 `workspace/` 开始；超出容器高度时内部上下滚动。 | 复用 §2.1“写入文件”建立 12 次独立调用，每次写一个批次报告；各有自己的 `tool_id`、活动行及一条 `result.add(operation=created,sourceToolId=本次调用)`。 |
| `演示产出：修改文件` | 既有文件修改卡 | 卡片标为“已修改”，悬停标签查看本轮差异，预览和下载使用同一本轮版本。 | 一次模拟 `patch(path=当前专家文件)`；完成后 `result.add(operation=modified,sourceToolId=本次调用)`；路径随专家变更。 |
| `演示产出：新建和修改文件` | 同一回合含两条工具活动、两张文件卡 | 先模拟写入 `质量核对摘要.md`，再修改当前专家的演示文件；两张卡分别关联工具与本轮版本。 | 顺序复用 §2.1“写入文件”和“修改文件”，各有独立 `tool_id` 与 `tool.complete`；分别发 `result.add(created/modified)`。 |

## 3. 人工介入

请求在模拟文字输出后出现在输入区上方；请通过对应卡片回应。用户尚未作出决定时，右侧不生成回复气泡。

### 3.1 澄清

产品实际默认有效期为 **5 分钟**；本地“演示澄清超时”将等待缩短为 **10 秒**，只用于快速检查超时与补答。多题澄清整组共用一次实际有效期。

| 输入或操作 | 演示场景 | 主要检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `请澄清`，再提交回复 | 单题澄清 | 统一澄清浮窗接收回复；被接收的问答气泡随处理过程收起，回合继续。 | 无普通工具调用；本地 `request.open(kind=clarify,choices=[]) → request.resolve(response=文本)`，随后 `message.complete`。 |
| `请单选澄清` | 单题选项澄清 | 预置项与自定义回答各有选择控件；聚焦自定义输入后自动选中，并与单选项互斥；右上角显示 `1/1`。 | `request.open(kind=clarify,choices=[最近一周,本月],multiSelect=false)`；提交后 `request.resolve`。 |
| `请多选澄清` | 单题多选澄清 | 自定义回答可单独勾选，也可与预置项组合提交；取消勾选时清空自定义输入。 | `request.open(kind=clarify,choices=[1号产线,2号产线],multiSelect=true)`；回复以数组提交 `request.resolve`。 |
| `请多题澄清` | 多题澄清 | 逐题切换并显示当前题号／总题数；前几题只暂存页面草稿，最后一题统一提交整组答案。 | `request.open(kind=clarify,questions=[time,line])` 时 `answers={}`；点击最终“提交回复”后才按题记录结果并 `request.resolve`，此前没有逐题服务端回执。 |
| `请澄清`，点击“跳过” | 主动跳过 | 记录用户跳过决定，专家继续；不显示为超时未答。 | `request.resolve(kind=clarify,skipped=true,response="")`；无工具调用，区别于 `request.expire`。 |
| `演示澄清超时`，等待超时 | 未回答自动继续 | 澄清浮窗撤下；处理过程左侧显示超时记录，不生成用户回复气泡。 | `request.open(kind=clarify) → request.expire(autoContinue=true)`；后续 `message.complete`，无用户回复或工具调用。 |
| `演示澄清超时`，超时后点击“补充回答” | 当前回合补答 | 从超时记录打开同一澄清浮窗；仅在演示事件确认本回合接收后归入当前回合。 | 回合仍运行时发送本地 `request.late_answer(mode=current,text=补答)`；旧请求仍保留超时事实。 |
| `演示澄清超时`，回合结束后展开过程并补答 | 后续回合补答 | 新回合以人工介入气泡呈现补答；旧超时记录仍可追溯。 | 旧请求标记 `lateAnswerMode=next`，随后 `sendDemoMessage(超时补答：…)` 创建新回合；不向已结束回合补发原 `request.resolve`。 |

### 3.2 操作审批

产品实际默认有效期为 **5 分钟**；本地“演示审批超时”将等待缩短为 **10 秒**，只用于快速检查未授权后的收口。切换允许范围不重置有效期。

| 输入或操作 | 演示场景 | 主要检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `请审批`，打开允许范围菜单 | 多档授权 | 可在“允许本次”“允许本会话”“始终允许”中切换；卡片说明随选择同步变化，选择本身不提交。 | `request.open(kind=approval,choices=[once,session,always,deny])`；切换范围只是前端选择，未发 `request.resolve`。 |
| `演示审批长命令` | 长命令审批 | 命令在卡片内最多显示四行，超出省略；悬停命令时，浮窗显示完整的多行命令，内容过长可在浮窗内滚动。 | 本地模拟 `python scripts/analyze_yield.py` 携带多项分析参数；只展示请求，不执行脚本。 |
| `请审批`，选择“始终允许”并提交 | 持续授权确认 | 浮窗直接展示待执行命令，不重复显示操作标题和通用说明；确认持续匹配范围后才记录决定，取消确认不提交。 | 本地模拟 `terminal(command=python scripts/analyze_yield.py --input 分析资料/良率样例.csv)`；确认后 `request.resolve(response=always)` 才模拟工具调用，实际不执行脚本。 |
| `请审批`，选择拒绝 | 拒绝本次活动 | 右侧记录“拒绝”；本次操作不执行，回合回到处理中并按实际结果收口。 | `request.resolve(response=deny)`；不发送后续 `tool.start`，父回合经中途说明后 `message.complete(status=complete)`。 |
| `请审批仅允许本次` | 单档授权 | 只显示“允许本次”和“拒绝”，允许按钮没有范围切换箭头。 | `request.open(kind=approval,choices=[once,deny])`；提交 `once` 后才模拟 `terminal`。 |
| `请审批仅允许本会话与始终` | 受限多档授权 | 菜单只提供“允许本会话”“始终允许”，不出现“允许本次”。 | `request.open` 的允许范围为 `session/always`，另有 `deny`；只接受本请求提供的选项。 |
| `请审批仅允许本会话` | 仅会话范围 | 只有“允许本会话”一种允许范围，不显示切换箭头。 | `request.open` 的允许范围为 `session`，另有 `deny`；提交后 `request.resolve(response=session)`。 |
| `请审批仅始终允许` | 仅永久范围 | 只有“始终允许”一种允许范围，不显示切换箭头。 | `request.open` 的允许范围为 `always`，另有 `deny`；确认后 `request.resolve(response=always)`。 |
| `演示审批超时`，等待超时 | 审批未获回应 | 撤下待处理卡片，折叠过程内记录“已超时”；不生成拒绝气泡或执行活动。 | `request.open(kind=approval) → request.expire(autoContinue=true)`；不生成 `terminal` 调用，后续回合按现有资料完成。 |
| `演示并行审批` | 两项待处理请求 | 两张审批卡中部各只展示执行命令，请求可逐项切换、独立允许或拒绝；先处理一项不清除另一项。 | 两个独立 `request_id` 的 `request.open(kind=approval)`；各自 `request.resolve`。仅允许的项各模拟一次 `terminal`，拒绝项不执行。 |

## 4. 当前会话状态与本轮结果

本章场景本期不开放，原有本地演示触发词已移至 §7.4。第 1 节的输入资料引用、§2.3 的文件产出，以及第 3 节的澄清和审批仍属本期范围。

## 5. 阶段、恢复与异常

| 输入或操作 | 演示场景 | 主要检查点 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示模型等待` | 模型等待 | 有意义的等待独立成行，不进入“思考”活动；结束后原行更新。历史仅从本地已保存的阶段记录恢复。 | 无工具调用；本地模拟 `thinking.delta(text=正在等待模型响应)`，后以空文本结束该等待，再 `message.complete`。真实 Hermes 的等待由运行时状态触发，不由用户输入词触发。 |
| `演示上下文压缩` | 上下文压缩 | 阶段行由正在压缩更新为压缩完成。 | 无工具调用；`status.update(kind=compacting) → status.update(kind=compacted)`，不显示内部摘要原文。 |
| `演示服务重连` | 服务重连 | 阶段行原位更新为连接已恢复。 | 无工具调用；`status.update(kind=lifecycle,phase=reconnecting/reconnected)`。 |
| `演示恢复中` | 回合恢复 | 回合状态行依次显示“处理中 → 正在恢复 → 处理中 → 已完成”，不额外显示“核对回合状态”提示。 | 本地先发 `error(terminal=true)`，再 `session.info(running=true)` 确认仍在运行，随后 `message.complete`；同时模拟普通工具，有演示文件时为 `read_file`，否则为 `list_files`。 |
| 发送 `演示过程`，在回合仍显示“处理中”时点击输入区“停止生成”按钮 | 用户主动中断 | 回合状态行显示“已中断 · 用时”；保留已生成的文字，已有处理过程默认收起且仍可展开查看，不出现整轮失败的红色错误卡片。 | 原型调用 `stopDemoStream()` 并模拟 `message.complete(status=interrupted)`；真实 Hermes 由 `session.interrupt` 请求停止，最终以回合终态事件为准。此操作结束当前回合，不是暂停后原位继续。 |
| `演示运行异常` | 整轮处理失败 | 回合状态先显示“正在恢复”，随后以“处理失败 · 用时”收口；中途说明收入可展开的处理过程，保留已生成的部分回复，并在回复后显示红色错误提示。不生成工具活动。 | 本地 `message.interim → error(terminal=true) → message.complete(status=error,partial=true,error=…,error_surface.layer=gateway)`；有明确的回合失败终态，不以 `session.info(running=false)` 推断失败。 |

## 6. 本地演示的匹配、组合与限制

| 规则 | 当前演示行为 | 使用建议 | 备注（接口／事件边界） |
| --- | --- | --- | --- |
| 完整触发词 | 去除首尾空白后，只有表中完整触发词才进入对应场景；例如“请分析审批和澄清流程”是普通回复。 | 单独发送触发词；不要在后面追加说明或拼接另一条触发词。 | 本地 `sendDemoMessage()` 的演示指令白名单；不影响正常任务文字、附件和资料引用，也不是 Hermes 工具路由规则。 |
| 明确组合 | `并行过程` 同时模拟两项工具和中途说明；其他多工具、多产出或并行审批使用各自列出的专项场景。 | 只按本表列明的组合场景验收；任意拼接触发词不会合成场景。 | 并行工具按各自 `tool_id` 结算；多项审批按各自 `request_id` 独立处理。 |
| 人工请求 | `请审批` 与 `请澄清` 等完整触发词各生成相应请求；`演示并行审批` 明确生成两项。 | 使用对应完整触发词，不把旧凭据或 MCP 设置演示视为本期能力。 | 普通文字中出现“审批”“澄清”不发 `request.open`；正式产品可同时处理多个实际请求，不沿用文字匹配限制。 |
| 通用工具别名 | `演示进度`／`查看进度`、`工具详情`、`文件差异` 等各自映射固定的本地工具场景。 | 验收具体工具时优先使用第 2 节的专项触发词。 | 不再按一句话里“进度”“工具”“文件”的出现顺序决定工具；普通文字不会因此调用模拟工具。 |
| 专项工具 | `演示工具：…` 和产出类专项触发词均要求完整匹配；未列出的组合文字走普通回复。 | 一次发送一条完整触发词。 | `findToolActivityScene()` 精确匹配场景名，结果由该场景的 `name/args/result/status` 模拟，不依赖数组排列顺序。 |
| 终态与产出 | `演示运行异常` 验收整轮失败，`演示工具：失败结果` 验收单项工具失败；输入引用不自动成为本轮产出。 | 分别核对回合和工具的终态，再核对真实产出入口。 | 本地 `message.complete` 与 `tool.complete` 各自结算；文件产出须另有 `result.add`。 |
| 本地生命周期 | 事件、文件和状态只在浏览器本地。切换或离开当前任务会中断正在生成的模拟流；已经进入等待回应的请求仍有效，在同一页面运行期间可继续回应或到期。 | 不以任务切换推断用户拒绝或请求超时；真实 Hermes 接入后另验收服务端运行与恢复。 | 本地计时器不提供跨页面刷新或关闭浏览器的可靠恢复；正式请求有效期须由后端维护。 |

源码入口：[本地演示调度](../src/demo/state.js)；产品需求见 [experts_conversation_prd.md](./experts_conversation_prd.md)。

## 7. 本期不开放

以下触发词仍可能在本地模拟器中运行，只用于核对旧原型或已保存的历史记录，不作为本期专家新会话的功能验收范围。正式接入时不开放对应的产品功能；涉及本期不开放的 Hermes 工具时，还须默认关闭工具并从新会话提供给模型的清单中排除。工具输出风险提示仅是本期不验收的展示场景，不影响 `web_search`、`web_extract` 的开放范围或 Hermes 自身的风险检测。

### 7.1 子代理、历史搜索与并行模型

| 旧触发词 | 演示内容 | 本期范围 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示子代理阶段` | 单个子代理的派发、开始、进展与完成。 | `delegation`（`delegate_task`）默认隐藏并关闭。 | 不模拟额外 `delegate_task` 工具行；依次发 `subagent.spawn_requested/start/progress/complete(status=completed)`，按子代理 ID 更新同一活动。 |
| `请用子代理分析资料` | 子代理与文件读取并存。 | 新会话不派发子代理。 | 上述 `subagent.*` 事件之外，因“资料”关键词另模拟 `read_file(path=当前文件)`；两者各有身份，不合并为工具调用。 |
| `演示并行子代理` | 两项子任务独立完成。 | 新会话不派发子代理。 | 两个 `subagent_id` 的 `spawn_requested/start/progress/complete`；第二项可先完成，不改第一项状态。 |
| `演示子代理失败` | 子代理局部失败。 | 新会话不派发子代理。 | `subagent.complete(status=failed,summary=资料不足)`；父回合仍可 `message.complete(status=complete)`。 |
| `后台子代理核对资料` | 父回合先结束，后台子代理后完成。 | 新会话不派发子代理。 | `subagent.spawn_requested/start/progress`；另因“资料”模拟 `read_file`。父回合完成后约 2 秒才发 `subagent.complete(status=completed)`。 |
| `演示工具：搜索历史对话` | Hermes 会话搜索、标题与命中摘要。 | `session_search` 默认隐藏并关闭；不做跨任务定位入口。 | 模拟 `session_search(query=良率,limit=3)`；`result.mode=discover`，含 `results[].session_id/title/when/snippet`；本地旧原型仍可能显示任务定位。 |
| `请使用并行模型` | 遗留参考模型意见演示。 | 并行模型不纳入本期处理活动。 | 无普通工具调用；模拟 `moa.progress/reference/phase`，最终答复仍由 `message.complete` 提供。 |

### 7.2 外部检索、界面与媒体

| 旧触发词 | 演示内容 | 本期关闭范围 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示工具：搜索 X` | X 搜索结果。 | `x_search`。 | `x_search(query=设备维护)`；模拟 `result.results[]`，无真实外部请求。 |
| `演示工具：操作浏览器` | 打开示例网页。 | `browser`。 | `browser_navigate(url=https://example.com/report)`；模拟 `tool.progress` 与 `result.verified=true`，不打开真实网页。 |
| `演示工具：操作电脑` | 截取当前电脑画面。 | `computer_use`。 | `computer_use(action=capture)`；仅返回模拟确认，不采集真实屏幕。 |
| `演示工具：操作桌面界面` | 查看当前窗口。 | `desktop_ui`、`project`。 | `desktop_preview(action=查看当前窗口)`；仅返回模拟确认，不读取真实窗口。 |
| `演示工具：分析图片` | 对示例图片提出缺陷检查问题。 | `vision`。 | `vision_analyze(image_url=分析资料/样本.png,question=检查可见缺陷)`；模拟进展与 `result.summary`，不读取真实图片。 |
| `演示工具：分析视频` | 对示例片段提出动作检查问题。 | `video`。 | `video_analyze(video_url=分析资料/产线片段.mp4,question=检查异常动作)`；模拟 `result.summary`，不读取真实视频。 |
| `演示工具：生成图片` | 图片生成确认。 | `image_gen`。 | `image_generate(prompt=工业设备示意图,aspect_ratio=square)`；模拟 `verified=true`，不生成真实图片。 |
| `演示工具：生成视频` | 视频生成确认。 | `video_gen`。 | `video_generate(prompt=产线运行演示,duration=5,aspect_ratio=landscape)`；模拟 `verified=true`，不生成真实视频。 |
| `演示工具：生成语音` | 语音生成确认。 | `tts`；语音转文字 `stt` 也不开放。 | `text_to_speech(text=演示播报,speed=1)`；模拟 `verified=true`，不生成真实音频。 |

图片作为输入资料上传仍按第 1 节演示；这不表示可以调用图片分析工具。`web_search`、`web_extract` 未列入关闭范围，第 2 节网页演示继续保留；真实使用仍取决于服务提供方是否就绪，Hermes 可选择免密后备服务。

### 7.3 管理与外部平台

| 旧触发词 | 演示内容 | 本期范围 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示工具：配置 MCP` | 模型直接发起 MCP 配置。 | `desktop_ui` 中的 `setup_mcp` 默认关闭；专家管理页配置仍保留。 | `setup_mcp(server=演示服务,action=enable)`；模拟 `result.verified=true`，无人工请求。 |
| `MCP 设置确认` | 配置前的人工确认。 | 不作为本期会话状态能力；已启用外部 MCP 工具仍按管理页配置提供。 | `request.open(kind=mcp_setup,choices=[approved,rejected])`；允许后才模拟 `setup_mcp(server=演示服务,action=enable)`，拒绝则无工具调用。 |
| `演示工具：平台连接` | Discord 平台工具调用。 | `discord`、`discord_admin` 默认隐藏并关闭。 | `discord(action=read_channel,channel=演示频道)`；仅模拟 `verified=true`，不连接平台。 |
| `凭据演示` | 旧凭据请求。 | 本期会话状态区仅验收澄清和审批。 | `request.open(kind=secret)`；仅接受本地 `submitted/rejected` 决定，不采集真实密钥，不发后续工具调用。 |
| `管理员密码演示` | 旧管理员权限请求。 | 本期会话状态区仅验收澄清和审批。 | `request.open(kind=sudo)`；仅接受本地 `submitted/rejected` 决定，不采集真实密码，不发后续工具调用。 |

`spotify`、`cronjob`、`a2a`、`homeassistant`（`ha_*`）、`kanban`（`kanban_*`）、`feishu_doc`／`feishu_drive`、`yuanbao`（`yb_*`）和 Hermes 桌面项目工具本期也默认隐藏并关闭；当前没有对应的本地演示触发词。`code_execution`、`process_manage` 保留，仍按第 2 节演示。上述关闭只限制模型可调用的 Hermes 工具，不删除产品的工作空间、项目、事件中心定时触发或 MCP 管理功能。具体技术映射见[工具活动呈现对照表 §12](./experts_conversation_tool_activity_matrix.md#12-本期不开放)。

外部记忆提供方及其检索、写入工具本期不开放，也没有本地演示触发词。内置记忆由 `MEMORY.md`／`USER.md` 加载到模型上下文，不产生“检索记忆”的工具活动；本期只演示内置 `memory` 的写入类调用。

### 7.4 当前会话状态与待办结果

第 4 章的下列场景本期均不开放；本地脚本可能仍响应这些触发词，但不作为验收入口。`todo_list` 工具也随待办场景默认隐藏并关闭。这里的“本轮结果”仅指待办清单快照，不包含本期保留的文件产出。

| 旧触发词 | 原演示内容 | 本期处理 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示工具：管理待办` | 工具更新当前待办。 | 不提供待办工具和会话状态卡；仅用于旧原型和历史兼容。 | `todo_list(todos=[核对资料:in_progress,整理结论:pending],merge=false)`；`tool.complete` 含 `todos/revision/summary`，变更时另发 `todo.updated`。 |
| `列出待办` | 当前待办清单。 | 不提供待办工具和会话状态卡。 | 无 `todo_list` 工具调用；本地 `todo.updated` 建立或沿用当前快照，附 `revision`。 |
| `层级待办` | 含父子关系与取消项的清单。 | 不提供待办工具和会话状态卡。 | 无工具调用；`todo.updated(todos[].parent/status)` 建立层级样例。 |
| `完成待办` | 更新已有待办状态。 | 不提供待办工具和会话状态卡。 | 无工具调用；`todo.updated` 将首项改为 `completed` 并递增 `revision`。 |
| `生成待办结果` | 将当前待办保存为回合结束后的清单快照。 | 不生成待办类本轮结果；文件产出仍按 §2.3 验收。 | 无工具调用；先确保本地 `todo.updated` 快照，回合结束时 `result.add(kind=todo,items=当前清单)`。 |
| `设置目标` | 长期目标状态。 | 不展示长期目标卡。 | 无工具调用；`session.control.update(control.goal.status=active)`。 |
| `目标等待` | 目标与等待条件。 | 不展示目标等待状态。 | 无工具调用；`session.control.update` 含 `goal.wait_barrier(type=until,until_at=未来时间)`；不会因输入含“等待”而额外模拟 `thinking.delta`。 |
| `演示排队任务` | 建立队列快照。 | 不展示排队任务状态。 | 无工具调用；`queue.updated(tasks=[3 项],revision+1)`。 |
| `清空排队任务` | 清除队列快照。 | 不展示排队任务状态。 | 无工具调用；`queue.updated(tasks=[],revision+1)`。 |
| `设置循环` | 循环状态。 | 不展示循环状态卡。 | 无工具调用；`session.control.update(control.loop={status:active,mode:interval,interval_seconds:300})`。 |
| `查看心跳` | 心跳状态。 | 不展示心跳状态卡。 | 无工具调用；`session.control.update(control.heartbeat={status:active,interval_seconds:600})`。 |
| `引用资料` | 仅由文字触发的旧演示。 | 此旧触发词不验收；输入区的资料引用操作仍按 §1 验收。 | 完整发送此旧触发词不会生成 `references[]`，但仍模拟普通读取：有演示文件时为 `read_file`，否则为 `list_files`，不能当作真实引用。 |
| `账户通知` | 演示额度提醒出现。 | 不展示此类页面级账户通知。 | 无工具调用；`notification.show(key=credits.low,level=warning)`，不代表真实账户额度。 |
| `清除账户通知` | 演示额度提醒清除。 | 不展示此类页面级账户通知。 | 无工具调用；`notification.clear(key=credits.low)`。 |

旧脚本中的“层级待办和目标等待”组合也不纳入本期。已保存的相关历史数据可按可确认的事实兼容展示，但不能据此为新会话重新开放待办、目标、队列、循环、心跳或账户通知能力。

### 7.5 工具输出风险提示

| 旧触发词 | 原演示内容 | 本期处理 | 备注（本地模拟的接口与状态） |
| --- | --- | --- | --- |
| `演示工具：输出风险` | 网页读取活动完成后，在回合尾部另显示关联该工具的风险提示。 | 不作为本期展示或验收场景；网页读取工具本身仍按 §2 演示。 | 本地脚本模拟 `web_extract(urls=[example.com/quality]) → tool.complete`，随后发关联同一 `tool_id` 的 `tool.output_risk(risk=high,findings=[…],redacted=true)`；其中 `redacted=true` 仅是旧演示数据，不能据此认定 Hermes 已隐藏原始输出。 |
