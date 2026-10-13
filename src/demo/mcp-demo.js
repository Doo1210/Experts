const demoTool = (name, description, write = false) => ({
  name,
  description,
  write,
});

const fixtureServices = [
  {
    id: "demo_mcp_quality_db",
    name: "质量数据库",
    type: "stdio",
    command: "npx",
    args: "-y @company/quality-mcp",
    envKeys: ["QUALITY_API_KEY"],
    auth: "none",
    enabled: true,
    probe: "ok",
    tools: [
      demoTool("quality_search", "查询质量数据"),
      demoTool("quality_get", "读取质量记录"),
      demoTool("quality_update", "更新质量记录", true),
    ],
    allowed: ["quality_search", "quality_get"],
    checkedAt: "10:32",
  },
  {
    id: "demo_mcp_docs",
    name: "团队文档",
    type: "http",
    url: "https://docs.example.com/mcp",
    auth: "none",
    enabled: true,
    probe: "ok",
    tools: [
      demoTool("search_documents", "搜索文档"),
      demoTool("read_document", "读取文档"),
    ],
    allowed: ["search_documents", "read_document"],
    promptCount: 3,
    resourceCount: 18,
    promptsEnabled: true,
    resourcesEnabled: true,
    checkedAt: "10:29",
  },
  {
    id: "demo_mcp_alerts",
    name: "告警订阅",
    type: "sse",
    url: "https://alerts.example.com/sse",
    auth: "bearer",
    enabled: true,
    probe: "ok",
    bearerConfigured: true,
    tools: [demoTool("list_alerts", "读取当前告警")],
    allowed: ["list_alerts"],
    checkedAt: "10:44",
  },
  {
    id: "demo_mcp_missing_bearer",
    name: "项目管理",
    type: "http",
    url: "https://projects.example.com/mcp",
    auth: "bearer",
    enabled: true,
    probe: "auth",
    bearerConfigured: false,
    demoOutcome: "auth",
    tools: [],
    allowed: [],
    error: "尚未配置 Bearer Token",
  },
  {
    id: "demo_mcp_expired_bearer",
    name: "账单系统",
    type: "http",
    url: "https://billing.example.com/mcp",
    auth: "bearer",
    enabled: true,
    probe: "auth",
    bearerConfigured: true,
    demoOutcome: "auth",
    tools: [],
    allowed: [],
    checkedAt: "09:51",
    error: "401 Unauthorized：Bearer Token 已失效",
  },
  {
    id: "demo_mcp_timeout",
    demoOutcome: "timeout",
    name: "旧版通知中心",
    type: "sse",
    url: "https://notify.example.com/sse",
    auth: "none",
    enabled: true,
    probe: "error",
    tools: [],
    allowed: [],
    checkedAt: "10:14",
    error: "连接超时：未收到 MCP initialize 响应",
  },
  {
    id: "demo_mcp_missing_command",
    demoOutcome: "missing",
    name: "本地 Git",
    type: "stdio",
    command: "uvx",
    args: "mcp-server-git --repository /workspace",
    auth: "none",
    enabled: true,
    probe: "error",
    tools: [],
    allowed: [],
    checkedAt: "10:18",
    error: "启动失败：找不到 uvx 可执行程序",
  },
  {
    id: "demo_mcp_disabled",
    name: "历史数据归档",
    type: "stdio",
    command: "node",
    args: "/opt/archive/server.js",
    auth: "none",
    enabled: false,
    probe: "untested",
    tools: [],
    allowed: [],
  },
  {
    id: "demo_mcp_resources",
    name: "知识资源库",
    type: "http",
    url: "https://knowledge.example.com/mcp",
    auth: "none",
    enabled: true,
    probe: "ok",
    tools: [],
    allowed: [],
    resourceCount: 12,
    resourcesEnabled: true,
    checkedAt: "10:21",
  },
  {
    id: "demo_mcp_all_tools_off",
    name: "高风险操作中心",
    type: "http",
    url: "https://ops.example.com/mcp",
    auth: "bearer",
    bearerConfigured: true,
    enabled: true,
    probe: "ok",
    tools: [
      demoTool("delete_workspace", "删除工作区", true),
      demoTool("rotate_key", "轮换密钥", true),
      demoTool("list_workspaces", "列出工作区"),
    ],
    allowed: [],
    checkedAt: "10:06",
  },
  {
    id: "demo_mcp_history",
    name: "供应商接口",
    type: "http",
    url: "https://vendor.example.com/mcp",
    auth: "bearer",
    bearerConfigured: true,
    enabled: true,
    probe: "ok",
    tools: [demoTool("lookup_order", "查询订单")],
    allowed: ["lookup_order"],
    checkedAt: "昨天 09:12",
    stale: true,
  },
  {
    id: "demo_mcp_untested",
    name: "新接入服务",
    type: "http",
    url: "https://new.example.com/mcp",
    auth: "none",
    enabled: true,
    probe: "untested",
    tools: [],
    allowed: [],
  },
];

