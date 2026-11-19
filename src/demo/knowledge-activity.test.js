import { describe, expect, it } from "vitest";
import KnowledgeActivityDetail from "./components/KnowledgeActivityDetail.vue";
import { knowledgeEvidenceSummary } from "./knowledge-activity";
import { knowledgeDemoScenes } from "./knowledge-activity-scenes";

const evidence = knowledgeDemoScenes.get("演示工具：检索知识").runs[0].evidence;
const summary = (items) =>
  KnowledgeActivityDetail.computed.returnedSummary.call({
    activity: { evidence: items },
  });

describe("完成检索的返回数量统计", () => {
  it("按实际返回内容显示文档片段、Wiki 页面和计算结果", () => {
    expect(summary(evidence)).toBe(
      "共返回 6 个文档片段、1 个 Wiki 页面、1 项计算结果",
    );
  });

  it("统计包含未引用的可用结果，同一返回项不重复计数", () => {
    const duplicated = [...evidence, evidence[0], evidence[5], evidence[6]];
    expect(summary(duplicated)).toBe(summary(evidence));
    expect(
      summary(evidence.filter((item) => item.final_citation_number !== null)),
    ).toBe("共返回 5 个文档片段、1 个 Wiki 页面、1 项计算结果");
  });

  it("空结果与不可访问结果明确显示零值，兼容原有省略零项的格式", () => {
    expect(summary([])).toBe(
      "共返回 0 个文档片段、0 个 Wiki 页面、0 项计算结果",
    );
    expect(
      summary(evidence.map((item) => ({ ...item, access: "denied" }))),
    ).toBe(summary([]));
    expect(knowledgeEvidenceSummary([])).toBe("");
  });

  it("不同知识库中的同名 Wiki 页面分别计数", () => {
    const page = evidence.find((item) => item.kind === "source");
    const pages = [
      { ...page, source: { ...page.source, library_name: "知识库甲" } },
      { ...page, source: { ...page.source, library_name: "知识库乙" } },
    ];
    expect(summary(pages)).toBe(
      "共返回 0 个文档片段、2 个 Wiki 页面、0 项计算结果",
    );
  });
});
