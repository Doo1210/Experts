import { KNOWLEDGE_CATALOG, KNOWLEDGE_DOCUMENTS } from "./knowledge-demo";
import { knowledgeDemoOriginals } from "./knowledge-activity-scenes";

const legacyDemoDocuments = {
  "zx42-maintenance": ["生产工艺手册", "ZX-42 维护手册.md"],
  "sensor-calibration": ["质量标准与规范", "传感器校准作业规范.md"],
  "zx42-wiki": ["生产工艺手册", "校准记录与复核"],
  "zx42-calibration-log": ["历史整改案例", "ZX-42 校准记录表.csv"],
};

export const knowledgeAction = "检索知识";

export const knowledgeStages = {
  accepted: "",
  understanding: "理解问题",
  searching: "检索资料",
  reading: "阅读资料",
  wiki: "查询 Wiki",
  table_analysis: "分析表格",
  summarizing: "整理结果",
  completed: "正在读取结果",
  failed: "检索失败",
  cancelled: "已取消",
  timed_out: "检索超时",
};

export const knowledgeResults = {
  success: "",
  partial: "部分完成",
  empty: "未找到可用资料",
};

export const knowledgeErrors = {
  permission_denied: "当前没有访问所选资料的权限。",
};

export const knowledgeWarnings = {
  "The native answer reached its output limit.": "知识侧摘要达到输出上限。",
  "The native answer was clipped to the response limit.":
    "知识侧摘要达到输出上限。",
};

export function knowledgeActivityLabel(activity) {
  return [activity.title, activity.progressText || activity.statusText]
    .filter(Boolean)
    .join(" · ");
}

export function knowledgeEvidenceSources(evidence) {
  if (evidence.access !== "available") return [];
  return evidence.source
    ? [evidence.source]
    : evidence.calculation_sources || [];
}

export function knowledgeCitationDocuments(evidence) {
  const sources = knowledgeEvidenceSources(evidence);
  if (!sources.length) return [{ id: null, title: "来源不可用" }];
  return sources.map(knowledgeSourceDocument);
}

export function knowledgeSourceDocument(source) {
  const isWiki =
    source.kind === "wiki" ||
    source.locator?.source_type === "wiki" ||
    source.id === "zx42-wiki";
  const id = isWiki
    ? source.locator?.wiki_page_id || source.id
    : source.document_id || source.locator?.document_id || source.id;
  const document = KNOWLEDGE_DOCUMENTS.find((entry) => entry.id === id);
  const library = KNOWLEDGE_CATALOG.find(
    (entry) => entry.id === (document?.libraryId || source.library_id),
  );
  const [demoLibrary, demoTitle] = legacyDemoDocuments[id] || [];
  return {
    id,
    kind: isWiki ? "wiki" : "rag",
    title: isWiki
      ? source.title || demoTitle || "Wiki 页面"
      : document?.name || demoTitle || source.title || "引用文档",
    library: library?.name || source.library_name || demoLibrary,
    original: knowledgeDemoOriginals[id] || knowledgeDemoOriginals[source.id],
  };
}

export function knowledgeActivitySources(activity) {
  if (!["success", "partial"].includes(activity.resultStatus)) return [];
  const sources = new Map();
  for (const evidence of activity.evidence) {
    for (const source of knowledgeEvidenceSources(evidence)) {
      if (!source.title) continue;
      const { id, kind, title, library } = knowledgeSourceDocument(source);
      if (!id || sources.has(id)) continue;
      const suffix =
        kind === "rag" ? title.match(/\.[a-z\d]{1,8}$/i)?.[0] || "" : "";
      sources.set(id, {
        id,
        kind,
        title,
        library,
        name: suffix ? title.slice(0, -suffix.length) : title,
        suffix,
      });
    }
  }
  return [...sources.values()];
}
