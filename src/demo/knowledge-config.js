export const KNOWLEDGE_MODELS = [
  "知识问答模型",
  "知识推理模型",
  "知识分析模型",
];

export const KNOWLEDGE_TOOL_GROUPS = [
  {
    name: "基础工具",
    items: [
      { id: "思考", description: "分步分析知识任务" },
      { id: "制定计划", description: "组织检索与阅读步骤" },
      {
        id: "回顾历史对话",
        description: "检索历史会话",
        blocked: "依赖未配置",
      },
    ],
  },
  {
    name: "RAG 与文档",
    items: [
      { id: "检索知识", description: "检索文档分块", capability: "rag" },
      { id: "阅读文档", description: "读取原文", capability: "rag" },
      { id: "列出文档", description: "浏览文档目录", capability: "rag" },
      { id: "查询知识图谱", description: "查看关联知识", capability: "rag" },
      {
        id: "查询数据库",
        description: "查询外部数据库",
        blocked: "独立连接未配置",
      },
    ],
  },
  {
    name: "Wiki 阅读",
    items: [
      { id: "搜索 Wiki", description: "查找知识页面", capability: "wiki" },
      { id: "阅读页面", description: "阅读 Wiki 原文", capability: "wiki" },
      {
        id: "标记 Wiki 问题",
        description: "修改问题记录",
        blocked: "需写入权限",
        dangerous: true,
      },
    ],
  },
  {
    name: "Wiki 编辑 · 含写入操作",
    items: [
      {
        id: "创建 Wiki",
        description: "创建或覆盖页面",
        blocked: "专家知识任务暂不开放",
        dangerous: true,
      },
      {
        id: "局部替换 Wiki",
        description: "修改页面指定内容",
        blocked: "专家知识任务暂不开放",
        dangerous: true,
      },
      {
        id: "重命名 Wiki",
        description: "修改页面名称",
        blocked: "专家知识任务暂不开放",
        dangerous: true,
      },
      {
        id: "删除 Wiki",
        description: "删除页面",
        blocked: "专家知识任务暂不开放",
        dangerous: true,
      },
    ],
  },
  {
    name: "Wiki 问题",
    items: [
      {
        id: "查看 Wiki 问题",
        description: "读取已记录的问题",
        capability: "wiki",
      },
      {
        id: "更新 Wiki 问题状态",
        description: "变更问题处理状态",
        blocked: "需写入权限",
        dangerous: true,
      },
    ],
  },
  {
    name: "数据分析",
    items: [
      { id: "读取表结构", description: "查看字段与类型", capability: "table" },
      { id: "分析数据", description: "统计、比较和计算", capability: "table" },
    ],
  },
];

const EXPERT_EXCLUDED_TOOL_IDS = new Set([
  "思考",
  "制定计划",
  "回顾历史对话",
  "thinking",
  "todo_write",
  "search_conversations",
]);

export const EXPERT_KNOWLEDGE_TOOL_GROUPS = KNOWLEDGE_TOOL_GROUPS.map(
  (group) => ({
    ...group,
    items: group.items.filter((tool) => !EXPERT_EXCLUDED_TOOL_IDS.has(tool.id)),
  }),
).filter((group) => group.items.length);

export function excludedExpertTools(tools = []) {
  return tools.filter((tool) => EXPERT_EXCLUDED_TOOL_IDS.has(tool));
}

export function effectiveExpertTools(tools = []) {
  return tools.filter((tool) => !EXPERT_EXCLUDED_TOOL_IDS.has(tool));
}

export const KNOWLEDGE_TYPE_TOOLS = {
  "RAG 问答": ["检索知识", "阅读文档"],
  "Wiki 问答": ["搜索 Wiki", "阅读页面"],
  "Wiki＋RAG 混合": ["检索知识", "阅读文档", "搜索 Wiki", "阅读页面"],
  数据分析: ["读取表结构", "分析数据"],
  自定义: [],
};

