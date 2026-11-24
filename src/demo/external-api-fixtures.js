import { dateText } from "./external-api";

const A_LINE_FOLLOW_UPS = [
  [
    "按班次拆一下 A 线的良率。",
    "白班良率 95.4%，晚班 93.8%。优先复核晚班切换后的首件记录。",
  ],
  [
    "异常批次各有多少不良？",
    "A241 发现 12 件不良，A244 发现 9 件。两批需要分别复检。",
  ],
  [
    "这两个批次的缺陷类型一样吗？",
    "均有贴装偏移。A244 另有少量焊点虚接，可单独归类。",
  ],
  [
    "对照上一个正常批次。",
    "与正常批次 A239 相比，异常批次的贴装偏移明显增加。",
  ],
  [
    "偏移主要在板子的哪个区域？",
    "偏移主要集中在板边连接器位置。可优先检查该区域的定位和支撑。",
  ],
  [
    "查看该区域的首件检测。",
    "A241 的首件记录缺少该位置的偏移量。建议补测并上传照片。",
  ],
  [
    "这两个批次用的是同一批物料吗？",
    "关键元件来自同一来料批次。正常批次也使用过该来料，暂把物料列为次要排查项。",
  ],
  [
    "回流焊温区有没有明显异常？",
    "现有温区记录均在设定范围内，暂未发现与偏移直接相关的温度变化。",
  ],
  [
    "晚班切换后有哪些工艺改动？",
    "看到吸嘴清洁记录和换线动作。建议逐项复核换线后的定位基准。",
  ],
  [
    "需要暂停后续批次吗？",
    "建议先隔离 A241、A244，再通过首件复检决定是否继续放行。",
  ],
  ["复检要记录哪些信息？", "记录批次、板号、元件位置、X/Y 偏移量和复检照片。"],
  [
    "给出一组可用的复检样本。",
    "建议异常批次各抽 5 块板，并取 A239 的 5 块板作为对照。",
  ],
  [
    "若对照也有偏移，下一步怎么排？",
    "先复查测量基准与夹具，再核对贴装校准，按结果决定是否扩大隔离范围。",
  ],
  [
    "把前面的结果整理成交接摘要。",
    "交接重点为两批隔离、板边位置复检及换线校准记录核查。",
  ],
];

const B_LINE_FOLLOW_UPS = [
  [
    "B104 是哪项指标超限？",
    "B104 的尺寸均值超出上控制限，外观抽检在当前抽样范围内合格。",
  ],
  ["和相邻批次比较一下。", "B103、B105 都在控制限内，偏移集中于 B104。"],
  ["这个偏移出现在什么时段？", "连续偏高记录集中在上午换料后的首批抽检。"],
  [
    "确认一下复测前的准备。",
    "先核对量具清零、校准日期和测量环境，再复测原样。",
  ],
  [
    "把原样复测和追加抽样分开。",
    "原样复测核实偏移，追加抽样估计影响范围，两类数据分别记录。",
  ],
  [
    "增抽样本从哪几个位置取？",
    "建议从批次头、中、尾取样，保留各位置的批内分布。",
  ],
  [
    "给我一份班组交接要点。",
    "记录 B104 隔离状态、量具检查情况和头中尾加抽结果。",
  ],
  [
    "复检通过后需要谁复核？",
    "建议由当班质检复核数据，再由质量负责人按放行流程确认。",
  ],
];

export function createExternalApiFollowUpRuns(runs) {
  const byId = new Map(runs.map((run) => [run.id, run]));
  const followUpsBetween = (prefix, firstId, nextId, examples) => {
    const first = byId.get(firstId);
    const next = byId.get(nextId);
    if (!first || !next || first.conversationId !== next.conversationId)
      return [];
    const after = Date.parse(first.finishedAt || first.submittedAt);
    const before = Date.parse(next.submittedAt);
    const interval = (before - after) / (examples.length + 1);
    if (!(interval > 20_000)) return [];

    return examples.map(([input, output], index) => {
      const submittedAt = after + interval * (index + 1);
      const startedAt = submittedAt + 800;
      const durationMs = 7_800 + (index % 5) * 2_050;
      return {
        id: `run_qa_${prefix}_followup_${String(index + 1).padStart(2, "0")}`,
        expertId: next.expertId,
        conversationId: next.conversationId,
        keyId: next.keyId,
        keyName: next.keyName,
        input,
        output,
        status: "completed",
        submittedAt: new Date(submittedAt).toISOString(),
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(startedAt + durationMs).toISOString(),
        durationMs,
        events: [],
      };
    });
  };
  return [
    ...followUpsBetween(
      "a",
      "run_qa_001_09e7c3ad",
      "run_qa_003_a1f34ed8",
      A_LINE_FOLLOW_UPS,
    ),
    ...followUpsBetween(
      "b",
      "run_qa_002_8b41e9af",
      "run_qa_005_74dca814",
      B_LINE_FOLLOW_UPS,
    ),
  ];
}

