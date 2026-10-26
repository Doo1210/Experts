import { describe, expect, it } from "vitest";
import ExpertChannelTab from "./components/ExpertChannelTab.vue";
import { demoChannelCandidates } from "./channel-target-fixtures";

const { targetStatusLabel, productCopy } = ExpertChannelTab.methods;

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
    expect(visible.filter((item) => item.isApproved)).toHaveLength(1);
  });

  it("旧名单结果显示为产品状态", () => {
    expect(targetStatusLabel({ result: "成功", testedAt: "10-10 17:29" })).toBe(
      "上次测试已受理 · 10-10 17:29",
    );
    expect(targetStatusLabel({ result: "失败", testedAt: "10-10 17:20" })).toBe(
      "上次测试发送失败 · 10-10 17:20",
    );
    expect(targetStatusLabel({ testedAt: "" })).toBe("已批准 · 尚未验证");
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
