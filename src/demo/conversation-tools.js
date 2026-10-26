const TOOL_ACTIONS = {
  web_search: "搜索网页",
  x_search: "搜索 X",
  web_extract: "读取网页",
  session_search: "搜索历史对话",
  read_file: "读取文件",
  write_file: "写入文件",
  patch: "修改文件",
  search_files: "搜索文件",
  terminal: "执行命令",
  process_manage: "管理后台进程",
  execute_code: "运行代码",
  computer_use: "操作电脑",
  vision_analyze: "分析图片",
  video_analyze: "分析视频",
  image_generate: "生成图片",
  video_generate: "生成视频",
  xai_video_edit: "编辑视频",
  xai_video_extend: "编辑视频",
  text_to_speech: "生成语音",
  skills_list: "查看技能",
  skill_view: "查看技能",
  skill_manage: "管理技能",
  todo_list: "管理待办",
  memory: "管理记忆",
  cronjob_manage: "管理定时任务",
  setup_mcp: "配置 MCP 服务",
  desktop_preview: "操作桌面界面",
  drive_preview: "操作桌面界面",
  annotate_preview: "操作桌面界面",
  read_window_below: "操作桌面界面",
  focus_pane: "操作桌面界面",
  react_to_message: "操作桌面界面",
  gui_tour: "操作桌面界面",
  show_tip: "操作桌面界面",
  read_terminal: "操作终端",
  close_terminal: "操作终端",
  desktop_project: "管理项目",
  discord: "操作 Discord",
  discord_admin: "操作 Discord",
  feishu_doc_read: "操作飞书",
};

