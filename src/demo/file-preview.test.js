import { afterEach, describe, expect, it, vi } from "vitest";
import { demoPreviewFor, resolveFilePreview } from "./file-preview";
import samples from "./acceptance-files.json";

afterEach(() => vi.unstubAllGlobals());

describe("纯静态文件预览", () => {
  it.each([
    ["报告.docx", "document"],
    ["报告.pdf", "document"],
    ["统计.xlsx", "spreadsheet"],
    ["统计.csv", "spreadsheet"],
    ["汇报.pptx", "slides"],
    ["装配.STEP", "model"],
    ["图纸.dwg", "model"],
    ["照片.heic", "image"],
    ["资料.zip", "archive"],
  ])("%s 无需服务即可生成 %s 模拟预览", async (name, kind) => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    const result = await resolveFilePreview({ name }, new Blob(["binary"]));
    expect(result).toMatchObject({
      format: "demo",
      demo: { kind, title: name },
      url: "",
    });
    expect(request).not.toHaveBeenCalled();
  });
  it("53 份既有样例均可离线选择查看器，不把二进制作为乱码读取", async () => {
    for (const sample of samples.filter((entry) =>
      entry.name.startsWith("sample."),
    )) {
      const result = await resolveFilePreview(
        { name: sample.name },
        new Blob(["fixture"]),
      );
      expect(["demo", "image", "text", "markdown"]).toContain(result.format);
      if (result.url) URL.revokeObjectURL(result.url);
    }
  });
  it("知识库快照保留原文，不按文件后缀替换为模拟正文", async () => {
    const item = {
      name: "检验.csv",
      knowledgeSource: { kind: "document" },
      snapshotContent: "真实快照",
    };
    expect(demoPreviewFor(item)).toBeNull();
    expect(
      await resolveFilePreview(item, new Blob(["真实快照"])),
    ).toMatchObject({ format: "text", text: "真实快照", demo: null });
  });
  it("Markdown 和 XML 原文保留，图片使用本地 Blob URL", async () => {
    expect(
      await resolveFilePreview({ name: "报告.md" }, new Blob(["# 正文"])),
    ).toMatchObject({ format: "markdown", text: "# 正文" });
    expect(
      await resolveFilePreview({ name: "测点.xml" }, new Blob(["<a>中文</a>"])),
    ).toMatchObject({ format: "text", text: "<a>中文</a>" });
    const image = await resolveFilePreview(
      { name: "示意.png" },
      new Blob(["image"], { type: "image/png" }),
    );
    expect(image).toMatchObject({
      format: "image",
      url: expect.stringMatching(/^blob:/),
    });
    URL.revokeObjectURL(image.url);
  });
  it("未知二进制格式给出可理解的下载提示", async () => {
    await expect(
      resolveFilePreview({ name: "未知.bin" }, new Blob(["bytes"])),
    ).rejects.toThrow("下载文件查看");
  });
});
