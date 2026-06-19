/**
 * Force.test.ts - Comprehensive tests for Force interface and traversal functions
 */

import { ForceRole, FormationLevel } from '../enums';
import {
  IForce,
  getAllParents,
  getAllSubForces,
  getAllUnits,
  getFullName,
} from '../Force';

describe('getAllUnits', () => {
  it('should return empty array for force with no units', () => {
    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: [],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.COMPANY,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([[company.id, company]]);
    const units = getAllUnits(company, forceMap);

    expect(units).toEqual([]);
  });

  it('should return units from force only', () => {
    const lance: IForce = {
      id: 'lance-1',
      name: 'Alpha Lance',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: ['unit-1', 'unit-2', 'unit-3', 'unit-4'],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([[lance.id, lance]]);
    const units = getAllUnits(lance, forceMap);

    expect(units).toHaveLength(4);
    expect(units).toEqual(['unit-1', 'unit-2', 'unit-3', 'unit-4']);
  });

  it('should return units from force and all sub-forces', () => {
    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: undefined,
      subForceIds: ['lance-1', 'lance-2'],
      unitIds: ['unit-hq-1', 'unit-hq-2'],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.COMPANY,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const lance1: IForce = {
      id: 'lance-1',
      name: 'Alpha Lance',
      parentForceId: 'company-1',
      subForceIds: [],
      unitIds: ['unit-1', 'unit-2', 'unit-3', 'unit-4'],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const lance2: IForce = {
      id: 'lance-2',
      name: 'Bravo Lance',
      parentForceId: 'company-1',
      subForceIds: [],
      unitIds: ['unit-5', 'unit-6', 'unit-7', 'unit-8'],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([
      [company.id, company],
      [lance1.id, lance1],
      [lance2.id, lance2],
    ]);

    const units = getAllUnits(company, forceMap);

    expect(units).toHaveLength(10);
    expect(units).toContain('unit-hq-1');
    expect(units).toContain('unit-hq-2');
    expect(units).toContain('unit-1');
    expect(units).toContain('unit-8');
  });

  it('should handle deep nesting', () => {
    const battalion: IForce = {
      id: 'battalion-1',
      name: '1st Battalion',
      parentForceId: undefined,
      subForceIds: ['company-1'],
      unitIds: ['unit-bn-1'],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.BATTALION,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: 'battalion-1',
      subForceIds: ['lance-1'],
      unitIds: ['unit-co-1'],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.COMPANY,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const lance: IForce = {
      id: 'lance-1',
      name: 'Alpha Lance',
      parentForceId: 'company-1',
      subForceIds: [],
      unitIds: ['unit-1', 'unit-2', 'unit-3', 'unit-4'],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([
      [battalion.id, battalion],
      [company.id, company],
      [lance.id, lance],
    ]);

    const units = getAllUnits(battalion, forceMap);

    expect(units).toHaveLength(6);
    expect(units).toContain('unit-bn-1');
    expect(units).toContain('unit-co-1');
    expect(units).toContain('unit-1');
    expect(units).toContain('unit-4');
  });

  it('should handle missing sub-forces gracefully', () => {
    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: undefined,
      subForceIds: ['lance-1', 'lance-2'], // lance-2 not in map
      unitIds: ['unit-hq-1'],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.COMPANY,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const lance1: IForce = {
      id: 'lance-1',
      name: 'Alpha Lance',
      parentForceId: 'company-1',
      subForceIds: [],
      unitIds: ['unit-1', 'unit-2'],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([
      [company.id, company],
      [lance1.id, lance1],
    ]);

    const units = getAllUnits(company, forceMap);

    expect(units).toHaveLength(3);
    expect(units).toContain('unit-hq-1');
    expect(units).toContain('unit-1');
    expect(units).toContain('unit-2');
  });
});
