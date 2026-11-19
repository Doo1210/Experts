import { KNOWLEDGE_DOCUMENTS } from "./knowledge-demo";

const sources = {
  manual: {
    id: "zx42-maintenance",
    title: "ZX-42 维护手册",
    directory_path: ["设备运维", "校准作业"],
    locator: { text_anchor: "校准前检查" },
  },
  procedure: {
    id: "sensor-calibration",
    title: "传感器校准作业规范",
    directory_path: ["质量标准", "传感器"],
    locator: { text_anchor: "零点与量程复核" },
  },
  wiki: {
    id: "zx42-wiki",
    kind: "wiki",
    title: "校准记录与复核",
    library_name: "生产工艺手册",
    index_path: ["设备运维", "校准管理"],
    locator: {
      source_type: "wiki",
      wiki_page_id: "zx42-wiki",
      wiki_slug: "calibration-review",
    },
  },
  handoff: {
    id: "calibration-handoff",
    title: "校准记录交接指南.md",
    library_name: "生产工艺手册",
    locator: { text_anchor: "记录要求" },
  },
  table: {
    id: "zx42-calibration-log",
    title: "ZX-42 校准记录表",
    locator: { worksheet: "本周抽检", cell_range: "A2:C5" },
  },
  inspection: {
    id: "weekly-calibration-inspection",
    title: "本周抽检汇总.csv",
    library_name: "历史整改案例",
    locator: { worksheet: "本周抽检", cell_range: "A2:C5" },
  },
};

const manualExcerpt =
  "校准前先断开测量输入，检查接线和传感器外观，再进行零点校验。";
const manualRecordExcerpt = "接线复查后记录设备编号和本次维护时间。";
const manualReviewExcerpt =
  "发现接线松动、外观破损或零点不稳定时，记录异常并安排复核，确认后再继续校准。";
const procedureExcerpt =
  "零点校验完成后，在量程的低、中、高三个测点分别记录示值，并复核偏差。";
const procedureRecordExcerpt =
  "各测点的参考值、实际示值和偏差应逐项登记；待复核项目须保留原始记录。";
const wikiExcerpt =
  "校准记录应包含设备编号、测点、示值偏差、复核人和复核时间。";
const handoffExcerpt = "交接时单列待复核项目，附上原始示值和偏差。";
const tableSummary = "本周抽检共 4 条，3 条在允许偏差内，1 条待复核。";
const tableContent =
  "设备编号,测点,状态\nZX-42,零点,通过\nZX-42,低量程,通过\nZX-42,中量程,通过\nZX-42,高量程,待复核\n";
const manualInspectionDetail = [
  manualExcerpt,
  "开始前核对设备铭牌、传感器编号和现场任务单。若同一工位安装了多只外观相近的传感器，逐项比对设备编号和安装位置，确认记录表与本次操作对象一致。发现标识缺失或任务单与设备不一致时，先请负责人确认对应关系，再填写检查结果。",
  "查看传感器外壳、固定支架和连接件。记录松动、破损、受潮或变形等可见异常。按接线图复核接线端与线缆标签，重点查看插接件是否到位、保护套是否完好。需要拍照时，把设备编号和异常位置一并记录，方便复核人员找到同一处。",
  "外观和接线核对完成后，在记录表中注明检查时间和检查人。进行零点校验时，保存初次读数和复测读数。读数不稳定时，标注波动范围和观察条件，保留初次结果供复核。复核记录写明处理人、处理结果与确认时间。",
  "开工前再检查记录表中的设备编号、检查时间和复核结论是否齐全。需要后续处理的项目移入待复核清单，并注明交接人及下一次检查时间。检查结束后，由当班人员将任务单、检查记录和照片整理到同一设备档案。",
].join("\n\n");
const manualRecordDetail = [
  manualRecordExcerpt,
  "维护记录按设备编号和时间归档。记录操作人员、工位、任务单编号，以及检查和复测使用的记录表。更换部件时注明原部件和新部件的编号。涉及多台设备时，每台设备分别登记，复核人员可根据编号查到对应的现场记录。",
  "填写实际读数时，记录测点、单位及参考值。复测前后的读数各自保留，并注明复测原因。复核人员确认后填写结论和时间。待确认的内容单独列出，注明下一步需要核对的项目、负责人员和交接时间。",
].join("\n\n");
const handoffDetail = [
  handoffExcerpt,
  "交接单按设备和测点列出尚未复核的项目。每一项写明当前状态、原始读数和已采取的处理措施。相关记录保存在本轮维护任务目录，交接单可附上原始记录表名称，方便接班人员直接查阅。",
  "接班人员收到记录后，核对设备编号、测点和异常说明，补记确认时间。复核结果写回原记录对应项目，保留交接时的状态供追溯。涉及两班以上时，续写每次复核的时间、人员和结果。",
].join("\n\n");

