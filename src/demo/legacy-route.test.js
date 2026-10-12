import { describe, expect, it } from "vitest";
import { legacyLocation } from "./legacy-route";

describe("原型深链兼容", () => {
  it("保留专家和项目的查询参数", () => {
    expect(legacyLocation("#/experts?tab=template")).toBe("/?tab=template");
    expect(legacyLocation("#/experts/exp_1?tab=workspace")).toBe(
      "/exp_1?tab=workspace",
    );
    expect(legacyLocation("#/projects/proj_1?tab=board")).toBe(
      "/projects/proj_1?tab=board",
    );
  });
  it("将原型任务链接映射到当前会话路由", () => {
    expect(legacyLocation("#/experts/exp_1/tasks/conv_2")).toBe(
      "/exp_1/chat?conv=conv_2",
    );
    expect(legacyLocation("#/experts/exp_1/tasks")).toBe("/exp_1/chat");
    expect(legacyLocation("#/experts/new")).toBe("/?create=1");
  });
});
