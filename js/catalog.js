/** 平台技能与工具目录（Mock） */
window.SKILLS_CATALOG = [
  { id: 'skill-yield', name: '良率分析', category: '工艺制造', description: '产线良率统计、缺陷 pareto 与根因推断' },
  { id: 'skill-spc', name: 'SPC 统计', category: '质量管理', description: '控制图绘制、过程能力 Cpk 评估' },
  { id: 'skill-pm', name: '预测性维护', category: '设备运维', description: '设备振动/温度趋势分析与维护建议' },
  { id: 'skill-vision', name: '工业视觉', category: '智能算法', description: '质检图像识别与缺陷分类' },
  { id: 'skill-supply', name: '供应链规划', category: '供应链', description: '需求预测、安全库存与物料计划' },
  { id: 'skill-ehs', name: 'EHS 合规', category: '安全合规', description: '风险辨识、应急预案与合规检查' },
  { id: 'skill-integration', name: '系统集成', category: '数字化', description: 'MES/WMS/QMS 对接与数据治理' },
  { id: 'skill-energy', name: '能源审计', category: '能源环保', description: '能耗基线、节能改造方案' }
];

window.TOOLS_CATALOG = [
  { id: 'tool-mes', name: 'MES 数据查询', type: 'api', description: '读取产线实时产量与工单状态' },
  { id: 'tool-spc-api', name: 'SPC 计算服务', type: 'api', description: '上传测量数据返回控制图结果' },
  { id: 'tool-file', name: '文件读写', type: 'mcp', description: '专家资料与产物文件 CRUD' },
  { id: 'tool-web', name: '网页检索', type: 'mcp', description: '检索行业标准与公开技术文档' },
  { id: 'tool-db', name: '工业数据库', type: 'mcp', description: '只读访问工厂数据仓库' },
  { id: 'tool-notify', name: '消息通知', type: 'api', description: '向 IM 渠道推送任务进展' }
];

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
    label: '企业微信 (WeCom)',
    name: '企业微信',
    emoji: '💼',
    description: '企业微信 AI Bot，走 WebSocket 长连接，无需公网回调端点，适合内网/本地部署。',
    docsUrl: 'https://developer.work.weixin.qq.com/document/path/99510',
    credentialFields: [
      { key: 'WECOM_BOT_ID', label: 'Bot ID', description: '企业微信 AI Bot 的 bot_id（管理后台 → 智能机器人 → API 模式获取）。', required: true },
      { key: 'WECOM_SECRET', label: 'Secret', description: '企业微信 AI Bot 对应 secret。', password: true, required: true }
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
    id: 'dingtalk',
    label: '钉钉 (DingTalk)',
    name: '钉钉',
    emoji: '🐳',
    description: '钉钉企业内部应用，走 Stream Mode（WebSocket 长连接），无需公网回调端点。',
    docsUrl: 'https://open.dingtalk.com/document/orgapp/the-robot-development-process',
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
    label: '飞书 (Feishu/Lark)',
    name: '飞书',
    emoji: '🪽',
    description: '飞书 / Lark 企业自建应用，默认 WebSocket 长连接（推荐），可选 Webhook 模式。',
    docsUrl: 'https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/intro',
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

/** 用于凭据互斥校验的锁标识字段（对应 PRD §8.11.6 acquire_scoped_lock）。 */
window.IM_CHANNEL_LOCK_FIELDS = {
  wecom: 'WECOM_BOT_ID',
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

/** 工具参数预设 */
window.TOOL_PARAM_SCHEMAS = {
  'tool-mes': [
    { key: 'endpoint', label: 'API Endpoint', type: 'text', required: true, placeholder: 'https://mes.example.com/api' },
    { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    { key: 'timeout', label: '超时时间(秒)', type: 'number', default: 30, min: 5, max: 120 },
    { key: 'retries', label: '重试次数', type: 'number', default: 3, min: 0, max: 10 }
  ],
  'tool-spc-api': [
    { key: 'endpoint', label: 'API Endpoint', type: 'text', required: true, placeholder: 'https://spc.example.com/api' },
    { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    { key: 'timeout', label: '超时时间(秒)', type: 'number', default: 60, min: 10, max: 300 }
  ],
  'tool-file': [
    { key: 'serverUrl', label: 'MCP Server 地址', type: 'text', required: true, placeholder: 'http://localhost:8080/mcp' },
    { key: 'authType', label: '认证方式', type: 'select', options: ['无认证', 'Bearer Token', 'API Key'], default: '无认证' },
    { key: 'authToken', label: '认证凭证', type: 'password' }
  ],
  'tool-web': [
    { key: 'serverUrl', label: 'MCP Server 地址', type: 'text', required: true, placeholder: 'http://localhost:8081/mcp' },
    { key: 'maxResults', label: '最大结果数', type: 'number', default: 10, min: 1, max: 50 }
  ],
  'tool-db': [
    { key: 'connectionString', label: '连接字符串', type: 'text', required: true, placeholder: 'postgresql://user:pass@host:5432/db' },
    { key: 'readOnly', label: '只读模式', type: 'select', options: ['是', '否'], default: '是' },
    { key: 'maxRows', label: '最大返回行数', type: 'number', default: 1000, min: 100, max: 10000 }
  ],
  'tool-notify': [
    { key: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://hooks.example.com/notify' },
    { key: 'channel', label: '推送渠道', type: 'select', options: ['企业微信', '钉钉', '飞书', '邮件'], default: '企业微信' }
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

/** Hub 技能目录（Mock） */
window.SKILLS_HUB_CATALOG = [
  { id: 'hub-lean-manufacturing', name: '精益生产分析', category: '工艺制造', description: '价值流图分析、七大浪费识别与改善方案' },
  { id: 'hub-six-sigma', name: '六西格玛工具箱', category: '质量管理', description: 'DMAIC 流程、假设检验与过程能力分析' },
  { id: 'hub-digital-twin', name: '数字孪生仿真', category: '数字化', description: '产线仿真建模与节拍优化' },
  { id: 'hub-predictive-quality', name: '质量预测模型', category: '智能算法', description: '基于工艺参数的良率预测与异常预警' },
  { id: 'hub-lean-logistics', name: '精益物流规划', category: '供应链', description: '厂内物流路径优化与线边库存设计' },
  { id: 'hub-energy-optimization', name: '能效优化引擎', category: '能源环保', description: '能耗基线建模与节能策略推荐' },
  { id: 'hub-safety-risk', name: '安全风险图谱', category: '安全合规', description: 'JHA 分析与 LEC 风险评估' },
  { id: 'hub-mes-connector', name: 'MES 数据连接器', category: '数字化', description: '对接主流 MES 系统拉取工单与报工数据' }
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

/** Mock USER.md 文本 */
window.MOCK_USER_MD = '# 用户画像\n\n## 角色\n- 制造工艺工程师，负责良率提升与工艺优化\n\n## 沟通风格\n- 直接、简洁，偏好结论先行\n- 喜欢用表格和图表对比方案\n\n## 常用工具\n- MES 报表系统、JMP 统计分析、Minitab';

/** SOUL.md 模板 */
window.SOUL_MD_TEMPLATE = '## 核心职责\n\n（描述该专家的核心职责与目标）\n\n## 工作流程\n\n1. \n2. \n3. \n\n## 行为准则\n\n- \n- \n\n## 工作目录与产物约定\n\n- 任务产出须落在当前工作目录内\n';
