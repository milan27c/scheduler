// IndexedDB-backed image store for task artwork uploads.
// localStorage has a ~5MB quota; IndexedDB handles large binary data without issue.

const DB_NAME = "scheduler-images";
const STORE_NAME = "task-uploads";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface UploadedImage {
  name: string;
  dataUrl: string;
}

export async function saveTaskImages(taskId: string, images: UploadedImage[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(images, taskId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTaskImages(taskId: string): Promise<UploadedImage[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(taskId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeTaskImage(taskId: string, idx: number): Promise<void> {
  const images = await getTaskImages(taskId);
  images.splice(idx, 1);
  await saveTaskImages(taskId, images);
}
