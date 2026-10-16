export const KNOWLEDGE_CATALOG = [
  {
    id: "kb_quality",
    name: "质量标准与规范",
    count: 24,
    source: "企业共享",
    status: "ready",
  },
  {
    id: "kb_process",
    name: "生产工艺手册",
    count: 18,
    source: "企业共享",
    status: "ready",
  },
  {
    id: "kb_cases",
    name: "历史整改案例",
    count: 36,
    source: "我创建的",
    status: "ready",
  },
  {
    id: "kb_trial",
    name: "试验验证资料",
    count: 3,
    source: "我创建的",
    status: "processing",
  },
  {
    id: "kb_supplier",
    name: "供应商质量档案",
    count: 42,
    source: "企业共享",
    status: "locked",
  },
];

export const KNOWLEDGE_FILE_TYPES = [
  "PDF",
  "Word",
  "文本",
  "Markdown",
  "CSV",
  "Excel",
  "图片",
];

export const KNOWLEDGE_MODES = [
  {
    id: "quick-retrieval",
    name: "快速检索",
    description: "检索相关原文，由专家组织回答",
  },
  {
    id: "quick-answer",
    name: "快速问答",
    description: "检索资料后快速形成回答",
  },
  {
    id: "smart-reasoning",
    name: "智能推理",
    description: "多步检索、阅读并综合资料",
  },
  {
    id: "wiki-answer",
    name: "维基问答",
    description: "沿知识页面检索并追溯来源",
  },
  {
    id: "data-analysis",
    name: "数据分析",
    description: "检索并分析表格，给出统计结果",
  },
];

export function defaultKnowledgeConfig(expertId = "") {
  return {
    enabled: expertId !== "exp_ops",
    scope: expertId === "exp_quality" ? "selected" : "all",
    libraryIds: expertId === "exp_quality" ? ["kb_quality", "kb_process"] : [],
    fileTypes: expertId === "exp_quality" ? ["PDF", "文本"] : [],
    mentionOnly: false,
    mode: "smart-reasoning",
  };
}
