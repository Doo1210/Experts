# 专家「对外 API」产品设计与实现方案

2026-11-24 · 评审稿

第三方后台收到为指定专家签发的 API Key 后，从首次请求起即可提交任务、异步查询结果，并通过 SSE 接收工具执行过程。配置与运行记录均从专家管理进入。首版支持文本输入和多轮续聊。首次提交由 DES 建立对话，后续提交带上返回的 `conversation_id`，沿用同一对话的历史。每条新消息启动一次独立运行，拥有新的 `run_id`。

## 一、实现方案

### 复用万悟 API Key 机制

万悟通用 OpenAPI Key 当前关联用户和组织，并支持状态和有效期。建议复用万悟的签发、管理和审计机制，新增**专家专用授权**及独立校验。每份授权只绑定一个租户、组织和专家，Key 版本归属于同一授权。轮换版本后，新 Key 可以查询该授权的已有运行，也可以继续该授权下的对话。完整密钥仅在签发或轮换时返回，服务端保存摘要。

| 模块 | 实现改动 |
| --- | --- |
| 万悟 app-service / BFF | 保存专家授权和 Key 版本。专家管理页调用用户权限下的创建、轮换、撤销接口。对外 OpenAPI 验证 Bearer Key、有效期、动作权限及路径专家 ID，再通过受认证的私有接口把授权上下文传给 DES。 |
| DES | 复用专家校验、模型归因、Gateway 激活和异步运行。按租户、组织、专家及授权 ID 验证对话和运行的归属。维护对话与 Hermes 会话的映射，并向每轮运行传入已完成的历史。保存状态、最终输出和可对外的事件，提供专家管理页的运行列表与详情查询。 |
| Hermes / SSE | 复用工具开始和完成事件。DES 在后台采集并持久化事件。外部订阅按事件序号读取已保存的事件，再接收实时增量。 |
| 部署 | 对外专家 OpenAPI 由万悟网关转发到 BFF。SSE 转发关闭代理缓冲，读超时覆盖心跳间隔。DES 和 Hermes 的执行入口通过服务间网络访问。 |

### 多轮会话与运行

| 字段 | 表示什么 | 在哪一步使用 |
| --- | --- | --- |
| `conversation_id` | DES 分配的对外对话 ID | 首次响应取得，后续提交带回。同一对话可以有多条运行。 |
| `run_id` | 一轮执行的对外 ID | 每次新提交取得，用于查询该轮结果及订阅该轮 SSE。 |
| Hermes `session_id` | 专家运行时的会话 ID | DES 在内部维护与对话的映射，每轮派发时传给 Hermes。 |

#### DES 如何保存和传递上下文

1. **受理与绑定**。首轮在同一个事务里创建对话、分配内部 Hermes 会话 ID、创建运行并写入待派发记录。续聊从已验证的授权中取得租户、组织、专家及授权 ID，并按这四项核对 `conversation_id`。找不到可访问的对话时返回 HTTP `404`。调用方提交的 ID 只用于定位对话，执行用的 Hermes 会话 ID 由服务端查询。
2. **读取历史并派发**。同一对话的每轮运行复用已绑定的 Hermes 会话 ID。DES 按轮次读取此前成功提交并已完成的问答，将用户输入与最终答复组成 `conversation_history`，再把当前问题作为 `input` 传给 Hermes。沿用现有历史读取和长度预算，按完整问答裁剪。运行失败、取消和未完成的轮次，以及工具日志，保存在对应运行的记录中。本轮模型上下文取自 DES 已保存的成功问答。派发时使用 Hermes 已有的 `trusted_context.history_mode=replace`，显式传入 `conversation_history`。历史为空时传空数组。后台派发重试沿用该轮已保存的派发载荷和派发 ID。
3. **完成并接续**。后台记录工具事件和终态。成功时在同一事务中保存最终答复、标记完成并释放该对话的运行占用，保证下一轮受理时能读到上一轮的结果。失败或取消时一并提交终态并释放占用。DES 同时保存外部 `run_id` 与 Hermes 运行回执，便于按轮排查。

### 幂等与并发

- 幂等键按租户、组织、专家及授权隔离，请求指纹包含 `input` 和请求原本携带的 `conversation_id`。相同键及内容返回原 `conversation_id` 和 `run_id`。同一个键换了问题或会话 ID 时返回 HTTP `409`。首轮响应丢失时，重试沿用原来省略 `conversation_id` 的请求。
- 每个对话同一时间只允许一条未终态运行，排队、运行及等待审批或澄清都占用该对话。服务端先检查是否为已受理请求的幂等重试，再在提交事务内检查并占用对话。不同幂等键的并发新消息只有一个能受理，其余返回 HTTP `409` 和 `CONVERSATION_BUSY`。调用方等当前轮结束后再重试被拒绝的提交。不同对话可独立运行。

