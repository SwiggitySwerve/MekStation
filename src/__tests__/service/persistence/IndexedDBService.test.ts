import { IndexedDBService, STORES } from '@/services/persistence/IndexedDBService';
import { StorageError } from '@/services/common/errors';

// Enhanced mock that supports transactions
class MockTransaction {
  private store: MockObjectStore;
  mode: 'readonly' | 'readwrite';

  constructor(storeName: string, mode: 'readonly' | 'readwrite', db: MockDatabase) {
    this.mode = mode;
    this.store = new MockObjectStore(storeName, db);
  }

  objectStore(_name: string): MockObjectStore {
    return this.store;
  }
}

class MockObjectStore {
  private storeName: string;
  private db: MockDatabase;

  constructor(storeName: string, db: MockDatabase) {
    this.storeName = storeName;
    this.db = db;
  }

  put(value: unknown, key: string): MockRequest {
    const request = new MockRequest();
    setTimeout(() => {
      const store = this.db.getStore(this.storeName);
      if (store) {
        store.set(key, value);
        request.result = undefined;
        request.onsuccess?.(new Event('success'));
      } else {
        request.error = new Error('Store not found');
        request.onerror?.(new Event('error'));
      }
    }, 0);
    return request;
  }

  get(key: string): MockRequest {
    const request = new MockRequest();
    setTimeout(() => {
      const store = this.db.getStore(this.storeName);
      if (store) {
        request.result = store.get(key);
        request.onsuccess?.(new Event('success'));
      } else {
        request.error = new Error('Store not found');
        request.onerror?.(new Event('error'));
      }
    }, 0);
    return request;
  }

  delete(key: string): MockRequest {
    const request = new MockRequest();
    setTimeout(() => {
      const store = this.db.getStore(this.storeName);
      if (store) {
        store.delete(key);
        request.result = undefined;
        request.onsuccess?.(new Event('success'));
      } else {
        request.error = new Error('Store not found');
        request.onerror?.(new Event('error'));
      }
    }, 0);
    return request;
  }

  getAll(): MockRequest {
    const request = new MockRequest();
    setTimeout(() => {
      const store = this.db.getStore(this.storeName);
      if (store) {
        request.result = Array.from(store.values());
        request.onsuccess?.(new Event('success'));
      } else {
        request.error = new Error('Store not found');
        request.onerror?.(new Event('error'));
      }
    }, 0);
    return request;
  }

  clear(): MockRequest {
    const request = new MockRequest();
    setTimeout(() => {
      const store = this.db.getStore(this.storeName);
      if (store) {
        store.clear();
        request.result = undefined;
        request.onsuccess?.(new Event('success'));
      } else {
        request.error = new Error('Store not found');
        request.onerror?.(new Event('error'));
      }
    }, 0);
    return request;
  }
}

class MockRequest {
  result: unknown = undefined;
  error: Error | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
}

class MockDatabase {
  private stores: Map<string, Map<string, unknown>> = new Map();
  readonly name: string;
  readonly version: number;
  readonly objectStoreNames: DOMStringList;

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
    // Create a mock DOMStringList
    const storeNamesSet = this.stores;
    this.objectStoreNames = {
      length: 0,
      contains: (name: string) => storeNamesSet.has(name),
      item: () => null,
      [Symbol.iterator]: function* () { yield* []; },
    } as DOMStringList;
  }

  createObjectStore(name: string): void {
    if (!this.stores.has(name)) {
      this.stores.set(name, new Map());
    }
  }

  getStore(name: string): Map<string, unknown> | undefined {
    return this.stores.get(name);
  }

  transaction(storeNames: string | string[], mode: 'readonly' | 'readwrite'): MockTransaction {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockTransaction(names[0], mode, this);
  }

  close(): void {
    // No-op
  }
}

// Mock IndexedDB with transaction support
const mockDatabases = new Map<string, MockDatabase>();

const mockIndexedDBWithTransactions = {
  open(name: string, version?: number): unknown {
    const dbVersion = version ?? 1;
    const request = {
      result: null as MockDatabase | null,
      error: null as DOMException | null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
    };

    // Use setTimeout to ensure callbacks are set before we call them
    setTimeout(() => {
      try {
        let db = mockDatabases.get(name);
        const isNew = !db;
        
        if (isNew || (db && db.version < dbVersion)) {
          db = new MockDatabase(name, dbVersion);
          mockDatabases.set(name, db);
          
          // Set result before calling onupgradeneeded so it can access db
          request.result = db;
          
          if (request.onupgradeneeded) {
            const upgradeEvent = {
              target: { result: db },
            } as unknown as IDBVersionChangeEvent;
            request.onupgradeneeded(upgradeEvent);
          }
        }
        
        request.result = db;
        if (request.onsuccess) {
          request.onsuccess(new Event('success'));
        }
      } catch (error) {
        request.error = new DOMException(String(error));
        if (request.onerror) {
          request.onerror(new Event('error'));
        }
      }
    }, 0);

    return request;
  },
};

