import { describe, expect, it } from "vitest";
import {
  createEventTaskFixtures,
  createEventWorkspaceItems,
} from "./event-task-fixtures";

describe("自主任务固定场景", () => {
  it("覆盖事件中心五种事件源类型及图示来源摘要", () => {
    const quality = createEventTaskFixtures().filter(
      (event) => event.expertId === "exp_quality",
    );
    expect(quality.map((event) => event.trigger)).toEqual([
      "Timer",
      "Pulsar",
      "WebHook",
      "WebHook",
      "Kafka",
      "MQTT",
    ]);
    expect(quality.map((event) => event.sourceSummary)).toEqual([
      "每日 08:30",
      "industrial/smt/stop_code",
      "POST /webhook/github/commit",
      "POST /webhook/orders/update",
      "iot.sensor.data · 2 brokers",
      "factory/line1/+/telemetry",
    ]);
    expect(quality[0].runs[0].process).toHaveLength(3);
    expect(quality.at(-1).runs[0].status).toBe("running");
    expect(
      quality.filter((event) =>
        event.runs.some((run) => run.status === "running"),
      ),
    ).toHaveLength(3);
  });

  it("执行产物可定位到该动作与执行记录的目录", () => {
    const events = createEventTaskFixtures();
    const files = createEventWorkspaceItems(events);
    const output = files.find(
      (item) => item.id === "f_im_file_event_daily_report",
    );
    expect(output.content).toContain("早班开机检查");
    const outputFolder = files.find((item) => item.id === output.parentId);
    const runFolder = files.find((item) => item.id === outputFolder.parentId);
    expect([outputFolder.name, runFolder.name]).toEqual([
      "生成文件",
      "run_daily_20261028",
    ]);
  });
});
