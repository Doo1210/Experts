import { describe, expect, it, vi } from "vitest";
import {
  initialMethodForm,
  methodFormErrors,
  methodSections,
  EXPERT_KNOWLEDGE_TOOL_GROUPS,
  KNOWLEDGE_TYPE_TOOLS,
  excludedExpertTools,
  effectiveExpertTools,
} from "./knowledge-config";
import { KNOWLEDGE_MODES } from "./knowledge-demo";
import KnowledgeMethodConfigDialog from "./components/KnowledgeMethodConfigDialog.vue";

describe("检索回答方式配置弹窗", () => {
  it("按实际 RAG 工具显示分区", () => {
    const quick = initialMethodForm(KNOWLEDGE_MODES[0]);
    const smart = initialMethodForm(KNOWLEDGE_MODES[1]);
    const wiki = initialMethodForm(KNOWLEDGE_MODES[2]);
    const table = initialMethodForm(KNOWLEDGE_MODES[3]);
    expect(methodSections(quick)).toEqual(["basic", "model", "rag"]);
    expect(methodSections(smart)).toEqual(["basic", "model", "rag", "tools"]);
    expect(methodSections(wiki)).toEqual(["basic", "model", "tools"]);
    expect(methodSections(table)).toEqual(["basic", "model", "tools"]);
    wiki.tools.push("检索知识");
    expect(methodSections(wiki)).toContain("rag");
  });

  it("类型与工具冲突时提示，不静默删除工具", () => {
    const config = initialMethodForm({ custom: true, type: "Wiki＋RAG 混合" });
    config.name = "综合检索";
    config.tools = ["搜索 Wiki"];
    expect(methodFormErrors(config, true).tools).toContain(
      "Wiki＋RAG 混合需同时启用检索知识和 Wiki 阅读工具。",
    );
    expect(config.tools).toEqual(["搜索 Wiki"]);
  });

  it("自定义描述可留空，基本字段和模型仍需校验", () => {
    const config = initialMethodForm({ custom: true });
    config.name = "测试方式";
    config.description = "";
    expect(methodFormErrors(config, true).basic).toEqual([]);
    config.model = "";
    expect(methodFormErrors(config, true).model).toContain(
      "请选择知识任务模型。",
    );
  });

  it("切换自定义类型时保留已选工具并提示复核", () => {
    const context = {
      draft: {
        name: "检索方式",
        description: "原描述",
        tools: ["检索知识", "阅读文档"],
        rerankModel: "",
      },
      nameTouched: true,
      descriptionTouched: true,
      preservedToolsNotice: "",
    };
    KnowledgeMethodConfigDialog.methods.onTypeChange.call(context, "Wiki 问答");
    expect(context.draft.tools).toContain("检索知识");
    expect(context.draft.tools).toContain("搜索 Wiki");
    expect(context.preservedToolsNotice).toContain("检索知识");
    expect(context.draft.name).toBe("检索方式");
  });

  it("专家版过滤基础工具，并在旧配置中识别后排除", () => {
    expect(
      EXPERT_KNOWLEDGE_TOOL_GROUPS.map((group) => group.name),
    ).not.toContain("基础工具");
    expect(Object.values(KNOWLEDGE_TYPE_TOOLS).flat()).not.toContain("思考");
    const legacy = ["思考", "thinking", "检索知识", "阅读文档"];
    expect(excludedExpertTools(legacy)).toEqual(["思考", "thinking"]);
    expect(effectiveExpertTools(legacy)).toEqual(["检索知识", "阅读文档"]);
    const form = initialMethodForm({
      custom: true,
      type: "RAG 问答",
      editConfig: { tools: legacy },
    });
    expect(form.tools).toEqual(legacy);
    expect(methodFormErrors(form, true).tools).toEqual([]);
  });

  it("仅有旧基础工具不算有效知识工具", () => {
    const form = initialMethodForm({
      custom: true,
      type: "自定义",
      editConfig: { tools: ["思考"] },
    });
    expect(methodFormErrors(form, true).tools).toContain(
      "至少选择一项知识工具。",
    );
  });

  it("弹窗保存时剔除旧基础工具", async () => {
    const emit = vi.fn();
    const context = {
      canManage: true,
      hasErrors: false,
      isCustom: true,
      isNew: true,
      method: { id: "", custom: true },
      draft: { name: "核对资料", tools: ["思考", "检索知识"] },
      $emit: emit,
    };
    await KnowledgeMethodConfigDialog.methods.save.call(context);
    expect(emit).toHaveBeenCalledWith("save", {
      method: context.method,
      config: { name: "核对资料", tools: ["检索知识"] },
    });
  });
});
