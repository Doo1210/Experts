import { describe, expect, it } from "vitest";
import { parseConversationMarkdown } from "./conversation-markdown";

describe("对话 Markdown 内容", () => {
  it("只将本条回答已登记的编号渲染为知识引用", () => {
    const [block] = parseConversationMarkdown(
      "校准要求。[1] 普通编号 [2] `[1]` [1](https://example.com)",
      [
        {
          number: 1,
          documents: [{ id: "manual", kind: "rag", title: "校准手册.pdf" }],
        },
      ],
    );
    expect(block.tokens.map((token) => token.type)).toEqual([
      "text",
      "citation",
      "text",
      "code",
      "text",
      "link",
    ]);
    expect(block.tokens[1]).toMatchObject({
      numbers: [1],
      documentId: "manual",
      title: "校准手册.pdf",
      kind: "rag",
      text: "校准手册",
    });
  });
  it("同一处引用按文档合并，并保留每份文档的命中编号", () => {
    const manual = {
      id: "manual",
      kind: "rag",
      title: "传感器校准作业规范.md",
    };
    const wiki = { id: "wiki", kind: "wiki", title: "校准记录与复核" };
    const citations = [
      { number: 1, documents: [manual] },
      { number: 2, documents: [manual] },
      { number: 3, documents: [wiki] },
    ];
    for (const text of ["[1][2] [3]", "[1, 2、3]"]) {
      const [block] = parseConversationMarkdown(`见资料${text}。`, citations);
      expect(block.tokens.filter((token) => token.type === "citation")).toEqual(
        [
          {
            type: "citation",
            documentId: "manual",
            kind: "rag",
            title: manual.title,
            text: "传感器校准…",
            numbers: [1, 2],
          },
          {
            type: "citation",
            documentId: "wiki",
            kind: "wiki",
            title: wiki.title,
            text: "校准记录与…",
            numbers: [3],
          },
        ],
      );
    }
  });
  it("按段落、代码块和表格分块，长内容不丢失", () => {
    const blocks = parseConversationMarkdown(
      "结论 **重要**\n\n```js\nconst x = 1;\n```\n\n|项目|值|\n|---|---|\n|良率|97%|",
    );
    expect(blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "code",
      "table",
    ]);
    expect(blocks[1].text).toBe("const x = 1;");
    expect(blocks[2].rows[0][1][0].text).toBe("97%");
  });

  it("仅把 HTTP 链接解析成可点击链接，脚本协议保留为纯文本", () => {
    const [block] = parseConversationMarkdown(
      "[安全](https://example.com) [危险](javascript:alert(1))",
    );
    expect(
      block.tokens.some(
        (token) =>
          token.type === "link" && token.href === "https://example.com",
      ),
    ).toBe(true);
    expect(
      block.tokens.some(
        (token) =>
          token.type === "link" && token.href.startsWith("javascript:"),
      ),
    ).toBe(false);
  });
  it("只渲染当前应用路径下的本地图片，远程图片不触发请求", () => {
    const base = import.meta.env.BASE_URL || "/experts/";
    const [block] = parseConversationMarkdown(
      `![本地示例](${base}avatars/quality-man.svg) ![远程](https://example.com/pic.png)`,
    );
    expect(
      block.tokens.some(
        (token) => token.type === "image" && token.alt === "本地示例",
      ),
    ).toBe(true);
    expect(
      block.tokens.some(
        (token) => token.type === "image" && token.src.startsWith("https:"),
      ),
    ).toBe(false);
  });
});
