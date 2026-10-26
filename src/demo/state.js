import Vue from "vue";
import {
  demoChannelDeliveries,
  demoChannelTargets,
} from "./channel-target-fixtures";
import {
  applyConversationEvent,
  createConversationTurn,
  normalizeConversationTurns,
} from "./conversation-turns";
import {
  applySessionPresentationEvent,
  emptySessionPresentation,
  normalizeSessionPresentation,
} from "./conversation-session-state";
import { clearFiles, deleteFile } from "./file-db";
import { createImDemoChats, createImWorkspaceItems } from "./im-fixtures";
import { mcpDemoPreset } from "./mcp-demo";
import {
  KNOWLEDGE_CATALOG,
  KNOWLEDGE_DOCUMENTS,
  defaultKnowledgeConfig,
  migrateKnowledgeConfig,
} from "./knowledge-demo";
import {
  enrichProjectFixtures,
  PROJECT_EXPERT_FIXTURES,
} from "./project-fixtures";
import { findToolActivityScene } from "./tool-activity-scenes";

export const STORAGE_KEY = "digital-employee-demo-v3";
const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const DEMO_DATA_REVISION = 20;

const QUALITY_NAVIGATION_TOPICS = [
  [
    "本周 1 号产线良率如何变化？",
    "样例良率先下降后回升，建议先核对每日检验口径。",
  ],
  ["哪一天的波动最大？", "样例中周三波动最大，建议对照当日批次与设备记录。"],
  [
    "异常主要集中在哪些批次？",
    "样例异常集中在两个连续批次，需进一步核对来料和工艺参数。",
  ],
  [
    "是否与设备停机有关？",
    "样例记录中有一次短暂停机，当前信息只能提示相关性。",
  ],
  [
    "该先核对哪项检验数据？",
    "建议先核对抽检数量、判定标准和原始记录是否一致。",
  ],
  [
    "来料变化是否影响良率？",
    "可以按供应批次对齐时间线，再比较变化前后的不良类型。",
  ],
  ["夜班和白班有差异吗？", "样例显示夜班波动略大，需结合产量和抽样数量核实。"],
  ["需要复查哪些工艺参数？", "优先复查温度、压力及节拍记录，并标记异常时段。"],
  [
    "目前能否确定根因？",
    "样例信息不足以确认根因，应先完成批次、设备与检验口径交叉核对。",
  ],
  ["怎样整理给现场负责人？", "可按现象、证据、待核查项和责任人形成简短清单。"],
  ["下一步验证如何安排？", "建议先复测重点批次，再对照设备日志和来料记录。"],
  [
    "如何形成最终改进建议？",
    "把已验证事实与待确认假设分开，再列出措施和验收条件。",
  ],
];

function createQualityNavigationMessages() {
  return Array.from({ length: 72 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const topic =
      QUALITY_NAVIGATION_TOPICS[index % QUALITY_NAVIGATION_TOPICS.length];
    const round = Math.floor(index / QUALITY_NAVIGATION_TOPICS.length) + 1;
    return [
      {
        id: `msg_quality_navigation_user_${number}`,
        role: "user",
        content: `演示问题 ${number}：${topic[0]}`,
        createdAt: new Date(Date.UTC(2026, 9, 21, 1, index * 2)).toISOString(),
      },
      {
        id: `msg_quality_navigation_assistant_${number}`,
        role: "assistant",
        content: `第 ${round} 组样例：${topic[1]}`,
        createdAt: new Date(
          Date.UTC(2026, 9, 21, 1, index * 2 + 1),
        ).toISOString(),
        status: "done",
      },
    ];
  }).flat();
}

const ADDITIONAL_EXPERT_SPECS = [
  {
    id: "exp_process",
    name: "工艺优化专家",
    description: "梳理生产工艺参数，定位波动环节并提出优化建议",
    tags: ["工艺优化", "参数分析"],
    avatarUrl: "/experts/avatars/process-man.svg",
    model: "推理模型",
    presetQuestions: ["分析这条产线的工艺波动", "整理关键参数的优化方向"],
    skills: ["表格分析", "报告撰写"],
    channelIds: ["wecom", "dingtalk"],
  },
  {
    id: "exp_safety",
    name: "安全巡检专家",
    description: "整理巡检记录、识别隐患并生成整改跟踪清单",
    tags: ["安全生产", "风险排查"],
    avatarUrl: "/experts/avatars/safety-woman.svg",
    model: "视觉模型",
    presetQuestions: ["整理本周巡检发现的问题", "生成隐患整改清单"],
    skills: ["记录整理", "报告撰写"],
    channelIds: ["dingtalk"],
  },
  {
    id: "exp_algorithm",
    name: "算法评估专家",
    description: "对照测试指标和样例结果，归纳模型表现与改进方向",
    tags: ["算法评估", "模型分析"],
    avatarUrl: "/experts/avatars/algorithm-woman.svg",
    model: "推理模型",
    presetQuestions: ["比较两版模型的测试结果", "分析误判样例的共同特征"],
    skills: ["表格分析", "报告撰写"],
    channelIds: [],
  },
  {
    id: "exp_digital",
    name: "数字化顾问专家",
    description: "梳理业务流程和系统现状，形成数字化建设建议",
    tags: ["数字化", "方案规划"],
    avatarUrl: "/experts/avatars/digital-woman.svg",
    model: "通用大模型",
    presetQuestions: ["梳理当前业务流程痛点", "制定数字化改造路线图"],
    skills: ["资料整理", "报告撰写"],
    channelIds: ["wecom", "dingtalk", "feishu"],
  },
];

const CHANNEL_SHOWCASE_UPGRADES = [
  { expertId: "exp_ops", before: ["feishu"], after: ["dingtalk", "feishu"] },
  {
    expertId: "exp_equipment",
    before: [],
    after: ["wecom", "dingtalk", "feishu"],
  },
  {
    expertId: "exp_process",
    before: ["wecom"],
    after: ["wecom", "dingtalk"],
  },
  {
    expertId: "exp_digital",
    before: ["feishu"],
    after: ["wecom", "dingtalk", "feishu"],
  },
];

function upgradeChannelShowcase(saved) {
  for (const sample of CHANNEL_SHOWCASE_UPGRADES) {
    const expert = saved.experts.find((item) => item.id === sample.expertId);
    const channels = expert?.channels;
    if (!Array.isArray(channels) || channels.length !== 3) continue;
    const original = new Set(sample.before);
    const unchanged = channels.every(
      (channel) =>
        ["wecom", "dingtalk", "feishu"].includes(channel.id) &&
        channel.enabled === original.has(channel.id) &&
        channel.connected === original.has(channel.id),
    );
    if (!unchanged) continue;
    const active = new Set(sample.after);
    channels.forEach((channel) => {
      channel.enabled = active.has(channel.id);
      channel.connected = active.has(channel.id);
    });
  }
}

function createSupplementalExpert(spec) {
  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    tags: spec.tags.slice(),
    avatar: spec.name.slice(0, 1),
    avatarUrl: spec.avatarUrl,
    status: "active",
    model: spec.model,
    persona: {
      responsibility: `负责${spec.description}。`,
      workflow: "明确任务目标 → 核对演示资料 → 整理分析 → 输出建议。",
      rules: "仅基于演示数据给出建议；信息不足时先说明需要补充的资料。",
    },
    personaSaved: true,
    presetEnabled: true,
    presetQuestions: spec.presetQuestions.slice(),
    memoryEnabled: true,
    learningEnabled: false,
    knowledge: defaultKnowledgeConfig(spec.id),
    skills: spec.skills.map((name, index) => ({
      id: `${spec.id}_skill_${index + 1}`,
      name,
      description: `${name}并辅助完成${spec.tags[0]}相关演示任务`,
      source: "内置",
      enabled: true,
    })),
    tools: [
      { id: "tool_file", name: "文件工具", enabled: true },
      { id: "tool_search", name: "搜索工具", enabled: true },
    ],
    mcps: [],
    channels: [
      { id: "wecom", name: "企业微信" },
      { id: "dingtalk", name: "钉钉" },
      { id: "feishu", name: "飞书" },
    ].map((channel) => ({
      ...channel,
      enabled: spec.channelIds.includes(channel.id),
      connected: spec.channelIds.includes(channel.id),
      proactive: false,
      files: false,
      ...demoChannelTargets(spec.id, channel.id),
      deliveries: demoChannelDeliveries(spec.id, channel.id),
    })),
    workspaceRoot: `/专家/${spec.name}`,
    files: [
      { id: `${spec.id}_im`, name: "消息渠道", parentId: null, kind: "folder" },
      {
        id: `${spec.id}_event`,
        name: "自主任务",
        parentId: null,
        kind: "folder",
      },
    ],
  };
}

function createSupplementalTemplate(spec) {
  return {
    id: `tpl_${spec.id.slice(4)}`,
    name: `${spec.name}模板`,
    description: spec.description,
    tags: spec.tags.slice(),
    sourceExpertId: spec.id,
  };
}

