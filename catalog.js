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

window.IM_CHANNEL_TYPES = [
  { id: 'wecom', label: '企业微信' },
  { id: 'dingtalk', label: '钉钉' },
  { id: 'feishu', label: '飞书' }
];

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
