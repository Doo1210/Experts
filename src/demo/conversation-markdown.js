function inlineTokens(value) {
  const text = String(value || "");
  const tokens = [];
  const pattern =
    /(!\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > index)
      tokens.push({ type: "text", text: text.slice(index, match.index) });
    if (match[2] !== undefined) {
      const base = import.meta.env.BASE_URL || "/experts/";
      const path = match[3];
      if (
        path.startsWith(base) &&
        !path.includes("..") &&
        /^[\w/.-]+$/.test(path)
      )
        tokens.push({ type: "image", alt: match[2], src: path });
      else tokens.push({ type: "text", text: match[0] });
    } else if (match[4]) tokens.push({ type: "strong", text: match[4] });
    else if (match[5]) tokens.push({ type: "code", text: match[5] });
    else if (/^https?:\/\//i.test(match[7]))
      tokens.push({ type: "link", text: match[6], href: match[7] });
    else tokens.push({ type: "text", text: match[0] });
    index = match.index + match[0].length;
  }
  if (index < text.length)
    tokens.push({ type: "text", text: text.slice(index) });
  return tokens;
}

function tableCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => inlineTokens(cell.trim()));
}

export function parseConversationMarkdown(source) {
  const lines = String(source || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }
    const fence = line.match(/^\s*```([\w-]*)\s*$/);
    if (fence) {
      const code = [];
      index++;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index]))
        code.push(lines[index++]);
      if (index < lines.length) index++;
      blocks.push({ type: "code", language: fence[1], text: code.join("\n") });
      continue;
    }
    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[index + 1])
    ) {
      const headers = tableCells(line);
      index += 2;
      const rows = [];
      while (
        index < lines.length &&
        lines[index].includes("|") &&
        lines[index].trim()
      )
        rows.push(tableCells(lines[index++]));
      blocks.push({ type: "table", headers, rows });
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        tokens: inlineTokens(heading[2]),
      });
      index++;
      continue;
    }
    const listMatch = line.match(/^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = Boolean(listMatch[2]);
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/);
        if (!item || Boolean(item[2]) !== ordered) break;
        items.push(inlineTokens(item[3]));
        index++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const paragraph = [line];
    index++;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^\s*```/.test(lines[index]) &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[index])
    )
      paragraph.push(lines[index++]);
    blocks.push({
      type: "paragraph",
      tokens: inlineTokens(paragraph.join("\n")),
    });
  }
  return blocks;
}
