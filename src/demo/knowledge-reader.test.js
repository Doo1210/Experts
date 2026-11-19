import { describe, expect, it, vi } from "vitest";
import Chat from "./pages/Chat.vue";
import { knowledgeCitationDocuments } from "./knowledge-activity";
import { knowledgeCitationItem } from "./knowledge-reader";
import {
  knowledgeDemoScenes,
  knowledgeDemoOriginals,
} from "./knowledge-activity-scenes";
import { createFileReader } from "./file-reader";

const evidence = knowledgeDemoScenes.get("演示工具：检索知识").runs[0].evidence;
const citations = evidence
  .filter((e) => Number.isInteger(e.final_citation_number))
  .map((e) => ({
    number: e.final_citation_number,
    key: `knowledge-1:${e.evidence_id}`,
    evidence: e,
    documents: knowledgeCitationDocuments(e),
  }));

function context(width = 1200) {
  const message = { id: "answer-1", role: "assistant" };
  const turn = {
    activities: [
      {
        id: "knowledge-1",
        kind: "knowledge",
        answerMessageId: message.id,
        evidence: structuredClone(evidence),
      },
    ],
  };
  const vm = {
    expert: { id: "expert", files: [] },
    reader: createFileReader(),
    readerWidthCustomized: false,
    taskListCollapsed: false,
    workspaceOpen: true,
    taskPanelWidth: 160,
    workspacePanelWidth: 200,
    $refs: {
      chatBody: { clientWidth: width },
      fileReader: { focusCitation: vi.fn() },
    },
    $message: { info: vi.fn() },
    $nextTick: vi.fn((callback) => callback?.()),
    turnFor: vi.fn(() => turn),
    revealReaderWorkspaceFile: vi.fn(),
    fileBlob: vi.fn(
      async (item) => new Blob([item.snapshotContent], { type: "text/plain" }),
    ),
  };
  for (const name of [
    "openKnowledgeCitation",
    "knowledgeCitations",
    "roundKnowledgeActivities",
    "knowledgeEvidenceKey",
    "previewFile",
    "loadReaderTab",
    "closeReader",
  ])
    vm[name] = (...args) => Chat.methods[name].call(vm, ...args);
  Object.defineProperty(vm, "activeReaderTab", {
    get: () => Chat.computed.activeReaderTab.call(vm),
  });
  return { vm, message, turn };
}

