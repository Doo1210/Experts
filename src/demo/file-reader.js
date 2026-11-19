export const TASK_PANEL_WIDTH = 160;
export const WORKSPACE_PANEL_WIDTH = 200;
export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 480;
export const READER_MIN_WIDTH = 260;
export const READER_DEFAULT_WIDTH = 480;

export function createFileReader() {
  return {
    tabs: [],
    activeKey: null,
    width: READER_DEFAULT_WIDTH,
  };
}

function contentHash(content) {
  let hash = 2166136261;
  for (let index = 0; index < content.length; index++) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function readerFileKey(item, expertId) {
  const prefix = `${expertId}:`;
  if (item.knowledgeSource) {
    const source = item.knowledgeSource;
    return `${prefix}knowledge:${source.id || `${source.library}:${source.title}`}`;
  }
  if (item.resultId || typeof item.snapshotContent === "string") {
    return `${prefix}result:${item.resultId || item.id || item.name}:${contentHash(item.snapshotContent || "")}`;
  }
  return `${prefix}file:${item.id || item.path || item.name}`;
}

export function readerWorkspaceFileLocation(files, item) {
  if (!item || item.knowledgeSource) return null;
  const fileId = item.fileId || item.id;
  if (!fileId) return null;
  const entries = new Map(files.map((file) => [file.id, file]));
  const file = entries.get(fileId);
  if (!file || file.kind !== "file") return null;
  const ancestorIds = [];
  const seen = new Set([file.id]);
  let parentId = file.parentId;
  while (parentId) {
    if (seen.has(parentId)) return null;
    const folder = entries.get(parentId);
    if (!folder || folder.kind !== "folder") return null;
    seen.add(parentId);
    ancestorIds.unshift(parentId);
    parentId = folder.parentId;
  }
  return { file, ancestorIds };
}

export function openReaderTab(reader, tab, layout) {
  let current = reader.tabs.find((entry) => entry.key === tab.key);
  if (current) current.origin = tab.origin;
  else {
    current = tab;
    reader.tabs.push(current);
  }
  reader.activeKey = current.key;
  return {
    tab: current,
    workspaceOpen: current.origin === "workspace" || layout.workspaceOpen,
  };
}

export function activateReaderTab(reader, key) {
  const tab = reader.tabs.find((entry) => entry.key === key);
  if (!tab) return null;
  reader.activeKey = key;
  return {};
}

export function closeFileReader(reader) {
  reader.tabs = [];
  reader.activeKey = null;
}

export function closeReaderTab(reader, key) {
  const index = reader.tabs.findIndex((entry) => entry.key === key);
  if (index < 0) return null;
  reader.tabs.splice(index, 1);
  if (!reader.tabs.length) return closeFileReader(reader);
  if (reader.activeKey !== key) return null;
  return activateReaderTab(
    reader,
    reader.tabs[Math.min(index, reader.tabs.length - 1)].key,
  );
}

export function constrainReaderWidth(width, maxWidth) {
  const maximum = Math.max(READER_MIN_WIDTH, maxWidth);
  return Math.round(Math.min(maximum, Math.max(READER_MIN_WIDTH, width)));
}

export function constrainSidebarWidth(width) {
  return Math.round(
    Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width)),
  );
}
