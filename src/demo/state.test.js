import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map();
vi.stubGlobal("localStorage", {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
});
vi.mock("./file-db", () => ({
  clearFiles: vi.fn(async () => {}),
  deleteFile: vi.fn(async () => {}),
}));
const demo = await import("./state.js");
const { TOOL_ACTIVITY_SCENES } = await import("./tool-activity-scenes.js");
const { deleteFile } = await import("./file-db.js");
const { enrichProjectFixtures } = await import("./project-fixtures.js");
const { conversationProcessBlocks } = await import("./conversation-turns.js");
const { hasToolDetail } = await import("./conversation-tools.js");

beforeEach(async () => {
  storage.clear();
  await demo.resetDemo();
});

describe("演示状态", () => {
  it("消息渠道名单按专家与平台隔离，升级保留已有目标", () => {
    const seed = demo.createSeed();
    const quality = seed.experts.find((item) => item.id === "exp_quality");
    const ops = seed.experts.find((item) => item.id === "exp_ops");
    const qualityWecom = quality.channels.find((item) => item.id === "wecom");
    const opsWecom = ops.channels.find((item) => item.id === "wecom");
    expect(qualityWecom.people.map((item) => item.id)).toContain("wc-owner");
    expect(opsWecom.people).toEqual([]);

    const opsDingtalk = ops.channels.find((item) => item.id === "dingtalk");
    opsDingtalk.people = [{ id: "custom-user", name: "已有演示目标" }];
    delete opsDingtalk.groups;
    opsDingtalk.deliveries = [{ id: "custom-delivery", status: "unknown" }];
    ops.files = ops.files.filter((item) => item.id !== "f_ops_report");
    seed.demoDataRevision = 16;
    demo.upgradeExpertFixtures(seed);
    expect(opsDingtalk.people).toMatchObject([
      {
        id: "custom-user",
        name: "已有演示目标",
        approved: true,
        source: "管理员添加",
      },
    ]);
    expect(opsDingtalk.groups[0].id).toBe("cid_demo_line_001");
    expect(opsDingtalk.deliveries).toEqual([
      { id: "custom-delivery", status: "unknown" },
    ]);
    expect(ops.files.some((item) => item.id === "f_ops_report")).toBe(true);
    expect(qualityWecom.people).not.toBe(opsWecom.people);
  });

  it("新增的发送状态样例只补齐已知目标，不覆盖已有名单", () => {
    const saved = demo.createSeed();
    const quality = saved.experts.find((item) => item.id === "exp_quality");
    const wecom = quality.channels.find((item) => item.id === "wecom");
    wecom.people = [
      { id: "custom-target", name: "用户自定义目标", result: "未知" },
      { id: "wc-owner", name: "授权人", result: "失败" },
    ];
    wecom.groups = [];
    saved.demoDataRevision = 19;
    demo.upgradeExpertFixtures(saved);
    expect(wecom.people.find((item) => item.id === "wc-owner").result).toBe(
      "失败",
    );
    expect(wecom.people.some((item) => item.id === "custom-target")).toBe(true);
    expect(wecom.people.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "wc-shift-lead",
        "wc-maintenance",
        "wc-inspector",
      ]),
    );
    expect(wecom.groups.map((item) => item.id)).toContain("wc-group-partial");
  });

  it("质量分析专家多问题会话可用于定位滚动演示，升级不覆盖已有对话", () => {
    const seed = demo.createSeed();
    const sample = seed.conversations.find(
      (item) => item.id === "conv_quality_question_navigation",
    );
    expect(sample.expertId).toBe("exp_quality");
    expect(sample.messages.filter((item) => item.role === "user")).toHaveLength(
      72,
    );
    expect(
      sample.messages.filter((item) => item.role === "assistant"),
    ).toHaveLength(72);

    seed.demoDataRevision = 15;
    seed.conversations = seed.conversations.filter(
      (item) => item.id !== sample.id,
    );
    const original = seed.conversations.find(
      (item) => item.id === "conv_quality_1",
    );
    original.messages[0].content = "用户保留的内容";
    demo.upgradeExpertFixtures(seed);
    demo.upgradeExpertFixtures(seed);
    expect(
      seed.conversations.filter((item) => item.id === sample.id),
    ).toHaveLength(1);
    expect(original.messages[0].content).toBe("用户保留的内容");
  });

  it("知识配置按专家隔离，并将旧开关与方式迁移为新范围", () => {
    const seed = demo.createSeed();
    expect(seed.knowledgeMethodConfigs).toEqual({});
    const quality = seed.experts.find((item) => item.id === "exp_quality");
    const ops = seed.experts.find((item) => item.id === "exp_ops");
    expect(quality.knowledge).toMatchObject({
      scope: "selected",
      libraryIds: ["kb_quality", "kb_process"],
      defaultMethodId: "smart-reasoning",
    });
    expect(quality.knowledge).not.toHaveProperty("methodIds");
    expect(ops.knowledge.scope).toBe("none");
    expect(ops.knowledge).not.toBe(quality.knowledge);

    seed.demoDataRevision = 10;
    quality.knowledge = {
      enabled: true,
      scope: "selected",
      libraryIds: ["kb_quality"],
      fileTypes: ["Excel"],
      mode: "quick-retrieval",
    };
    ops.knowledge = {
      enabled: false,
      scope: "all",
      libraryIds: [],
      fileTypes: [],
      mode: "data-analysis",
    };
    demo.upgradeExpertFixtures(seed);
    expect(quality.knowledge).toMatchObject({
      scope: "selected",
      fileTypes: ["Excel（XLSX）"],
      defaultMethodId: "quick-answer",
    });
    expect(ops.knowledge).toMatchObject({
      scope: "none",
      defaultMethodId: "data-analysis",
    });

    const withSwitches = demo.createSeed();
    withSwitches.demoDataRevision = 13;
    withSwitches.experts.find(
      (item) => item.id === "exp_quality",
    ).knowledge.methodIds = ["smart-reasoning"];
    demo.upgradeExpertFixtures(withSwitches);
    expect(
      withSwitches.experts.find((item) => item.id === "exp_quality").knowledge,
    ).not.toHaveProperty("methodIds");

    const old = demo.createSeed();
    old.demoDataRevision = 12;
    old.experts.find((item) => item.id === "exp_quality").knowledge = {
      enabled: true,
      scope: "all",
      mode: "auto",
      libraryIds: [],
      fileTypes: [],
    };
    demo.upgradeExpertFixtures(old);
    expect(
      old.experts.find((item) => item.id === "exp_quality").knowledge
        .defaultMethodId,
    ).toBe("auto");
  });
  it("默认 MCP 样例覆盖多种连接与能力状态，并与第二个 Profile 隔离", () => {
    const seed = demo.createSeed();
    const quality = seed.experts.find((item) => item.id === "exp_quality");
    const ops = seed.experts.find((item) => item.id === "exp_ops");
    expect(quality.mcps.length).toBeGreaterThan(8);
    expect(quality.mcps.some((item) => item.probe === "auth")).toBe(true);
    expect(quality.mcps.some((item) => item.probe === "error")).toBe(true);
    expect(quality.mcps.some((item) => item.probe === "untested")).toBe(true);
    expect(
      quality.mcps.some((item) => item.resourceCount && !item.tools.length),
    ).toBe(true);
    expect(ops.mcps).toHaveLength(2);
    expect(ops.mcps).not.toBe(quality.mcps);
  });
  it("增量补齐 MCP 样例时保留用户添加的服务和同名旧服务", () => {
    const saved = demo.createSeed();
    saved.demoDataRevision = 4;
    const quality = saved.experts.find((item) => item.id === "exp_quality");
    quality.mcps = [
      { id: "custom", name: "自定义服务", enabled: false },
      { id: "mcp_db", name: "质量数据库", enabled: true },
    ];
    demo.upgradeExpertFixtures(saved);
    expect(quality.mcps.some((item) => item.id === "custom")).toBe(true);
    expect(quality.mcps.some((item) => item.id === "demo_mcp_quality_db")).toBe(
      false,
    );
    const count = quality.mcps.length;
    demo.upgradeExpertFixtures(saved);
    expect(quality.mcps).toHaveLength(count);
  });
  it("预置专家展示零到三个已接入消息渠道", () => {
    const counts = demo
      .createSeed()
      .experts.map(
        (expert) =>
          expert.channels.filter(
            (channel) => channel.enabled && channel.connected,
          ).length,
      );
    expect(new Set(counts)).toEqual(new Set([0, 1, 2, 3]));
  });
  it("升级渠道展示样例时保留手动修改的连接状态", () => {
    const saved = demo.createSeed();
    saved.demoDataRevision = 3;
    const oldConnections = {
      exp_ops: ["feishu"],
      exp_equipment: [],
      exp_process: ["wecom"],
      exp_digital: ["feishu"],
    };
    saved.experts.forEach((expert) => {
      if (!oldConnections[expert.id]) return;
      expert.channels.forEach((channel) => {
        channel.enabled = oldConnections[expert.id].includes(channel.id);
        channel.connected = channel.enabled;
      });
    });
    const processDingtalk = saved.experts
      .find((expert) => expert.id === "exp_process")
      .channels.find((channel) => channel.id === "dingtalk");
    processDingtalk.enabled = true;
    processDingtalk.connected = false;
    demo.upgradeExpertFixtures(saved);
    const connectedCount = (id) =>
      saved.experts
        .find((expert) => expert.id === id)
        .channels.filter((channel) => channel.enabled && channel.connected)
        .length;
    expect(connectedCount("exp_ops")).toBe(2);
    expect(connectedCount("exp_equipment")).toBe(3);
    expect(processDingtalk.connected).toBe(false);
    expect(connectedCount("exp_process")).toBe(1);
  });
  it("首次对话标题保留前 20 个字符，超出显示省略号", () => {
    expect(demo.conversationTitleFromFirstMessage("12345678901234567890")).toBe(
      "12345678901234567890",
    );
    expect(
      demo.conversationTitleFromFirstMessage("123456789012345678901"),
    ).toBe("12345678901234567890…");
    expect(
      demo.conversationTitleFromFirstMessage("  检查  本周良率\n变化  "),
    ).toBe("检查 本周良率 变化");
  });
  it("补充专家与模板时保留已有演示内容", () => {
    const saved = demo.createSeed();
    delete saved.demoDataRevision;
    saved.experts = saved.experts.filter(
      (item) =>
        ![
          "exp_process",
          "exp_safety",
          "exp_algorithm",
          "exp_digital",
          "exp_ops",
        ].includes(item.id),
    );
    saved.templates = saved.templates.filter(
      (item) => item.id === "tpl_quality",
    );
    saved.experts.push({ id: "exp_personal", name: "自建专家" });
    const upgraded = demo.upgradeExpertFixtures(saved);
    expect(upgraded.experts).toHaveLength(9);
    expect(upgraded.templates).toHaveLength(8);
    expect(upgraded.experts.some((item) => item.id === "exp_ops")).toBe(false);
    expect(upgraded.experts.some((item) => item.id === "exp_personal")).toBe(
      true,
    );
    expect(
      upgraded.templates.every((template) =>
        upgraded.experts.some(
          (expert) => expert.id === template.sourceExpertId,
        ),
      ),
    ).toBe(true);
  });
  it("升级消息渠道样例时保留自建聊天并补齐原型会话", () => {
    const saved = demo.createSeed();
    saved.demoDataRevision = 2;
    saved.imChats = [
      { id: "im_wecom_1", expertId: "exp_quality", members: [] },
      { id: "custom_chat", expertId: "exp_quality", members: [] },
    ];
    const upgraded = demo.upgradeExpertFixtures(saved);
    expect(upgraded.imChats.map((chat) => chat.id)).toContain("custom_chat");
    expect(upgraded.imChats.some((chat) => chat.id === "im_wecom_1")).toBe(
      false,
    );
    const group = upgraded.imChats.find((chat) => chat.chatType === "group");
    expect(group.members).toHaveLength(3);
    expect(group.members[0].segments).toHaveLength(3);
    expect(group.scopes.every((scope) => scope.mode === "member")).toBe(true);
    expect(
      group.members[0].segments[1].messages.map((item) => item.role),
    ).toContain("file");
    expect(upgraded.imChats.some((chat) => chat.chatType === "single")).toBe(
      true,
    );
    expect(
      upgraded.experts
        .find((item) => item.id === "exp_quality")
        .files.some(
          (item) => item.name === "chat-wecom81" && item.kind === "folder",
        ),
    ).toBe(true);
  });
  it("升级新版聊天记录样例时保留自建聊天并补齐内部通知", () => {
    const saved = demo.createSeed();
    saved.demoDataRevision = 7;
    saved.imChats.find(
      (chat) => chat.chatType === "group",
    ).scopes[0].segments[0].messages = [];
    saved.imChats.push({
      id: "custom_chat_2",
      expertId: "exp_quality",
      members: [],
    });
    const upgraded = demo.upgradeExpertFixtures(saved);
    expect(upgraded.imChats.some((chat) => chat.id === "custom_chat_2")).toBe(
      true,
    );
    expect(
      upgraded.imChats
        .find((chat) => chat.chatType === "group")
        .scopes[0].segments.at(-1)
        .messages.some((entry) => entry.role === "notice"),
    ).toBe(true);
  });
  it("旧单聊样例迁移为无范围结构并保留会话内容", () => {
    const saved = demo.createSeed();
    saved.demoDataRevision = 8;
    const dm = saved.imChats.find((chat) => chat.id === "im_exp_quality_dm");
    const oldPrefix = `${dm.cwd}/scope-direct01`;
    dm.scopes = [
      {
        sessionKey: "legacy-direct-key",
        segments: dm.segments.map((segment) => ({
          ...segment,
          cwd: segment.cwd.replace(dm.cwd, oldPrefix),
          messages: segment.messages.map((entry) => ({
            ...entry,
            fileDirectory: entry.fileDirectory?.replace(dm.cwd, oldPrefix),
          })),
        })),
      },
    ];
    dm.scopes[0].segments[0].messages[0].content = "保留的旧对话";
    delete dm.segments;
    const quality = saved.experts.find((item) => item.id === "exp_quality");
    const chatFolder = quality.files.find(
      (item) => item.name === "chat-dingtalk30",
    );
    quality.files.push(
      {
        id: "old-direct-scope",
        name: "scope-direct01",
        kind: "folder",
        parentId: chatFolder.id,
      },
      {
        id: "old-direct-segment",
        name: "session-s5",
        kind: "folder",
        parentId: "old-direct-scope",
      },
      {
        id: "custom-im-file",
        name: "用户保留文件.txt",
        kind: "file",
        parentId: "old-direct-segment",
      },
    );
    const upgraded = demo.upgradeExpertFixtures(saved);
    const migrated = upgraded.imChats.find(
      (chat) => chat.id === "im_exp_quality_dm",
    );
    expect(migrated.sessionKey).toBeNull();
    expect(migrated.scopes).toEqual([]);
    expect(migrated.segments[0].messages[0].content).toBe("保留的旧对话");
    expect(migrated.segments[0].cwd).toBe(`${dm.cwd}/session-s5`);
    expect(
      migrated.segments[1].messages.find((entry) => entry.role === "file")
        .fileDirectory,
    ).toBe(`${dm.cwd}/session-s6/收到文件`);
    expect(quality.files.some((item) => item.id === "old-direct-scope")).toBe(
      false,
    );
    const movedFile = quality.files.find(
      (item) => item.id === "custom-im-file",
    );
    expect(
      quality.files.find((item) => item.id === movedFile.parentId).name,
    ).toBe("session-s5");
  });
  it("旧群聊策略样例退回成员记录，不展示共享策略", () => {
    const saved = demo.createSeed();
    saved.demoDataRevision = 9;
    const group = saved.imChats.find(
      (chat) => chat.id === "im_exp_quality_group",
    );
    group.currentPolicy = "全群共享";
    group.scopes.unshift({
      mode: "shared",
      current: true,
      sessionKey: "legacy-shared",
      segments: [{ sessionId: "shared-segment" }],
    });
    group.scopes[1].current = false;
    group.scopes[1].segments.at(-1).current = false;
    const upgraded = demo.upgradeExpertFixtures(saved);
    const migrated = upgraded.imChats.find(
      (chat) => chat.id === "im_exp_quality_group",
    );
    expect(migrated.currentPolicy).toBeUndefined();
    expect(migrated.scopes).toHaveLength(3);
    expect(migrated.deferredSharedScopes[0].sessionKey).toBe("legacy-shared");
    expect(migrated.scopes.every((scope) => scope.mode === "member")).toBe(
      true,
    );
    expect(migrated.scopes[0].segments.at(-1).current).toBe(true);
  });
  it("会话软归档不影响项目看板卡", () => {
    const card = demo.projectById("proj_factory").tasks[0];
    const conversation = demo.conversationById("conv_quality_1");
    demo.updateConversation(conversation.id, { archived: true });
    expect(
      demo
        .conversationsFor("exp_quality")
        .some((x) => x.id === conversation.id),
    ).toBe(false);
    expect(
      demo
        .conversationsFor("exp_quality", true)
        .some((x) => x.id === conversation.id),
    ).toBe(true);
    expect(card.archived).toBe(false);
  });
  it("切换任务时可停止模拟流并保留消息", () => {
    const conversation = demo.createConversation("exp_quality");
    demo.sendDemoMessage(conversation.id, "分析数据");
    expect(conversation.status).toBe("running");
    demo.stopDemoStream(conversation.id);
    expect(conversation.status).toBe("ready");
    expect(conversation.messages.map((x) => x.role)).toEqual([
      "user",
      "assistant",
    ]);
    expect(conversation.messages[1].status).toBe("stopped");
  });
  it("删除文件夹时同时移除其子项", () => {
    const removed = demo.removeWorkspaceItems("exp_quality", [
      "f_quality_docs",
    ]);
    expect(removed).toContain("f_quality_docs");
    expect(removed).toContain("f_quality_csv");
    expect(
      demo
        .expertById("exp_quality")
        .files.some((x) => x.id === "f_quality_csv"),
    ).toBe(false);
  });
  it("重复模拟拆解不重复创建看板任务", () => {
    vi.useFakeTimers();
    try {
      const project = demo.projectById("proj_factory");
      const baseline = project.tasks.length;
      demo.launchGoal(project.id, "goal_1");
      vi.advanceTimersByTime(1000);
      expect(project.tasks).toHaveLength(baseline + 2);
      demo.launchGoal(project.id, "goal_1");
      vi.advanceTimersByTime(1000);
      expect(project.tasks).toHaveLength(baseline + 2);
    } finally {
      vi.useRealTimers();
    }
  });
  it("复制已有专家时继承配置并建立独立工作空间", () => {
    const copied = demo.addExpert(
      {
        name: "质量分析专家 副本",
        description: "演示复制",
        model: "通用大模型",
        avatarUrl: "/experts/avatars/quality-man.svg",
      },
      "",
      "exp_quality",
    );
    expect(copied.id).not.toBe("exp_quality");
    expect(copied.skills.map((skill) => skill.id)).toContain("skill_csv");
    expect(copied.workspaceRoot).toBe("/专家/质量分析专家 副本");
    expect(copied.files.map((file) => file.name)).toEqual([
      "消息渠道",
      "自主任务",
    ]);
  });
  it("新建项目保存图标和成员，编辑不丢失看板任务", () => {
    const project = demo.addProject({
      name: "样例项目",
      description: "项目介绍",
      icon: "🏭",
      memberIds: ["exp_quality"],
    });
    const task = demo.addProjectTask(project.id, { title: "收集数据" });
    demo.updateProject(project.id, { name: "更新后的项目" });
    expect(project.icon).toBe("🏭");
    expect(project.members).toEqual(["exp_quality"]);
    expect(project.tasks.map((item) => item.id)).toContain(task.id);
  });
  it("项目详情表单保存目标描述、任务优先级和前置任务", () => {
    const project = demo.projectById("proj_factory");
    const goal = demo.addGoal(project.id, {
      title: "核对良率",
      description: "分析试点产线的变化原因",
      model: "系统默认",
    });
    const task = demo.addProjectTask(project.id, {
      title: "形成结论",
      assigneeId: "exp_quality",
      priority: "high",
      predecessorId: "card_1",
      status: "todo",
    });
    expect(goal.description).toBe("分析试点产线的变化原因");
    expect(task.priority).toBe("high");
    expect(task.predecessorId).toBe("card_1");
  });
  it("多个项目场景都有可用的看板、目标、动态和工作空间数据", () => {
    const seed = demo.createSeed();
    expect(seed.projects.map((project) => project.id)).toEqual([
      "proj_factory",
      "proj_supply",
      "proj_energy",
      "proj_maintenance",
    ]);
    for (const project of seed.projects) {
      expect(project.members.length).toBeGreaterThanOrEqual(2);
      expect(project.goals.length).toBeGreaterThan(0);
      expect(project.activity.length).toBeGreaterThan(0);
      expect(project.tasks.some((task) => task.status === "paused")).toBe(true);
      expect(project.tasks.some((task) => task.status === "done")).toBe(true);
      expect(project.files.some((file) => file.content)).toBe(true);
      const taskIds = new Set(project.tasks.map((task) => task.id));
      project.goals.forEach((goal) =>
        (goal.generatedTaskIds || []).forEach((id) =>
          expect(taskIds.has(id)).toBe(true),
        ),
      );
    }
  });
  it("旧演示数据增量补齐且重复迁移不覆盖用户项目", () => {
    const old = demo.createSeed();
    delete old.projectFixtureVersion;
    old.experts = old.experts.slice(0, 2);
    old.projects = [old.projects[0], { id: "user_project", name: "我的项目" }];
    old.projects[0].name = "用户编辑的项目名";
    old.projects[0].members = ["exp_ops"];
    old.projects[0].tasks = old.projects[0].tasks.slice(0, 3);
    old.projects[0].goals = old.projects[0].goals.slice(0, 1);
    old.projects[0].activity = [];
    old.projects[0].files = [];
    enrichProjectFixtures(old);
    const firstCount = old.projects[0].tasks.length;
    enrichProjectFixtures(old);
    expect(old.projects[0].name).toBe("用户编辑的项目名");
    expect(old.projects[0].members).toEqual(["exp_ops"]);
    expect(
      old.projects[0].tasks
        .filter((task) => task.id.startsWith("factory_"))
        .every((task) => task.assigneeId === "exp_ops"),
    ).toBe(true);
    expect(old.projects[0].tasks).toHaveLength(firstCount);
    expect(
      old.projects.find((project) => project.id === "user_project").name,
    ).toBe("我的项目");
  });
  it("普通回合无需工具，停止时保留部分输出并保存中断状态", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "测试回合");
      demo.sendDemoMessage(conversation.id, "你好");
      await vi.advanceTimersByTimeAsync(140);
      const partial = conversation.messages[1].content;
      expect(partial.length).toBeGreaterThan(0);
      demo.stopDemoStream(conversation.id);
      await vi.advanceTimersByTimeAsync(10000);
      expect(conversation.turns[0]).toMatchObject({
        status: "interrupted",
        activities: [],
      });
      expect(conversation.messages[1].content).toBe(partial);
      expect(conversation.status).toBe("ready");
    } finally {
      vi.useRealTimers();
    }
  });
  it("关键词演示保留可观察的处理过程，普通回复仍能较快结束", async () => {
    vi.useFakeTimers();
    try {
      const scripted = demo.createConversation("exp_quality", "工具演示节奏");
      demo.sendDemoMessage(scripted.id, "工具详情");
      await vi.advanceTimersByTimeAsync(5600);
      expect(scripted.turns[0].status).toBe("running");
      expect(scripted.turns[0].activities.length).toBeGreaterThan(0);
      await vi.advanceTimersByTimeAsync(2500);
      expect(scripted.turns[0].status).toBe("complete");

      const ordinary = demo.createConversation("exp_quality", "普通回复节奏");
      demo.sendDemoMessage(ordinary.id, "你好");
      await vi.advanceTimersByTimeAsync(3000);
      expect(ordinary.turns[0].status).toBe("complete");

      const interrupted = demo.createConversation("exp_quality", "中止演示");
      demo.sendDemoMessage(interrupted.id, "演示进度");
      await vi.advanceTimersByTimeAsync(2000);
      const partial = interrupted.messages[1].content;
      expect(interrupted.turns[0].status).toBe("running");
      demo.stopDemoStream(interrupted.id);
      await vi.advanceTimersByTimeAsync(10000);
      expect(interrupted.turns[0].status).toBe("interrupted");
      expect(interrupted.messages[1].content).toBe(partial);
    } finally {
      vi.useRealTimers();
    }
  });
  it("恢复演示可继续完成，未知终态不会被后续计时改写", async () => {
    vi.useFakeTimers();
    try {
      const recovered = demo.createConversation("exp_quality", "恢复状态演示");
      demo.sendDemoMessage(recovered.id, "演示恢复中");
      await vi.advanceTimersByTimeAsync(1200);
      expect(recovered.turns[0].status).toBe("recovering");
      await vi.advanceTimersByTimeAsync(5200);
      expect(recovered.turns[0].status).toBe("running");
      await vi.advanceTimersByTimeAsync(3500);
      expect(recovered.turns[0].status).toBe("complete");
      expect(recovered.turns[0].durationMs).toBeGreaterThanOrEqual(9000);

      const unknown = demo.createConversation("exp_quality", "未知终态演示");
      demo.sendDemoMessage(unknown.id, "演示运行异常");
      await vi.advanceTimersByTimeAsync(1200);
      expect(unknown.turns[0].status).toBe("recovering");
      await vi.advanceTimersByTimeAsync(5200);
      expect(unknown.turns[0].status).toBe("unknown");
      expect(unknown.turns[0].durationMs).toBeNull();
      expect(unknown.messages[1].content).toContain("无法确认");
      expect(
        unknown.turns[0].activities.every((item) => item.status !== "running"),
      ).toBe(true);
      const partial = unknown.messages[1].content;
      await vi.advanceTimersByTimeAsync(10000);
      expect(unknown.turns[0].status).toBe("unknown");
      expect(unknown.messages[1].content).toBe(partial);
    } finally {
      vi.useRealTimers();
    }
  });
  it("澄清请求与用户回复留在同一回合，重复提交无效", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "澄清回合");
      demo.sendDemoMessage(conversation.id, "请澄清");
      await vi.advanceTimersByTimeAsync(10000);
      const turn = conversation.turns[0];
      const request = turn.requests[0];
      expect(turn.status).toBe("waiting");
      expect(request.status).toBe("waiting");
      expect(conversation.messages[1].content).toBe("");
      expect(
        demo.resolveDemoRequest(conversation.id, request.id, "最近一周"),
      ).toBe(true);
      expect(
        demo.resolveDemoRequest(conversation.id, request.id, "重复回复"),
      ).toBe(false);
      await vi.advanceTimersByTimeAsync(2000);
      expect(turn.status).toBe("complete");
      expect(turn.durationMs).toBeGreaterThanOrEqual(10000);
      expect(request.response).toBe("最近一周");
      expect(conversation.messages).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
  it("主动跳过澄清会记录用户决定并继续，不与超时混淆", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "跳过澄清");
      demo.sendDemoMessage(conversation.id, "请澄清");
      await vi.advanceTimersByTimeAsync(10000);
      const request = conversation.turns[0].requests[0];
      expect(
        demo.resolveDemoRequest(conversation.id, request.id, { skip: true }),
      ).toBe(true);
      expect(request).toMatchObject({
        status: "resolved",
        skipped: true,
        response: "",
      });
      expect(
        demo.resolveDemoRequest(conversation.id, request.id, "迟到回答"),
      ).toBe(false);
      await vi.advanceTimersByTimeAsync(2000);
      expect(conversation.turns[0].status).toBe("complete");
      expect(conversation.messages[1].content).toContain("跳过澄清");

      const partial = demo.createConversation("exp_quality", "跳过剩余问题");
      demo.sendDemoMessage(partial.id, "已答多题澄清");
      await vi.advanceTimersByTimeAsync(10000);
      const batch = partial.turns[0].requests[0];
      expect(batch.answers).toEqual({ time: "最近一周" });
      expect(
        demo.resolveDemoRequest(partial.id, batch.id, { skip: true }),
      ).toBe(true);
      expect(batch.answers).toEqual({ time: "最近一周", line: [] });
      expect(batch.skipped).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
  it("单题多选澄清将预置项和自定义回答一并记录", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "多选澄清");
      demo.sendDemoMessage(conversation.id, "请多选澄清");
      await vi.advanceTimersByTimeAsync(10000);
      const request = conversation.turns[0].requests[0];
      expect(request.multiSelect).toBe(true);
      expect(demo.resolveDemoRequest(conversation.id, request.id, [])).toBe(
        false,
      );
      expect(
        demo.resolveDemoRequest(conversation.id, request.id, [
          "1 号产线",
          "3 号产线",
        ]),
      ).toBe(true);
      expect(request.response).toBe("1 号产线、3 号产线");
    } finally {
      vi.useRealTimers();
    }
  });
  it("澄清超时后继续，同回合补答与结束后补答各有明确归属", async () => {
    vi.useFakeTimers();
    try {
      const current = demo.createConversation(
        "exp_quality",
        "超时后当前回合补答",
      );
      demo.sendDemoMessage(current.id, "演示澄清超时");
      await vi.advanceTimersByTimeAsync(14000);
      const firstTurn = current.turns[0];
      const firstRequest = firstTurn.requests[0];
      expect(firstRequest.status).toBe("expired");
      expect(firstTurn.status).toBe("running");
      expect(
        demo.submitDemoLateClarification(
          current.id,
          firstRequest.id,
          "分析一号产线",
        ),
      ).toBe("current");
      expect(firstTurn.corrections).toMatchObject([
        { requestId: firstRequest.id, text: "分析一号产线" },
      ]);
      await vi.advanceTimersByTimeAsync(10000);
      expect(firstTurn.status).toBe("complete");
      expect(current.messages[1].content).toContain("分析一号产线");

      const later = demo.createConversation(
        "exp_quality",
        "超时后下一回合补答",
      );
      demo.sendDemoMessage(later.id, "演示澄清超时");
      await vi.advanceTimersByTimeAsync(24000);
      const oldRequest = later.turns[0].requests[0];
      expect(oldRequest.status).toBe("expired");
      expect(later.turns[0].status).toBe("complete");
      expect(
        demo.submitDemoLateClarification(
          later.id,
          oldRequest.id,
          "补充夜班数据",
        ),
      ).toBe("next");
      expect(later.turns).toHaveLength(2);
      expect(later.messages.at(-2)).toMatchObject({
        role: "user",
        replyToRequestId: oldRequest.id,
      });
      await vi.advanceTimersByTimeAsync(10000);

      const answered = demo.createConversation("exp_quality", "超时前回答");
      demo.sendDemoMessage(answered.id, "演示澄清超时");
      await vi.advanceTimersByTimeAsync(7000);
      const timelyRequest = answered.turns[0].requests[0];
      expect(timelyRequest.status).toBe("waiting");
      expect(
        demo.resolveDemoRequest(answered.id, timelyRequest.id, "最近一周"),
      ).toBe(true);
      await vi.advanceTimersByTimeAsync(12000);
      expect(timelyRequest.status).toBe("resolved");
      expect(answered.turns[0].status).toBe("complete");
    } finally {
      vi.useRealTimers();
    }
  });
  it("引用资料不冒充产出，生成文件可从本轮结果打开", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "结果回合");
      demo.sendDemoMessage(conversation.id, "列出待办并引用资料");
      const revision = conversation.sessionPresentation.todoRevision;
      await vi.advanceTimersByTimeAsync(10000);
      expect(conversation.turns[0].results).toHaveLength(0);
      demo.sendDemoMessage(conversation.id, "演示工具：生成结果文件");
      await vi.advanceTimersByTimeAsync(10000);
      const result = conversation.turns[1].results[0];
      const fileId = result?.fileId;
      expect(fileId).toBeTruthy();
      expect(result.sourceToolId).toBe(conversation.turns[1].activities[0].id);
      expect(
        demo.expertById("exp_quality").files.some((item) => item.id === fileId),
      ).toBe(true);
      demo.sendDemoMessage(conversation.id, "完成待办");
      expect(conversation.sessionPresentation.todoRevision).toBe(revision + 1);
      expect(conversation.sessionPresentation.todos[0].status).toBe(
        "completed",
      );
    } finally {
      demo.stopDemoStream(demo.state.conversations[0].id);
      vi.useRealTimers();
    }
  });
  it("多个产出文件和修改文件都保留本轮版本", async () => {
    vi.useFakeTimers();
    try {
      const many = demo.createConversation("exp_quality", "多个产出文件");
      demo.sendDemoMessage(many.id, "演示产出：多个文件");
      await vi.advanceTimersByTimeAsync(10000);
      const generated = many.turns[0].results.filter(
        (result) => result.kind === "file",
      );
      expect(generated).toHaveLength(12);
      expect(generated.every((result) => result.operation === "created")).toBe(
        true,
      );
      expect(
        generated.every((result) =>
          result.snapshotContent.includes("本文件仅用于演示"),
        ),
      ).toBe(true);

      const source = demo
        .expertById("exp_quality")
        .files.find((file) => file.id === "f_quality_csv");
      const before = source.content;
      const changed = demo.createConversation("exp_quality", "修改文件产出");
      demo.sendDemoMessage(changed.id, "演示产出：修改文件");
      await vi.advanceTimersByTimeAsync(10000);
      const result = changed.turns[0].results[0];
      expect(source.content).not.toBe(before);
      expect(result).toMatchObject({
        fileId: "f_quality_csv",
        operation: "modified",
        snapshotContent: source.content,
        changeSummary: "调整 1 行良率数据",
      });
      expect(result.roundDiff).toContain("+2026-10-09,97.1%");
      source.content = "后续回合再次修改";
      expect(result.snapshotContent).not.toBe(source.content);
    } finally {
      vi.useRealTimers();
    }
  });
  it("写入、修改及混合工具场景按确认保存结果生成本轮产出", async () => {
    vi.useFakeTimers();
    try {
      const written = demo.createConversation("exp_quality", "写入文件产出");
      demo.sendDemoMessage(written.id, "演示工具：写入文件");
      await vi.advanceTimersByTimeAsync(10000);
      expect(written.turns[0].results).toMatchObject([
        { kind: "file", name: "报告.md", operation: "created" },
      ]);
      expect(written.turns[0].results[0].sourceToolId).toBe(
        written.turns[0].activities[0].id,
      );

      const modified = demo.createConversation("exp_quality", "修改文件产出");
      demo.sendDemoMessage(modified.id, "演示工具：修改文件");
      await vi.advanceTimersByTimeAsync(10000);
      expect(modified.turns[0].results).toMatchObject([
        {
          kind: "file",
          fileId: "f_quality_csv",
          operation: "modified",
        },
      ]);
      expect(modified.turns[0].results[0].roundDiff).toContain("+2026-10-09");

      const mixed = demo.createConversation("exp_quality", "新建和修改文件");
      demo.sendDemoMessage(mixed.id, "演示产出：新建和修改文件");
      await vi.advanceTimersByTimeAsync(3500);
      expect(mixed.turns[0].activities.map((item) => item.name)).toEqual([
        "write_file",
        "patch",
      ]);
      expect(mixed.turns[0].results).toMatchObject([
        { name: "质量核对摘要.md", operation: "created" },
      ]);
      await vi.advanceTimersByTimeAsync(6500);
      expect(mixed.turns[0].results).toMatchObject([
        { name: "质量核对摘要.md", operation: "created" },
        { fileId: "f_quality_csv", operation: "modified" },
      ]);
      expect(mixed.turns[0].results.map((item) => item.sourceToolId)).toEqual(
        mixed.turns[0].activities.map((item) => item.id),
      );
      expect(mixed.turns[0].results.every((item) => item.versionId)).toBe(true);
      expect(mixed.turns[0].results[1].snapshotContent).not.toBe(
        modified.turns[0].results[0].snapshotContent,
      );
      expect(mixed.turns[0].results[1].roundDiff).toContain(
        "+2026-10-09,96.8%",
      );
    } finally {
      vi.useRealTimers();
    }
  });
  it("审批通过只启动后续活动，拒绝跳过本次操作后继续收口", async () => {
    vi.useFakeTimers();
    try {
      const approved = demo.createConversation("exp_quality", "审批通过");
      demo.sendDemoMessage(approved.id, "请审批");
      await vi.advanceTimersByTimeAsync(10000);
      const request = approved.turns[0].requests[0];
      expect(request.choices.map((choice) => choice.value)).toEqual([
        "once",
        "session",
        "always",
        "deny",
      ]);
      expect(demo.resolveDemoRequest(approved.id, request.id, "once")).toBe(
        true,
      );
      expect(approved.turns[0].status).toBe("running");
      expect(approved.turns[0].activities[0].status).toBe("running");
      await vi.advanceTimersByTimeAsync(2000);
      expect(approved.turns[0].status).toBe("complete");
      expect(approved.turns[0].activities[0].status).toBe("complete");

      const rejected = demo.createConversation("exp_quality", "审批拒绝");
      demo.sendDemoMessage(rejected.id, "请审批");
      await vi.advanceTimersByTimeAsync(10000);
      expect(
        demo.resolveDemoRequest(
          rejected.id,
          rejected.turns[0].requests[0].id,
          "deny",
        ),
      ).toBe(true);
      expect(rejected.turns[0].status).toBe("running");
      expect(rejected.turns[0].activities).toHaveLength(0);
      expect(rejected.turns[0].interims[0].text).toContain("继续整理");
      await vi.advanceTimersByTimeAsync(3000);
      expect(rejected.turns[0].status).toBe("complete");
      expect(rejected.messages[1].content).toContain("该操作未执行");
    } finally {
      vi.useRealTimers();
    }
  });
  it("审批允许范围只接受当前请求提供的选项", async () => {
    vi.useFakeTimers();
    try {
      const once = demo.createConversation("exp_quality", "仅本次审批");
      demo.sendDemoMessage(once.id, "请审批仅允许本次");
      await vi.advanceTimersByTimeAsync(10000);
      expect(
        once.turns[0].requests[0].choices.map((item) => item.value),
      ).toEqual(["once", "deny"]);
      expect(
        demo.resolveDemoRequest(
          once.id,
          once.turns[0].requests[0].id,
          "session",
        ),
      ).toBe(false);
      const scoped = demo.createConversation("exp_quality", "会话或始终审批");
      demo.sendDemoMessage(scoped.id, "请审批仅允许本会话与始终");
      await vi.advanceTimersByTimeAsync(10000);
      expect(
        scoped.turns[0].requests[0].choices.map((item) => item.value),
      ).toEqual(["session", "always", "deny"]);
      expect(
        demo.resolveDemoRequest(
          scoped.id,
          scoped.turns[0].requests[0].id,
          "always",
        ),
      ).toBe(true);
      expect(scoped.turns[0].requests[0].response).toBe("always");
    } finally {
      vi.useRealTimers();
    }
  });
  it("并行审批逐项结算，超时不生成用户拒绝决定", async () => {
    vi.useFakeTimers();
    try {
      const parallel = demo.createConversation("exp_quality", "两项审批");
      demo.sendDemoMessage(parallel.id, "演示并行审批");
      await vi.advanceTimersByTimeAsync(10000);
      const [first, second] = parallel.turns[0].requests;
      expect([first.status, second.status]).toEqual(["waiting", "waiting"]);
      expect(demo.resolveDemoRequest(parallel.id, first.id, "once")).toBe(true);
      expect(parallel.turns[0].status).toBe("waiting");
      expect(second.status).toBe("waiting");
      expect(demo.resolveDemoRequest(parallel.id, second.id, "deny")).toBe(
        true,
      );
      await vi.advanceTimersByTimeAsync(3000);
      expect(parallel.turns[0].status).toBe("complete");
      expect(parallel.turns[0].activities).toHaveLength(1);

      const timeout = demo.createConversation("exp_quality", "审批超时");
      demo.sendDemoMessage(timeout.id, "演示审批超时");
      await vi.advanceTimersByTimeAsync(25000);
      const request = timeout.turns[0].requests[0];
      expect(request.status).toBe("expired");
      expect(request.response).toBeNull();
      expect(timeout.turns[0].activities).toHaveLength(0);
      expect(demo.resolveDemoRequest(timeout.id, request.id, "once")).toBe(
        false,
      );
    } finally {
      vi.useRealTimers();
    }
  });
  it("推理以外的活动与文件工具并存时，工具仍按各自 ID 正常结算", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation(
        "exp_quality",
        "子任务与工具",
      );
      demo.sendDemoMessage(conversation.id, "请用子代理分析资料");
      await vi.advanceTimersByTimeAsync(10000);
      const activities = conversation.turns[0].activities;
      expect(activities.map((item) => item.title)).toEqual([
        "子代理",
        "读取文件",
        "分析任务",
      ]);
      expect(activities.every((item) => item.status === "complete")).toBe(true);
      expect(activities[1].argumentSummary).toBe("良率样例.csv");
    } finally {
      vi.useRealTimers();
    }
  });
  it("按类别的工具触发词各建立一项对应活动", () => {
    expect(
      new Set(TOOL_ACTIVITY_SCENES.map((scene) => scene.trigger)).size,
    ).toBe(TOOL_ACTIVITY_SCENES.length);
    for (const scene of TOOL_ACTIVITY_SCENES) {
      const conversation = demo.createConversation(
        "exp_quality",
        scene.trigger,
      );
      demo.sendDemoMessage(conversation.id, scene.trigger);
      if (scene.skipStart)
        expect(conversation.turns[0].activities).toHaveLength(0);
      else
        expect(conversation.turns[0].activities).toMatchObject([
          { kind: "tool", name: scene.name, status: "running" },
        ]);
      demo.stopDemoStream(conversation.id);
    }
  });
  it("工具专项演示区分失败、阻断、中断和缺失生命周期", async () => {
    vi.useFakeTimers();
    try {
      for (const [trigger, status] of [
        ["演示工具：失败结果", "error"],
        ["演示工具：策略阻断", "rejected"],
        ["演示工具：中断执行", "interrupted"],
        ["演示工具：缺少结束事件", "unknown"],
        ["演示工具：仅收到完成事件", "complete"],
      ]) {
        const conversation = demo.createConversation("exp_quality", trigger);
        demo.sendDemoMessage(conversation.id, trigger);
        await vi.advanceTimersByTimeAsync(10000);
        expect(conversation.turns[0].activities).toHaveLength(1);
        expect(conversation.turns[0].activities[0].status).toBe(status);
        expect(conversation.turns[0].status).toBe("complete");
      }
    } finally {
      vi.useRealTimers();
    }
  });
  it("大量连续工具留在同一活动组，输出风险与普通详情分离", async () => {
    vi.useFakeTimers();
    try {
      const crowded = demo.createConversation("exp_quality", "大量活动");
      demo.sendDemoMessage(crowded.id, "演示大量工具活动");
      expect(crowded.turns[0].activities).toHaveLength(3);
      expect(crowded.turns[0].groups).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(4000);
      expect(crowded.turns[0].activities).toHaveLength(18);
      expect(
        conversationProcessBlocks(crowded.turns[0]).filter(
          (block) => block.type === "group",
        ),
      ).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(6000);
      expect(
        crowded.turns[0].activities.every((item) => item.status === "complete"),
      ).toBe(true);

      const risky = demo.createConversation("exp_quality", "输出风险");
      demo.sendDemoMessage(risky.id, "演示工具：输出风险");
      await vi.advanceTimersByTimeAsync(10000);
      expect(risky.turns[0].activities[0].outputSections).toMatchObject([
        { kind: "text", text: "已读取演示页面，内容需要核对来源。" },
      ]);
      expect(risky.turns[0].risks).toMatchObject([
        { source: "读取网页", level: "high" },
      ]);
      expect(risky.messages[1].error).toBe("");
    } finally {
      vi.useRealTimers();
    }
  });
  it("大量活动组与长详情分别提供可滚动的演示内容", async () => {
    vi.useFakeTimers();
    try {
      const many = demo.createConversation("exp_quality", "活动组滚动");
      demo.sendDemoMessage(many.id, "演示活动组：大量活动");
      expect(many.turns[0].activities).toHaveLength(3);
      await vi.advanceTimersByTimeAsync(4000);
      expect(many.turns[0].activities).toHaveLength(32);
      expect(
        conversationProcessBlocks(many.turns[0]).filter(
          (block) => block.type === "group",
        ),
      ).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(6000);
      expect(
        many.turns[0].activities.every((item) => item.status === "complete"),
      ).toBe(true);

      const long = demo.createConversation("exp_quality", "详情滚动");
      demo.sendDemoMessage(long.id, "演示工具：长详情");
      await vi.advanceTimersByTimeAsync(10000);
      const output = long.turns[0].activities[0].outputSections[0];
      expect(output.kind).toBe("code");
      expect(output.text.split("\n")).toHaveLength(60);
    } finally {
      vi.useRealTimers();
    }
  });
  it("低价值确认型工具不开放空详情，真实结果仍可展开", async () => {
    vi.useFakeTimers();
    try {
      for (const trigger of [
        "演示工具：写入文件",
        "演示工具：操作浏览器",
        "演示工具：操作电脑",
        "演示工具：操作桌面界面",
        "演示工具：生成语音",
        "演示工具：查看技能",
        "演示工具：管理待办",
        "演示工具：平台连接",
        "演示工具：外部 MCP",
        "演示工具：生成结果文件",
      ]) {
        const conversation = demo.createConversation("exp_quality", trigger);
        demo.sendDemoMessage(conversation.id, trigger);
        await vi.advanceTimersByTimeAsync(10000);
        expect(hasToolDetail(conversation.turns[0].activities[0])).toBe(false);
      }
      for (const trigger of [
        "演示工具：读取文件",
        "演示工具：修改文件",
        "演示工具：搜索网页",
        "演示工具：执行命令",
        "演示工具：分析图片",
      ]) {
        const conversation = demo.createConversation("exp_quality", trigger);
        demo.sendDemoMessage(conversation.id, trigger);
        await vi.advanceTimersByTimeAsync(10000);
        expect(hasToolDetail(conversation.turns[0].activities[0])).toBe(true);
      }
    } finally {
      vi.useRealTimers();
    }
  });
  it("专项工具演示保留对象并原位更新进展", async () => {
    vi.useFakeTimers();
    try {
      const file = demo.createConversation("exp_quality", "读取文件过程");
      demo.sendDemoMessage(file.id, "演示工具：读取文件");
      const activity = file.turns[0].activities[0];
      expect(activity.argumentSummary).toBe("分析资料/良率样例.csv");
      expect(activity.inputDetail).toBe("最多读取：500 行");
      await vi.advanceTimersByTimeAsync(2000);
      expect(activity.progressText).toBe("已读取 120/500 行");
      await vi.advanceTimersByTimeAsync(9000);
      expect(file.turns[0].activities).toHaveLength(1);
      expect(activity.status).toBe("complete");
      expect(activity.outputSections[0].text).toContain("500 行");

      const external = demo.createConversation("exp_quality", "未知 MCP");
      demo.sendDemoMessage(external.id, "演示工具：外部 MCP");
      expect(external.turns[0].activities[0]).toMatchObject({
        name: "mcp__files__list",
        argumentSummary: "",
        inputDetail: "",
      });
      await vi.advanceTimersByTimeAsync(3000);
      expect(external.turns[0].activities[0].progressText).toBe("正在读取目录");
      demo.stopDemoStream(external.id);
    } finally {
      vi.useRealTimers();
    }
  });
  it("思考文字逐段更新同一活动，正文开始后不再显示运行态", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "思考演示");
      demo.sendDemoMessage(conversation.id, "请展示思考");
      const turn = conversation.turns[0];
      expect(turn.activities).toMatchObject([
        { kind: "reasoning", status: "running" },
      ]);
      const initial = turn.activities[0].detail;
      await vi.advanceTimersByTimeAsync(1600);
      expect(turn.activities).toHaveLength(1);
      expect(turn.activities[0].detail.length).toBeGreaterThan(initial.length);
      expect(conversation.messages[1].content).toBe("");
      await vi.advanceTimersByTimeAsync(2200);
      expect(turn.activities[0].status).toBe("complete");
      await vi.advanceTimersByTimeAsync(8000);
      expect(turn.status).toBe("complete");
      expect(turn.activities).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
  it("子代理依次经历派发、运行、进展和结束", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "子代理阶段");
      demo.sendDemoMessage(conversation.id, "演示子代理阶段");
      const turn = conversation.turns[0];
      expect(turn.activities[0]).toMatchObject({
        kind: "subagent",
        status: "requested",
        argumentSummary: "核对资料范围",
      });
      await vi.advanceTimersByTimeAsync(1400);
      expect(turn.activities[0].status).toBe("running");
      await vi.advanceTimersByTimeAsync(1400);
      expect(turn.activities[0].progressText).toContain("读取质量记录");
      await vi.advanceTimersByTimeAsync(8000);
      expect(turn.status).toBe("complete");
      expect(turn.activities[0]).toMatchObject({
        status: "complete",
        outputDetail: "已核对演示资料范围。",
      });
    } finally {
      vi.useRealTimers();
    }
  });
  it("并行子代理按身份原位更新，失败一项不改变父回合终态", async () => {
    vi.useFakeTimers();
    try {
      const parallel = demo.createConversation("exp_quality", "并行子代理");
      demo.sendDemoMessage(parallel.id, "演示并行子代理");
      const turn = parallel.turns[0];
      expect(turn.activities.map((item) => item.argumentSummary)).toEqual([
        "核对夜班数据",
        "检查设备异常",
      ]);
      await vi.advanceTimersByTimeAsync(5000);
      expect(turn.activities.map((item) => item.status)).toEqual([
        "running",
        "complete",
      ]);
      await vi.advanceTimersByTimeAsync(6000);
      expect(turn.status).toBe("complete");
      expect(turn.activities.map((item) => item.status)).toEqual([
        "complete",
        "complete",
      ]);
      expect(parallel.messages[1].content).toContain("两个子代理");

      const failed = demo.createConversation("exp_quality", "子代理失败");
      demo.sendDemoMessage(failed.id, "演示子代理失败");
      await vi.advanceTimersByTimeAsync(10000);
      expect(failed.turns[0].status).toBe("complete");
      expect(failed.turns[0].activities[0]).toMatchObject({
        kind: "subagent",
        status: "error",
      });
      expect(failed.messages[1].error).toBe("");
      expect(failed.messages[1].content).toContain("子代理未完成");
    } finally {
      vi.useRealTimers();
    }
  });
  it("并行模型演示只形成一项活动和一条父助手答复", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "并行模型");
      demo.sendDemoMessage(conversation.id, "请使用并行模型");
      await vi.advanceTimersByTimeAsync(10000);
      expect(conversation.turns[0].activities).toMatchObject([
        {
          kind: "moa",
          title: "并行模型",
          status: "complete",
          references: [{ label: "参考模型甲" }, { label: "参考模型乙" }],
        },
      ]);
      expect(conversation.messages).toHaveLength(2);
      expect(conversation.messages[1].content).toContain("我已收到你的任务");
    } finally {
      vi.useRealTimers();
    }
  });
  it("多题澄清只接受完整有效答案，审批通过后失败与授权决定分开记录", async () => {
    vi.useFakeTimers();
    try {
      const multi = demo.createConversation("exp_quality", "多题澄清");
      demo.sendDemoMessage(multi.id, "请多题澄清");
      await vi.advanceTimersByTimeAsync(10000);
      const request = multi.turns[0].requests[0];
      expect(request.questions).toHaveLength(2);
      expect(
        demo.resolveDemoRequest(multi.id, request.id, {
          answers: {
            time: "最近一周",
            line: [],
          },
        }),
      ).toBe(false);
      expect(
        demo.resolveDemoRequest(multi.id, request.id, {
          answers: {
            time: "最近一周",
            line: ["1 号产线"],
          },
        }),
      ).toBe(true);
      await vi.advanceTimersByTimeAsync(2000);
      expect(request.answers).toEqual({ time: "最近一周", line: ["1 号产线"] });
      expect(multi.turns[0].status).toBe("complete");

      const approval = demo.createConversation("exp_quality", "审批失败");
      demo.sendDemoMessage(approval.id, "请审批后演示失败");
      await vi.advanceTimersByTimeAsync(10000);
      const decision = approval.turns[0].requests[0];
      expect(demo.resolveDemoRequest(approval.id, decision.id, "once")).toBe(
        true,
      );
      await vi.advanceTimersByTimeAsync(2000);
      expect(decision.response).toBe("once");
      expect(approval.turns[0].status).toBe("error");
      expect(approval.messages[1].error).toContain("后续操作失败");
    } finally {
      vi.useRealTimers();
    }
  });
  it("用户发送文字和附件时保留实际文件引用", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "附件回合");
      demo.sendDemoMessage(conversation.id, "请分析良率样例", [
        { id: "f_quality_csv" },
        { id: "missing" },
      ]);
      expect(conversation.messages[0]).toMatchObject({
        content: "请分析良率样例",
        attachments: [{ id: "f_quality_csv", name: "良率样例.csv" }],
      });
      await vi.advanceTimersByTimeAsync(10000);
      expect(conversation.turns[0].status).toBe("complete");

      expect(conversation.messages[1].content).toContain("请分析良率样例");
    } finally {
      vi.useRealTimers();
    }
  });
  it("本地上传仅作为任务附件保留，删除任务时清理文件", () => {
    const expert = demo.expertById("exp_quality");
    const workspaceFileCount = expert.files.length;
    const conversation = demo.createConversation("exp_quality", "本地附件回合");
    demo.sendDemoMessage(conversation.id, "请分析现场记录", [
      {
        kind: "local_upload",
        id: "upload_test_attachment",
        name: "现场记录.docx",
        size: 2048,
      },
    ]);
    expect(conversation.messages[0]).toMatchObject({
      content: "请分析现场记录",
      attachments: [
        {
          kind: "local_upload",
          id: "upload_test_attachment",
          name: "现场记录.docx",
          size: 2048,
        },
      ],
    });
    expect(expert.files).toHaveLength(workspaceFileCount);
    demo.deleteConversation(conversation.id);
    expect(deleteFile).toHaveBeenCalledWith("upload_test_attachment");
  });
  it("文字与资料引用一同发送时保留各自来源", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation(
        "exp_quality",
        "资料引用回合",
      );
      demo.sendDemoMessage(
        conversation.id,
        "请结合这些资料分析良率",
        [],
        [
          { kind: "knowledge_library", id: "kb_quality" },
          { kind: "knowledge_document", id: "doc_quality_yield" },
          {
            kind: "workspace_file",
            id: "f_quality_csv",
            path: "/良率样例.csv",
          },
          { kind: "knowledge_library", id: "kb_supplier" },
          { kind: "knowledge_library", id: "kb_quality" },
        ],
      );
      expect(conversation.messages[0]).toMatchObject({
        content: "请结合这些资料分析良率",
        references: [
          {
            kind: "knowledge_library",
            id: "kb_quality",
            name: "质量标准与规范",
          },
          {
            kind: "knowledge_document",
            id: "doc_quality_yield",
            libraryName: "质量标准与规范",
          },
          { kind: "workspace_file", id: "f_quality_csv" },
        ],
      });
      await vi.advanceTimersByTimeAsync(10000);
      expect(conversation.turns[0].status).toBe("complete");

      const knowledgeDisabled = demo.createConversation(
        "exp_ops",
        "未启用知识的专家",
      );
      demo.sendDemoMessage(
        knowledgeDisabled.id,
        "请分析质量资料",
        [],
        [{ kind: "knowledge_library", id: "kb_quality" }],
      );
      expect(knowledgeDisabled.messages[0].references).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
  it("纯附件、纯引用或空白文字均不能启动回合", () => {
    const conversation = demo.createConversation("exp_quality", "未发送资料");
    demo.sendDemoMessage(conversation.id, "", [{ id: "f_quality_csv" }]);
    demo.sendDemoMessage(
      conversation.id,
      "   ",
      [],
      [{ kind: "knowledge_library", id: "kb_quality" }],
    );
    expect(conversation.messages).toHaveLength(0);
    expect(conversation.turns).toHaveLength(0);
  });
  it("层级待办与目标等待仅由结构化快照驱动，取消项不计完成分母", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "结构化状态");
      demo.sendDemoMessage(conversation.id, "层级待办和目标等待");
      const presentation = conversation.sessionPresentation;
      expect(presentation.todos.map((item) => item.parent)).toEqual([
        null,
        "todo_root",
        "todo_sample",
        null,
      ]);
      expect(presentation.control.goal.wait_barrier.type).toBe("until");
      expect(presentation.control.goal.subgoals).toEqual([
        "核对资料",
        "形成建议",
      ]);
      await vi.advanceTimersByTimeAsync(10000);
      expect(conversation.turns[0].status).toBe("complete");
      expect(presentation.control.goal.status).toBe("active");
    } finally {
      vi.useRealTimers();
    }
  });
  it("排队任务演示显示多条独立任务并可清空", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "队列演示");
      demo.sendDemoMessage(conversation.id, "演示排队任务");
      expect(conversation.sessionPresentation.queuedTasks).toHaveLength(3);
      expect(conversation.sessionPresentation.queuedTasks[0].title).toBe(
        "核对异常批次",
      );
      await vi.advanceTimersByTimeAsync(10000);
      demo.sendDemoMessage(conversation.id, "清空排队任务");
      expect(conversation.sessionPresentation.queuedTasks).toEqual([]);
    } finally {
      demo.stopDemoStream(demo.state.conversations[0].id);
      vi.useRealTimers();
    }
  });
  it("本轮待办结果独立于后续会话当前待办状态", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "待办结果");
      demo.sendDemoMessage(conversation.id, "生成待办结果");
      await vi.advanceTimersByTimeAsync(10000);
      const result = conversation.turns[0].results[0];
      expect(result.kind).toBe("todo");
      expect(result.items[0].status).toBe("pending");
      demo.sendDemoMessage(conversation.id, "完成待办");
      expect(conversation.sessionPresentation.todos[0].status).toBe(
        "completed",
      );
      expect(result.items[0].status).toBe("pending");
    } finally {
      demo.stopDemoStream(demo.state.conversations[0].id);
      vi.useRealTimers();
    }
  });
  it("后台子代理晚于父答复更新原活动；任务切换可取消旧演示事件", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "后台委派");
      demo.sendDemoMessage(conversation.id, "后台子代理核对资料");
      for (
        let index = 0;
        index < 100 && conversation.turns[0].status === "running";
        index++
      )
        await vi.advanceTimersByTimeAsync(70);
      expect(conversation.turns[0].status).toBe("complete");
      const parentText = conversation.messages[1].content;
      expect(
        conversation.turns[0].activities.find(
          (item) => item.kind === "subagent",
        ).status,
      ).toBe("unknown");
      await vi.advanceTimersByTimeAsync(2200);
      expect(
        conversation.turns[0].activities.find(
          (item) => item.kind === "subagent",
        ).status,
      ).toBe("complete");
      expect(conversation.messages[1].content).toBe(parentText);

      const cancelled = demo.createConversation("exp_quality", "离开任务");
      demo.sendDemoMessage(cancelled.id, "后台子代理核对资料");
      for (
        let index = 0;
        index < 100 && cancelled.turns[0].status === "running";
        index++
      )
        await vi.advanceTimersByTimeAsync(70);
      demo.stopDemoStream(cancelled.id);
      await vi.advanceTimersByTimeAsync(2200);
      expect(
        cancelled.turns[0].activities.find((item) => item.kind === "subagent")
          .status,
      ).toBe("unknown");
    } finally {
      vi.useRealTimers();
    }
  });
});