export const knowledgeDemoOriginals = {
  [sources.manual.id]: {
    name: "ZX-42 维护手册.md",
    content: `# ZX-42 维护手册\n\n## 校准前检查\n\n${manualInspectionDetail}\n\n## 维护记录\n\n${manualRecordDetail}\n\n## 异常复核\n\n${manualReviewExcerpt}\n`,
  },
  [sources.procedure.id]: {
    name: "传感器校准作业规范.md",
    content: `# 传感器校准作业规范\n\n## 零点与量程复核\n\n${procedureExcerpt}\n\n## 测点登记\n\n${procedureRecordExcerpt}\n`,
  },
  [sources.wiki.id]: {
    name: "校准记录与复核.md",
    content: `## 记录要求\n\n${wikiExcerpt}\n\n| 记录项 | 填写要求 |\n| --- | --- |\n| 设备编号 | 与现场设备铭牌一致 |\n| 测点与偏差 | 同时保留初测与复测结果 |\n| 复核信息 | 填写复核人、复核时间和结论 |\n\n## 待复核项目\n\n${handoffDetail}\n\n复核结果由当班人员确认后归档。\n`,
  },
  [sources.handoff.id]: {
    name: sources.handoff.title,
    content: `# 校准记录交接指南\n\n## 记录要求\n\n${wikiExcerpt}\n\n## 待复核交接\n\n${handoffDetail}\n`,
  },
  [sources.table.id]: {
    name: "ZX-42 校准记录表.csv",
    content: tableContent,
  },
  [sources.inspection.id]: {
    name: sources.inspection.title,
    content: tableContent,
  },
};

const documentEvidence = [
  {
    evidence_id: "manual-hit",
    kind: "hit",
    source: sources.manual,
    hit: { text: manualExcerpt },
    access: "available",
    final_citation_number: 1,
  },
  {
    evidence_id: "procedure-hit",
    kind: "hit",
    source: sources.procedure,
    hit: { text: procedureExcerpt },
    access: "available",
    final_citation_number: null,
  },
];

const documentRun = {
  method: "reading",
  status: "success",
  evidence: documentEvidence,
};
const wikiEvidence = {
  evidence_id: "wiki-page",
  kind: "source",
  source: sources.wiki,
  access: "available",
  final_citation_number: 1,
};
const calibrationEvidence = [
  { ...documentEvidence[0], hit: { text: manualInspectionDetail } },
  {
    ...documentEvidence[0],
    evidence_id: "manual-record-hit",
    source: { ...sources.manual, locator: { text_anchor: "维护记录" } },
    hit: { text: manualRecordDetail },
    final_citation_number: 2,
  },
  {
    ...documentEvidence[0],
    evidence_id: "manual-review-hit",
    source: { ...sources.manual, locator: { text_anchor: "异常复核" } },
    hit: { text: manualReviewExcerpt },
    final_citation_number: 3,
  },
  { ...documentEvidence[1], final_citation_number: 4 },
  {
    ...documentEvidence[1],
    evidence_id: "procedure-record-hit",
    source: { ...sources.procedure, locator: { text_anchor: "测点登记" } },
    hit: { text: procedureRecordExcerpt },
    final_citation_number: 5,
  },
  {
    ...wikiEvidence,
    final_citation_number: 6,
  },
  {
    evidence_id: "inspection-summary",
    kind: "calculation",
    calculation: { summary: tableSummary, worksheet: "本周抽检" },
    calculation_sources: [sources.inspection],
    access: "available",
    final_citation_number: 7,
  },
  {
    evidence_id: "handoff-review-hit",
    kind: "hit",
    source: { ...sources.handoff, locator: { text_anchor: "待复核交接" } },
    hit: { text: handoffDetail },
    access: "available",
    final_citation_number: null,
  },
];
const successfulReply =
  "校准 ZX-42 前，先检查接线和传感器外观，再进行零点校验。[1]";

