/**
 * Mock IndexedDB
 *
 * In-memory mock of IndexedDB for testing persistence services.
 */

type StoreName = string;
type Key = string;
type Value = unknown;

/**
 * In-memory store simulation
 */
class MockStore {
  private data: Map<Key, Value> = new Map();

  put(key: Key, value: Value): void {
    this.data.set(key, structuredClone(value));
  }

  get(key: Key): Value | undefined {
    const value = this.data.get(key);
    return value !== undefined ? structuredClone(value) : undefined;
  }

  delete(key: Key): boolean {
    return this.data.delete(key);
  }

  getAll(): Value[] {
    return Array.from(this.data.values()).map((v) => structuredClone(v));
  }

  getAllKeys(): Key[] {
    return Array.from(this.data.keys());
  }

  clear(): void {
    this.data.clear();
  }

  count(): number {
    return this.data.size;
  }
}

/**
 * Mock IndexedDB database
 */
class MockDatabase {
  private stores: Map<StoreName, MockStore> = new Map();
  readonly name: string;
  readonly version: number;

  constructor(name: string, version: number = 1) {
    this.name = name;
    this.version = version;
  }

  createObjectStore(name: StoreName): MockStore {
    if (!this.stores.has(name)) {
      this.stores.set(name, new MockStore());
    }
    return this.stores.get(name)!;
  }

  getStore(name: StoreName): MockStore | undefined {
    return this.stores.get(name);
  }

  deleteObjectStore(name: StoreName): boolean {
    return this.stores.delete(name);
  }

  close(): void {
    // No-op for mock
  }
}

/**
 * Global mock database registry
 */
const databases: Map<string, MockDatabase> = new Map();

/**
 * Create or get a mock database
 */
export function getMockDatabase(
  name: string,
  version: number = 1,
): MockDatabase {
  if (!databases.has(name)) {
    databases.set(name, new MockDatabase(name, version));
  }
  return databases.get(name)!;
}

/**
 * Delete a mock database
 */
export function deleteMockDatabase(name: string): boolean {
  return databases.delete(name);
}

/**
 * Clear all mock databases
 */
export function clearAllMockDatabases(): void {
  databases.clear();
}

/**
 * Mock IDBFactory interface
 */
export const mockIndexedDB = {
  open(name: string, version?: number): MockOpenRequest {
    return new MockOpenRequest(name, version ?? 1);
  },
  deleteDatabase(name: string): MockDeleteRequest {
    return new MockDeleteRequest(name);
  },
  databases(): Promise<Array<{ name: string; version: number }>> {
    return Promise.resolve(
      Array.from(databases.entries()).map(([name, db]) => ({
        name,
        version: db.version,
      })),
    );
  },
};

/**
 * Mock IDBOpenRequest
 */
class MockOpenRequest {
  readonly name: string;
  readonly version: number;
  result: MockDatabase | null = null;
  error: Error | null = null;

  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onupgradeneeded: ((event: Event) => void) | null = null;

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;

    // Simulate async behavior
    setTimeout(() => {
      try {
        const isNew = !databases.has(name);
        this.result = getMockDatabase(name, version);

        if (isNew && this.onupgradeneeded) {
          this.onupgradeneeded(new Event('upgradeneeded'));
        }

        if (this.onsuccess) {
          this.onsuccess(new Event('success'));
        }
      } catch (error) {
        this.error = error as Error;
        if (this.onerror) {
          this.onerror(new Event('error'));
        }
      }
    }, 0);
  }
}

/**
 * Mock IDBDeleteRequest
 */
class MockDeleteRequest {
  readonly name: string;
  error: Error | null = null;

  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(name: string) {
    this.name = name;

    setTimeout(() => {
      try {
        deleteMockDatabase(name);
        if (this.onsuccess) {
          this.onsuccess(new Event('success'));
        }
      } catch (error) {
        this.error = error as Error;
        if (this.onerror) {
          this.onerror(new Event('error'));
        }
      }
    }, 0);
  }
}

/**
 * Setup mock IndexedDB globally
 */
export function setupMockIndexedDB(): void {
  // @ts-expect-error - Mock for testing
  global.indexedDB = mockIndexedDB;
}

/**
 * Teardown mock IndexedDB
 */
export function teardownMockIndexedDB(): void {
  clearAllMockDatabases();
  // @ts-expect-error - Delete global.indexedDB property for cleanup
  delete global.indexedDB;
}

export { MockDatabase, MockStore };
