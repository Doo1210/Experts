import { describe, expect, it } from "vitest";
import { parseConversationMarkdown } from "./conversation-markdown";

describe("对话 Markdown 内容", () => {
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
