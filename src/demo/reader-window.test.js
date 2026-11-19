import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveFile, readFile, deleteFile } from "./file-db";
import { saveReaderWindow, readReaderWindow } from "./reader-window";

vi.mock("./file-db", () => ({
  saveFile: vi.fn(),
  readFile: vi.fn(),
  deleteFile: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe("独立网页保留打开时的文档版本", () => {
  it("隔离路径、引用及正文快照，原标签切换或关闭不改变已打开网页", async () => {
    const tab = {
      key: "document",
      format: "markdown",
      text: "# 初始版本",
      item: { name: "报告.md", citationTexts: ["初始引用"] },
    };
    const context = { path: "workspace/报告.md", actions: ["open"] };
    await saveReaderWindow("snapshot", tab, context, null);
    const saved = saveFile.mock.calls[0][1];
    tab.item.citationTexts[0] = "另一个引用";
    tab.text = "修改后的版本";
    context.path = "workspace/另一个文档.md";
    expect(saved.tab.text).toBe("# 初始版本");
    expect(saved.tab.item.citationTexts).toEqual(["初始引用"]);
    expect(saved.context.path).toBe("workspace/报告.md");
    expect(saved.mode).toBe("document");
  });
  it("PDF 和图片保存 Blob，独立网页不依赖原预览区的临时 URL", async () => {
    const blob = new Blob(["pdf data"], { type: "application/pdf" });
    await saveReaderWindow(
      "pdf",
      {
        key: "pdf",
        item: { name: "报告.pdf" },
        format: "pdf",
        text: "",
        url: "blob:parent",
      },
      { path: "workspace/报告.pdf" },
      blob,
    );
    expect(saveFile.mock.calls[0][1].tab.blob).toBe(blob);
    expect(saveFile.mock.calls[0][1].tab).not.toHaveProperty("url");
  });
  it("图谱保存当前 Wiki 与索引路径，失效快照删除并返回空值", async () => {
    await saveReaderWindow(
      "wiki",
      { key: "wiki", item: { name: "校准" }, format: "markdown", text: "正文" },
      { path: "知识库wiki/设备/校准" },
      null,
      "graph",
    );
    expect(saveFile.mock.calls[0][1].mode).toBe("graph");
    const snapshot = saveFile.mock.calls[0][1];
    readFile.mockResolvedValue(snapshot);
    expect(await readReaderWindow("wiki")).toBe(snapshot);
    readFile.mockResolvedValue({
      ...snapshot,
      createdAt: Date.now() - 25 * 60 * 60 * 1000,
    });
    expect(await readReaderWindow("wiki")).toBeNull();
    expect(deleteFile).toHaveBeenCalledWith("reader-window:wiki");
    readFile.mockResolvedValue(undefined);
    expect(await readReaderWindow("missing")).toBeNull();
  });
});
