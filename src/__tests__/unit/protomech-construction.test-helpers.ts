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
  getProtoWeightClass,
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
  equipmentPlacements: [] as Array<{
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
  equipmentPlacements: [] as Array<{
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
  equipmentPlacements: [] as Array<{
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
  equipmentPlacements: [] as Array<{
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
  equipmentPlacements: [
    { equipmentId: 'CLAPGaussRifle', location: ProtoLocation.MAIN_GUN },
  ] as Array<{
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

  // MML locks only a glider's jump spinner (MovementView.java:265-268); the pinned
  // Sprite Ultraheavy units jump 3 to 5.
  it('setChassisType(ULTRAHEAVY) keeps an allowed jumpMP', () => {
    const initial = createDefaultProtoMechState({ tonnage: 13 });
    const store = createProtoMechStore({ ...initial, jumpMP: 3 });
    store.getState().setChassisType(ProtoChassis.ULTRAHEAVY);
    expect(store.getState().jumpMP).toBe(3);
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

  // MML has no weight-class walk cap; only the engine bounds walk (rating <= 500),
  // PMStructureTab.recalculateEngineRating. A 5 t biped's engine allows walk 66.
  it('setWalkMP stops at the engine bound, not a weight-class cap', () => {
    const store = makeStore(5);
    store.getState().setWalkMP(999);
    expect(store.getState().walkMP).toBe(66);
    expect(store.getState().engineRating).toBeLessThanOrEqual(500);
  });

  it('setWalkMP clamps minimum to 1', () => {
    const store = makeStore(5);
    store.getState().setWalkMP(0);
    expect(store.getState().walkMP).toBe(1);
  });

  it('setWalkMP updates engineRating through the pinned ProtoMek rule', () => {
    const store = makeStore(5);
    store.getState().setWalkMP(4);
    expect(store.getState().engineRating).toBe(30);
  });

  // ---- setMyomerBooster ----

  it('setMyomerBooster(true) derives boosted Run without changing Walk', () => {
    const store = makeStore(3); // Light
    store.getState().setWalkMP(6);
    expect(store.getState().flankMP).toBe(9);
    store.getState().setMyomerBooster(true);
    expect(store.getState().flankMP).toBe(12);
    expect(store.getState().walkMP).toBe(6);
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

  // TestProtoMek (MegaMek 48fcb2f64) has no glider weight rule; the three pinned
  // Svartalfa gliders are 14 t. MML's tonnage spinner only moves a glider's minimum
  // to 10 t when ultra and glider tech are legal (tech filtering, deferred).
  it.each([5, 9, 14])(
    'a Glider at %s t passes (no pinned weight rule)',
    (t) => {
      const result = validateProtoChassis({
        tonnage: t,
        chassisType: ProtoChassis.GLIDER,
        jumpMP: 0,
        myomerBooster: false,
      });
      expect(result.passed).toBe(true);
    },
  );

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

  // Pinned Sprite Ultraheavy ProtoMechs jump 3 to 5 and Java accepts them
  // (fixtures/movement-java-verdicts.json); nothing in TestProtoMek forbids it.
  it('Ultraheavy with jumpMP > 0 passes', () => {
    const result = validateProtoChassis({
      tonnage: 13,
      chassisType: ProtoChassis.ULTRAHEAVY,
      jumpMP: 2,
      myomerBooster: false,
    });
    expect(result.passed).toBe(true);
  });

  // Pinned Gorgon 6 (8 t) mounts a Myomer Booster and Java accepts it.
  it('Myomer Booster on Heavy class passes', () => {
    const result = validateProtoChassis({
      tonnage: 9,
      chassisType: ProtoChassis.BIPED,
      jumpMP: 0,
      myomerBooster: true,
    });
    expect(result.passed).toBe(true);
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

  it('Ultraheavy with jumpMP <= walk passes, as the pinned Sprite UH units do', () => {
    const result = validateProtoMP({
      tonnage: 13,
      chassisType: ProtoChassis.ULTRAHEAVY,
      walkMP: 3,
      jumpMP: 3,
    });
    expect(result.passed).toBe(true);
  });

  it('has no weight-class walk cap (pinned Siren: 3 t, walk 10)', () => {
    expect(
      validateProtoMP({
        tonnage: 3,
        chassisType: ProtoChassis.BIPED,
        walkMP: 10,
        jumpMP: 0,
      }).passed,
    ).toBe(true);
    expect(
      validateProtoMP({
        tonnage: 5,
        chassisType: ProtoChassis.BIPED,
        walkMP: 7,
        jumpMP: 0,
      }).passed,
    ).toBe(true);
  });

  it("reports Java's jump cap: walk MP, or 1.5 times it with an Extended Jump Jet", () => {
    const base = {
      tonnage: 6,
      chassisType: ProtoChassis.BIPED,
      walkMP: 4,
    };
    const over = validateProtoMP({ ...base, jumpMP: 5 });
    expect(over.passed).toBe(false);
    expect(over.findings[0]).toMatchObject({
      ruleId: RULE_PROTO_MP,
      message: 'Exceeds maximum jump MP.',
    });
    expect(
      validateProtoMP({
        ...base,
        jumpMP: 6,
        equipmentPlacements: [
          {
            equipmentId: 'ExtendedJumpJetSystem',
            location: ProtoLocation.TORSO,
          },
        ],
      }).passed,
    ).toBe(true);
  });

  it('reports the quad running minimum and the glider flank minimum', () => {
    expect(
      validateProtoMP({
        tonnage: 5,
        chassisType: ProtoChassis.QUAD,
        walkMP: 1,
        jumpMP: 0,
      }).findings.map((f) => f.message),
    ).toEqual(['Quad ProtoMeks have a minimum running MP of 3.']);
    expect(
      validateProtoMP({
        tonnage: 3,
        chassisType: ProtoChassis.GLIDER,
        walkMP: 2,
        jumpMP: 0,
      }).findings.map((f) => f.message),
    ).toEqual(['Glider ProtoMeks have a minimum flanking MP of 4.']);
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
  // Pinned rule: TestProtoMek.java:296-380, 606-678 (MegaMek 48fcb2f64).
  // The full corpus and boundary cases are in
  // src/utils/construction/protomech/__tests__/mainGun.*.test.ts.
  it('Ares (ultraheavy biped, Gauss in the Main Gun) passes', () => {
    expect(validateProtoMainGun(ARES_SNAPSHOT).passed).toBe(true);
  });

  it('an enabled Main Gun with nothing in it passes, as upstream allows', () => {
    expect(
      validateProtoMainGun({
        tonnage: 5,
        chassisType: ProtoChassis.BIPED,
        equipmentPlacements: [],
      }).passed,
    ).toBe(true);
  });

  it('a Main Gun weapon missing from the old hand-written list passes', () => {
    const result = validateProtoMainGun({
      tonnage: 5,
      chassisType: ProtoChassis.BIPED,
      equipmentPlacements: [
        { equipmentId: 'CLMediumPulseLaser', location: ProtoLocation.MAIN_GUN },
      ],
    });
    expect(result.passed).toBe(true);
  });

  it('a second Main Gun weapon on a biped fails with the pinned wording', () => {
    const result = validateProtoMainGun({
      tonnage: 5,
      chassisType: ProtoChassis.BIPED,
      equipmentPlacements: [
        { equipmentId: 'CLERMicroLaser', location: ProtoLocation.MAIN_GUN },
        { equipmentId: 'CLERSmallLaser', location: ProtoLocation.MAIN_GUN },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.findings[0]?.ruleId).toBe(RULE_PROTO_MAIN_GUN);
    expect(result.findings[0]?.message).toBe(
      'Exceeds 1 slot limit in Main Gun (2 mounted).',
    );
  });

  it('a Gauss rifle in an arm fails by weight, not by a heavy-weapon class', () => {
    const result = validateProtoMainGun({
      tonnage: 5,
      chassisType: ProtoChassis.BIPED,
      equipmentPlacements: [
        { equipmentId: 'CLGaussRifle', location: ProtoLocation.LEFT_ARM },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.findings[0]?.ruleId).toBe(RULE_PROTO_MAIN_GUN);
    expect(result.findings[0]?.message).toBe(
      'Exceeds 500 kg limit in Left Arm.',
    );
  });

  it('a light weapon (CLERSmallLaser, 0.5 t) in an arm passes', () => {
    expect(
      validateProtoMainGun({
        tonnage: 5,
        chassisType: ProtoChassis.BIPED,
        equipmentPlacements: [
          { equipmentId: 'CLERSmallLaser', location: ProtoLocation.LEFT_ARM },
        ],
      }).passed,
    ).toBe(true);
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

// The weight-class walk and jump cap table that stood here has no counterpart in
// MegaMekLab 62bf193 or the pinned verifier; the editor limits that replace it are
// tested in utils/construction/protomech/__tests__/movementLimits.test.ts.
