import { describe, expect, it } from "vitest";
import {
  readerDocumentContext,
  compactReaderPath,
  citationTextRanges,
} from "./reader-context";

describe("预览路径及来源操作", () => {
  const files = [
    { id: "folder", name: "分析资料", kind: "folder" },
    { id: "file", parentId: "folder", name: "报告.md", kind: "file" },
  ];
  it("从对话打开的已保存产物使用工作空间实际路径", () => {
    expect(
      readerDocumentContext({ name: "历史版本.md", fileId: "file" }, files),
    ).toEqual({
      path: "workspace/分析资料/报告.md",
      kind: "workspace",
      actions: ["open"],
    });
  });
  it("显式 workspace 路径不重复根名称", () => {
    expect(
      readerDocumentContext({
        name: "报告.md",
        path: "workspace/分析资料/报告.md",
      }).path,
    ).toBe("workspace/分析资料/报告.md");
  });
  it("知识文档使用目录和后缀，提供引用定位和新网页", () => {
    expect(
      readerDocumentContext({
        name: "手册.pdf",
        citationTexts: ["引用正文"],
        knowledgeSource: {
          kind: "rag",
          library: "生产工艺手册",
          directoryPath: ["设备", "规范"],
        },
      }),
    ).toEqual({
      path: "生产工艺手册/设备/规范/手册.pdf",
      kind: "knowledge",
      actions: ["locate", "open"],
    });
  });
  it("Wiki 使用索引层级，仅提供图谱入口", () => {
    expect(
      readerDocumentContext({
        name: "设备校准",
        knowledgeSource: {
          kind: "wiki",
          library: "设备知识库",
          indexPath: ["设备", "维护"],
        },
      }),
    ).toEqual({
      path: "设备知识库/设备/维护/设备校准",
      kind: "wiki",
      actions: ["graph"],
    });
  });
  it("不可访问来源不显示私密路径或操作", () => {
    const context = readerDocumentContext({
      name: "私密.md",
      knowledgeSource: { available: false, directoryPath: ["私密目录"] },
    });
    expect(context).toEqual({
      path: "来源不可用",
      kind: "unavailable",
      actions: [],
    });
  });
  it("临时文件不伪造工作空间归属，计算摘要不提供引用定位", () => {
    expect(readerDocumentContext({ name: "临时.csv" }).path).toBe(
      "临时文件/临时.csv",
    );
    expect(
      readerDocumentContext({
        name: "统计.csv",
        knowledgeSource: { kind: "rag" },
      }).actions,
    ).toEqual(["open"]);
  });
});

describe("长路径只省略前面的目录", () => {
  it("完整路径可容纳时原样显示", () => {
    expect(compactReaderPath("workspace/资料/报告.md", () => true)).toBe(
      "workspace/资料/报告.md",
    );
  });
  it("单行优先保留末级文件，按需省略前段目录", () => {
    expect(
      compactReaderPath(
        "workspace/第一层/第二层/第三层/报告.md",
        (s) => s.length <= 12,
      ),
    ).toBe("…/第三层/报告.md");
    expect(
      compactReaderPath("设备知识库/一级/二级/页面", (s) => s.length <= 4),
    ).toBe("…/页面");
  });
  it("只有一级目录时也省略前段，保留完整文件名及后缀", () => {
    expect(
      compactReaderPath("历史整改案例/本周抽检汇总.csv", (s) => s.length <= 12),
    ).toBe("…/本周抽检汇总.csv");
  });
  it("文件名本身过长时保留后段及后缀，不拆断 Unicode 字符", () => {
    const result = compactReaderPath(
      "workspace/年度设备校准复核报告.csv",
      (s) => s.length <= 9,
    );
    expect(result).toBe("…复核报告.csv");
    expect(
      compactReaderPath(
        "workspace/📄📊报告.md",
        (s) => Array.from(s).length <= 6,
      ),
    ).toBe("…报告.md");
  });
});

describe("全文中的引用高亮位置", () => {
  it("跨段落的空白变化不影响引用匹配，返回原正文偏移", () => {
    const text = "前文。\n接线复查后记录设备编号。\n\n填写维护时间。\n后文。";
    const ranges = citationTextRanges(text, [
      "接线复查后记录设备编号。填写维护时间。",
    ]);
    expect(ranges).toEqual([
      { start: text.indexOf("接线"), end: text.indexOf("后文") - 1 },
    ]);
  });
  it("多个片段分别定位，同一引用去重且不高亮无关正文", () => {
    expect(citationTextRanges("甲，乙，甲。", ["甲", "甲", "乙"])).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 3 },
      { start: 4, end: 5 },
    ]);
    expect(citationTextRanges("正文", ["未命中", " "])).toEqual([]);
  });
});