function short(value, limit = 80) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function safePath(value) {
  const path = short(redactSensitive(value, 150, false), 150).replace(
    /\\/g,
    "/",
  );
  if (!path) return "";
  return /^[a-z]:\//i.test(path) || path.startsWith("/")
    ? path.split("/").filter(Boolean).at(-1) || ""
    : path.replace(/^\.\//, "");
}

function safeSource(value) {
  const source = String(value || "");
  if (source.startsWith("data:")) return "";
  return /^https?:\/\//i.test(source) ? safeUrl(source) : safePath(source);
}

function safeUrl(value) {
  try {
    const url = new URL(String(value));
    if (!/^https?:$/.test(url.protocol)) return "";
    return short(url.hostname + url.pathname, 80);
  } catch {
    return "";
  }
}

function redactSensitive(value, limit = 4000, withHint = true) {
  const raw = String(value || "");
  const text = raw
    .slice(0, limit)
    .replace(
      /((?:password|token|api[_-]?key|secret)\s*[=:]\s*)\S+/gi,
      "$1[已隐藏]",
    )
    .replace(/(--(?:password|token|api[_-]?key|secret)\s+)\S+/gi, "$1[已隐藏]")
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, "$1[已隐藏]@")
    .replace(/(https?:\/\/[^\s?#]+)[?#]\S+/gi, "$1");
  return withHint && raw.length > limit
    ? `${text}\n…（仅展示前 ${limit} 字）`
    : text;
}

function redact(value) {
  return short(redactSensitive(value, 200, false));
}

export function toolAction(name) {
  const value = String(name || "");
  if (TOOL_ACTIONS[value]) return TOOL_ACTIONS[value];
  if (value.startsWith("browser_")) return "操作浏览器";
  if (value.startsWith("ha_")) return "操作智能家居";
  if (value.startsWith("kanban_")) return "处理看板任务";
  if (value.startsWith("yb_")) return "操作元宝";
  if (value.startsWith("feishu_drive_")) return "操作飞书";
  if (value === "delegate_task") return "启动子代理";
  return value ? `调用外部工具 ${short(value, 80)}` : "调用工具";
}

export function toolArgumentSummary(name, args) {
  if (!args || typeof args !== "object") return "";
  if (["read_file", "write_file", "patch"].includes(name)) {
    const path = safePath(args.path);
    const line =
      name === "read_file" && Number.isInteger(args.offset) && args.offset > 1
        ? `:${args.offset}`
        : "";
    return path ? path + line : "";
  }
  if (name === "search_files") {
    const pattern = redact(args.pattern);
    const path = safePath(args.path);
    return [pattern, path].filter(Boolean).join(" · ");
  }
  if (["web_search", "x_search", "session_search"].includes(name))
    return redact(args.query);
  if (name === "web_extract") {
    const urls = Array.isArray(args.urls)
      ? args.urls
      : args.url
        ? [args.url]
        : [];
    const first = safeUrl(urls[0]);
    return first
      ? `${first}${urls.length > 1 ? ` 等 ${urls.length} 个网页` : ""}`
      : "";
  }
  if (name === "terminal") return redact(args.command) || "命令内容已隐藏";
  if (name === "execute_code") {
    const code = String(args.code || "").split(/\r?\n/);
    return (
      redact(code.find((line) => line.trim()) || "") || `${code.length} 行代码`
    );
  }
  if (name === "process_manage")
    return [short(args.action, 24), short(args.session_id, 20)]
      .filter(Boolean)
      .join(" · ");
  if (name === "vision_analyze") return safeSource(args.image_url);
  if (name === "video_analyze") return safeSource(args.video_url);
  if (name === "browser_navigate") return safeUrl(args.url);
  if (name === "computer_use" && args.action === "capture") return "截取屏幕";
  if (name === "desktop_preview" && args.action === "查看当前窗口")
    return "查看当前窗口";
  if (name === "setup_mcp") return short(args.server, 60);
  if (["skill_view", "skill_manage"].includes(name))
    return short(args.name, 60);
  return "";
}

export function toolProgressText(event) {
  if (typeof event.preview === "string" && event.preview.trim())
    return redact(event.preview);
  const { current, total, unit } = event;
  if (
    Number.isFinite(current) &&
    Number.isFinite(total) &&
    current >= 0 &&
    total > 0 &&
    current <= total
  )
    return `已处理 ${current}/${total}${unit ? ` ${short(unit, 12)}` : ""}`;
  return "";
}

export function toolInputText(name, args) {
  if (!args || typeof args !== "object") return "";
  if (name === "read_file")
    return [
      Number.isInteger(args.offset) && args.offset > 1
        ? `起始行：${args.offset}`
        : "",
      Number.isInteger(args.limit) && args.limit > 0
        ? `最多读取：${args.limit} 行`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  if (name === "write_file") return "";
  if (
    [
      "patch",
      "search_files",
      "web_search",
      "x_search",
      "session_search",
    ].includes(name)
  )
    return "";
  if (name === "web_extract") {
    const urls = Array.isArray(args.urls) ? args.urls : [];
    return urls.length > 1
      ? urls
          .map(safeUrl)
          .filter(Boolean)
          .map((url) => `网页：${url}`)
          .join("\n")
      : "";
  }
  if (name === "terminal" && typeof args.command === "string") {
    const command = redactSensitive(args.command);
    const cwd = safePath(args.cwd);
    return cwd ? `${command}\n工作目录：${cwd}` : command;
  }
  if (name === "execute_code" && typeof args.code === "string")
    return redactSensitive(args.code);
  if (name === "process_manage") return "";
  if (
    name === "browser_navigate" ||
    name === "computer_use" ||
    name === "desktop_preview"
  )
    return "";
  if (["vision_analyze", "video_analyze"].includes(name)) {
    return redact(args.question) ? `分析问题：${redact(args.question)}` : "";
  }
  if (["image_generate", "video_generate"].includes(name))
    return [
      redactSensitive(args.prompt, 200, false) &&
        `生成要求：${redactSensitive(args.prompt, 200, false)}`,
      args.aspect_ratio && `画幅：${short(args.aspect_ratio, 24)}`,
      Number.isInteger(args.duration) ? `时长：${args.duration} 秒` : "",
    ]
      .filter(Boolean)
      .join("\n");
  if (name === "text_to_speech")
    return Number.isFinite(args.speed) && args.speed !== 1
      ? `语速：${args.speed}`
      : "";
  if (name === "skill_view" || name === "todo_list") return "";
  if (name === "setup_mcp")
    return args.action === "enable"
      ? "配置动作：启用"
      : args.action === "disable"
        ? "配置动作：停用"
        : "";
  return "";
}

function toolResultValue(result) {
  if (typeof result !== "string" || !result.trim().startsWith("{"))
    return result;
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}

export function toolOutcome(event) {
  const status = String(event.status || "").toLowerCase();
  if (["denied", "rejected", "blocked"].includes(status)) return "rejected";
  if (["cancelled", "canceled", "interrupted"].includes(status))
    return "interrupted";
  if (["error", "failed", "timeout"].includes(status)) return "error";

  const result = toolResultValue(event.result);
  if (
    event.error ||
    (result &&
      typeof result === "object" &&
      (result.success === false ||
        result.ok === false ||
        Boolean(result.error) ||
        (event.name === "terminal" &&
          Number.isInteger(result.exit_code) &&
          result.exit_code !== 0))) ||
    (typeof result === "string" && /^Error\b/i.test(result.trim()))
  )
    return "error";
  if (
    ["write_file", "patch"].includes(event.name) &&
    result &&
    typeof result === "object" &&
    result.verified === false
  )
    return "unknown";
  if (status === "unknown") return "unknown";
  return "complete";
}

export function toolFailed(event) {
  return toolOutcome(event) === "error";
}

export function toolOutputText(result, inlineDiff, outcome = "complete") {
  if (typeof inlineDiff === "string" && inlineDiff.trim())
    return redactSensitive(inlineDiff);
  result = toolResultValue(result);
  if (typeof result === "string") {
    const text = result.trim();
    return text.startsWith("{") || text.startsWith("[")
      ? ""
      : redactSensitive(text);
  }
  if (!result || typeof result !== "object") return "";
  if (outcome === "error") {
    for (const key of ["error", "stderr", "message"]) {
      if (typeof result[key] === "string" && result[key].trim())
        return redactSensitive(result[key].trim());
    }
  }
  if (Array.isArray(result.results)) {
    const lines = result.results
      .slice(0, 10)
      .map((item) => {
        const title = short(item.title || item.name, 120);
        const url = safeUrl(item.url);
        return [title, url].filter(Boolean).join(" · ");
      })
      .filter(Boolean);
    if (lines.length) return lines.join("\n");
  }
  for (const key of ["stdout", "stderr", "text", "content", "error"]) {
    if (typeof result[key] === "string" && result[key].trim())
      return redactSensitive(result[key].trim());
  }
  return "";
}

export function toolOutputSections(
  name,
  result,
  inlineDiff,
  outcome = "complete",
) {
  if (typeof inlineDiff === "string" && inlineDiff.trim())
    return [{ kind: "diff", text: redactSensitive(inlineDiff) }];
  const value = toolResultValue(result);
  if (["error", "rejected", "interrupted", "unknown"].includes(outcome)) {
    const reason =
      value && typeof value === "object"
        ? value.error || value.message
        : typeof value === "string" && /^Error\b/i.test(value.trim())
          ? value
          : "";
    if (typeof reason === "string" && reason.trim())
      return [{ kind: "text", text: redactSensitive(reason.trim(), 300) }];
  }
  if (
    ["terminal", "execute_code"].includes(name) &&
    value &&
    typeof value === "object"
  ) {
    const sections = [];
    const outputFields =
      outcome === "error"
        ? [
            ["stderr", "错误输出"],
            ["stdout", "标准输出"],
          ]
        : [
            ["stdout", "标准输出"],
            ["stderr", "错误输出"],
          ];
    for (const [key, label] of outputFields)
      if (typeof value[key] === "string" && value[key].trim())
        sections.push({
          kind: "code",
          label,
          text: redactSensitive(value[key].trim()),
        });
    if (
      name === "terminal" &&
      Number.isInteger(value.exit_code) &&
      value.exit_code !== 0
    )
      sections.push({ kind: "text", text: `退出码：${value.exit_code}` });
    if (sections.length) return sections;
  }
  if (name === "search_files" && value && typeof value === "object") {
    const matches = Array.isArray(value.matches)
      ? value.matches
      : Array.isArray(value.results)
        ? value.results
        : [];
    const items = matches
      .slice(0, 10)
      .map((item) => {
        const path =
          typeof item === "string"
            ? item
            : item && typeof item === "object"
              ? item.path || item.name
              : "";
        return { title: safePath(path), source: "" };
      })
      .filter((item) => item.title);
    if (items.length) return [{ kind: "list", items }];
  }
  const searchResults =
    value && typeof value === "object"
      ? Array.isArray(value.results)
        ? value.results
        : Array.isArray(value.data?.web)
          ? value.data.web
          : null
      : null;
  if (
    ["web_search", "x_search", "session_search"].includes(name) &&
    searchResults
  ) {
    const items = searchResults
      .slice(0, 10)
      .map((item) =>
        item && typeof item === "object"
          ? {
              title: redact(item.title || item.name || item.description),
              source: safeUrl(item.url),
            }
          : { title: "", source: "" },
      )
      .filter((item) => item.title || item.source);
    if (items.length) return [{ kind: "list", items }];
  }
  if (name === "process_manage" && value && typeof value === "object") {
    const processStatus = String(value.process_status || "").toLowerCase();
    const label = {
      running: "运行中",
      completed: "已结束",
      failed: "运行失败",
      cancelled: "已取消",
    }[processStatus];
    if (label) return [{ kind: "text", text: `后台进程：${label}` }];
  }
  const summaryAllowed = [
    "read_file",
    "search_files",
    "session_search",
    "web_search",
    "x_search",
    "web_extract",
    "process_manage",
    "vision_analyze",
    "video_analyze",
  ].includes(name);
  const summary =
    summaryAllowed && value && typeof value === "object" ? value.summary : "";
  if (typeof summary === "string" && summary.trim())
    return [{ kind: "text", text: redactSensitive(summary.trim(), 300) }];
  if (
    ["terminal", "execute_code"].includes(name) &&
    typeof value === "string"
  ) {
    const text = toolOutputText(value, "", outcome);
    if (text) return [{ kind: "code", text }];
  }
  return [];
}

export function hasToolDetail(activity) {
  return Boolean(
    activity.inputDetail ||
    activity.detail ||
    activity.outputDetail ||
    activity.outputSections?.length,
  );
}
