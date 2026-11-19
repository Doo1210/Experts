export const QUALITY_REPORT_CONTENT = `# 产线良率核对报告

统计周期：2026 年 10 月 8 日—10 月 9 日

统计范围：装配一车间成品检验记录

## 一、核对结论

本次共核对 10,000 件产品，其中合格 9,700 件、不合格 300 件，综合良率为 **97.0%**。10 月 9 日良率较前一日下降 **0.4 个百分点**，低于本次设定的 97.5% 管理目标，需优先复核尺寸偏差问题。

## 二、每日检验统计

| 日期 | 检验数量 | 合格数量 | 不合格数量 | 良率 |
| --- | --- | --- | --- | --- |
| 10 月 8 日 | 5,000 | 4,860 | 140 | 97.2% |
| 10 月 9 日 | 5,000 | 4,840 | 160 | 96.8% |
| 合计 | 10,000 | 9,700 | 300 | 97.0% |

两日检验数量相同，良率下降对应新增 20 件不合格品。统计口径均采用首次检验结果，返修后复检数据单独记录，未重复计入本表。

## 三、异常分布

| 异常类型 | 数量 | 占不合格品比例 | 核查重点 |
| --- | --- | --- | --- |
| 尺寸偏差 | 156 | 52% | 测量设备校准与工装定位 |
| 表面划伤 | 87 | 29% | 周转容器与装配防护 |
| 标识缺失 | 36 | 12% | 标签打印与出站检查 |
| 其他 | 21 | 7% | 按异常单逐项复核 |

尺寸偏差和表面划伤合计占不合格品的 **81%**，应作为本轮改善的重点。现阶段仍需结合设备记录、批次及班次信息核实原因。

## 四、处理计划

1. 质量组复核尺寸偏差记录，补齐设备编号、测点与原始示值，10 月 10 日完成。
2. 设备组检查量具校准有效期及工装定位状态，异常设备确认前暂停用于判定，10 月 10 日完成。
3. 生产组检查周转容器及工位防护，对易划伤环节增加隔离措施，10 月 11 日完成。
4. 班组长核对标识打印与出站确认记录，对缺失标识的产品逐件补核，10 月 11 日完成。

## 五、跟踪与验收

- 连续三个生产日按相同口径统计首次检验良率，目标不低于 97.5%。
- 尺寸偏差记录须能追溯至批次、设备和责任工位。
- 改善完成后由质量组抽样复核，确认结果后更新异常台账。
`;

export const QUALITY_SUMMARY_CONTENT = `# 质量核对摘要

## 核心指标

- 核对周期：2026 年 10 月 8 日—10 月 9 日。
- 检验数量：10,000 件；合格数量：9,700 件；综合良率：97.0%。
- 良率变化：由 97.2% 降至 96.8%，下降 0.4 个百分点。
- 重点异常：尺寸偏差 156 件，表面划伤 87 件，两项合计占不合格品的 81%。

## 下一步安排

质量组复核异常记录，设备组核查量具与工装，生产组完善周转防护。改善后连续跟踪三个生产日，按首次检验口径验证良率是否达到 97.5%。
`;

export function createBatchReport(index) {
  const batch = String(index + 1).padStart(2, "0");
  const inspected = 1000 + index * 80;
  const rejected = 18 + index * 3;
  const qualified = inspected - rejected;
  const dimensional = Math.ceil(rejected * 0.6);
  return `# 批次检验报告 ${batch}

批次编号：QC-20261118-${batch}

检验日期：2026 年 11 月 18 日

产品型号：ZX-42 传感器组件

## 检验结果

| 检验项目 | 结果 |
| --- | --- |
| 检验数量 | ${inspected} 件 |
| 合格数量 | ${qualified} 件 |
| 不合格数量 | ${rejected} 件 |
| 首次检验良率 | ${((qualified / inspected) * 100).toFixed(2)}% |

## 异常记录

- 尺寸偏差 ${dimensional} 件：隔离并复核测量设备与工装定位。
- 表面划伤 ${rejected - dimensional} 件：检查周转容器及装配防护。

## 处置安排

合格品完成标识核对后入库；不合格品转入待处理区，由质量组逐项登记复检结果。复检记录须保留批次编号、处理方式和确认人员。
`;
}

function replacementFor(name, content) {
  if (typeof content !== "string") return null;
  const text = content.replace(/\r\n?/g, "\n");
  if (
    (name === "报告.md" && text === "# 演示报告\n质量数据仅用于原型展示。") ||
    (name === "演示核对报告.md" && text === "# 演示核对报告\n仅供原型展示。")
  )
    return QUALITY_REPORT_CONTENT;
  if (
    name === "质量核对摘要.md" &&
    text === "# 质量核对摘要\n已核对演示良率样例。"
  )
    return QUALITY_SUMMARY_CONTENT;
  const batch = /^批次报告-(\d{2})\.md$/.exec(name || "");
  const number = batch ? Number(batch[1]) : 0;
  if (
    number >= 1 &&
    number <= 12 &&
    text === `# 批次报告 ${number}\n本文件仅用于演示多产出文件的浏览。`
  )
    return createBatchReport(number - 1);
  return null;
}

// Upgrade only exact bundled placeholders; leave edited files and real snapshots intact.
export function upgradeDemoFileSamples(saved) {
  const filesById = new Map();
  for (const expert of saved.experts || []) {
    for (const file of expert.files || []) {
      filesById.set(file.id, file);
      const content = replacementFor(file.name, file.content);
      if (content !== null) file.content = content;
    }
  }
  for (const conversation of saved.conversations || []) {
    for (const turn of conversation.turns || []) {
      for (const result of turn.results || []) {
        if (result.kind !== "file") continue;
        const name = result.name || filesById.get(result.fileId)?.name;
        const content = replacementFor(name, result.snapshotContent);
        if (content !== null) result.snapshotContent = content;
      }
    }
  }
}
