const run = (id, at, input, reply, process, options = {}) => ({
  id,
  at,
  input,
  reply,
  process: process.map((item, index) => ({
    id: `${id}-process-${index + 1}`,
    role: item.title ? "tool" : "notice",
    ...item,
  })),
  status: options.status || "success",
  durationMs: options.durationMs ?? 48000,
  summary: options.summary || reply || "正在处理事件数据",
  outputs: options.outputs || [],
});

export function createEventTaskFixtures() {
  const events = [
    {
      id: "evt_daily",
      name: "每日早班开机状态确认",
      trigger: "Timer",
      sourceSummary: "每日 08:30",
      instruction: "核对早班设备开机状态，汇总异常和处理建议。",
      runs: [
        run(
          "run_daily_20261028",
          "2026-10-28T08:30:00+08:00",
          "定时触发：核对今日早班设备开机状态。",
          "全部关键设备已完成开机检查；工位 8 相机标定建议复核。",
          [
            { content: "已收到早班巡检计划。" },
            {
              title: "读取设备状态",
              content: "已核对 12 台关键设备的开机记录。",
            },
            { title: "核对质量日报", content: "工位 8 的标定记录需要复核。" },
          ],
          {
            durationMs: 76000,
            outputs: [
              {
                id: "event_daily_report",
                fileName: "早班开机检查.md",
                direction: "generated",
                content:
                  "# 早班开机检查\n\n12 台关键设备已完成检查。工位 8 相机标定待复核。",
              },
            ],
          },
        ),
        run(
          "run_daily_20261027",
          "2026-10-27T08:30:00+08:00",
          "定时触发：检查昨日早班开机记录。",
          "昨日关键设备均按计划开机，无新增异常。",
          [{ title: "读取设备状态", content: "已核对昨日开机记录。" }],
        ),
      ],
    },
    {
      id: "evt_pulsar_quality",
      name: "SMT贴片机停机信号订阅",
      trigger: "Pulsar",
      sourceSummary: "industrial/smt/stop_code",
      instruction: "分析停机码及前后设备状态。",
      runs: [
        run(
          "run_pulsar_live",
          "2026-10-28T15:15:00+08:00",
          "收到停机事件：设备 SMT-06，停机码 E207。",
          "",
          [
            { content: "已接收停机信号，正在核对设备状态。" },
            { title: "读取停机记录", content: "已读取同设备近期停机记录。" },
          ],
          { status: "running", durationMs: null },
        ),
        run(
          "run_pulsar_01",
          "2026-10-28T10:16:00+08:00",
          "收到停机事件：设备 SMT-04，停机码 E204。",
          "停机码 E204 对应供料器异常，建议先检查供料器安装与物料余量。",
          [
            { content: "已识别设备与停机码。" },
            {
              title: "检索停机记录",
              content: "已找到同设备近七天的两条相似记录。",
            },
          ],
          { durationMs: 34000 },
        ),
      ],
    },
    {
      id: "evt_webhook_git",
      name: "GitHub 代码提交通知",
      trigger: "WebHook",
      sourceSummary: "POST /webhook/github/commit",
      instruction: "检查提交摘要并提示需要复核的变更。",
      runs: [
        run(
          "run_git_01",
          "2026-10-28T12:05:00+08:00",
          "收到代码提交事件：质量看板修复指标计算。",
          "提交涉及良率计算口径，建议补充边界样例并复核回归结果。",
          [
            {
              title: "核对提交摘要",
              content: "已读取提交说明与变更文件清单。",
            },
          ],
          { durationMs: 51000 },
        ),
      ],
    },
    {
      id: "evt_webhook_order",
      name: "订单状态更新 WebHook",
      trigger: "WebHook",
      sourceSummary: "POST /webhook/orders/update",
      instruction: "核验订单状态变化并输出处理建议。",
      runs: [
        run(
          "run_order_01",
          "2026-10-28T13:42:00+08:00",
          "收到订单事件：工单 PO-2208 状态变更为待交付。",
          "该订单已进入待交付，建议核对库存与发运计划。",
          [
            {
              title: "读取订单记录",
              content: "已核对订单当前状态与变更时间。",
            },
            {
              title: "检查库存摘要",
              content: "关键物料库存满足本次交付需求。",
            },
          ],
          { durationMs: 42000 },
        ),
      ],
    },
    {
      id: "evt_kafka_sensor",
      name: "设备传感器数据流",
      trigger: "Kafka",
      sourceSummary: "iot.sensor.data · 2 brokers",
      instruction: "分析传感器异常并给出巡检建议。",
      runs: [
        run(
          "run_kafka_live",
          "2026-10-28T15:18:00+08:00",
          "收到传感器事件：工位 5 温度持续升高。",
          "",
          [
            { content: "已校验传感器事件，正在比对温度趋势。" },
            { title: "读取近期数据", content: "已读取最近十分钟的上报记录。" },
          ],
          { status: "running", durationMs: null },
        ),
        run(
          "run_kafka_01",
          "2026-10-28T14:05:00+08:00",
          "收到传感器事件：工位 3 温度 82°C。",
          "温度高于样例阈值，建议检查冷却回路并复测工位 3。",
          [
            { content: "已读取传感器事件并完成字段校验。" },
            { title: "对照近期温度", content: "近三次上报呈持续升高趋势。" },
          ],
          { durationMs: 28000 },
        ),
      ],
    },
    {
      id: "evt_mqtt_telemetry",
      name: "产线设备温湿度上报",
      trigger: "MQTT",
      sourceSummary: "factory/line1/+/telemetry",
      instruction: "分析产线温湿度遥测变化。",
      runs: [
        run(
          "run_mqtt_01",
          "2026-10-28T14:32:00+08:00",
          "收到遥测事件：一号产线湿度 72%。",
          "",
          [
            { content: "已接收遥测数据，正在比对近期趋势。" },
            {
              title: "读取环境记录",
              content: "已读取最近一小时的温湿度样例。",
            },
          ],
          { status: "running", durationMs: null, summary: "正在分析遥测变化" },
        ),
      ],
    },
  ];
  return [
    ...events.map((event) => ({
      expertId: "exp_quality",
      enabled: true,
      sourceName: event.name,
      branch: "默认分支",
      delivery: "仅产品内",
      cwd: `自主任务/${event.id}`,
      updatedAt: event.runs[0]?.at || null,
      ...event,
      runs: event.runs.map((item) => ({
        ...item,
        outputs: item.outputs.map((output) => ({
          ...output,
          fileDirectory: `自主任务/${event.id}/runs/${item.id}/生成文件`,
        })),
      })),
    })),
    {
      id: "evt_alert",
      expertId: "exp_ops",
      name: "运营异常提醒",
      trigger: "WebHook",
      sourceSummary: "POST /webhook/operations/alert",
      sourceName: "运营异常提醒",
      instruction: "核对运营异常并提醒责任人。",
      enabled: false,
      cwd: "自主任务/evt_alert",
      runs: [],
    },
  ];
}

export function createEventWorkspaceItems(events = createEventTaskFixtures()) {
  const items = [];
  for (const event of events) {
    const rootId =
      event.expertId === "exp_ops" ? "f_ops_event" : "f_quality_event";
    const eventId = `f_event_${event.id}`;
    items.push({
      id: eventId,
      name: event.id,
      parentId: rootId,
      kind: "folder",
    });
    for (const execution of event.runs || []) {
      const runsId = `f_event_runs_${event.id}`;
      if (!items.some((item) => item.id === runsId))
        items.push({
          id: runsId,
          name: "runs",
          parentId: eventId,
          kind: "folder",
        });
      const runId = `f_event_run_${execution.id}`;
      items.push({
        id: runId,
        name: execution.id,
        parentId: runsId,
        kind: "folder",
      });
      for (const output of execution.outputs || []) {
        const outputId = `f_event_outputs_${execution.id}`;
        if (!items.some((item) => item.id === outputId))
          items.push({
            id: outputId,
            name: "生成文件",
            parentId: runId,
            kind: "folder",
          });
        items.push({
          id: `f_im_file_${output.id}`,
          name: output.fileName,
          parentId: outputId,
          kind: "file",
          content: output.content,
        });
      }
    }
  }
  return items;
}
