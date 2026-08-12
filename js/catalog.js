/** 平台已安装技能目录（Mock）— 对齐 Hermes：磁盘 skills/<category>/<name>，描述来自 frontmatter */
window.SKILLS_CATALOG = [
  { id: 'plan', name: 'plan', category: 'software-development', description: 'Create structured implementation plans before coding', provenance: 'bundled' },
  { id: 'github-code-review', name: 'github-code-review', category: 'github', description: 'Review PRs with checklist and risk notes', provenance: 'bundled' },
  { id: 'apple-notes', name: 'apple-notes', category: 'apple', description: 'Manage Notes.app entries via automation', provenance: 'bundled' },
  { id: 'skill-yield', name: 'yield-analysis', category: 'manufacturing', description: '产线良率统计、缺陷 pareto 与根因推断', provenance: 'bundled' },
  { id: 'skill-spc', name: 'spc-stats', category: 'quality', description: '控制图绘制、过程能力 Cpk 评估', provenance: 'bundled' },
  { id: 'skill-pm', name: 'predictive-maintenance', category: 'equipment', description: '设备振动/温度趋势分析与维护建议', provenance: 'bundled' },
  { id: 'skill-vision', name: 'industrial-vision', category: 'ml', description: '质检图像识别与缺陷分类', provenance: 'bundled' },
  { id: 'skill-supply', name: 'supply-planning', category: 'supply-chain', description: '需求预测、安全库存与物料计划', provenance: 'bundled' },
  { id: 'skill-ehs', name: 'ehs-compliance', category: 'compliance', description: '风险辨识、应急预案与合规检查', provenance: 'bundled' },
  { id: 'skill-integration', name: 'system-integration', category: 'digital', description: 'MES/WMS/QMS 对接与数据治理', provenance: 'bundled' },
  { id: 'skill-energy', name: 'energy-audit', category: 'energy', description: '能耗基线、节能改造方案', provenance: 'bundled' }
];

/**
 * Hermes 可配置 toolset（工具 Tab，对齐 CONFIGURABLE_TOOLSETS）
 * - label：主标题；id/name：次要 ID（UI 禁止与 label 同文案重复堆叠）
 * - configured：缺密钥时为 false（MVP 红点）；核心基线 _HERMES_CORE_TOOLS 不在此列表二次暴露
 * 外部 MCP 服务见 MCP Tab，不在此目录
 */
window.TOOLS_CATALOG = [
  {
    id: 'terminal', label: 'Terminal', name: 'terminal', type: 'toolset',
    description: 'Terminal/command execution and process management',
    toolCount: 5, configured: true,
    tools: ['terminal', 'process', 'write_file', 'read_file', 'search_files']
  },
  {
    id: 'file', label: 'File', name: 'file', type: 'toolset',
    description: 'Read and write files in the workspace',
    toolCount: 4, configured: true,
    tools: ['read_file', 'write_file', 'edit_file', 'list_dir']
  },
  {
    id: 'browser', label: 'Browser', name: 'browser', type: 'toolset',
    description: 'Browser automation for interactive web tasks',
    toolCount: 12, configured: true,
    tools: ['browser_navigate', 'browser_click', 'browser_type', 'browser_screenshot']
  },
  {
    id: 'web', label: 'Web', name: 'web', type: 'toolset',
    description: 'Web research and public document retrieval',
    toolCount: 2, configured: false,
    tools: ['web_search', 'web_extract']
  },
  {
    id: 'vision', label: 'Vision', name: 'vision', type: 'toolset',
    description: 'Image understanding and visual analysis',
    toolCount: 2, configured: false,
    tools: ['vision_analyze', 'vision_describe']
  },
  {
    id: 'code_execution', label: 'Code Execution', name: 'code_execution', type: 'toolset',
    description: 'Execute code in a sandbox',
    toolCount: 2, configured: true,
    tools: ['execute_code', 'execute_repl']
  }
];

/** 复制 default 时随 --clone 保留的示例 MCP（产品层不 strip） */
window.DEFAULT_MCP_SERVERS = [
  {
    name: 'filesystem',
    type: 'http',
    transport: 'streamable_http',
    url: 'https://fs.internal/mcp',
    env: {},
    enabled: true,
    status: 'ok',
    missingEnv: []
  },
  {
    name: 'github-api',
    type: 'http',
    transport: 'streamable_http',
    url: 'https://api.githubcopilot.com/mcp/',
    env: { GITHUB_TOKEN: '' },
    enabled: true,
    status: 'missing_secret',
    missingEnv: ['GITHUB_TOKEN']
  }
];

/**
 * 平台 MCP 库（Mock）—「从平台导入」弹窗
 * scope: imported=我导入的 | created=我创建的
 * type 固定 http；transport: streamable_http | sse
 * 列表展示：icon + nameZh(englishId)；导入时以 englishId 作为服务器 name
 */
