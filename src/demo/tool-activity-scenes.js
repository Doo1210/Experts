// Local-only tool lifecycle fixtures. None of these calls execute a real tool.
export function readFileActivityScene(path, sourceContent = "", limit = 2000) {
  const source = String(sourceContent || "");
  const lines = source ? source.split(/\r?\n/) : [];
  const total = lines.length;
  const count = Math.min(total, Math.max(1, Math.floor(limit) || 1));
  return {
    name: "read_file",
    args: { path, offset: 1, limit },
    result: {
      content: lines
        .slice(0, count)
        .map((line, index) => `${index + 1}|${line}`)
        .join("\n"),
      total_lines: total,
      truncated: count < total,
    },
  };
}

export function executionSceneForFile(scene, path, sourceContent) {
  if (!scene || !path || typeof sourceContent !== "string") return scene;
  const lines = sourceContent.split(/\r?\n/);
  if (scene.trigger === "演示工具：执行命令") {
    const last = lines.at(-1) || "";
    const date = last.split(",")[0];
    const stem = path.split("/").at(-1).replace(/\.[^.]+$/, "");
    const needle = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : stem && sourceContent.includes(stem)
        ? stem.slice(0, 28)
        : "";
    const quote = (value) => `'${String(value).replace(/'/g, "'\\''")}'`;
    return {
      ...scene,
      args: {
        ...scene.args,
        command: needle
          ? `rg -n -F -- ${quote(needle)} ${quote(path)}`
          : `wc -l ${quote(path)}`,
      },
      result: {
        output: needle
          ? lines
              .map((line, index) => (line.includes(needle) ? `${index + 1}:${line}` : ""))
              .filter(Boolean)
              .join("\n")
          : `0 ${path}`,
        exit_code: 0,
        error: null,
      },
    };
  }
  if (scene.trigger === "演示工具：运行代码") {
    const rates = lines.slice(1)
      .map((line) => /(?:^|,)\s*(\d+(?:\.\d+)?)%/.exec(line)?.[1])
      .filter(Boolean)
      .map(Number);
    if (rates.length) {
      const code = [
        `rates = [${rates.join(", ")}]`,
        'print(f"样本：{len(rates)} 天，平均良率：{sum(rates) / len(rates):.2f}%")',
        'print(f"最低良率：{min(rates):.2f}%")',
      ].join("\n");
      return {
        ...scene,
        args: { ...scene.args, code },
        result: {
          status: "success",
          output: `样本：${rates.length} 天，平均良率：${(rates.reduce((sum, rate) => sum + rate, 0) / rates.length).toFixed(2)}%\n最低良率：${Math.min(...rates).toFixed(2)}%`,
          exit_code: 0,
        },
      };
    }
    return {
      ...scene,
      args: {
        ...scene.args,
        code: `line_count = ${sourceContent ? lines.length : 0}\nprint(f"文本行数：{line_count}")`,
      },
      result: {
        status: "success",
        output: `文本行数：${sourceContent ? lines.length : 0}`,
        exit_code: 0,
      },
    };
  }
  if (
    [
      "演示工具：启动后台命令",
      "演示工具：后台进程",
      "演示工具：等待后台进程",
    ].includes(scene.trigger)
  ) {
    const label = path.split("/").at(-1)
      .replace(/[^\p{L}\p{N}._-]/gu, "")
      .slice(0, 60) || "工作资料";
    const started = `开始核对 ${label}`;
    if (scene.trigger === "演示工具：启动后台命令")
      return {
        ...scene,
        args: {
          ...scene.args,
          command: `python -u -c "import time; print('${started}', flush=True); time.sleep(8); print('核对完成', flush=True)"`,
        },
      };
    return {
      ...scene,
      result: scene.trigger === "演示工具：后台进程"
        ? { ...scene.result, output_preview: started }
        : { ...scene.result, output: started },
    };
  }
  return scene;
}

const qualitySample = "日期,良率\n2026-10-08,97.2%\n2026-10-09,96.8%";

