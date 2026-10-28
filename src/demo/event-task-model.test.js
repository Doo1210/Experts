import { describe, expect, it } from "vitest";
import { createEventTaskFixtures } from "./event-task-fixtures";
import { EVENT_SOURCE_TYPES, filterEventTasks } from "./event-task-model";

describe("自主任务来源筛选", () => {
  const events = createEventTaskFixtures().filter(
    (event) => event.expertId === "exp_quality",
  );

  it("触发源选择覆盖事件中心类型，WebHook 可筛出两张卡", () => {
    expect(EVENT_SOURCE_TYPES).toEqual([
      "Timer",
      "WebHook",
      "Kafka",
      "MQTT",
      "Pulsar",
    ]);
    expect(filterEventTasks(events, { sourceType: "WebHook" })).toHaveLength(2);
  });

  it("名称搜索与类型筛选联用，内部 ID 不作为名称命中", () => {
    expect(
      filterEventTasks(events, {
        sourceType: "WebHook",
        keyword: " github ",
      }).map((event) => event.id),
    ).toEqual(["evt_webhook_git"]);
    expect(filterEventTasks(events, { keyword: "evt_webhook_git" })).toEqual(
      [],
    );
    expect(
      filterEventTasks(events, { sourceType: "MQTT", keyword: "GitHub" }),
    ).toEqual([]);
  });

  it("自定义显示名称与来源名称均可检索", () => {
    const renamed = { ...events[0], displayName: "早班巡检" };
    expect(filterEventTasks([renamed], { keyword: "早班巡检" })).toHaveLength(1);
    expect(filterEventTasks([renamed], { keyword: renamed.name })).toHaveLength(1);
  });
});
