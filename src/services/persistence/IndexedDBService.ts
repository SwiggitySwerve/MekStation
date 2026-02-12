/**
 * IndexedDB Service
 *
 * Low-level IndexedDB operations for persistent browser storage.
 *
 * @spec openspec/specs/persistence-services/spec.md
 */

import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';

import { StorageError } from '../common/errors';

const DB_NAME = 'mekstation';
const DB_VERSION = 4; // Bumped for campaign instances stores

/**
 * Object store names
 */
export const STORES = {
  CUSTOM_UNITS: 'custom-units',
  UNIT_METADATA: 'unit-metadata',
  CUSTOM_FORMULAS: 'custom-formulas',
  PILOTS: 'pilots',
  CAMPAIGN_UNIT_INSTANCES: 'campaign-unit-instances',
  CAMPAIGN_PILOT_INSTANCES: 'campaign-pilot-instances',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

/**
 * IndexedDB service interface
 */
export interface IIndexedDBService {
  initialize(): Promise<void>;
  put<T>(store: StoreName, key: string, value: T): Promise<void>;
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  delete(store: StoreName, key: string): Promise<void>;
  getAll<T>(store: StoreName): Promise<T[]>;
  clear(store: StoreName): Promise<void>;
  close(): void;
}

/**
 * IndexedDB Service implementation
 */
export class IndexedDBService implements IIndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }

    // Return immediately if already initialized
    if (this.db) {
      return;
    }

    this.initPromise = this.openDatabase();
    return this.initPromise;
  }

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(
          new StorageError('Failed to open database', {
            error: request.error?.message,
          }),
        );
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.CUSTOM_UNITS)) {
          db.createObjectStore(STORES.CUSTOM_UNITS);
        }
        if (!db.objectStoreNames.contains(STORES.UNIT_METADATA)) {
          db.createObjectStore(STORES.UNIT_METADATA);
        }
        if (!db.objectStoreNames.contains(STORES.CUSTOM_FORMULAS)) {
          db.createObjectStore(STORES.CUSTOM_FORMULAS);
        }
        if (!db.objectStoreNames.contains(STORES.PILOTS)) {
          db.createObjectStore(STORES.PILOTS);
        }
        // Campaign instance stores (added in v4)
        if (!db.objectStoreNames.contains(STORES.CAMPAIGN_UNIT_INSTANCES)) {
          db.createObjectStore(STORES.CAMPAIGN_UNIT_INSTANCES);
        }
        if (!db.objectStoreNames.contains(STORES.CAMPAIGN_PILOT_INSTANCES)) {
          db.createObjectStore(STORES.CAMPAIGN_PILOT_INSTANCES);
        }
      };
    });
  }

  private ensureDb(): IDBDatabase {
    if (!this.db) {
      throw new StorageError(
        'Database not initialized. Call initialize() first.',
      );
    }
    return this.db;
  }

  /**
   * Store a value by key
   */
  async put<T>(store: StoreName, key: string, value: T): Promise<void> {
    const db = this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(value, key);

      request.onerror = () => {
        reject(
          new StorageError(`Failed to store item in ${store}`, {
            key,
            error: request.error?.message,
          }),
        );
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Retrieve a value by key
   */
  async get<T>(store: StoreName, key: string): Promise<T | undefined> {
    const db = this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onerror = () => {
        reject(
          new StorageError(`Failed to retrieve item from ${store}`, {
            key,
            error: request.error?.message,
          }),
        );
      };

      request.onsuccess = () => {
        resolve(request.result as T | undefined);
      };
    });
  }

  /**
   * Delete a value by key
   */
  async delete(store: StoreName, key: string): Promise<void> {
    const db = this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onerror = () => {
        reject(
          new StorageError(`Failed to delete item from ${store}`, {
            key,
            error: request.error?.message,
          }),
        );
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get all values from a store
   */
  async getAll<T>(store: StoreName): Promise<T[]> {
    const db = this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();

      request.onerror = () => {
        reject(
          new StorageError(`Failed to retrieve all items from ${store}`, {
            error: request.error?.message,
          }),
        );
      };

      request.onsuccess = () => {
        resolve(request.result as T[]);
      };
    });
  }

  /**
   * Clear all items from a store
   */
  async clear(store: StoreName): Promise<void> {
    const db = this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onerror = () => {
        reject(
          new StorageError(`Failed to clear ${store}`, {
            error: request.error?.message,
          }),
        );
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Singleton instance with lazy initialization
const indexedDBServiceFactory: SingletonFactory<IndexedDBService> =
  createSingleton((): IndexedDBService => new IndexedDBService());

export function getIndexedDBService(): IndexedDBService {
  return indexedDBServiceFactory.get();
}

export function resetIndexedDBService(): void {
  indexedDBServiceFactory.reset();
}

/** @internal Legacy alias */
export function _resetIndexedDBService(): void {
  indexedDBServiceFactory.reset();
}

// Legacy export for backward compatibility
// @deprecated Use getIndexedDBService() instead
export const indexedDBService = getIndexedDBService();
