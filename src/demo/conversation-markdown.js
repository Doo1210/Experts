function inlineTokens(value, citationsByNumber) {
  const text = String(value || "");
  const tokens = [];
  const pattern =
    /(!\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\[(\d+(?:[ \t]*[,，、][ \t]*\d+)*)\])/g;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const numbers = match[8]?.match(/\d+/g).map(Number);
    if (numbers && !numbers.every((number) => citationsByNumber.has(number)))
      continue;
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
    else if (numbers) tokens.push({ type: "citation", numbers });
    else if (/^https?:\/\//i.test(match[7]))
      tokens.push({ type: "link", text: match[6], href: match[7] });
    else tokens.push({ type: "text", text: match[0] });
    index = match.index + match[0].length;
  }
  if (index < text.length)
    tokens.push({ type: "text", text: text.slice(index) });
  const formatted = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== "citation") {
      formatted.push(token);
      continue;
    }
    const numbers = [...token.numbers];
    while (index + 1 < tokens.length) {
      const next = tokens[index + 1];
      const offset = next.type === "text" && /^[ \t]+$/.test(next.text) ? 2 : 1;
      const adjacent = tokens[index + offset];
      if (adjacent?.type !== "citation") break;
      numbers.push(...adjacent.numbers);
      index += offset;
    }
    const documents = new Map();
    for (const number of new Set(numbers)) {
      for (const document of citationsByNumber.get(number)) {
        const key = document.id || `unavailable:${number}`;
        if (!documents.has(key))
          documents.set(key, {
            type: "citation",
            documentId: document.id,
            kind: document.kind,
            title: document.title,
            text: citationLabel(document),
            numbers: [],
          });
        documents.get(key).numbers.push(number);
      }
    }
    formatted.push(...documents.values());
  }
  return formatted;
}

function citationLabel({ title, kind }) {
  const name = kind === "wiki" ? title : title.replace(/\.[a-z\d]{1,8}$/i, "");
  const characters = Array.from(name);
  const shortName = characters.slice(0, 5).join("").trimEnd();
  return `${shortName}${characters.length > 5 ? "…" : ""}`;
}

function tableCells(line, parseInline) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => parseInline(cell.trim()));
}

export function parseConversationMarkdown(source, citations = []) {
  const citationsByNumber = new Map(
    citations.map(({ number, documents }) => [number, documents]),
  );
  const parseInline = (text) => inlineTokens(text, citationsByNumber);
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
      const headers = tableCells(line, parseInline);
      index += 2;
      const rows = [];
      while (
        index < lines.length &&
        lines[index].includes("|") &&
        lines[index].trim()
      )
        rows.push(tableCells(lines[index++], parseInline));
      blocks.push({ type: "table", headers, rows });
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        tokens: parseInline(heading[2]),
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
        items.push(parseInline(item[3]));
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
      tokens: parseInline(paragraph.join("\n")),
    });
  }
  return blocks;
}
