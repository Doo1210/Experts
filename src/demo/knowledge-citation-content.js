import { parseConversationMarkdown } from "./conversation-markdown";

const inlineText = (tokens) =>
  tokens.map((token) => token.text || token.alt || "").join("");

export function wikiPageExcerpt(document, evidence = []) {
  if (document.kind !== "wiki" || !document.id) return "";
  const available = evidence.some(
    (item) =>
      item.access === "available" &&
      item.kind === "source" &&
      item.source?.kind === "wiki" &&
      [item.source.id, item.source.locator?.wiki_page_id].includes(document.id),
  );
  if (!available) return "";
  return parseConversationMarkdown(document.original?.content)
    .map((block) => {
      if (block.type === "heading") return "";
      if (block.tokens) return inlineText(block.tokens);
      if (block.type === "list") return block.items.map(inlineText).join("\n");
      if (block.type === "table")
        return block.rows
          .map((row) => row.map(inlineText).join("："))
          .join("\n");
      return block.text || "";
    })
    .filter(Boolean)
    .join("\n\n");
}