export const TOOL_ACTIVITY_SCENES = [
  {
    trigger: "演示工具：读取文件",
    ...readFileActivityScene("分析资料/良率样例.csv", qualitySample),
  },
  {
    trigger: "演示工具：部分读取文件",
    ...readFileActivityScene("分析资料/良率样例.csv", qualitySample, 2),
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
    trigger: "演示工具：搜索文件内容",
    name: "search_files",
    args: { pattern: "良率", target: "content", path: "分析资料" },
    progress: [{ afterMs: 2600, preview: "已检索 4/12 个文件" }],
    result: {
      matches: [
        { path: "分析资料/良率样例.csv", line: 1, content: "日期,良率" },
        { path: "分析资料/批次汇总.csv", line: 8, content: "本周良率汇总" },
      ],
      total_count: 2,
    },
  },
  {
    trigger: "演示工具：搜索文件",
    name: "search_files",
    args: { pattern: "*.csv", target: "files", path: "分析资料" },
    progress: [{ afterMs: 2600, preview: "已找到 2 个文件" }],
    result: {
      files: ["分析资料/良率样例.csv", "分析资料/批次汇总.csv"],
      total_count: 2,
    },
  },
  {
    trigger: "演示工具：搜索历史对话",
    name: "session_search",
    args: { query: "良率", limit: 3 },
    result: {
      mode: "discover",
      results: [
        {
          session_id: "conv_quality_1",
          title: "分析本周良率波动",
          when: "2026-10-10T09:15:00+08:00",
          snippet: "帮我分析本周良率变化",
          match_message_id: "msg_1",
          link: "@session:conv_quality_1",
        },
      ],
    },
  },
  {
    trigger: "演示工具：搜索网页",
    name: "web_search",
    args: { query: "工业设备质量标准", limit: 5 },
    result: {
      success: true,
      data: {
        web: [
          {
            title: "演示标准",
            url: "https://example.com/standard",
            description: "工业设备质量检验的示例标准与判定口径。",
            position: 1,
          },
        ],
      },
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
    result: {
      results: [
        {
          url: "https://example.com/report/a",
          title: "质量报告 A",
          content: "报告 A 记录了产线的检验范围、样本量和异常批次。",
          error: null,
        },
        {
          url: "https://example.com/report/b",
          title: "质量报告 B",
          content: "报告 B 包含复核结论及下一步待确认的数据。",
          error: null,
        },
      ],
    },
  },
  {
    trigger: "演示工具：执行命令",
    name: "terminal",
    args: { command: "rg -n -F -- '2026-10-09' '分析资料/良率样例.csv'", workdir: "/workspace", timeout: 30 },
    result: { output: "3:2026-10-09,96.8%", exit_code: 0, error: null },
  },
  {
    trigger: "演示工具：启动后台命令",
    name: "terminal",
    args: { command: "python -u -c \"import time; print('质量核对已启动', flush=True); time.sleep(8); print('质量核对完成', flush=True)\"", workdir: "/workspace", background: true, notify: true },
    result: { output: "Background process started", session_id: "proc_4dae56ca81f6", exit_code: 0, error: null },
  },
  {
    trigger: "演示工具：长详情",
    name: "terminal",
    args: { command: "python -c \"for i in range(1, 61): print(f'批次 B{i:03d}  抽检=200  良率={97.5 - i % 9 * 0.1:.1f}%')\"", workdir: "/workspace" },
    result: {
      exit_code: 0,
      output: Array.from(
        { length: 60 },
        (_, index) => `批次 B${String(index + 1).padStart(3, "0")}  抽检=200  良率=${(97.5 - ((index + 1) % 9) * 0.1).toFixed(1)}%`,
      ).join("\n"),
    },
  },
  {
    trigger: "演示工具：运行代码",
    name: "execute_code",
    args: { code: "rates = [97.2, 96.8]\nprint(f\"样本：{len(rates)} 天，平均良率：{sum(rates) / len(rates):.2f}%\")\nprint(f\"最低良率：{min(rates):.2f}%\")", reset: true },
    result: { status: "success", output: "样本：2 天，平均良率：97.00%\n最低良率：96.80%", exit_code: 0 },
  },
  {
    trigger: "演示工具：后台进程",
    name: "process_manage",
    args: { action: "poll", session_id: "proc_4dae56ca81f6" },
    result: { status: "running", session_id: "proc_4dae56ca81f6", output_preview: "质量核对已启动" },
  },
  {
    trigger: "演示工具：等待后台进程",
    name: "process_manage",
    args: { action: "wait", session_id: "proc_4dae56ca81f6", timeout: 5 },
    result: { status: "timeout", process_running: true, output: "质量核对已启动" },
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
    trigger: "演示工具：列出技能",
    name: "skills_list",
    args: {},
  },
  {
    trigger: "演示工具：查看技能",
    name: "skill_view",
    args: { name: "质量分析" },
    result: {
      success: true,
      name: "质量分析",
      description: "按质量数据和异常记录核对分析范围。",
      tags: ["质量分析"],
      content: "# 质量分析\n按输入资料核对数据口径并整理结论。",
      path: "quality-analysis/SKILL.md",
      linked_files: null,
    },
  },
  {
    trigger: "演示工具：更新记忆",
    name: "memory",
    args: {
      action: "replace",
      target: "memory",
      old_text: "工作空间文件默认使用 GBK 编码。",
      content: "工作空间文件默认使用 UTF-8 编码。",
    },
    result: {
      success: true,
      done: true,
      target: "memory",
      message: "Entry replaced.",
    },
  },
  {
    trigger: "演示工具：管理待办",
    name: "todo_list",
    args: {
      todos: [
        { id: "todo_check", content: "核对演示资料", status: "in_progress" },
        { id: "todo_summary", content: "整理分析结论", status: "pending" },
      ],
      merge: false,
    },
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
    name: "mcp__tickets__search",
    args: { query: "产线停机", limit: 2 },
    result: {
      result: {
        results: [
          { id: "INC-1024", title: "2 号产线短暂停机", status: "处理中" },
          { id: "INC-1008", title: "夜班设备异常复查", status: "已关闭" },
        ],
        total: 2,
      },
    },
  },
  {
    trigger: "演示工具：失败结果",
    baseTrigger: "演示工具：搜索网页",
    args: { query: "演示异常批次" },
    result: { success: false, error: "演示检索服务不可用" },
  },
  {
    trigger: "演示工具：策略阻断",
    baseTrigger: "演示工具：执行命令",
    result: {
      output: "",
      exit_code: -1,
      status: "blocked",
      error: "本次操作被安全策略阻止，命令未执行。",
    },
  },
  {
    trigger: "演示工具：中断执行",
    baseTrigger: "演示工具：执行命令",
    result: {
      output: "",
      exit_code: -1,
      status: "cancelled",
      error: "命令执行被取消。",
    },
  },
  {
    trigger: "演示工具：缺少结束事件",
    baseTrigger: "演示工具：读取文件",
    skipComplete: true,
  },
  {
    trigger: "演示工具：仅收到完成事件",
    baseTrigger: "演示工具：写入文件",
    skipStart: true,
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
    baseTrigger: "演示工具：写入文件",
    args: {
      path: "演示核对报告.md",
      content: "# 演示核对报告\n仅供原型展示。",
    },
    artifact: {
      name: "演示核对报告.md",
      content: "# 演示核对报告\n仅供原型展示。",
    },
  },
  {
    trigger: "演示产出：多个文件",
    baseTrigger: "演示工具：写入文件",
    args: { path: "演示批量报告" },
    artifact: null,
    artifacts: Array.from({ length: 12 }, (_, index) => ({
      name: `批次报告-${String(index + 1).padStart(2, "0")}.md`,
      content: `# 批次报告 ${index + 1}\n本文件仅用于演示多产出文件的浏览。`,
    })),
  },
  {
    trigger: "演示产出：修改文件",
    baseTrigger: "演示工具：修改文件",
  },
  {
    trigger: "演示产出：新建和修改文件",
    baseTrigger: "演示工具：写入文件",
    args: {
      path: "质量核对摘要.md",
      content: "# 质量核对摘要\n已核对演示良率样例。",
    },
    artifact: {
      name: "质量核对摘要.md",
      content: "# 质量核对摘要\n已核对演示良率样例。",
    },
    followupTrigger: "演示工具：修改文件",
  },
];

export function findToolActivityScene(text) {
  return TOOL_ACTIVITY_SCENES.find((scene) => text === scene.trigger) || null;
}

export function findToolActivitySceneByName(name, target = null) {
  return (
    TOOL_ACTIVITY_SCENES.find(
      (scene) =>
        scene.name === name && (!target || scene.args?.target === target),
    ) || null
  );
}
