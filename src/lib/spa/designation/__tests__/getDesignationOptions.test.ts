/**
 * getDesignationOptions — Wave 2b unit tests for the designation registry
 * that backs the picker's per-kind option lists.
 *
 * @spec openspec/changes/add-spa-designation-persistence/tasks.md
 */

import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { getSPADefinition } from '@/lib/spa';
import {
  getDesignationOptions,
  getOptionsForKind,
  isDeferredDesignationType,
} from '@/lib/spa/designation/getDesignationOptions';

describe('getOptionsForKind', () => {
  it('returns the weapon type list with canonical slug values', () => {
    const set = getOptionsForKind('weapon_type');
    expect(set.kind).toBe('weapon_type');
    expect(set.deferred).toBe(false);
    expect(set.options.length).toBeGreaterThan(0);

    const ppc = set.options.find((o) => o.value === 'ppc');
    expect(ppc).toBeDefined();
    expect(ppc?.label).toBe('PPC');

    const ml = set.options.find((o) => o.value === 'medium_laser');
    expect(ml?.label).toBe('Medium Laser');
  });

  it('returns the four canonical weapon categories', () => {
    const set = getOptionsForKind('weapon_category');
    expect(set.options.map((o) => o.value)).toEqual([
      'energy',
      'ballistic',
      'missile',
      'physical',
    ]);
  });

  it('returns all four range brackets', () => {
    const set = getOptionsForKind('range_bracket');
    expect(set.options.map((o) => o.value)).toEqual([
      'short',
      'medium',
      'long',
      'extreme',
    ]);
  });

  it('returns terrain options including the environmental specialist set', () => {
    const set = getOptionsForKind('terrain');
    const slugs = set.options.map((o) => o.value);
    // Spot-check both terrain-master (woods) + env_specialist (vacuum) coverage.
    expect(slugs).toContain('woods');
    expect(slugs).toContain('vacuum');
    expect(slugs).toContain('low_gravity');
  });

  it('marks the target kind as deferred with no options', () => {
    const set = getOptionsForKind('target');
    expect(set.deferred).toBe(true);
    expect(set.options).toHaveLength(0);
  });

  it('returns the placeholder skill list', () => {
    const set = getOptionsForKind('skill');
    expect(set.options.length).toBe(2);
  });
});

describe('getDesignationOptions(spa)', () => {
  it('returns kind:null for SPAs that do not require a designation', () => {
    const sniper = getSPADefinition('sniper');
    expect(sniper).toBeDefined();
    const set = getDesignationOptions(sniper as ISPADefinition);
    expect(set.kind).toBeNull();
    expect(set.options).toHaveLength(0);
  });

  it('returns the weapon_type list for Weapon Specialist', () => {
    const ws = getSPADefinition('weapon_specialist');
    expect(ws).toBeDefined();
    const set = getDesignationOptions(ws as ISPADefinition);
    expect(set.kind).toBe('weapon_type');
    expect(set.options.length).toBeGreaterThan(5);
  });

  it('returns the deferred target set for Blood Stalker', () => {
    const bs = getSPADefinition('blood_stalker');
    expect(bs).toBeDefined();
    const set = getDesignationOptions(bs as ISPADefinition);
    expect(set.kind).toBe('target');
    expect(set.deferred).toBe(true);
  });

  it('returns the range_bracket list for Range Master', () => {
    const rm = getSPADefinition('range_master');
    expect(rm).toBeDefined();
    const set = getDesignationOptions(rm as ISPADefinition);
    expect(set.kind).toBe('range_bracket');
    expect(set.options.length).toBe(4);
  });

  it('returns the weapon_category list for Gunnery Specialization', () => {
    const gs = getSPADefinition('specialist');
    expect(gs).toBeDefined();
    const set = getDesignationOptions(gs as ISPADefinition);
    expect(set.kind).toBe('weapon_category');
    expect(set.options.length).toBe(4);
  });

  it('returns the terrain list for Environmental Specialist', () => {
    const env = getSPADefinition('env_specialist');
    expect(env).toBeDefined();
    const set = getDesignationOptions(env as ISPADefinition);
    expect(set.kind).toBe('terrain');
    expect(set.options.length).toBeGreaterThan(0);
  });
});

describe('isDeferredDesignationType', () => {
  it('returns true only for target', () => {
    expect(isDeferredDesignationType('target')).toBe(true);
    expect(isDeferredDesignationType('weapon_type')).toBe(false);
    expect(isDeferredDesignationType(undefined)).toBe(false);
  });
});
