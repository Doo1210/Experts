import { describe, expect, it } from "vitest";
import {
  QUALITY_REPORT_CONTENT,
  QUALITY_SUMMARY_CONTENT,
  createBatchReport,
  upgradeDemoFileSamples,
} from "./file-demo-content";

describe("固定文件样例升级", () => {
  it("同时更新固定占位文件与对应回合快照，重复执行不会继续修改", () => {
    const saved = {
      experts: [
        {
          id: "quality",
          files: [
            {
              id: "report",
              name: "演示核对报告.md",
              content: "# 演示核对报告\n仅供原型展示。",
            },
            {
              id: "batch",
              name: "批次报告-02.md",
              content: "# 批次报告 2\n本文件仅用于演示多产出文件的浏览。",
            },
          ],
        },
      ],
      conversations: [
        {
          expertId: "quality",
          turns: [
            {
              results: [
                {
                  kind: "file",
                  fileId: "report",
                  snapshotContent: "# 演示核对报告\n仅供原型展示。",
                  versionId: "original-version",
                },
                {
                  kind: "file",
                  name: "质量核对摘要.md",
                  snapshotContent: "# 质量核对摘要\n已核对演示良率样例。",
                },
              ],
            },
          ],
        },
      ],
    };
    upgradeDemoFileSamples(saved);
    expect(saved.experts[0].files[0].content).toBe(QUALITY_REPORT_CONTENT);
    expect(saved.experts[0].files[1].content).toBe(createBatchReport(1));
    const results = saved.conversations[0].turns[0].results;
    expect(results[0]).toMatchObject({
      snapshotContent: QUALITY_REPORT_CONTENT,
      versionId: "original-version",
    });
    expect(results[1].snapshotContent).toBe(QUALITY_SUMMARY_CONTENT);
    const upgraded = JSON.stringify(saved);
    upgradeDemoFileSamples(saved);
    expect(JSON.stringify(saved)).toBe(upgraded);
  });

  it("保留用户修改、其他同名文件的正文及非文件结果", () => {
    const saved = {
      experts: [
        {
          files: [
            {
              name: "演示核对报告.md",
              content: "# 演示核对报告\n我已补充实际检查结果。",
            },
            {
              name: "自定义记录.md",
              content: "# 演示核对报告\n仅供原型展示。",
            },
            { name: "报告.md", content: "# 用户报告\n实际数据。" },
          ],
        },
      ],
      conversations: [
        {
          turns: [
            {
              results: [
                {
                  kind: "file",
                  name: "演示核对报告.md",
                  snapshotContent: "用户确认的历史版本",
                },
                {
                  kind: "note",
                  name: "演示核对报告.md",
                  snapshotContent: "# 演示核对报告\n仅供原型展示。",
                },
              ],
            },
          ],
        },
      ],
    };
    const original = JSON.stringify(saved);
    upgradeDemoFileSamples(saved);
    expect(JSON.stringify(saved)).toBe(original);
  });
});
