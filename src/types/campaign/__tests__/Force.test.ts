/**
 * Force.test.ts - Comprehensive tests for Force interface and traversal functions
 */

import {
  IForce,
  getAllParents,
  getAllSubForces,
  getAllUnits,
  getFullName,
} from '../Force';
import { ForceType, FormationLevel } from '../enums';

describe('IForce Interface', () => {
  it('should have all required fields', () => {
    const force: IForce = {
      id: 'force-1',
      name: 'Alpha Lance',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    expect(force.id).toBe('force-1');
    expect(force.name).toBe('Alpha Lance');
    expect(force.parentForceId).toBeUndefined();
    expect(force.subForceIds).toEqual([]);
    expect(force.unitIds).toEqual([]);
    expect(force.forceType).toBe(ForceType.STANDARD);
    expect(force.formationLevel).toBe(FormationLevel.LANCE);
    expect(force.commanderId).toBeUndefined();
    expect(force.createdAt).toBe('2026-01-26T10:00:00Z');
    expect(force.updatedAt).toBe('2026-01-26T10:00:00Z');
  });

  it('should support hierarchical structure with parent and children', () => {
    const battalion: IForce = {
      id: 'battalion-1',
      name: '1st Battalion',
      parentForceId: undefined,
      subForceIds: ['company-1', 'company-2', 'company-3'],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.BATTALION,
      commanderId: 'person-1',
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    expect(battalion.subForceIds).toHaveLength(3);
    expect(battalion.parentForceId).toBeUndefined();
  });

  it('should support units assigned to force', () => {
    const lance: IForce = {
      id: 'lance-1',
      name: 'Alpha Lance',
      parentForceId: 'company-1',
      subForceIds: [],
      unitIds: ['unit-1', 'unit-2', 'unit-3', 'unit-4'],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: 'person-2',
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    expect(lance.unitIds).toHaveLength(4);
  });

  it('should support different force types', () => {
    const reconForce: IForce = {
      id: 'recon-1',
      name: 'Recon Lance',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: ['unit-5', 'unit-6'],
      forceType: ForceType.RECON,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    expect(reconForce.forceType).toBe(ForceType.RECON);
  });

  it('should support different formation levels', () => {
    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: 'battalion-1',
      subForceIds: ['lance-1', 'lance-2', 'lance-3'],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.COMPANY,
      commanderId: 'person-3',
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    expect(company.formationLevel).toBe(FormationLevel.COMPANY);
  });
});

describe('getAllParents', () => {
  it('should return empty array for root force', () => {
    const battalion: IForce = {
      id: 'battalion-1',
      name: '1st Battalion',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.BATTALION,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([[battalion.id, battalion]]);
    const parents = getAllParents(battalion, forceMap);

    expect(parents).toEqual([]);
  });

  it('should return immediate parent for force with one parent', () => {
    const battalion: IForce = {
      id: 'battalion-1',
      name: '1st Battalion',
      parentForceId: undefined,
      subForceIds: ['company-1'],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.BATTALION,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: 'battalion-1',
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.COMPANY,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([
      [battalion.id, battalion],
      [company.id, company],
    ]);

    const parents = getAllParents(company, forceMap);

    expect(parents).toHaveLength(1);
    expect(parents[0]).toEqual(battalion);
  });

  it('should return all parents in order (immediate → root)', () => {
    const battalion: IForce = {
      id: 'battalion-1',
      name: '1st Battalion',
      parentForceId: undefined,
      subForceIds: ['company-1'],
      unitIds: [],
      forceType: ForceType.STANDARD,
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
      unitIds: [],
      forceType: ForceType.STANDARD,
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
      unitIds: [],
      forceType: ForceType.STANDARD,
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

    const parents = getAllParents(lance, forceMap);

    expect(parents).toHaveLength(2);
    expect(parents[0]).toEqual(company);
    expect(parents[1]).toEqual(battalion);
  });

  it('should handle missing parent gracefully', () => {
    const lance: IForce = {
      id: 'lance-1',
      name: 'Alpha Lance',
      parentForceId: 'company-1', // Parent not in map
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([[lance.id, lance]]);
    const parents = getAllParents(lance, forceMap);

    expect(parents).toEqual([]);
  });

  it('should prevent infinite loops with circular references', () => {
    const force1: IForce = {
      id: 'force-1',
      name: 'Force 1',
      parentForceId: 'force-2',
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const force2: IForce = {
      id: 'force-2',
      name: 'Force 2',
      parentForceId: 'force-1', // Circular reference
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([
      [force1.id, force1],
      [force2.id, force2],
    ]);

    const parents = getAllParents(force1, forceMap);

    // Should stop at circular reference
    expect(parents).toHaveLength(1);
    expect(parents[0]).toEqual(force2);
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
        forceType: ForceType.STANDARD,
        formationLevel: FormationLevel.LANCE,
        commanderId: undefined,
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      });
    }

    const forceMap = new Map<string, IForce>(forces.map(f => [f.id, f]));
    const parents = getAllParents(forces[5], forceMap);

    expect(parents).toHaveLength(5);
    expect(parents[0].id).toBe('force-4');
    expect(parents[4].id).toBe('force-0');
  });
});

describe('getAllSubForces', () => {
  it('should return empty array for force with no children', () => {
    const lance: IForce = {
      id: 'lance-1',
      name: 'Alpha Lance',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
        forceType: ForceType.STANDARD,
        formationLevel: FormationLevel.LANCE,
        commanderId: undefined,
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      });
    }

    const forceMap = new Map<string, IForce>(forces.map(f => [f.id, f]));
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
      subForceIds: ['company-1', 'company-2', 'company-3', 'company-4', 'company-5'],
      unitIds: [],
      forceType: ForceType.STANDARD,
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
        forceType: ForceType.STANDARD,
        formationLevel: FormationLevel.COMPANY,
        commanderId: undefined,
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      });
    }

    const forceMap = new Map<string, IForce>([
      [battalion.id, battalion],
      ...companies.map(c => [c.id, c] as [string, IForce]),
    ]);

    const subForces = getAllSubForces(battalion, forceMap);

    expect(subForces).toHaveLength(5);
  });
});

describe('getAllUnits', () => {
  it('should return empty array for force with no units', () => {
    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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
      forceType: ForceType.STANDARD,
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

describe('getFullName', () => {
  it('should return force name for root force', () => {
    const battalion: IForce = {
      id: 'battalion-1',
      name: '1st Battalion',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.BATTALION,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([[battalion.id, battalion]]);
    const fullName = getFullName(battalion, forceMap);

    expect(fullName).toBe('1st Battalion');
  });

  it('should return hierarchical name for force with one parent', () => {
    const battalion: IForce = {
      id: 'battalion-1',
      name: '1st Battalion',
      parentForceId: undefined,
      subForceIds: ['company-1'],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.BATTALION,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: 'battalion-1',
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.COMPANY,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([
      [battalion.id, battalion],
      [company.id, company],
    ]);

    const fullName = getFullName(company, forceMap);

    expect(fullName).toBe('1st Company, 1st Battalion');
  });

  it('should return full hierarchical name for deep nesting', () => {
    const battalion: IForce = {
      id: 'battalion-1',
      name: '3rd Battalion',
      parentForceId: undefined,
      subForceIds: ['company-1'],
      unitIds: [],
      forceType: ForceType.STANDARD,
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
      unitIds: [],
      forceType: ForceType.STANDARD,
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
      unitIds: [],
      forceType: ForceType.STANDARD,
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

    const fullName = getFullName(lance, forceMap);

    expect(fullName).toBe('Alpha Lance, 1st Company, 3rd Battalion');
  });

  it('should handle missing parent gracefully', () => {
    const lance: IForce = {
      id: 'lance-1',
      name: 'Alpha Lance',
      parentForceId: 'company-1', // Parent not in map
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([[lance.id, lance]]);
    const fullName = getFullName(lance, forceMap);

    expect(fullName).toBe('Alpha Lance');
  });

  it('should handle circular references gracefully', () => {
    const force1: IForce = {
      id: 'force-1',
      name: 'Force 1',
      parentForceId: 'force-2',
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const force2: IForce = {
      id: 'force-2',
      name: 'Force 2',
      parentForceId: 'force-1', // Circular reference
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([
      [force1.id, force1],
      [force2.id, force2],
    ]);

    const fullName = getFullName(force1, forceMap);

    // Should stop at circular reference
    expect(fullName).toBe('Force 1, Force 2');
  });

  it('should handle very deep nesting (5+ levels)', () => {
    const forces: IForce[] = [];
    for (let i = 0; i < 6; i++) {
      forces.push({
        id: `force-${i}`,
        name: `Level ${i}`,
        parentForceId: i > 0 ? `force-${i - 1}` : undefined,
        subForceIds: i < 5 ? [`force-${i + 1}`] : [],
        unitIds: [],
        forceType: ForceType.STANDARD,
        formationLevel: FormationLevel.LANCE,
        commanderId: undefined,
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      });
    }

    const forceMap = new Map<string, IForce>(forces.map(f => [f.id, f]));
    const fullName = getFullName(forces[5], forceMap);

    expect(fullName).toBe('Level 5, Level 4, Level 3, Level 2, Level 1, Level 0');
  });
});

describe('Edge Cases', () => {
  it('should handle empty force map', () => {
    const lance: IForce = {
      id: 'lance-1',
      name: 'Alpha Lance',
      parentForceId: 'company-1',
      subForceIds: ['lance-2'],
      unitIds: ['unit-1'],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>();

    expect(getAllParents(lance, forceMap)).toEqual([]);
    expect(getAllSubForces(lance, forceMap)).toEqual([]);
    expect(getAllUnits(lance, forceMap)).toEqual(['unit-1']);
    expect(getFullName(lance, forceMap)).toBe('Alpha Lance');
  });

  it('should handle force with empty arrays', () => {
    const force: IForce = {
      id: 'force-1',
      name: 'Empty Force',
      parentForceId: undefined,
      subForceIds: [],
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    const forceMap = new Map<string, IForce>([[force.id, force]]);

    expect(getAllParents(force, forceMap)).toEqual([]);
    expect(getAllSubForces(force, forceMap)).toEqual([]);
    expect(getAllUnits(force, forceMap)).toEqual([]);
    expect(getFullName(force, forceMap)).toBe('Empty Force');
  });

  it('should handle large force tree (100+ forces)', () => {
    const forces: IForce[] = [];
    
    // Create root
    forces.push({
      id: 'root',
      name: 'Root',
      parentForceId: undefined,
      subForceIds: Array.from({ length: 10 }, (_, i) => `level1-${i}`),
      unitIds: [],
      forceType: ForceType.STANDARD,
      formationLevel: FormationLevel.BATTALION,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    });

    // Create 10 level-1 forces, each with 10 children
    for (let i = 0; i < 10; i++) {
      forces.push({
        id: `level1-${i}`,
        name: `Level 1 - ${i}`,
        parentForceId: 'root',
        subForceIds: Array.from({ length: 10 }, (_, j) => `level2-${i}-${j}`),
        unitIds: [],
        forceType: ForceType.STANDARD,
        formationLevel: FormationLevel.COMPANY,
        commanderId: undefined,
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      });

      // Create 10 level-2 forces for each level-1
      for (let j = 0; j < 10; j++) {
        forces.push({
          id: `level2-${i}-${j}`,
          name: `Level 2 - ${i}-${j}`,
          parentForceId: `level1-${i}`,
          subForceIds: [],
          unitIds: [`unit-${i}-${j}`],
          forceType: ForceType.STANDARD,
          formationLevel: FormationLevel.LANCE,
          commanderId: undefined,
          createdAt: '2026-01-26T10:00:00Z',
          updatedAt: '2026-01-26T10:00:00Z',
        });
      }
    }

    const forceMap = new Map<string, IForce>(forces.map(f => [f.id, f]));

    // Test root has 110 descendants (10 level-1 + 100 level-2)
    const subForces = getAllSubForces(forces[0], forceMap);
    expect(subForces).toHaveLength(110);

    // Test root has 100 units
    const units = getAllUnits(forces[0], forceMap);
    expect(units).toHaveLength(100);

    // Test deep force has correct full name
    const deepForce = forceMap.get('level2-5-7')!;
    const fullName = getFullName(deepForce, forceMap);
    expect(fullName).toBe('Level 2 - 5-7, Level 1 - 5, Root');
  });
});
