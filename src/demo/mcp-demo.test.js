import { describe, expect, it } from "vitest";
import {
  mcpDemoPreset,
  mcpNeedsAttention,
  parseSingleMcpConfig,
  mcpDemoOutcome,
  mcpDemoProbe,
  mcpConnectionLabel,
  mcpCapabilityLabel,
  mcpIsPlatformImported,
  mcpServiceToConfigJson,
} from "./mcp-demo";

describe("MCP 本地演示规则", () => {
  it("一次只解析一台服务，并明确拒绝 OAuth 和无效传输配置", () => {
    const single = parseSingleMcpConfig(
      JSON.stringify({
        mcpServers: { docs: { url: "https://example.com/mcp" } },
      }),
      ["docs", "docs-2"],
    );
    expect(single.name).toBe("docs-3");
    expect(single.type).toBe("http");
    expect(() =>
      parseSingleMcpConfig(
        JSON.stringify({
          mcp_servers: {
            one: { url: "https://one.test" },
            two: { command: "npx" },
          },
        }),
      ),
    ).toThrow("一次只能添加一台");
    expect(() =>
      parseSingleMcpConfig(
        JSON.stringify({
          authService: { url: "https://auth.test", auth: { type: "oauth" } },
        }),
      ),
    ).toThrow("暂不支持 OAuth");
    expect(() =>
      parseSingleMcpConfig(
        JSON.stringify({
          basicService: { url: "https://auth.test", auth: "basic" },
        }),
      ),
    ).toThrow("仅支持无需认证或 Bearer Token");
    expect(() =>
      parseSingleMcpConfig(
        JSON.stringify({
          invalid: { url: "https://one.test", command: "npx" },
        }),
      ),
    ).toThrow("必须且只能");
  });

  it("工具全部关闭不算连接故障，成功但没有能力才需处理", () => {
    const all = mcpDemoPreset("all");
    expect(
      mcpNeedsAttention(
        all.find((item) => item.id === "demo_mcp_all_tools_off"),
      ),
    ).toBe(false);
    expect(
      mcpNeedsAttention({ enabled: true, probe: "ok", tools: [], allowed: [] }),
    ).toBe(true);
    expect(
      mcpNeedsAttention(all.find((item) => item.id === "demo_mcp_resources")),
    ).toBe(false);
    expect(mcpDemoPreset("empty")).toEqual([]);
    expect(
      mcpCapabilityLabel(
        all.find((item) => item.id === "demo_mcp_all_tools_off"),
      ),
    ).toBe("3 项工具");
    expect(mcpConnectionLabel({ enabled: true, probe: "ok", tools: [] })).toBe(
      "未发现能力",
    );
  });

  it("测试结果只生成演示状态与能力，不依赖网络", () => {
    expect(
      mcpDemoOutcome({ type: "http", url: "https://timeout.example/mcp" }),
    ).toBe("timeout");
    expect(mcpDemoOutcome({ type: "stdio", command: "missing-server" })).toBe(
      "missing",
    );
    expect(
      mcpDemoOutcome({ type: "http", auth: "bearer", bearerConfigured: false }),
    ).toBe("auth");
    expect(mcpDemoProbe("auth", "demo").probe).toBe("auth");
    expect(mcpDemoProbe("zero", "demo").tools).toEqual([]);
    expect(mcpDemoProbe("ok", "demo").allowed).toEqual(["demo_search"]);
  });

  it("平台导入服务可预填为单台 JSON，且不回显凭据", () => {
    const service = {
      id: "mcp_import_hub-mcp-search",
      name: "search",
      type: "sse",
      url: "https://example.com/sse",
      auth: "bearer",
      bearerConfigured: true,
      bearer: "private-token",
      tools: [],
    };
    expect(mcpIsPlatformImported(service)).toBe(true);
    const json = mcpServiceToConfigJson(service);
    expect(json).not.toContain("private-token");
    expect(parseSingleMcpConfig(json).type).toBe("sse");
    expect(parseSingleMcpConfig(json).name).toBe("search");
    expect(mcpIsPlatformImported({ id: "mcp_paste_1" })).toBe(false);
  });
});
