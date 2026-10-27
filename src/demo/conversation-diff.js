function safeDiffPath(value) {
  const path = String(value || "")
    .trim()
    .replace(/^[ab]\//, "")
    .replace(/\\/g, "/");
  if (!path || path === "/dev/null") return "";
  return /^[a-z]:\//i.test(path) || path.startsWith("/")
    ? path.split("/").filter(Boolean).at(-1) || ""
    : path;
}

export function parseConversationDiff(source, fallbackPath = "") {
  const text = String(source || "").replace(/\x1b\[[0-9;]*m/g, "");
  const sections = [];
  const createSection = (path = "") => {
    const section = {
      path: safeDiffPath(path) || safeDiffPath(fallbackPath),
      added: 0,
      removed: 0,
      rows: [],
    };
    sections.push(section);
    return section;
  };
  let section = null;
  let oldLine = null;
  let newLine = null;
  let truncated = false;
  let hasLineNumbers = false;

  for (const line of text.split(/\r?\n/)) {
    if (!line || /^\s*┊ review diff\s*$/.test(line)) continue;
    if (/… omitted|…（仅展示前/.test(line)) {
      truncated = true;
      continue;
    }
    if (line.startsWith("diff --git ")) continue;
    if (line.startsWith("--- ")) {
      if (section?.rows.length) section = null;
      continue;
    }
    if (line.startsWith("+++ ")) {
      const path = safeDiffPath(line.slice(4));
      if (section?.rows.length) section = null;
      section = section || createSection(path);
      if (path) section.path = path;
      continue;
    }
    const renderedPath = line.match(
      /^((?:a\/|\/).+?)\s+→\s+((?:b\/|\/).+)$/,
    );
    if (renderedPath) {
      if (section?.rows.length) section = null;
      section = section || createSection(renderedPath[2]);
      continue;
    }
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      section = section || createSection();
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      hasLineNumbers = true;
      if (section.rows.length)
        section.rows.push({ kind: "separator", number: null, text: "" });
      continue;
    }
    if (line.startsWith("\\ No newline at end of file")) continue;
    const prefix = line[0];
    if (!["+", "-", " "].includes(prefix)) {
      section = section || createSection();
      section.rows.push({ kind: "meta", number: null, text: line });
      continue;
    }
    section = section || createSection();
    if (prefix === "+") {
      section.added++;
      section.rows.push({
        kind: "added",
        number: newLine,
        text: line.slice(1),
      });
      if (newLine !== null) newLine++;
    } else if (prefix === "-") {
      section.removed++;
      section.rows.push({
        kind: "removed",
        number: oldLine,
        text: line.slice(1),
      });
      if (oldLine !== null) oldLine++;
    } else {
      section.rows.push({
        kind: "context",
        number: newLine,
        text: line.slice(1),
      });
      if (oldLine !== null) oldLine++;
      if (newLine !== null) newLine++;
    }
  }

  return {
    sections: sections.filter((item) => item.rows.length),
    truncated,
    hasLineNumbers,
  };
}
