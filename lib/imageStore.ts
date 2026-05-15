// IndexedDB-backed image store for task artwork uploads and member photos.
// localStorage has a ~5MB quota; IndexedDB handles large binary data without issue.

const DB_NAME = "scheduler-images";
const STORE_NAME = "task-uploads";
const MEMBER_PHOTOS_STORE = "member-photos";
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(MEMBER_PHOTOS_STORE)) {
        db.createObjectStore(MEMBER_PHOTOS_STORE);
      }
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

// Member photo functions — store photos by member ID in IndexedDB
export async function saveMemberPhoto(memberId: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEMBER_PHOTOS_STORE, "readwrite");
    tx.objectStore(MEMBER_PHOTOS_STORE).put(dataUrl, memberId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMemberPhoto(memberId: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEMBER_PHOTOS_STORE, "readonly");
    const req = tx.objectStore(MEMBER_PHOTOS_STORE).get(memberId);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllMemberPhotos(): Promise<Record<string, string>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEMBER_PHOTOS_STORE, "readonly");
    const store = tx.objectStore(MEMBER_PHOTOS_STORE);
    const result: Record<string, string> = {};
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) { result[cursor.key as string] = cursor.value; cursor.continue(); }
      else resolve(result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMemberPhoto(memberId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEMBER_PHOTOS_STORE, "readwrite");
    tx.objectStore(MEMBER_PHOTOS_STORE).delete(memberId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
