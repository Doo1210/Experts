import { readFile, saveFile } from "./file-db";
import acceptanceFiles from "./acceptance-files.json";

export async function readPreviewSource(item) {
  const revision = item.content == null && item.bundledPreviewRevision;
  const cacheKey = revision ? `${item.id}:bundled:${revision}` : item.id;
  const stored = await readFile(cacheKey);
  if (stored) return stored;
  if (item.content != null) return undefined;
  const sample = acceptanceFiles.find(
    (entry) => entry.name === item.bundledPreviewFile,
  );
  if (!sample) return undefined;
  const response = await fetch(
    `${import.meta.env.BASE_URL || "/experts/"}acceptance-fixtures/${encodeURIComponent(sample.name)}${revision ? `?revision=${encodeURIComponent(revision)}` : ""}`,
    { credentials: "omit" },
  );
  if (!response.ok)
    throw new FilePreviewError("示例文件读取失败，请刷新页面后重试");
  const blob = await response.blob();
  if (blob.size !== sample.size)
    throw new FilePreviewError("示例文件内容不完整，请重试");
  const file = new File([blob], sample.name, { type: blob.type });
  await saveFile(cacheKey, file);
  return file;
}

// Binary formats use bundled illustrative content; no conversion service is called.
export function demoPreviewFor(item) {
  if (item.knowledgeSource || typeof item.snapshotContent === "string")
    return null;
  const ext = /\.([a-z0-9]+)$/i.exec(item.name || "")?.[1].toLowerCase();
  let kind;
  if (/^(?:pdf|docx?|wps|wpt|odt|ott|fodt|rtf|ofd|epub)$/.test(ext))
    kind = "document";
  else if (/^(?:xlsx?|csv|tsv|et|ett|ods|fods)$/.test(ext))
    kind = "spreadsheet";
  else if (/^(?:pptx?|dps|odp)$/.test(ext)) kind = "slides";
  else if (
    /^(?:dwg|dxf|dwf|dwt|plt|cf2|obj|3ds|stl|gltf|glb|fbx|dae|ifc|step|stp|iges|igs|fcstd|bim|brep)$/.test(
      ext,
    )
  )
    kind = "model";
  else if (/^(?:heic|tiff?|tga|wmf|emf)$/.test(ext)) kind = "image";
  else if (/^(?:zip|rar|jar|tar|gz|gzip|7z)$/.test(ext)) kind = "archive";
  return kind ? { kind, extension: ext, title: item.name } : null;
}

export async function resolveFilePreview(item, blob) {
  const demo = demoPreviewFor(item);
  if (demo) return { format: "demo", demo, text: "", url: "" };
  if (
    blob.type.startsWith("image/") ||
    /\.(?:png|jpe?g|gif|bmp|webp|svg)$/i.test(item.name)
  )
    return {
      format: "image",
      url: URL.createObjectURL(blob),
      text: "",
      demo: null,
    };
  if (
    /^text\/|^application\/(?:json|xml)/.test(blob.type) ||
    /\.(?:md|txt|csv|tsv|json|xml|log|ya?ml|[cm]?[jt]sx?|java|py|php|css|html?)$/i.test(
      item.name,
    ) ||
    typeof item.snapshotContent === "string" ||
    item.knowledgeSource
  ) {
    return {
      format:
        item.previewFormat ||
        (/\.md$/i.test(item.name) || item.knowledgeSource?.kind === "wiki"
          ? "markdown"
          : "text"),
      text: await blob.text(),
      url: "",
      demo: null,
    };
  }
  throw new FilePreviewError("此格式暂不支持预览，请从工作空间下载文件查看");
}

export class FilePreviewError extends Error {}
