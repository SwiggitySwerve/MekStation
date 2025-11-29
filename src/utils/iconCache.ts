/**
 * Icon Cache - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

const iconCache = new Map<string, string>();

export function getIcon(name: string): string | null {
  return iconCache.get(name) ?? null;
}

export function setIcon(name: string, svg: string): void {
  iconCache.set(name, svg);
}

export function clearIconCache(): void {
  iconCache.clear();
}