export function createSeed() {
  const seed = enrichProjectFixtures({
    demoDataRevision: DEMO_DATA_REVISION,
    knowledgeMethodConfigs: {},
    experts: [
      {
        id: "exp_quality",
        name: "质量分析专家",
        description: "分析产线质量数据、追踪异常并形成改进建议",
        tags: ["质量管理", "数据分析"],
        avatar: "质",
        status: "active",
        model: "通用大模型",
        persona: {
          responsibility:
            "负责分析产品质量问题，定位异常原因并提出可执行的改进建议。",
          workflow: "读取数据与背景 → 核实异常 → 分析原因 → 输出结论与建议。",
          rules: "优先使用当前工作目录中的文件；不确定时先向用户澄清。",
        },
        presetEnabled: true,
        presetQuestions: ["帮我分析本周良率变化", "整理这批异常记录的主要原因"],
        memoryEnabled: true,
        learningEnabled: true,
        knowledge: defaultKnowledgeConfig("exp_quality"),
        skills: [
          {
            id: "skill_csv",
            name: "表格分析",
            source: "平台导入",
            enabled: true,
          },
          {
            id: "skill_report",
            name: "报告撰写",
            source: "内置",
            enabled: true,
          },
        ],
        tools: [
          { id: "tool_file", name: "文件工具", enabled: true },
          { id: "tool_search", name: "搜索工具", enabled: true },
        ],
        mcps: mcpDemoPreset("all"),
        channels: [
          {
            id: "wecom",
            name: "企业微信",
            enabled: true,
            connected: true,
            proactive: false,
            files: true,
          },
          {
            id: "dingtalk",
            name: "钉钉",
            enabled: false,
            connected: false,
            proactive: false,
            files: false,
          },
          {
            id: "feishu",
            name: "飞书",
            enabled: false,
            connected: false,
            proactive: false,
            files: false,
          },
        ],
        workspaceRoot: "/专家/质量分析专家",
        files: [
          {
            id: "f_quality_docs",
            name: "分析资料",
            parentId: null,
            kind: "folder",
          },
          {
            id: "f_quality_csv",
            name: "良率样例.csv",
            parentId: "f_quality_docs",
            kind: "file",
            content: "日期,良率\n2026-10-08,97.2%\n2026-10-09,96.8%",
          },
          {
            id: "f_quality_im",
            name: "消息渠道",
            parentId: null,
            kind: "folder",
          },
          ...createImWorkspaceItems(),
          {
            id: "f_quality_event",
            name: "自主任务",
            parentId: null,
            kind: "folder",
          },
        ],
      },
      {
        id: "exp_ops",
        name: "运营策划专家",
        description: "整理运营数据，规划活动与协同执行",
        tags: ["运营", "策划"],
        avatar: "运",
        status: "active",
        model: "通用大模型",
        persona: {
          responsibility: "负责运营分析与活动策划。",
          workflow: "明确目标 → 收集资料 → 制定方案 → 复盘结果。",
          rules: "引用可核实的数据，并明确假设。",
        },
        presetEnabled: true,
        presetQuestions: ["制定下月运营计划"],
        memoryEnabled: false,
        learningEnabled: false,
        knowledge: defaultKnowledgeConfig("exp_ops"),
        skills: [
          {
            id: "skill_report",
            name: "报告撰写",
            source: "内置",
            enabled: true,
          },
        ],
        tools: [{ id: "tool_file", name: "文件工具", enabled: true }],
        mcps: mcpDemoPreset("healthy").slice(0, 2),
        channels: [
          {
            id: "wecom",
            name: "企业微信",
            enabled: false,
            connected: false,
            proactive: false,
            files: false,
          },
          {
            id: "dingtalk",
            name: "钉钉",
            enabled: true,
            connected: true,
            proactive: false,
            files: false,
          },
          {
            id: "feishu",
            name: "飞书",
            enabled: true,
            connected: true,
            proactive: false,
            files: false,
          },
        ],
        workspaceRoot: "/专家/运营策划专家",
        files: [
          { id: "f_ops_im", name: "消息渠道", parentId: null, kind: "folder" },
          {
            id: "f_ops_report",
            name: "运营简报.txt",
            parentId: "f_ops_im",
            kind: "file",
            mime: "text/plain",
            content: "运营简报演示文件。",
            size: 27,
          },
          {
            id: "f_ops_event",
            name: "自主任务",
            parentId: null,
            kind: "folder",
          },
        ],
      },
      ...ADDITIONAL_EXPERT_SPECS.map(createSupplementalExpert),
    ],
    templates: [
      {
        id: "tpl_quality",
        name: "质量分析专家模板",
        description: "面向制造现场的质量数据分析和问题追踪",
        tags: ["制造", "质量"],
        sourceExpertId: "exp_quality",
      },
      {
        id: "tpl_ops",
        name: "运营策划专家模板",
        description: "活动策划、运营复盘和内容整理",
        tags: ["运营"],
        sourceExpertId: "exp_ops",
      },
      ...PROJECT_EXPERT_FIXTURES.map(createSupplementalTemplate),
      ...ADDITIONAL_EXPERT_SPECS.map(createSupplementalTemplate),
    ],
    conversations: [
      {
        id: "conv_quality_question_navigation",
        expertId: "exp_quality",
        title: "多问题定位演示（72问）",
        status: "ready",
        pinned: true,
        archived: false,
        cwd: "/",
        updatedAt: "2026-10-21T11:23:00+08:00",
        messages: createQualityNavigationMessages(),
      },
      {
        id: "conv_quality_1",
        expertId: "exp_quality",
        title: "分析本周良率波动",
        status: "ready",
        archived: false,
        cwd: "/",
        updatedAt: "2026-10-10T09:20:00+08:00",
        messages: [
          {
            id: "msg_1",
            role: "user",
            content: "帮我分析本周良率变化",
            createdAt: "2026-10-10T09:15:00+08:00",
          },
          {
            id: "msg_2",
            role: "assistant",
            content:
              "样例数据显示，10 月 8 日良率为 97.2%，10 月 9 日为 96.8%。建议先核查设备参数、批次与检验口径，再确定异常原因。",
            createdAt: "2026-10-10T09:20:00+08:00",
            status: "done",
          },
        ],
      },
      {
        id: "conv_quality_2",
        expertId: "exp_quality",
        title: "整理异常记录",
        status: "ready",
        archived: true,
        cwd: "/分析资料",
        updatedAt: "2026-10-08T16:00:00+08:00",
        messages: [
          {
            id: "msg_3",
            role: "user",
            content: "请整理异常记录",
            createdAt: "2026-10-08T15:58:00+08:00",
          },
          {
            id: "msg_4",
            role: "assistant",
            content: "已按设备、批次和处理结果整理为三类。",
            createdAt: "2026-10-08T16:00:00+08:00",
            status: "done",
          },
        ],
      },
    ],
    imChats: createImDemoChats(),
    eventRuns: [
      {
        id: "evt_daily",
        expertId: "exp_quality",
        name: "每日质量巡检",
        trigger: "Timer",
        enabled: true,
        runs: [
          {
            id: "run_1",
            status: "success",
            at: "2026-10-10T08:00:00+08:00",
            summary: "已生成质量日报（演示）",
          },
        ],
      },
      {
        id: "evt_alert",
        expertId: "exp_ops",
        name: "运营异常提醒",
        trigger: "WebHook",
        enabled: false,
        runs: [],
      },
    ],
    projects: [
      {
        id: "proj_factory",
        name: "工厂质量提升",
        description: "跨专家协作跟进试点产线质量问题",
        icon: "品",
        members: ["exp_quality", "exp_ops"],
        goals: [
          {
            id: "goal_1",
            title: "将试点产线良率稳定在 98% 以上",
            status: "planned",
            summary: "收集数据、定位异常并跟进改进措施",
            archived: false,
          },
        ],
        tasks: [
          {
            id: "card_1",
            title: "收集本周良率数据",
            description: "整理产线日报与质量记录",
            status: "ready",
            assigneeId: "exp_quality",
            archived: false,
          },
          {
            id: "card_2",
            title: "形成问题分析报告",
            description: "对异常批次进行归因",
            status: "doing",
            assigneeId: "exp_quality",
            archived: false,
          },
          {
            id: "card_3",
            title: "组织复盘会议",
            description: "汇总改进项并安排责任人",
            status: "done",
            assigneeId: "exp_ops",
            archived: false,
          },
        ],
        files: [],
      },
    ],
  });
  for (const expert of seed.experts) {
    for (const channel of expert.channels || []) {
      const samples = demoChannelTargets(expert.id, channel.id);
      if (!Array.isArray(channel.people)) channel.people = samples.people;
      if (!Array.isArray(channel.groups)) channel.groups = samples.groups;
      if (!Array.isArray(channel.deliveries))
        channel.deliveries = demoChannelDeliveries(expert.id, channel.id);
    }
  }
  return seed;
}

