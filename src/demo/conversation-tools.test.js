import { describe, expect, it } from "vitest";
import {
  hasToolDetail,
  toolAction,
  toolArgumentSummary,
  toolFailed,
  toolInputText,
  toolOutcome,
  toolOutputText,
  toolOutputSections,
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
    ).toBe("巡检记录.csv:4");
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
    expect(toolProgressText({ current: -1, total: 5 })).toBe("");
    expect(toolProgressText({ current: 6, total: 5 })).toBe("");
    expect(toolOutputText({ verified: true })).toBe("");
    expect(toolOutputText({ exit_code: 0, stdout: "", stderr: "" })).toBe("");
  });
  it("按明确终态和工具结果区分失败、中断、拒绝及未确认", () => {
    expect(
      toolOutcome({
        name: "web_search",
        result: { success: false, error: "无服务" },
      }),
    ).toBe("error");
    expect(
      toolOutcome({
        name: "web_search",
        result: '{"success":false,"error":"无服务"}',
      }),
    ).toBe("error");
    expect(
      toolOutcome({
        name: "read_file",
        result: "Error executing tool 'read_file': not found",
      }),
    ).toBe("error");
    expect(toolOutcome({ name: "terminal", result: { exit_code: 2 } })).toBe(
      "error",
    );
    expect(toolOutcome({ status: "cancelled", result: {} })).toBe(
      "interrupted",
    );
    expect(toolOutcome({ status: "denied", result: {} })).toBe("rejected");
    expect(
      toolOutcome({ name: "write_file", result: { verified: false } }),
    ).toBe("unknown");
    expect(
      toolOutcome({ name: "process_manage", result: { status: "failed" } }),
    ).toBe("complete");
    expect(toolOutputText('{"success":false,"error":"检索失败"}')).toBe(
      "检索失败",
    );
    expect(
      toolOutputText(
        { exit_code: 2, stdout: "部分正常输出", stderr: "实际错误原因" },
        "",
        "error",
      ),
    ).toBe("实际错误原因");
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
  it("专项演示保留安全对象，并为运行详情提供必要入参", () => {
    expect(
      toolInputText("read_file", {
        path: "分析资料/良率样例.csv",
        offset: 4,
        limit: 100,
      }),
    ).toContain("起始行：4");
    expect(
      toolArgumentSummary("vision_analyze", {
        image_url: "https://alice:secret@example.com/sample.png?token=secret",
      }),
    ).toBe("example.com/sample.png");
    expect(
      toolInputText("image_generate", {
        prompt: "设备图 token=secret-value",
        aspect_ratio: "square",
      }),
    ).toContain("token=[已隐藏]");
    expect(
      toolArgumentSummary("mcp__files__list", { path: "/workspace" }),
    ).toBe("");
  });
  it("长输出只展示截断片段并标明边界", () => {
    const output = toolOutputText("a".repeat(4100));
    expect(output).toContain("仅展示前 4000 字");
    expect(output).not.toContain("a".repeat(4100));
  });
  it("命令输出、检索结果与差异分别保留可读结构", () => {
    expect(
      toolOutputSections(
        "terminal",
        { exit_code: 2, stdout: "部分结果", stderr: "执行失败" },
        "",
        "error",
      ),
    ).toEqual([
      { kind: "code", label: "错误输出", text: "执行失败" },
      { kind: "code", label: "标准输出", text: "部分结果" },
      { kind: "text", text: "退出码：2" },
    ]);
    expect(
      toolOutputSections("web_search", {
        success: true,
        data: {
          web: [
            {
              title: "质量规范",
              url: "https://user:secret@example.com/standard?token=hidden",
            },
          ],
        },
      }),
    ).toEqual([
      {
        kind: "list",
        items: [{ title: "质量规范", source: "example.com/standard" }],
      },
    ]);
    expect(toolOutputSections("patch", null, "-旧值\n+新值")).toEqual([
      { kind: "diff", text: "-旧值\n+新值" },
    ]);
    expect(toolOutputSections("write_file", { verified: true })).toEqual([]);
  });
  it("只有新增的安全信息才开放详情，状态或重复对象不足以展开", () => {
    expect(
      hasToolDetail({
        status: "complete",
        argumentSummary: "报告.md",
        inputDetail: "",
        outputSections: [],
      }),
    ).toBe(false);
    expect(
      hasToolDetail({ status: "error", inputDetail: "", outputSections: [] }),
    ).toBe(false);
    expect(
      hasToolDetail({
        status: "complete",
        outputSections: [{ kind: "diff", text: "-旧\n+新" }],
      }),
    ).toBe(true);
  });
  it("简单文件与界面动作不重复目标，原始正文和未知工具返回默认不展示", () => {
    expect(toolInputText("read_file", { path: "分析资料/a.csv" })).toBe("");
    expect(
      toolInputText("write_file", { path: "报告.md", content: "正文" }),
    ).toBe("");
    expect(toolInputText("patch", { path: "报告.md" })).toBe("");
    expect(toolInputText("skill_view", { name: "质量分析" })).toBe("");
    expect(toolInputText("desktop_preview", { action: "查看当前窗口" })).toBe(
      "",
    );
    expect(
      toolArgumentSummary("session_search", {
        session_id: "private-session-id",
      }),
    ).toBe("");
    expect(
      toolArgumentSummary("browser_navigate", {
        url: "https://example.com/report?token=secret",
      }),
    ).toBe("example.com/report");
    expect(
      toolOutputSections("read_file", { text: "未经筛选的完整文件正文" }),
    ).toEqual([]);
    expect(
      toolOutputSections("web_extract", { text: "<html>原始网页</html>" }),
    ).toEqual([]);
    expect(
      toolOutputSections("vision_analyze", { text: "未经筛选的识别结果" }),
    ).toEqual([]);
    expect(
      toolOutputSections("mcp__files__list", { text: "原始插件返回" }),
    ).toEqual([]);
    expect(
      toolOutputSections("read_file", { text: "原始全文" }, "", "error"),
    ).toEqual([]);
    expect(
      toolOutputSections("read_file", { error: "文件不可用" }, "", "error"),
    ).toEqual([{ kind: "text", text: "文件不可用" }]);
    expect(
      toolOutputSections("read_file", { summary: "已读取 50 行" }),
    ).toEqual([{ kind: "text", text: "已读取 50 行" }]);
  });
  it("文件搜索仅显示安全命中，进程结果区分工具调用和后台状态", () => {
    expect(
      toolOutputSections("search_files", {
        matches: ["C:/private/良率.csv", "分析资料/批次汇总.csv"],
      }),
    ).toEqual([
      {
        kind: "list",
        items: [
          { title: "良率.csv", source: "" },
          { title: "分析资料/批次汇总.csv", source: "" },
        ],
      },
    ]);
    expect(
      toolOutputSections("process_manage", { process_status: "running" }),
    ).toEqual([{ kind: "text", text: "后台进程：运行中" }]);
  });
});