window.MCP_HUB_CATALOG = [
  // —— 我导入的 ——
  { id: 'hub-mcp-github', englishId: 'github-api', nameZh: 'GitHub API', icon: '🐙', scope: 'imported', type: 'http', transport: 'streamable_http', url: 'https://api.githubcopilot.com/mcp/', env: { GITHUB_TOKEN: '' }, missingEnv: ['GITHUB_TOKEN'] },
  { id: 'hub-mcp-filesystem', englishId: 'filesystem', nameZh: '文件系统', icon: '📁', scope: 'imported', type: 'http', transport: 'streamable_http', url: 'https://fs.internal/mcp', env: {} },
  { id: 'hub-mcp-postgres', englishId: 'postgres', nameZh: 'PostgreSQL', icon: '🗄️', scope: 'imported', type: 'http', transport: 'streamable_http', url: 'https://db.internal/mcp/postgres', env: {} },
  { id: 'hub-mcp-brave-search', englishId: 'brave-search', nameZh: 'Brave 搜索', icon: '🔎', scope: 'imported', type: 'http', transport: 'sse', url: 'https://search.brave.internal/mcp/sse', env: { BRAVE_API_KEY: '' }, missingEnv: ['BRAVE_API_KEY'] },
  { id: 'hub-mcp-slack', englishId: 'slack', nameZh: 'Slack', icon: '💬', scope: 'imported', type: 'http', transport: 'sse', url: 'https://slack.internal/mcp/sse', env: { SLACK_BOT_TOKEN: '' }, missingEnv: ['SLACK_BOT_TOKEN'] },
  { id: 'hub-mcp-memory', englishId: 'memory-kv', nameZh: '键值记忆', icon: '🧠', scope: 'imported', type: 'http', transport: 'streamable_http', url: 'https://memory.internal/mcp', env: {} },
  { id: 'hub-mcp-puppeteer', englishId: 'puppeteer', nameZh: '浏览器自动化', icon: '🌐', scope: 'imported', type: 'http', transport: 'streamable_http', url: 'https://browser.internal/mcp', env: {} },
  { id: 'hub-mcp-sqlite', englishId: 'sqlite', nameZh: 'SQLite', icon: '💾', scope: 'imported', type: 'http', transport: 'streamable_http', url: 'https://db.internal/mcp/sqlite', env: {} },
  { id: 'hub-mcp-fetch', englishId: 'fetch', nameZh: 'HTTP 抓取', icon: '📡', scope: 'imported', type: 'http', transport: 'streamable_http', url: 'https://fetch.internal/mcp', env: {} },
  { id: 'hub-mcp-git', englishId: 'git', nameZh: 'Git 仓库', icon: '🌿', scope: 'imported', type: 'http', transport: 'sse', url: 'https://git.internal/mcp/sse', env: {} },
  { id: 'hub-mcp-notion', englishId: 'notion', nameZh: 'Notion', icon: '📓', scope: 'imported', type: 'http', transport: 'streamable_http', url: 'https://mcp.notion.com/v1', env: { NOTION_TOKEN: '' }, missingEnv: ['NOTION_TOKEN'] },
  { id: 'hub-mcp-sentry', englishId: 'sentry', nameZh: 'Sentry', icon: '🐛', scope: 'imported', type: 'http', transport: 'sse', url: 'https://mcp.sentry.dev/sse', env: { SENTRY_AUTH_TOKEN: '' }, missingEnv: ['SENTRY_AUTH_TOKEN'] },

  // —— 我创建的 ——
  { id: 'hub-mcp-mes', englishId: 'mes-bridge', nameZh: 'MES 桥接', icon: '🏭', scope: 'created', type: 'http', transport: 'streamable_http', url: 'https://mes.fab-a.internal/mcp', env: { MES_API_KEY: '' }, missingEnv: ['MES_API_KEY'] },
  { id: 'hub-mcp-spc', englishId: 'spc-qms', nameZh: 'SPC 质控', icon: '📊', scope: 'created', type: 'http', transport: 'streamable_http', url: 'https://spc.qms.internal/mcp', env: {} },
  { id: 'hub-mcp-cmms', englishId: 'cmms', nameZh: '设备维保', icon: '🔧', scope: 'created', type: 'http', transport: 'sse', url: 'https://cmms.fab-a.internal/mcp/sse', env: { CMMS_TOKEN: '' }, missingEnv: ['CMMS_TOKEN'] },
  { id: 'hub-mcp-scada', englishId: 'scada-bridge', nameZh: 'SCADA 桥接', icon: '📡', scope: 'created', type: 'http', transport: 'sse', url: 'https://scada.fab-a.internal/mcp/sse', env: {} },
  { id: 'hub-mcp-wms', englishId: 'wms-bridge', nameZh: 'WMS 仓储', icon: '📦', scope: 'created', type: 'http', transport: 'streamable_http', url: 'https://wms.corp.internal/mcp', env: {} },
  { id: 'hub-mcp-erp', englishId: 'erp-gateway', nameZh: 'ERP 网关', icon: '🏢', scope: 'created', type: 'http', transport: 'streamable_http', url: 'https://erp.corp.internal/mcp', env: { ERP_CLIENT_SECRET: '' }, missingEnv: ['ERP_CLIENT_SECRET'] },
  { id: 'hub-mcp-ehs', englishId: 'ehs-portal', nameZh: 'EHS 门户', icon: '🛡️', scope: 'created', type: 'http', transport: 'streamable_http', url: 'https://ehs.fab-a.internal/mcp', env: {} },
  { id: 'hub-mcp-agv', englishId: 'agv-fleet', nameZh: 'AGV 车队', icon: '🤖', scope: 'created', type: 'http', transport: 'sse', url: 'https://agv.fab-a.internal/mcp/sse', env: {} },
  { id: 'hub-mcp-mlflow', englishId: 'mlflow', nameZh: 'MLflow 实验', icon: '🧪', scope: 'created', type: 'http', transport: 'streamable_http', url: 'https://mlflow.ai-lab.internal/mcp', env: {} },
  { id: 'hub-mcp-energy', englishId: 'ems', nameZh: '能耗管理', icon: '⚡', scope: 'created', type: 'http', transport: 'streamable_http', url: 'https://ems.fab-a.internal/mcp', env: {} },
  { id: 'hub-mcp-mdm', englishId: 'mdm', nameZh: '主数据', icon: '🗂️', scope: 'created', type: 'http', transport: 'streamable_http', url: 'https://mdm.corp.internal/mcp', env: {} },
  { id: 'hub-mcp-chem', englishId: 'chem-inventory', nameZh: '危化品台账', icon: '⚗️', scope: 'created', type: 'http', transport: 'sse', url: 'https://ehs.fab-a.internal/chem/mcp/sse', env: {} }
];

/**
 * DEV_MOCK 专家详情「MCP」Tab 演示数据（按专家在 EXPERTS_DATA 中的下标）。
 * 覆盖 PRD 四种状态：正常 / 未配置密钥 / 连接失败 / 已禁用。
 * 全部为 HTTP；transport: streamable_http | sse
 */