export function upgradeExpertFixtures(saved) {
  const previousRevision = Number(saved.demoDataRevision || 1);
  if (previousRevision >= DEMO_DATA_REVISION) return saved;
  const seed = createSeed();
  const expertIds = new Set(ADDITIONAL_EXPERT_SPECS.map((item) => item.id));
  const templateIds = new Set(
    [...PROJECT_EXPERT_FIXTURES, ...ADDITIONAL_EXPERT_SPECS].map(
      (item) => `tpl_${item.id.slice(4)}`,
    ),
  );
  const existingExperts = new Set(saved.experts.map((item) => item.id));
  const existingTemplates = new Set(saved.templates.map((item) => item.id));
  saved.experts.push(
    ...seed.experts.filter(
      (item) => expertIds.has(item.id) && !existingExperts.has(item.id),
    ),
  );
  saved.templates.push(
    ...seed.templates.filter(
      (item) => templateIds.has(item.id) && !existingTemplates.has(item.id),
    ),
  );
  if (previousRevision < 3) {
    const existingChats = Array.isArray(saved.imChats) ? saved.imChats : [];
    // Replace only the original bundled sample; keep user-created demo records.
    saved.imChats = [
      ...existingChats.filter((chat) => chat.id !== "im_wecom_1"),
      ...createImDemoChats().filter(
        (chat) => !existingChats.some((existing) => existing.id === chat.id),
      ),
    ];
  }
  if (previousRevision < 4) upgradeChannelShowcase(saved);
  if (previousRevision < 5) {
    for (const id of ["exp_quality", "exp_ops"]) {
      const expert = saved.experts.find((item) => item.id === id);
      const fixture = seed.experts.find((item) => item.id === id);
      if (!expert || !fixture) continue;
      expert.mcps = Array.isArray(expert.mcps) ? expert.mcps : [];
      for (const service of fixture.mcps)
        if (
          !expert.mcps.some(
            (item) => item.id === service.id || item.name === service.name,
          )
        )
          expert.mcps.push(clone(service));
    }
  }
  if (previousRevision < 8) {
    const quality = saved.experts.find((item) => item.id === "exp_quality");
    const fixtureIds = new Set([
      "im_wecom_1",
      "im_exp_quality_group",
      "im_exp_quality_dm",
    ]);
    saved.imChats = (Array.isArray(saved.imChats) ? saved.imChats : []).filter(
      (chat) => !fixtureIds.has(chat.id),
    );
    if (quality) {
      const chats = createImDemoChats();
      saved.imChats.push(...chats);
      quality.files = Array.isArray(quality.files) ? quality.files : [];
      const known = new Set(quality.files.map((item) => item.id));
      for (const item of createImWorkspaceItems(chats))
        if (!known.has(item.id)) quality.files.push(item);
    }
  }
  if (previousRevision < 9) {
    const dm = (saved.imChats || []).find(
      (chat) => chat.id === "im_exp_quality_dm",
    );
    if (dm) {
      const oldScope = dm.scopes?.[0];
      const oldPrefix = `${dm.cwd}/scope-direct01`;
      const directPath = (path) =>
        typeof path === "string" && path.startsWith(`${oldPrefix}/`)
          ? `${dm.cwd}${path.slice(oldPrefix.length)}`
          : path;
      if (!Array.isArray(dm.segments))
        dm.segments = (oldScope?.segments || []).map((segment) => ({
          ...segment,
          cwd: directPath(segment.cwd),
          messages: (segment.messages || []).map((message) => ({
            ...message,
            fileDirectory: directPath(message.fileDirectory),
          })),
        }));
      dm.sessionKey = null;
      dm.scopes = [];
      const quality = saved.experts.find((item) => item.id === "exp_quality");
      if (quality) {
        quality.files = Array.isArray(quality.files) ? quality.files : [];
        const known = new Map(quality.files.map((item) => [item.id, item]));
        const directItems = createImWorkspaceItems([dm]);
        for (const item of directItems) {
          const existing = known.get(item.id);
          if (existing && item.kind === "file")
            existing.parentId = item.parentId;
          else if (!existing) {
            quality.files.push(item);
            known.set(item.id, item);
          }
        }
        const chatFolder = directItems.find(
          (item) => item.name === dm.cwd.split("/").at(-1),
        );
        const obsoleteScope = quality.files.find(
          (item) =>
            item.name === "scope-direct01" && item.parentId === chatFolder?.id,
        );
        if (obsoleteScope) {
          const destinations = new Map([[obsoleteScope.id, chatFolder.id]]);
          const obsoleteIds = new Set([obsoleteScope.id]);
          const pending = [obsoleteScope.id];
          while (pending.length) {
            const oldParentId = pending.shift();
            const newParentId = destinations.get(oldParentId);
            const children = quality.files.filter(
              (item) => item.parentId === oldParentId,
            );
            for (const child of children) {
              if (child.kind === "folder") {
                const matching = quality.files.find(
                  (item) =>
                    item.id !== child.id &&
                    item.kind === "folder" &&
                    item.parentId === newParentId &&
                    item.name === child.name,
                );
                if (matching) {
                  destinations.set(child.id, matching.id);
                  obsoleteIds.add(child.id);
                } else {
                  child.parentId = newParentId;
                  destinations.set(child.id, child.id);
                }
                pending.push(child.id);
              } else child.parentId = newParentId;
            }
          }
          quality.files = quality.files.filter(
            (item) => !obsoleteIds.has(item.id),
          );
        }
      }
    }
  }
  if (previousRevision < 10) {
    const group = (saved.imChats || []).find(
      (chat) => chat.id === "im_exp_quality_group",
    );
    if (group) {
      delete group.currentPolicy;
      const sharedScopes = (group.scopes || []).filter(
        (scope) => scope.mode === "shared",
      );
      if (sharedScopes.length)
        group.deferredSharedScopes = [
          ...(group.deferredSharedScopes || []),
          ...sharedScopes,
        ];
      group.scopes = (group.scopes || [])
        .filter((scope) => scope.mode !== "shared")
        .map((scope) => ({
          ...scope,
          mode: "member",
          current: true,
          segments: (scope.segments || []).map((segment, index, segments) => ({
            ...segment,
            current: index === segments.length - 1,
          })),
        }));
    }
  }
  if (previousRevision < 14) {
    for (const expert of saved.experts) {
      expert.knowledge = migrateKnowledgeConfig(expert.knowledge, expert.id);
    }
  }
  if (previousRevision < 15 && !saved.knowledgeMethodConfigs)
    saved.knowledgeMethodConfigs = {};
  if (previousRevision < 16) {
    const demo = seed.conversations.find(
      (item) => item.id === "conv_quality_question_navigation",
    );
    if (demo && !saved.conversations.some((item) => item.id === demo.id))
      saved.conversations.push(clone(demo));
  }
  if (previousRevision < 17) {
    for (const expert of saved.experts) {
      for (const channel of expert.channels || []) {
        const samples = demoChannelTargets(expert.id, channel.id);
        if (!Array.isArray(channel.people)) channel.people = samples.people;
        if (!Array.isArray(channel.groups)) channel.groups = samples.groups;
        if (!channel.enabled) channel.proactive = false;
      }
    }
  }
  if (previousRevision < 18) {
    for (const expert of saved.experts) {
      for (const channel of expert.channels || []) {
        if (!Array.isArray(channel.deliveries))
          channel.deliveries = demoChannelDeliveries(expert.id, channel.id);
        for (const kind of ["people", "groups"]) {
          for (const item of channel[kind] || []) {
            if (item.approved === undefined) item.approved = true;
            if (item.purpose === undefined) item.purpose = "";
            if (!item.source) item.source = "管理员添加";
          }
        }
      }
    }
  }
  if (previousRevision < 19) {
    const ops = saved.experts.find((item) => item.id === "exp_ops");
    const sample = seed.experts
      .find((item) => item.id === "exp_ops")
      ?.files.find((item) => item.id === "f_ops_report");
    if (ops && sample) {
      ops.files = Array.isArray(ops.files) ? ops.files : [];
      if (!ops.files.some((item) => item.id === sample.id))
        ops.files.push(clone(sample));
    }
  }
  if (previousRevision < 20) {
    const quality = saved.experts.find((item) => item.id === "exp_quality");
    const wecom = quality?.channels?.find((item) => item.id === "wecom");
    if (wecom) {
      const examples = demoChannelTargets("exp_quality", "wecom");
      for (const key of ["people", "groups"]) {
        wecom[key] = Array.isArray(wecom[key]) ? wecom[key] : [];
        const known = new Set(wecom[key].map((item) => item.id));
        for (const item of examples[key]) {
          if (
            [
              "wc-shift-lead",
              "wc-maintenance",
              "wc-inspector",
              "wc-group-partial",
            ].includes(item.id) &&
            !known.has(item.id)
          )
            wecom[key].push(clone(item));
        }
      }
    }
  }
  saved.demoDataRevision = DEMO_DATA_REVISION;
  return saved;
}

function readSeed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.experts) &&
        Array.isArray(parsed.templates) &&
        Array.isArray(parsed.projects) &&
        Array.isArray(parsed.conversations)
      ) {
        const needsFixtureUpgrade =
          !parsed.projectFixtureVersion ||
          Number(parsed.demoDataRevision || 1) < DEMO_DATA_REVISION;
        const enriched = upgradeExpertFixtures(enrichProjectFixtures(parsed));
        let turnsChanged = false;
        enriched.conversations.forEach((conversation) => {
          if (normalizeConversationTurns(conversation)) turnsChanged = true;
          if (normalizeSessionPresentation(conversation)) turnsChanged = true;
        });
        if (needsFixtureUpgrade || turnsChanged)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
        return enriched;
      }
    }
  } catch {
    /* corrupted demo state resets to fixture */
  }
  const seed = createSeed();
  seed.conversations.forEach((conversation) => {
    normalizeConversationTurns(conversation);
    normalizeSessionPresentation(conversation);
  });
  return seed;
}

export const state = Vue.observable(readSeed());

