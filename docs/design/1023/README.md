# 1023 产品设计文档

本目录存放 1023 迭代的产品设计 PRD。相对 `docs/design/` 下已有的 MVP 文档，这里只写**增量**：已定稿的专家管理、任务对话、项目看板仍以前者为准。

| 文档 | 说明 | 状态 |
|---|---|---|
| [prd.md](./prd.md) | 1023 迭代总览；§6 独立定时任务与 §6.10 根级事件绑定保留为历史方案，当前任务结构以 `experts_prd.md` 为准 | 草案，按模块完善 |
| [experts_prd.md](./experts_prd.md) | 按专家、项目、专家模板页面组织的当前 1023 需求；任务 Tab 为对话／消息渠道／自主任务（事件中心） | 持续完善 |

## 与已有 PRD 的关系

| 已有文档 | 覆盖范围 | 1023 可能改动 |
|---|---|---|
| `docs/design/expert-profile-mvp-prd.md` | 专家 CRUD、人设/技能/记忆/IM 渠道 Tab、工作空间 Tab | 人设 Tab 改为岗位说明并增加预置问题；工作空间预建 `消息渠道/`、`自主任务/`；任务 Tab 改为对话／消息渠道／自主任务（事件中心），Timer 归入事件中心，不提供独立定时任务；对话任务归档见 1023 §12；记忆总闸见 1023 §7（Provider 待定）；MCP Tab 增量见 1023 §15；**IM 渠道仅 `wecom` / `dingtalk` / `feishu`，不做 `wecom_callback`**。当前细节见 `experts_prd.md` |
| `docs/design/task-session-mvp-prd.md` | 任务对话页、工作空间/工作目录、斜杠命令、`@file` | 对话区优化、快捷指令；任务列表 ⋯ 与「不展示已归档」见 1023 §12；`@file` `allowed_root` 扩至工作空间根（原 §10.9.8 v1.1）提前到本期 |
| `docs/design/project-kanban-mvp-prd.md` | 项目看板、目标拆解、Kanban 归档 | 与对话任务归档分清：看板仍走卡归档，session 归档见 1023 §12；看板工作目录 ≠ 专家工作空间 |
| `docs/design/project-goal-decompose-impl.md` | 目标拆解实现方案 | 本期不直接改 |

## 使用约定

1. 1023 当前的专家、工作空间和任务页面规则以 [experts_prd.md](./experts_prd.md) 为准；[prd.md](./prd.md) 中标注为历史方案的独立定时任务与根级事件绑定不作为实现依据。
2. 每个模块补齐前，先对照 Hermes 现有能力（CLI / config / gateway / session），再写交互与接口。
3. 不在本目录复述 MVP 全文；只写「相对 MVP 要改什么」。
