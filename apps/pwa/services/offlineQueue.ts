export type QueueEntry = {
  id?: number;
  payload: any;
  createdAt: number;
  idempotencyKey?: string; // Prevent duplicate writes
  retryCount?: number; // Track retry attempts
  lastRetryAt?: number; // Last retry timestamp
  maxRetries?: number; // Maximum retry attempts
  action?: string; // Action type for conflict resolution
  metadata?: Record<string, any>; // Additional metadata for conflict handling
};

const DB_NAME = 'easymo-offline';
const STORE_NAME = 'queue';
const DB_VERSION = 2; // Incremented for new fields

const isSupported = () => typeof indexedDB !== 'undefined';

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        // Create index for idempotency key lookups
        store.createIndex('idempotencyKey', 'idempotencyKey', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        // Migration: add indexes if they don't exist
        const store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORE_NAME);
        if (!store.indexNames.contains('idempotencyKey')) {
          store.createIndex('idempotencyKey', 'idempotencyKey', { unique: false });
        }
        if (!store.indexNames.contains('createdAt')) {
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
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

/**
 * Generate idempotency key from payload
 */
const generateIdempotencyKey = (payload: any, action?: string): string => {
  // Use action + payload hash for idempotency
  const payloadStr = JSON.stringify(payload);
  const hash = payloadStr.split('').reduce((acc, char) => {
    const hash = ((acc << 5) - acc) + char.charCodeAt(0);
    return hash & hash;
  }, 0);
  return `${action || 'default'}-${Math.abs(hash)}-${Date.now()}`;
};

/**
 * Exponential backoff delay calculation
 */
const getBackoffDelay = (retryCount: number): number => {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 60s
  const baseDelay = 1000; // 1 second
  const maxDelay = 60000; // 60 seconds
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return delay + jitter;
};

export const OfflineQueue = {
  /**
   * Enqueue a payload with idempotency and retry configuration
   */
  async enqueue(
    payload: any,
    options: {
      idempotencyKey?: string;
      action?: string;
      maxRetries?: number;
      metadata?: Record<string, any>;
    } = {}
  ) {
    if (!isSupported()) return;
    
    const idempotencyKey = options.idempotencyKey || generateIdempotencyKey(payload, options.action);
    
    // Check for existing entry with same idempotency key
    const existing = await this.getByKey(idempotencyKey);
    if (existing) {
      console.log('Duplicate idempotency key detected, skipping enqueue');
      return existing.id;
    }
    
    const entry: QueueEntry = {
      payload,
      createdAt: Date.now(),
      idempotencyKey,
      retryCount: 0,
      lastRetryAt: undefined,
      maxRetries: options.maxRetries || 5,
      action: options.action,
      metadata: options.metadata,
    };
    
    await withStore<void>('readwrite', (store) => {
      store.add(entry);
    });
    await notifyQueueUpdate();
    return entry.id;
  },

  /**
   * Get entry by idempotency key
   */
  async getByKey(idempotencyKey: string): Promise<QueueEntry | null> {
    if (!isSupported()) return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('idempotencyKey');
      const request = index.get(idempotencyKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
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

  /**
   * Flush queue with exponential backoff and conflict handling
   */
  async flush(
    sender: (payload: any, metadata?: Record<string, any>) => Promise<{ 
      status?: string; 
      result?: string;
      conflict?: boolean;
      conflictResolution?: 'last-write-wins' | 'merge' | 'user-choice';
      error?: string;
    }>
  ) {
    if (!isSupported()) return { flushed: 0, failed: 0, conflicts: 0 };
    const entries = await OfflineQueue.getAll();
    let flushed = 0;
    let failed = 0;
    let conflicts = 0;

    // Sort by creation time (oldest first)
    entries.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    for (const entry of entries) {
      // Check if we should retry (backoff delay)
      if (entry.retryCount && entry.retryCount > 0 && entry.lastRetryAt) {
        const delay = getBackoffDelay(entry.retryCount - 1);
        const timeSinceLastRetry = Date.now() - entry.lastRetryAt;
        if (timeSinceLastRetry < delay) {
          // Not time to retry yet, skip
          continue;
        }
      }

      // Check max retries
      if (entry.retryCount && entry.retryCount >= (entry.maxRetries || 5)) {
        // Max retries exceeded, mark as failed
        failed += 1;
        continue;
      }

      try {
        const response = await sender(entry.payload, entry.metadata);
        const ok =
          response?.status === 'success' ||
          response?.status === 'ok' ||
          response?.result === 'success';

        if (ok && entry.id) {
          // Success - remove from queue
          await OfflineQueue.remove(entry.id);
          flushed += 1;
        } else if (response?.conflict) {
          // Conflict detected
          conflicts += 1;
          
          // Handle conflict based on resolution strategy
          if (response.conflictResolution === 'last-write-wins') {
            // Last write wins - remove old entry
            if (entry.id) {
              await OfflineQueue.remove(entry.id);
              flushed += 1;
            }
          } else if (response.conflictResolution === 'user-choice') {
            // User needs to resolve - keep in queue but mark
            await this.updateEntry(entry.id!, {
              ...entry,
              metadata: {
                ...entry.metadata,
                conflict: true,
                conflictMessage: response.error || 'Conflict detected',
              },
            });
          } else {
            // Default: increment retry count
            await this.incrementRetry(entry.id!);
          }
        } else {
          // Error - increment retry count
          await this.incrementRetry(entry.id!);
        }
      } catch (error: any) {
        // Network or other error - increment retry count
        console.warn('Queue flush error:', error);
        await this.incrementRetry(entry.id!);
      }
    }

    if (flushed > 0 || failed > 0 || conflicts > 0) {
      await notifyQueueUpdate();
    }

    return { flushed, failed, conflicts };
  },

  /**
   * Update queue entry
   */
  async updateEntry(id: number, updates: Partial<QueueEntry>) {
    if (!isSupported()) return;
    const entry = await this.getById(id);
    if (!entry) return;
    
    await withStore<void>('readwrite', (store) => {
      store.put({ ...entry, ...updates, id });
    });
    await notifyQueueUpdate();
  },

  /**
   * Get entry by ID
   */
  async getById(id: number): Promise<QueueEntry | null> {
    if (!isSupported()) return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Increment retry count for an entry
   */
  async incrementRetry(id: number) {
    if (!isSupported()) return;
    const entry = await this.getById(id);
    if (!entry) return;
    
    await this.updateEntry(id, {
      retryCount: (entry.retryCount || 0) + 1,
      lastRetryAt: Date.now(),
    });
  },

  /**
   * Get failed entries (exceeded max retries)
   */
  async getFailed(): Promise<QueueEntry[]> {
    if (!isSupported()) return [];
    const entries = await this.getAll();
    return entries.filter(
      (entry) => 
        entry.retryCount !== undefined && 
        entry.maxRetries !== undefined &&
        entry.retryCount >= entry.maxRetries
    );
  },

  /**
   * Get entries with conflicts
   */
  async getConflicts(): Promise<QueueEntry[]> {
    if (!isSupported()) return [];
    const entries = await this.getAll();
    return entries.filter(
      (entry) => entry.metadata?.conflict === true
    );
  },

  /**
   * Clear failed entries
   */
  async clearFailed() {
    if (!isSupported()) return;
    const failed = await this.getFailed();
    for (const entry of failed) {
      if (entry.id) {
        await this.remove(entry.id);
      }
    }
    await notifyQueueUpdate();
  },
};
