export function chatIdentity(chat) {
  return JSON.stringify([
    chat.expertId,
    chat.platform,
    chat.platformScope || "",
    chat.chatId,
  ]);
}

export function scopesFor(chat) {
  if (chat?.chatType === "single") return [];
  if (Array.isArray(chat?.scopes))
    return chat.scopes.filter((scope) => scope.mode !== "shared");
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
      (!query || `${chat.title} ${chat.chatId}`.toLowerCase().includes(query)),
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
