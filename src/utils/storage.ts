// Robust storage utility using IndexedDB with fallback to localStorage and memory cache

const DB_NAME = 'watch_party_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

// In-memory cache
const memoryStore: Record<string, any> = {};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setItemSafe(key: string, value: any): Promise<void> {
  memoryStore[key] = value;

  // 1. Try IndexedDB first (no 5MB quota limit)
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    // If IndexedDB fails, attempt localStorage safely
  }

  // 2. Also try localStorage for small items, safely catching QuotaExceededError
  try {
    const serialized = JSON.stringify(value);
    // Only attempt localStorage if under 2MB to avoid quota errors
    if (serialized.length < 2 * 1024 * 1024) {
      localStorage.setItem(key, serialized);
    }
  } catch (lsErr) {
    console.warn(`localStorage save skipped for ${key} due to storage limits`);
  }
}

export async function getItemSafe<T = any>(key: string, defaultValue: T): Promise<T> {
  // 1. Check memory cache first
  if (memoryStore[key] !== undefined) {
    return memoryStore[key] as T;
  }

  // 2. Try IndexedDB
  try {
    const db = await openDB();
    const result = await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (result !== undefined && result !== null) {
      memoryStore[key] = result;
      return result as T;
    }
  } catch (idbErr) {
    // Fallback to localStorage
  }

  // 3. Try localStorage
  try {
    const lsItem = localStorage.getItem(key);
    if (lsItem) {
      const parsed = JSON.parse(lsItem);
      memoryStore[key] = parsed;
      return parsed as T;
    }
  } catch (e) {}

  return defaultValue;
}

export function getSyncItemSafe<T = any>(key: string, defaultValue: T): T {
  if (memoryStore[key] !== undefined) {
    return memoryStore[key] as T;
  }
  try {
    const lsItem = localStorage.getItem(key);
    if (lsItem) {
      const parsed = JSON.parse(lsItem);
      memoryStore[key] = parsed;
      return parsed as T;
    }
  } catch (e) {}
  return defaultValue;
}
