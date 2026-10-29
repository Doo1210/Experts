import { describe, expect, it } from "vitest";
import ExpertChannelTab from "./components/ExpertChannelTab.vue";
import { demoChannelCandidates } from "./channel-target-fixtures";

const { lastTestSendValue, formatRecentProactiveTime, productCopy } =
  ExpertChannelTab.methods;

describe("消息渠道状态文案", () => {
  it("钉钉有候选时直接展示已有会话，入口按类型命名", () => {
    const context = {
      expert: { id: "exp_ops" },
      channel: { id: "dingtalk" },
      targetDraft: {},
    };
    ExpertChannelTab.methods.openTarget.call(context, "group");
    expect(context.targetMode).toBe("candidate");
    expect(context.targetSearch).toBe("");
    expect(ExpertChannelTab.computed.candidateModeLabel.call(context)).toBe(
      "从已有群聊选择",
    );
    expect(
      ExpertChannelTab.computed.candidateSearchPlaceholder.call(context),
    ).toBe("搜索群名称或 openConversationId");
    context.targetKind = "person";
    expect(ExpertChannelTab.computed.candidateModeLabel.call(context)).toBe(
      "从已有单聊选择",
    );
    context.channel.id = "feishu";
    expect(ExpertChannelTab.computed.manualModeLabel.call(context)).toBe(
      "输入 open_id 并核对",
    );
    expect(
      ExpertChannelTab.computed.candidateSearchPlaceholder.call(context),
    ).toBe("搜索姓名或 open_id");
  });

  it("钉钉已有单聊与群聊均提供可搜索的候选", () => {
    const people = demoChannelCandidates("exp_ops", "dingtalk", "person");
    const groups = demoChannelCandidates("exp_ops", "dingtalk", "group");
    expect(people).toHaveLength(5);
    expect(groups).toHaveLength(5);
    expect(new Set(people.map((item) => item.id)).size).toBe(5);
    expect(new Set(groups.map((item) => item.id)).size).toBe(5);
    expect(
      demoChannelCandidates("exp_quality", "dingtalk", "person"),
    ).toHaveLength(5);
    expect(
      demoChannelCandidates("exp_quality", "dingtalk", "group"),
    ).toHaveLength(5);
    expect(
      demoChannelCandidates("exp_quality", "wecom", "person"),
    ).toHaveLength(5);
    expect(
      demoChannelCandidates("exp_algorithm", "feishu", "group"),
    ).toHaveLength(5);
    expect(
      demoChannelCandidates("exp_quality", "dingtalk", "person").some((item) =>
        demoChannelCandidates("exp_safety", "dingtalk", "person").some(
          (other) => other.id === item.id,
        ),
      ),
    ).toBe(false);

    const context = {
      expert: { id: "exp_ops" },
      channel: { id: "dingtalk" },
      targetKind: "person",
      people: [{ id: people[0].id }],
      groups: [],
    };
    const visible = ExpertChannelTab.computed.availableCandidates.call(context);
    expect(visible).toHaveLength(5);
    expect(visible.filter((item) => item.isAdded)).toHaveLength(1);
  });

  it("已有会话可多选并分别保留名称和说明草稿", () => {
    const context = {
      ...ExpertChannelTab.methods,
      selectedCandidates: [],
      editingCandidateId: "",
    };
    context.selectCandidate({ id: "user-1", name: "质量负责人" });
    context.selectedCandidates[0].name = "质量协调人";
    context.selectedCandidates[0].purpose = "质检结果同步";
    context.selectCandidate({ id: "user-2", name: "设备工程师" });
    expect(context.selectedCandidates).toMatchObject([
      {
        id: "user-1",
        name: "质量协调人",
        platformName: "质量负责人",
        purpose: "质检结果同步",
      },
      { id: "user-2", name: "设备工程师", purpose: "" },
    ]);
    context.selectCandidate({ id: "user-1", name: "质量负责人" });
    expect(context.selectedCandidates.map((item) => item.id)).toEqual([
      "user-2",
    ]);
  });

  it("旧名单结果显示为产品状态", () => {
    const context = { formatRecentProactiveTime };
    expect(
      lastTestSendValue.call(context, {
        result: "成功",
        testedAt: "2026/10/10 17:29",
      }),
    ).toBe("2026年10月10日 17:29 成功");
    expect(
      lastTestSendValue.call(context, {
        result: "失败",
        testedAt: "2026/10/10 17:20",
      }),
    ).toBe("2026年10月10日 17:20 失败");
    expect(lastTestSendValue.call(context, { testedAt: "" })).toBe("未测试");
    expect(
      ExpertChannelTab.methods.formatRecentProactiveTime({
        lastProactiveAt: "2026/10/12 11:05",
      }),
    ).toBe("2026年10月12日 11:05");
    expect(ExpertChannelTab.methods.formatRecentProactiveTime({})).toBe(
      "无记录",
    );
  });

  it("旧检查结果不能仅凭已连接显示发送链路已验证", () => {
    const context = {
      channel: { checkStatus: "发送前提已满足" },
      productCopy: (value) => value,
    };
    expect(ExpertChannelTab.computed.channelCheckSummary.call(context)).toBe(
      "发送链路待验证",
    );
    context.channel.sendLinkStatus = "verified";
    expect(ExpertChannelTab.computed.channelCheckSummary.call(context)).toBe(
      "发送前提已满足",
    );
  });

  it("测试发送返回信息区分平台成功字段和失败原因", () => {
    const sendReturn = ExpertChannelTab.methods.demoReturnInfo;
    const feishuSuccess = sendReturn.call(
      { channel: { id: "feishu" }, testKind: "person" },
      "accepted",
      "dly-123",
    );
    expect(feishuSuccess).toMatchObject({
      success: true,
      raw_response: { code: 0, data: { message_id: "msg_123" } },
    });
    const wecomFailure = sendReturn.call(
      { channel: { id: "wecom" }, testKind: "group" },
      "failed",
      "dly-456",
    );
    expect(wecomFailure).toMatchObject({
      success: false,
      error: "No req_id available for group chat (passive reply required)",
    });
    const dingFailure = sendReturn.call(
      { channel: { id: "dingtalk" }, testKind: "group" },
      "failed",
      "dly-789",
    );
    expect(dingFailure).toMatchObject({
      success: false,
      error: "HTTP 403: send failed",
    });
    expect(dingFailure).not.toHaveProperty("raw_response");
  });

  it("测试发送要求文字或工作空间文件至少填写一项", () => {
    const warnings = [];
    const target = { id: "ding_user_001" };
    const context = {
      testTargetItem: target,
      channel: { enabled: true, connected: true, proactive: true, files: true },
      testKind: "person",
      ensureTargets: () => [target],
      testText: "   ",
      testFileId: "",
      $message: { warning: (message) => warnings.push(message) },
    };
    ExpertChannelTab.methods.sendDemoTest.call(context);
    expect(warnings).toEqual(["请输入文字或选择文件"]);

    context.testFileId = "image-1";
    context.testResult = { status: "accepted" };
    context.testFilePickerVisible = true;
    ExpertChannelTab.methods.clearTestFile.call(context);
    expect(context.testFileId).toBe("");
    expect(context.testResult).toBeNull();
    expect(context.testFilePickerVisible).toBe(false);
  });

  it("旧浏览器数据不再泄漏原型提示语", () => {
    expect(productCopy("旧版演示名单")).toBe("管理员添加");
    expect(productCopy("本地连接状态仅供演示；出站权限需平台验证")).toBe(
      "渠道连接与发送权限需分别确认",
    );
    expect(productCopy("文字模拟已受理；附件模拟上传失败")).toBe(
      "文字已受理；附件上传失败",
    );
  });
});
