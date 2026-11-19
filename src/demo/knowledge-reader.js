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
  const calculation =
    readable.length &&
    readable.every((citation) => citation.evidence.kind === "calculation");
  const citationTexts = [
    ...new Set(
      readable.map((citation) => citation.evidence.hit?.text).filter(Boolean),
    ),
  ];
  const content = !readable.length
    ? "当前无法访问此资料"
    : wiki
      ? document.original?.content || "暂未取得 Wiki 页面正文"
      : !calculation && document.original?.content
        ? document.original.content
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
    previewFormat:
      wiki ||
      (!calculation &&
        /\.md$/i.test(document.original?.name || document.title || ""))
        ? "markdown"
        : "text",
    citationTexts,
    previewNotice:
      readable.length && !wiki && !calculation && !document.original?.content
        ? "暂未取得完整文档，当前仅展示引用片段"
        : "",
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
      available: readable.length > 0,
      directoryPath: document.directoryPath || [],
      indexPath: document.indexPath || [],
    },
  };
}
