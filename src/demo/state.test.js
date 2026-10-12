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
    expect(
      group.members[0].segments[1].messages.map((item) => item.role),
    ).toContain("file");
    expect(upgraded.imChats.some((chat) => chat.chatType === "single")).toBe(
      true,
    );
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
});