describe("点击知识引用直接阅读对应内容", () => {
  it("文档引用展示全文，单独保留所点击引用的高亮片段", () => {
    const item = knowledgeCitationItem(
      "answer-1",
      citations,
      [1],
      "zx42-maintenance",
    );
    expect(item.snapshotContent).toBe(
      knowledgeDemoOriginals["zx42-maintenance"].content,
    );
    expect(item.citationTexts).toEqual([evidence[0].hit.text]);
    expect(item.previewFormat).toBe("markdown");
  });
  it("合并引用展示全文，仅高亮当前文档的指定片段", () => {
    const item = knowledgeCitationItem(
      "answer-1",
      citations,
      [1, 2, 3, 4],
      "zx42-maintenance",
    );
    expect(item.snapshotContent).toBe(
      knowledgeDemoOriginals["zx42-maintenance"].content,
    );
    expect(item.citationTexts).toEqual(
      evidence.slice(0, 3).map((e) => e.hit.text),
    );
    expect(item.citationTexts).not.toContain(evidence[3].hit.text);
  });
  it("Wiki 引用读取完整正文，包括表格及末尾内容", () => {
    const item = knowledgeCitationItem("answer-1", citations, [6], "zx42-wiki");
    expect(item.snapshotContent).toBe(
      knowledgeDemoOriginals["zx42-wiki"].content,
    );
    expect(item.snapshotContent).toContain("| 记录项 | 填写要求 |");
    expect(item.snapshotContent).toContain("复核结果由当班人员确认后归档");
    expect(item.previewFormat).toBe("markdown");
  });
  it("计算引用只呈现该计算的摘要", () => {
    const documentId = citations.find((c) => c.number === 7).documents[0].id;
    expect(
      knowledgeCitationItem("answer-1", citations, [7], documentId)
        .snapshotContent,
    ).toBe(evidence[6].calculation.summary);
  });
  it("无权限时不泄露传入的原文、片段或资料名称", () => {
    const item = knowledgeCitationItem(
      "answer-1",
      [
        {
          number: 1,
          key: "blocked",
          evidence: { access: "denied", hit: { text: "私密片段" } },
          documents: [
            {
              id: "blocked",
              title: "私密标题",
              kind: "wiki",
              original: { content: "私密正文" },
            },
          ],
        },
      ],
      [1],
      "blocked",
    );
    expect(item.name).toBe("来源不可用");
    expect(item.snapshotContent).toBe("当前无法访问此资料");
    expect(JSON.stringify(item)).not.toContain("私密");
  });
  it("缺少 Wiki 正文时明确显示缺失提示", () => {
    const item = knowledgeCitationItem(
      "answer-1",
      [
        {
          number: 1,
          key: "missing",
          evidence: { access: "available" },
          documents: [{ id: "missing", kind: "wiki", title: "新页面" }],
        },
      ],
      [1],
      "missing",
    );
    expect(item.snapshotContent).toBe("暂未取得 Wiki 页面正文");
  });
  it("不存在的引用不打开预览", () => {
    expect(
      knowledgeCitationItem("answer-1", citations, [99], "zx42-maintenance"),
    ).toBeNull();
  });
  it("缺少文档全文时明确提示，并保留已有引用片段", () => {
    const item = knowledgeCitationItem(
      "answer",
      [
        {
          number: 1,
          key: "partial",
          evidence: { access: "available", hit: { text: "已有片段" } },
          documents: [{ id: "partial", title: "部分资料.txt", kind: "rag" }],
        },
      ],
      [1],
      "partial",
    );
    expect(item.snapshotContent).toBe("已有片段");
    expect(item.previewNotice).toBe("暂未取得完整文档，当前仅展示引用片段");
    expect(item.citationTexts).toEqual(["已有片段"]);
  });
  it("同一文档的不同片段及不同回合共用文档身份，保留引用身份", () => {
    const first = knowledgeCitationItem(
      "answer-1",
      citations,
      [1],
      "zx42-maintenance",
    );
    const second = knowledgeCitationItem(
      "answer-1",
      citations,
      [2],
      "zx42-maintenance",
    );
    const later = knowledgeCitationItem(
      "answer-2",
      citations,
      [1],
      "zx42-maintenance",
    );
    expect(first.knowledgeSource.id).toBe(second.knowledgeSource.id);
    expect(first.knowledgeSource.id).toBe(later.knowledgeSource.id);
    expect(first.knowledgeCitationKey).not.toBe(second.knowledgeCitationKey);
    expect(first.knowledgeCitationKey).not.toBe(later.knowledgeCitationKey);
    expect(
      knowledgeCitationItem("answer-1", citations, [2, 1], "zx42-maintenance")
        .knowledgeSource.id,
    ).toBe(
      knowledgeCitationItem("answer-1", citations, [1, 2], "zx42-maintenance")
        .knowledgeSource.id,
    );
  });
  it("点击直接显示该引用正文，关闭后保留阅读期间调整的侧栏状态", async () => {
    const { vm, message } = context();
    await vm.openKnowledgeCitation(message, {
      numbers: [1],
      documentId: "zx42-maintenance",
    });
    expect(vm.reader.tabs).toHaveLength(1);
    expect(vm.activeReaderTab).toMatchObject({
      format: "markdown",
      status: "ready",
      origin: "knowledge",
      text: knowledgeDemoOriginals["zx42-maintenance"].content,
    });
    expect(vm.workspaceOpen).toBe(true);
    vm.workspaceOpen = false;
    vm.taskListCollapsed = true;
    vm.closeReader();
    expect(vm.workspaceOpen).toBe(false);
    expect(vm.taskListCollapsed).toBe(true);
    expect(vm.reader.tabs).toEqual([]);
  });
  it("同一文档不同片段复用全文标签，点击引用均定位高亮", async () => {
    const { vm, message } = context();
    const click = (numbers) =>
      vm.openKnowledgeCitation(message, {
        numbers,
        documentId: "zx42-maintenance",
      });
    await click([1]);
    const first = vm.activeReaderTab;
    await click([1]);
    expect(vm.reader.tabs).toHaveLength(1);
    expect(vm.activeReaderTab).toBe(first);
    await click([2]);
    expect(vm.reader.tabs).toHaveLength(1);
    expect(vm.activeReaderTab).toBe(first);
    expect(vm.activeReaderTab.text).toBe(
      knowledgeDemoOriginals["zx42-maintenance"].content,
    );
    expect(vm.activeReaderTab.item.citationTexts).toEqual([
      evidence[1].hit.text,
    ]);
    expect(vm.$refs.fileReader.focusCitation).toHaveBeenCalledTimes(3);
    expect(vm.$refs.fileReader.focusCitation).toHaveBeenCalledWith(first.key);
    await click([1]);
    expect(vm.reader.tabs).toHaveLength(1);
    expect(vm.activeReaderTab.item.citationTexts).toEqual([
      evidence[0].hit.text,
    ]);
  });
  it("知识引用和普通文件共用标签区，Wiki 仍使用 Markdown 渲染", async () => {
    const { vm, message } = context();
    await vm.openKnowledgeCitation(message, {
      numbers: [6],
      documentId: "zx42-wiki",
    });
    expect(vm.activeReaderTab.format).toBe("markdown");
    await vm.previewFile({
      id: "result",
      name: "报告.txt",
      snapshotContent: "本轮报告",
    });
    expect(vm.reader.tabs).toHaveLength(2);
    expect(vm.activeReaderTab.text).toBe("本轮报告");
  });
  it("同一引用内容更新后刷新当前标签，不追加重复标签", async () => {
    const { vm, message, turn } = context();
    const click = () =>
      vm.openKnowledgeCitation(message, {
        numbers: [1],
        documentId: "zx42-maintenance",
      });
    await click();
    turn.activities[0].evidence[0].hit.text = "更新后的片段";
    await click();
    expect(vm.reader.tabs).toHaveLength(1);
    expect(vm.activeReaderTab.item.citationTexts).toEqual(["更新后的片段"]);
    expect(vm.activeReaderTab.text).toBe(
      knowledgeDemoOriginals["zx42-maintenance"].content,
    );
  });
  it("切换其他文档后再点击原文档片段，激活原标签并更新内容", async () => {
    const { vm, message } = context();
    await vm.openKnowledgeCitation(message, {
      numbers: [1],
      documentId: "zx42-maintenance",
    });
    const first = vm.activeReaderTab;
    await vm.openKnowledgeCitation(message, {
      numbers: [6],
      documentId: "zx42-wiki",
    });
    await vm.openKnowledgeCitation(message, {
      numbers: [3],
      documentId: "zx42-maintenance",
    });
    expect(vm.reader.tabs).toHaveLength(2);
    expect(vm.activeReaderTab).toBe(first);
    expect(vm.activeReaderTab.item.citationTexts).toEqual([
      evidence[2].hit.text,
    ]);
    expect(vm.$refs.fileReader.focusCitation).toHaveBeenCalledWith(first.key);
  });

  it("不同回合引用同一文档复用标签，高亮所点击回合的片段", async () => {
    const { vm, message, turn } = context();
    await vm.openKnowledgeCitation(message, {
      numbers: [1],
      documentId: "zx42-maintenance",
    });
    const first = vm.activeReaderTab;
    const later = { id: "answer-2", role: "assistant" };
    turn.activities[0].answerMessageId = later.id;
    turn.activities[0].evidence[0].hit.text = "第二轮引用片段";
    await vm.openKnowledgeCitation(later, {
      numbers: [1],
      documentId: "zx42-maintenance",
    });
    expect(vm.reader.tabs).toHaveLength(1);
    expect(vm.activeReaderTab).toBe(first);
    expect(vm.activeReaderTab.item.citationTexts).toEqual(["第二轮引用片段"]);
  });

  it("同名不同文档和缺少文档身份的引用不会被误合并", () => {
    const entries = ["doc-a", "doc-b"].map((id, index) => ({
      number: index + 1,
      key: id,
      evidence: { access: "available", hit: { text: id } },
      documents: [{ id, kind: "rag", title: "同名.md" }],
    }));
    const first = knowledgeCitationItem("answer-1", entries, [1], "doc-a");
    const second = knowledgeCitationItem("answer-1", entries, [2], "doc-b");
    expect(first.knowledgeSource.id).not.toBe(second.knowledgeSource.id);
    const unavailable = entries.map((entry) => ({
      ...entry,
      evidence: { access: "denied" },
      documents: [{ id: null }],
    }));
    expect(
      knowledgeCitationItem("answer-1", unavailable, [1], null).knowledgeSource
        .id,
    ).not.toBe(
      knowledgeCitationItem("answer-1", unavailable, [2], null).knowledgeSource
        .id,
    );
  });

  it("快速切换同一文档片段时，较晚完成的旧读取不能覆盖最新选择", async () => {
    const { vm, message } = context();
    const loads = [];
    vm.fileBlob = vi.fn(
      (item) => new Promise((resolve) => loads.push({ item, resolve })),
    );
    const first = vm.openKnowledgeCitation(message, {
      numbers: [1],
      documentId: "zx42-maintenance",
    });
    const second = vm.openKnowledgeCitation(message, {
      numbers: [2],
      documentId: "zx42-maintenance",
    });
    loads[1].resolve(
      new Blob([loads[1].item.snapshotContent], { type: "text/plain" }),
    );
    await second;
    loads[0].resolve(
      new Blob([loads[0].item.snapshotContent], { type: "text/plain" }),
    );
    await first;
    expect(vm.reader.tabs).toHaveLength(1);
    expect(vm.activeReaderTab.text).toBe(
      knowledgeDemoOriginals["zx42-maintenance"].content,
    );
    expect(vm.activeReaderTab.item.citationTexts).toEqual([
      evidence[1].hit.text,
    ]);
  });

  it("空间不足时不新增标签，也不改变原侧栏状态", async () => {
    const { vm, message } = context(1000);
    vm.taskPanelWidth = 480;
    await vm.openKnowledgeCitation(message, {
      numbers: [1],
      documentId: "zx42-maintenance",
    });
    expect(vm.reader.tabs).toEqual([]);
    expect(vm.workspaceOpen).toBe(true);
    expect(vm.$message.info).toHaveBeenCalledOnce();
  });
});
