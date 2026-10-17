import { describe, expect, it, vi } from "vitest";
import ExpertKnowledgeTab from "./components/ExpertKnowledgeTab.vue";
import { KNOWLEDGE_MODES } from "./knowledge-demo";

describe("知识菜单交互", () => {
  it("指定知识库为空时允许保存，不使用知识库时也不要求方式", () => {
    const context = {
      draft: {
        scope: "selected",
        libraryIds: [],
        methodIds: ["quick-answer"],
        defaultMethodId: "quick-answer",
      },
      availableLibraries: [],
      allMethods: KNOWLEDGE_MODES,
    };
    expect(ExpertKnowledgeTab.computed.validationErrors.call(context)).toEqual(
      [],
    );
    context.draft.scope = "none";
    context.draft.methodIds = [];
    expect(ExpertKnowledgeTab.computed.validationErrors.call(context)).toEqual(
      [],
    );
  });

  it("设数据分析为默认方式时自动填入表格范围", () => {
    const info = vi.fn();
    const context = {
      draft: { scope: "selected", fileTypes: ["PDF"] },
      allMethods: KNOWLEDGE_MODES,
      $message: { info },
    };
    ExpertKnowledgeTab.methods.onDefaultChange.call(context, "data-analysis");
    expect(context.draft).toMatchObject({
      scope: "all",
      fileTypes: ["CSV", "Excel（XLSX）"],
    });
    expect(info).toHaveBeenCalledOnce();
  });
});
