/**
 * Unit Persistence Service - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export interface UnitId {
  source: string;
  id: string;
}

export function parseUnitId(unitIdString: string): UnitId {
  const [source, id] = unitIdString.split(':');
  return { source: source ?? 'local', id: id ?? unitIdString };
}

export function formatUnitId(unitId: UnitId): string {
  return `${unitId.source}:${unitId.id}`;
}

export class UnitPersistenceService {
  async saveUnit(unit: unknown): Promise<string> {
    const id = `unit_${Date.now()}`;
    localStorage.setItem(id, JSON.stringify(unit));
    return id;
  }

  async loadUnit(id: string): Promise<unknown> {
    const data = localStorage.getItem(id);
    return data ? JSON.parse(data) : null;
  }

  async deleteUnit(id: string): Promise<void> {
    localStorage.removeItem(id);
  }

  async listUnits(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('unit_')) {
        keys.push(key);
      }
    }
    return keys;
  }
}


