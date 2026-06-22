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

/** Hermes Profile toolset 中文标签（只读 UI，非 Mock 绑定源） */
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
    id: 'dingtalk',
    label: '钉钉',
    name: '钉钉',
    description: '通过钉钉 Stream Mode 接入群聊与私聊，无需公网回调地址。',
    docsUrl: 'https://open.dingtalk.com/document/orgapp/the-robot-development-process',
    credentialFields: [
      { key: 'DINGTALK_CLIENT_ID', label: 'AppKey (Client ID)', description: '钉钉应用凭证中的 AppKey。', required: true },
      { key: 'DINGTALK_CLIENT_SECRET', label: 'AppSecret (Client Secret)', description: '钉钉应用凭证中的 AppSecret。', password: true, required: true }
    ]
  },
  {
    id: 'feishu',
    label: '飞书 / Lark',
    name: '飞书 / Lark',
    description: '通过飞书 / Lark 机器人接入消息，可使用 WebSocket 或 Webhook 模式。',
    docsUrl: 'https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/intro',
    credentialFields: [
      { key: 'FEISHU_APP_ID', label: 'App ID', description: '飞书 / Lark 应用的 App ID。', required: true },
      { key: 'FEISHU_APP_SECRET', label: 'App Secret', description: '飞书 / Lark 应用的 App Secret。', password: true, required: true },
      { key: 'FEISHU_DOMAIN', label: 'Domain', description: '国内飞书填 feishu，国际 Lark 填 lark，默认 feishu。' },
      { key: 'FEISHU_CONNECTION_MODE', label: '连接模式', description: 'websocket 或 webhook，默认 websocket。' },
      { key: 'FEISHU_ALLOWED_USERS', label: '允许用户 ID', description: '逗号分隔；留空时可使用配对或开放策略。' },
      { key: 'FEISHU_HOME_CHANNEL', label: 'Home Chat ID', description: '定时任务与通知投递的默认会话 ID。' },
      { key: 'FEISHU_VERIFICATION_TOKEN', label: 'Webhook Verification Token', description: 'Webhook 模式签名校验字段，和 Encrypt Key 至少配置一个。', password: true },
      { key: 'FEISHU_ENCRYPT_KEY', label: 'Webhook Encrypt Key', description: 'Webhook 模式事件加密密钥，和 Verification Token 至少配置一个。', password: true }
    ]
  },
  {
    id: 'wecom',
    label: '企业微信 AI Bot',
    name: '企业微信 AI Bot',
    description: '通过企业微信智能机器人 WebSocket 接入，无需公网回调地址。',
    docsUrl: 'https://developer.work.weixin.qq.com/document/path/91770',
    credentialFields: [
      { key: 'WECOM_BOT_ID', label: 'Bot ID', description: '企业微信 AI Bot 的 Bot ID。', required: true },
      { key: 'WECOM_SECRET', label: 'Secret', description: '企业微信 AI Bot 的 Secret。', password: true, required: true },
      { key: 'WECOM_ALLOWED_USERS', label: '允许用户 ID', description: '逗号分隔；用于限制可访问用户。' },
      { key: 'WECOM_HOME_CHANNEL', label: 'Home Chat ID', description: '定时任务与通知投递的默认会话 ID。' },
      { key: 'WECOM_DM_POLICY', label: '私聊策略', description: 'open、allowlist、disabled 或 pairing。' },
      { key: 'WECOM_GROUP_POLICY', label: '群聊策略', description: 'open、allowlist 或 disabled。' },
      { key: 'WECOM_WEBSOCKET_URL', label: 'WebSocket URL', description: '高级项；默认 wss://openws.work.weixin.qq.com。' }
    ]
  },
  {
    id: 'wecom_callback',
    label: '企业微信自建应用',
    name: '企业微信自建应用',
    description: '通过企业微信自建应用回调接入，适合需要双向消息和企业应用身份的场景。',
    docsUrl: 'https://developer.work.weixin.qq.com/document/path/90930',
    credentialFields: [
      { key: 'WECOM_CALLBACK_CORP_ID', label: 'Corp ID', description: '企业微信企业 ID。', required: true },
      { key: 'WECOM_CALLBACK_CORP_SECRET', label: 'Corp Secret', description: '自建应用 Secret。', password: true, required: true },
      { key: 'WECOM_CALLBACK_AGENT_ID', label: 'Agent ID', description: '自建应用 Agent ID。', required: true },
      { key: 'WECOM_CALLBACK_TOKEN', label: 'Callback Token', description: '接收消息服务器配置中的 Token。', password: true },
      { key: 'WECOM_CALLBACK_ENCODING_AES_KEY', label: 'EncodingAESKey', description: '接收消息服务器配置中的 EncodingAESKey。', password: true },
      { key: 'WECOM_CALLBACK_PORT', label: '回调服务端口', description: '本地 HTTP 回调服务端口，默认 8645。' },
      { key: 'WECOM_CALLBACK_ALLOWED_USERS', label: '允许用户 ID', description: '逗号分隔；用于限制可访问用户。' }
    ]
  }
];

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
  dingtalk: '🔷',
  feishu: '🐦',
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
