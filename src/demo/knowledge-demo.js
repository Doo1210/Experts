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
    hint: "适合问题明确、答案可从少量资料中直接找到的场景；先检索相关内容，再快速整理回答并保留来源。",
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
    hint: "适合需要跨文档核对、比较或归纳的问题；专家会分步检索和阅读资料，综合证据后形成回答。",
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
    hint: "适合查询流程、术语及关联页面；专家会沿 Wiki 页面逐步查找，并在回答中保留来源路径。",
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
    hint: "适合 CSV 或 Excel 表格中的统计、对比和趋势问题；专家会读取表结构与数据，分析后给出结论。",
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
    defaultMethodId: normalizedDefault,
    customMethods,
  };
}
