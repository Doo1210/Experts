import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map();
vi.stubGlobal("localStorage", {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
});
vi.mock("./file-db", () => ({ clearFiles: vi.fn(async () => {}) }));
const demo = await import("./state.js");
const { enrichProjectFixtures } = await import("./project-fixtures.js");

beforeEach(async () => {
  storage.clear();
  await demo.resetDemo();
});

describe("演示状态", () => {
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
      expect(request.response).toBe("最近一周");
      expect(conversation.messages).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
  it("会话状态原位更新，本轮证据只引用存在的演示文件", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "结果回合");
      demo.sendDemoMessage(conversation.id, "列出待办并引用资料");
      const revision = conversation.sessionPresentation.todoRevision;
      await vi.advanceTimersByTimeAsync(10000);
      const fileId = conversation.turns[0].results[0]?.fileId;
      expect(fileId).toBeTruthy();
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
  it("审批通过只启动后续活动，拒绝直接中断回合", async () => {
    vi.useFakeTimers();
    try {
      const approved = demo.createConversation("exp_quality", "审批通过");
      demo.sendDemoMessage(approved.id, "请审批");
      await vi.advanceTimersByTimeAsync(10000);
      const request = approved.turns[0].requests[0];
      expect(demo.resolveDemoRequest(approved.id, request.id, "approved")).toBe(
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
          "rejected",
        ),
      ).toBe(true);
      expect(rejected.turns[0].status).toBe("interrupted");
      expect(rejected.turns[0].activities).toHaveLength(0);
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
      expect(
        demo.resolveDemoRequest(approval.id, decision.id, "approved"),
      ).toBe(true);
      await vi.advanceTimersByTimeAsync(2000);
      expect(decision.response).toBe("approved");
      expect(approval.turns[0].status).toBe("error");
      expect(approval.messages[1].error).toContain("后续演示操作失败");
    } finally {
      vi.useRealTimers();
    }
  });
  it("用户仅发送附件时保留文件引用，消息不重复填写文件名正文", async () => {
    vi.useFakeTimers();
    try {
      const conversation = demo.createConversation("exp_quality", "附件回合");
      demo.sendDemoMessage(conversation.id, "", [
        { id: "f_quality_csv" },
        { id: "missing" },
      ]);
      expect(conversation.messages[0]).toMatchObject({
        content: "",
        attachments: [{ id: "f_quality_csv", name: "良率样例.csv" }],
      });
      await vi.advanceTimersByTimeAsync(10000);
      expect(conversation.turns[0].status).toBe("complete");
      expect(conversation.messages[1].content).toContain("良率样例.csv");
    } finally {
      vi.useRealTimers();
    }
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