const presetIds = {
  healthy: [
    "demo_mcp_quality_db",
    "demo_mcp_docs",
    "demo_mcp_alerts",
    "demo_mcp_resources",
    "demo_mcp_history",
  ],
  issues: [
    "demo_mcp_missing_bearer",
    "demo_mcp_expired_bearer",
    "demo_mcp_timeout",
    "demo_mcp_missing_command",
    "demo_mcp_disabled",
    "demo_mcp_all_tools_off",
    "demo_mcp_untested",
  ],
};

export function mcpDemoPreset(preset) {
  const selected =
    preset === "empty"
      ? []
      : preset === "all"
        ? fixtureServices
        : fixtureServices.filter((item) =>
            presetIds[preset]?.includes(item.id),
          );
  return JSON.parse(JSON.stringify(selected));
}

export function normalizeMcpService(item) {
  const count = Number(item.toolCount ?? (item.status === "connected" ? 4 : 0));
  const tools = Array.isArray(item.tools)
    ? item.tools
    : Array.from({ length: count }, (_, index) =>
        demoTool(
          `${item.name}_${["search", "get", "list", "export"][index % 4]}`,
          "发现的工具",
        ),
      );
  return {
    ...item,
    type:
      item.type === "sse" || item.transport === "sse"
        ? "sse"
        : item.type === "stdio"
          ? "stdio"
          : "http",
    probe:
      item.probe ||
      (item.status === "connected"
        ? "ok"
        : item.status === "pending"
          ? "auth"
          : "untested"),
    tools,
    allowed: Array.isArray(item.allowed)
      ? item.allowed
      : tools.map((tool) => tool.name),
    promptCount: Number(item.promptCount || 0),
    resourceCount: Number(item.resourceCount || 0),
    auth: item.auth || "none",
  };
}

export function mcpNeedsAttention(item) {
  const service = normalizeMcpService(item);
  return Boolean(
    service.enabled &&
    (service.probe === "auth" ||
      service.probe === "error" ||
      service.probe === "untested" ||
      (service.probe === "ok" &&
        !service.tools.length &&
        !service.promptCount &&
        !service.resourceCount)),
  );
}

export function mcpConnectionLabel(item) {
  const service = normalizeMcpService(item);
  if (!service.enabled) return "已停用";
  if (
    service.probe === "ok" &&
    !service.tools.length &&
    !service.promptCount &&
    !service.resourceCount
  )
    return "未发现能力";
  return (
    { ok: "连接正常", auth: "需要凭据", error: "连接异常", untested: "未测试" }[
      service.probe
    ] || "未测试"
  );
}

export function mcpCapabilityLabel(item) {
  const service = normalizeMcpService(item);
  return `${service.tools.length} 项工具`;
}

export function mcpIsPlatformImported(item) {
  return (
    item?.origin === "platform" ||
    String(item?.id || "").startsWith("mcp_import_")
  );
}

export function mcpServiceToConfigJson(item) {
  const service = normalizeMcpService(item);
  const config =
    service.type === "stdio"
      ? {
          command: service.command || "",
          args: String(service.args || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean),
          ...(service.envKeys?.length
            ? {
                env: Object.fromEntries(
                  service.envKeys.map((key) => [key, `\${${key}}`]),
                ),
              }
            : {}),
        }
      : {
          url: service.url || "",
          ...(service.type === "sse" ? { transport: "sse" } : {}),
          ...(service.auth === "bearer" ? { auth: "bearer" } : {}),
        };
  return JSON.stringify({ mcpServers: { [service.name]: config } }, null, 2);
}

export function mcpUsesOAuth(config) {
  if ("oauth" in config || "oauth2" in config) return true;
  return ["auth", "authentication", "authorization", "authType", "type"].some(
    (key) => {
      const value = config[key];
      if (typeof value === "string") return /oauth/i.test(value);
      return (
        value &&
        typeof value === "object" &&
        typeof value.type === "string" &&
        /oauth/i.test(value.type)
      );
    },
  );
}

