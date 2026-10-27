const TOOL_ACTIONS = {
  web_search: "搜索网页",
  x_search: "搜索 X",
  web_extract: "读取网页",
  read_file: "读取文件",
  list_files: "查看工作目录",
  write_file: "写入文件",
  patch: "修改文件",
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
  skills_list: "查看可用技能",
  skill_view: "查看技能",
  skill_manage: "管理技能",
  todo_list: "管理待办",
  memory: "更新记忆",
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

function safeResultPath(value) {
  const path = safePath(value);
  if (!path) return "";
  return path.split("/").includes("..") ? path.split("/").at(-1) || "" : path;
}

function safeSessionTime(value) {
  const time = short(value, 48);
  return /^\d{4}-\d{2}-\d{2}T/.test(time)
    ? time.replace("T", " ").slice(0, 19)
    : time;
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

function safeWebHref(value) {
  try {
    const url = new URL(String(value));
    if (!/^https?:$/.test(url.protocol) || url.username || url.password)
      return "";
    if (
      [...url.searchParams.keys()].some((key) =>
        /(?:token|secret|password|api[_-]?key|auth|signature|session)/i.test(key),
      )
    )
      return "";
    return url.href;
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

function safeMcpValue(value, depth = 0) {
  if (depth > 4) return "[内容已省略]";
  if (Array.isArray(value))
    return value.slice(0, 20).map((item) => safeMcpValue(item, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 30)
        .map(([key, item]) => [
          short(key, 80),
          /password|token|secret|api[_-]?key|authorization|cookie|credential|private[_-]?key/i.test(key)
            ? "[已隐藏]"
            : safeMcpValue(item, depth + 1),
        ]),
    );
  if (typeof value === "string")
    return redactSensitive(value.replace(/MEDIA:\S+/g, "[媒体内容]"), 1200);
  return value;
}

function safeMcpText(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object" && !Object.keys(value).length) return "";
  const safe = safeMcpValue(value);
  return redactSensitive(
    typeof safe === "string" ? safe : JSON.stringify(safe, null, 2),
    1800,
  );
}

export function toolAction(name, args = {}) {
  const value = String(name || "");
  if (value.startsWith("mcp__")) return `调用外部工具 · ${value}`;
  if (value === "todo_list")
    return Array.isArray(args?.todos) ? "更新执行计划" : "查看执行计划";
  if (value === "terminal")
    return args?.background ? "启动后台命令" : "执行命令";
  if (value === "process_manage")
    return {
      list: "查看后台进程",
      poll: "查询后台进程",
      log: "读取进程日志",
      wait: "等待后台进程",
      kill: "终止后台进程",
      write: "写入进程输入",
      submit: "提交进程输入",
      close: "关闭进程输入",
      handoff: "移交后台进程",
    }[args?.action] || "管理后台进程";
  if (value === "search_files")
    return args?.target === "files" ? "搜索文件" : "搜索文件内容";
  if (value === "session_search") {
    if (args?.session_id && args?.around_message_id)
      return "查看历史对话片段";
    if (args?.session_id) return "读取历史对话";
    return args?.query ? "搜索历史对话" : "浏览近期对话";
  }
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
    return redact(args.pattern);
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
    return ["poll", "wait"].includes(args.action)
      ? ""
      : short(args.session_id, 24);
  if (name === "vision_analyze") return safeSource(args.image_url);
  if (name === "video_analyze") return safeSource(args.video_url);
  if (name === "browser_navigate") return safeUrl(args.url);
  if (name === "computer_use" && args.action === "capture") return "截取屏幕";
  if (name === "desktop_preview" && args.action === "查看当前窗口")
    return "查看当前窗口";
  if (name === "setup_mcp") return short(args.server, 60);
  if (name === "memory") {
    return "";
  }
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
  if (name.startsWith("mcp__")) return safeMcpText(args);
  if (name === "read_file") return "";
  if (name === "write_file") return "";
  if (name === "search_files") {
    const path = safePath(args.path);
    const parts = [
      path && path !== "." ? `搜索范围：${path}` : "",
      args.file_glob ? `文件筛选：${redact(args.file_glob)}` : "",
    ];
    return parts.filter(Boolean).join("\n");
  }
  if (["patch", "web_search", "x_search", "session_search"].includes(name))
    return "";
  if (name === "web_extract") return "";
  if (name === "terminal" && typeof args.command === "string") {
    return `命令：${redactSensitive(args.command, 4000)}`;
  }
  if (name === "execute_code" && typeof args.code === "string")
    return [
      `代码：\n${redactSensitive(args.code, 4000)}`,
      Object.prototype.hasOwnProperty.call(args, "reset")
        ? `重置运行环境：${args.reset ? "是" : "否"}`
        : "",
    ].filter(Boolean).join("\n");
  if (name === "process_manage")
    return [
      Number.isInteger(args.timeout) ? `等待上限：${args.timeout} 秒` : "",
      Number.isInteger(args.offset) ? `日志起始行：${args.offset}` : "",
      Number.isInteger(args.limit) ? `最多读取日志：${args.limit} 行` : "",
      Object.prototype.hasOwnProperty.call(args, "data")
        ? "输入内容：已隐藏"
        : "",
    ].filter(Boolean).join("\n");
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

export function toolPendingApproval(event) {
  const result = toolResultValue(event.result);
  return Boolean(
    event.name === "terminal" &&
      result &&
      typeof result === "object" &&
      result.status === "pending_approval" &&
      result.approval_pending === true,
  );
}

export function toolOutcome(event) {
  const status = String(event.status || "").toLowerCase();
  if (["denied", "rejected", "blocked"].includes(status)) return "rejected";
  if (["cancelled", "canceled", "interrupted"].includes(status))
    return "interrupted";
  if (["error", "failed", "timeout"].includes(status)) return "error";

  const result = toolResultValue(event.result);
  if (event.name === "terminal" && result && typeof result === "object") {
    const resultStatus = String(result.status || "").toLowerCase();
    if (["blocked", "denied", "rejected"].includes(resultStatus))
      return "rejected";
    if (["cancelled", "canceled", "interrupted"].includes(resultStatus))
      return "interrupted";
    if (resultStatus === "pending_approval") return "unknown";
  }
  if (event.name === "execute_code" && result && typeof result === "object") {
    if (result.status === "interrupted") return "interrupted";
    if (["error", "timeout"].includes(result.status)) return "error";
  }
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
  const value = toolResultValue(result);
  if (name === "memory") return [];
  const rawDiff =
    ["patch", "write_file", "skill_manage"].includes(name) &&
    value &&
    typeof value === "object" &&
    typeof value.diff === "string" &&
    value.diff.trim()
      ? value.diff
      : inlineDiff;
  if (typeof rawDiff === "string" && rawDiff.trim())
    return [{ kind: "diff", text: redactSensitive(rawDiff) }];
  if (name.startsWith("mcp__")) {
    let payload = value;
    if (value && typeof value === "object") {
      if (value.error != null) payload = value.error;
      else if (Object.prototype.hasOwnProperty.call(value, "structuredContent"))
        payload = value.structuredContent;
      else if (Object.prototype.hasOwnProperty.call(value, "result"))
        payload = value.result;
    }
    const output = safeMcpText(payload);
    return output
      ? [{
          kind: payload && typeof payload === "object" ? "code" : "text",
          label: "返回结果",
          text: output,
        }]
      : [];
  }
  if (
    ["error", "rejected", "interrupted", "unknown"].includes(outcome) &&
    !["terminal", "execute_code", "process_manage"].includes(name)
  ) {
    const reason =
      value && typeof value === "object"
        ? value.error || value.message
        : typeof value === "string" && /^Error\b/i.test(value.trim())
          ? value
          : "";
    if (typeof reason === "string" && reason.trim())
      return [{ kind: "text", text: redactSensitive(reason.trim(), 300) }];
  }
  if (name === "read_file" && value && typeof value === "object") {
    if (value.dedup || value.content_returned === false)
      return [{ kind: "text", text: "文件未变化，本次未重复返回内容。" }];
    const content = typeof value.content === "string" ? value.content : "";
    if (!content) {
      if (value.total_lines === 0)
        return [{ kind: "text", text: "文件为空。" }];
      return [];
    }
    const rows = content.split(/\r?\n/);
    const numbered = rows
      .map((row) => /^(\d+)\|(.*)$/.exec(row))
      .filter(Boolean);
    const first = numbered.length ? Number(numbered[0][1]) : null;
    const last = numbered.length
      ? Number(numbered[numbered.length - 1][1])
      : null;
    const end = Number.isInteger(value.next_offset) && value.next_offset > 1
      ? value.next_offset - 1
      : last;
    const total = Number.isInteger(value.total_lines) && value.total_lines >= 0
      ? value.total_lines
      : null;
    const range = Number.isInteger(first) && Number.isInteger(end)
      ? `第 ${first}${first === end ? "" : `–${end}`} 行${total === null ? "" : `，共 ${total} 行`}`
      : "";
    const previewLine = (numbered.find((row) => row[2].trim())?.[2] || rows[0])
      .replace(/^\d+\|/, "")
      .trim();
    return [{
      kind: "read",
      range,
      preview: redactSensitive(previewLine, 500, false),
      partial: value.truncated === true,
      extractedDocument: value.extracted_document === true,
    }];
  }
  if (
    ["terminal", "execute_code"].includes(name) &&
    value &&
    typeof value === "object"
  ) {
    const sections = [];
    if (value.session_id)
      sections.push({
        kind: "text",
        text: `后台进程已启动 · ${short(value.session_id, 32)}`,
      });
    if (
      typeof value.output === "string" &&
      value.output.trim() &&
      !(value.session_id && value.output.trim() === "Background process started")
    )
      sections.push({
        kind: "code",
        label: "执行结果",
        text: redactSensitive(value.output.trim()),
      });
    if (!sections.some((section) => section.kind === "code"))
      for (const [key, label] of [
        ["stdout", "标准输出"],
        ["stderr", "错误输出"],
      ])
        if (typeof value[key] === "string" && value[key].trim())
          sections.push({
            kind: "code",
            label,
            text: redactSensitive(value[key].trim()),
          });
    if (
      typeof value.error === "string" &&
      value.error.trim() &&
      !String(value.output || "").includes(value.error.trim())
    )
      sections.push({
        kind: "text",
        text: `${["rejected", "interrupted"].includes(outcome) ? "原因" : "错误"}：${redactSensitive(value.error.trim(), 300)}`,
      });
    if (
      Number.isInteger(value.exit_code) &&
      value.exit_code !== 0 &&
      !["blocked", "cancelled", "pending_approval"].includes(value.status)
    )
      sections.push({ kind: "text", text: `退出码：${value.exit_code}` });
    if (sections.length) return sections;
  }
  if (name === "search_files" && value && typeof value === "object") {
    const files = Array.isArray(value.files) ? value.files : [];
    if (files.length) {
      const items = files
        .slice(0, 10)
        .map((path) => ({ title: safeResultPath(path), source: "" }))
        .filter((item) => item.title);
      if (items.length) return [{ kind: "list", items }];
    }
    const matches = Array.isArray(value.matches)
      ? value.matches
      : Array.isArray(value.results)
        ? value.results
        : [];
    const items = matches.slice(0, 10).map((item) => {
      const path =
        typeof item === "string"
          ? item
          : item && typeof item === "object"
            ? item.path || item.name
            : "";
      const line = Number.isInteger(item?.line) && item.line > 0
        ? `:${item.line}`
        : "";
      return {
        title: safeResultPath(path) + line,
        source:
          item && typeof item === "object" && item.content
            ? short(redactSensitive(item.content, 180, false), 180)
            : "",
      };
    }).filter((item) => item.title);
    if (!items.length && typeof value.matches_text === "string") {
      let currentPath = "";
      for (const row of value.matches_text.split(/\r?\n/)) {
        const match = /^\s+(\d+):\s?(.*)$/.exec(row);
        if (match && currentPath) {
          items.push({
            title: `${currentPath}:${match[1]}`,
            source: short(redactSensitive(match[2], 180, false), 180),
          });
          if (items.length >= 10) break;
        } else if (row && !/^\s/.test(row)) {
          currentPath = safeResultPath(row);
        }
      }
    }
    if (items.length) return [{ kind: "list", items }];
    if (value.counts && typeof value.counts === "object") {
      const counts = Object.entries(value.counts)
        .slice(0, 10)
        .map(([path, count]) => ({
          title: safeResultPath(path),
          source: Number.isFinite(count) ? `${count} 处命中` : "",
        }))
        .filter((item) => item.title);
      if (counts.length) return [{ kind: "list", items: counts }];
    }
  }
  if (name === "session_search" && value && typeof value === "object") {
    const results = Array.isArray(value.results) ? value.results : [];
    if (results.length) {
      const items = results.slice(0, 10).map((item) => {
        const time = safeSessionTime(item?.when || item?.started_at || "");
        const snippet = short(
          redactSensitive(item?.snippet || item?.preview || "", 160, false)
            .replace(/<[^>]+>/g, ""),
          160,
        );
        return {
          title: redact(item?.title) || "历史会话",
          source: [time, snippet].filter(Boolean).join(" · "),
          sessionId: String(item?.session_id || ""),
        };
      });
      return [{ kind: "list", items }];
    }
    const meta = value.session_meta;
    if (meta && typeof meta === "object") {
      const anchor = Array.isArray(value.messages)
        ? value.messages.find((message) => message.anchor)
        : null;
      const source = anchor?.content
        ? short(redactSensitive(anchor.content, 160, false), 160)
        : Number.isInteger(value.message_count)
          ? `${value.message_count} 条消息`
          : "";
      return [{
        kind: "list",
        items: [{
          title: redact(meta.title) || "历史会话",
          source,
          sessionId: String(value.session_id || ""),
        }],
      }];
    }
  }
  if (name === "web_search" && value && typeof value === "object") {
    const results = Array.isArray(value.data?.web)
      ? value.data.web
      : Array.isArray(value.results)
        ? value.results
        : null;
    if (results) {
      const items = results.map((item) => {
        const source = safeUrl(item?.url);
        return {
          title: redact(item?.title) || source || "未命名网页",
          source,
          href: safeWebHref(item?.url),
          preview: String(item?.description || "").trim()
            ? redactSensitive(item.description, 600)
            : "",
        };
      });
      return [{
        kind: "web",
        summary: `共搜索 ${results.length} 个网页`,
        items,
      }];
    }
  }
  if (name === "web_extract" && value && typeof value === "object") {
    const results = Array.isArray(value.results) ? value.results : null;
    if (results) {
      const readCount = results.filter(
        (item) => !item?.error && String(item?.content || "").trim(),
      ).length;
      const items = results.map((item) => {
        const source = safeUrl(item?.url);
        return {
          title: redact(item?.title) || source || "未命名网页",
          source,
          href: safeWebHref(item?.url),
          preview: String(item?.content || "").trim()
            ? redactSensitive(item.content, 600)
            : "",
          error: item?.error
            ? redactSensitive(item.error, 180)
            : !item?.content
              ? "未取得网页正文"
              : "",
        };
      });
      return [{
        kind: "web",
        summary: `已读取 ${readCount}/${results.length} 个网页`,
        items,
      }];
    }
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
    name === "x_search" &&
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
    const sections = [];
    const processStatus = String(value.status || value.process_status || "").toLowerCase();
    const label =
      processStatus === "timeout" && value.process_running
        ? "本次等待结束，后台进程仍在运行"
        : {
            running: "进程状态：运行中",
            exited: "进程状态：已结束",
            completed: "进程状态：已结束",
            failed: "进程状态：运行失败",
            killed: "进程状态：已终止",
            interrupted: "本次等待已中断",
            not_found: "未找到后台进程",
          }[processStatus];
    if (label) sections.push({ kind: "text", text: label });
    const output = typeof value.output === "string" && value.output.trim()
      ? value.output
      : value.output_preview;
    if (typeof output === "string" && output.trim()) {
      const safeOutput = redactSensitive(output.trim());
      if (!safeOutput.includes("\n") && safeOutput.length <= 180)
        sections.push({
          kind: "text",
          text: `${value.output ? "进程输出" : "近期输出"}：${safeOutput}`,
        });
      else
        sections.push({
          kind: "code",
          label: value.output ? "进程输出" : "近期输出",
          text: safeOutput,
        });
    }
    if (Array.isArray(value.processes) && value.processes.length)
      sections.push({
        kind: "list",
        items: value.processes.slice(0, 10).map((process) => ({
          title: short(process?.session_id, 32),
          source: short(process?.status, 24),
        })).filter((item) => item.title),
      });
    if (typeof value.error === "string" && value.error.trim())
      sections.push({
        kind: "text",
        text: `错误：${redactSensitive(value.error.trim(), 300)}`,
      });
    if (Number.isInteger(value.exit_code) && value.exit_code !== 0)
      sections.push({ kind: "text", text: `退出码：${value.exit_code}` });
    if (sections.length) return sections;
  }
  const summaryAllowed = [
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

export function memoryStatusText(name, result) {
  if (name !== "memory") return "";
  const value = toolResultValue(result);
  return value && typeof value === "object" && value.staged === true
    ? "待审批"
    : "";
}

export function hasToolDetail(activity) {
  return Boolean(
    activity.inputDetail ||
    activity.detail ||
    activity.outputDetail ||
    activity.outputSections?.length,
  );
}