window.DEMO_MCP_SERVERS_BY_INDEX = {
  0: [
    {
      name: 'filesystem',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://fs.fab-a.internal/mcp',
      enabled: true,
      status: 'ok'
    },
    {
      name: 'github-api',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://api.githubcopilot.com/mcp/',
      env: { GITHUB_TOKEN: '' },
      enabled: true,
      status: 'missing_secret',
      missingEnv: ['GITHUB_TOKEN']
    },
    {
      name: 'mes-query',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://mes.fab-a.internal/mcp',
      env: { MES_API_KEY: '' },
      enabled: true,
      status: 'missing_secret',
      missingEnv: ['MES_API_KEY']
    },
    {
      name: 'legacy-fs',
      type: 'http',
      transport: 'sse',
      url: 'https://legacy-fs.internal/mcp/sse',
      enabled: true,
      status: 'connection_failed',
      errorSummary: '路径无效或服务不可达（clone 后绝对路径失效）'
    },
    {
      name: 'old-svc',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://mcp.example.com/v1',
      enabled: false,
      status: 'disabled'
    }
  ],
  1: [
    {
      name: 'filesystem',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://fs.ai-lab.internal/mcp',
      enabled: true,
      status: 'ok'
    },
    {
      name: 'postgres',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://db.ai-lab.internal/mcp/postgres',
      env: { POSTGRES_PASSWORD: '' },
      enabled: true,
      status: 'missing_secret',
      missingEnv: ['POSTGRES_PASSWORD']
    },
    {
      name: 'mlflow',
      type: 'http',
      transport: 'sse',
      url: 'https://mlflow.ai-lab.internal/mcp/sse',
      enabled: true,
      status: 'ok'
    }
  ],
  2: [
    {
      name: 'cmms-api',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://cmms.fab-a.internal/mcp',
      env: { CMMS_TOKEN: '' },
      enabled: true,
      status: 'missing_secret',
      missingEnv: ['CMMS_TOKEN']
    },
    {
      name: 'scada-bridge',
      type: 'http',
      transport: 'sse',
      url: 'https://scada.fab-a.internal/mcp/sse',
      enabled: true,
      status: 'connection_failed',
      errorSummary: '命令退出码 1：无法连接 OPC UA 端点'
    }
  ],
  3: [
    {
      name: 'filesystem',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://fs.supply.internal/mcp',
      enabled: true,
      status: 'ok'
    },
    {
      name: 'erp-api',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://erp.corp.internal/mcp',
      env: { ERP_CLIENT_ID: 'supply-planner', ERP_CLIENT_SECRET: '' },
      enabled: true,
      status: 'missing_secret',
      missingEnv: ['ERP_CLIENT_SECRET']
    }
  ],
  4: [
    {
      name: 'qms-docs',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://qms.docs.internal/mcp',
      enabled: true,
      status: 'ok'
    },
    {
      name: 'spc-service',
      type: 'http',
      transport: 'sse',
      url: 'https://spc.qms.internal/mcp/sse',
      enabled: false,
      status: 'disabled'
    }
  ],
  // 数字化转型顾问
  5: [
    {
      name: 'filesystem',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://fs.digital.internal/mcp',
      enabled: true,
      status: 'ok'
    },
    {
      name: 'mes-integration',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://mes.integration.internal/mcp',
      env: { MES_CLIENT_SECRET: '' },
      enabled: true,
      status: 'missing_secret',
      missingEnv: ['MES_CLIENT_SECRET']
    },
    {
      name: 'mdm-gateway',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://mdm.corp.internal/mcp',
      enabled: true,
      status: 'ok'
    },
    {
      name: 'legacy-esb',
      type: 'http',
      transport: 'sse',
      url: 'https://esb.corp.internal/mcp/sse',
      enabled: true,
      status: 'connection_failed',
      errorSummary: 'ESB 端点超时（10.0.12.8:8080）'
    }
  ],
  // 能源管理专家
  6: [
    {
      name: 'ems-telemetry',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://ems.fab-a.internal/mcp',
      env: { EMS_API_KEY: '' },
      enabled: true,
      status: 'missing_secret',
      missingEnv: ['EMS_API_KEY']
    },
    {
      name: 'carbon-ledger',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://carbon.corp.internal/mcp',
      enabled: true,
      status: 'ok'
    },
    {
      name: 'peak-valley-opt',
      type: 'http',
      transport: 'sse',
      url: 'https://energy-opt.corp.internal/mcp/sse',
      enabled: false,
      status: 'disabled'
    }
  ],
  // 安全合规专家
  7: [
    {
      name: 'ehs-docs',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://ehs.docs.internal/mcp',
      enabled: true,
      status: 'ok'
    },
    {
      name: 'hazard-tracker',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://ehs.fab-a.internal/mcp',
      env: { EHS_TOKEN: '' },
      enabled: true,
      status: 'missing_secret',
      missingEnv: ['EHS_TOKEN']
    },
    {
      name: 'chem-inventory',
      type: 'http',
      transport: 'sse',
      url: 'https://ehs.fab-a.internal/chem/mcp/sse',
      enabled: true,
      status: 'connection_failed',
      errorSummary: '危化品库文件不存在或权限不足'
    },
    {
      name: 'training-lms',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://lms.corp.internal/mcp',
      enabled: false,
      status: 'disabled'
    }
  ],
  // 人机协作专家（EXPERTS_DATA index 8）
  8: [
    {
      name: 'filesystem',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://fs.cobot.internal/mcp',
      enabled: true,
      status: 'ok'
    },
    {
      name: 'agv-fleet',
      type: 'http',
      transport: 'sse',
      url: 'https://agv.fab-a.internal/mcp/sse',
      env: { AGV_API_TOKEN: '' },
      enabled: true,
      status: 'missing_secret',
      missingEnv: ['AGV_API_TOKEN']
    },
    {
      name: 'ur-polyscope',
      type: 'http',
      transport: 'sse',
      url: 'https://ur.fab-a.internal/mcp/sse',
      enabled: true,
      status: 'connection_failed',
      errorSummary: '无法连接 UR 控制器（192.168.10.42:30004）'
    },
    {
      name: 'layout-cad',
      type: 'http',
      transport: 'streamable_http',
      url: 'https://cad.plant.internal/mcp',
      enabled: false,
      status: 'disabled'
    }
  ]
};

