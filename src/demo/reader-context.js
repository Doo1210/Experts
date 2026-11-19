import { readerWorkspaceFileLocation } from "./file-reader";

const parts = (path) =>
  (Array.isArray(path) ? path : String(path || "").split(/[\\/]+/)).filter(
    Boolean,
  );

export function readerDocumentContext(item, files = []) {
  if (!item) return { path: "", kind: "temporary", actions: [] };
  const source = item.knowledgeSource;
  if (source) {
    if (source.available === false)
      return { path: "来源不可用", kind: "unavailable", actions: [] };
    const wiki = source.kind === "wiki";
    return {
      path: [
        source.library || "未知知识库",
        ...parts(wiki ? source.indexPath : source.directoryPath),
        item.name,
      ].join("/"),
      kind: wiki ? "wiki" : "knowledge",
      actions: wiki
        ? ["graph"]
        : [...(item.citationTexts?.length ? ["locate"] : []), "open"],
    };
  }
  const location = readerWorkspaceFileLocation(files, item);
  const filePath = location
    ? [
        ...location.ancestorIds.map(
          (id) => files.find((f) => f.id === id).name,
        ),
        location.file.name,
      ]
    : parts(item.path);
  if (location || filePath.length) {
    return {
      path: [
        "workspace",
        ...filePath.filter((p, i) => i || p !== "workspace"),
      ].join("/"),
      kind: "workspace",
      actions: ["open"],
    };
  }
  return {
    path: `临时文件/${item.name}`,
    kind: "temporary",
    actions: ["open"],
  };
}

// Keep the trailing location on one line, omitting leading directories first.
export function compactReaderPath(path, fits) {
  const segments = parts(path);
  if (fits(path)) return path;
  for (let omitted = 1; omitted < segments.length; omitted++) {
    const candidate = ["…", ...segments.slice(omitted)].join("/");
    if (fits(candidate)) return candidate;
  }
  const name = Array.from(segments.at(-1) || "");
  for (let omitted = 0; omitted < name.length; omitted++) {
    const candidate = "…" + name.slice(omitted).join("");
    if (fits(candidate)) return candidate;
  }
  return "…";
}

// Offsets refer to the original rendered text, so Markdown markup is never injected.
export function citationTextRanges(text, quotes = []) {
  let normalized = "";
  const offsets = [];
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) continue;
    normalized += text[i];
    offsets.push(i);
  }
  const ranges = [];
  for (const quote of new Set(quotes)) {
    const needle = String(quote).replace(/\s/g, "");
    if (!needle) continue;
    let start = normalized.indexOf(needle);
    while (start >= 0) {
      ranges.push({
        start: offsets[start],
        end: offsets[start + needle.length - 1] + 1,
      });
      start = normalized.indexOf(needle, start + needle.length);
    }
  }
  return ranges
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .filter(
      (range, index, all) =>
        !index ||
        range.start !== all[index - 1].start ||
        range.end !== all[index - 1].end,
    );
}
