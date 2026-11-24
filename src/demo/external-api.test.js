import { describe, expect, it } from "vitest";
import { createExternalApiFixtures } from "./external-api-fixtures";
import {
  apiConversationsForResults,
  apiKeyStatus,
  filterApiRuns,
  recentApiDateRange,
} from "./external-api";

const today = new Date(2026, 10, 24, 14);
const fixtures = createExternalApiFixtures(today);
const {
  externalApiKeys: keys,
  externalApiRuns: runs,
  externalApiConversations: conversations,
} = fixtures;

describe("专家 API 调用", () => {
  it("历史 Key 筛选按提交凭证命中单轮，同时会话仍包含其他 Key 提交的轮次", () => {
    const oldKey = { ...keys[1], deletedAt: today.toISOString() };
    const result = filterApiRuns(runs, {
      keyId: oldKey.id,
      status: "completed",
      range: recentApiDateRange(today),
    });
    const groups = apiConversationsForResults(conversations, runs, result);

    expect(apiKeyStatus(oldKey)).toBe("已删除");
    expect(result.map((run) => run.id)).toEqual([runs[0].id]);
    expect(groups).toHaveLength(1);
    expect(groups[0].runs).toHaveLength(18);
    expect(groups[0].runs[0].id).toBe(runs[0].id);
    expect(groups[0].runs.slice(-3).map((run) => run.id)).toEqual([
      runs[2].id,
      runs[3].id,
      runs[5].id,
    ]);
    expect([...groups[0].matchedIds]).toEqual([runs[0].id]);
    expect(groups[0].latest.status).toBe("queued");
  });

  it("支持按两种标识搜索并与状态、日期共同生效", () => {
    const range = ["2026-11-24", "2026-11-24"];

    expect(
      filterApiRuns(runs, {
        search: conversations[1].id.toUpperCase(),
        status: "running",
        range,
      }),
    ).toEqual([runs[4]]);
    expect(filterApiRuns(runs, { search: runs[3].id, range })).toEqual([
      runs[3],
    ]);
    expect(
      filterApiRuns(runs, {
        search: runs[3].id,
        range: ["2026-11-23", "2026-11-23"],
      }),
    ).toEqual([]);
  });
});