/** Profile toolset 中文标签（只读 UI，非 Mock 绑定源） */
window.HERMES_TOOLSET_LABELS = {
  terminal: '终端与进程',
  file: '文件读写',
  web: '网页搜索',
  browser: '浏览器自动化',
  search: '搜索',
  vision: '视觉分析',
  skills: '技能管理',
  memory: '记忆',
  delegation: '任务委派',
  messaging: '消息网关',
  code_execution: '代码执行',
  cronjob: '定时任务',
  todo: '待办规划',
  clarify: '澄清提问',
  debugging: '调试',
  image_gen: '图像生成',
  video: '视频',
  tts: '语音合成',
  moa: '混合专家',
  rl: '强化学习',
  safe: '安全模式',
  session_search: '会话搜索',
  homeassistant: 'Home Assistant',
  kanban: '看板协作',
  spotify: 'Spotify',
  discord: 'Discord',
  feishu_doc: '飞书文档',
  feishu_drive: '飞书云盘'
};

window.toolsetLabel = function (id) {
  if (!id) return '';
  var labels = window.HERMES_TOOLSET_LABELS || {};
  return labels[id] || id;
};

window.IM_CHANNEL_TYPES = [
  {
    id: 'wecom',
    label: '企业微信 · AI Bot',
    name: '企业微信 · AI Bot',
    emoji: '💼',
    description: '智能机器人 / AI Bot，走 WebSocket 长连接，无需公网回调端点，适合内网/本地部署。与「自建应用」为不同 platform，可单独启用。',
    docsUrl: 'https://developer.work.weixin.qq.com/document/path/99510',
    connectionHint: 'WebSocket · 无需公网回调',
    credentialFields: [
      { key: 'WECOM_BOT_ID', label: 'Bot ID', description: '智能机器人 bot_id（管理后台 → 应用工作台 → 智能机器人 → API 模式获取）。', required: true },
      { key: 'WECOM_SECRET', label: 'Secret', description: '对应 secret。', password: true, required: true }
    ],
    policyFields: [
      {
        key: 'WECOM_DM_POLICY', label: 'DM 策略', type: 'select', default: 'pairing',
        description: '私聊准入策略：open=开放访问、allowlist=白名单、pairing=配对模式、disabled=禁用私聊。',
        options: [
          { value: 'pairing', label: '配对模式 (pairing)' },
          { value: 'allowlist', label: '白名单 (allowlist)' },
          { value: 'open', label: '开放访问 (open)' },
          { value: 'disabled', label: '禁用 (disabled)' }
        ]
      },
      { key: 'WECOM_ALLOWED_USERS', label: '允许用户', type: 'text', default: '', description: '逗号分隔的 user_id 列表，仅 allowlist 模式下生效。' },
      { key: 'WECOM_HOME_CHANNEL', label: 'Home 渠道', type: 'text', default: '', description: 'chat_id，cron/通知默认投递渠道。' }
    ]
  },
  {
    id: 'wecom_callback',
    label: '企业微信 · 自建应用',
    name: '企业微信 · 自建应用',
    emoji: '💼',
    description: '自建应用走 HTTP 回调（WecomCallbackAdapter），gateway 监听回调端口，须保证企业微信服务器能访问到该回调地址（公网或内网穿透）。凭据命名空间为 WECOM_CALLBACK_*，与 AI Bot 互不冲突。',
    docsUrl: 'https://developer.work.weixin.qq.com/document/path/90238',
    connectionHint: 'HTTP 回调 · 需回调 URL 可达',
    credentialFields: [
      { key: 'WECOM_CALLBACK_CORP_ID', label: 'Corp ID', description: '企业 ID（管理后台 → 应用管理 → 自建应用）。', required: true },
      { key: 'WECOM_CALLBACK_CORP_SECRET', label: 'Corp Secret', description: '应用 Secret。', password: true, required: true },
      { key: 'WECOM_CALLBACK_AGENT_ID', label: 'Agent ID', description: '应用 AgentId。', required: true },
      { key: 'WECOM_CALLBACK_TOKEN', label: 'Token', description: '回调 URL 校验 Token（与企微后台「接收消息」一致）。', password: true },
      { key: 'WECOM_CALLBACK_ENCODING_AES_KEY', label: 'EncodingAESKey', description: '回调加解密密钥。', password: true },
      { key: 'WECOM_CALLBACK_HOST', label: '监听 Host', description: '回调服务绑定地址；须保证企业微信能访问到该回调地址。' },
      { key: 'WECOM_CALLBACK_PORT', label: '监听 Port', description: '回调监听端口（如 8645）；须与企微后台回调 URL 一致，端口占用会导致启动失败。' }
    ],
    policyFields: [
      { key: 'WECOM_CALLBACK_ALLOWED_USERS', label: '允许用户', type: 'text', default: '', description: '逗号分隔 user_id；填 * 表示任意用户。' },
      {
        key: 'WECOM_CALLBACK_ALLOW_ALL_USERS', label: '开放访问', type: 'switch', default: false,
        description: '设为 true 时开放任意用户访问。'
      }
    ]
  },
  {
    id: 'dingtalk',
    label: '钉钉',
    name: '钉钉',
    emoji: '🐳',
    description: '钉钉企业内部应用，走 Stream Mode（WebSocket 长连接），无需公网回调端点。',
    docsUrl: 'https://open.dingtalk.com/document/orgapp/the-robot-development-process',
    connectionHint: 'WebSocket · 无需公网回调',
    credentialFields: [
      { key: 'DINGTALK_CLIENT_ID', label: 'Client ID', description: '钉钉应用 App Key（开发者后台 → 应用基础信息）。', required: true },
      { key: 'DINGTALK_CLIENT_SECRET', label: 'Client Secret', description: '钉钉应用 App Secret。', password: true, required: true }
    ],
    policyFields: [
      {
        key: 'DINGTALK_REQUIRE_MENTION', label: '群聊需 @', type: 'switch', default: true,
        description: '群聊是否必须 @机器人才会响应。'
      },
      { key: 'DINGTALK_ALLOWED_USERS', label: '允许用户', type: 'text', default: '', description: 'staff_id / sender_id 列表，逗号分隔；填 * 表示任意用户。' },
      { key: 'DINGTALK_HOME_CHANNEL', label: 'Home 渠道', type: 'text', default: '', description: 'conversationId，cron/通知默认投递渠道。' }
    ]
  },
  {
    id: 'feishu',
    label: '飞书',
    name: '飞书',
    emoji: '🪽',
    description: '飞书 / Lark 企业自建应用，默认 WebSocket 长连接（推荐），可选 Webhook 模式。',
    docsUrl: 'https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/intro',
    connectionHint: 'WebSocket（推荐）或 Webhook',
    credentialFields: [
      { key: 'FEISHU_APP_ID', label: 'App ID', description: '飞书应用 App ID（开放平台 → 凭证与基础信息）。', required: true },
      { key: 'FEISHU_APP_SECRET', label: 'App Secret', description: '飞书应用 App Secret。', password: true, required: true },
      {
        key: 'FEISHU_DOMAIN', label: '域名', type: 'select', default: 'feishu',
        description: '飞书国内版或 Lark 海外版。',
        options: [
          { value: 'feishu', label: 'feishu（国内）' },
          { value: 'lark', label: 'lark（海外）' }
        ]
      },
      {
        key: 'FEISHU_CONNECTION_MODE', label: '连接模式', type: 'select', default: 'websocket',
        description: 'WebSocket 模式无需公网端点（推荐）；Webhook 模式需配置 Encrypt Key 或 Verification Token。',
        options: [
          { value: 'websocket', label: 'WebSocket（推荐）' },
          { value: 'webhook', label: 'Webhook' }
        ]
      },
      { key: 'FEISHU_ENCRYPT_KEY', label: 'Encrypt Key', description: 'Webhook 模式下用于事件加密（飞书后台配置）。', password: true },
      { key: 'FEISHU_VERIFICATION_TOKEN', label: 'Verification Token', description: 'Webhook 模式下第二层鉴权 token。', password: true }
    ],
    policyFields: [
      {
        key: 'FEISHU_REQUIRE_MENTION', label: '群聊需 @', type: 'switch', default: true,
        description: '群聊是否必须 @机器人才会响应。'
      },
      {
        key: 'FEISHU_GROUP_POLICY', label: '群聊策略', type: 'select', default: 'allowlist',
        description: '群聊准入策略：open=任意群、allowlist=白名单。',
        options: [
          { value: 'allowlist', label: '白名单 (allowlist)' },
          { value: 'open', label: '开放 (open)' }
        ]
      },
      { key: 'FEISHU_ALLOWED_USERS', label: '允许用户', type: 'text', default: '', description: 'open_id / user_id / union_id 列表，逗号分隔。' },
      { key: 'FEISHU_HOME_CHANNEL', label: 'Home 渠道', type: 'text', default: '', description: 'chat_id，cron/通知默认投递渠道。' }
    ]
  }
];

