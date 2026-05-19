/**
 * Tests for the A2 resource-planning integration into `AttackAI` —
 * crit-seeking target weighting and the resource-aware `planFireList`.
 *
 * Covers `add-ai-resource-planning` Requirements "Crit-Seeking Target
 * Weighting" and "Ammo-Runway Projection" (the selection-priority half).
 *
 * @spec openspec/changes/add-ai-resource-planning/specs/simulation-system/spec.md
 *   Requirement: Crit-Seeking Target Weighting
 *   Requirement: Ammo-Runway Projection
 */

import { Facing, MovementType } from '@/types/gameplay';

import type {
  IAIStructureState,
  IAIUnitState,
  IWeapon,
  IWeaponFiringModes,
} from '../ai/types';

import {
  resolveResourceParameters,
  getTierParameters,
} from '../ai/AITierRegistry';
import { AttackAI, scoreTarget, structuralExposure } from '../ai/AttackAI';

const VETERAN_RESOURCE = resolveResourceParameters(
  getTierParameters('Veteran'),
);
const REGULAR_RESOURCE = resolveResourceParameters(
  getTierParameters('Regular'),
);

function weapon(overrides: Partial<IWeapon> = {}): IWeapon {
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

function unit(overrides: Partial<IAIUnitState> = {}): IAIUnitState {
  return {
    unitId: 'u1',
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    weapons: [weapon()],
    ammo: {},
    destroyed: false,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    ...overrides,
  };
}

const FRESH: IAIStructureState = {
  armorByLocation: { center_torso: 21, left_torso: 14, right_torso: 14 },
  armorMaxByLocation: { center_torso: 21, left_torso: 14, right_torso: 14 },
  internalByLocation: { center_torso: 11, left_torso: 7, right_torso: 7 },
  internalMaxByLocation: { center_torso: 11, left_torso: 7, right_torso: 7 },
};

const OPEN_SIDE_TORSO: IAIStructureState = {
  armorByLocation: { center_torso: 21, left_torso: 0, right_torso: 14 },
  armorMaxByLocation: { center_torso: 21, left_torso: 14, right_torso: 14 },
  internalByLocation: { center_torso: 11, left_torso: 1, right_torso: 7 },
  internalMaxByLocation: { center_torso: 11, left_torso: 7, right_torso: 7 },
};

describe('structuralExposure', () => {
  it('a fully-armoured undamaged target has zero exposure', () => {
    expect(structuralExposure(FRESH)).toBe(0);
  });

  it('a target with no structure state has zero exposure', () => {
    expect(structuralExposure(undefined)).toBe(0);
  });

  it('an open side torso with internal damage has high exposure', () => {
    expect(structuralExposure(OPEN_SIDE_TORSO)).toBeGreaterThan(0);
  });

  it('more stripped locations raise exposure monotonically', () => {
    const oneOpen = structuralExposure(OPEN_SIDE_TORSO);
    const twoOpen = structuralExposure({
      armorByLocation: { center_torso: 21, left_torso: 0, right_torso: 0 },
      armorMaxByLocation: { center_torso: 21, left_torso: 14, right_torso: 14 },
      internalByLocation: { center_torso: 11, left_torso: 1, right_torso: 2 },
      internalMaxByLocation: {
        center_torso: 11,
        left_torso: 7,
        right_torso: 7,
      },
    });
    expect(twoOpen).toBeGreaterThan(oneOpen);
  });
});

describe('scoreTarget — crit-seeking term', () => {
  it('crit-seeking disabled yields the legacy threat-only score', () => {
    const attacker = unit({ unitId: 'a', position: { q: 0, r: 0 } });
    const target = unit({
      unitId: 't',
      position: { q: 2, r: 0 },
      structureState: OPEN_SIDE_TORSO,
    });
    // No resource block at all == legacy. Regular's zeroed block == legacy.
    const legacy = scoreTarget(attacker, target);
    const regular = scoreTarget(attacker, target, REGULAR_RESOURCE);
    expect(regular).toBe(legacy);
  });

  it('an exposed target scores higher than an identical fresh one', () => {
    const attacker = unit({ unitId: 'a', position: { q: 0, r: 0 } });
    const fresh = unit({
      unitId: 'fresh',
      position: { q: 2, r: 0 },
      structureState: FRESH,
    });
    const exposed = unit({
      unitId: 'exposed',
      position: { q: 2, r: 0 },
      structureState: OPEN_SIDE_TORSO,
    });
    const freshScore = scoreTarget(attacker, fresh, VETERAN_RESOURCE);
    const exposedScore = scoreTarget(attacker, exposed, VETERAN_RESOURCE);
    expect(exposedScore).toBeGreaterThan(freshScore);
  });

  it('a fully-armoured target gets a zero crit-seeking bonus', () => {
    const attacker = unit({ unitId: 'a', position: { q: 0, r: 0 } });
    const fresh = unit({
      unitId: 'fresh',
      position: { q: 2, r: 0 },
      structureState: FRESH,
    });
    // With a fresh target the Veteran score equals the legacy score —
    // the crit-seeking term contributes exactly zero.
    expect(scoreTarget(attacker, fresh, VETERAN_RESOURCE)).toBe(
      scoreTarget(attacker, fresh),
    );
  });

  it('a fresh heavy can still outscore a near-dead light when threat dominates', () => {
    const attacker = unit({ unitId: 'a', position: { q: 0, r: 0 } });
    // Near-dead light: open torso (high exposure) but tiny threat.
    const light = unit({
      unitId: 'light',
      position: { q: 2, r: 0 },
      gunnery: 6,
      weapons: [weapon({ damage: 3 })],
      remainingHpFraction: 0.15,
      structureState: OPEN_SIDE_TORSO,
    });
    // Fresh heavy: a much larger threat, fully armoured.
    const heavy = unit({
      unitId: 'heavy',
      position: { q: 2, r: 0 },
      gunnery: 3,
      weapons: [
        weapon({ id: 'w1', damage: 20 }),
        weapon({ id: 'w2', damage: 20 }),
        weapon({ id: 'w3', damage: 15 }),
      ],
      remainingHpFraction: 1,
      structureState: FRESH,
    });
    const lightScore = scoreTarget(attacker, light, VETERAN_RESOURCE);
    const heavyScore = scoreTarget(attacker, heavy, VETERAN_RESOURCE);
    expect(heavyScore).toBeGreaterThan(lightScore);
  });
});

describe('AttackAI.planFireList — ammo conservation', () => {
  const attackAI = new AttackAI();

  it('scarce ammo lowers a weapon priority without culling it', () => {
    // Two weapons of equal efficiency: an energy weapon and an ammo weapon
    // running on fumes. Conservation must sink the scarce one in priority
    // but it must remain in the list (still eligible).
    const energy = weapon({
      id: 'energy',
      damage: 6,
      heat: 3,
      ammoPerTon: -1,
    });
    const scarce = weapon({
      id: 'scarce',
      damage: 6,
      heat: 3,
      ammoPerTon: 5,
    });
    const attacker = unit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      weapons: [scarce, energy],
      ammo: { scarce: 1 },
    });
    const target = unit({ unitId: 't', position: { q: 2, r: 0 } });

    const planned = attackAI.planFireList(attacker, target, {
      resource: VETERAN_RESOURCE,
    });
    const ids = planned.map((e) => e.weapon.id);
    // Both weapons present — scarce ammo never culls.
    expect(ids).toContain('scarce');
    expect(ids).toContain('energy');
    // The energy weapon outranks the scarce ammo weapon.
    expect(ids.indexOf('energy')).toBeLessThan(ids.indexOf('scarce'));
  });

  it('abundant ammo leaves priority at the legacy efficiency order', () => {
    const energy = weapon({ id: 'energy', damage: 6, heat: 3, ammoPerTon: -1 });
    const abundant = weapon({
      id: 'abundant',
      damage: 6,
      heat: 3,
      ammoPerTon: 5,
    });
    const attacker = unit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      weapons: [abundant, energy],
      ammo: { abundant: 40 },
    });
    const target = unit({ unitId: 't', position: { q: 2, r: 0 } });

    const veteran = attackAI
      .planFireList(attacker, target, { resource: VETERAN_RESOURCE })
      .map((e) => e.weapon.id);
    const regular = attackAI
      .planFireList(attacker, target, { resource: REGULAR_RESOURCE })
      .map((e) => e.weapon.id);
    // Abundant ammo == neutral conservation; the Veteran order equals the
    // legacy (Regular) order.
    expect(veteran).toEqual(regular);
  });

  it('the inert (Regular) block reproduces the legacy selectWeapons order', () => {
    const attacker = unit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      weapons: [
        weapon({ id: 'w1', damage: 10, heat: 2 }),
        weapon({ id: 'w2', damage: 5, heat: 3 }),
        weapon({ id: 'w3', damage: 8, heat: 4 }),
      ],
    });
    const target = unit({ unitId: 't', position: { q: 2, r: 0 } });
    const planned = attackAI
      .planFireList(attacker, target, { resource: REGULAR_RESOURCE })
      .map((e) => e.weapon.id);
    const legacy = attackAI.selectWeapons(attacker, target).map((w) => w.id);
    expect(planned).toEqual(legacy);
  });

  it('records the selected mode for a multi-mode weapon', () => {
    const lbxModes: IWeaponFiringModes = {
      kind: 'cluster-slug',
      defaultModeId: 'slug',
      modes: [
        { id: 'slug', damage: 10, heat: 2, shotsPerTurn: 1 },
        { id: 'cluster', damage: 6, heat: 2, shotsPerTurn: 1 },
      ],
    };
    const lbx = weapon({
      id: 'lbx',
      damage: 10,
      heat: 2,
      ammoPerTon: 10,
      shortRange: 6,
      mediumRange: 12,
      longRange: 18,
      firingModes: lbxModes,
    });
    const attacker = unit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      weapons: [lbx],
      ammo: { lbx: 20 },
    });
    // Exposed target → cluster mode.
    const target = unit({
      unitId: 't',
      position: { q: 5, r: 0 },
      structureState: OPEN_SIDE_TORSO,
    });
    const planned = attackAI.planFireList(attacker, target, {
      resource: VETERAN_RESOURCE,
    });
    expect(planned[0].mode.modeId).toBe('cluster');
  });
});