const calibrationProcess = [
  {
    tool: "query_understand",
    queries: ["ZX-42 校准要求"],
    result: "已完成问题理解",
  },
  {
    tool: "search_knowledge",
    queries: ["ZX-42 校准与零点校验要求"],
    result: "命中 6 个片段，来自 3 份文档",
  },
  {
    tool: "read_document",
    sources: [sources.manual],
    result: "已读取 3 个片段",
  },
  {
    tool: "wiki_search",
    queries: ["校准记录", "复核要求"],
    result: "找到 1 个 Wiki 页面",
  },
  { tool: "wiki_read_page", sources: [sources.wiki], result: "已读取页面" },
  {
    tool: "search_knowledge",
    queries: ["ZX-42 高量程偏差处理"],
    result: "无匹配",
  },
  {
    tool: "read_document",
    sources: [sources.procedure],
    result: "已读取 2 个片段",
  },
  {
    tool: "read_document",
    sources: [sources.handoff],
    result: "已读取 1 个片段",
  },
  {
    tool: "data_analysis",
    sources: [sources.inspection],
    result: "已完成分析，返回 4 条结果",
  },
];

export const knowledgeDemoScenes = new Map([
  [
    "演示工具：检索知识",
    {
      runs: [
        {
          ...documentRun,
          evidence: calibrationEvidence,
          process: calibrationProcess,
          summary:
            "已查到 ZX-42 的设备检查、零点校验和测点登记要求。校准记录需保留示值偏差、复核人及复核时间。本周抽检中有 1 条待复核，高量程偏差的处理要求仍需进一步核对。",
        },
      ],
      answer: [
        "## ZX-42 校准与复核",
        "本轮核对覆盖设备准备、测点验证和结果交接。开工前先确认设备和接线状态，再校验零点、逐项记录各测点结果。发现异常时保留原始记录，交给复核人员确认后再继续。[1][2][3][4][5]",
        "### 1. 校准前检查",
        "核对设备编号和本次维护时间，断开测量输入后检查传感器外观及接线。若发现松动、破损或零点不稳定，先登记异常；复核确认后再开始校准。[1][2][3]",
        "### 2. 测点验证与记录",
        "零点校验通过后，按低、中、高三个测点依次核对。每个测点分别登记参考值、实际示值和偏差，并在记录中补齐设备编号、复核人和复核时间。待复核的测点保留原始记录，方便回查。[4][5][6]",
        "### 3. 本周抽检复核",
        "本周共抽检 4 条，3 条在允许偏差内，另有 1 条待复核。交接时单列待复核记录，注明对应设备和测点，并附原始示值与偏差供下一班核对。[5][6][7]",
      ].join("\n\n"),
    },
  ],
  [
    "演示工具：检索知识部分完成",
    {
      runs: [
        {
          ...documentRun,
          status: "partial",
          warnings: ["The native answer reached its output limit."],
          evidence: documentEvidence.slice(0, 1),
        },
      ],
      answer: successfulReply + "其余校准细节需要进一步核对。",
    },
  ],
  [
    "演示工具：检索知识无结果",
    {
      runs: [{ method: "reading", status: "empty" }],
      answer:
        "在本次检索范围内未找到 ZX-42 的校准资料。请补充设备型号或校准记录。",
    },
  ],
  [
    "演示工具：检索知识失败",
    {
      runs: [{ terminal: "failed", errorCode: "permission_denied" }],
      answer: "本次检索未能读取所选资料。请核对资料的访问权限。",
    },
  ],
  [
    "演示工具：检索知识取消",
    {
      runs: [{ terminal: "cancelled" }],
      answer: "本次资料检索已取消。",
    },
  ],
  [
    "演示工具：检索知识超时",
    {
      runs: [{ terminal: "timed_out" }],
      answer: "本次资料检索超时，暂时无法确认校准要求。",
    },
  ],
  [
    "演示工具：多次检索知识",
    {
      runs: [
        {
          method: "wiki",
          status: "success",
          evidence: [wikiEvidence],
          summary: wikiExcerpt,
        },
        {
          method: "table_analysis",
          status: "success",
          evidence: [
            {
              evidence_id: "calibration-summary",
              kind: "calculation",
              calculation: { summary: tableSummary, worksheet: "本周抽检" },
              calculation_sources: [sources.table],
              access: "available",
              final_citation_number: 2,
            },
          ],
        },
      ],
      answer:
        "校准记录应包含测点、示值偏差和复核信息。[1]\n\n本周抽检共 4 条，其中 1 条待复核。[2]",
    },
  ],
]);