export function initialMethodForm(method = {}, saved = {}) {
  const custom = Boolean(method.custom);
  const old = method.editConfig || {};
  const runtime =
    old.runtime ||
    (method.id === "quick-answer" ? "quick-answer" : "smart-reasoning");
  const type =
    old.type ||
    method.type ||
    (method.id === "wiki-answer"
      ? "Wiki 问答"
      : method.id === "data-analysis"
        ? "数据分析"
        : "RAG 问答");
  return {
    runtime,
    type,
    name: method.name || "",
    description: method.description || "",
    model: old.model || method.config?.model || "知识推理模型",
    temperature: old.temperature ?? method.config?.temperature ?? 0.3,
    tokenMode:
      old.tokenMode || (custom && old.outputLimit ? "custom" : "default"),
    maxTokens: old.maxTokens || old.outputLimit || 2048,
    thinkingMode: old.thinkingMode || "auto",
    citations: old.citations ?? true,
    iterationMode: old.iterationMode || "limited",
    maxIterations: old.maxIterations || 10,
    timeout: old.timeout || 120,
    rerankModel:
      old.rerankModel ??
      (type === "Wiki 问答" || type === "数据分析" ? "" : "默认重排模型"),
    queryExpansion: old.queryExpansion ?? false,
    topK: old.topK || 10,
    keywordThreshold: old.keywordThreshold ?? 0.3,
    vectorThreshold: old.vectorThreshold ?? 0.5,
    rerankTopK: old.rerankTopK || 10,
    rerankThreshold: old.rerankThreshold ?? 0.3,
    faqFirst: old.faqFirst ?? runtime === "quick-answer",
    faqDirectThreshold: old.faqDirectThreshold ?? 0.75,
    faqWeight: old.faqWeight ?? 0.2,
    tableAnalysis: old.tableAnalysis ?? false,
    tools: Array.isArray(old.tools)
      ? [...old.tools]
      : [...(method.config?.tools || KNOWLEDGE_TYPE_TOOLS[type] || [])],
    ...saved,
  };
}

export function usesRagConfig(form) {
  return form.runtime === "quick-answer" || form.tools.includes("检索知识");
}

export function methodSections(form) {
  return [
    "basic",
    "model",
    ...(usesRagConfig(form) ? ["rag"] : []),
    ...(form.runtime === "smart-reasoning" ? ["tools"] : []),
  ];
}

export function methodFormErrors(form, isCustom) {
  const errors = { basic: [], model: [], rag: [], tools: [] };
  if (isCustom && !String(form.name || "").trim())
    errors.basic.push("请填写方式名称。");
  if (!String(form.model || "").trim())
    errors.model.push("请选择知识任务模型。");
  if (form.model === "知识问答模型" && form.thinkingMode === "high")
    errors.model.push("当前模型不支持高强度思考。");
  if (
    form.tokenMode === "custom" &&
    (!Number.isFinite(form.maxTokens) || form.maxTokens < 256)
  )
    errors.model.push("最大生成 Token 数至少为 256。");
  if (
    form.runtime === "smart-reasoning" &&
    form.iterationMode === "limited" &&
    form.maxIterations < 1
  )
    errors.model.push("最大迭代次数至少为 1。");
  if (usesRagConfig(form)) {
    if (form.topK < 1 || form.topK > 100)
      errors.rag.push("召回数量应在 1–100 之间。");
    if (!String(form.rerankModel || "").trim())
      errors.model.push("当前 RAG 路径需要重排模型。");
  }
  if (form.runtime === "smart-reasoning") {
    const effectiveTools = effectiveExpertTools(form.tools);
    if (!effectiveTools.length) errors.tools.push("至少选择一项知识工具。");
    const hasRag = effectiveTools.includes("检索知识");
    const hasWiki = effectiveTools.some((tool) =>
      ["搜索 Wiki", "阅读页面"].includes(tool),
    );
    const hasTable = effectiveTools.some((tool) =>
      ["读取表结构", "分析数据"].includes(tool),
    );
    if (form.type === "RAG 问答" && !hasRag)
      errors.tools.push("RAG 问答需启用检索知识工具。");
    if (form.type === "Wiki 问答" && !hasWiki)
      errors.tools.push("Wiki 问答需启用 Wiki 阅读工具。");
    if (form.type === "Wiki＋RAG 混合" && (!hasRag || !hasWiki))
      errors.tools.push("Wiki＋RAG 混合需同时启用检索知识和 Wiki 阅读工具。");
    if (form.type === "数据分析" && !hasTable)
      errors.tools.push("数据分析需启用表格工具。");
  }
  return errors;
}

export function summarizeMethodConfig(form) {
  return {
    model: form.model,
    temperature: form.temperature,
    outputLimit: form.tokenMode === "custom" ? form.maxTokens : "平台默认",
    multiTurn:
      form.runtime === "quick-answer"
        ? "由 Hermes 管理跨轮历史"
        : "Hermes 管理跨轮历史；知识任务按上下文窗口执行",
    rag: usesRagConfig(form)
      ? `召回 ${form.topK} 条 · 向量阈值 ${form.vectorThreshold} · 关键词阈值 ${form.keywordThreshold} · ${form.rerankModel}`
      : "不使用 RAG 召回",
    tools:
      form.runtime === "smart-reasoning"
        ? effectiveExpertTools(form.tools)
        : [],
  };
}
