/**
 * Memory Persistence - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export function saveToMemory(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadFromMemory<T>(key: string): T | null {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

export function removeFromMemory(key: string): void {
  localStorage.removeItem(key);
}

export function clearMemory(): void {
  localStorage.clear();
}


