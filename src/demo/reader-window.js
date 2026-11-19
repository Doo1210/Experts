import { saveFile, readFile, deleteFile } from "./file-db";

const prefix = "reader-window:";
const lifetime = 24 * 60 * 60 * 1000;

export async function saveReaderWindow(
  id,
  tab,
  context,
  blob,
  mode = "document",
) {
  await saveFile(prefix + id, {
    createdAt: Date.now(),
    mode,
    context: JSON.parse(JSON.stringify(context)),
    tab: {
      key: tab.key,
      item: JSON.parse(JSON.stringify(tab.item)),
      status: "ready",
      format: tab.format,
      text: tab.text,
      blob,
    },
  });
}

export async function readReaderWindow(id) {
  const snapshot = await readFile(prefix + id);
  if (!snapshot) return null;
  if (Date.now() - snapshot.createdAt > lifetime) {
    await deleteFile(prefix + id);
    return null;
  }
  return snapshot;
}
