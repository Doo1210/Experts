import { describe, expect, it, vi } from "vitest";
import ExpertKnowledgeTab from "./components/ExpertKnowledgeTab.vue";
import { KNOWLEDGE_MODES } from "./knowledge-demo";

describe("知识菜单交互", () => {
  it("指定知识库为空时允许保存，不使用知识库时保留默认方式", () => {
    const context = {
      draft: {
        scope: "selected",
        libraryIds: [],
        defaultMethodId: "quick-answer",
      },
      availableLibraries: [],
      allMethods: KNOWLEDGE_MODES,
    };
    expect(ExpertKnowledgeTab.computed.validationErrors.call(context)).toEqual(
      [],
    );
    context.draft.scope = "none";
    expect(ExpertKnowledgeTab.computed.validationErrors.call(context)).toEqual(
      [],
    );
  });

  it("确认设数据分析为默认方式时自动填入表格范围", async () => {
    const info = vi.fn();
    const confirm = vi.fn(() => Promise.resolve());
    const context = {
      draft: { scope: "selected", fileTypes: ["PDF"] },
      allMethods: KNOWLEDGE_MODES,
      $message: { info },
      $confirm: confirm,
    };
    context.applyDefaultMethod = (id) =>
      ExpertKnowledgeTab.methods.applyDefaultMethod.call(context, id);
    await ExpertKnowledgeTab.methods.selectDefaultMethod.call(
      context,
      "data-analysis",
    );
    expect(context.draft).toMatchObject({
      scope: "all",
      fileTypes: ["CSV", "Excel（XLSX）"],
      defaultMethodId: "data-analysis",
    });
    expect(confirm).toHaveBeenCalledOnce();
    expect(info).toHaveBeenCalledOnce();
  });

  it("配置图标只打开配置弹窗，不切换默认方式", () => {
    const context = {
      draft: { defaultMethodId: "smart-reasoning" },
      configMethodId: "",
      configVisible: false,
      configIsNew: true,
    };
    ExpertKnowledgeTab.methods.openMethodDetail.call(
      context,
      KNOWLEDGE_MODES[0],
    );
    expect(context.configMethodId).toBe("quick-answer");
    expect(context.configVisible).toBe(true);
    expect(context.configIsNew).toBe(false);
    expect(context.draft.defaultMethodId).toBe("smart-reasoning");
  });

  it("添加自定义方式直接进入新建配置", () => {
    const context = {
      configMethodId: "smart-reasoning",
      configVisible: false,
      configIsNew: false,
    };
    ExpertKnowledgeTab.methods.openCustomDialog.call(context);
    expect(context).toMatchObject({
      configMethodId: "",
      configVisible: true,
      configIsNew: true,
    });
  });

  it("选中方式展示对应的详细提示", () => {
    const computed = ExpertKnowledgeTab.computed.selectedMethodDescription;
    expect(computed.call({ selectedMethod: null })).toContain("本轮问题");
    expect(computed.call({ selectedMethod: KNOWLEDGE_MODES[1] })).toContain(
      "跨文档核对",
    );
    expect(
      computed.call({
        selectedMethod: {
          custom: true,
          description: "核对质量记录",
          requirement: "需要质量规范",
        },
      }),
    ).toBe("核对质量记录；需要质量规范。");
  });
});
