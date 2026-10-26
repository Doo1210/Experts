import { describe, expect, it } from "vitest";
import {
  applyConversationEvent,
  createConversationTurn,
  normalizeConversationTurns,
  formatTurnDuration,
  conversationProcessBlocks,
} from "./conversation-turns";

function makeConversation() {
  const user = {
    id: "u1",
    role: "user",
    content: "分析资料",
    createdAt: "2026-10-20T10:00:00.000Z",
  };
  const assistant = {
    id: "a1",
    role: "assistant",
    turnId: "turn1",
    status: "streaming",
    content: "",
    createdAt: user.createdAt,
  };
  return {
    id: "session1",
    status: "running",
    messages: [user, assistant],
    turns: [createConversationTurn(user, assistant)],
  };
}

describe("本地回合事件", () => {
  it("按回合序号去重，并按 ID 分别结算同名并行活动", () => {
    const session = makeConversation();
    const emit = (seq, type, payload = {}) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    expect(emit(1, "message.delta", { text: "第一段" })).toBe(true);
    expect(emit(1, "message.delta", { text: "第一段" })).toBe(false);
    emit(2, "tool.start", { toolId: "tool1", title: "读取文件" });
    emit(3, "tool.start", { toolId: "tool2", title: "读取文件" });
    emit(4, "tool.complete", { toolId: "tool2", error: true });
    expect(session.messages[1].content).toBe("第一段");
    expect(session.turns[0].activities.map((item) => item.status)).toEqual([
      "running",
      "error",
    ]);
    emit(5, "tool.complete", { toolId: "tool1" });
    expect(session.turns[0].activities.map((item) => item.status)).toEqual([
      "complete",
      "error",
    ]);
  });

  it("部分输出遇到失败后保留正文，空终态文字不清空；停止不能标成成功", () => {
    const session = makeConversation();
    const base = { sessionId: session.id, turnId: "turn1" };
    applyConversationEvent(session, {
      ...base,
      seq: 1,
      type: "message.delta",
      text: "部分结论",
    });
    applyConversationEvent(session, {
      ...base,
      seq: 2,
      type: "message.complete",
      status: "error",
      text: "",
      error: "演示数据不可用",
      at: "2026-10-20T10:00:03.000Z",
    });
    expect(session.messages[1]).toMatchObject({
      content: "部分结论",
      status: "error",
      error: "演示数据不可用",
    });
    expect(session.turns[0]).toMatchObject({
      status: "error",
      durationMs: 3000,
    });
    expect(
      applyConversationEvent(session, {
        ...base,
        seq: 3,
        type: "message.delta",
        text: "晚到文字",
      }),
    ).toBe(false);
    expect(session.messages[1].content).toBe("部分结论");

    const stopped = makeConversation();
    applyConversationEvent(stopped, {
      ...base,
      seq: 1,
      type: "message.complete",
      status: "interrupted",
      at: "2026-10-20T10:00:01.000Z",
    });
    expect(stopped.turns[0].status).toBe("interrupted");
    expect(stopped.messages[1].status).toBe("stopped");
  });

  it("刷新恢复时把悬空运行态标为待核对，不虚构中断或耗时", () => {
    const session = makeConversation();
    delete session.turns;
    expect(normalizeConversationTurns(session)).toBe(true);
    expect(session.turns).toHaveLength(1);
    expect(session.turns[0]).toMatchObject({
      status: "unknown",
      durationMs: null,
    });
    expect(session.messages[1].status).toBe("stopped");
    expect(session.status).toBe("ready");
    expect(formatTurnDuration(null)).toBe("");
  });
  it("中途说明从同文流式正文移入过程，最终正文原位收口", () => {
    const session = makeConversation();
    const base = { sessionId: session.id, turnId: "turn1" };
    applyConversationEvent(session, {
      ...base,
      seq: 1,
      type: "thinking.delta",
      text: "正在等待",
    });
    applyConversationEvent(session, {
      ...base,
      seq: 2,
      type: "message.delta",
      text: "初步分析",
    });
    expect(session.turns[0].temporary).toBeNull();
    applyConversationEvent(session, {
      ...base,
      seq: 3,
      type: "message.interim",
      text: "初步分析",
    });
    expect(session.messages[1].content).toBe("");
    expect(session.turns[0].interims).toHaveLength(1);
    applyConversationEvent(session, {
      ...base,
      seq: 4,
      type: "message.delta",
      text: "最终",
    });
    applyConversationEvent(session, {
      ...base,
      seq: 5,
      type: "message.complete",
      text: "最终结论",
      status: "complete",
    });
    expect(session.messages[1].content).toBe("最终结论");
    expect(session.turns[0].interims.map((item) => item.text)).toEqual([
      "初步分析",
    ]);
  });
  it("可见推理与子任务按活动 ID 原位追加详情，乱序完成不串项", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "activity.start", {
      activityId: "a",
      kind: "reasoning",
      title: "思考",
    });
    emit(2, "activity.start", {
      activityId: "b",
      kind: "subagent",
      title: "子代理",
    });
    emit(3, "activity.delta", { activityId: "b", text: "核对文件" });
    emit(4, "activity.delta", { activityId: "a", text: "分析摘要" });
    emit(5, "activity.complete", { activityId: "b" });
    expect(session.turns[0].activities).toMatchObject([
      { id: "a", status: "running", detail: "分析摘要" },
      { id: "b", status: "complete", detail: "核对文件" },
    ]);
  });
  it("reasoning.delta 连续片段只建一项思考，正文开始时结束；预览不补造思考", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    expect(emit(1, "reasoning.available", { text: "可能重复的答复预览" })).toBe(
      false,
    );
    emit(2, "reasoning.delta", { text: "先核对样本量" });
    emit(3, "reasoning.delta", { text: "，再查停机记录" });
    expect(session.turns[0].activities).toMatchObject([
      {
        kind: "reasoning",
        title: "思考",
        detail: "先核对样本量，再查停机记录",
        status: "running",
      },
    ]);
    emit(4, "message.delta", { text: "夜班波动最大" });
    expect(session.turns[0].activities[0].status).toBe("complete");
    emit(5, "message.complete", {
      status: "complete",
      text: "夜班波动最大",
      reasoning: "末段推理",
    });
    expect(session.turns[0].activities).toHaveLength(1);
    expect(session.messages[1].content).toBe("夜班波动最大");
  });
  it("最终文字延续中途段时不重复保留该段；真正不同的中途段仍可查看", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "message.delta", { text: "波动来自夜班" });
    emit(2, "message.interim", { text: "波动来自夜班", alreadyStreamed: true });
    emit(3, "message.complete", {
      status: "complete",
      text: "波动来自夜班，建议校准设备",
    });
    expect(session.messages[1].content).toBe("波动来自夜班，建议校准设备");
    expect(session.turns[0].interims).toHaveLength(0);

    const separate = makeConversation();
    const base = { sessionId: separate.id, turnId: "turn1" };
    applyConversationEvent(separate, {
      ...base,
      seq: 1,
      type: "message.interim",
      text: "正在核对数据口径",
      alreadyStreamed: false,
    });
    applyConversationEvent(separate, {
      ...base,
      seq: 2,
      type: "message.complete",
      status: "complete",
      text: "夜班波动最大",
    });
    expect(separate.turns[0].interims.map((item) => item.text)).toEqual([
      "正在核对数据口径",
    ]);
    expect(separate.messages[1].content).toBe("夜班波动最大");
  });

  it("错误兜底句进入异常提示，不能伪装为正常答复", () => {
    const session = makeConversation();
    const base = { sessionId: session.id, turnId: "turn1" };
    applyConversationEvent(session, {
      ...base,
      seq: 1,
      type: "message.delta",
      text: "已读取部分记录",
    });
    applyConversationEvent(session, {
      ...base,
      seq: 2,
      type: "message.complete",
      status: "error",
      text: "Error: 数据源不可用",
    });
    expect(session.messages[1].content).toBe("已读取部分记录");
    expect(session.messages[1].error).toBe("Error: 数据源不可用");
    expect(session.turns[0].status).toBe("error");
  });
  it("工具进度在同一调用内替换参数摘要，收口后不留正在进行文案", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "tool.start", {
      toolId: "web1",
      name: "web_extract",
      args: {
        urls: ["https://example.com/a?secret=1", "https://example.org/b"],
      },
    });
    const activity = session.turns[0].activities[0];
    expect(activity).toMatchObject({
      title: "读取网页",
      argumentSummary: "example.com/a 等 2 个网页",
    });
    emit(2, "tool.progress", { toolId: "web1", preview: "已读取 2/5 个网页" });
    expect(activity.progressText).toBe("已读取 2/5 个网页");
    emit(3, "tool.progress", {
      toolId: "web1",
      preview: "正在读取第 3 个网页",
    });
    expect(activity.progressText).toBe("正在读取第 3 个网页");
    emit(4, "tool.complete", { toolId: "web1", result: { verified: true } });
    expect(activity.progressText).toBe("");
    expect(activity.outputDetail).toBe("");
    expect(activity.argumentSummary).toBe("example.com/a 等 2 个网页");
    expect(session.turns[0].activities).toHaveLength(1);
  });
  it("命令失败与输出风险归属工具和尾部提示，不自动宣判整个回合失败", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "tool.start", {
      toolId: "cmd1",
      name: "terminal",
      args: {
        command: "run --token private-value",
        cwd: "C:\\private\\reports",
      },
    });
    emit(2, "tool.complete", {
      toolId: "cmd1",
      result: { exit_code: 1, stderr: "运行失败" },
    });
    emit(3, "tool.output_risk", {
      toolId: "cmd1",
      userVisible: true,
      text: "输出包含待核对内容",
    });
    expect(session.turns[0].activities[0]).toMatchObject({
      status: "error",
      inputDetail: "run --token [已隐藏]\n工作目录：reports",
      outputDetail: "",
      outputSections: [
        { kind: "code", label: "错误输出", text: "运行失败" },
        { kind: "text", text: "退出码：1" },
      ],
    });
    expect(session.turns[0].status).toBe("running");
    expect(session.messages[1].error || "").toBe("");
    expect(session.turns[0].risks).toMatchObject([
      { toolId: "cmd1", source: "执行命令", text: "输出包含待核对内容" },
    ]);
  });
  it("助手文字与人工请求分开相邻活动组，组内活动仍按稳定 ID 更新", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "tool.start", { toolId: "A", title: "读取文件" });
    emit(2, "tool.complete", { toolId: "A" });
    emit(3, "message.delta", { text: "我先核对报表" });
    emit(4, "tool.start", { toolId: "B", title: "搜索网页" });
    emit(5, "message.interim", { text: "我先核对报表" });
    emit(6, "tool.start", { toolId: "C", title: "分析资料" });
    expect(session.turns[0].groups.map((group) => group.activityIds)).toEqual([
      ["A"],
      ["B"],
      ["C"],
    ]);
    expect(session.turns[0].groups.map((group) => group.startedSeq)).toEqual([
      1, 4, 6,
    ]);
    expect(session.turns[0].interims[0].seq).toBe(5);
    expect(session.turns[0].activities).toHaveLength(3);
    expect(
      conversationProcessBlocks(session.turns[0]).map((block) =>
        block.type === "group"
          ? block.activities.map((activity) => activity.id)
          : block.text,
      ),
    ).toEqual([["A", "B"], "我先核对报表", ["C"]]);
  });

  it("最终回复流穿过连续工具时只显示一个活动组，人工请求仍是分组边界", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "tool.start", { toolId: "read", title: "读取文件" });
    emit(2, "tool.complete", { toolId: "read" });
    emit(3, "message.delta", { text: "最终回复的前半段" });
    emit(4, "tool.start", { toolId: "analyze", title: "分析任务" });
    emit(5, "tool.complete", { toolId: "analyze" });
    emit(6, "message.complete", {
      status: "complete",
      text: "最终回复的完整内容",
    });
    expect(session.turns[0].groups).toHaveLength(2);
    expect(
      conversationProcessBlocks(session.turns[0]).map((block) =>
        block.activities.map((activity) => activity.id),
      ),
    ).toEqual([["read", "analyze"]]);

    const withRequest = makeConversation();
    const requestEvent = (seq, type, payload) =>
      applyConversationEvent(withRequest, {
        sessionId: withRequest.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    requestEvent(1, "tool.start", { toolId: "before", title: "读取文件" });
    requestEvent(2, "request.open", {
      requestId: "approval1",
      kind: "approval",
      prompt: "是否允许继续？",
      choices: [
        { value: "approved", label: "允许" },
        { value: "rejected", label: "拒绝" },
      ],
    });
    requestEvent(3, "request.resolve", {
      requestId: "approval1",
      response: "approved",
    });
    requestEvent(4, "tool.start", { toolId: "after", title: "分析任务" });
    expect(
      conversationProcessBlocks(withRequest.turns[0]).map((block) =>
        block.type === "group"
          ? block.activities.map((activity) => activity.id)
          : block.type,
      ),
    ).toEqual([["before"], "request", ["after"]]);
  });

  it("大量连续活动仍归入一个按开始顺序排列的活动组", () => {
    const session = makeConversation();
    for (let index = 0; index < 18; index++) {
      const toolId = `tool-${index}`;
      for (const [offset, type] of ["tool.start", "tool.complete"].entries())
        applyConversationEvent(session, {
          sessionId: session.id,
          turnId: "turn1",
          seq: index * 2 + offset + 1,
          type,
          toolId,
          title: `活动 ${index + 1}`,
        });
    }
    const blocks = conversationProcessBlocks(session.turns[0]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("group");
    expect(blocks[0].activities.map((activity) => activity.id)).toEqual(
      Array.from({ length: 18 }, (_, index) => `tool-${index}`),
    );
  });

  it("只有确认信息的工具结果不建空详情，漏收 start 时按 ID 补建一次", () => {
    const session = makeConversation();
    const base = { sessionId: session.id, turnId: "turn1" };
    applyConversationEvent(session, {
      ...base,
      seq: 1,
      type: "tool.complete",
      toolId: "write1",
      name: "write_file",
      args: { path: "报告.md" },
      result: { verified: true },
    });
    applyConversationEvent(session, {
      ...base,
      seq: 2,
      type: "tool.complete",
      toolId: "write1",
      name: "write_file",
      result: { verified: true },
    });
    expect(session.turns[0].activities).toMatchObject([
      {
        id: "write1",
        title: "写入文件",
        argumentSummary: "报告.md",
        outputDetail: "",
      },
    ]);
  });
  it("工具终态分别更新原活动；回合完成不替缺失工具终态判成功", () => {
    const session = makeConversation();
    const emit = (seq, type, payload = {}) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "tool.start", {
      toolId: "failed",
      name: "web_search",
      args: { query: "良率" },
    });
    emit(2, "tool.complete", {
      toolId: "failed",
      name: "web_search",
      result: { success: false, error: "检索服务不可用" },
    });
    emit(3, "tool.start", {
      toolId: "denied",
      name: "terminal",
      args: { command: "echo demo" },
    });
    emit(4, "tool.complete", {
      toolId: "denied",
      name: "terminal",
      status: "denied",
    });
    emit(5, "tool.start", {
      toolId: "pending",
      name: "read_file",
      args: { path: "a.csv" },
    });
    emit(6, "tool.progress", { toolId: "pending", preview: "已读取 2/5 行" });
    emit(7, "message.complete", {
      status: "complete",
      text: "已根据可用资料作答",
    });
    expect(
      session.turns[0].activities.map((activity) => activity.status),
    ).toEqual(["error", "rejected", "unknown"]);
    expect(
      session.turns[0].activities.map((activity) => activity.endedSeq),
    ).toEqual([2, 4, null]);
    expect(session.turns[0].activities[2].progressText).toBe("");
    expect(session.turns[0].status).toBe("complete");
    emit(8, "tool.complete", {
      toolId: "pending",
      name: "read_file",
      result: { summary: "已读取 5 行" },
    });
    expect(session.turns[0].activities[2]).toMatchObject({
      status: "complete",
      endedSeq: 8,
      outputSections: [{ kind: "text", text: "已读取 5 行" }],
    });
    expect(session.turns[0].status).toBe("complete");
    expect(session.messages[1].content).toBe("已根据可用资料作答");
  });
  it("历史只保存脱敏活动字段和事件身份，重开后不补造进度", () => {
    const session = makeConversation();
    const emit = (seq, type, payload = {}) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "tool.start", {
      toolId: "read1",
      name: "read_file",
      args: { path: "C:/private/巡检.csv", token: "raw-secret-value" },
    });
    emit(2, "tool.progress", { toolId: "read1", preview: "已读取 2/5 行" });
    emit(3, "tool.complete", {
      toolId: "read1",
      name: "read_file",
      result: { text: "已读取" },
    });
    emit(4, "message.complete", { status: "complete", text: "分析完毕" });
    const restored = JSON.parse(JSON.stringify(session));
    normalizeConversationTurns(restored);
    expect(normalizeConversationTurns(restored)).toBe(false);
    expect(restored.turns[0].activities[0]).toMatchObject({
      id: "read1",
      name: "read_file",
      startedSeq: 1,
      lastProgressSeq: 2,
      endedSeq: 3,
      status: "complete",
      argumentSummary: "巡检.csv",
    });
    expect(JSON.stringify(restored.turns[0].activities)).not.toContain(
      "raw-secret-value",
    );
    expect(restored.turns[0].activities[0]).not.toHaveProperty("args");
    expect(restored.turns[0].activities[0]).not.toHaveProperty("result");
  });
  it("真实文件差异留在原工具的展开详情，终态标题不复制结果", () => {
    const session = makeConversation();
    const base = { sessionId: session.id, turnId: "turn1" };
    applyConversationEvent(session, {
      ...base,
      seq: 1,
      type: "tool.start",
      toolId: "patch1",
      name: "patch",
      args: { path: "报告.md" },
    });
    applyConversationEvent(session, {
      ...base,
      seq: 2,
      type: "tool.complete",
      toolId: "patch1",
      inlineDiff: "-旧值\n+新值",
    });
    expect(session.turns[0].activities[0]).toMatchObject({
      title: "修改文件",
      argumentSummary: "报告.md",
      outputKind: "diff",
      outputSections: [{ kind: "diff", text: "-旧值\n+新值" }],
      status: "complete",
    });
    expect(session.messages[1].content).toBe("");
  });
  it("有意义的阶段通知保留独立行，重复进度不堆叠", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "status.update", { kind: "compacting", text: "原始内部状态" });
    expect(session.turns[0].temporary).toBe("正在整理较早对话");
    emit(2, "status.update", { kind: "compacting", text: "重复压缩心跳" });
    expect(session.turns[0].stages).toHaveLength(1);
    emit(3, "status.update", { kind: "compacted" });
    expect(session.turns[0].temporary).toBeNull();
    expect(session.turns[0].stages[0]).toMatchObject({
      text: "上下文压缩完成",
      state: "complete",
    });
    emit(4, "status.update", { kind: "process", text: "后台任务已有新输出" });
    emit(5, "status.update", { kind: "goal", text: "任务完成" });
    expect(session.turns[0].activities).toHaveLength(0);
    expect(session.turns[0].status).toBe("running");
    emit(6, "thinking.delta", { text: "…" });
    expect(session.turns[0].temporary).toBeNull();
    emit(7, "status.update", {
      kind: "warn",
      text: "资料可能过期\n堆栈不展示",
    });
    expect(session.messages[1].error).toBe("资料可能过期");
    expect(conversationProcessBlocks(session.turns[0])).toMatchObject([
      { type: "stage", text: "上下文压缩完成" },
    ]);
    emit(8, "status.update", {
      kind: "lifecycle",
      phase: "preparing_context",
    });
    expect(session.turns[0].stages).toHaveLength(1);
    emit(9, "thinking.delta", { text: "正在等待模型响应" });
    expect(session.turns[0].stages).toHaveLength(2);
    emit(10, "message.delta", { text: "已收到响应" });
    expect(session.turns[0].stages[1]).toMatchObject({
      text: "模型等待已结束",
      state: "complete",
    });
  });
  it("两项子代理按身份结算，晚到子任务结果不改写已完成的父答复", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "subagent.spawn_requested", { subagentId: "A", goal: "核对夜班" });
    emit(2, "subagent.spawn_requested", { subagentId: "B", goal: "核对设备" });
    emit(3, "subagent.start", {
      subagentId: "A",
      childSessionId: "local-child",
    });
    emit(4, "subagent.start", { subagentId: "B" });
    emit(5, "subagent.complete", {
      subagentId: "B",
      status: "completed",
      summary: "设备记录已核对",
    });
    expect(session.turns[0].activities.map((item) => item.status)).toEqual([
      "running",
      "complete",
    ]);
    expect(session.turns[0].activities[0].childSessionId).toBe("local-child");
    emit(6, "message.complete", { status: "complete", text: "父助手结论" });
    emit(7, "subagent.complete", {
      subagentId: "A",
      status: "failed",
      summary: "资料不足",
    });
    expect(session.turns[0].activities.map((item) => item.status)).toEqual([
      "error",
      "complete",
    ]);
    expect(session.messages[1].content).toBe("父助手结论");
    expect(session.turns[0].status).toBe("complete");
  });

  it("历史重新打开时不把缺失结束事件的后台子任务持续显示为运行中", () => {
    const session = makeConversation();
    session.turns[0].status = "complete";
    session.messages[1].status = "done";
    session.status = "ready";
    session.turns[0].activities.push({
      id: "subagent_A",
      kind: "subagent",
      title: "子代理",
      status: "running",
      progressText: "正在核对",
    });
    expect(normalizeConversationTurns(session)).toBe(true);
    expect(session.turns[0].activities[0]).toMatchObject({
      status: "unknown",
      progressText: "",
    });
    expect(session.turns[0].status).toBe("complete");
  });

  it("MoA 多条参考意见归入一项并行模型活动，最终答复仍只有一条", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "moa.progress", { refsDone: 2, refsTotal: 3 });
    emit(2, "moa.reference", { index: 1, label: "模型甲", text: "检查样本量" });
    emit(3, "moa.reference", { index: 2, label: "模型乙", text: "排查设备" });
    emit(4, "moa.phase", { phase: "aggregator" });
    expect(session.turns[0].activities).toHaveLength(1);
    expect(session.turns[0].activities[0]).toMatchObject({
      title: "并行模型",
      progressText: "正在汇总",
      references: [{ label: "模型甲" }, { label: "模型乙" }],
    });
    emit(5, "activity.complete", { activityId: "moa_turn1" });
    expect(session.turns[0].activities[0].progressText).toBe("");
    emit(6, "message.complete", { status: "complete", text: "综合建议" });
    expect(session.messages).toHaveLength(2);
    expect(session.messages[1].content).toBe("综合建议");
  });
  it("人工请求失效只处理对应 ID，旧回复不能覆盖新请求", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "request.open", {
      requestId: "old",
      kind: "clarify",
      prompt: "旧问题",
    });
    emit(2, "request.open", {
      requestId: "new",
      kind: "clarify",
      prompt: "新问题",
    });
    expect(emit(3, "request.expire", { requestId: "old" })).toBe(true);
    expect(
      emit(4, "request.resolve", { requestId: "old", response: "晚到回复" }),
    ).toBe(false);
    expect(session.turns[0].requests).toMatchObject([
      { id: "old", status: "expired", response: null },
      { id: "new", status: "waiting", response: null },
    ]);
    expect(session.turns[0].status).toBe("waiting");
    expect(
      emit(5, "request.resolve", { requestId: "new", response: "按班次" }),
    ).toBe(true);
    expect(session.turns[0].requests[1].response).toBe("按班次");
    const expired = makeConversation();
    const base = { sessionId: expired.id, turnId: "turn1" };
    applyConversationEvent(expired, {
      ...base,
      seq: 1,
      type: "request.open",
      requestId: "only",
      prompt: "是否继续",
    });
    applyConversationEvent(expired, {
      ...base,
      seq: 2,
      type: "request.expire",
      requestId: "only",
    });
    expect(expired.turns[0].status).toBe("unknown");
    expect(expired.messages[1].status).toBe("stopped");
  });
  it("多题澄清按 qid 保存选项外回答，凭据请求不保存提交值", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "request.open", {
      requestId: "questions",
      kind: "clarify",
      prompt: "请补充",
      questions: [
        { qid: "time", question: "时间范围？", choices: ["最近一周", "本月"] },
        {
          qid: "line",
          question: "产线？",
          choices: ["1 号", "2 号"],
          multiSelect: true,
        },
      ],
    });
    emit(2, "request.resolve", {
      requestId: "questions",
      response: {
        answers: { time: "最近一周", line: ["1 号", "未知"] },
      },
    });
    expect(session.turns[0].requests[0].answers).toEqual({
      time: "最近一周",
      line: ["1 号", "未知"],
    });
    expect(session.turns[0].requests[0].response).toBe("最近一周；1 号；未知");

    const secret = makeConversation();
    const base = { sessionId: secret.id, turnId: "turn1" };
    applyConversationEvent(secret, {
      ...base,
      seq: 1,
      type: "request.open",
      requestId: "secret1",
      kind: "secret",
      prompt: "请输入服务密钥",
    });
    expect(
      applyConversationEvent(secret, {
        ...base,
        seq: 2,
        type: "request.resolve",
        requestId: "secret1",
        response: "real-secret-value",
      }),
    ).toBe(false);
    applyConversationEvent(secret, {
      ...base,
      seq: 3,
      type: "request.resolve",
      requestId: "secret1",
      response: "submitted",
    });
    const saved = JSON.stringify(secret);
    expect(saved).not.toContain("real-secret-value");
    expect(secret.turns[0].requests[0].response).toBe(
      "已模拟安全提交（未输入真实值）",
    );
  });
  it("待处理快照恢复已接收的部分答案，后续仅补齐未回答题目", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "request.open", {
      requestId: "multi",
      kind: "clarify",
      prompt: "请补充",
      questions: [
        { qid: "time", question: "时间？", choices: ["最近一周", "本月"] },
        {
          qid: "line",
          question: "产线？",
          choices: ["1 号", "2 号"],
          multiSelect: true,
        },
      ],
      answers: { time: "最近一周" },
    });
    expect(session.turns[0].requests[0].answers).toEqual({ time: "最近一周" });
    expect(
      emit(2, "request.answer.accepted", {
        requestId: "multi",
        qid: "missing",
        answer: "坏值",
      }),
    ).toBe(false);
    expect(
      emit(3, "request.answer.accepted", {
        requestId: "multi",
        qid: "line",
        answer: ["1 号"],
      }),
    ).toBe(true);
    expect(session.turns[0].requests[0].answers).toEqual({
      time: "最近一周",
      line: ["1 号"],
    });
    emit(4, "request.resolve", {
      requestId: "multi",
      response: { answers: { line: ["1 号"] } },
    });
    expect(session.turns[0].requests[0].response).toBe("最近一周；1 号");
  });
  it("P8 仅接收有来源的本轮结构化结果，并与后续会话状态快照隔离", () => {
    const session = makeConversation();
    const base = { sessionId: session.id, turnId: "turn1" };
    const items = [{ id: "todo1", content: "核对资料", status: "pending" }];
    applyConversationEvent(session, {
      ...base,
      seq: 1,
      type: "result.add",
      resultId: "empty",
      kind: "todo",
      items: [],
    });
    expect(session.turns[0].results).toHaveLength(0);
    applyConversationEvent(session, {
      ...base,
      seq: 2,
      type: "result.add",
      resultId: "result1",
      kind: "todo",
      items,
    });
    items[0].status = "completed";
    expect(session.turns[0].results).toMatchObject([
      { id: "result1", kind: "todo", items: [{ status: "pending" }] },
    ]);
    applyConversationEvent(session, {
      ...base,
      seq: 3,
      type: "result.add",
      resultId: "result1",
      kind: "todo",
      items,
    });
    expect(session.turns[0].results).toHaveLength(1);
  });
  it("同一文件的本轮新建与修改归并为一张版本卡", () => {
    const session = makeConversation();
    const emit = (seq, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type: "result.add",
        ...payload,
      });
    emit(1, {
      resultId: "created",
      fileId: "file-1",
      name: "报告.md",
      operation: "created",
      snapshotContent: "初版",
      versionId: "v1",
    });
    emit(2, {
      resultId: "modified",
      fileId: "file-1",
      name: "报告.md",
      operation: "modified",
      snapshotContent: "修订版",
      versionId: "v2",
      roundDiff: "-旧值\n+新值",
      changeSummary: "调整结论",
      sourceToolId: "patch-1",
    });
    expect(session.turns[0].results).toMatchObject([
      {
        id: "created",
        fileId: "file-1",
        operation: "created_modified",
        snapshotContent: "修订版",
        versionId: "v2",
        roundDiff: "-旧值\n+新值",
        changeSummary: "调整结论",
        sourceToolId: "patch-1",
      },
    ]);
    emit(3, {
      resultId: "second-file",
      fileId: "file-2",
      name: "数据.csv",
      operation: "modified",
      snapshotContent: "日期,良率",
    });
    expect(session.turns[0].results).toHaveLength(2);
  });
  it("同源警告与终态错误合并到一条尾部提示，部分正文和失败状态各自保留", () => {
    const session = makeConversation();
    const emit = (seq, type, payload) =>
      applyConversationEvent(session, {
        sessionId: session.id,
        turnId: "turn1",
        seq,
        type,
        ...payload,
      });
    emit(1, "message.delta", { text: "已读取部分记录" });
    emit(2, "warning.add", { text: "资料读取失败" });
    emit(3, "message.complete", {
      status: "error",
      text: "",
      error: "资料读取失败",
      errorSurface: { message: "资料读取失败" },
      warning: "请核查工作目录",
    });
    expect(session.messages[1].content).toBe("已读取部分记录");
    expect(session.turns[0].status).toBe("error");
    expect(session.messages[1].error).toBe("资料读取失败；请核查工作目录");
  });

  it("终态丢失先进入恢复核对，确认已停止后显示未知而不冒充失败", () => {
    const session = makeConversation();
    const base = { sessionId: session.id, turnId: "turn1" };
    applyConversationEvent(session, {
      ...base,
      seq: 1,
      type: "message.delta",
      text: "部分分析",
    });
    applyConversationEvent(session, {
      ...base,
      seq: 2,
      type: "error",
      message: "连接中断",
      terminal: true,
    });
    expect(session.turns[0].status).toBe("recovering");
    expect(session.messages[1].error).toBe("连接中断");
    applyConversationEvent(session, {
      ...base,
      seq: 3,
      type: "session.info",
      running: false,
    });
    expect(session.turns[0].status).toBe("unknown");
    expect(session.messages[1].content).toBe("部分分析");
    expect(session.turns[0].durationMs).toBeNull();
    applyConversationEvent(session, {
      ...base,
      seq: 4,
      type: "message.complete",
      status: "error",
      text: "",
    });
    expect(session.turns[0].status).toBe("error");
  });
});
