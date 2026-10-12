// 固定的项目演示场景。ID 不随刷新变化，便于对旧版浏览器数据做一次增量补齐。
export const PROJECT_FIXTURE_VERSION = 1;
const time = (day, hour, minute = 0) =>
  `2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+08:00`;

const task = (
  id,
  title,
  description,
  status,
  assigneeId,
  priority,
  extra = {},
) => ({
  id,
  title,
  description,
  status,
  assigneeId,
  priority,
  predecessorId: "",
  archived: false,
  createdAt: time(9, 9),
  ...extra,
});
const goal = (id, title, description, status, summary, extra = {}) => ({
  id,
  title,
  description,
  model: "系统默认",
  status,
  summary,
  archived: false,
  createdAt: time(8, 10),
  ...extra,
});
const activity = (id, text, category, createdAt) => ({
  id,
  text,
  category,
  createdAt,
});
const folder = (id, name, parentId = null) => ({
  id,
  name,
  parentId,
  kind: "folder",
  updatedAt: time(10, 9),
});
const textFile = (id, name, content, parentId = null, mime = "text/plain") => ({
  id,
  name,
  parentId,
  kind: "file",
  mime,
  content,
  size: new TextEncoder().encode(content).length,
  updatedAt: time(10, 10),
});
const expert = (id, name, description, tags, avatarUrl, responsibility) => ({
  id,
  name,
  description,
  tags,
  avatarUrl,
  status: "active",
  model: "通用大模型",
  persona: {
    responsibility,
    workflow: "明确目标 → 核对资料 → 分析问题 → 给出行动建议。",
    rules: "优先引用项目工作空间中的资料，结论明确标识为演示结果。",
  },
  presetEnabled: true,
  presetQuestions: [`请分析${name.replace("专家", "")}相关的问题`],
  memoryEnabled: true,
  learningEnabled: false,
  skills: [
    { id: `skill_${id}`, name: "资料分析", source: "内置", enabled: true },
  ],
  tools: [{ id: "tool_file", name: "文件工具", enabled: true }],
  mcps: [],
  channels: ["wecom", "dingtalk", "feishu"].map((channelId) => ({
    id: channelId,
    name: { wecom: "企业微信", dingtalk: "钉钉", feishu: "飞书" }[channelId],
    enabled: false,
    connected: false,
    proactive: false,
    files: false,
  })),
  workspaceRoot: `/专家/${name}`,
  files: [],
});

export const PROJECT_EXPERT_FIXTURES = [
  expert(
    "exp_equipment",
    "设备运维专家",
    "跟踪关键设备健康、故障原因与预防性维护计划",
    ["设备维护", "自动化"],
    "/experts/avatars/process-man.svg",
    "负责设备异常诊断、维护计划与停机风险评估。",
  ),
  expert(
    "exp_supply",
    "供应链规划专家",
    "分析需求预测、物料计划与供应商协同问题",
    ["供应链", "计划协同"],
    "/experts/avatars/supply-woman.svg",
    "负责供应链计划、库存与交付风险分析。",
  ),
  expert(
    "exp_energy",
    "能源管理专家",
    "梳理工厂能耗、碳排数据与节能改造方案",
    ["能源审计", "节能降碳"],
    "/experts/avatars/energy-man.svg",
    "负责能耗基线、异常识别和节能措施评估。",
  ),
];

