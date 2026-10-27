import { describe, expect, it } from "vitest";
import {
  hasToolDetail,
  memoryStatusText,
  toolAction,
  toolArgumentSummary,
  toolFailed,
  toolInputText,
  toolOutcome,
  toolOutputText,
  toolOutputSections,
  toolPendingApproval,
  toolProgressText,
} from "./conversation-tools";

describe("工具活动呈现字段", () => {
  it("映射工具动作并为未知 MCP 使用安全兜底", () => {
    expect(toolAction("read_file")).toBe("读取文件");
    expect(toolAction("skills_list")).toBe("查看可用技能");
    expect(toolAction("memory", { action: "add" })).toBe("更新记忆");
    expect(toolAction("memory", { action: "replace" })).toBe("更新记忆");
    expect(toolAction("memory", { action: "remove" })).toBe("更新记忆");
    expect(toolAction("memory", { operations: [{ action: "add" }] })).toBe("更新记忆");
    expect(
      toolArgumentSummary("memory", {
        action: "add",
        target: "memory",
        content: "不应出现在活动标题里的记忆正文",
      }),
    ).toBe("");
    expect(
      toolArgumentSummary("memory", {
        action: "replace",
        target: "user",
        old_text: "不应展示的旧内容",
      }),
    ).toBe("");
    expect(
      toolOutputSections("memory", {
        success: true,
        done: true,
        target: "memory",
        message: "Entry added.",
      }),
    ).toEqual([]);
    expect(
      toolOutputSections(
        "memory",
        { success: true, done: true, target: "memory" },
        "--- a/MEMORY.md\n+++ b/MEMORY.md\n@@ -1 +1 @@\n-旧约定\n+新约定",
      ),
    ).toEqual([]);
    expect(
      toolOutputSections("memory", {
        success: true,
        staged: true,
        pending_id: "pending-1",
      }),
    ).toEqual([]);
    expect(memoryStatusText("memory", { staged: true })).toBe("待审批");
    expect(memoryStatusText("memory", { success: true, done: true })).toBe("");
    expect(toolAction("todo_list", {})).toBe("查看执行计划");
    expect(toolAction("todo_list", { todos: [] })).toBe("更新执行计划");
    expect(toolAction("desktop_preview")).toBe("操作桌面界面");
    expect(toolAction("feishu_drive_list")).toBe("操作飞书");
    expect(toolAction("mcp__tickets__search")).toBe(
      "调用外部工具 · mcp__tickets__search",
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
    expect(toolOutcome({
      name: "terminal",
      result: { status: "blocked", exit_code: -1, error: "安全策略阻止" },
    })).toBe("rejected");
    expect(toolOutcome({
      name: "terminal",
      result: { status: "cancelled", exit_code: -1, error: "执行被取消" },
    })).toBe("interrupted");
    expect(toolPendingApproval({
      name: "terminal",
      result: { status: "pending_approval", approval_pending: true, exit_code: -1 },
    })).toBe(true);
    expect(toolOutcome({
      name: "terminal",
      result: { status: "pending_approval", approval_pending: true, exit_code: -1 },
    })).toBe("unknown");
    expect(toolOutputSections("terminal", {
      status: "blocked", exit_code: -1, error: "安全策略阻止",
    }, "", "rejected")).toEqual([
      { kind: "text", text: "原因：安全策略阻止" },
    ]);
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
        workdir: "C:\\private\\reports",
      }),
    ).toBe("命令：run --token [已隐藏]");
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
    ).toBe("");
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
      toolArgumentSummary("mcp__tickets__search", { query: "产线停机" }),
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
      { kind: "code", label: "标准输出", text: "部分结果" },
      { kind: "code", label: "错误输出", text: "执行失败" },
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
              description: "用于核对检验标准。",
            },
          ],
        },
      }),
    ).toEqual([
      {
        kind: "web",
        summary: "共搜索 1 个网页",
        items: [{
          title: "质量规范",
          source: "example.com/standard",
          href: "",
          preview: "用于核对检验标准。",
        }],
      },
    ]);
    expect(
      toolOutputSections("web_extract", {
        results: [
          {
            url: "https://example.com/a",
            title: "报告 A",
            content: "已提取的正文片段",
            error: null,
          },
          {
            url: "https://example.com/b",
            title: "",
            content: "",
            error: "网页暂不可读",
          },
        ],
      }),
    ).toEqual([{
      kind: "web",
      summary: "已读取 1/2 个网页",
      items: [
        {
          title: "报告 A",
          source: "example.com/a",
          href: "https://example.com/a",
          preview: "已提取的正文片段",
          error: "",
        },
        {
          title: "example.com/b",
          source: "example.com/b",
          href: "https://example.com/b",
          preview: "",
          error: "网页暂不可读",
        },
      ],
    }]);
    expect(toolOutputSections("patch", null, "-旧值\n+新值")).toEqual([
      { kind: "diff", text: "-旧值\n+新值" },
    ]);
    expect(
      toolOutputSections(
        "patch",
        { diff: "@@ -2 +2 @@\n-旧值\n+新值" },
        "-截断片段",
      ),
    ).toEqual([{ kind: "diff", text: "@@ -2 +2 @@\n-旧值\n+新值" }]);
    expect(toolOutputSections("write_file", { verified: true })).toEqual([]);
    expect(toolOutputSections("skills_list", {
      success: true,
      skills: [{ name: "表格分析", description: "分析表格数据" }],
      count: 1,
    })).toEqual([]);
    expect(toolOutputSections("skill_view", {
      success: true,
      name: "质量分析",
      description: "核对质量数据",
      content: "内部技能指令",
    })).toEqual([]);
  });
  it("命令、代码和后台进程按 Hermes 字段展示入参与返回", () => {
    expect(toolAction("terminal", { background: true })).toBe("启动后台命令");
    expect(toolAction("process_manage", { action: "poll" })).toBe("查询后台进程");
    expect(toolArgumentSummary("process_manage", {
      action: "poll", session_id: "proc_demo_1234",
    })).toBe("");
    expect(toolArgumentSummary("process_manage", {
      action: "wait", session_id: "proc_demo_1234", timeout: 5,
    })).toBe("");
    expect(toolInputText("terminal", {
      command: "echo 核对完成",
      workdir: "/workspace",
      timeout: 30,
      background: true,
      notify: true,
    })).toBe(
      "命令：echo 核对完成",
    );
    expect(toolOutputSections("terminal", {
      output: "部分输出", exit_code: 2, error: "执行失败",
    }, "", "error")).toEqual([
      { kind: "code", label: "执行结果", text: "部分输出" },
      { kind: "text", text: "错误：执行失败" },
      { kind: "text", text: "退出码：2" },
    ]);
    expect(toolOutputSections("terminal", {
      output: "Background process started",
      session_id: "proc_demo_1234", exit_code: 0,
    })).toEqual([
      { kind: "text", text: "后台进程已启动 · proc_demo_1234" },
    ]);
    expect(toolInputText("execute_code", {
      code: "print('核对完成')", reset: true,
    })).toBe("代码：\nprint('核对完成')\n重置运行环境：是");
    expect(toolOutputSections("execute_code", {
      status: "success", output: "核对完成", exit_code: 0,
    })).toEqual([
      { kind: "code", label: "执行结果", text: "核对完成" },
    ]);
    expect(toolOutcome({
      name: "execute_code", result: { status: "interrupted" },
    })).toBe("interrupted");
    expect(toolInputText("process_manage", {
      action: "wait", session_id: "proc_demo_1234", timeout: 5,
    })).toBe("等待上限：5 秒");
    expect(toolInputText("process_manage", {
      action: "poll", session_id: "proc_demo_1234",
    })).toBe("");
    expect(toolOutputSections("process_manage", {
      status: "running", output_preview: "服务正在运行",
    })).toEqual([
      { kind: "text", text: "进程状态：运行中" },
      { kind: "text", text: "近期输出：服务正在运行" },
    ]);
    expect(toolOutputSections("process_manage", {
      status: "timeout", process_running: true, output: "",
    })).toEqual([
      { kind: "text", text: "本次等待结束，后台进程仍在运行" },
    ]);
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
    expect(toolInputText("mcp__tickets__search", {
      query: "产线停机",
      api_key: "private-value",
    })).toContain('"api_key": "[已隐藏]"');
    const mcpOutput = toolOutputSections("mcp__tickets__search", {
      result: {
        results: [{ id: "INC-1024", title: "2 号产线短暂停机" }],
        total: 1,
      },
    });
    expect(mcpOutput[0]).toMatchObject({ kind: "code", label: "返回结果" });
    expect(mcpOutput[0].text).toContain("INC-1024");
    expect(
      toolOutputSections("read_file", { text: "原始全文" }, "", "error"),
    ).toEqual([]);
    expect(
      toolOutputSections("read_file", { error: "文件不可用" }, "", "error"),
    ).toEqual([{ kind: "text", text: "文件不可用" }]);
    expect(
      toolOutputSections("read_file", { summary: "已读取 50 行" }),
    ).toEqual([]);
  });
  it("文件读取详情依据实际内容形成范围和单行预览", () => {
    expect(toolOutputSections("read_file", {
      content: "1|日期,良率\n2|2026-10-08,97.2%",
      total_lines: 3,
      truncated: true,
    })).toEqual([{
      kind: "read",
      range: "第 1–2 行，共 3 行",
      preview: "日期,良率",
      partial: true,
      extractedDocument: false,
    }]);
    expect(toolOutputSections("read_file", {
      content: "21|运营简报内容",
      total_lines: 21,
      truncated: false,
      extracted_document: true,
    })).toEqual([{
      kind: "read",
      range: "第 21 行，共 21 行",
      preview: "运营简报内容",
      partial: false,
      extractedDocument: true,
    }]);
    expect(toolOutputSections("read_file", {
      status: "unchanged", dedup: true, content_returned: false,
    })).toEqual([{ kind: "text", text: "文件未变化，本次未重复返回内容。" }]);
    expect(toolOutputSections("read_file", {
      content: "", total_lines: 0,
    })).toEqual([{ kind: "text", text: "文件为空。" }]);
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
    ).toEqual([{ kind: "text", text: "进程状态：运行中" }]);
  });
  it("按搜索目标分开呈现内容命中和文件路径，范围不重复拼进活动标题", () => {
    expect(toolAction("search_files", { target: "content" })).toBe("搜索文件内容");
    expect(toolAction("search_files", { target: "files" })).toBe("搜索文件");
    expect(
      toolArgumentSummary("search_files", {
        pattern: "良率",
        target: "content",
        path: "分析资料",
      }),
    ).toBe("良率");
    expect(
      toolInputText("search_files", { pattern: "良率", path: "分析资料" }),
    ).toBe("搜索范围：分析资料");
    expect(
      toolOutputSections("search_files", {
        matches: [{ path: "分析资料/良率样例.csv", line: 2, content: "良率 97.2%" }],
      }),
    ).toEqual([{ kind: "list", items: [
      { title: "分析资料/良率样例.csv:2", source: "良率 97.2%" },
    ] }]);
    expect(
      toolOutputSections("search_files", {
        files: ["分析资料/良率样例.csv"],
      }),
    ).toEqual([{ kind: "list", items: [
      { title: "分析资料/良率样例.csv", source: "" },
    ] }]);
    expect(
      toolOutputSections("search_files", {
        matches_text: "分析资料/良率样例.csv\n  2: 良率 97.2%",
      }),
    ).toEqual([{ kind: "list", items: [
      { title: "分析资料/良率样例.csv:2", source: "良率 97.2%" },
    ] }]);
  });
  it("历史会话结果使用会话标题、时间和命中摘要", () => {
    expect(toolAction("session_search", { query: "良率" })).toBe("搜索历史对话");
    expect(toolAction("session_search", {})).toBe("浏览近期对话");
    expect(toolAction("session_search", { session_id: "s1" })).toBe("读取历史对话");
    expect(toolAction("session_search", {
      session_id: "s1", around_message_id: 5,
    })).toBe("查看历史对话片段");
    expect(toolOutputSections("session_search", {
      mode: "discover",
      results: [{
        session_id: "conv_quality_1",
        title: "分析本周良率波动",
        when: "2026-10-10T09:15:00+08:00",
        snippet: "帮我分析本周良率变化",
      }],
    })).toEqual([{ kind: "list", items: [{
      title: "分析本周良率波动",
      source: "2026-10-10 09:15:00 · 帮我分析本周良率变化",
      sessionId: "conv_quality_1",
    }] }]);
  });
});
