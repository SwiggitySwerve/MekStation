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

describe('IForce Interface', () => {
  it('should have all required fields', () => {
    const force: IForce = {
      id: 'force-1',
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

    expect(force.id).toBe('force-1');
    expect(force.name).toBe('Alpha Lance');
    expect(force.parentForceId).toBeUndefined();
    expect(force.subForceIds).toEqual([]);
    expect(force.unitIds).toEqual([]);
    expect(force.forceType).toBe(ForceRole.STANDARD);
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
      forceType: ForceRole.STANDARD,
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
      forceType: ForceRole.STANDARD,
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
      forceType: ForceRole.RECON,
      formationLevel: FormationLevel.LANCE,
      commanderId: undefined,
      createdAt: '2026-01-26T10:00:00Z',
      updatedAt: '2026-01-26T10:00:00Z',
    };

    expect(reconForce.forceType).toBe(ForceRole.RECON);
  });

  it('should support different formation levels', () => {
    const company: IForce = {
      id: 'company-1',
      name: '1st Company',
      parentForceId: 'battalion-1',
      subForceIds: ['lance-1', 'lance-2', 'lance-3'],
      unitIds: [],
      forceType: ForceRole.STANDARD,
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
      forceType: ForceRole.STANDARD,
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
      subForceIds: [],
      unitIds: [],
      forceType: ForceRole.STANDARD,
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
      unitIds: [],
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
      forceType: ForceRole.STANDARD,
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
      forceType: ForceRole.STANDARD,
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
        forceType: ForceRole.STANDARD,
        formationLevel: FormationLevel.LANCE,
        commanderId: undefined,
        createdAt: '2026-01-26T10:00:00Z',
        updatedAt: '2026-01-26T10:00:00Z',
      });
    }

    const forceMap = new Map<string, IForce>(forces.map((f) => [f.id, f]));
    const parents = getAllParents(forces[5], forceMap);

    expect(parents).toHaveLength(5);
    expect(parents[0].id).toBe('force-4');
    expect(parents[4].id).toBe('force-0');
  });
});
