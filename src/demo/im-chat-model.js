export function chatIdentity(chat) {
  return JSON.stringify([
    chat.expertId,
    chat.platform,
    chat.platformScope || "",
    chat.identifierValue || chat.chatId,
  ]);
}

export function chatIdentifier(chat) {
  return {
    name: chat?.identifierName || "聊天标识",
    value: chat?.identifierValue || chat?.chatId || "",
  };
}

export function imChatActivity(chat) {
  const scopes = chat?.chatType === "single" ? [] : scopesFor(chat);
  const records = (
    scopes.length ? scopes : [{ segments: directSegmentsFor(chat) }]
  ).flatMap((scope) =>
    (scope.segments || []).flatMap((segment) =>
      sortedImMessages(segment)
        .filter(
          (entry) => entry.at && ["user", "assistant"].includes(entry.role),
        )
        .map((entry) => ({ entry, scope })),
    ),
  );
  const latest = records.reduce(
    (result, item) =>
      !result || item.entry.at > result.entry.at ? item : result,
    null,
  );
  const latestSender = latest?.scope.segments
    ?.flatMap((segment) => sortedImMessages(segment))
    .filter((entry) => entry.role === "user" && entry.at <= latest.entry.at)
    .reduce(
      (result, entry) => (!result || entry.at > result.at ? entry : result),
      null,
    );
  return {
    at: latest?.entry.at || null,
    member:
      chat?.chatType === "group"
        ? latestSender?.senderName ||
          latest?.scope.memberName ||
          latest?.scope.id ||
          ""
        : "",
  };
}

export function compactImId(value, maxLength = 24) {
  const id = String(value || "");
  if (id.length <= maxLength) return id;
  const head = Math.ceil((maxLength - 1) / 2);
  return `${id.slice(0, head)}…${id.slice(-(maxLength - head - 1))}`;
}

export function imMemberHistories(chat) {
  const grouped = new Map();
  for (const scope of scopesFor(chat)) {
    const key = scope.id || scope.memberId || scope.sessionKey;
    if (!grouped.has(key))
      grouped.set(key, { ...scope, memberKey: key, segments: [] });
    grouped.get(key).segments.push(...(scope.segments || []));
  }
  return [...grouped.values()]
    .filter((scope) =>
      (scope.segments || []).some((segment) =>
        (segment.messages || []).some((entry) =>
          ["user", "assistant"].includes(entry.role),
        ),
      ),
    )
    .map((scope) => ({
      ...scope,
      memberKey: scope.memberKey,
      lastAt: imChatActivity({ chatType: "single", segments: scope.segments })
        .at,
    }))
    .sort((a, b) =>
      String(b.lastAt || "").localeCompare(String(a.lastAt || "")),
    );
}

