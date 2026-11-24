import files from "./acceptance-files.json";

// Keep the original downloadable examples, but preview binary formats with
// browser-only illustrative data in every build, including GitHub Pages.
export function installAcceptanceFixtures(saved) {
  if (saved.acceptanceFixtureVersion === 3) return false;
  for (const expert of saved.experts || []) {
    for (const item of expert.files || []) delete item.previewEngine;
  }
  const expert = saved.experts.find((entry) => entry.id === "exp_quality");
  if (!expert) return false;
  const folder = expert.files.find(
    (entry) =>
      entry.id === "acceptance-folder-20261119" ||
      (entry.kind === "folder" &&
        !entry.parentId &&
        ["文件预览示例", "多格式预览验收"].includes(entry.name)),
  );
  // Existing installs must not bring back files the user has deleted.
  if (saved.acceptanceFixtureVersion) {
    if (folder && folder.name === "多格式预览验收")
      folder.name = "文件预览示例";
    saved.acceptanceFixtureVersion = 3;
    return true;
  }
  const directory = folder || {
    id: "acceptance-folder-20261119",
    name: "文件预览示例",
    parentId: null,
    kind: "folder",
  };
  directory.name = "文件预览示例";
  if (!folder) expert.files.push(directory);
  files
    .filter((sample) => sample.name.startsWith("sample."))
    .forEach((sample, index) => {
      const existing = expert.files.find(
        (entry) =>
          entry.parentId === directory.id &&
          entry.kind === "file" &&
          entry.name === sample.name,
      );
      if (existing) existing.bundledPreviewFile = sample.name;
      else
        expert.files.push({
          id: `preview-demo-file-${index}`,
          parentId: directory.id,
          kind: "file",
          name: sample.name,
          size: sample.size,
          bundledPreviewFile: sample.name,
          updatedAt: "2026-11-24T02:00:00.000Z",
        });
    });
  saved.acceptanceFixtureVersion = 3;
  return true;
}