export function knowledgeProcessForRun(run, query) {
  if (run.process) return run.process;
  const understanding = {
    tool: "query_understand",
    queries: [query],
    result: "已完成问题理解",
  };
  if (run.terminal) {
    return [
      understanding,
      {
        tool: "search_knowledge",
        queries: [query],
        result: {
          failed: "当前没有访问所选资料的权限",
          cancelled: "检索已取消",
          timed_out: "检索超时",
        }[run.terminal],
        status: run.terminal === "cancelled" ? "interrupted" : "error",
      },
    ];
  }
  const evidence = (run.evidence || []).filter(
    (item) => item.access === "available",
  );
  const documents = new Map();
  const pages = new Map();
  const process = [understanding];
  for (const item of evidence) {
    if (item.kind === "hit" && item.source && item.hit) {
      const source = item.source;
      const id = source.document_id || source.locator?.document_id || source.id;
      if (!documents.has(id)) documents.set(id, { source, hits: new Set() });
      documents.get(id).hits.add(item.hit.id || item.evidence_id);
    }
    if (item.kind === "source" && item.source?.kind === "wiki") {
      pages.set(item.source.id, item.source);
    }
  }
  if (
    documents.size ||
    (!pages.size && !evidence.some((item) => item.kind === "calculation"))
  ) {
    const count = [...documents.values()].reduce(
      (total, document) => total + document.hits.size,
      0,
    );
    process.push({
      tool: "search_knowledge",
      queries: [query],
      result: count
        ? `命中 ${count} 个片段，来自 ${documents.size} 份文档`
        : "无匹配",
    });
  }
  for (const { source, hits } of documents.values()) {
    process.push({
      tool: "read_document",
      sources: [source],
      result: `已读取 ${hits.size} 个片段`,
    });
  }
  if (pages.size) {
    process.push({
      tool: "wiki_search",
      queries: [query],
      result: `找到 ${pages.size} 个 Wiki 页面`,
    });
    process.push({
      tool: "wiki_read_page",
      sources: [...pages.values()],
      result: "已读取页面",
    });
  }
  for (const item of evidence.filter((entry) => entry.kind === "calculation")) {
    process.push({
      tool: "data_analysis",
      sources: item.calculation_sources,
      result: item.calculation.summary,
    });
  }
  return process;
}

export function knowledgeSummaryForRun(run) {
  if (run.summary) return run.summary;
  const evidence = (run.evidence || []).filter(
    (item) => item.access === "available",
  );
  const excerpts = evidence
    .map((item) => item.hit?.text || item.calculation?.summary)
    .filter(Boolean);
  return excerpts.length
    ? [...new Set(excerpts)].slice(0, 2).join("\n\n")
    : "本次检索范围内未找到可用资料。";
}

