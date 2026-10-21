import { describe, expect, it } from "vitest";
import {
  toolAction,
  toolArgumentSummary,
  toolFailed,
  toolInputText,
  toolOutputText,
  toolProgressText,
} from "./conversation-tools";

describe("工具活动呈现字段", () => {
  it("映射工具动作并为未知 MCP 使用安全兜底", () => {
    expect(toolAction("read_file")).toBe("读取文件");
    expect(toolAction("desktop_preview")).toBe("操作桌面界面");
    expect(toolAction("feishu_drive_list")).toBe("操作飞书");
    expect(toolAction("mcp__files__list")).toBe(
      "调用外部工具 mcp__files__list",
    );
    expect(
      toolArgumentSummary("read_file", {
        path: "C:\\Users\\private\\巡检记录.csv",
        offset: 4,
      }),
    ).toBe("巡检记录.csv:5");
  });
  it("网址不暴露账号、查询与片段，敏感命令片段被隐藏", () => {
    expect(
      toolArgumentSummary("web_extract", {
        urls: [
          "https://alice:secret@example.com/report?token=secret#part",
          "https://example.org",
        ],
      }),
    ).toBe("example.com/report 等 2 个网页");
    expect(
      toolArgumentSummary("terminal", { command: "run token=secret-value" }),
    ).toBe("run token=[已隐藏]");
  });
  it("进度只采用实际可读字段，确认结果与空输出不生成详情", () => {
    expect(toolProgressText({ preview: "已读取 2/5 个网页" })).toBe(
      "已读取 2/5 个网页",
    );
    expect(toolProgressText({ current: 300, total: 1000, unit: "条" })).toBe(
      "已处理 300/1000 条",
    );
    expect(toolProgressText({ current: 3 })).toBe("");
    expect(toolOutputText({ verified: true })).toBe("");
    expect(toolOutputText({ exit_code: 0, stdout: "", stderr: "" })).toBe("");
  });
  it("命令入参脱敏，搜索结果形成可读详情；非零退出码只结算工具项", () => {
    expect(
      toolInputText("terminal", {
        command: "run --token private-value",
        cwd: "C:\\private\\reports",
      }),
    ).toBe("run --token [已隐藏]\n工作目录：reports");
    expect(
      toolOutputText({
        results: [
          {
            title: "巡检报告",
            url: "https://user:pass@example.com/report?token=secret",
          },
        ],
      }),
    ).toBe("巡检报告 · example.com/report");
    expect(
      toolFailed({ name: "terminal", result: { exit_code: 1, stdout: "" } }),
    ).toBe(true);
    expect(toolFailed({ name: "write_file", result: { verified: true } })).toBe(
      false,
    );
  });
  it("长输出只展示截断片段并标明边界", () => {
    const output = toolOutputText("a".repeat(4100));
    expect(output).toContain("仅展示前 4000 字");
    expect(output).not.toContain("a".repeat(4100));
  });
});
