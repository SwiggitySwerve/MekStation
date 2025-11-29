/**
 * Tech Base Memory - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

const STORAGE_KEY = 'techbase_preference';

export function saveTechBasePreference(techBase: string): void {
  localStorage.setItem(STORAGE_KEY, techBase);
}

export function loadTechBasePreference(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function clearTechBasePreference(): void {
  localStorage.removeItem(STORAGE_KEY);
}