export function processKnowledgeDemo(referenceScene) {
  return {
    runs: referenceScene?.runs || [documentRun],
    answer:
      (referenceScene?.answer || successfulReply) +
      "\n\n已整理分析结论；本轮文件操作结果请在产出区核对。",
  };
}

const referenceSamples = {
  doc_quality_incoming: {
    locator: { page_number: 2 },
    excerpt:
      "来料检验先核对物料批号、送检数量和供应商凭证，再按抽样计划记录实测结果。",
  },
  doc_quality_yield: {
    locator: { text_anchor: "良率计算口径" },
    excerpt:
      "良率按合格件数除以检验件数计算。复检通过的数据应单独记录，避免重复计入分母。",
  },
  doc_quality_exception: {
    locator: { text_anchor: "异常判定与处置" },
    excerpt:
      "实测值超出规格限时，应隔离对应批次并记录测量条件，由质量人员复核后确定处置方式。",
  },
  doc_process_manual: {
    locator: { page_number: 3 },
    excerpt:
      "关键工序开机前应核对作业参数和工装状态，首件经检验确认后才可继续生产。",
  },
  doc_process_changeover: {
    locator: { text_anchor: "换型确认" },
    excerpt:
      "产线换型前应清理上一型号的物料，核对新型号的工艺参数，并记录首件确认结果。",
  },
  doc_case_night: {
    locator: { page_number: 2 },
    excerpt:
      "夜班良率出现波动时，按班次和设备拆分数据，结合换班记录与报警时间核对异常批次。",
  },
  doc_case_tracking: {
    locator: { worksheet: "整改跟踪", cell_range: "A2:C4" },
    excerpt: "样例包含 3 项整改，其中 2 项已完成验证，1 项仍待复核。",
    csv: "事项,责任组,状态\n首件检验复核,质量组,验证完成\n换型记录补齐,生产组,验证完成\n夜班设备巡检,设备组,待复核\n",
  },
};

for (const document of KNOWLEDGE_DOCUMENTS) {
  const sample = referenceSamples[document.id];
  if (!sample) continue;
  const title = document.name.replace(/\.[^.]+$/, "");
  knowledgeDemoOriginals[document.id] = {
    name: sample.csv ? `${title}.csv` : `${title}.txt`,
    content: sample.csv || `${title}\n\n${sample.excerpt}\n`,
  };
}

export function knowledgeSceneForReferences(references) {
  const libraries = new Set(
    references
      .filter((item) => item.kind === "knowledge_library")
      .map((item) => item.id),
  );
  const documents = new Set(
    references
      .filter((item) => item.kind === "knowledge_document")
      .map((item) => item.id),
  );
  if (!libraries.size && !documents.size) return null;

  const evidence = KNOWLEDGE_DOCUMENTS.filter(
    (document) =>
      referenceSamples[document.id] &&
      (documents.has(document.id) || libraries.has(document.libraryId)),
  ).map((document, index) => {
    const sample = referenceSamples[document.id];
    const source = {
      id: document.id,
      title: document.name,
      locator: sample.locator,
    };
    return {
      evidence_id: `${document.id}-evidence`,
      access: "available",
      final_citation_number: index + 1,
      ...(sample.csv
        ? {
            kind: "calculation",
            calculation: {
              summary: sample.excerpt,
              worksheet: sample.locator.worksheet,
            },
            calculation_sources: [source],
          }
        : { kind: "hit", source, hit: { text: sample.excerpt } }),
    };
  });
  const method =
    evidence.length && evidence.every((item) => item.kind === "calculation")
      ? "table_analysis"
      : "reading";
  return {
    runs: [{ method, status: evidence.length ? "success" : "empty", evidence }],
    answer: evidence.length
      ? "以下是本轮引用资料中的检索结果。\n\n" +
        evidence
          .map(
            (item) =>
              `- ${item.hit?.text || item.calculation.summary}[${item.final_citation_number}]`,
          )
          .join("\n")
      : "本轮引用的知识资料中未找到可用内容。",
  };
}