export function parseSingleMcpConfig(text, existingNames = []) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON 格式错误，请检查配置内容");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("顶层须为 JSON 对象");
  const block = parsed.mcpServers ?? parsed.mcp_servers ?? parsed;
  if (!block || typeof block !== "object" || Array.isArray(block))
    throw new Error("未找到 MCP 服务配置");
  const entries = Object.entries(block);
  if (entries.length !== 1)
    throw new Error(
      entries.length
        ? "一次只能添加一台外部 MCP 服务，请只保留一个条目"
        : "没有识别到 MCP 服务",
    );
  const [originalName, config] = entries[0];
  if (!config || typeof config !== "object" || Array.isArray(config))
    throw new Error("服务配置须为 JSON 对象");
  if (mcpUsesOAuth(config))
    throw new Error("当前版本暂不支持 OAuth，请改用无需认证或 Bearer Token");
  const hasUrl = typeof config.url === "string" && Boolean(config.url.trim());
  const hasCommand =
    typeof config.command === "string" && Boolean(config.command.trim());
  if (hasUrl === hasCommand)
    throw new Error("配置必须且只能包含非空的 url 或 command");
  const baseName = originalName.trim();
  if (!baseName) throw new Error("服务名称不能为空");
  let name = baseName;
  for (let index = 2; existingNames.includes(name); index++)
    name = `${baseName}-${index}`;
  const type = hasCommand
    ? "stdio"
    : config.transport === "sse" || config.type === "sse"
      ? "sse"
      : "http";
  const headers =
    config.headers &&
    typeof config.headers === "object" &&
    !Array.isArray(config.headers)
      ? config.headers
      : {};
  const authorization = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === "authorization",
  )?.[1];
  if (
    authorization &&
    (typeof authorization !== "string" || !/^Bearer\s+\S+/i.test(authorization))
  )
    throw new Error("当前仅支持无需认证或 Bearer Token");
  const authConfig = config.auth ?? config.authentication;
  const authMode =
    typeof authConfig === "string"
      ? authConfig.toLowerCase()
      : authConfig &&
          typeof authConfig === "object" &&
          typeof authConfig.type === "string"
        ? authConfig.type.toLowerCase()
        : "none";
  if (!["none", "bearer"].includes(authMode))
    throw new Error("当前仅支持无需认证或 Bearer Token");
  const hasBearer = Boolean(authorization) || authMode === "bearer";
  if (hasCommand && hasBearer) throw new Error("stdio 不支持 HTTP 认证方式");
  const bearerConfigured =
    Boolean(authorization) ||
    Boolean(
      authConfig &&
      typeof authConfig === "object" &&
      typeof authConfig.token === "string" &&
      authConfig.token.trim(),
    );
  return {
    originalName: baseName,
    name,
    duplicate: name !== baseName,
    type,
    url: hasUrl ? config.url.trim() : "",
    command: hasCommand ? config.command.trim() : "",
    args: Array.isArray(config.args) ? config.args.join(" ") : "",
    envKeys:
      config.env && typeof config.env === "object" && !Array.isArray(config.env)
        ? Object.keys(config.env)
        : [],
    auth: hasBearer ? "bearer" : "none",
    bearerConfigured,
    variableReminder: JSON.stringify(config).includes("${"),
  };
}

export function mcpDemoProbe(outcome, name) {
  const probe =
    outcome === "ok" || outcome === "zero"
      ? "ok"
      : outcome === "auth"
        ? "auth"
        : "error";
  const message =
    outcome === "auth"
      ? "认证失败：请检查 Bearer Token"
      : outcome === "timeout"
        ? "连接或握手超时"
        : outcome === "missing"
          ? "启动失败：找不到启动程序"
          : outcome === "zero"
            ? "连接成功，但未发现工具、提示模板或资源"
            : "连接和能力发现成功";
  const tools =
    probe === "ok" && outcome !== "zero"
      ? [
          demoTool(`${name}_search`, "查询数据"),
          demoTool(`${name}_update`, "更新数据", true),
        ]
      : [];
  return {
    probe,
    message,
    tools,
    allowed: tools.filter((tool) => !tool.write).map((tool) => tool.name),
    checkedAt: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function mcpDemoOutcome(config) {
  if (config.demoOutcome) return config.demoOutcome;
  if (config.auth === "bearer" && !config.bearerConfigured) return "auth";
  if (
    config.type === "stdio" &&
    /missing|not-found/i.test(config.command || "")
  )
    return "missing";
  if (/timeout|unreachable/i.test(config.url || "")) return "timeout";
  if (/empty|zero/i.test(config.url || "")) return "zero";
  return "ok";
}
