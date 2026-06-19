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

describe('getAllSubForces', () => {
  it('should return empty array for force with no children', () => {
    const lance: IForce = {
      id: 'lance-1',
      name: 'Alpha Lance',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: [],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([[lance.id, lance]]);
    const subForces = getAllSubForces(lance, forceMap);

    expect(subForces).toEqual([]);
  });

  it('should return immediate children for force with one level', () => {
    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: undefined,
      subForceIds: ['lance-1', 'lance-2', 'lance-3'],
      unitIds: [],
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
      unitIds: [],
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
      unitIds: [],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const lance3: IForce = {
      id: 'lance-3',
      name: 'Charlie Lance',
      parentForceId: 'company-1',
      subForceIds: [],
      unitIds: [],
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
      [lance3.id, lance3],
    ]);

    const subForces = getAllSubForces(company, forceMap);

    expect(subForces).toHaveLength(3);
    expect(subForces[0]).toEqual(lance1);
    expect(subForces[1]).toEqual(lance2);
    expect(subForces[2]).toEqual(lance3);
  });

  it('should return all descendants recursively', () => {
    const battalion: IForce = {
      id: 'battalion-1',
      name: '1st Battalion',
      parentForceId: undefined,
      subForceIds: ['company-1'],
      unitIds: [],
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
      subForceIds: ['lance-1', 'lance-2'],
      unitIds: [],
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
      unitIds: [],
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
      unitIds: [],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([
      [battalion.id, battalion],
      [company.id, company],
      [lance1.id, lance1],
      [lance2.id, lance2],
    ]);

    const subForces = getAllSubForces(battalion, forceMap);

    expect(subForces).toHaveLength(3);
    expect(subForces[0]).toEqual(company);
    expect(subForces[1]).toEqual(lance1);
    expect(subForces[2]).toEqual(lance2);
  });

  it('should handle missing sub-force gracefully', () => {
    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: undefined,
      subForceIds: ['lance-1', 'lance-2'], // lance-2 not in map
      unitIds: [],
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
      unitIds: [],
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

    const subForces = getAllSubForces(company, forceMap);

    expect(subForces).toHaveLength(1);
    expect(subForces[0]).toEqual(lance1);
  });

  it('should prevent infinite loops with circular references', () => {
    const force1: IForce = {
      id: 'force-1',
      name: 'Force 1',
      parentForceId: undefined,
      subForceIds: ['force-2'],
      unitIds: [],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const force2: IForce = {
      id: 'force-2',
      name: 'Force 2',
      parentForceId: 'force-1',
      subForceIds: ['force-1'], // Circular reference
      unitIds: [],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([
      [force1.id, force1],
      [force2.id, force2],
    ]);

    const subForces = getAllSubForces(force1, forceMap);

    // Should stop at circular reference
    expect(subForces).toHaveLength(1);
    expect(subForces[0]).toEqual(force2);
  });

  it('should handle deep nesting (5+ levels)', () => {
    const forces: IForce[] = [];
    for (let i = 0; i < 6; i++) {
      forces.push({
        id: `force-${i}`,
        name: `Force ${i}`,
        parentForceId: i > 0 ? `force-${i - 1}` : undefined,
        subForceIds: i < 5 ? [`force-${i + 1}`] : [],
        unitIds: [],
        forceType: ForceRole.STANDARD,
        formationLevel: FormationLevel.LANCE,
        commanderId: undefined,
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      });
    }

    const forceMap = new Map<string, IForce>(forces.map((f) => [f.id, f]));
    const subForces = getAllSubForces(forces[0], forceMap);

    expect(subForces).toHaveLength(5);
    expect(subForces[0].id).toBe('force-1');
    expect(subForces[4].id).toBe('force-5');
  });

  it('should handle wide tree (many siblings)', () => {
    const battalion: IForce = {
      id: 'battalion-1',
      name: '1st Battalion',
      parentForceId: undefined,
      subForceIds: [
        'company-1',
        'company-2',
        'company-3',
        'company-4',
        'company-5',
      ],
      unitIds: [],
      forceType: ForceRole.STANDARD,
      formationLevel: FormationLevel.BATTALION,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const companies: IForce[] = [];
    for (let i = 1; i <= 5; i++) {
      companies.push({
        id: `company-${i}`,
        name: `${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'} Company`,
        parentForceId: 'battalion-1',
        subForceIds: [],
        unitIds: [],
        forceType: ForceRole.STANDARD,
        formationLevel: FormationLevel.COMPANY,
        commanderId: undefined,
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      });
    }

    const forceMap = new Map<string, IForce>([
      [battalion.id, battalion],
      ...companies.map((c) => [c.id, c] as [string, IForce]),
    ]);

    const subForces = getAllSubForces(battalion, forceMap);

    expect(subForces).toHaveLength(5);
  });
});
