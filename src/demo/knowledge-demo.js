export const KNOWLEDGE_CATALOG = [
  {
    id: "kb_quality",
    name: "质量标准与规范",
    count: 24,
    source: "企业共享",
    status: "ready",
    description: "质量检查标准、作业规范与审核记录",
    capabilities: ["rag"],
  },
  {
    id: "kb_process",
    name: "生产工艺手册",
    count: 18,
    source: "企业共享",
    status: "ready",
    description: "工艺作业手册与 Wiki 操作指南",
    capabilities: ["rag", "wiki"],
  },
  {
    id: "kb_cases",
    name: "历史整改案例",
    count: 36,
    source: "我创建的",
    status: "ready",
    description: "历史问题、整改问答与分析表格",
    capabilities: ["rag", "table"],
  },
  {
    id: "kb_trial",
    name: "试验验证资料",
    count: 3,
    source: "我创建的",
    status: "processing",
    description: "试验报告与验证记录",
    capabilities: ["rag", "table"],
    statusReason: "资料仍在解析，完成后可关联",
  },
  {
    id: "kb_supplier",
    name: "供应商质量档案",
    count: 42,
    source: "企业共享",
    status: "locked",
    description: "供应商检查与来料质量档案",
    capabilities: ["rag"],
    statusReason: "当前账号没有使用权限",
  },
];

export const KNOWLEDGE_FILE_TYPES = [
  "PDF",
  "Word",
  "文本",
  "Markdown",
  "CSV",
  "Excel（XLSX）",
];

export const KNOWLEDGE_MODES = [
  {
    id: "quick-answer",
    name: "快速问答",
    description: "检索资料后快速形成回答",
    requirement: "适合有明确问题的资料查询",
    capability: "rag",
    config: {
      model: "知识问答模型",
      multiTurn: "启用 · 保留最近 6 轮",
      rag: "FAQ 优先 · 召回 10 条 · 启用重排",
      tools: [],
    },
  },
  {
    id: "smart-reasoning",
    name: "智能推理",
    description: "多步检索、阅读并综合资料",
    requirement: "适合跨资料归纳、比较和核对",
    capability: "rag",
    config: {
      model: "知识推理模型",
      multiTurn: "按上下文窗口管理历史",
      rag: "召回 10 条 · 启用重排",
      tools: ["检索知识", "列出文档", "阅读文档"],
    },
  },
  {
    id: "wiki-answer",
    name: "维基问答",
    description: "沿知识页面检索并追溯来源",
    requirement: "需要可访问的 Wiki 资料",
    capability: "wiki",
    config: {
      model: "知识推理模型",
      multiTurn: "按上下文窗口管理历史",
      rag: "不使用 RAG 召回",
      tools: ["搜索 Wiki", "阅读页面"],
    },
  },
  {
    id: "data-analysis",
    name: "数据分析",
    description: "检索并分析表格，给出统计结果",
    requirement: "需要 CSV 或 Excel（XLSX）表格",
    capability: "table",
    config: {
      model: "知识分析模型",
      multiTurn: "按上下文窗口管理历史",
      rag: "不使用 RAG 召回",
      tools: ["读取表结构", "分析数据"],
    },
  },
];

export const KNOWLEDGE_CUSTOM_CANDIDATES = [
  {
    id: "review-approved",
    name: "合规审查",
    description: "核对质量规范并列出待确认项",
    model: "知识推理模型",
    type: "RAG 问答",
    status: "ready",
  },
];

export function defaultKnowledgeConfig(expertId = "") {
  return {
    scope:
      expertId === "exp_quality"
        ? "selected"
        : expertId === "exp_ops"
          ? "none"
          : "all",
    libraryIds: expertId === "exp_quality" ? ["kb_quality", "kb_process"] : [],
    fileTypes: expertId === "exp_quality" ? ["PDF", "文本"] : [],
    methodIds:
      expertId === "exp_quality"
        ? ["quick-answer", "smart-reasoning", "wiki-answer"]
        : ["quick-answer", "smart-reasoning"],
    defaultMethodId: "smart-reasoning",
    customMethods: [],
  };
}

export function migrateKnowledgeConfig(previous, expertId = "") {
  const base = defaultKnowledgeConfig(expertId);
  if (!previous || typeof previous !== "object") return base;
  const builtInIds = new Set(KNOWLEDGE_MODES.map((mode) => mode.id));
  const customMethods = Array.isArray(previous.customMethods)
    ? previous.customMethods.filter((mode) => mode && mode.id && mode.name)
    : [];
  const validIds = new Set([
    ...builtInIds,
    ...customMethods.map((mode) => mode.id),
  ]);
  const oldMode =
    previous.mode === "quick-retrieval" ? "quick-answer" : previous.mode;
  const defaultMethodId =
    previous.defaultMethodId || oldMode || base.defaultMethodId;
  const methodIds = Array.isArray(previous.methodIds)
    ? previous.methodIds.filter((id) => validIds.has(id))
    : oldMode === "auto"
      ? [...builtInIds]
      : [validIds.has(oldMode) ? oldMode : base.defaultMethodId];
  const normalizedDefault =
    defaultMethodId === "auto" || validIds.has(defaultMethodId)
      ? defaultMethodId
      : base.defaultMethodId;
  const fileTypes = Array.isArray(previous.fileTypes)
    ? previous.fileTypes
        .map((type) => (type === "Excel" ? "Excel（XLSX）" : type))
        .filter((type) => KNOWLEDGE_FILE_TYPES.includes(type))
    : base.fileTypes;
  return {
    scope:
      previous.enabled === false
        ? "none"
        : ["selected", "all", "none"].includes(previous.scope)
          ? previous.scope
          : base.scope,
    libraryIds: Array.isArray(previous.libraryIds)
      ? previous.libraryIds.slice()
      : base.libraryIds,
    fileTypes: [...new Set(fileTypes)],
    methodIds: [...new Set(methodIds)],
    defaultMethodId: normalizedDefault,
    customMethods,
  };
}
