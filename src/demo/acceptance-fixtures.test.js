import { afterEach, describe, expect, it, vi } from "vitest";
import { installAcceptanceFixtures } from "./acceptance-fixtures";
import samples from "./acceptance-files.json";
import { readPreviewSource } from "./file-preview";
import { readFile, saveFile } from "./file-db";

vi.mock("./file-db", () => ({ readFile: vi.fn(), saveFile: vi.fn() }));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("跨浏览器可用的本地验收样例", () => {
  it("迁移旧目录到静态示例，保留用户删除、编辑及身份", () => {
    const file = {
      id: "edited",
      name: "sample.docx",
      content: "用户编辑",
      previewEngine: "legacy-service",
    };
    const data = {
      acceptanceFixtureVersion: 2,
      experts: [
        {
          id: "exp_quality",
          files: [
            {
              id: "acceptance-folder-20261119",
              kind: "folder",
              name: "多格式预览验收",
            },
            file,
          ],
        },
      ],
    };
    expect(installAcceptanceFixtures(data)).toBe(true);
    expect(data.experts[0].files).toHaveLength(2);
    expect(data.experts[0].files[0].name).toBe("文件预览示例");
    expect(file.content).toBe("用户编辑");
    expect(file).not.toHaveProperty("previewEngine");
    expect(data.acceptanceFixtureVersion).toBe(3);
    expect(installAcceptanceFixtures(data)).toBe(false);
  });
  it("报告使用新版本缓存键，避免旧 IndexedDB 报告遮盖修复复测结果", async () => {
    readFile.mockResolvedValue(undefined);
    const report = samples.find((sample) => sample.name === "验收报告.txt");
    const fetchFile = vi.fn(
      async () => new Response(new Uint8Array(report.size)),
    );
    vi.stubGlobal("fetch", fetchFile);
    await readPreviewSource({
      id: "report",
      bundledPreviewFile: report.name,
      bundledPreviewRevision: "fix-six",
    });
    expect(readFile).toHaveBeenCalledWith("report:bundled:fix-six");
    expect(saveFile.mock.calls[0][0]).toBe("report:bundled:fix-six");
    expect(fetchFile.mock.calls[0][0]).toContain("?revision=fix-six");
  });
  it("新浏览器补齐完整目录，后续刷新不补回手动删除内容", () => {
    const data = { experts: [{ id: "exp_quality", files: [] }] };
    expect(installAcceptanceFixtures(data)).toBe(true);
    expect(data.experts[0].files).toHaveLength(
      samples.filter((entry) => entry.name.startsWith("sample.")).length + 1,
    );
    data.experts[0].files.pop();
    expect(installAcceptanceFixtures(data)).toBe(false);
    expect(data.experts[0].files).toHaveLength(
      samples.filter((entry) => entry.name.startsWith("sample.")).length,
    );
  });
  it("沿用现有目录和文件身份，保留用户编辑及其他目录", () => {
    const file = {
      id: "user",
      kind: "file",
      name: "sample.txt",
      parentId: "folder",
      content: "用户修改",
    };
    const data = {
      experts: [
        {
          id: "exp_quality",
          files: [
            {
              id: "folder",
              kind: "folder",
              parentId: null,
              name: "多格式预览验收",
            },
            file,
            { id: "other", kind: "folder", parentId: null, name: "其他资料" },
          ],
        },
      ],
    };
    installAcceptanceFixtures(data);
    expect(file).toMatchObject({
      id: "user",
      content: "用户修改",
      bundledPreviewFile: "sample.txt",
    });
    expect(
      data.experts[0].files.filter((entry) => entry.name === "文件预览示例"),
    ).toHaveLength(1);
  });
  it("缺少 IndexedDB 原文时从随项目提供的文件恢复真实二进制", async () => {
    readFile.mockResolvedValue(undefined);
    saveFile.mockResolvedValue(undefined);
    const sample = samples.find((entry) => entry.name === "sample.docx");
    const fetchFile = vi.fn(
      async () => new Response(new Uint8Array(sample.size)),
    );
    vi.stubGlobal("fetch", fetchFile);
    const file = await readPreviewSource({
      id: "fixture",
      bundledPreviewFile: sample.name,
    });
    expect(file.name).toBe("sample.docx");
    expect(file.size).toBe(sample.size);
    expect(saveFile).toHaveBeenCalledWith("fixture", file);
    readFile.mockResolvedValue(file);
    expect(
      await readPreviewSource({
        id: "fixture",
        bundledPreviewFile: sample.name,
      }),
    ).toBe(file);
    expect(fetchFile).toHaveBeenCalledTimes(1);
  });
  it("拒绝把缺失文件返回的 HTML 页面当作原始文档", async () => {
    readFile.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>fallback</html>")),
    );
    await expect(
      readPreviewSource({ id: "fixture", bundledPreviewFile: "sample.docx" }),
    ).rejects.toThrow("内容不完整");
    expect(saveFile).not.toHaveBeenCalled();
  });
  it("用户编辑过的正文优先于随工程提供的样例", async () => {
    readFile.mockResolvedValue(undefined);
    const download = vi.fn();
    vi.stubGlobal("fetch", download);
    expect(
      await readPreviewSource({
        id: "edited",
        bundledPreviewFile: "sample.txt",
        content: "用户正文",
      }),
    ).toBeUndefined();
    expect(download).not.toHaveBeenCalled();
  });
});
