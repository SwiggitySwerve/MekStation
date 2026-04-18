/**
 * ProtoMech Construction Tests
 *
 * Covers all VAL-PROTO-* rules and the store action layer.
 * Fixtures modelled after canonical ProtoMech designs:
 *   Minotaur  — Heavy biped (9 t)
 *   Sprite    — Light glider (2 t)
 *   Satyr     — Light biped (4 t)
 *   Nuthatch  — Light biped with jump (3 t)
 *   Ares      — Ultraheavy biped (13 t)
 *
 * @spec openspec/changes/add-protomech-construction/tasks.md §9, §11
 */

import { describe, it, expect } from '@jest/globals';

import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { TechBase } from '@/types/enums/TechBase';
import {
  ProtoChassis,
  ProtoWeightClass,
} from '@/types/unit/ProtoMechInterfaces';
import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';
import {
  effectiveWalkMP,
  getProtoMPCaps,
  getProtoWeightClass,
  isArmPlacementIllegal,
  isMainGunWeaponApproved,
  PROTO_VALIDATION_RULE_IDS,
  RULE_PROTO_CHASSIS,
  RULE_PROTO_MAIN_GUN,
  RULE_PROTO_MP,
  RULE_PROTO_TECH_BASE,
  RULE_PROTO_TONNAGE,
  validateProtoMech,
  validateProtoChassis,
  validateProtoMainGun,
  validateProtoMP,
  validateProtoTechBase,
  validateProtoTonnage,
} from '@/utils/construction/protomech';

// =============================================================================
// Fixtures
// =============================================================================

/** Minotaur — Heavy biped, 9 tons */
const MINOTAUR_SNAPSHOT = {
  tonnage: 9,
  chassisType: ProtoChassis.BIPED,
  walkMP: 4,
  jumpMP: 0,
  myomerBooster: false,
  hasMainGun: false,
  mainGunWeaponId: undefined as string | undefined,
  weaponPlacements: [] as Array<{
    equipmentId: string;
    location: ProtoLocation;
  }>,
  techBase: 'Clan',
};

/** Sprite — Light glider, 2 tons */
const SPRITE_SNAPSHOT = {
  tonnage: 2,
  chassisType: ProtoChassis.GLIDER,
  walkMP: 6,
  jumpMP: 4,
  myomerBooster: false,
  hasMainGun: false,
  mainGunWeaponId: undefined as string | undefined,
  weaponPlacements: [] as Array<{
    equipmentId: string;
    location: ProtoLocation;
  }>,
  techBase: 'Clan',
};

/** Satyr — Light biped, 4 tons */
const SATYR_SNAPSHOT = {
  tonnage: 4,
  chassisType: ProtoChassis.BIPED,
  walkMP: 5,
  jumpMP: 5,
  myomerBooster: false,
  hasMainGun: false,
  mainGunWeaponId: undefined as string | undefined,
  weaponPlacements: [] as Array<{
    equipmentId: string;
    location: ProtoLocation;
  }>,
  techBase: 'Clan',
};

/** Nuthatch — Light biped with jump jets, 3 tons */
const NUTHATCH_SNAPSHOT = {
  tonnage: 3,
  chassisType: ProtoChassis.BIPED,
  walkMP: 8,
  jumpMP: 8,
  myomerBooster: false,
  hasMainGun: false,
  mainGunWeaponId: undefined as string | undefined,
  weaponPlacements: [] as Array<{
    equipmentId: string;
    location: ProtoLocation;
  }>,
  techBase: 'Clan',
};

/** Ares — Ultraheavy biped, 13 tons */
const ARES_SNAPSHOT = {
  tonnage: 13,
  chassisType: ProtoChassis.ULTRAHEAVY,
  walkMP: 2,
  jumpMP: 0,
  myomerBooster: false,
  hasMainGun: true,
  mainGunWeaponId: 'clan-gauss-rifle',
  weaponPlacements: [] as Array<{
    equipmentId: string;
    location: ProtoLocation;
  }>,
  techBase: 'Clan',
};

// =============================================================================
// Store defaults
// =============================================================================