describe('IndexedDBService', () => {
  let service: IndexedDBService;

  beforeEach(() => {
    mockDatabases.clear();
    // @ts-expect-error - Mock for testing
    global.indexedDB = mockIndexedDBWithTransactions;
    service = new IndexedDBService();
  });

  afterEach(() => {
    service.close();
    mockDatabases.clear();
  });

  describe('initialize', () => {
    it('should initialize database successfully', async () => {
      await service.initialize();
      // Should not throw
    });

    it('should return immediately if already initialized', async () => {
      await service.initialize();
      await service.initialize(); // Second call should return immediately
      // Should not throw
    });

    it('should return same promise if initialization in progress', async () => {
      const promise1 = service.initialize();
      const promise2 = service.initialize();
      // Both calls should complete without error
      await Promise.all([promise1, promise2]);
      // After both complete, the service should be initialized
      expect(service['db']).toBeDefined();
    });

    it('should handle database open errors', async () => {
      // Mock a failing open
      const originalOpen = mockIndexedDBWithTransactions.open;
      mockIndexedDBWithTransactions.open = jest.fn(() => {
        const request = {
          result: null,
          error: new Error('Database error'),
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
        };
        setTimeout(() => {
          if (request.onerror) {
            request.onerror(new Event('error'));
          }
        }, 0);
        return request;
      });

      await expect(service.initialize()).rejects.toThrow(StorageError);
      
      mockIndexedDBWithTransactions.open = originalOpen;
    });
  });

  describe('put', () => {
    it('should store a value', async () => {
      await service.initialize();
      const value = { id: '1', name: 'Test Unit' };
      
      await service.put(STORES.CUSTOM_UNITS, 'unit-1', value);
      
      const retrieved = await service.get(STORES.CUSTOM_UNITS, 'unit-1');
      expect(retrieved).toEqual(value);
    });

    it('should throw if database not initialized', async () => {
      await expect(
        service.put(STORES.CUSTOM_UNITS, 'key', {})
      ).rejects.toThrow(StorageError);
    });
  });

  describe('get', () => {
    it('should retrieve a stored value', async () => {
      await service.initialize();
      const value = { id: '1', name: 'Test Unit' };
      
      await service.put(STORES.CUSTOM_UNITS, 'unit-1', value);
      const retrieved = await service.get(STORES.CUSTOM_UNITS, 'unit-1');
      
      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent key', async () => {
      await service.initialize();
      
      const retrieved = await service.get(STORES.CUSTOM_UNITS, 'non-existent');
      
      expect(retrieved).toBeUndefined();
    });

    it('should throw if database not initialized', async () => {
      await expect(
        service.get(STORES.CUSTOM_UNITS, 'key')
      ).rejects.toThrow(StorageError);
    });
  });

  describe('delete', () => {
    it('should delete a stored value', async () => {
      await service.initialize();
      const value = { id: '1', name: 'Test Unit' };
      
      await service.put(STORES.CUSTOM_UNITS, 'unit-1', value);
      await service.delete(STORES.CUSTOM_UNITS, 'unit-1');
      
      const retrieved = await service.get(STORES.CUSTOM_UNITS, 'unit-1');
      expect(retrieved).toBeUndefined();
    });

    it('should throw if database not initialized', async () => {
      await expect(
        service.delete(STORES.CUSTOM_UNITS, 'key')
      ).rejects.toThrow(StorageError);
    });
  });

  describe('getAll', () => {
    it('should retrieve all values from store', async () => {
      await service.initialize();
      const unit1 = { id: '1', name: 'Unit 1' };
      const unit2 = { id: '2', name: 'Unit 2' };
      
      await service.put(STORES.CUSTOM_UNITS, 'unit-1', unit1);
      await service.put(STORES.CUSTOM_UNITS, 'unit-2', unit2);
      
      const all = await service.getAll(STORES.CUSTOM_UNITS);
      
      expect(all).toHaveLength(2);
      expect(all).toContainEqual(unit1);
      expect(all).toContainEqual(unit2);
    });

    it('should return empty array for empty store', async () => {
      await service.initialize();
      
      const all = await service.getAll(STORES.CUSTOM_UNITS);
      
      expect(all).toEqual([]);
    });

    it('should throw if database not initialized', async () => {
      await expect(
        service.getAll(STORES.CUSTOM_UNITS)
      ).rejects.toThrow(StorageError);
    });
  });

  describe('clear', () => {
    it('should clear all values from store', async () => {
      await service.initialize();
      await service.put(STORES.CUSTOM_UNITS, 'unit-1', { id: '1' });
      await service.put(STORES.CUSTOM_UNITS, 'unit-2', { id: '2' });
      
      await service.clear(STORES.CUSTOM_UNITS);
      
      const all = await service.getAll(STORES.CUSTOM_UNITS);
      expect(all).toEqual([]);
    });

    it('should throw if database not initialized', async () => {
      await expect(
        service.clear(STORES.CUSTOM_UNITS)
      ).rejects.toThrow(StorageError);
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      await service.initialize();
      
      service.close();
      
      // Should be able to initialize again after close
      await service.initialize();
    });

    it('should reset initialization promise', async () => {
      await service.initialize();
      service.close();
      
      // Should be able to re-initialize after close
      await service.initialize();
      // After reinitialize, db should be connected again
      expect(service['db']).toBeDefined();
    });

    it('should handle close when database not initialized', () => {
      expect(() => service.close()).not.toThrow();
    });
  });

  describe('error handling', () => {
    // Create a mock store that always fails
    const createFailingStore = () => ({
      put: () => {
        const req = new MockRequest();
        setTimeout(() => {
          req.error = new Error('Mock error');
          req.onerror?.(new Event('error'));
        }, 0);
        return req;
      },
      get: () => {
        const req = new MockRequest();
        setTimeout(() => {
          req.error = new Error('Mock error');
          req.onerror?.(new Event('error'));
        }, 0);
        return req;
      },
      delete: () => {
        const req = new MockRequest();
        setTimeout(() => {
          req.error = new Error('Mock error');
          req.onerror?.(new Event('error'));
        }, 0);
        return req;
      },
      getAll: () => {
        const req = new MockRequest();
        setTimeout(() => {
          req.error = new Error('Mock error');
          req.onerror?.(new Event('error'));
        }, 0);
        return req;
      },
      clear: () => {
        const req = new MockRequest();
        setTimeout(() => {
          req.error = new Error('Mock error');
          req.onerror?.(new Event('error'));
        }, 0);
        return req;
      },
    });

    it('should handle transaction errors in put', async () => {
      await service.initialize();
      
      const db = mockDatabases.get('battletech-editor');
      if (db) {
        db.transaction = jest.fn(() => ({
          objectStore: () => createFailingStore(),
        })) as MockDatabase['transaction'];
      }

      await expect(
        service.put(STORES.CUSTOM_UNITS, 'test-key', {})
      ).rejects.toThrow(StorageError);
    });

    it('should handle transaction errors in get', async () => {
      await service.initialize();
      
      const db = mockDatabases.get('battletech-editor');
      if (db) {
        db.transaction = jest.fn(() => ({
          objectStore: () => createFailingStore(),
        })) as MockDatabase['transaction'];
      }

      await expect(
        service.get(STORES.CUSTOM_UNITS, 'test-key')
      ).rejects.toThrow(StorageError);
    });

    it('should handle transaction errors in delete', async () => {
      await service.initialize();
      
      const db = mockDatabases.get('battletech-editor');
      if (db) {
        db.transaction = jest.fn(() => ({
          objectStore: () => createFailingStore(),
        })) as MockDatabase['transaction'];
      }

      await expect(
        service.delete(STORES.CUSTOM_UNITS, 'test-key')
      ).rejects.toThrow(StorageError);
    });

    it('should handle transaction errors in getAll', async () => {
      await service.initialize();
      
      const db = mockDatabases.get('battletech-editor');
      if (db) {
        db.transaction = jest.fn(() => ({
          objectStore: () => createFailingStore(),
        })) as MockDatabase['transaction'];
      }

      await expect(
        service.getAll(STORES.CUSTOM_UNITS)
      ).rejects.toThrow(StorageError);
    });

    it('should handle transaction errors in clear', async () => {
      await service.initialize();
      
      const db = mockDatabases.get('battletech-editor');
      if (db) {
        db.transaction = jest.fn(() => ({
          objectStore: () => createFailingStore(),
        })) as MockDatabase['transaction'];
      }

      await expect(
        service.clear(STORES.CUSTOM_UNITS)
      ).rejects.toThrow(StorageError);
    });
  });

  describe('edge cases', () => {
    it('should handle null values', async () => {
      await service.initialize();
      
      await service.put(STORES.CUSTOM_UNITS, 'null-key', null as unknown);
      const retrieved = await service.get(STORES.CUSTOM_UNITS, 'null-key');
      expect(retrieved).toBeNull();
    });

    it('should handle undefined values', async () => {
      await service.initialize();
      
      await service.put(STORES.CUSTOM_UNITS, 'undefined-key', undefined as unknown);
      const retrieved = await service.get(STORES.CUSTOM_UNITS, 'undefined-key');
      expect(retrieved).toBeUndefined();
    });

    it('should handle large objects', async () => {
      await service.initialize();
      const largeObject = {
        id: 'large',
        data: 'x'.repeat(10000),
        nested: {
          array: Array(100).fill({ value: 'test' }),
        },
      };
      
      await service.put(STORES.CUSTOM_UNITS, 'large-key', largeObject);
      const retrieved = await service.get(STORES.CUSTOM_UNITS, 'large-key');
      expect(retrieved).toEqual(largeObject);
    });

    it('should handle all store types', async () => {
      await service.initialize();
      const testValue = { id: 'test' };
      
      await service.put(STORES.CUSTOM_UNITS, 'key1', testValue);
      await service.put(STORES.UNIT_METADATA, 'key2', testValue);
      await service.put(STORES.CUSTOM_FORMULAS, 'key3', testValue);
      
      expect(await service.get(STORES.CUSTOM_UNITS, 'key1')).toEqual(testValue);
      expect(await service.get(STORES.UNIT_METADATA, 'key2')).toEqual(testValue);
      expect(await service.get(STORES.CUSTOM_FORMULAS, 'key3')).toEqual(testValue);
    });
  });
});

