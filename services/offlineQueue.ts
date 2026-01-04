type QueueEntry = {
  id?: number;
  payload: any;
  createdAt: number;
};

const DB_NAME = 'easymo-offline';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

const isSupported = () => typeof indexedDB !== 'undefined';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => void
) =>
  new Promise<T>(async (resolve, reject) => {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      callback(store);

      tx.oncomplete = () => resolve(undefined as T);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    } catch (error) {
      reject(error);
    }
  });

const notifyQueueUpdate = async () => {
  const count = await OfflineQueue.getCount();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('offline-queue-updated', { detail: count })
    );
  }
};

export const OfflineQueue = {
  async enqueue(payload: any) {
    if (!isSupported()) return;
    const entry: QueueEntry = { payload, createdAt: Date.now() };
    await withStore<void>('readwrite', (store) => {
      store.add(entry);
    });
    await notifyQueueUpdate();
  },

  async getAll(): Promise<QueueEntry[]> {
    if (!isSupported()) return [];
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  async remove(id: number) {
    if (!isSupported()) return;
    await withStore<void>('readwrite', (store) => {
      store.delete(id);
    });
    await notifyQueueUpdate();
  },

  async getCount(): Promise<number> {
    if (!isSupported()) return 0;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();
      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error);
    });
  },

  async flush(
    sender: (payload: any) => Promise<{ status?: string; result?: string }>
  ) {
    if (!isSupported()) return { flushed: 0 };
    const entries = await OfflineQueue.getAll();
    let flushed = 0;

    for (const entry of entries) {
      try {
        const response = await sender(entry.payload);
        const ok =
          response?.status === 'success' ||
          response?.status === 'ok' ||
          response?.result === 'success';
        if (ok && entry.id) {
          await OfflineQueue.remove(entry.id);
          flushed += 1;
        }
      } catch {
        // Keep queued item for next retry.
      }
    }

    if (flushed > 0) {
      await notifyQueueUpdate();
    }

    return { flushed };
  },
};
