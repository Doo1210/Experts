// Local-only tool lifecycle fixtures. None of these calls execute a real tool.
export const TOOL_ACTIVITY_SCENES = [
  {
    trigger: "演示工具：读取文件",
    name: "read_file",
    args: { path: "分析资料/良率样例.csv", offset: 1, limit: 500 },
    progress: [
      { afterMs: 1800, preview: "已读取 120/500 行" },
      { afterMs: 3600, preview: "已读取 360/500 行" },
    ],
    result: { summary: "已读取 500 行演示数据。" },
  },
  {
    trigger: "演示工具：写入文件",
    name: "write_file",
    args: { path: "报告.md", content: "# 演示报告\n质量数据仅用于原型展示。" },
    result: { verified: true },
    artifact: {
      name: "报告.md",
      content: "# 演示报告\n质量数据仅用于原型展示。",
    },
  },
  {
    trigger: "演示工具：修改文件",
    name: "patch",
    args: { path: "分析资料/良率样例.csv", patch: "调整演示良率" },
    inlineDiff: "-2026-10-09,96.8%\n+2026-10-09,97.1%",
    result: { verified: true },
    modifies: {
      fileId: "f_quality_csv",
      path: "分析资料/良率样例.csv",
      content: "日期,良率\n2026-10-08,97.2%\n2026-10-09,97.1%",
      alternateContent: "日期,良率\n2026-10-08,97.2%\n2026-10-09,96.8%",
      changeSummary: "调整 1 行良率数据",
    },
  },
  {
    trigger: "演示工具：搜索文件",
    name: "search_files",
    args: { pattern: "良率", path: "分析资料" },
    progress: [{ afterMs: 2600, preview: "已检索 4/12 个文件" }],
    result: {
      matches: ["分析资料/良率样例.csv", "分析资料/批次汇总.csv"],
    },
  },
  {
    trigger: "演示工具：搜索历史对话",
    name: "session_search",
    args: { query: "设备异常", limit: 3 },
    result: { results: [{ title: "设备异常复盘" }] },
  },
  {
    trigger: "演示工具：搜索网页",
    name: "web_search",
    args: { query: "工业设备质量标准", limit: 5 },
    result: {
      results: [{ title: "演示标准", url: "https://example.com/standard" }],
    },
  },
  {
    trigger: "演示工具：搜索 X",
    name: "x_search",
    args: { query: "设备维护" },
    result: {
      results: [
        {
          title: "设备维护经验",
          url: "https://example.com/maintenance",
        },
      ],
    },
  },
  {
    trigger: "演示工具：读取网页",
    name: "web_extract",
    args: {
      urls: ["https://example.com/report/a", "https://example.com/report/b"],
      char_limit: 15000,
    },
    progress: [
      { afterMs: 1800, current: 1, total: 2, unit: "个网页" },
      { afterMs: 3700, current: 2, total: 2, unit: "个网页" },
    ],
    result: { summary: "已提取 2 个演示网页。" },
  },
  {
    trigger: "演示工具：执行命令",
    name: "terminal",
    args: { command: "echo 演示核对完成", cwd: "/workspace" },
    result: { exit_code: 0, stdout: "演示核对完成" },
  },
  {
    trigger: "演示工具：长详情",
    name: "terminal",
    args: { command: "echo 演示长输出", cwd: "/workspace" },
    result: {
      exit_code: 0,
      stdout: Array.from(
        { length: 60 },
        (_, index) => `第 ${index + 1} 行：演示命令输出，仅用于查看详情滚动。`,
      ).join("\n"),
    },
  },
  {
    trigger: "演示工具：运行代码",
    name: "execute_code",
    args: { code: "print('演示核对完成')" },
    result: { stdout: "演示核对完成" },
  },
  {
    trigger: "演示工具：后台进程",
    name: "process_manage",
    args: { action: "poll", session_id: "proc_demo_1234" },
    progress: [{ afterMs: 2500, preview: "正在读取进程状态" }],
    result: { process_status: "running" },
  },
  {
    trigger: "演示工具：操作浏览器",
    name: "browser_navigate",
    args: { action: "打开质量报告页", url: "https://example.com/report" },
    progress: [{ afterMs: 2500, preview: "正在打开报告页" }],
    result: { verified: true },
  },
  {
    trigger: "演示工具：操作电脑",
    name: "computer_use",
    args: { action: "capture" },
    result: { verified: true },
  },
  {
    trigger: "演示工具：操作桌面界面",
    name: "desktop_preview",
    args: { action: "查看当前窗口" },
    result: { verified: true },
  },
  {
    trigger: "演示工具：分析图片",
    name: "vision_analyze",
    args: { image_url: "分析资料/样本.png", question: "检查可见缺陷" },
    progress: [{ afterMs: 2600, preview: "正在核对图像区域" }],
    result: { summary: "演示发现：样本图像边缘有一处可见划痕。" },
  },
  {
    trigger: "演示工具：分析视频",
    name: "video_analyze",
    args: { video_url: "分析资料/产线片段.mp4", question: "检查异常动作" },
    result: { summary: "演示发现：片段中约第 5 秒出现短暂停机。" },
  },
  {
    trigger: "演示工具：生成图片",
    name: "image_generate",
    args: { prompt: "工业设备示意图", aspect_ratio: "square" },
    progress: [{ afterMs: 2600, preview: "正在生成图像" }],
    result: { verified: true },
  },
  {
    trigger: "演示工具：生成视频",
    name: "video_generate",
    args: { prompt: "产线运行演示", duration: 5, aspect_ratio: "landscape" },
    progress: [{ afterMs: 2600, preview: "正在合成视频" }],
    result: { verified: true },
  },
  {
    trigger: "演示工具：生成语音",
    name: "text_to_speech",
    args: { text: "这是一段演示播报。", speed: 1 },
    progress: [{ afterMs: 2600, preview: "正在合成语音" }],
    result: { verified: true },
  },
  {
    trigger: "演示工具：查看技能",
    name: "skill_view",
    args: { name: "质量分析" },
    result: { verified: true },
  },
  {
    trigger: "演示工具：管理待办",
    name: "todo_list",
    args: { action: "list" },
    result: { verified: true },
  },
  {
    trigger: "演示工具：配置 MCP",
    name: "setup_mcp",
    args: { server: "演示服务", action: "enable" },
    result: { verified: true },
  },
  {
    trigger: "演示工具：平台连接",
    name: "discord",
    args: { action: "read_channel", channel: "演示频道" },
    result: { verified: true },
  },
  {
    trigger: "演示工具：外部 MCP",
    name: "mcp__files__list",
    args: { path: "/workspace" },
    progress: [{ afterMs: 2500, preview: "正在读取目录" }],
    result: { verified: true },
  },
  {
    trigger: "演示工具：失败结果",
    name: "web_search",
    args: { query: "演示异常批次" },
    result: { success: false, error: "演示检索服务不可用" },
  },
  {
    trigger: "演示工具：策略阻断",
    name: "terminal",
    args: { command: "echo 演示操作" },
    status: "blocked",
    result: { message: "本次演示操作未获授权。" },
  },
  {
    trigger: "演示工具：中断执行",
    name: "terminal",
    args: { command: "echo 演示操作" },
    status: "cancelled",
    result: { message: "本次演示操作已取消。" },
  },
  {
    trigger: "演示工具：缺少结束事件",
    name: "read_file",
    args: { path: "分析资料/未确认.csv" },
    progress: [{ afterMs: 2200, preview: "已读取 3/5 行" }],
    skipComplete: true,
  },
  {
    trigger: "演示工具：仅收到完成事件",
    name: "write_file",
    args: { path: "演示报告.md" },
    skipStart: true,
    result: { verified: true },
  },
  {
    trigger: "演示工具：输出风险",
    name: "web_extract",
    args: { urls: ["https://example.com/quality"] },
    result: { summary: "已读取演示页面，内容需要核对来源。" },
    risk: {
      risk: "high",
      findings: ["页面包含未经核实的操作指令"],
      redacted: true,
    },
  },
  {
    trigger: "演示工具：生成结果文件",
    name: "write_file",
    args: {
      path: "演示核对报告.md",
      content: "# 演示核对报告\n仅供原型展示。",
    },
    result: { verified: true },
    artifact: {
      name: "演示核对报告.md",
      content: "# 演示核对报告\n仅供原型展示。",
    },
  },
  {
    trigger: "演示产出：多个文件",
    name: "write_file",
    args: { path: "演示批量报告" },
    result: { verified: true },
    artifacts: Array.from({ length: 12 }, (_, index) => ({
      name: `批次报告-${String(index + 1).padStart(2, "0")}.md`,
      content: `# 批次报告 ${index + 1}\n本文件仅用于演示多产出文件的浏览。`,
    })),
  },
  {
    trigger: "演示产出：修改文件",
    name: "patch",
    args: { path: "分析资料/良率样例.csv", patch: "调整演示良率" },
    inlineDiff: "-2026-10-09,96.8%\n+2026-10-09,97.1%",
    result: { verified: true },
    modifies: {
      fileId: "f_quality_csv",
      path: "分析资料/良率样例.csv",
      content: "日期,良率\n2026-10-08,97.2%\n2026-10-09,97.1%",
      alternateContent: "日期,良率\n2026-10-08,97.2%\n2026-10-09,96.8%",
      changeSummary: "调整 1 行良率数据",
    },
  },
  {
    trigger: "演示产出：新建和修改文件",
    name: "write_file",
    args: {
      path: "质量核对摘要.md",
      content: "# 质量核对摘要\n已核对演示良率样例。",
    },
    result: { verified: true },
    artifact: {
      name: "质量核对摘要.md",
      content: "# 质量核对摘要\n已核对演示良率样例。",
    },
    followup: {
      name: "patch",
      args: { path: "分析资料/良率样例.csv", patch: "调整演示良率" },
      inlineDiff: "-2026-10-09,96.8%\n+2026-10-09,97.1%",
      result: { verified: true },
      modifies: {
        fileId: "f_quality_csv",
        path: "分析资料/良率样例.csv",
        content: "日期,良率\n2026-10-08,97.2%\n2026-10-09,97.1%",
        alternateContent: "日期,良率\n2026-10-08,97.2%\n2026-10-09,96.8%",
        changeSummary: "调整 1 行良率数据",
      },
    },
  },
];

export function findToolActivityScene(text) {
  return (
    TOOL_ACTIVITY_SCENES.find((scene) => text.includes(scene.trigger)) || null
  );
}