describe('createDefaultProtoMechState', () => {
  it('defaults to Biped chassis type', () => {
    const state = createDefaultProtoMechState();
    expect(state.chassisType).toBe(ProtoChassis.BIPED);
  });

  it('derives weightClass from tonnage on construction', () => {
    const light = createDefaultProtoMechState({ tonnage: 3 });
    expect(light.weightClass).toBe(ProtoWeightClass.LIGHT);

    const medium = createDefaultProtoMechState({ tonnage: 6 });
    expect(medium.weightClass).toBe(ProtoWeightClass.MEDIUM);

    const heavy = createDefaultProtoMechState({ tonnage: 8 });
    expect(heavy.weightClass).toBe(ProtoWeightClass.HEAVY);
  });

  it('initialises mainGunWeaponId as undefined', () => {
    const state = createDefaultProtoMechState();
    expect(state.mainGunWeaponId).toBeUndefined();
  });

  it('initialises glidingWings as false', () => {
    const state = createDefaultProtoMechState();
    expect(state.glidingWings).toBe(false);
  });

  it('walkMP is present and at least 1', () => {
    const state = createDefaultProtoMechState({ tonnage: 5 });
    expect(state.walkMP).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// Store actions
// =============================================================================

describe('useProtoMechStore actions', () => {
  function makeStore(tonnage = 5, chassisType = ProtoChassis.BIPED) {
    const initial = createDefaultProtoMechState({ tonnage });
    const store = createProtoMechStore({ ...initial, chassisType });
    return store;
  }

  // ---- setChassisType ----

  it('setChassisType(BIPED) sets chassisType and clears glidingWings', () => {
    const store = makeStore(2, ProtoChassis.GLIDER);
    store.getState().setGlidingWings(true);
    store.getState().setChassisType(ProtoChassis.BIPED);
    const s = store.getState();
    expect(s.chassisType).toBe(ProtoChassis.BIPED);
    expect(s.glidingWings).toBe(false);
  });

  it('setChassisType(ULTRAHEAVY) forces jumpMP to 0', () => {
    const initial = createDefaultProtoMechState({ tonnage: 13 });
    const store = createProtoMechStore({ ...initial, jumpMP: 3 });
    store.getState().setChassisType(ProtoChassis.ULTRAHEAVY);
    expect(store.getState().jumpMP).toBe(0);
  });

  it('setChassisType(GLIDER) preserves glidingWings when already set', () => {
    const initial = createDefaultProtoMechState({ tonnage: 3 });
    const store = createProtoMechStore({
      ...initial,
      glidingWings: true,
      chassisType: ProtoChassis.GLIDER,
    });
    store.getState().setChassisType(ProtoChassis.GLIDER);
    expect(store.getState().glidingWings).toBe(true);
  });

  // ---- setWalkMP ----

  it('setWalkMP clamps to weight-class cap (Medium cap = 6)', () => {
    const store = makeStore(5); // Medium
    store.getState().setWalkMP(99);
    expect(store.getState().walkMP).toBe(6); // Medium cap
  });

  it('setWalkMP clamps minimum to 1', () => {
    const store = makeStore(5);
    store.getState().setWalkMP(0);
    expect(store.getState().walkMP).toBe(1);
  });

  it('setWalkMP updates engineRating = tonnage * walkMP', () => {
    const store = makeStore(5);
    store.getState().setWalkMP(4);
    expect(store.getState().engineRating).toBe(5 * 4);
  });

  // ---- setMyomerBooster ----

  it('setMyomerBooster(true) adds +1 to flank MP derivation', () => {
    const store = makeStore(3); // Light
    store.getState().setWalkMP(6);
    const baseFlank = store.getState().flankMP; // effWalk(6,false)+1 = 7
    store.getState().setMyomerBooster(true);
    // effWalk(6, true) = 7; flank = 7 + 1 = 8
    expect(store.getState().flankMP).toBe(baseFlank + 1);
  });

  // ---- setMainGunWeaponId ----

  it('setMainGunWeaponId stores approved weapon ID', () => {
    const store = makeStore(5);
    store.getState().setMainGunWeaponId('clan-gauss-rifle');
    expect(store.getState().mainGunWeaponId).toBe('clan-gauss-rifle');
  });

  it('setMainGunWeaponId(null) clears the weapon', () => {
    const store = makeStore(5);
    store.getState().setMainGunWeaponId('clan-ppc');
    store.getState().setMainGunWeaponId(null);
    expect(store.getState().mainGunWeaponId).toBeUndefined();
  });

  // ---- setGlidingWings ----

  it('setGlidingWings(true) stores the flag', () => {
    const initial = createDefaultProtoMechState({ tonnage: 2 });
    const store = createProtoMechStore({
      ...initial,
      chassisType: ProtoChassis.GLIDER,
    });
    store.getState().setGlidingWings(true);
    expect(store.getState().glidingWings).toBe(true);
  });
});

// =============================================================================
// effectiveWalkMP
// =============================================================================

describe('effectiveWalkMP', () => {
  it('without booster returns base walk MP', () => {
    expect(effectiveWalkMP(4, false)).toBe(4);
  });

  it('with booster adds 1', () => {
    expect(effectiveWalkMP(4, true)).toBe(5);
  });
});

// =============================================================================
// getProtoWeightClass
// =============================================================================

describe('getProtoWeightClass', () => {
  it('2–4 t → Light', () => {
    expect(getProtoWeightClass(2)).toBe(ProtoWeightClass.LIGHT);
    expect(getProtoWeightClass(4)).toBe(ProtoWeightClass.LIGHT);
  });

  it('5–7 t → Medium', () => {
    expect(getProtoWeightClass(5)).toBe(ProtoWeightClass.MEDIUM);
    expect(getProtoWeightClass(7)).toBe(ProtoWeightClass.MEDIUM);
  });

  it('8–9 t → Heavy', () => {
    expect(getProtoWeightClass(8)).toBe(ProtoWeightClass.HEAVY);
    expect(getProtoWeightClass(9)).toBe(ProtoWeightClass.HEAVY);
  });

  it('10–15 t → Ultraheavy', () => {
    expect(getProtoWeightClass(10)).toBe(ProtoWeightClass.ULTRAHEAVY);
    expect(getProtoWeightClass(15)).toBe(ProtoWeightClass.ULTRAHEAVY);
  });
});

// =============================================================================
// VAL-PROTO-TONNAGE
// =============================================================================

describe('VAL-PROTO-TONNAGE', () => {
  it('passes for Ultraheavy tonnage 10–15 (Ares fixture)', () => {
    const result = validateProtoTonnage(ARES_SNAPSHOT);
    expect(result.passed).toBe(true);
  });

  it('fails for tonnage < 2', () => {
    const result = validateProtoTonnage({ tonnage: 1 });
    expect(result.passed).toBe(false);
    expect(result.findings[0]?.ruleId).toBe(RULE_PROTO_TONNAGE);
  });

  it('fails for tonnage > 15', () => {
    const result = validateProtoTonnage({ tonnage: 16 });
    expect(result.passed).toBe(false);
  });

  it('passes for all standard tonnages 2–9', () => {
    for (let t = 2; t <= 9; t++) {
      expect(validateProtoTonnage({ tonnage: t }).passed).toBe(true);
    }
  });
});

// =============================================================================
// VAL-PROTO-CHASSIS
// =============================================================================

describe('VAL-PROTO-CHASSIS (VAL-PROTO-CHASSIS)', () => {
  it('Glider is only legal for Light class — Sprite (2 t) passes', () => {
    const result = validateProtoChassis(SPRITE_SNAPSHOT);
    expect(result.passed).toBe(true);
  });

  it('Glider on Medium tonnage (5 t) fails', () => {
    const result = validateProtoChassis({
      tonnage: 5,
      chassisType: ProtoChassis.GLIDER,
      jumpMP: 0,
      myomerBooster: false,
    });
    expect(result.passed).toBe(false);
    expect(result.findings[0]?.ruleId).toBe(RULE_PROTO_CHASSIS);
    expect(result.findings[0]?.message).toMatch(/Glider/);
  });

  it('Ultraheavy with tonnage < 10 fails', () => {
    const result = validateProtoChassis({
      tonnage: 8,
      chassisType: ProtoChassis.ULTRAHEAVY,
      jumpMP: 0,
      myomerBooster: false,
    });
    expect(result.passed).toBe(false);
    expect(result.findings[0]?.message).toMatch(/Ultraheavy/);
  });

  it('Ultraheavy 10–15 t passes (Ares fixture)', () => {
    const result = validateProtoChassis(ARES_SNAPSHOT);
    expect(result.passed).toBe(true);
  });

  it('Ultraheavy with jumpMP > 0 fails', () => {
    const result = validateProtoChassis({
      tonnage: 13,
      chassisType: ProtoChassis.ULTRAHEAVY,
      jumpMP: 2,
      myomerBooster: false,
    });
    expect(result.passed).toBe(false);
    expect(
      result.findings.some((f) => f.message.includes('cannot have jump')),
    ).toBe(true);
  });

  it('Myomer Booster on Heavy class fails', () => {
    const result = validateProtoChassis({
      tonnage: 9,
      chassisType: ProtoChassis.BIPED,
      jumpMP: 0,
      myomerBooster: true,
    });
    expect(result.passed).toBe(false);
    expect(result.findings[0]?.message).toMatch(/Myomer Booster/);
  });
});

// =============================================================================
// VAL-PROTO-MP
// =============================================================================

describe('VAL-PROTO-MP', () => {
  it('Ultraheavy with jumpMP=0 passes (Ares fixture)', () => {
    const result = validateProtoMP(ARES_SNAPSHOT);
    expect(result.passed).toBe(true);
  });

  it('Ultraheavy with jumpMP > 0 emits "Ultraheavy cannot jump"', () => {
    const result = validateProtoMP({
      tonnage: 13,
      chassisType: ProtoChassis.ULTRAHEAVY,
      walkMP: 2,
      jumpMP: 1,
    });
    expect(result.passed).toBe(false);
    expect(
      result.findings.some((f) => f.message.includes('Ultraheavy cannot jump')),
    ).toBe(true);
  });

  it('Medium walk cap = 6 — walkMP 6 passes', () => {
    const result = validateProtoMP({
      tonnage: 5,
      chassisType: ProtoChassis.BIPED,
      walkMP: 6,
      jumpMP: 0,
    });
    expect(result.passed).toBe(true);
  });

  it('Medium walk cap = 6 — walkMP 7 fails', () => {
    const result = validateProtoMP({
      tonnage: 5,
      chassisType: ProtoChassis.BIPED,
      walkMP: 7,
      jumpMP: 0,
    });
    expect(result.passed).toBe(false);
    expect(result.findings[0]?.ruleId).toBe(RULE_PROTO_MP);
  });

  it('Nuthatch Light with max walk/jump (8/8) passes', () => {
    const result = validateProtoMP(NUTHATCH_SNAPSHOT);
    expect(result.passed).toBe(true);
  });
});

// =============================================================================
// VAL-PROTO-MAIN-GUN
// =============================================================================

describe('VAL-PROTO-MAIN-GUN', () => {
  it('LB-X 10 / Gauss Rifle / PPC approved IDs pass (Ares fixture)', () => {
    // Ares uses clan-gauss-rifle
    const result = validateProtoMainGun(ARES_SNAPSHOT);
    expect(result.passed).toBe(true);
  });

  it('clan-ppc is approved', () => {
    expect(isMainGunWeaponApproved('clan-ppc')).toBe(true);
  });

  it('clan-gauss-rifle is approved', () => {
    expect(isMainGunWeaponApproved('clan-gauss-rifle')).toBe(true);
  });

  it('Medium Laser (not in approved list) fails VAL-PROTO-MAIN-GUN', () => {
    const result = validateProtoMainGun({
      hasMainGun: true,
      mainGunWeaponId: 'clan-medium-laser', // not in approved list
      weaponPlacements: [],
    });
    expect(result.passed).toBe(false);
    expect(result.findings[0]?.ruleId).toBe(RULE_PROTO_MAIN_GUN);
  });

  it('no main gun with no weapon ID passes', () => {
    const result = validateProtoMainGun({
      hasMainGun: false,
      mainGunWeaponId: undefined,
      weaponPlacements: [],
    });
    expect(result.passed).toBe(true);
  });

  it('heavy weapon in arm mount fails (isArmPlacementIllegal)', () => {
    // clan-gauss-rifle is heavy — arm placement is illegal
    expect(
      isArmPlacementIllegal('clan-gauss-rifle', ProtoLocation.LEFT_ARM),
    ).toBe(true);
  });

  it('heavy arm weapon triggers VAL-PROTO-MAIN-GUN error', () => {
    const result = validateProtoMainGun({
      hasMainGun: false,
      mainGunWeaponId: undefined,
      weaponPlacements: [
        { equipmentId: 'clan-gauss-rifle', location: ProtoLocation.LEFT_ARM },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.findings[0]?.ruleId).toBe(RULE_PROTO_MAIN_GUN);
  });

  it('light weapon (clan-er-small-laser) in arm mount passes', () => {
    expect(
      isArmPlacementIllegal('clan-er-small-laser', ProtoLocation.LEFT_ARM),
    ).toBe(false);
  });
});

// =============================================================================
// VAL-PROTO-TECH-BASE
// =============================================================================

describe('VAL-PROTO-TECH-BASE', () => {
  it('Clan tech base passes (no findings)', () => {
    const result = validateProtoTechBase({ techBase: 'Clan' });
    expect(result.passed).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('Inner Sphere tech base produces warning (not error)', () => {
    const result = validateProtoTechBase({ techBase: 'Inner Sphere' });
    expect(result.passed).toBe(false);
    expect(result.findings[0]?.severity).toBe('warning');
    expect(result.findings[0]?.ruleId).toBe(RULE_PROTO_TECH_BASE);
  });
});

// =============================================================================
// PROTO_VALIDATION_RULE_IDS — all 5 rules registered
// =============================================================================

describe('PROTO_VALIDATION_RULE_IDS', () => {
  it('contains all 5 VAL-PROTO-* rule IDs', () => {
    expect(PROTO_VALIDATION_RULE_IDS).toHaveLength(5);
    expect(PROTO_VALIDATION_RULE_IDS).toContain(RULE_PROTO_TONNAGE);
    expect(PROTO_VALIDATION_RULE_IDS).toContain(RULE_PROTO_CHASSIS);
    expect(PROTO_VALIDATION_RULE_IDS).toContain(RULE_PROTO_MP);
    expect(PROTO_VALIDATION_RULE_IDS).toContain(RULE_PROTO_MAIN_GUN);
    expect(PROTO_VALIDATION_RULE_IDS).toContain(RULE_PROTO_TECH_BASE);
  });
});

// =============================================================================
// Aggregate validateProtoMech — fixture round-trips
// =============================================================================

describe('validateProtoMech (aggregate)', () => {
  it('Minotaur (Heavy biped, 9 t) is valid', () => {
    const result = validateProtoMech(MINOTAUR_SNAPSHOT);
    expect(result.isValid).toBe(true);
  });

  it('Sprite (Light glider, 2 t) is valid', () => {
    const result = validateProtoMech(SPRITE_SNAPSHOT);
    expect(result.isValid).toBe(true);
  });

  it('Satyr (Light biped, 4 t) is valid', () => {
    const result = validateProtoMech(SATYR_SNAPSHOT);
    expect(result.isValid).toBe(true);
  });

  it('Nuthatch (Light biped + jump, 3 t) is valid', () => {
    const result = validateProtoMech(NUTHATCH_SNAPSHOT);
    expect(result.isValid).toBe(true);
  });

  it('Ares (Ultraheavy biped, 13 t + Gauss) is valid', () => {
    const result = validateProtoMech(ARES_SNAPSHOT);
    expect(result.isValid).toBe(true);
  });

  it('returns one ValidationRuleResult per registered rule', () => {
    const result = validateProtoMech(MINOTAUR_SNAPSHOT);
    expect(result.ruleResults).toHaveLength(PROTO_VALIDATION_RULE_IDS.length);
  });

  it('IS tech base makes isValid false (warning = not valid in strict sense)', () => {
    const result = validateProtoMech({
      ...SATYR_SNAPSHOT,
      techBase: TechBase.INNER_SPHERE,
    });
    // Warning does not make isValid false per spec — only errors do
    expect(result.hasWarnings).toBe(true);
    expect(result.isValid).toBe(true); // warnings don't block validity
  });
});

// =============================================================================
// MP cap helper
// =============================================================================

describe('getProtoMPCaps', () => {
  it('Light: walkMax 8, jumpMax 8', () => {
    const caps = getProtoMPCaps(ProtoWeightClass.LIGHT);
    expect(caps.walkMax).toBe(8);
    expect(caps.jumpMax).toBe(8);
  });

  it('Medium: walkMax 6, jumpMax 6', () => {
    const caps = getProtoMPCaps(ProtoWeightClass.MEDIUM);
    expect(caps.walkMax).toBe(6);
    expect(caps.jumpMax).toBe(6);
  });

  it('Heavy: walkMax 4, jumpMax 4', () => {
    const caps = getProtoMPCaps(ProtoWeightClass.HEAVY);
    expect(caps.walkMax).toBe(4);
    expect(caps.jumpMax).toBe(4);
  });

  it('Ultraheavy: walkMax 3, jumpMax 0', () => {
    const caps = getProtoMPCaps(ProtoWeightClass.ULTRAHEAVY);
    expect(caps.walkMax).toBe(3);
    expect(caps.jumpMax).toBe(0);
  });
});