/** 用于凭据互斥校验的锁标识字段（对应 PRD §8.12.6 acquire_scoped_lock）。 */
window.IM_CHANNEL_LOCK_FIELDS = {
  wecom: 'WECOM_BOT_ID',
  wecom_callback: 'WECOM_CALLBACK_CORP_ID',
  dingtalk: 'DINGTALK_CLIENT_ID',
  feishu: 'FEISHU_APP_ID'
};

/** Platform icons for IM sidebar (emoji fallback). */
window.IM_PLATFORM_ICONS = {
  telegram: '✈️',
  discord: '🎮',
  slack: '💬',
  matrix: '🔲',
  mattermost: '💠',
  signal: '📡',
  whatsapp: '📱',
  email: '📧',
  sms: '💬',
  dingtalk: '🐳',
  feishu: '🪽',
  wecom: '💼',
  wecom_callback: '💼',
  weixin: '💚',
  qqbot: '🐧',
  homeassistant: '🏠',
  bluebubbles: '💬',
  webhook: '🔗',
  api_server: '🌐',
  yuanbao: '🟡'
};

window.imPlatformIcon = function (platformId) {
  var id = String(platformId || '').toLowerCase();
  return (window.IM_PLATFORM_ICONS && window.IM_PLATFORM_ICONS[id]) || '📨';
};

window.CATEGORY_TABS = [
  { id: 'all', label: '全部专家' },
  { id: 'process', label: '工艺制造' },
  { id: 'tech', label: '智能算法' },
  { id: 'ops', label: '运维管理' }
];

window.CATEGORY_MAP = {
  process: ['工艺制造', '质量管理'],
  tech: ['智能算法', '自动化', '数字化'],
  ops: ['设备运维', '供应链', '能源环保', '安全合规']
};

window.TAG_COLORS = ['tag-blue', 'tag-green', 'tag-orange', 'tag-purple', 'tag-teal'];

/** 专家对话任务状态（/experts/:id/tasks） */
window.TASK_STATUS_LABEL = {
  pending: '待开始',
  running: '进行中',
  paused: '已暂停',
  completed: '已完成',
  failed: '失败',
  archived: '已归档'
};

window.TASK_STATUS_TYPE = {
  pending: 'info',
  running: 'primary',
  paused: 'warning',
  completed: 'success',
  failed: 'danger',
  archived: 'info'
};

/** 项目子任务执行状态（/projects/:id）— 仅三种，与专家对话任务状态体系不同 */
window.PROJECT_TASK_STATUS_LABEL = {
  queued: '排队中',
  running: '运行中',
  done: '已完成'
};

window.PROJECT_TASK_STATUS_TYPE = {
  queued: 'info',
  running: 'primary',
  done: 'success'
};

/** 将历史细粒度状态归并为三种项目任务状态 */
window.normalizeProjectTaskStatus = function (status) {
  if (status === 'done' || status === 'queued' || status === 'running') return status;
  if (status === 'thinking' || status === 'tool' || status === 'waiting' || status === 'error') return 'running';
  return 'queued';
};

window.ARTIFACT_TYPE_LABEL = {
  document: '文档',
  report: '报告',
  data: '数据',
  file: '文件'
};