export function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function expertById(id) {
  return state.experts.find((item) => item.id === String(id));
}
export function projectById(id) {
  return state.projects.find((item) => item.id === String(id));
}
export function conversationById(id) {
  return state.conversations.find((item) => item.id === String(id));
}
export function conversationsFor(expertId, archived = false) {
  return state.conversations
    .filter((item) => item.expertId === expertId && item.archived === archived)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
export function imChatsFor(expertId) {
  return state.imChats.filter((item) => item.expertId === expertId);
}
export function eventsFor(expertId) {
  return state.eventRuns.filter((item) => item.expertId === expertId);
}

export function addExpert(form, templateId, copyExpertId = "") {
  const template = state.templates.find((item) => item.id === templateId);
  const source = copyExpertId
    ? expertById(copyExpertId)
    : template
      ? template.snapshot || expertById(template.sourceExpertId)
      : null;
  const id = uid("exp");
  const item = source
    ? clone(source)
    : {
        persona: { responsibility: "", workflow: "", rules: "" },
        personaSaved: false,
        presetQuestions: [],
        presetEnabled: false,
        memoryEnabled: true,
        learningEnabled: true,
        knowledge: defaultKnowledgeConfig(),
        skills: [],
        tools: [],
        mcps: [],
        channels: [
          {
            id: "wecom",
            name: "企业微信",
            enabled: false,
            connected: false,
            proactive: false,
            files: false,
          },
          {
            id: "dingtalk",
            name: "钉钉",
            enabled: false,
            connected: false,
            proactive: false,
            files: false,
          },
          {
            id: "feishu",
            name: "飞书",
            enabled: false,
            connected: false,
            proactive: false,
            files: false,
          },
        ],
        files: [],
      };
  Object.assign(item, {
    id,
    name: form.name.trim(),
    description: form.description || "",
    tags: form.tags || source?.tags?.slice() || [],
    avatar: String(form.name || "专").slice(0, 1),
    avatarUrl:
      form.avatarUrl || source?.avatarUrl || "/experts/avatars/general-man.svg",
    status: "active",
    model: form.model || "通用大模型",
    workspaceRoot: `/专家/${form.name.trim()}`,
  });
  item.knowledge = migrateKnowledgeConfig(item.knowledge, id);
  item.files = [
    { id: uid("folder"), name: "消息渠道", parentId: null, kind: "folder" },
    { id: uid("folder"), name: "自主任务", parentId: null, kind: "folder" },
  ];
  state.experts.unshift(item);
  persist();
  return item;
}
export function updateExpert(id, patch) {
  const item = expertById(id);
  if (!item) return;
  Object.keys(patch).forEach((key) => Vue.set(item, key, patch[key]));
  persist();
  return item;
}
export function deleteExpert(id) {
  const index = state.experts.findIndex((item) => item.id === id);
  if (index < 0) return;
  const expert = state.experts[index];
  state.templates
    .filter((item) => item.sourceExpertId === id)
    .forEach((item) => Vue.set(item, "snapshot", clone(expert)));
  state.experts.splice(index, 1);
  discardConversationUploads(
    state.conversations.filter((item) => item.expertId === id),
  );
  state.conversations = state.conversations.filter(
    (item) => item.expertId !== id,
  );
  state.imChats = state.imChats.filter((item) => item.expertId !== id);
  state.eventRuns = state.eventRuns.filter((item) => item.expertId !== id);
  persist();
}
export function publishTemplate(expertId) {
  const expert = expertById(expertId);
  if (!expert) return;
  const existing = state.templates.find(
    (item) => item.sourceExpertId === expertId,
  );
  if (existing) {
    existing.name = `${expert.name}模板`;
    existing.description = expert.description;
    existing.tags = expert.tags.slice();
    Vue.set(existing, "snapshot", clone(expert));
  } else
    state.templates.unshift({
      id: uid("tpl"),
      name: `${expert.name}模板`,
      description: expert.description,
      tags: expert.tags.slice(),
      sourceExpertId: expertId,
      snapshot: clone(expert),
    });
  persist();
}

export function conversationTitleFromFirstMessage(text) {
  const characters = Array.from(
    String(text || "")
      .trim()
      .replace(/\s+/g, " "),
  );
  if (!characters.length) return "新任务";
  return characters.length > 20
    ? `${characters.slice(0, 20).join("")}…`
    : characters.join("");
}

export function createConversation(expertId, title = "新对话任务") {
  const item = {
    id: uid("conv"),
    expertId,
    title,
    status: "ready",
    archived: false,
    cwd: "/",
    updatedAt: now(),
    messages: [],
    turns: [],
    sessionPresentation: emptySessionPresentation(),
  };
  state.conversations.unshift(item);
  persist();
  return item;
}
export function updateConversation(id, patch) {
  const item = conversationById(id);
  if (!item) return;
  Object.keys(patch).forEach((key) => Vue.set(item, key, patch[key]));
  item.updatedAt = now();
  persist();
  return item;
}
export function deleteConversation(id) {
  const index = state.conversations.findIndex((item) => item.id === id);
  if (index >= 0) {
    discardConversationUploads([state.conversations[index]]);
    state.conversations.splice(index, 1);
  }
  persist();
}

function discardConversationUploads(conversations) {
  for (const conversation of conversations) {
    for (const message of conversation.messages || []) {
      for (const attachment of message.attachments || []) {
        if (attachment.kind === "local_upload")
          void deleteFile(attachment.id).catch(() => {});
      }
    }
  }
}

export function addProject(form) {
  const item = {
    id: uid("proj"),
    name: form.name.trim(),
    description: form.description || "",
    icon: form.icon || "📁",
    members: (form.memberIds || []).slice(),
    updatedAt: now(),
    goals: [],
    tasks: [],
    files: [],
  };
  state.projects.unshift(item);
  persist();
  return item;
}
export function updateProject(id, patch) {
  const item = projectById(id);
  if (!item) return;
  Object.keys(patch).forEach((key) => Vue.set(item, key, patch[key]));
  item.updatedAt = now();
  persist();
  return item;
}
export function deleteProject(id) {
  const index = state.projects.findIndex((item) => item.id === id);
  if (index >= 0) state.projects.splice(index, 1);
  persist();
}
export function addProjectTask(projectId, form) {
  const project = projectById(projectId);
  if (!project) return;
  const item = {
    id: uid("card"),
    title: form.title.trim(),
    description: form.description || "",
    status: form.status || "todo",
    assigneeId: form.assigneeId || "",
    priority: form.priority || "medium",
    predecessorId: form.predecessorId || "",
    createdAt: now(),
    archived: false,
  };
  project.tasks.push(item);
  persist();
  return item;
}
export function updateProjectTask(projectId, taskId, patch) {
  const project = projectById(projectId);
  const item = project?.tasks.find((task) => task.id === taskId);
  if (!item) return;
  Object.keys(patch).forEach((key) => Vue.set(item, key, patch[key]));
  persist();
  return item;
}
export function deleteProjectTask(projectId, taskId) {
  const project = projectById(projectId);
  if (!project) return;
  const index = project.tasks.findIndex((task) => task.id === taskId);
  if (index >= 0) project.tasks.splice(index, 1);
  persist();
}
export function addGoal(projectId, input) {
  const project = projectById(projectId);
  if (!project) return;
  const form = typeof input === "string" ? { title: input } : input;
  const goal = {
    id: uid("goal"),
    title: form.title.trim(),
    description: form.description || "",
    model: form.model || "系统默认",
    createdAt: now(),
    status: "planned",
    summary: "",
    archived: false,
  };
  project.goals.push(goal);
  persist();
  return goal;
}
export function updateGoal(projectId, goalId, patch) {
  const goal = projectById(projectId)?.goals.find((item) => item.id === goalId);
  if (!goal) return;
  Object.keys(patch).forEach((key) => Vue.set(goal, key, patch[key]));
  persist();
  return goal;
}
export function launchGoal(projectId, goalId) {
  const project = projectById(projectId);
  const goal = project?.goals.find((item) => item.id === goalId);
  if (!goal) return;
  goal.status = "decomposing";
  persist();
  setTimeout(() => {
    if (!state.projects.includes(project) || !project.goals.includes(goal))
      return;
    goal.status = "ready";
    if (!goal.generatedTaskIds?.length) {
      const first = addProjectTask(projectId, {
        title: `${goal.title}：收集资料`,
        description: "根据目标整理必要的背景数据",
        assigneeId: project.members[0] || "",
        status: "todo",
      });
      const second = addProjectTask(projectId, {
        title: `${goal.title}：形成方案`,
        description: "汇总分析并提出执行方案",
        assigneeId: project.members[1] || project.members[0] || "",
        status: "ready",
      });
      Vue.set(goal, "generatedTaskIds", [first.id, second.id]);
      goal.summary = "演示拆解已完成，生成两项看板任务。";
    } else goal.summary = "演示拆解已完成，沿用已有看板任务。";
    persist();
  }, 1000);
}

export function addWorkspaceItem(expertId, entry) {
  const expert = expertById(expertId);
  if (!expert) return;
  const item = {
    id: uid("file"),
    name: entry.name,
    parentId: entry.parentId || null,
    kind: entry.kind,
    ...(entry.content != null ? { content: entry.content } : {}),
  };
  expert.files.push(item);
  persist();
  return item;
}
export function removeWorkspaceItems(expertId, ids) {
  const expert = expertById(expertId);
  if (!expert) return [];
  const removed = new Set(ids);
  let prior;
  do {
    prior = removed.size;
    expert.files.forEach((item) => {
      if (removed.has(item.parentId)) removed.add(item.id);
    });
  } while (prior !== removed.size);
  expert.files = expert.files.filter((item) => !removed.has(item.id));
  persist();
  return [...removed];
}

export async function resetDemo() {
  for (const timer of activeTimers.values()) clearInterval(timer);
  activeTimers.clear();
  for (const timer of backgroundTimers.values()) clearTimeout(timer);
  backgroundTimers.clear();
  const fresh = createSeed();
  fresh.conversations.forEach((conversation) => {
    normalizeConversationTurns(conversation);
    normalizeSessionPresentation(conversation);
  });
  for (const key of Object.keys(state)) Vue.set(state, key, fresh[key]);
  localStorage.removeItem(STORAGE_KEY);
  await clearFiles();
}

const activeTimers = new Map();
const backgroundTimers = new Map();
const requestTimeoutTimers = new Map();
export function stopDemoStream(id) {
  const timer = activeTimers.get(id);
  if (timer) clearInterval(timer);
  activeTimers.delete(id);
  const backgroundTimer = backgroundTimers.get(id);
  if (backgroundTimer) clearTimeout(backgroundTimer);
  backgroundTimers.delete(id);
  const conversation = conversationById(id);
  if (["running", "recovering"].includes(conversation?.status)) {
    const turn = conversation.turns?.find((item) =>
      ["running", "recovering"].includes(item.status),
    );
    if (turn)
      applyConversationEvent(conversation, {
        type: "message.complete",
        sessionId: id,
        turnId: turn.id,
        seq: turn.lastSeq + 1,
        status: "interrupted",
        at: now(),
      });
    conversation.status = "ready";
    persist();
  }
}
export function sendDemoMessage(
  conversationId,
  text,
  attachments = [],
  references = [],
) {
  const conversation = conversationById(conversationId);
  if (!conversation) return;
  const originalText = String(text || "").trim();
  if (!originalText) return;
  const expertFiles = expertById(conversation.expertId)?.files || [];
  const fileRefs = Array.isArray(attachments)
    ? attachments
        .map((attachment) => {
          if (
            attachment?.kind === "local_upload" &&
            /^upload_[\w-]+$/.test(String(attachment.id || "")) &&
            String(attachment.name || "").trim()
          )
            return {
              kind: "local_upload",
              id: attachment.id,
              name: String(attachment.name).trim(),
              size: Number(attachment.size) || 0,
            };
          const file = expertFiles.find(
            (item) => item.id === attachment?.id && item.kind === "file",
          );
          return file ? { id: file.id, name: file.name } : null;
        })
        .filter(Boolean)
    : [];
  const seenReferences = new Set();
  const canUseKnowledge =
    expertById(conversation.expertId)?.knowledge?.scope !== "none";
  const sourceRefs = (Array.isArray(references) ? references : [])
    .map((reference) => {
      if (!reference || typeof reference !== "object") return null;
      if (reference.kind === "knowledge_library") {
        if (!canUseKnowledge) return null;
        const library = KNOWLEDGE_CATALOG.find(
          (item) => item.id === reference.id && item.status === "ready",
        );
        return library
          ? { kind: reference.kind, id: library.id, name: library.name }
          : null;
      }
      if (reference.kind === "knowledge_document") {
        if (!canUseKnowledge) return null;
        const document = KNOWLEDGE_DOCUMENTS.find(
          (item) => item.id === reference.id,
        );
        const library = KNOWLEDGE_CATALOG.find(
          (item) => item.id === document?.libraryId && item.status === "ready",
        );
        return document && library
          ? {
              kind: reference.kind,
              id: document.id,
              name: document.name,
              libraryName: library.name,
            }
          : null;
      }
      if (reference.kind === "workspace_file") {
        if (fileRefs.some((file) => file.id === reference.id)) return null;
        const file = expertFiles.find(
          (item) => item.id === reference.id && item.kind === "file",
        );
        return file
          ? {
              kind: reference.kind,
              id: file.id,
              name: file.name,
              path: String(reference.path || file.name),
            }
          : null;
      }
      return null;
    })
    .filter((reference) => {
      if (!reference) return false;
      const key = `${reference.kind}:${reference.id}`;
      if (seenReferences.has(key)) return false;
      seenReferences.add(key);
      return true;
    });
  text = originalText;
  stopDemoStream(conversationId);
  const userMessage = {
    id: uid("msg"),
    role: "user",
    content: originalText,
    attachments: fileRefs,
    references: sourceRefs,
    createdAt: now(),
  };
  conversation.messages.push(userMessage);
  const toolScene = findToolActivityScene(text);
  const largeActivityGroupDemo =
    !toolScene && text.includes("演示活动组：大量活动");
  const crowdedToolsDemo =
    largeActivityGroupDemo || (!toolScene && text.includes("演示大量工具活动"));
  const crowdedToolCount = largeActivityGroupDemo ? 32 : 18;
  const crowdedToolIntervalMs = largeActivityGroupDemo ? 90 : 180;
  const crowdedTools = crowdedToolsDemo
    ? Array.from({ length: crowdedToolCount }, (_, index) => ({
        toolId: uid("tool"),
        name:
          index % 3 === 0
            ? "read_file"
            : index % 3 === 1
              ? "search_files"
              : "web_search",
        args:
          index % 3 === 0
            ? { path: `分析资料/批次-${index + 1}.csv` }
            : index % 3 === 1
              ? { pattern: `异常批次-${index + 1}`, path: "分析资料" }
              : { query: `质量标准 ${index + 1}` },
      }))
    : [];
  const modelWaitDemo = text.includes("演示模型等待");
  const compressionDemo = text.includes("演示上下文压缩");
  const reconnectDemo = text.includes("演示服务重连");
  const clarifyTimeoutDemo = text.includes("演示澄清超时");
  const approvalTimeoutDemo = text.includes("演示审批超时");
  const parallelApprovalDemo = text.includes("演示并行审批");
  const stageDemo = modelWaitDemo || compressionDemo || reconnectDemo;
  const recoveryDemo = text.includes("演示恢复中");
  const unknownDemo = text.includes("演示运行异常");
  const subagentFailureDemo = text.includes("演示子代理失败");
  const isErrorDemo =
    !toolScene &&
    (text.includes("错误") || text.includes("失败")) &&
    !subagentFailureDemo;
  const showProgress = text.includes("进度");
  const showToolDetail = text.includes("工具详情");
  const showDiff = text.includes("文件差异");
  const withTools =
    Boolean(toolScene) ||
    crowdedToolsDemo ||
    isErrorDemo ||
    recoveryDemo ||
    unknownDemo ||
    /资料|工作目录|文件|工具|并行过程|过程|进度/.test(text);
  const withInterim = !toolScene && /中途|过程/.test(text);
  const isParallel = !toolScene && /并行工具|并行过程/.test(text);
  const activityKind = toolScene
    ? null
    : text.includes("子代理")
      ? "subagent"
      : text.includes("并行模型")
        ? "moa"
        : text.includes("思考")
          ? "reasoning"
          : null;
  const backgroundDelegation =
    activityKind === "subagent" && text.includes("后台");
  const parallelSubagents =
    activityKind === "subagent" && text.includes("并行子代理");
  const requestKind = toolScene
    ? null
    : text.includes("凭据演示")
      ? "secret"
      : text.includes("管理员密码演示")
        ? "sudo"
        : text.includes("MCP 设置确认")
          ? "mcp_setup"
          : text.includes("审批")
            ? "approval"
            : text.includes("澄清")
              ? "clarify"
              : null;
  const approvalScopes = text.includes("仅允许本次")
    ? ["once"]
    : text.includes("仅允许本会话与始终")
      ? ["session", "always"]
      : text.includes("仅允许本会话")
        ? ["session"]
        : text.includes("仅始终允许")
          ? ["always"]
          : ["once", "session", "always"];
  const scriptedScene = Boolean(
    toolScene ||
    withTools ||
    withInterim ||
    activityKind ||
    requestKind ||
    stageDemo ||
    /等待|待办|目标|循环|心跳|排队任务|账户通知|Markdown 展示/.test(text),
  );
  if (text.includes("清除账户通知"))
    applySessionPresentationEvent(conversation, {
      type: "notification.clear",
      sessionId: conversationId,
      key: "credits.low",
    });
  else if (text.includes("账户通知"))
    applySessionPresentationEvent(conversation, {
      type: "notification.show",
      sessionId: conversationId,
      key: "credits.low",
      text: "演示额度提醒（非真实账户信息）",
      level: "warning",
    });
  if (!toolScene && text.includes("待办")) {
    const existing = conversation.sessionPresentation.todos;
    const todos = existing.length
      ? existing.map((item, index) => ({
          ...item,
          status:
            text.includes("完成待办") && index === 0
              ? "completed"
              : item.status,
        }))
      : text.includes("层级待办")
        ? [
            {
              id: "todo_root",
              content: "核对演示资料",
              status: "in_progress",
              parent: null,
            },
            {
              id: "todo_sample",
              content: "抽样核查",
              status: "completed",
              parent: "todo_root",
            },
            {
              id: "todo_compare",
              content: "比较异常批次",
              status: "pending",
              parent: "todo_sample",
            },
            {
              id: "todo_skip",
              content: "跳过无关批次",
              status: "cancelled",
              parent: null,
            },
          ]
        : [
            {
              id: "todo_check",
              content: "核对演示资料",
              status: text.includes("完成待办") ? "completed" : "pending",
              parent: null,
            },
            {
              id: "todo_summary",
              content: "整理分析结论",
              status: "pending",
              parent: null,
            },
          ];
    applySessionPresentationEvent(conversation, {
      type: "todo.updated",
      sessionId: conversationId,
      revision: conversation.sessionPresentation.todoRevision + 1,
      todos,
    });
  }
  if (!toolScene && text.includes("排队任务")) {
    applySessionPresentationEvent(conversation, {
      type: "queue.updated",
      sessionId: conversationId,
      revision: conversation.sessionPresentation.queueRevision + 1,
      tasks: text.includes("清空排队任务")
        ? []
        : [
            {
              id: "queue_quality",
              title: "核对异常批次",
              content: "对照本周质量数据，核对异常批次和检验口径。",
            },
            {
              id: "queue_report",
              title: "整理质量日报",
              content: "汇总核对结果，整理一份质量日报。",
            },
            {
              id: "queue_next",
              title: "形成改进建议",
              content: "根据已核对的资料，归纳下一步改进建议。",
            },
          ],
    });
  }
  if (!toolScene && /目标|循环|心跳/.test(text)) {
    const control = { ...conversation.sessionPresentation.control };
    if (text.includes("目标"))
      control.goal = {
        title: "形成可核对的质量分析建议",
        status: "active",
        turns_used: 1,
        max_turns: 5,
        contract: "核对质量资料与异常批次，形成可复查的分析建议。",
        subgoals: ["核对资料", "形成建议"],
        ...(text.includes("目标等待")
          ? {
              contract: "等待演示资料就绪后继续分析",
              wait_barrier: {
                type: "until",
                until_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              },
            }
          : {}),
      };
    if (text.includes("循环"))
      control.loop = {
        status: "active",
        mode: "interval",
        interval_seconds: 300,
        ticks_fired: 2,
      };
    if (text.includes("心跳"))
      control.heartbeat = {
        status: "active",
        interval_seconds: 600,
        fire_count: 1,
      };
    applySessionPresentationEvent(conversation, {
      type: "session.control.update",
      sessionId: conversationId,
      revision: uid("control"),
      control,
    });
  }
  const answer = unknownDemo
    ? "已开始核对演示资料。连接中断后，暂时无法确认本轮处理结果。"
    : requestKind === "clarify"
      ? text.includes("多题")
        ? "为了继续处理，请补充时间范围和目标产线。"
        : text.includes("单选澄清")
          ? "请选择希望分析的时间范围。"
          : text.includes("多选澄清")
            ? "请选择需要核对的产线。"
            : "为了继续处理，请先说明希望分析的时间范围和目标产线。"
      : requestKind === "approval"
        ? "请确认是否允许执行当前操作。"
        : requestKind === "mcp_setup"
          ? "演示 MCP 服务配置请求：请确认是否允许尝试设置示例服务。"
          : requestKind === "secret" || requestKind === "sudo"
            ? "这是凭据操作的安全展示演示，请勿输入真实密码或密钥。"
            : subagentFailureDemo
              ? "子代理未完成本项资料核对，现有信息不足以确认该部分结论；建议补齐资料后重试。"
              : parallelSubagents
                ? "已演示两个子代理分别核对夜班数据与设备日志；请依据真实资料复核两项结果。"
                : activityKind === "reasoning"
                  ? "已整理输入范围与数据口径的演示思路，建议核对关键数据后再推进。"
                  : toolScene
                    ? toolScene.followup
                      ? "已在同一回合演示写入新文件和修改已有文件；可展开活动组查看两次调用，并在下方查看对应产出。"
                      : "这是一次本地工具活动演示，未执行真实工具。可展开活动组查看这次调用的参数、进度与结果。"
                    : isErrorDemo
                      ? "已保留当前可用的部分分析。失败的演示工具未产出最终结论，请核查资料后重试。"
                      : text.includes("Markdown 展示")
                        ? "## 质量分析摘要\n\n| 日期 | 良率 |\n| --- | --- |\n| 10 月 8 日 | 97.2% |\n| 10 月 9 日 | 96.8% |\n\n" +
                          `![质量分析专家](${import.meta.env.BASE_URL}avatars/quality-man.svg)\n\n` +
                          "建议先核对 **检验口径**，再查看示例命令：\n\n```text\ncompare-quality --from 2026-10-08 --to 2026-10-09\n```\n\n演示说明见 [公开示例](https://example.com/quality/report)。"
                        : showDiff
                          ? "这是固定的文件差异演示，未修改真实文件。可在上方活动详情中查看差异内容。"
                          : `我已收到你的任务：“${text.trim()}”。\n\n${withTools ? "已演示读取工作目录与整理资料。" : "这是一条无需工具的演示回复。"}\n\n建议核对关键数据，再根据结果推进下一步。`;
  const assistant = {
    id: uid("msg"),
    turnId: uid("turn"),
    role: "assistant",
    content: "",
    createdAt: now(),
    status: "streaming",
    kind: requestKind || (isErrorDemo ? "error" : "normal"),
    error: "",
  };
  userMessage.turnId = assistant.turnId;
  conversation.messages.push(assistant);
  const turn = createConversationTurn(userMessage, assistant);
  conversation.turns.push(turn);
  let seq = 0;
  const emit = (type, payload = {}) => {
    seq = Math.max(seq, turn.lastSeq) + 1;
    return applyConversationEvent(conversation, {
      type,
      ...payload,
      sessionId: conversationId,
      turnId: turn.id,
      seq,
    });
  };
  const folderToolId = uid("tool");
  const analysisToolId = uid("tool");
  const followupToolId = toolScene?.followup ? uid("tool") : null;
  const completeToolScene = (scene, toolId) => {
    if (!scene || scene.skipComplete) return;
    const target = scene.modifies
      ? expertById(conversation.expertId)?.files.find(
          (file) => file.id === scene.modifies.fileId && file.kind === "file",
        )
      : null;
    const nextContent =
      target && target.content === scene.modifies.content
        ? scene.modifies.alternateContent || scene.modifies.content
        : scene.modifies?.content;
    const changed = target && target.content !== nextContent;
    const beforeLines = changed ? String(target.content || "").split("\n") : [];
    const afterLines = changed ? String(nextContent).split("\n") : [];
    const diffLines = [];
    for (
      let index = 0;
      index < Math.max(beforeLines.length, afterLines.length);
      index++
    ) {
      if (beforeLines[index] === afterLines[index]) continue;
      if (beforeLines[index] !== undefined)
        diffLines.push(`-${beforeLines[index]}`);
      if (afterLines[index] !== undefined)
        diffLines.push(`+${afterLines[index]}`);
    }
    const inlineDiff = scene.modifies ? diffLines.join("\n") : scene.inlineDiff;
    emit("tool.complete", {
      toolId,
      name: scene.name,
      args: clone(scene.args),
      ...(scene.modifies && !target
        ? { status: "failed" }
        : scene.status
          ? { status: scene.status }
          : {}),
      result:
        scene.modifies && !target
          ? { message: "演示目标文件已不可用" }
          : scene.result || { verified: true },
      ...(inlineDiff ? { inlineDiff } : {}),
    });
    if (scene.risk)
      emit("tool.output_risk", {
        toolId,
        name: scene.name,
        ...clone(scene.risk),
      });
    const artifacts = [
      ...(scene.artifact ? [scene.artifact] : []),
      ...(scene.artifacts || []),
    ];
    for (const artifact of artifacts) {
      const generated = addWorkspaceItem(conversation.expertId, {
        name: artifact.name,
        kind: "file",
        content: artifact.content,
      });
      if (generated)
        emit("result.add", {
          resultId: uid("result"),
          kind: "file",
          label: "本轮生成文件",
          fileId: generated.id,
          name: generated.name,
          path: artifact.path || generated.name,
          operation: "created",
          snapshotContent: artifact.content,
          versionId: uid("version"),
          sourceToolId: toolId,
        });
    }
    if (changed) {
      target.content = nextContent;
      emit("result.add", {
        resultId: uid("result"),
        kind: "file",
        label: "本轮修改文件",
        fileId: target.id,
        name: target.name,
        path: scene.modifies.path || target.name,
        operation: "modified",
        snapshotContent: target.content,
        versionId: uid("version"),
        roundDiff: inlineDiff,
        changeSummary: scene.modifies.changeSummary,
        sourceToolId: toolId,
      });
    }
  };
  const demoFile = expertById(conversation.expertId)?.files.find(
    (item) => item.kind === "file",
  );
  const extraActivityId =
    activityKind && activityKind !== "reasoning" ? uid("activity") : null;
  const secondSubagentId = parallelSubagents ? uid("activity") : null;
  const subagents =
    activityKind === "subagent"
      ? [
          {
            id: extraActivityId,
            goal: parallelSubagents ? "核对夜班数据" : "核对资料范围",
          },
          ...(secondSubagentId
            ? [{ id: secondSubagentId, goal: "检查设备异常" }]
            : []),
        ]
      : [];
  if (modelWaitDemo) emit("thinking.delta", { text: "正在等待模型响应" });
  if (compressionDemo) emit("status.update", { kind: "compacting" });
  if (reconnectDemo)
    emit("status.update", { kind: "lifecycle", phase: "reconnecting" });
  if (activityKind === "reasoning") {
    emit("reasoning.delta", { text: "可见分析摘要：先核对输入范围" });
  } else if (activityKind === "subagent") {
    for (const subagent of subagents)
      emit("subagent.spawn_requested", {
        subagentId: subagent.id,
        goal: subagent.goal,
      });
  } else if (activityKind === "moa") {
    emit("moa.progress", { refsDone: 1, refsTotal: 2 });
    emit("moa.reference", {
      index: 1,
      label: "参考模型甲",
      text: "先确认输入数据范围。",
    });
  }
  if (withTools) {
    if (crowdedToolsDemo)
      for (const tool of crowdedTools.slice(0, 3))
        emit("tool.start", {
          toolId: tool.toolId,
          name: tool.name,
          args: clone(tool.args),
        });
    else if (toolScene && !toolScene.skipStart)
      emit("tool.start", {
        toolId: folderToolId,
        name: toolScene.name,
        args: clone(toolScene.args),
      });
    else if (!toolScene && !crowdedToolsDemo)
      emit(
        "tool.start",
        showProgress
          ? {
              toolId: folderToolId,
              name: "web_extract",
              args: {
                urls: [
                  "https://example.com/demo/a",
                  "https://example.com/demo/b",
                ],
              },
            }
          : showToolDetail
            ? {
                toolId: folderToolId,
                name: "terminal",
                args: { command: "echo 演示核对完成", cwd: "/workspace" },
              }
            : showDiff
              ? {
                  toolId: folderToolId,
                  name: "patch",
                  args: { path: "报告.md" },
                }
              : demoFile
                ? {
                    toolId: folderToolId,
                    name: "read_file",
                    args: { path: demoFile.name },
                  }
                : { toolId: folderToolId, title: "读取工作目录" },
      );
    if (isParallel && !toolScene && !crowdedToolsDemo)
      emit("tool.start", { toolId: analysisToolId, title: "分析资料" });
  } else if (text.includes("等待") && !stageDemo) {
    emit("thinking.delta", { text: "正在等待演示回复" });
  }
  conversation.status = "running";
  conversation.updatedAt = now();
  persist();
  const tickMs = scriptedScene ? 140 : 70;
  const minimumTicks = scriptedScene
    ? Math.ceil((recoveryDemo ? 9000 : 6000) / tickMs)
    : 0;
  const answerChunkSize = scriptedScene
    ? Math.max(1, Math.round(answer.length / 36))
    : 4;
  let offset = 0;
  let phase = withInterim ? "interim" : "answer";
  let ticks = 0;
  const interimText = "已确认分析范围，继续整理资料。";
  const timer = setInterval(() => {
    ticks++;
    if (crowdedToolsDemo)
      crowdedTools.slice(3).forEach((tool, index) => {
        if (ticks === Math.ceil(((index + 1) * crowdedToolIntervalMs) / tickMs))
          emit("tool.start", {
            toolId: tool.toolId,
            name: tool.name,
            args: clone(tool.args),
          });
      });
    if (activityKind === "reasoning") {
      if (ticks === Math.ceil(1400 / tickMs))
        emit("reasoning.delta", { text: "，再检查数据口径" });
      if (ticks === Math.ceil(2800 / tickMs))
        emit("reasoning.delta", { text: "，最后整理可执行建议。" });
    }
    if (activityKind === "subagent") {
      if (ticks === Math.ceil(1200 / tickMs))
        emit("subagent.start", { subagentId: extraActivityId });
      if (secondSubagentId && ticks === Math.ceil(1800 / tickMs))
        emit("subagent.start", { subagentId: secondSubagentId });
      if (ticks === Math.ceil(2400 / tickMs))
        emit("subagent.progress", {
          subagentId: extraActivityId,
          text: "正在读取质量记录",
        });
      if (secondSubagentId && ticks === Math.ceil(3100 / tickMs))
        emit("subagent.progress", {
          subagentId: secondSubagentId,
          text: "正在核对设备日志",
        });
      if (!secondSubagentId && ticks === Math.ceil(4200 / tickMs))
        emit("subagent.progress", {
          subagentId: extraActivityId,
          text: "正在整理核对结论",
        });
      if (secondSubagentId && ticks === Math.ceil(4500 / tickMs))
        emit("subagent.complete", {
          subagentId: secondSubagentId,
          status: "completed",
          summary: "已完成设备日志核对。",
        });
    }
    if (toolScene)
      for (const progress of toolScene.progress || [])
        if (ticks === Math.ceil(progress.afterMs / tickMs)) {
          const { afterMs, ...payload } = progress;
          emit("tool.progress", { toolId: folderToolId, ...payload });
        }
    if (toolScene?.followup && ticks === Math.ceil(3000 / tickMs)) {
      completeToolScene(toolScene, folderToolId);
      emit("tool.start", {
        toolId: followupToolId,
        name: toolScene.followup.name,
        args: clone(toolScene.followup.args),
      });
    }
    if (stageDemo && ticks === Math.ceil(4000 / tickMs)) {
      if (modelWaitDemo) emit("thinking.delta", { text: "" });
      if (compressionDemo) emit("status.update", { kind: "compacted" });
      if (reconnectDemo)
        emit("status.update", { kind: "lifecycle", phase: "reconnected" });
    }
    if ((recoveryDemo || unknownDemo) && ticks === Math.ceil(1000 / tickMs))
      emit("error", { terminal: true });
    if (recoveryDemo && ticks === Math.ceil(6000 / tickMs))
      emit("session.info", { running: true });
    if (unknownDemo && ticks === Math.ceil(6000 / tickMs)) {
      emit("session.info", { running: false });
      activeTimers.delete(conversationId);
      clearInterval(timer);
      persist();
      return;
    }
    if (stageDemo && ticks < Math.ceil(3000 / tickMs)) {
      persist();
      return;
    }
    if (activityKind === "reasoning" && ticks < Math.ceil(3500 / tickMs)) {
      persist();
      return;
    }
    const currentText = phase === "interim" ? interimText : answer;
    const chunkSize =
      phase === "interim" && scriptedScene ? 2 : answerChunkSize;
    const nextOffset = Math.min(currentText.length, offset + chunkSize);
    const advanced = nextOffset > offset;
    if (advanced)
      emit("message.delta", { text: currentText.slice(offset, nextOffset) });
    offset = nextOffset;
    if (phase === "interim" && offset >= interimText.length) {
      emit("message.interim", { text: interimText });
      phase = "answer";
      offset = 0;
    } else if (
      !toolScene &&
      !crowdedToolsDemo &&
      showProgress &&
      phase === "answer" &&
      offset >= Math.floor(answer.length / 4) &&
      !turn.activities.find((item) => item.id === folderToolId)?.progressText &&
      turn.activities.find((item) => item.id === folderToolId)?.status ===
        "running"
    ) {
      emit("tool.progress", {
        toolId: folderToolId,
        preview: "演示：已读取 2/5 个网页",
      });
    }
    if (
      !toolScene &&
      !crowdedToolsDemo &&
      withTools &&
      !isParallel &&
      phase === "answer" &&
      offset >= Math.floor(answer.length * (showProgress ? 0.65 : 0.5)) &&
      !turn.activities.some((item) => item.id === analysisToolId)
    ) {
      emit(
        "tool.complete",
        showToolDetail
          ? {
              toolId: folderToolId,
              result: { exit_code: 0, stdout: "演示核对完成" },
            }
          : showDiff
            ? { toolId: folderToolId, inlineDiff: "-旧值\n+新值" }
            : { toolId: folderToolId },
      );
      emit("tool.start", { toolId: analysisToolId, title: "分析任务" });
    }
    if (
      !toolScene &&
      !crowdedToolsDemo &&
      isParallel &&
      phase === "answer" &&
      offset >= Math.floor(answer.length / 2) &&
      turn.activities.find((item) => item.id === folderToolId)?.status ===
        "running"
    )
      emit("tool.complete", { toolId: folderToolId });
    if (phase === "answer" && offset >= answer.length && ticks < minimumTicks) {
      if (advanced) persist();
      return;
    }
    if (
      phase === "answer" &&
      offset >= answer.length &&
      ticks >= minimumTicks
    ) {
      if (activityKind === "subagent" && !backgroundDelegation)
        emit("subagent.complete", {
          subagentId: extraActivityId,
          status: subagentFailureDemo ? "failed" : "completed",
          summary: subagentFailureDemo
            ? "资料不足，未能完成本项核对。"
            : parallelSubagents
              ? "已完成夜班数据核对。"
              : "已核对演示资料范围。",
        });
      else if (activityKind === "moa") {
        emit("moa.reference", {
          index: 2,
          label: "参考模型乙",
          text: "再比较异常时段。",
        });
        emit("moa.phase", { phase: "aggregator" });
        emit("activity.complete", { activityId: `moa_${turn.id}` });
      }
      if (withTools) {
        if (crowdedToolsDemo)
          for (const tool of crowdedTools)
            emit("tool.complete", {
              toolId: tool.toolId,
              name: tool.name,
              result: { verified: true },
            });
        else if (toolScene) {
          if (toolScene.followup)
            completeToolScene(toolScene.followup, followupToolId);
          else completeToolScene(toolScene, folderToolId);
        } else if (!crowdedToolsDemo) {
          if (
            isParallel &&
            turn.activities.find((item) => item.id === folderToolId)?.status ===
              "running"
          )
            emit("tool.complete", { toolId: folderToolId });
          emit("tool.complete", { toolId: analysisToolId, error: isErrorDemo });
        }
      }
      if (requestKind) {
        const requestId = uid("request");
        emit("request.open", {
          requestId,
          kind: requestKind,
          prompt: answer,
          questions:
            requestKind === "clarify" && text.includes("多题")
              ? [
                  {
                    qid: "time",
                    question: "分析哪个时间范围？",
                    choices: ["最近一周", "本月"],
                    multiSelect: false,
                  },
                  {
                    qid: "line",
                    question: "关注哪些产线？",
                    choices: ["1 号产线", "2 号产线"],
                    multiSelect: true,
                  },
                ]
              : [],
          answers:
            requestKind === "clarify" && text.includes("已答")
              ? { time: "最近一周" }
              : undefined,
          multiSelect: requestKind === "clarify" && text.includes("多选澄清"),
          choices:
            requestKind === "approval"
              ? [
                  ...approvalScopes.map((value) => ({
                    value,
                    label: {
                      once: "允许本次",
                      session: "允许本会话",
                      always: "始终允许",
                    }[value],
                  })),
                  { value: "deny", label: "拒绝" },
                ]
              : requestKind === "clarify" && text.includes("单选澄清")
                ? ["最近一周", "本月"]
                : requestKind === "clarify" && text.includes("多选澄清")
                  ? ["1 号产线", "2 号产线"]
                  : requestKind === "mcp_setup"
                    ? [
                        { value: "approved", label: "允许本次" },
                        { value: "rejected", label: "拒绝" },
                      ]
                    : [],
          actionTitle: requestKind === "approval" ? "执行核对命令" : "",
          actionDetail:
            requestKind === "approval"
              ? "该命令需要授权，结果将单独呈现。"
              : "",
          safeCommand: requestKind === "approval" ? "echo 核对完成" : "",
          failAfterApproval:
            ["approval", "mcp_setup"].includes(requestKind) && isErrorDemo,
        });
        if (parallelApprovalDemo && requestKind === "approval")
          emit("request.open", {
            requestId: uid("request"),
            kind: "approval",
            prompt: "另一项操作也需要授权。",
            actionTitle: "读取核对资料",
            actionDetail: "该文件需要读取授权。",
            safeCommand: "cat 分析资料/良率样例.csv",
            choices: [
              { value: "once", label: "允许本次" },
              { value: "deny", label: "拒绝" },
            ],
          });
        assistant.content = "";
        if (
          (clarifyTimeoutDemo && requestKind === "clarify") ||
          (approvalTimeoutDemo && requestKind === "approval")
        ) {
          const timeoutTimer = setTimeout(() => {
            requestTimeoutTimers.delete(requestId);
            const request = turn.requests.find((item) => item.id === requestId);
            if (
              conversationById(conversationId) !== conversation ||
              request?.status !== "waiting"
            )
              return;
            emit("request.expire", {
              requestId,
              autoContinue: true,
              at: now(),
            });
            assistant.content =
              requestKind === "approval"
                ? "审批未在有效时间内得到回应，该操作未执行。"
                : "未收到补充信息，专家正依据现有资料继续分析。";
            persist();
            const continuation = setTimeout(() => {
              if (turn.status !== "running") return;
              emit("message.complete", {
                status: "complete",
                text:
                  requestKind === "approval"
                    ? "该操作未获授权，已依据现有资料完成其余分析。"
                    : request.lateAnswer
                      ? `已收到超时后的补充信息：“${request.lateAnswer}”。演示分析已根据新信息继续。`
                      : "未收到补充信息，已依据现有资料完成演示分析，请核对结论的适用范围。",
                at: now(),
              });
              activeTimers.delete(conversationId);
              persist();
            }, 9000);
            activeTimers.set(conversationId, continuation);
          }, 7000);
          requestTimeoutTimers.set(requestId, timeoutTimer);
        }
      } else {
        if (
          !isErrorDemo &&
          text.includes("生成待办结果") &&
          conversation.sessionPresentation.todos.length
        )
          emit("result.add", {
            resultId: uid("result"),
            kind: "todo",
            label: "本轮演示清单",
            items: conversation.sessionPresentation.todos,
          });
        emit("message.complete", {
          status: isErrorDemo ? "error" : "complete",
          error: isErrorDemo
            ? "工具执行失败：请核查工作目录和演示数据后重试。"
            : "",
          at: now(),
        });
      }
      activeTimers.delete(conversationId);
      clearInterval(timer);
      if (backgroundDelegation && turn.status === "complete") {
        const backgroundTimer = setTimeout(() => {
          backgroundTimers.delete(conversationId);
          if (conversationById(conversationId) !== conversation) return;
          emit("subagent.complete", {
            subagentId: extraActivityId,
            status: "completed",
            summary: "后台演示子任务已完成资料核对。",
          });
          persist();
        }, 2000);
        backgroundTimers.set(conversationId, backgroundTimer);
      }
    }
    persist();
  }, tickMs);
  activeTimers.set(conversationId, timer);
}

export function resolveDemoRequest(conversationId, requestId, response) {
  const conversation = conversationById(conversationId);
  const turn = conversation?.turns?.find((item) =>
    item.requests.some(
      (request) => request.id === requestId && request.status === "waiting",
    ),
  );
  if (!turn) return false;
  const request = turn.requests.find((item) => item.id === requestId);
  const skipped = request.kind === "clarify" && response?.skip === true;
  const mergedAnswers = request.questions?.length
    ? { ...request.answers, ...(response?.answers || {}) }
    : null;
  const validResponse = skipped
    ? true
    : ["approval", "mcp_setup"].includes(request.kind)
      ? ["once", "session", "always", "deny", "approved", "rejected"].includes(
          response,
        ) &&
        (!request.choices?.length ||
          request.choices.some((choice) => choice.value === response))
      : ["secret", "sudo"].includes(request.kind)
        ? ["submitted", "rejected"].includes(response)
        : request.questions?.length
          ? request.questions.every((question) => {
              const answer = mergedAnswers[question.qid];
              return question.multiSelect
                ? Array.isArray(answer) &&
                    answer.length > 0 &&
                    answer.every(
                      (item) => typeof item === "string" && item.trim(),
                    )
                : typeof answer === "string" && Boolean(answer.trim());
            })
          : request.kind === "clarify" && request.multiSelect
            ? Array.isArray(response) &&
              response.length > 0 &&
              response.every(
                (item) => typeof item === "string" && Boolean(item.trim()),
              )
            : Boolean(String(response || "").trim());
  if (!validResponse) return false;
  const timeoutTimer = requestTimeoutTimers.get(requestId);
  if (timeoutTimer) clearTimeout(timeoutTimer);
  requestTimeoutTimers.delete(requestId);
  const event = (type, payload = {}) =>
    applyConversationEvent(conversation, {
      type,
      ...payload,
      sessionId: conversationId,
      turnId: turn.id,
      seq: turn.lastSeq + 1,
    });
  if (request.questions?.length)
    for (const question of request.questions)
      if (!Object.prototype.hasOwnProperty.call(request.answers, question.qid))
        event("request.answer.accepted", {
          requestId,
          qid: question.qid,
          answer: skipped ? "" : mergedAnswers[question.qid],
        });
  event("request.resolve", {
    requestId,
    response: request.questions?.length
      ? { answers: request.answers }
      : skipped
        ? ""
        : response,
    skipped,
    at: now(),
  });
  conversation.updatedAt = now();
  const waitingRequests = turn.requests.filter(
    (item) => item.status === "waiting",
  );
  if (waitingRequests.length) {
    turn.status = "waiting";
    const assistant = conversation.messages.find(
      (message) => message.id === turn.assistantMessageId,
    );
    if (assistant) assistant.status = "waiting";
    conversation.status = "ready";
    persist();
    return true;
  }
  const approvals = turn.requests.filter((item) => item.kind === "approval");
  if (approvals.length > 1) {
    const allowed = approvals.filter((item) =>
      ["once", "session", "always"].includes(item.response),
    );
    const toolIds = allowed.map((item) => {
      const toolId = uid("tool");
      event("tool.start", { toolId, title: item.actionTitle });
      return toolId;
    });
    const timer = setTimeout(() => {
      if (turn.status !== "running") return;
      for (const toolId of toolIds) event("tool.complete", { toolId });
      event("message.complete", {
        status: "complete",
        text: `两项审批已处理：允许 ${allowed.length} 项，拒绝 ${approvals.length - allowed.length} 项。已获准的操作完成，其余操作未执行。`,
        at: now(),
      });
      activeTimers.delete(conversationId);
      persist();
    }, 2500);
    activeTimers.set(conversationId, timer);
    persist();
    return true;
  }
  if (request.kind === "approval" && ["rejected", "deny"].includes(response)) {
    event("message.interim", {
      text: "本次操作未获授权，继续整理现有资料。",
    });
    const timer = setTimeout(() => {
      if (turn.status !== "running") return;
      event("message.complete", {
        status: "complete",
        text: "已记录你的拒绝。该操作未执行；已根据现有资料完成其余分析。",
        at: now(),
      });
      activeTimers.delete(conversationId);
      persist();
    }, 2500);
    activeTimers.set(conversationId, timer);
  } else if (!["rejected", "deny"].includes(response)) {
    const followupToolId = ["approval", "mcp_setup"].includes(request.kind)
      ? uid("tool")
      : null;
    if (followupToolId)
      event("tool.start", {
        toolId: followupToolId,
        title:
          request.kind === "mcp_setup"
            ? "检查示例 MCP 配置"
            : request.actionTitle || "执行已批准的操作",
      });
    const timer = setTimeout(() => {
      if (turn.status !== "running") return;
      if (followupToolId)
        event("tool.complete", {
          toolId: followupToolId,
          error: request.failAfterApproval ? "后续操作失败" : false,
        });
      const answer = request.failAfterApproval
        ? "已记录本次授权；后续操作未完成。"
        : ["secret", "sudo"].includes(request.kind)
          ? "凭据流程的安全展示已结束，未收集或保存真实凭据。"
          : request.kind === "mcp_setup"
            ? "已记录本次配置决定，示例 MCP 配置检查流程已结束。"
            : request.kind === "approval"
              ? "已记录你的批准。相关流程已继续，请核对后续结果。"
              : request.skipped
                ? "已按你的选择跳过澄清，专家依据现有资料继续演示分析。"
                : `已收到补充信息：“${request.response}”。演示分析已继续，请核对输入资料后再推进下一步。`;
      event("message.complete", {
        status: request.failAfterApproval ? "error" : "complete",
        text: answer,
        error: request.failAfterApproval
          ? "后续操作失败，请核查相关资料。"
          : "",
        at: now(),
      });
      activeTimers.delete(conversationId);
      persist();
    }, 1500);
    activeTimers.set(conversationId, timer);
  }
  persist();
  return true;
}

export function submitDemoLateClarification(conversationId, requestId, answer) {
  const conversation = conversationById(conversationId);
  const text = String(answer || "").trim();
  const turn = conversation?.turns?.find((item) =>
    item.requests?.some((request) => request.id === requestId),
  );
  const request = turn?.requests.find((item) => item.id === requestId);
  if (
    !text ||
    request?.kind !== "clarify" ||
    request.status !== "expired" ||
    request.lateAnswer
  )
    return null;
  if (["running", "recovering"].includes(turn.status)) {
    const accepted = applyConversationEvent(conversation, {
      type: "request.late_answer",
      sessionId: conversationId,
      turnId: turn.id,
      requestId,
      text,
      mode: "current",
      seq: turn.lastSeq + 1,
    });
    if (!accepted) return null;
    conversation.updatedAt = now();
    persist();
    return "current";
  }
  if (conversation.status !== "ready") return null;
  request.lateAnswer = text;
  request.lateAnswerMode = "next";
  sendDemoMessage(conversationId, `超时补答：${text}`);
  const userMessage = [...conversation.messages]
    .reverse()
    .find((message) => message.role === "user");
  if (userMessage) userMessage.replyToRequestId = requestId;
  persist();
  return "next";
}

export function triggerEvent(id) {
  const event = state.eventRuns.find((item) => item.id === id);
  if (!event) return;
  const run = {
    id: uid("run"),
    status: "running",
    at: now(),
    summary: "正在生成演示结果",
  };
  event.runs.unshift(run);
  persist();
  setTimeout(() => {
    run.status = "success";
    run.summary = "已完成演示执行并生成结果";
    persist();
  }, 1100);
}
