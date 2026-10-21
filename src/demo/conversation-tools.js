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
  const path = short(value, 150).replace(/\\/g, "/");
  if (!path) return "";
  return /^[a-z]:\//i.test(path) || path.startsWith("/")
    ? path.split("/").filter(Boolean).at(-1) || ""
    : path.replace(/^\.\//, "");
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
      name === "read_file" && Number.isInteger(args.offset) && args.offset >= 0
        ? `:${args.offset + 1}`
        : "";
    return path ? path + line : "";
  }
  if (name === "search_files") {
    const pattern = short(args.pattern);
    const path = safePath(args.path);
    return [pattern, path].filter(Boolean).join(" · ");
  }
  if (["web_search", "x_search"].includes(name)) return short(args.query);
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
  return "";
}

export function toolProgressText(event) {
  if (typeof event.preview === "string" && event.preview.trim())
    return redact(event.preview);
  const { current, total, unit } = event;
  if (Number.isFinite(current) && Number.isFinite(total) && total > 0)
    return `已处理 ${current}/${total}${unit ? ` ${short(unit, 12)}` : ""}`;
  return "";
}

export function toolInputText(name, args) {
  if (!args || typeof args !== "object") return "";
  if (name === "terminal" && typeof args.command === "string") {
    const command = redactSensitive(args.command);
    const cwd = safePath(args.cwd);
    return cwd ? `${command}\n工作目录：${cwd}` : command;
  }
  if (name === "execute_code" && typeof args.code === "string")
    return redactSensitive(args.code);
  if (
    (name.startsWith("browser_") || name === "computer_use") &&
    typeof args.action === "string"
  )
    return redactSensitive(args.action);
  return "";
}

export function toolFailed(event) {
  return Boolean(
    event.error ||
    ["error", "failed"].includes(event.status) ||
    (event.result &&
      typeof event.result === "object" &&
      (event.result.error ||
        (event.name === "terminal" &&
          Number.isInteger(event.result.exit_code) &&
          event.result.exit_code !== 0))),
  );
}

export function toolOutputText(result, inlineDiff) {
  if (typeof inlineDiff === "string" && inlineDiff.trim())
    return redactSensitive(inlineDiff);
  if (typeof result === "string") {
    const text = result.trim();
    return text.startsWith("{") || text.startsWith("[")
      ? ""
      : redactSensitive(text);
  }
  if (!result || typeof result !== "object") return "";
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