/** 技能参数预设 */
window.SKILL_PARAM_SCHEMAS = {
  'skill-yield': [
    { key: 'confidenceThreshold', label: '置信度阈值', type: 'number', default: 0.85, min: 0.5, max: 0.99, step: 0.01 },
    { key: 'dataSource', label: '数据源', type: 'select', options: ['MES 实时数据', '历史数据仓库', '手动上传'], default: 'MES 实时数据' },
    { key: 'outputFormat', label: '输出格式', type: 'select', options: ['分析报告', '数据表格', '图表仪表盘'], default: '分析报告' }
  ],
  'skill-spc': [
    { key: 'chartType', label: '控制图类型', type: 'select', options: ['X-bar R', 'X-bar S', 'I-MR', 'P 图'], default: 'X-bar R' },
    { key: 'rules', label: '判异规则', type: 'checkbox', options: ['超出控制限', '连续7点同侧', '连续7点上升', '连续7点下降'], default: ['超出控制限'] }
  ],
  'skill-pm': [
    { key: 'monitorInterval', label: '监测周期(小时)', type: 'number', default: 24, min: 1, max: 168 },
    { key: 'alertThreshold', label: '告警阈值', type: 'number', default: 0.8, min: 0.5, max: 0.99, step: 0.01 },
    { key: 'sensorTypes', label: '传感器类型', type: 'checkbox', options: ['振动', '温度', '压力', '电流'], default: ['振动', '温度'] }
  ],
  'skill-vision': [
    { key: 'modelType', label: '模型类型', type: 'select', options: ['通用检测', '精细分类', '语义分割'], default: '通用检测' },
    { key: 'confidenceThreshold', label: '置信度阈值', type: 'number', default: 0.9, min: 0.5, max: 0.99, step: 0.01 }
  ],
  'skill-supply': [
    { key: 'forecastHorizon', label: '预测周期(天)', type: 'number', default: 30, min: 7, max: 365 },
    { key: 'safetyStockLevel', label: '安全库存系数', type: 'number', default: 1.5, min: 1.0, max: 3.0, step: 0.1 },
    { key: 'considerSeasonality', label: '考虑季节性', type: 'select', options: ['是', '否'], default: '是' }
  ],
  'skill-ehs': [
    { key: 'standard', label: '合规标准', type: 'select', options: ['ISO 14001', 'ISO 45001', 'GB/T 33000', '自定义'], default: 'ISO 14001' },
    { key: 'riskLevel', label: '风险等级阈值', type: 'select', options: ['低', '中', '高', '重大'], default: '中' }
  ],
  'skill-integration': [
    { key: 'protocol', label: '对接协议', type: 'select', options: ['REST API', 'MQTT', 'OPC UA', 'WebSocket'], default: 'REST API' },
    { key: 'dataFormat', label: '数据格式', type: 'select', options: ['JSON', 'XML', 'CSV', 'Protobuf'], default: 'JSON' }
  ],
  'skill-energy': [
    { key: 'baselinePeriod', label: '基线周期(月)', type: 'number', default: 12, min: 1, max: 36 },
    { key: 'targetReduction', label: '节能目标(%)', type: 'number', default: 10, min: 1, max: 50 }
  ]
};

/** 内置 toolset 一般无需额外参数；保留空表兼容旧绑定 */
/** 需密钥的 toolset 配置字段（原型抽屉；对齐 Dashboard ToolsetConfigDrawer） */
window.TOOL_PARAM_SCHEMAS = {
  web: [
    { key: 'WEB_SEARCH_API_KEY', label: 'Web Search API Key', password: true, default: '', required: true }
  ],
  vision: [
    { key: 'VISION_API_KEY', label: 'Vision API Key', password: true, default: '', required: true }
  ]
};

/** Provider / Model 目录（Mock） */
window.PROVIDER_CATALOG = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o mini' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'o1', name: 'o1' },
      { id: 'o3-mini', name: 'o3-mini' }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' }
    ]
  },
  {
    id: 'qwen',
    name: '通义千问',
    models: [
      { id: 'qwen-max', name: 'Qwen Max' },
      { id: 'qwen-plus', name: 'Qwen Plus' },
      { id: 'qwen-turbo', name: 'Qwen Turbo' }
    ]
  }
];

window.getProviderModels = function (providerId) {
  var p = (window.PROVIDER_CATALOG || []).find(function (x) { return x.id === providerId; });
  return p ? p.models : [];
};

