# 数字员工纯演示前端

这是可独立运行的 Vue 2 演示工程，放在 `D:\CodingWorkSpace\IndustryAgentPlatform\专家`。页面基于现有 des-ui 的 Vue 2、Element UI、Vue Router 和 Vite 架构重建，并融合“数字员工”原型与 1023 PRD 中的页面规则。应用只使用浏览器中的演示数据，不连接 DES 或宿主业务 API。

## 启动

推荐 Node **22.10.0**、npm。首次运行：

```powershell
npm ci
npm run check:versions
npm run dev
```

打开 `http://127.0.0.1:5173/experts/`。使用 `http://127.0.0.1:5173/experts/?embed=1` 可检查宿主 iframe 布局。生产构建用 `npm run build`，本地预览用 `npm run preview`；Dockerfile 将静态页面部署在 `/experts/`。本工程不会修改宿主的 iframe 地址或线上部署。

## GitHub Pages 演示部署

推送到 `Doo1210/Experts` 的 `main` 后，GitHub Actions 会用 Node 22.10.0 执行检查、测试和 Pages 构建，再发布到 `https://doo1210.github.io/Experts/`。Pages 构建启用 `/Experts/` 资源路径和 hash 路由，以便直接打开及刷新专家、对话和项目深链；普通构建继续使用宿主要求的 `/experts/` history 路由。GitHub Pages 仅展示演示数据，不接入业务 API，也不改变宿主 iframe 来源。

如果宿主源码在本机，可用以下命令同时核对其锁文件：

```powershell
npm run check:versions -- --host-lock D:\CodingWorkSpace\wanwu\wanwu-web\web\pnpm-lock.yaml
```

## 演示数据

- 专家、模板、渠道与事件由 `src/demo/state.js` 初始化；`src/demo/project-fixtures.js` 补充 4 个项目、32 项看板任务、8 条目标记录及各项目的动态和工作空间样例。所有业务操作都在浏览器本地执行。
- 已有浏览器演示数据首次加载新版时会增量加入这些固定样例，不替换手动创建的项目；之后不会反复补回已删除的样例。需要从头查看完整固定场景时，可使用“重置演示数据”。
- JSON 状态保存在版本化的 `localStorage` 键 `digital-employee-demo-v3`；上传文件正文保存在 IndexedDB。右下角或嵌入态顶部的“重置演示数据”会清除两者。
- 对话流、工具过程、澄清、审批和自主任务执行是本地计时器模拟；切换或离开对话会停止该对话的模拟流。
- 页面明确标注“演示数据”。模拟发送、渠道连接和 MCP 测通不产生真实外部操作。
- 宿主可能仍在 iframe URL 上传入 token、用户和组织参数；本应用不读取它们，并立即从地址栏移除这些参数。

## 目录

- `src/demo/pages/`：专家、对话、项目页面。
- `src/demo/components/`：任务总览与工作空间交互。
- `src/demo/state.js`：唯一的本地业务状态和演示事件。
- `src/demo/project-fixtures.js`：多项目固定样例与旧演示数据的增量补齐。
- `src/demo/file-db.js`：本地上传文件正文。
- `src/router/index.js`：`/experts/` history 路由及原型 hash 链接兼容。
- `scripts/check-versions.mjs`：与宿主实际锁定版本的核对。

本工程后续确认的产品与交互需求统一维护在 [docs/experts_prd.md](docs/experts_prd.md)；实现或验收新需求时，同步更新对应章节和修改记录。该文档未覆盖的规则再按“1023 PRD → MVP PRD → 原型现状”核对。覆盖与检查记录见 `docs/prototype-coverage.md` 和 `docs/verification.md`。
