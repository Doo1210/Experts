const DB_NAME = "digital-employee-demo-files-v3";
const STORE = "blobs";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(mode, run) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export const saveFile = (id, blob) =>
  transact("readwrite", (store) => store.put(blob, id));
export const readFile = (id) => transact("readonly", (store) => store.get(id));
export const deleteFile = (id) =>
  transact("readwrite", (store) => store.delete(id));
export const clearFiles = () => transact("readwrite", (store) => store.clear());
