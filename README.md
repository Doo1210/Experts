# 数字员工纯演示前端

这是可独立运行的 Vue 2 演示工程，放在 `D:\CodingWorkSpace\IndustryAgentPlatform\专家`。页面基于现有 des-ui 的 Vue 2、Element UI、Vue Router 和 Vite 架构重建，并融合“数字员工”原型与 1023 PRD 中的页面规则。业务数据和任务执行使用浏览器中的演示数据，不连接 DES 或宿主业务 API；文件预览使用随项目部署的模拟内容与浏览器本地文件，不依赖本机预览服务。

## 启动

推荐 Node **22.10.0**、npm。首次运行：

```powershell
npm ci
npm run check:versions
npm run dev
```

打开 `http://127.0.0.1:5173/experts/`。使用 `http://127.0.0.1:5173/experts/?embed=1` 可检查宿主 iframe 布局。生产构建用 `npm run build`，本地预览用 `npm run preview`；Dockerfile 将静态页面部署在 `/experts/`。本工程不会修改宿主的 iframe 地址或线上部署。

## 文件预览演示

从 2026-11-24 起，本原型已移除本地 kkFileView 的上传同步、请求代理、兼容插件和解码依赖。开发、普通静态构建和 GitHub Pages 使用同一套纯前端预览，不需要任何文件转换服务。

- 质量分析专家的「文件预览示例」目录提供多格式样例，Pages 构建同样可见。已有浏览器的旧验收目录会迁移名称，保留文件身份和用户编辑，不补回已删除的样例。
- 专家对话页在原有阅读区预览；专家管理页点击文件名或「预览」新开网页。对话页保留文件标签、来源路径和新开网页入口；独立页不显示这些外层栏。
- Office／PDF 使用模拟分页文档，表格使用模拟只读网格及工作表，演示文稿可切换幻灯片，CAD／三维格式使用模拟工程示意图，HEIC／TIFF 等格式使用模拟图片。查看器明确标注「模拟预览」，不会把这些内容冒充为上传文件的真实转换结果。
- 文本、代码、Markdown、知识库文档和 Wiki 保留本地原文／快照；常见图片直接显示浏览器本地文件。图片和工程示意图支持缩放、拖拽、旋转与复位；模拟文档支持翻页与缩放。无打印、HTML 跳转、编辑或文件管理工具。
- 上传文件仅存入浏览器 IndexedDB，不向服务器同步。原始下载仍来自上传文件或随项目部署的静态样例。未知二进制格式提示下载，不显示乱码。
- 独立网页将预览快照保存在同源 IndexedDB，关闭原阅读区后仍可阅读和刷新；24 小时后过期。该链接供当前浏览器使用，不是跨浏览器共享链接。

## GitHub Pages 演示部署

运行以下命令生成 Pages 静态产物：

```sh
npm ci
npm run verify
npm run build:pages
```

`build:pages` 使用 `.env.pages`，将资源基路径设置为 `/Experts/`，启用 hash 路由，产物位于 `dist/`。将 `dist/` 作为 GitHub Pages 的发布产物，可在 `https://doo1210.github.io/Experts/` 下访问。对话和独立阅读页都使用 hash 地址，刷新不依赖服务端路由回退。如 GitHub 仓库名不是 `Experts`，请同步调整 `vite.config.js` 中的 Pages 基路径。

普通 `npm run build` 继续使用宿主要求的 `/experts/` history 路由。两种构建均无本地服务代理，也不接入业务 API。构建命令只生成静态文件，不会自动发布仓库或修改宿主 iframe 来源。

如果宿主源码在本机，可用以下命令同时核对其锁文件：

```powershell
npm run check:versions -- --host-lock D:\CodingWorkSpace\wanwu\wanwu-web\web\pnpm-lock.yaml
```

## 演示数据

- 专家、模板、渠道与事件由 `src/demo/state.js` 初始化；`src/demo/project-fixtures.js` 补充 4 个项目、32 项看板任务、8 条目标记录及各项目的动态和工作空间样例。所有业务操作都在浏览器本地执行。
- 已有浏览器演示数据首次加载新版时会增量加入这些固定样例，不替换手动创建的项目；之后不会反复补回已删除的样例。需要从头查看完整固定场景时，可使用“重置演示数据”。
- JSON 状态保存在版本化的 `localStorage` 键 `digital-employee-demo-v3`；上传文件正文保存在 IndexedDB，不同步到服务器。左侧导航底部的“重置演示数据”清除浏览器状态与 IndexedDB。
- 对话流、工具过程、澄清、审批和自主任务执行是本地计时器模拟；切换或离开对话会停止该对话的模拟流。
- 页面明确标注“演示数据”。模拟发送、渠道连接和 MCP 测通不产生真实外部操作。
- 宿主可能仍在 iframe URL 上传入 token、用户和组织参数；本应用不读取它们，并立即从地址栏移除这些参数。

## 对话呈现演示场景

在专家对话页输入以下文字，可查看固定的本地事件路径：

- `演示过程` 在质量分析专家的第一组展示读取文件与检索知识，三段中途说明将活动分为四组。单独发送 `演示工具：检索知识` 可在运行中展开查看带图标和竖线的紧凑知识过程，查询词统一为「关键词 1 ｜ 关键词 2」，资料名称仅显示普通灰字，结束后查看「完成检索」及返回数量统计，点击正文中的具体知识引用，直接在预览区阅读文档全文及引用高亮或完整 Wiki 正文；完成检索下保留「共返回……」的纯文本统计，不可点击；不显示知识卡片列表及引用内容弹窗。`工具详情` 可查看命令入参和输出，`文件差异` 可查看浏览器本地的演示差异。
- `请展示思考`、`后台子代理核对资料`：分别展示可见推理和晚于父答复完成的子任务。
- `请多题澄清`、`已答多题澄清`、`请审批后演示失败`：查看人工请求、已接收答案恢复及批准后工具失败。
- `凭据演示`：只模拟安全提交状态，不输入或保存真实密码与密钥。
- `生成待办结果`、`层级待办和目标等待`：区分本轮结果与当前会话状态。
- `Markdown 展示`：查看无气泡正文、表格、代码块和链接；点击纸夹上传本地文件，输入文字后一同发送并可在刷新后预览。

完整触发词、组合优先级及限制见 [专家对话原型演示触发词](docs/conversation_demo_triggers.md)。

所有场景均为浏览器本地演示，不代表真实模型或外部工具执行。

## 目录

- `src/demo/pages/`：专家、对话、项目页面。
- `src/demo/components/`：任务总览与工作空间交互。
- `src/demo/state.js`：唯一的本地业务状态和演示事件。
- `src/demo/project-fixtures.js`：多项目固定样例与旧演示数据的增量补齐。
- `src/demo/file-db.js`：本地上传文件正文。
- `src/demo/file-preview.js`：静态样例读取与浏览器预览类型选择。
- `src/demo/components/DemoFilePreview.vue`：两种阅读入口共用的纯前端模拟查看器。
- `src/router/index.js`：`/experts/` history 路由及原型 hash 链接兼容。
- `scripts/check-versions.mjs`：与宿主实际锁定版本的核对。

本工程后续确认的产品与交互需求统一维护在 [docs/experts_prd.md](docs/experts_prd.md)；实现或验收新需求时，同步更新对应章节和修改记录。该文档未覆盖的规则再按“1023 PRD → MVP PRD → 原型现状”核对。覆盖记录见 `docs/prototype-coverage.md`。

现有对话页的呈现规则、逐节验收与上游待定项，见 [docs/conversation_prd.md](docs/conversation_prd.md)。上游尚未定稿的规则保持待确认状态。