export const FACTORY_EXTRAS = {
  tasks: [
    task(
      "factory_etch",
      "蚀刻设备参数复核",
      "核对 3 号腔体温度与清洁周期",
      "todo",
      "exp_equipment",
      "high",
      { predecessorId: "card_1" },
    ),
    task(
      "factory_spc",
      "SPC 控制图更新",
      "按最新批次更新关键工序控制界限",
      "ready",
      "exp_quality",
      "high",
    ),
    task(
      "factory_sampling",
      "复测抽样方案",
      "确定异常批次复测范围与样本量",
      "todo",
      "exp_ops",
      "medium",
    ),
    task(
      "factory_fdc",
      "FDC 告警规则梳理",
      "梳理近期高频告警与误报场景",
      "doing",
      "exp_equipment",
      "medium",
    ),
    task(
      "factory_root",
      "颗粒污染原因分析",
      "对比设备维护、清洁和量测记录",
      "doing",
      "exp_quality",
      "high",
    ),
    task(
      "factory_mes",
      "MES 数据接口权限",
      "接口权限待开通，无法获取完整批次履历",
      "paused",
      "exp_equipment",
      "high",
      { blockedReason: "MES API 权限待 IT 开通" },
    ),
    task(
      "factory_overlay",
      "光刻偏差复核",
      "等待量测设备重新校准后复核",
      "paused",
      "exp_quality",
      "medium",
      { blockedReason: "量测设备校准记录待更新" },
    ),
    task(
      "factory_baseline",
      "良率基线分析",
      "已识别蚀刻段波动对良率的影响",
      "done",
      "exp_quality",
      "high",
      { result: "蚀刻段贡献约 42% 的波动" },
    ),
    task(
      "factory_minutes",
      "项目站会纪要",
      "整理跨专家站会决议和负责人",
      "done",
      "exp_ops",
      "low",
      { result: "纪要已整理到工作空间" },
    ),
    task(
      "factory_archive",
      "初期数据摸底",
      "完成首轮异常批次数据收集",
      "done",
      "exp_quality",
      "low",
      { archived: true, result: "首轮数据已归档" },
    ),
  ],
  goals: [
    goal(
      "goal_factory_root",
      "定位蚀刻段良率波动根因",
      "结合 SPC、FDC 和设备记录定位根因",
      "ready",
      "演示拆解已完成，生成两项看板任务。",
      {
        generatedTaskIds: ["factory_etch", "factory_root"],
        createdAt: time(9, 10),
      },
    ),
    goal(
      "goal_factory_failed",
      "评估量测设备健康状态",
      "评估近期量测偏差是否与校准周期有关",
      "failed",
      "拆解失败：请补充设备范围和验收标准后重试。",
      { createdAt: time(7, 15) },
    ),
  ],
  activity: [
    activity(
      "activity_factory_1",
      "质量分析专家完成了「良率基线分析」",
      "task",
      time(10, 8, 40),
    ),
    activity(
      "activity_factory_2",
      "设备运维专家标记「MES 数据接口权限」需介入",
      "task",
      time(10, 8, 10),
    ),
    activity(
      "activity_factory_3",
      "发起了目标「定位蚀刻段良率波动根因」",
      "project",
      time(9, 10),
    ),
    activity(
      "activity_factory_4",
      "设备运维专家加入了项目",
      "project",
      time(9, 9, 20),
    ),
  ],
  files: [
    folder("factory_folder_data", "原始数据"),
    folder("factory_folder_report", "分析报告"),
    textFile(
      "factory_file_readme",
      "项目说明.md",
      "# 工厂质量提升\n\n本项目聚焦试点产线良率波动。所有内容均为演示数据。\n\n目标：识别异常来源，跟进跨专家改进措施。",
      null,
      "text/markdown",
    ),
    textFile(
      "factory_file_yield",
      "产线良率样例.csv",
      "日期,产线,良率\n2026-10-08,试点产线,97.2%\n2026-10-09,试点产线,96.8%\n2026-10-10,试点产线,97.5%",
      "factory_folder_data",
      "text/csv",
    ),
    textFile(
      "factory_file_findings",
      "根因分析摘要.md",
      "# 根因分析摘要\n\n- 蚀刻段参数出现波动。\n- 需复核设备清洁周期与 FDC 告警。\n- 结论仅用于前端演示。",
      "factory_folder_report",
      "text/markdown",
    ),
  ],
};

