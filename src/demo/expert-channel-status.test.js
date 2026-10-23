import { describe, expect, it } from "vitest";
import ExpertChannelTab from "./components/ExpertChannelTab.vue";

const { targetStatusLabel, productCopy } = ExpertChannelTab.methods;

describe("消息渠道状态文案", () => {
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
