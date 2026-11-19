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
  searching: "检索片段",
  reading: "阅读文档",
  wiki: "检索 Wiki",
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

export const knowledgeProcessActions = {
  query_understand: "理解问题",
  search_knowledge: "检索片段",
  read_document: "阅读文档",
  wiki_search: "检索 Wiki",
  wiki_read_page: "阅读 Wiki",
  data_analysis: "分析表格",
};

export const knowledgeProcessStages = {
  query_understand: "understanding",
  search_knowledge: "searching",
  read_document: "reading",
  wiki_search: "wiki",
  wiki_read_page: "wiki",
  data_analysis: "table_analysis",
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

export function knowledgeEvidenceSummary(evidence = [], includeZero = false) {
  const chunks = new Set();
  const pages = new Set();
  const calculations = new Set();
  for (const item of evidence) {
    if (item.access !== "available") continue;
    if (item.kind === "hit" && item.hit) {
      chunks.add(item.hit.id || item.evidence_id);
    }
    if (item.kind === "calculation" && item.calculation) {
      calculations.add(item.calculation.id || item.evidence_id);
    }
    if (item.kind === "source" && item.source?.kind === "wiki") {
      const source = item.source;
      pages.add(
        JSON.stringify([
          source.resource || source.library_id || source.library_name || "",
          source.locator?.wiki_page_id ||
            source.locator?.wiki_slug ||
            source.id,
        ]),
      );
    }
  }
  return [
    chunks.size || includeZero ? `${chunks.size} 个文档片段` : "",
    pages.size || includeZero ? `${pages.size} 个 Wiki 页面` : "",
    calculations.size || includeZero ? `${calculations.size} 项计算结果` : "",
  ]
    .filter(Boolean)
    .join("、");
}