export const EXTRA_PROJECT_FIXTURES = [
  {
    id: "proj_supply",
    name: "供应链数字化规划",
    description: "打通需求预测、物料计划和交付风险看板",
    icon: "📊",
    updatedAt: time(10, 9, 30),
    members: ["exp_supply", "exp_ops", "exp_quality"],
    goals: [
      goal(
        "goal_supply_1",
        "建立重点物料交付预警机制",
        "整合需求预测、库存和供应商交期数据",
        "ready",
        "已生成需求梳理与预警规则任务。",
        { generatedTaskIds: ["supply_forecast", "supply_alert"] },
      ),
      goal(
        "goal_supply_2",
        "提升试点工厂准时交付率",
        "识别关键物料缺口并形成跨工厂协同计划",
        "planned",
        "尚未发起拆解。",
      ),
    ],
    tasks: [
      task(
        "supply_forecast",
        "梳理需求预测口径",
        "统一销售预测与生产计划的统计口径",
        "ready",
        "exp_supply",
        "high",
      ),
      task(
        "supply_inventory",
        "建立安全库存清单",
        "列出 A 类物料库存下限与补货周期",
        "todo",
        "exp_supply",
        "medium",
      ),
      task(
        "supply_supplier",
        "供应商交期核对",
        "确认重点供应商未来两周的交付承诺",
        "todo",
        "exp_ops",
        "medium",
      ),
      task(
        "supply_alert",
        "交付预警规则设计",
        "定义延期风险等级和通知阈值",
        "doing",
        "exp_supply",
        "high",
      ),
      task(
        "supply_dashboard",
        "物料风险看板草图",
        "绘制库存、缺口和交期的汇总视图",
        "doing",
        "exp_quality",
        "medium",
      ),
      task(
        "supply_erp",
        "ERP 字段映射",
        "等待主数据字段说明确认",
        "paused",
        "exp_supply",
        "high",
        { blockedReason: "主数据字段说明待业务确认" },
      ),
      task(
        "supply_scope",
        "试点工厂范围确认",
        "已明确首期两家试点工厂",
        "done",
        "exp_ops",
        "low",
        { result: "首期纳入 A、B 两家工厂" },
      ),
      task(
        "supply_kpi",
        "交付指标基线",
        "已汇总最近三个月准时交付数据",
        "done",
        "exp_supply",
        "medium",
        { result: "准时交付率基线 92.4%" },
      ),
    ],
    activity: [
      activity(
        "activity_supply_1",
        "供应链规划专家完成了「交付指标基线」",
        "task",
        time(10, 9, 10),
      ),
      activity(
        "activity_supply_2",
        "发起了目标「建立重点物料交付预警机制」",
        "project",
        time(9, 14),
      ),
      activity(
        "activity_supply_3",
        "运营策划专家加入了项目",
        "project",
        time(8, 10),
      ),
    ],
    files: [
      folder("supply_folder_data", "计划数据"),
      textFile(
        "supply_file_readme",
        "规划说明.md",
        "# 供应链数字化规划\n\n试点范围：两家工厂、A 类物料。\n本文件为演示资料。",
        null,
        "text/markdown",
      ),
      textFile(
        "supply_file_inventory",
        "重点物料库存.csv",
        "物料,当前库存,安全库存,交期天数\nM-101,350,500,12\nM-205,880,600,7\nM-330,120,300,15",
        "supply_folder_data",
        "text/csv",
      ),
    ],
  },
  {
    id: "proj_energy",
    name: "园区能耗优化",
    description: "识别高耗能环节，制定分阶段节能改造计划",
    icon: "⚡",
    updatedAt: time(9, 17, 20),
    members: ["exp_energy", "exp_equipment", "exp_quality"],
    goals: [
      goal(
        "goal_energy_1",
        "建立园区能耗基线",
        "按车间和设备统计电、水、气消耗",
        "ready",
        "已完成基线数据整理。",
        { generatedTaskIds: ["energy_meter", "energy_baseline"] },
      ),
      goal(
        "goal_energy_2",
        "降低空压站峰时能耗",
        "分析空压站负载与泄漏损失",
        "planned",
        "待补充改造约束。",
      ),
    ],
    tasks: [
      task(
        "energy_meter",
        "采集分项计量数据",
        "汇总近 90 天电、水、气读数",
        "ready",
        "exp_energy",
        "high",
      ),
      task(
        "energy_audit",
        "空压站泄漏排查",
        "按班次检查泄漏点和压力曲线",
        "todo",
        "exp_equipment",
        "medium",
      ),
      task(
        "energy_peak",
        "峰谷电价策略评估",
        "模拟设备移峰运行的节费空间",
        "doing",
        "exp_energy",
        "medium",
      ),
      task(
        "energy_sensor",
        "能耗传感器校验",
        "部分计量点离线，等待设备检修",
        "paused",
        "exp_equipment",
        "high",
        { blockedReason: "车间 2 号电表通信异常" },
      ),
      task(
        "energy_baseline",
        "月度能耗基线报告",
        "已形成分车间能源强度基线",
        "done",
        "exp_energy",
        "high",
        { result: "空压站约占园区用电 18%" },
      ),
      task(
        "energy_scope",
        "节能项目范围确认",
        "确认首期改造范围和预算口径",
        "done",
        "exp_quality",
        "low",
        { result: "首期聚焦空压站和照明" },
      ),
    ],
    activity: [
      activity(
        "activity_energy_1",
        "能源管理专家完成了「月度能耗基线报告」",
        "task",
        time(9, 16),
      ),
      activity(
        "activity_energy_2",
        "设备运维专家标记「能耗传感器校验」需介入",
        "task",
        time(9, 11),
      ),
      activity(
        "activity_energy_3",
        "发起了目标「建立园区能耗基线」",
        "project",
        time(8, 10),
      ),
    ],
    files: [
      folder("energy_folder_reports", "能耗报告"),
      textFile(
        "energy_file_readme",
        "节能试点说明.md",
        "# 园区能耗优化\n\n目标：建立基线并识别高耗能环节。\n数据均为演示样例。",
        null,
        "text/markdown",
      ),
      textFile(
        "energy_file_meter",
        "月度能耗.csv",
        "月份,电量kWh,水量m3,天然气m3\n2026-07,812000,15300,9200\n2026-08,798000,14900,8800\n2026-09,775000,14600,8500",
        "energy_folder_reports",
        "text/csv",
      ),
    ],
  },
  {
    id: "proj_maintenance",
    name: "关键设备预防性维护",
    description: "建立设备健康评分和停机风险处置流程",
    icon: "🔧",
    updatedAt: time(8, 15, 40),
    members: ["exp_equipment", "exp_quality", "exp_energy"],
    goals: [
      goal(
        "goal_maintenance_1",
        "降低关键设备非计划停机",
        "针对高风险机台建立巡检和预警机制",
        "ready",
        "已拆解巡检和评分任务。",
        { generatedTaskIds: ["maintenance_check", "maintenance_score"] },
      ),
    ],
    tasks: [
      task(
        "maintenance_check",
        "关键机台巡检清单",
        "整理设备点检项与巡检频率",
        "ready",
        "exp_equipment",
        "high",
      ),
      task(
        "maintenance_parts",
        "备件缺口复核",
        "核对高故障率备件安全库存",
        "todo",
        "exp_equipment",
        "medium",
      ),
      task(
        "maintenance_score",
        "设备健康评分规则",
        "结合故障、点检和运行时长计算评分",
        "doing",
        "exp_quality",
        "high",
      ),
      task(
        "maintenance_signal",
        "振动传感器接入",
        "接入过程受网关兼容性影响",
        "paused",
        "exp_equipment",
        "medium",
        { blockedReason: "采集网关固件待升级" },
      ),
      task(
        "maintenance_history",
        "历史故障分类",
        "归纳近半年停机原因与修复时长",
        "done",
        "exp_quality",
        "medium",
        { result: "完成 43 条历史故障分类" },
      ),
    ],
    activity: [
      activity(
        "activity_maintenance_1",
        "质量分析专家完成了「历史故障分类」",
        "task",
        time(8, 15),
      ),
      activity(
        "activity_maintenance_2",
        "设备运维专家发起了维护目标",
        "project",
        time(7, 10),
      ),
    ],
    files: [
      folder("maintenance_folder_records", "巡检记录"),
      textFile(
        "maintenance_file_readme",
        "设备维护说明.md",
        "# 关键设备预防性维护\n\n演示设备：蚀刻机、空压机、量测机台。",
        null,
        "text/markdown",
      ),
      textFile(
        "maintenance_file_checks",
        "巡检清单.csv",
        "设备,巡检项,频率\n蚀刻机,温度与压力,每日\n空压机,振动与油位,每日\n量测机台,校准状态,每周",
        "maintenance_folder_records",
        "text/csv",
      ),
    ],
  },
];

