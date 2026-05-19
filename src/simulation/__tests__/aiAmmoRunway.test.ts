/**
 * Tests for the AI Ammo Runway — turns-of-fire projection.
 *
 * Covers `add-ai-resource-planning` Requirement "Ammo-Runway Projection":
 * scenarios "Scarce ammo lowers selection priority", "Abundant ammo is
 * neutral", and "Energy weapons are unaffected".
 *
 * @spec openspec/changes/add-ai-resource-planning/specs/simulation-system/spec.md
 *   Requirement: Ammo-Runway Projection
 */

import type { IWeapon } from '../ai/types';

import {
  MIN_CONSERVATION_WEIGHT,
  SCARCE_RUNWAY_TURNS,
  computeAmmoRunway,
  projectAmmoRunway,
} from '../ai/AIAmmoRunway';

function ammoWeapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'ac20',
    name: 'AC/20',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 20,
    heat: 7,
    minRange: 0,
    ammoPerTon: 5,
    destroyed: false,
    ...overrides,
  };
}

function energyWeapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'mlas',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
    ...overrides,
  };
}

describe('AIAmmoRunway.computeAmmoRunway', () => {
  describe('energy weapons are unaffected', () => {
    it('reports infinite runway and a neutral weight', () => {
      const runway = computeAmmoRunway(energyWeapon(), undefined);
      expect(runway.turnsRemaining).toBe(Infinity);
      expect(runway.conservationWeight).toBe(1);
    });

    it('an energy weapon with a stray ammo count is still neutral', () => {
      // ammoPerTon <= 0 short-circuits regardless of the count passed.
      const runway = computeAmmoRunway(energyWeapon(), 1);
      expect(runway.turnsRemaining).toBe(Infinity);
      expect(runway.conservationWeight).toBe(1);
    });
  });

  describe('abundant ammo is neutral', () => {
    it('a long runway yields a conservation weight of 1', () => {
      const runway = computeAmmoRunway(ammoWeapon(), 40);
      expect(runway.turnsRemaining).toBe(40);
      expect(runway.conservationWeight).toBe(1);
    });

    it('exactly SCARCE_RUNWAY_TURNS of fire is still neutral', () => {
      const runway = computeAmmoRunway(ammoWeapon(), SCARCE_RUNWAY_TURNS);
      expect(runway.turnsRemaining).toBe(SCARCE_RUNWAY_TURNS);
      expect(runway.conservationWeight).toBe(1);
    });
  });

  describe('scarce ammo lowers the conservation weight', () => {
    it('a near-empty weapon drops toward the floor but stays eligible', () => {
      const runway = computeAmmoRunway(ammoWeapon(), 0);
      expect(runway.turnsRemaining).toBe(0);
      expect(runway.conservationWeight).toBe(MIN_CONSERVATION_WEIGHT);
      // Crucially the weapon is NOT culled — runway modulates priority only.
      expect(runway.conservationWeight).toBeGreaterThan(0);
    });

    it('the weight ramps linearly between empty and abundant', () => {
      const empty = computeAmmoRunway(ammoWeapon(), 0).conservationWeight;
      const one = computeAmmoRunway(ammoWeapon(), 1).conservationWeight;
      const two = computeAmmoRunway(ammoWeapon(), 2).conservationWeight;
      const full = computeAmmoRunway(ammoWeapon(), 3).conservationWeight;
      expect(empty).toBeLessThan(one);
      expect(one).toBeLessThan(two);
      expect(two).toBeLessThan(full);
      expect(full).toBe(1);
    });

    it('a higher shots-per-turn rate shortens the runway', () => {
      const single = computeAmmoRunway(ammoWeapon(), 6, 1);
      const double = computeAmmoRunway(ammoWeapon(), 6, 2);
      expect(single.turnsRemaining).toBe(6);
      expect(double.turnsRemaining).toBe(3);
    });
  });

  describe('unknown ammo count is treated as abundant', () => {
    it('an ammo weapon with no count entry is neutral', () => {
      // Legacy IAIUnitState fixtures have an empty `ammo` map — they must
      // not be rationed (matching legacy `selectWeapons` non-cull).
      const runway = computeAmmoRunway(ammoWeapon(), undefined);
      expect(runway.turnsRemaining).toBe(Infinity);
      expect(runway.conservationWeight).toBe(1);
    });
  });
});

describe('AIAmmoRunway.projectAmmoRunway', () => {
  it('projects a runway for every weapon in a fire list', () => {
    const weapons = [
      ammoWeapon({ id: 'ac20' }),
      energyWeapon({ id: 'mlas' }),
      ammoWeapon({ id: 'lrm', ammoPerTon: 24 }),
    ];
    const runways = projectAmmoRunway(weapons, { ac20: 1, lrm: 30 });
    expect(runways).toHaveLength(3);
    expect(runways[0].weaponId).toBe('ac20');
    expect(runways[0].conservationWeight).toBeLessThan(1); // scarce
    expect(runways[1].turnsRemaining).toBe(Infinity); // energy
    expect(runways[2].conservationWeight).toBe(1); // abundant
  });

  it('honours per-weapon shots-per-turn overrides', () => {
    const weapons = [ammoWeapon({ id: 'rac' })];
    const runways = projectAmmoRunway(weapons, { rac: 12 }, { rac: 6 });
    // 12 rounds at 6/turn → 2 turns of fire.
    expect(runways[0].turnsRemaining).toBe(2);
  });
});