export function createExternalApiFixtures(today = new Date()) {
  const expertId = "exp_quality";
  const ago = (minutes) =>
    new Date(today.getTime() - minutes * 60_000).toISOString();
  const nextYear = today.getFullYear() + 1;
  const key = (id, name, description, options = {}) => ({
    id,
    expertId,
    name,
    description,
    createdBy: "平台管理员",
    createdAt: ago(10 * 1440),
    enabled: true,
    expiresOn: `${nextYear}-12-31`,
    deletedAt: null,
    ...options,
  });
  const current = key(
    "key_15d3c570a2b344bc90a17a2c94008f2a",
    "MES 质检系统",
    "接收产线质检问题和分析请求",
  );
  const previous = key(
    "key_43e9d410b6e947319c0f2c6df1f13c80",
    "MES 质检系统（旧）",
    "用于追溯此前从 MES 提交的运行",
    { enabled: false, expiresOn: "" },
  );
  const expired = key(
    "key_a00c76561f2b40998874ab49fde07b14",
    "质检联调",
    "早期测试使用",
    { expiresOn: dateText(new Date(ago(1440))) },
  );
  const a = "conv_qa_a_4f2a9de0283c";
  const b = "conv_qa_b_7b391a9ed0cf";
  const aInput = "分析今天 A 线的良率异常，给出优先排查方向。";
  const bInput = "检查 B 线今天的抽检情况，找出超限批次。";
  const run = (
    number,
    conversationId,
    credential,
    input,
    status,
    minutes,
    details = {},
  ) => ({
    id: `run_qa_${number}`,
    expertId,
    conversationId,
    keyId: credential.id,
    keyName: credential.name,
    input,
    status,
    submittedAt: ago(minutes),
    startedAt: status === "queued" ? null : ago(minutes - 0.02),
    finishedAt: details.durationMs
      ? ago(minutes - 0.02 - details.durationMs / 60_000)
      : null,
    events: [],
    ...details,
  });
  const event = (id, type, minutes, seconds, fields) => ({
    id,
    type,
    at: ago(minutes - seconds / 60),
    ...fields,
  });
  const fixtures = {
    externalApiKeys: [current, previous, expired],
    externalApiConversations: [
      { id: a, expertId, firstInput: aInput },
      { id: b, expertId, firstInput: bInput },
    ],
    externalApiRuns: [
      run("001_09e7c3ad", a, previous, aInput, "completed", 180, {
        durationMs: 18320,
        output:
          "**A 线良率为 94.6%**，低于班次目标 2.4 个百分点。异常集中在贴装和回流焊，建议先核对 A241 与 A244 批次的设备参数。",
        events: [
          event(1, "message_delta", 180, 2, {
            text: "我先核对班次报表，再对比异常批次。",
          }),
          event(2, "tool_started", 180, 3, {
            name: "查询质检数据",
            summary: "A 线 · 今日班次 · 良率与异常批次",
          }),
          event(3, "tool_completed", 180, 5.4, {
            name: "查询质检数据",
            status: "completed",
            durationMs: 2400,
            summary:
              "良率 94.6%；异常批次 A241、A244；设备标识和工单信息已脱敏。",
            truncated: true,
          }),
        ],
      }),
      run("002_8b41e9af", b, current, bInput, "completed", 130, {
        durationMs: 9710,
        output:
          "已核对 B 线今日抽检。仅 B104 批次超出控制限，建议先隔离该批次并安排复检。",
      }),
      run(
        "003_a1f34ed8",
        a,
        current,
        "刚才的异常主要集中在哪个工序？",
        "completed",
        45,
        {
          durationMs: 12260,
          output:
            "**贴装工序优先排查。** 两个异常批次在该工序均出现偏移，建议复核首件并校准贴装头。",
          events: [
            event(1, "tool_started", 45, 2, {
              name: "核对工序报表",
              summary: "A 线 · A241 和 A244 批次",
            }),
            event(2, "tool_completed", 45, 4, {
              name: "核对工序报表",
              status: "completed",
              durationMs: 2000,
              summary: "两个批次均在贴装工序出现偏移。",
            }),
          ],
        },
      ),
      run(
        "004_f5cb51bd",
        a,
        current,
        "请关联设备最近一周的维护记录。",
        "failed",
        28,
        {
          durationMs: 5130,
          error: {
            code: "CLARIFICATION_REQUIRED",
            message: "缺少设备编号。请补充设备编号后提交下一轮。",
          },
        },
      ),
      run("005_74dca814", b, current, "B104 批次涉及哪些设备？", "running", 2, {
        events: [
          event(1, "message_delta", 2, 1.5, {
            text: "正在根据批次记录追踪关联设备。",
          }),
          event(2, "tool_started", 2, 2, {
            name: "查询设备台账",
            summary: "B 线 · B104 批次",
          }),
        ],
      }),
      run(
        "006_f8eac338",
        a,
        current,
        "设备编号为 A-M04，请继续核查维护记录。",
        "queued",
        0.5,
      ),
    ],
  };
  fixtures.externalApiRuns.push(
    ...createExternalApiFollowUpRuns(fixtures.externalApiRuns),
  );
  return fixtures;
}