export function imHistoryEntries(segments) {
  const orderedSegments = (segments || []).filter(
    (segment) =>
      segment.mainline !== false &&
      !["branch", "subtask"].includes(segment.source),
  );
  const seen = new Set();
  const result = [];
  orderedSegments.forEach((segment, segmentIndex) => {
    const previous = orderedSegments[segmentIndex - 1];
    if (
      segmentIndex > 0 &&
      (segment.boundaryType === "reset" ||
        ["/new", "/reset"].includes(segment.resetCommand) ||
        previous?.endReason === "session_reset")
    )
      result.push({
        kind: "boundary",
        key: `boundary:${segment.sessionId || segment.id}`,
        at: segment.startedAt,
      });
    for (const [index, entry] of sortedImMessages(segment).entries()) {
      if (entry.role === "command") continue;
      if (
        entry.role === "notice" &&
        /新.*会话|新对话/.test(entry.content || "")
      )
        continue;
      const key = Number.isFinite(entry.dbId)
        ? `db:${entry.dbId}`
        : `id:${entry.id || `${segment.id}:${index}`}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        kind: "message",
        key,
        entry,
        segmentId: segment.sessionId,
      });
    }
  });
  return result;
}

export function imQuestionPreviews(entries) {
  const previews = [];
  let current = null;
  for (const item of entries || []) {
    if (item.kind !== "message") continue;
    if (item.entry.role === "user") {
      current = { key: item.key, message: item.entry, finalReply: "" };
      previews.push(current);
    } else if (
      current &&
      item.entry.role === "assistant" &&
      String(item.entry.content || "").trim()
    )
      current.finalReply = item.entry.content.trim();
  }
  return previews;
}

export function imHistoryRounds(entries) {
  const result = [];
  let round = null;
  const flush = () => {
    if (round) result.push(round);
    round = null;
  };
  for (const item of entries || []) {
    if (item.kind === "boundary") {
      flush();
      result.push(item);
      continue;
    }
    const message = item.entry;
    if (message.role === "user") {
      flush();
      round = {
        kind: "round",
        key: item.key,
        user: message,
        assistant: null,
        inputs: [],
        process: [],
        outputs: [],
      };
      continue;
    }
    if (!round)
      round = {
        kind: "round",
        key: item.key,
        user: null,
        assistant: null,
        inputs: [],
        process: [],
        outputs: [],
      };
    if (message.role === "assistant") {
      if (round.assistant)
        round.process.push({ ...round.assistant, role: "interim" });
      round.assistant = message;
    } else if (message.role === "file")
      (message.direction === "received" ? round.inputs : round.outputs).push(
        message,
      );
    else if (["tool", "notice"].includes(message.role))
      round.process.push(message);
  }
  flush();
  return result;
}

export function scopesFor(chat) {
  if (chat?.chatType === "single") return [];
  if (Array.isArray(chat?.scopes))
    return chat.scopes.filter(
      (scope) => scope.mode !== "shared" && scope.mode !== "thread",
    );
  return (chat?.members || []).map((member) => ({
    id: member.id,
    label: member.name,
    memberName: member.name,
    mode: "member",
    current: true,
    sessionKey: member.sessionKey || `demo:${chat.id}:${member.id}`,
    cwd: chat.cwd,
    segments: member.segments || [],
  }));
}

export function directSegmentsFor(chat) {
  if (Array.isArray(chat?.segments)) return chat.segments;
  if (Array.isArray(chat?.scopes) && chat.scopes.length)
    return chat.scopes.flatMap((scope) => scope.segments || []);
  return (chat?.members || []).flatMap((member) => member.segments || []);
}

export function currentFirst(items) {
  return [...(items || [])].sort(
    (a, b) => Number(Boolean(b.current)) - Number(Boolean(a.current)),
  );
}

export function abbreviatedImId(value, maxLength = 22) {
  const id = String(value || "");
  return id.length > maxLength ? `…${id.slice(1 - maxLength)}` : id;
}

export function groupImChats(rows) {
  const grouped = new Map();
  for (const row of rows || []) {
    const key = chatIdentity(row);
    const scopes = scopesFor(row);
    const directSegments =
      row.chatType === "single" ? directSegmentsFor(row) : [];
    if (!grouped.has(key)) {
      grouped.set(key, {
        ...row,
        sourceTitle: row.title,
        title: row.displayName || row.title,
        scopes: scopes.slice(),
        ...(row.chatType === "single"
          ? { sessionKey: null, segments: directSegments.slice() }
          : {}),
      });
      continue;
    }
    const chat = grouped.get(key);
    if (row.chatType === "single") {
      const segmentIds = new Set(chat.segments.map((item) => item.sessionId));
      for (const segment of directSegments)
        if (!segmentIds.has(segment.sessionId)) {
          chat.segments.push(segment);
          segmentIds.add(segment.sessionId);
        }
    }
    const known = new Set(chat.scopes.map((scope) => scope.sessionKey));
    for (const scope of scopes)
      if (!known.has(scope.sessionKey)) {
        chat.scopes.push(scope);
        known.add(scope.sessionKey);
      }
    if (String(row.updatedAt || "") > String(chat.updatedAt || "")) {
      chat.updatedAt = row.updatedAt;
      chat.lastInitiator = row.lastInitiator;
    }
    if (row.runState === "running" || row.running) chat.runState = "running";
    else if (row.runState === "unknown" && chat.runState !== "running")
      chat.runState = "unknown";
  }
  return [...grouped.values()].sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
  );
}

export function filterImChats(
  chats,
  { keyword = "", chatType = "", platform = "" } = {},
) {
  const query = keyword.trim().toLowerCase();
  return chats.filter(
    (chat) =>
      (!chatType || chat.chatType === chatType) &&
      (!platform || chat.platform === platform) &&
      (!query ||
        `${chat.title} ${chat.sourceTitle || ""} ${chatIdentifier(chat).value}`
          .toLowerCase()
          .includes(query)),
  );
}

export function imChatStats(chats) {
  return chats.reduce(
    (stats, chat) => {
      stats.total += 1;
      if (chat.runState === "unknown" || chat.gatewayStatus === "disconnected")
        stats.unknown += 1;
      else if (chat.runState === "running" || chat.running) stats.running += 1;
      return stats;
    },
    { total: 0, running: 0, unknown: 0 },
  );
}

export function sortedImMessages(segment) {
  return (segment?.messages || [])
    .map((message, index) => ({ message, index }))
    .sort((a, b) => {
      const aId = Number.isFinite(a.message.dbId) ? a.message.dbId : Infinity;
      const bId = Number.isFinite(b.message.dbId) ? b.message.dbId : Infinity;
      return aId === bId ? a.index - b.index : aId - bId;
    })
    .map(({ message }) => message);
}
