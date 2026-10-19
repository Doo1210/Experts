import Vue from "vue";
import { clearFiles } from "./file-db";
import { createImDemoChats, createImWorkspaceItems } from "./im-fixtures";
import { mcpDemoPreset } from "./mcp-demo";
import {
  defaultKnowledgeConfig,
  migrateKnowledgeConfig,
} from "./knowledge-demo";
import {
  enrichProjectFixtures,
  PROJECT_EXPERT_FIXTURES,
} from "./project-fixtures";

export const STORAGE_KEY = "digital-employee-demo-v3";
const clone = (value) => JSON.parse(JSON.stringify(value));
const uid = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const DEMO_DATA_REVISION = 15;

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
  return enrichProjectFixtures({
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
        if (needsFixtureUpgrade)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched));
        return enriched;
      }
    }
  } catch {
    /* corrupted demo state resets to fixture */
  }
  return createSeed();
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
  if (index >= 0) state.conversations.splice(index, 1);
  persist();
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
  const fresh = createSeed();
  for (const key of Object.keys(state)) Vue.set(state, key, fresh[key]);
  localStorage.removeItem(STORAGE_KEY);
  await clearFiles();
}

const activeTimers = new Map();
export function stopDemoStream(id) {
  const timer = activeTimers.get(id);
  if (timer) clearInterval(timer);
  activeTimers.delete(id);
  const conversation = conversationById(id);
  if (conversation?.status === "running") {
    conversation.status = "ready";
    const last = conversation.messages[conversation.messages.length - 1];
    if (last?.status === "streaming") last.status = "stopped";
    persist();
  }
}
export function sendDemoMessage(conversationId, text) {
  const conversation = conversationById(conversationId);
  if (!conversation || !String(text).trim()) return;
  stopDemoStream(conversationId);
  conversation.messages.push({
    id: uid("msg"),
    role: "user",
    content: text.trim(),
    createdAt: now(),
  });
  const isErrorDemo = text.includes("错误") || text.includes("失败");
  const answer = text.includes("澄清")
    ? "为了继续处理，请先说明希望分析的时间范围和目标产线。"
    : text.includes("审批")
      ? "此步骤需要确认是否允许继续执行演示操作。"
      : isErrorDemo
        ? "以上是错误流程：工具执行失败后已停止当前步骤。请核查工作目录和演示数据后重试。"
        : `我已收到你的任务：“${text.trim()}”。\n\n演示过程：读取当前工作目录、分析资料、整理结论。\n\n建议先核对关键数据，再根据结果推进下一步。`;
  const assistant = {
    id: uid("msg"),
    role: "assistant",
    content: "",
    createdAt: now(),
    status: "streaming",
    kind: text.includes("澄清")
      ? "clarify"
      : text.includes("审批")
        ? "approval"
        : isErrorDemo
          ? "error"
          : "normal",
    ...(isErrorDemo
      ? { error: "工具执行失败：连接数据源超时，已重试 2 次。" }
      : {}),
    steps: [
      { title: "读取工作目录", status: "done" },
      { title: "分析任务", status: "running" },
    ],
  };
  conversation.messages.push(assistant);
  conversation.status = "running";
  conversation.updatedAt = now();
  persist();
  let offset = 0;
  const timer = setInterval(() => {
    offset = Math.min(answer.length, offset + 4);
    assistant.content = answer.slice(0, offset);
    if (offset >= answer.length) {
      assistant.status = assistant.kind === "normal" ? "done" : "waiting";
      assistant.steps[1].status = isErrorDemo ? "error" : "done";
      conversation.status = "ready";
      activeTimers.delete(conversationId);
      clearInterval(timer);
    }
    persist();
  }, 70);
  activeTimers.set(conversationId, timer);
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