### SSE 事件与结果

提交时先持久化运行和待派发记录。后台继续执行并保存终态，因此调用方可以只轮询结果。

SSE 首版提供 `message_delta`、`tool_started`、`tool_completed` 及运行终态事件。工具开始帧提供工具名和脱敏预览，完成帧补充耗时、执行状态、脱敏结果及截断标记。等待审批或澄清时传对应事件和状态。每条运行维护自己的事件序号，`Last-Event-ID` 用于续接当前 `run_id`。新一轮使用新 `run_id` 建立订阅。游标过期后，调用方仍可在结果留存期内通过查询接口取终态。

### 原型实现

| 位置 | 改动 |
| --- | --- |
| [ExpertManage.vue](../src/demo/pages/ExpertManage.vue#L343) | 在 `tabs` 中于 `im` 后注册 `api`，接入 `ExpertExternalApiTab.vue`，通过 `?tab=api` 打开。 |
| [TaskOverview.vue](../src/demo/components/TaskOverview.vue#L9) | 在现有三个分区后加入 `api` 分区、运行列表和详情抽屉。用 `?tab=task&section=api` 支持直达，切换时保留已有路由上下文。 |
| [state.js](../src/demo/state.js) | 按专家 ID 保存演示授权、对话和运行记录。每条运行通过 `conversation_id` 关联对话，使用模拟状态与工具事件。明文演示 Key 只存在于创建成功弹窗的临时状态。 |

演示数据包含「MES 质检系统」的有效 Key，以及运行中、成功、失败的调用记录。同一对话下预置两条成功运行，首轮返回异常点位，第二轮追问该点位的原因。两条记录共享一个 `conversation_id`，各有自己的 `run_id`。首轮展示工具开始、完成事件和最终输出。原型的「复制示例」使用演示域名和凭证占位符。

### 验收要点

- 从专家管理的「对外 API」创建 Key，再通过「查看调用记录」跳到同一专家的「任务 → API 调用」。两处入口与表中的位置一致。
- 后台仅凭有效的专家 Key 即可从首次请求提交任务、查询结果及订阅 SSE。其他专家或另一授权的运行均不可读取。
- 首轮提交返回对话 ID 和运行 ID。次轮带上同一对话 ID 后获得不同的运行 ID，模型能结合首轮最终答复回答追问。另建对话时，传给模型的历史仅包含新对话自己的问答。
- 首轮与续聊的幂等重试都返回原对话和运行，同一幂等键修改请求内容返回 409。同一对话并发提交只受理一条新运行，上一轮结束后可继续。没有 SSE 客户端时任务仍能完成并查询结果。
- SSE 能收到工具开始和完成事件，回放从上次收到的序号之后恢复。脱敏、截断与管理台详情展示一致。
- 轮换后，新 Key 可读取同一授权下的旧运行并续聊。同专家下另一份授权传入该对话 ID 时返回 404。撤销后，旧 Key 无法再提交、查询或订阅，已建立的订阅在重新校验时关闭。

### 源码定位

- 万悟的 Key 模型和认证位于 `internal/app-service/client/model/openapi_key.go` 与 `internal/bff-service/server/http/middleware/auth_openapi.go`。
- DES 的异步运行、历史组装和事件转发位于 `digital-employee-service/internal/conversation/service.go`、`history.go` 和 `run_stream_hub.go`。向 Hermes 传递会话 ID 及历史的逻辑位于 `digital-employee-service/internal/hermes/run_proxy.go`。
- Hermes 的工具事件格式位于 `gateway/platforms/api_server.py`。

## 二、产品设计

| 入口 | 位置 | 用途 |
| --- | --- | --- |
| **对外 API** | 专家管理左侧导航，「消息渠道」下方 | 开通当前专家的对外调用、创建和管理 API Key、复制接口地址、查看调用指南 |
| **API 调用** | 专家管理「任务」页第四个分区，排在「自主任务（事件中心）」之后 | 查看每次 API 运行的状态、工具执行过程和最终结果 |

### 对外 API

页面标题为「对外 API」。说明文案为「第三方系统可使用 API Key 调用当前专家、查询结果并订阅工具执行过程。」

- **首次进入**显示当前专家和「未开通」状态，主按钮为「开通并创建 API Key」。弹窗固定当前专家及组织，管理员填写接入系统名称与有效期。开通和首次签发成功后显示完整 Key，用户在弹窗中复制保存。关闭弹窗后，列表只显示掩码和尾号。
- **已开通**时展示接入状态、专家 ID 和 API 地址，后两项可复制。没有有效 Key 时提示创建。Key 列表展示系统名称、尾号、状态、有效期、最近调用时间，提供轮换、撤销操作。
- **调用指南**通过抽屉展示可复制示例，依次演示首次提交、用 `run_id` 查询结果及订阅 SSE，以及用首次返回的 `conversation_id` 继续追问。示例中的 Key 用环境变量占位。
- **查看调用记录**直达当前专家的「任务 → API 调用」。有专家管理权限的用户可以签发、轮换和撤销 Key，第三方后台在调用时使用签发的 Key。

### 任务 → API 调用

一次被接受的异步运行对应一条记录。同一幂等请求的重试继续使用原 `run_id`。列表按提交时间倒序展示接入系统、`run_id`、状态、提交时间和耗时。搜索框支持 `run_id` 和 `conversation_id`，来源系统和状态可筛选。搜索同一 `conversation_id` 可以看到对话下的所有运行。

点击「查看详情」打开只读抽屉，依次展示运行信息、处理过程和最终结果。

| 区域 | 展示内容 |
| --- | --- |
| 运行信息 | 来源系统、可复制的 `run_id` 和 `conversation_id`、运行状态、提交时间和耗时 |
| 执行过程 | 按时间展示正文和工具开始、完成事件。工具结果默认折叠，展开查看脱敏后的内容。结果被裁剪时显示「已截断」。 |
| 最终结果 | 成功展示专家输出，失败展示错误原因。等待审批或澄清时展示当前等待状态，取消时展示取消状态。 |

评审主流程为「质量分析专家 → 对外 API → 为 MES 质检系统创建 Key → 查看首轮及续聊示例 → 跳转 API 调用查看两次运行」。准备未开通、空记录、运行中、成功和失败等演示状态。

## 三、调用指南

### 接口与鉴权

以下是拟定路径，调用方统一使用 `Authorization: Bearer <EXPERT_API_KEY>`。

| 方法 | 路径 | 响应 |
| --- | --- | --- |
| POST | `/openapi/v1/experts/{expert_id}/runs` | 接收文本 `input`、可选的 `conversation_id` 和请求头 `Idempotency-Key`。返回 HTTP 202、`conversation_id`、`run_id` 和状态。 |
| GET | `/openapi/v1/experts/{expert_id}/runs/{run_id}` | 返回 HTTP 200、`conversation_id`、`run_id`、运行状态，以及终态的 `output` 或结构化 `error`。 |
| GET | `/openapi/v1/experts/{expert_id}/runs/{run_id}/events` | 返回 `text/event-stream`。使用 `Last-Event-ID` 续接保留期内的事件。 |

### 首轮提交

首次和续聊使用同一个提交接口。首次省略 `conversation_id`，DES 在接受请求时创建对话并随 `run_id` 一起返回。调用方保存 `conversation_id`，等当前轮结束后，下一轮只发送新的问题和这个 ID，并为该轮生成新的 `Idempotency-Key`。判断两条运行是否属于同一个会话，比较查询结果里的 `conversation_id`。

```http
POST /openapi/v1/experts/exp_quality/runs
Authorization: Bearer <EXPERT_API_KEY>
Content-Type: application/json
Idempotency-Key: mes-quality-001

{"input":"分析今天 A 线的良率异常。"}
```

HTTP `202` 响应示例。

```json
{"conversation_id":"conv_A","run_id":"run_001","status":"queued"}
```

### 查询结果与订阅 SSE

用首轮返回的 `run_001` 查询状态和结果。

```http
GET /openapi/v1/experts/exp_quality/runs/run_001
Authorization: Bearer <EXPERT_API_KEY>
```

需要实时查看正文和工具执行过程时，订阅同一轮的 SSE。

```http
GET /openapi/v1/experts/exp_quality/runs/run_001/events
Authorization: Bearer <EXPERT_API_KEY>
Accept: text/event-stream
```

断线重连时沿用该轮的地址，并在请求头中带上最后收到的事件序号 `Last-Event-ID`。查询到首轮状态为 `completed` 后，可使用 `conv_A` 发起追问。

### 续聊

沿用首轮的专家和 API Key，在请求体带上 `conv_A`，并为第二轮使用新的幂等键。

```http
POST /openapi/v1/experts/exp_quality/runs
Authorization: Bearer <EXPERT_API_KEY>
Content-Type: application/json
Idempotency-Key: mes-quality-002

{"conversation_id":"conv_A","input":"刚才提到的异常集中在哪个工序？"}
```

HTTP `202` 响应示例。

```json
{"conversation_id":"conv_A","run_id":"run_002","status":"queued"}
```

MES 接着查询 `run_002` 或订阅它的事件流。再次省略 `conversation_id` 并使用新的幂等键时，DES 会创建另一段对话。
