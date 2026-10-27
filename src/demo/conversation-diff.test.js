import { describe, expect, it } from "vitest";
import { parseConversationDiff } from "./conversation-diff";

describe("文件差异呈现", () => {
  it("从统一 diff 计算增删数和新旧行号", () => {
    const diff = [
      "--- a/docs/需求.md",
      "+++ b/docs/需求.md",
      "@@ -177,3 +177,3 @@",
      " 前一行",
      "-旧内容",
      "+新内容",
      " 后一行",
    ].join("\n");
    const parsed = parseConversationDiff(diff);
    expect(parsed).toMatchObject({ truncated: false, hasLineNumbers: true });
    expect(parsed.sections[0]).toMatchObject({
      path: "docs/需求.md",
      added: 1,
      removed: 1,
    });
    expect(parsed.sections[0].rows.map((row) => [row.kind, row.number])).toEqual(
      [
        ["context", 177],
        ["removed", 178],
        ["added", 178],
        ["context", 179],
      ],
    );
  });

  it("兼容 Hermes 渲染后的差异片段，截断时只统计可见行", () => {
    const rendered = [
      "  ┊ review diff",
      "\x1b[36ma/报告.md → b/报告.md\x1b[0m",
      "\x1b[36m@@ -4 +4 @@\x1b[0m",
      "\x1b[31m-旧值\x1b[0m",
      "\x1b[32m+新值\x1b[0m",
      "… omitted 12 diff line(s)",
    ].join("\n");
    const parsed = parseConversationDiff(rendered);
    expect(parsed.truncated).toBe(true);
    expect(parsed.sections[0]).toMatchObject({
      path: "报告.md",
      added: 1,
      removed: 1,
    });
    expect(parsed.sections[0].rows.map((row) => row.number)).toEqual([4, 4]);
  });
});
