export function knowledgeCitationItem(
  messageId,
  citations,
  numbers,
  documentId,
) {
  const selected = citations.filter(
    (citation) =>
      numbers.includes(citation.number) &&
      citation.documents.some((document) => document.id === documentId),
  );
  if (!selected.length) return null;
  const readable = selected.filter(
    (citation) => citation.evidence.access === "available",
  );
  const document = readable.length
    ? readable[0].documents.find((entry) => entry.id === documentId)
    : { title: "来源不可用" };
  const wiki = document.kind === "wiki";
  const content = !readable.length
    ? "当前无法访问此资料"
    : wiki
      ? document.original?.content || "暂未取得 Wiki 页面正文"
      : [
          ...new Set(
            readable
              .map(
                (citation) =>
                  citation.evidence.hit?.text ||
                  citation.evidence.calculation?.summary,
              )
              .filter(Boolean),
          ),
        ].join("\n\n") || "暂无可预览内容";
  return {
    name: document.title || "引用知识",
    snapshotContent: content,
    previewFormat: wiki ? "markdown" : "text",
    knowledgeCitation: true,
    knowledgeCitationKey: JSON.stringify([
      messageId,
      ...selected.map((citation) => citation.key).sort(),
    ]),
    knowledgeSource: {
      id: documentId
        ? JSON.stringify([
            "document",
            document.kind || "unavailable",
            documentId,
          ])
        : JSON.stringify([
            "citation",
            messageId,
            ...selected.map((citation) => citation.key).sort(),
          ]),
      kind: document.kind,
      title: document.title,
      library: document.library,
    },
  };
}
