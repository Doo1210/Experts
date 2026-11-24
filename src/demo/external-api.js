export const API_RUN_STATUSES = {
  queued: { label: "排队中", type: "info" },
  running: { label: "运行中", type: "" },
  completed: { label: "成功", type: "success" },
  failed: { label: "失败", type: "danger" },
  canceled: { label: "已取消", type: "info" },
};

export function apiRunsUrl(expertId) {
  return `https://api.example.com/openapi/v1/experts/${encodeURIComponent(expertId)}/runs`;
}

export function dateText(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function recentApiDateRange(today = new Date()) {
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  return [dateText(start), dateText(today)];
}

export function apiTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return `${dateText(date)} ${date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })}`;
}

export function apiDuration(ms) {
  if (!Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 100) / 10;
  if (seconds < 60) return `${seconds} 秒`;
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)} 分 ${wholeSeconds % 60} 秒`;
}

// All credentials in this prototype are derived from public fixture IDs.
export function demoApiKeyValue(id) {
  return `ww-demo-${id.replace(/^key_/, "").replaceAll("-", "")}`;
}

export function apiKeyPreview(id) {
  const value = demoApiKeyValue(id);
  return `${value.slice(0, 10)}…${value.slice(-4)}`;
}

export function apiKeyStatus(key, date = dateText(new Date())) {
  if (key.deletedAt) return "已删除";
  if (key.expiresOn && key.expiresOn < date) return "已过期";
  return key.enabled ? "启用" : "停用";
}

export function filterApiRuns(runs, { keyId, status, range, search } = {}) {
  const keyword = (search || "").trim().toLowerCase();
  return runs
    .filter((run) => {
      const submitted = range && dateText(new Date(run.submittedAt));
      return (
        (!keyId || run.keyId === keyId) &&
        (!status || run.status === status) &&
        (!range || (submitted >= range[0] && submitted <= range[1])) &&
        (!keyword ||
          run.id.toLowerCase().includes(keyword) ||
          run.conversationId.toLowerCase().includes(keyword))
      );
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function apiConversationsForResults(conversations, runs, matches) {
  const matchesByConversation = new Map();
  for (const run of matches) {
    const group = matchesByConversation.get(run.conversationId) || new Set();
    group.add(run.id);
    matchesByConversation.set(run.conversationId, group);
  }
  const runsByConversation = new Map();
  for (const run of runs) {
    if (!matchesByConversation.has(run.conversationId)) continue;
    const group = runsByConversation.get(run.conversationId) || [];
    group.push(run);
    runsByConversation.set(run.conversationId, group);
  }
  return conversations
    .filter((conversation) => runsByConversation.has(conversation.id))
    .map((conversation) => {
      const ordered = runsByConversation
        .get(conversation.id)
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
      const latest = ordered[ordered.length - 1];
      const lastActivity = ordered.reduce((latestAt, run) => {
        const activity = run.finishedAt || run.startedAt || run.submittedAt;
        return activity > latestAt ? activity : latestAt;
      }, latest.submittedAt);
      return {
        ...conversation,
        runs: ordered,
        latest,
        lastActivity,
        matchedIds: matchesByConversation.get(conversation.id),
      };
    })
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

export async function copyApiText(component, value, message = "已复制") {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const previousFocus = document.activeElement;
    const input = document.createElement("textarea");
    input.value = value;
    input.readOnly = true;
    input.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(input);
    input.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      // The host may block clipboard access.
    } finally {
      input.remove();
      previousFocus?.focus?.({ preventScroll: true });
    }
    if (!copied) {
      component.$message.warning("复制失败，请检查浏览器的剪贴板权限");
      return;
    }
  }
  component.$message.success(message);
}