const addMissingById = (target, fixtures) => {
  const existing = new Set(target.map((item) => item.id));
  fixtures.forEach((item) => {
    if (!existing.has(item.id)) target.push(JSON.parse(JSON.stringify(item)));
  });
};

export function enrichProjectFixtures(data) {
  if (data.projectFixtureVersion === PROJECT_FIXTURE_VERSION) return data;
  addMissingById(data.experts, PROJECT_EXPERT_FIXTURES);
  const factory = data.projects.find(
    (project) => project.id === "proj_factory",
  );
  if (factory) {
    const defaultMembers =
      factory.members.length === 2 &&
      factory.members.includes("exp_quality") &&
      factory.members.includes("exp_ops");
    if (defaultMembers) factory.members.push("exp_equipment");
    const compatibleTasks = FACTORY_EXTRAS.tasks.map((item) => ({
      ...item,
      assigneeId: factory.members.includes(item.assigneeId)
        ? item.assigneeId
        : factory.members[0] || "",
    }));
    for (const key of ["tasks", "goals", "activity", "files"]) {
      if (!Array.isArray(factory[key])) factory[key] = [];
      addMissingById(
        factory[key],
        key === "tasks" ? compatibleTasks : FACTORY_EXTRAS[key],
      );
    }
    if (!factory.updatedAt) factory.updatedAt = time(10, 8, 50);
  }
  addMissingById(data.projects, EXTRA_PROJECT_FIXTURES);
  data.projectFixtureVersion = PROJECT_FIXTURE_VERSION;
  return data;
}