window.PROVIDER_DEFAULTS_DETAIL = {
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  anthropic: { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  qwen: { name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' }
};

/** Hub 技能目录（Mock）— 安装后默认启用，用量从 0 起算 */
/**
 * 平台技能库（Mock）—「从平台导入」弹窗
 * scope: mine=我发布的 | added=我添加的 | builtin=内置
 * 列表展示：icon + nameZh(englishId)
 */
window.SKILLS_HUB_CATALOG = [
  // —— 我发布的 ——
  { id: 'hub-mes-connector', englishId: 'mes-connector', nameZh: 'MES 连接器', icon: '🔌', scope: 'mine', category: 'digital', description: '对接主流 MES 系统拉取工单与报工数据', provenance: 'hub' },
  { id: 'hub-spc-dashboard', englishId: 'spc-dashboard', nameZh: 'SPC 看板', icon: '📊', scope: 'mine', category: 'quality', description: '控制图与过程能力一站式看板', provenance: 'hub' },
  { id: 'hub-workorder-assist', englishId: 'workorder-assist', nameZh: '工单助手', icon: '📋', scope: 'mine', category: 'manufacturing', description: '工单解析、派工建议与异常催办', provenance: 'hub' },
  { id: 'hub-shift-handover', englishId: 'shift-handover', nameZh: '交接班纪要', icon: '📝', scope: 'mine', category: 'manufacturing', description: '班次异常汇总与交接要点生成', provenance: 'hub' },
  { id: 'hub-tooling-life', englishId: 'tooling-life', nameZh: '刀具寿命预测', icon: '🛠️', scope: 'mine', category: 'equipment', description: '基于切削参数与磨损曲线的换刀建议', provenance: 'hub' },
  { id: 'hub-andon-router', englishId: 'andon-router', nameZh: '安灯路由', icon: '🚨', scope: 'mine', category: 'manufacturing', description: '安灯呼叫分级与责任人自动分派', provenance: 'hub' },
  { id: 'hub-recipe-diff', englishId: 'recipe-diff', nameZh: '配方差异比对', icon: '🧪', scope: 'mine', category: 'process', description: '工艺配方版本差异高亮与风险提示', provenance: 'hub' },
  { id: 'hub-oee-brief', englishId: 'oee-brief', nameZh: 'OEE 简报', icon: '📉', scope: 'mine', category: 'manufacturing', description: '产线 OEE 归因与改善优先级排序', provenance: 'hub' },
  { id: 'hub-fixture-checker', englishId: 'fixture-checker', nameZh: '夹具点检', icon: '✅', scope: 'mine', category: 'equipment', description: '夹具点检清单生成与异常闭环', provenance: 'hub' },
  { id: 'hub-lot-trace', englishId: 'lot-trace', nameZh: '批次追溯', icon: '🔍', scope: 'mine', category: 'quality', description: '批次正向/反向追溯与影响范围评估', provenance: 'hub' },
  { id: 'hub-changeover-plan', englishId: 'changeover-plan', nameZh: '换型计划', icon: '🔄', scope: 'mine', category: 'manufacturing', description: '换型步骤编排与最短路径建议', provenance: 'hub' },
  { id: 'hub-alarm-digest', englishId: 'alarm-digest', nameZh: '告警摘要', icon: '🔔', scope: 'mine', category: 'equipment', description: '设备告警聚合、去重与根因初筛', provenance: 'hub' },

  // —— 我添加的 ——
  { id: 'hub-lean-logistics', englishId: 'lean-logistics', nameZh: '精益物流', icon: '🚛', scope: 'added', category: 'supply-chain', description: '厂内物流路径优化与线边库存设计', provenance: 'hub' },
  { id: 'hub-energy-optimization', englishId: 'energy-optimization', nameZh: '能耗优化', icon: '⚡', scope: 'added', category: 'energy', description: '能耗基线建模与节能策略推荐', provenance: 'hub' },
  { id: 'hub-safety-risk', englishId: 'safety-risk', nameZh: '安全风险', icon: '🛡️', scope: 'added', category: 'compliance', description: 'JHA 分析与 LEC 风险评估', provenance: 'hub' },
  { id: 'hub-kanban-sync', englishId: 'kanban-sync', nameZh: '看板同步', icon: '📌', scope: 'added', category: 'supply-chain', description: '拉动看板水位监控与补货触发', provenance: 'hub' },
  { id: 'hub-supplier-score', englishId: 'supplier-score', nameZh: '供应商评分', icon: '🏷️', scope: 'added', category: 'supply-chain', description: '交期、质量与成本综合评分', provenance: 'hub' },
  { id: 'hub-carbon-audit', englishId: 'carbon-audit', nameZh: '碳足迹核算', icon: '🌿', scope: 'added', category: 'energy', description: '工序级碳排放核算与热点识别', provenance: 'hub' },
  { id: 'hub-sop-writer', englishId: 'sop-writer', nameZh: 'SOP 撰写', icon: '📘', scope: 'added', category: 'compliance', description: '作业指导书结构化起草与评审', provenance: 'hub' },
  { id: 'hub-wms-bridge', englishId: 'wms-bridge', nameZh: 'WMS 桥接', icon: '📦', scope: 'added', category: 'digital', description: '仓库出入库与库位数据桥接', provenance: 'hub' },
  { id: 'hub-defect-taxonomy', englishId: 'defect-taxonomy', nameZh: '缺陷分类法', icon: '🧩', scope: 'added', category: 'quality', description: '缺陷编码体系维护与归类建议', provenance: 'hub' },
  { id: 'hub-line-balance', englishId: 'line-balance', nameZh: '产线平衡', icon: '⚖️', scope: 'added', category: 'manufacturing', description: '工位节拍分析与瓶颈再分配', provenance: 'hub' },
  { id: 'hub-spare-parts', englishId: 'spare-parts', nameZh: '备件建议', icon: '🧰', scope: 'added', category: 'equipment', description: '备件安全库存与采购优先级', provenance: 'hub' },
  { id: 'hub-audit-checklist', englishId: 'audit-checklist', nameZh: '审核清单', icon: '📑', scope: 'added', category: 'compliance', description: '内审检查项生成与证据归档', provenance: 'hub' },

  // —— 内置 ——
  { id: 'hub-lean-manufacturing', englishId: 'lean-manufacturing', nameZh: '精益制造', icon: '🏭', scope: 'builtin', category: 'manufacturing', description: '价值流图分析、七大浪费识别与改善方案', provenance: 'hub' },
  { id: 'hub-six-sigma', englishId: 'six-sigma', nameZh: '六西格玛', icon: '📐', scope: 'builtin', category: 'quality', description: 'DMAIC 流程、假设检验与过程能力分析', provenance: 'hub' },
  { id: 'hub-digital-twin', englishId: 'digital-twin', nameZh: '数字孪生', icon: '🧬', scope: 'builtin', category: 'digital', description: '产线仿真建模与节拍优化', provenance: 'hub' },
  { id: 'hub-predictive-quality', englishId: 'predictive-quality', nameZh: '预测质量', icon: '📈', scope: 'builtin', category: 'ml', description: '基于工艺参数的良率预测与异常预警', provenance: 'hub' },
  { id: 'hub-root-cause', englishId: 'root-cause', nameZh: '根因分析', icon: '🌳', scope: 'builtin', category: 'quality', description: '5Why / 鱼骨图结构化根因推导', provenance: 'hub' },
  { id: 'hub-capacity-plan', englishId: 'capacity-plan', nameZh: '产能规划', icon: '📅', scope: 'builtin', category: 'manufacturing', description: '产能负荷测算与瓶颈产能扩展建议', provenance: 'hub' },
  { id: 'hub-vision-inspect', englishId: 'vision-inspect', nameZh: '视觉质检', icon: '👁️', scope: 'builtin', category: 'ml', description: '外观缺陷检测与误检率评估', provenance: 'hub' },
  { id: 'hub-process-fmea', englishId: 'process-fmea', nameZh: '过程 FMEA', icon: '⚠️', scope: 'builtin', category: 'quality', description: '过程失效模式分析与 RPN 排序', provenance: 'hub' },
  { id: 'hub-schedule-optimize', englishId: 'schedule-optimize', nameZh: '排程优化', icon: '🗓️', scope: 'builtin', category: 'manufacturing', description: '多约束排程与交期承诺评估', provenance: 'hub' },
  { id: 'hub-knowledge-rag', englishId: 'knowledge-rag', nameZh: '工艺知识检索', icon: '📚', scope: 'builtin', category: 'digital', description: '工艺文档检索与引用回答', provenance: 'hub' },
  { id: 'hub-anomaly-detect', englishId: 'anomaly-detect', nameZh: '异常检测', icon: '📡', scope: 'builtin', category: 'ml', description: '时序传感器异常检测与告警降噪', provenance: 'hub' },
  { id: 'hub-cost-breakdown', englishId: 'cost-breakdown', nameZh: '成本分解', icon: '💰', scope: 'builtin', category: 'manufacturing', description: '单位成本拆解与降本机会识别', provenance: 'hub' }
];

/** Mock 运行中会话数：基于 expertId 稳定哈希返回 0-3 */
window.getRunningSessionCount = function (expertId) {
  var s = String(expertId || '');
  var hash = 0;
  for (var i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 4;
};

/** Mock MEMORY.md 文本 */
window.MOCK_MEMORY_MD = '# 专家长期记忆\n\n## 用户偏好\n- 偏好用数据驱动方式做决策，汇报时需附带量化结论\n- 习惯用中文输出，技术术语可保留英文\n\n## 项目背景\n- 当前产线为 12 寸晶圆厂，月产能 5 万片\n- 重点攻关工序：光刻对准精度与刻蚀均匀性\n\n## 领域知识\n- SPC 控制限按 ±3σ 设定，Cpk 目标 ≥ 1.33\n- 异常处理流程：发现 -> 隔离 -> 根因分析 -> 纠正措施 -> 验证关闭';

/**
 * 平台可用模型目录（Mock）— 新建/编辑专家「默认模型」下拉
 * visibility: personal | public
 * capabilities: 能力标签
 * contextLabel: 上下文/用量展示
 */
window.MODELS_CATALOG = [
  {
    id: 'qwen3.5-122b-a10b-mass',
    name: 'qwen3.5-122b-a10b-mass',
    visibility: 'personal',
    capabilities: ['文本生成', '图文问答', '工具调用'],
    contextLabel: '7K',
    providerName: '通义千问',
    providerSlug: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  {
    id: 'qwen3-235b-a22b-2507',
    name: 'qwen3-235b-a22b-2507',
    visibility: 'personal',
    capabilities: ['文本生成'],
    contextLabel: '5K',
    providerName: '通义千问',
    providerSlug: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  {
    id: 'minimax-m2.5',
    name: 'minimax-m2.5',
    visibility: 'public',
    capabilities: ['文本生成'],
    contextLabel: '7K',
    providerName: 'MiniMax',
    providerSlug: 'minimax',
    baseUrl: 'https://api.minimax.chat/v1'
  },
  {
    id: 'glm-5.1',
    name: 'glm-5.1',
    visibility: 'public',
    capabilities: ['文本生成'],
    contextLabel: '193K',
    providerName: '智谱',
    providerSlug: 'zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4'
  },
  {
    id: 'qwen3-235b-a22b',
    name: 'qwen3-235b-a22b',
    visibility: 'public',
    capabilities: ['文本生成', '工具调用'],
    contextLabel: '78K',
    providerName: '通义千问',
    providerSlug: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  {
    id: 'qwen2.5-72b-instruct',
    name: 'qwen2.5-72b-instruct',
    visibility: 'public',
    capabilities: ['文本生成'],
    contextLabel: '7K',
    providerName: '通义千问',
    providerSlug: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  {
    id: 'qwen2.5-32b-instruct',
    name: 'qwen2.5-32b-instruct',
    visibility: 'public',
    capabilities: ['文本生成'],
    contextLabel: '7K',
    providerName: '通义千问',
    providerSlug: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  {
    id: 'Qwen-235B-A22B-cucloud',
    name: 'Qwen-235B-A22B-cucloud',
    visibility: 'public',
    capabilities: ['文本生成'],
    contextLabel: '78K',
    providerName: '通义千问',
    providerSlug: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  {
    id: 'gpt-4o',
    name: 'gpt-4o',
    visibility: 'public',
    capabilities: ['文本生成', '图文问答', '工具调用'],
    contextLabel: '128K',
    providerName: 'OpenAI',
    providerSlug: 'openai',
    baseUrl: 'https://api.openai.com/v1'
  },
  {
    id: 'claude-sonnet-4',
    name: 'claude-sonnet-4',
    visibility: 'public',
    capabilities: ['文本生成', '工具调用'],
    contextLabel: '200K',
    providerName: 'Anthropic',
    providerSlug: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1'
  },
  {
    id: 'deepseek-chat',
    name: 'deepseek-chat',
    visibility: 'public',
    capabilities: ['文本生成', '工具调用'],
    contextLabel: '64K',
    providerName: 'DeepSeek',
    providerSlug: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1'
  },
  {
    id: 'qwen-max',
    name: 'qwen-max',
    visibility: 'public',
    capabilities: ['文本生成', '工具调用'],
    contextLabel: '32K',
    providerName: '通义千问',
    providerSlug: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  }
];

window.findModelInCatalog = function (modelIdOrName) {
  var key = String(modelIdOrName || '').trim();
  if (!key) return null;
  var list = window.MODELS_CATALOG || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === key || list[i].name === key) return list[i];
  }
  return null;
};

window.modelCatalogToConfig = function (model) {
  if (!model) return null;
  return {
    providerSlug: model.providerSlug || 'custom',
    providerName: model.providerName || '',
    baseUrl: model.baseUrl || '',
    apiKey: '',
    model: model.name || model.id || ''
  };
};

window.modelVisibilityLabel = function (visibility) {
  if (visibility === 'personal') return '个人';
  return '全局公开';
};

/** Mock USER.md 文本 */
window.MOCK_USER_MD = '# 用户画像\n\n## 角色\n- 制造工艺工程师，负责良率提升与工艺优化\n\n## 沟通风格\n- 直接、简洁，偏好结论先行\n- 喜欢用表格和图表对比方案\n\n## 常用工具\n- MES 报表系统、JMP 统计分析、Minitab';

/** SOUL.md 模板 */
window.SOUL_MD_TEMPLATE = '## 核心职责\n\n（描述该专家的核心职责与目标）\n\n## 工作流程\n\n1. \n2. \n3. \n\n## 行为准则\n\n- \n- \n\n## 工作目录与产物约定\n\n- 任务产出须落在当前工作目录内\n';
