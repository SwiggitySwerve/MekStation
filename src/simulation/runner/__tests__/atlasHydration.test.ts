/**
 * Phase 1 of `add-combat-fidelity-suite` — Atlas AS7-D & Locust LCT-1V
 * hydration anchor tests.
 *
 * Spec contract: openspec/changes/add-combat-fidelity-suite/specs/
 *   simulation-system/spec.md → "Catalog-Hydrated Unit State" requirement
 *
 *   GIVEN an Atlas AS7-D participant with `unitId: 'atlas-as7-d'`
 *   WHEN the runner hydrates initial unit state
 *   THEN IUnitGameState.weapons MUST include 1× AC/20, 1× LRM-20,
 *        4× Medium Laser, and 1× SRM-6
 *   AND the per-location armor map MUST sum to 304 across 11 locations
 *
 *   GIVEN a Locust LCT-1V participant
 *   WHEN the runner hydrates initial unit state
 *   THEN the resulting weapon list MUST match the canonical Locust loadout
 *        (1× Medium Laser, 2× Machine Gun)
 *   AND total armor MUST match the canonical Locust value (64)
 *
 * Catalog source-of-truth: `public/data/units/battlemechs/{path}/Atlas AS7-D.json`
 * and `public/data/units/battlemechs/1-age-of-war/standard/Locust LCT-1V.json`
 * loaded synchronously via `NodeCanonicalUnitService.getById`. Weapon stats
 * resolved from the bundled `equipmentBVCatalogData.WEAPON_CATALOG_FILES`
 * (sync JSON imports — no fetch needed).
 */

import type { IFullUnit } from '@/services/units/CanonicalUnitService';

import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { AttackAI } from '@/simulation/ai/AttackAI';
import {
  CriticalEffectType,
  Facing,
  FiringArc,
  GameSide,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import { resolveCriticalHits } from '@/utils/gameplay/criticalHitResolution';
import { calculateCommandConsoleInitiativeBonus } from '@/utils/gameplay/initiativeModifiers';

import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import {
  createMinimalUnitState,
  toCatalogAIUnitState,
} from '../SimulationRunnerSupport';
import {
  buildWeaponLookupFromCatalogFiles,
  createHydratedUnitState,
  hydrateAIWeaponsFromFullUnit,
  hydrateAIWeaponsFromFullUnitStrict,
  hydrateAIWeaponsFromFullUnitWithReport,
  hydrateArmorFromFullUnit,
  hydrateActiveProbesFromFullUnit,
  hydrateC3EquipmentFromFullUnit,
  hydrateECMSuitesFromFullUnit,
  hydrateEdgePointsFromFullUnit,
  hydrateHasMASCFromFullUnit,
  hydrateHasStealthArmorFromFullUnit,
  hydrateHasSuperchargerFromFullUnit,
  hydrateHasTSMFromFullUnit,
  hydrateHeatSinksFromFullUnit,
  hydrateInitiativeEquipmentFromFullUnit,
  hydrateMovementCapabilityFromFullUnit,
  hydratePilotAbilitiesFromFullUnit,
  hydratePartialWingJumpBonusFromFullUnit,
  hydrateTargetingComputerEquipmentFromFullUnit,
  hydrateClawStateFromFullUnit,
  hydrateCriticalSlotManifestFromFullUnit,
  hydrateStructureFromFullUnit,
  hydrateTalonStateFromFullUnit,
  resolveCatalogDamage,
  type IHydratedUnitData,
} from '../UnitHydration';

// Build the weapon lookup once across this file. The catalog files are
// imported synchronously (see equipmentBVCatalogData.ts) so this is a
// pure in-memory pass — no IO, no async.
const weaponLookup = buildWeaponLookupFromCatalogFiles(
  WEAPON_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
);

const ATLAS_TONNAGE = 100;
const LOCUST_TONNAGE = 20;
// Canonical totals from the Atlas AS7-D / Locust LCT-1V catalog JSONs.
// Atlas: HD=9 + LA=34 + RA=34 + LL=41 + RL=41 + CT=47+14 + LT=32+10 + RT=32+10 = 304
// Locust: HD=8 + LA=4 + RA=4 + LL=8 + RL=8 + CT=10+2 + LT=8+2 + RT=8+2 = 64
const ATLAS_CANONICAL_TOTAL_ARMOR = 304;
const LOCUST_CANONICAL_TOTAL_ARMOR = 64;
const ATLAS_CANONICAL_HEAT_SINKS = 20;

describe('UnitHydration — Atlas AS7-D anchor (P1, task 1.3 / 1.4)', () => {
  it('resolves Atlas AS7-D from the Node catalog with the canonical loadout', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(fullUnit.chassis).toBe('Atlas');
    // Catalog stores variant under `model` for the fetch-based loader's
    // shape — NodeCanonicalUnitService re-wraps as IFullUnit but the raw
    // `model` field passes through. Either field is acceptable for our
    // assertion as long as the variant value is "AS7-D".
    expect(fullUnit.model ?? fullUnit.variant).toBe('AS7-D');
    expect(fullUnit.tonnage).toBe(ATLAS_TONNAGE);
  });

  it('hydrates BattleMech movement capability from canonical walk and jump MP', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(hydrateMovementCapabilityFromFullUnit(fullUnit)).toEqual({
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
    });

    expect(
      hydrateMovementCapabilityFromFullUnit({
        ...fullUnit,
        id: 'jump-capability-test',
        movement: { walk: 5, jump: 3 },
      }),
    ).toEqual({
      walkMP: 5,
      runMP: 8,
      jumpMP: 3,
    });
  });

  it('hydrates Atlas weapons: 4× ML + AC/20 + LRM-20 + SRM-6 (7 mounts total)', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);

    // Total mount count: 4 ML + 1 AC/20 + 1 LRM-20 + 1 SRM-6 = 7.
    expect(weapons).toHaveLength(7);

    // Group by underlying catalog id (strip the `-{mountIndex}` suffix
    // that toAIWeapon adds to keep mounts unique in the AI snapshot).
    const idCounts = weapons.reduce<Record<string, number>>((acc, w) => {
      const baseId = w.id.replace(/-\d+$/, '');
      acc[baseId] = (acc[baseId] ?? 0) + 1;
      return acc;
    }, {});
    expect(idCounts['medium-laser']).toBe(4);
    expect(idCounts['ac-20']).toBe(1);
    expect(idCounts['lrm-20']).toBe(1);
    expect(idCounts['srm-6']).toBe(1);

    // Spot-check key per-weapon stats so a future catalog edit can't
    // silently change the loadout shape under us.
    const mediumLaser = weapons.find((w) => w.name === 'Medium Laser');
    expect(mediumLaser?.damage).toBe(5);
    expect(mediumLaser?.heat).toBe(3);
    expect(mediumLaser?.shortRange).toBe(3);

    const ac20 = weapons.find((w) => w.name === 'AC/20');
    expect(ac20?.damage).toBe(20);
    expect(ac20?.heat).toBe(7);
    expect(ac20?.ammoPerTon).toBe(5);

    // LRM 20 catalog damage is "1/missile" → 20 missiles × 1 damage each.
    const lrm20 = weapons.find((w) => w.name === 'LRM 20');
    expect(lrm20?.damage).toBe(20);
    expect(lrm20?.minRange).toBe(6);

    // SRM 6 catalog damage is "2/missile" → 6 missiles × 2 damage each.
    const srm6 = weapons.find((w) => w.name === 'SRM 6');
    expect(srm6?.damage).toBe(12);
    expect(srm6?.heat).toBe(4);
  });

  it('hydrates mounted weapon locations and rear-facing arcs into AI weapons and unit state', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-location-hydration',
      chassis: 'Synthetic',
      variant: 'Location Hydration',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'BattleMech',
      equipment: [
        { id: 'medium-laser', location: 'LEFT_ARM' },
        { id: 'ac-20', location: 'RIGHT_TORSO', isRearMounted: true },
      ],
    };

    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    // Audit C-8: arm mounts hydrate MegaMek ARC_LEFTARM front+left-side
    // coverage (Mek.getWeaponArc) — the old pin of Front-only LEFT_ARM
    // weapons diverged from MegaMek and blocked side-arc fire.
    expect(
      weapons.map((weapon) => [
        weapon.id,
        weapon.location,
        weapon.mountingArc,
        weapon.mountingArcs,
      ]),
    ).toEqual([
      [
        'medium-laser-0',
        'LEFT_ARM',
        undefined,
        [FiringArc.Front, FiringArc.Left],
      ],
      ['ac-20-1', 'RIGHT_TORSO', FiringArc.Rear, [FiringArc.Rear]],
    ]);

    const state = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: weapons,
    });
    expect(state.weaponLocationById).toEqual({
      'medium-laser-0': 'LEFT_ARM',
      'ac-20-1': 'RIGHT_TORSO',
    });
  });

  it('feeds hydrated mounting arcs into AI weapon selection', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-arc-selection-hydration',
      chassis: 'Synthetic',
      variant: 'Arc Selection Hydration',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'BattleMech',
      equipment: [
        { id: 'medium-laser', location: 'LEFT_ARM' },
        { id: 'ac-20', location: 'RIGHT_TORSO', isRearMounted: true },
      ],
    };
    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    const attackerState = {
      ...createHydratedUnitState({
        runnerUnitId: 'attacker-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit,
        aiWeapons: weapons,
      }),
      facing: Facing.North,
      secondaryFacing: Facing.North,
    };
    const targetState = createMinimalUnitState('target-1', GameSide.Opponent, {
      q: 0,
      r: 2,
    });

    const chosen = new AttackAI().selectWeapons(
      toCatalogAIUnitState(attackerState, weapons),
      toCatalogAIUnitState(targetState, [weapons[0]]),
    );

    expect(chosen.map((weapon) => weapon.id)).toEqual(['ac-20-1']);
  });

  // Audit C-8: MegaMek Mek.getWeaponArc gives biped arm mounts a 180-degree
  // front+side sweep (ARC_LEFTARM/ARC_RIGHTARM = ARC_FORWARD plus the
  // matching side arc per FacingArc), while QuadMek.getWeaponArc keeps every
  // quad location (including FRONT_*_LEG, which the runner maps onto the arm
  // slots) at ARC_FORWARD.
  it('hydrates biped arm mounts with front+side arcs and keeps torso/quad-leg mounts front-only (audit C-8)', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-arm-arc-hydration',
      chassis: 'Synthetic',
      variant: 'Arm Arc Hydration',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'BattleMech',
      equipment: [
        { id: 'medium-laser', location: 'LEFT_ARM' },
        { id: 'medium-laser', location: 'RIGHT_ARM' },
        { id: 'medium-laser', location: 'LEFT_ARM', isRearMounted: true },
        { id: 'medium-laser', location: 'CENTER_TORSO' },
        { id: 'medium-laser', location: 'FRONT_LEFT_LEG' },
      ],
    };

    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    expect(
      weapons.map((weapon) => [
        weapon.location,
        weapon.mountingArc,
        weapon.mountingArcs,
      ]),
    ).toEqual([
      ['LEFT_ARM', undefined, [FiringArc.Front, FiringArc.Left]],
      ['RIGHT_ARM', undefined, [FiringArc.Front, FiringArc.Right]],
      // Rear-mounted arm weapons stay Rear (MegaMek checks isRearMounted
      // BEFORE the location switch).
      ['LEFT_ARM', FiringArc.Rear, [FiringArc.Rear]],
      ['CENTER_TORSO', FiringArc.Front, [FiringArc.Front]],
      // Quad front legs hydrate Front-only per QuadMek.getWeaponArc.
      ['FRONT_LEFT_LEG', FiringArc.Front, [FiringArc.Front]],
    ]);
  });

  it('selects hydrated arm weapons for side-arc targets while torso mounts stay excluded (audit C-8)', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-arm-side-arc-selection',
      chassis: 'Synthetic',
      variant: 'Arm Side Arc Selection',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'BattleMech',
      equipment: [
        { id: 'medium-laser', location: 'RIGHT_ARM' },
        { id: 'ac-20', location: 'RIGHT_TORSO' },
      ],
    };
    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    const attackerState = {
      ...createHydratedUnitState({
        runnerUnitId: 'attacker-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit,
        aiWeapons: weapons,
      }),
      facing: Facing.North,
      secondaryFacing: Facing.North,
    };
    // Attacker at (0,0) facing North; target at (2,0) sits in the Right
    // side arc (~108 degrees off facing — see the torso-twist test in
    // improveBotBasicCombatCompetence.behavior.test.ts for the geometry).
    const targetState = createMinimalUnitState('target-1', GameSide.Opponent, {
      q: 2,
      r: 0,
    });

    const chosen = new AttackAI().selectWeapons(
      toCatalogAIUnitState(attackerState, weapons),
      toCatalogAIUnitState(targetState, [weapons[0]]),
    );

    // RIGHT_ARM laser covers Front+Right and bears on the side-arc target;
    // the front-only RIGHT_TORSO AC/20 cannot.
    expect(chosen.map((weapon) => weapon.id)).toEqual(['medium-laser-0']);
  });

  it('hydrates Artemis IV guidance only when a compatible launcher has linked FCS and Artemis-capable ammo', async () => {
    const service = getNodeCanonicalUnitService();
    const artemisUnit = await service.getById('longshot-lng-2');
    const standardUnit = await service.getById('atlas-as7-d');
    expect(artemisUnit).not.toBeNull();
    expect(standardUnit).not.toBeNull();
    if (!artemisUnit || !standardUnit) return;

    const artemisWeapons = hydrateAIWeaponsFromFullUnit(
      artemisUnit,
      weaponLookup,
    );
    const standardWeapons = hydrateAIWeaponsFromFullUnit(
      standardUnit,
      weaponLookup,
    );
    const artemisSRMs = artemisWeapons.filter((weapon) =>
      /srm\s*6/i.test(weapon.name),
    );
    const standardLRM = standardWeapons.find((weapon) =>
      /lrm\s*20/i.test(weapon.name),
    );

    expect(artemisSRMs).toHaveLength(2);
    expect(
      artemisSRMs.filter((weapon) => weapon.hasArtemisIV === true),
    ).toHaveLength(1);
    expect(artemisSRMs.every((weapon) => !weapon.hasArtemisV)).toBe(true);
    expect(artemisSRMs.every((weapon) => !weapon.hasPrototypeArtemisIV)).toBe(
      true,
    );
    expect(standardLRM?.hasArtemisIV).toBeUndefined();
    expect(standardLRM?.hasPrototypeArtemisIV).toBeUndefined();
    expect(standardLRM?.hasArtemisV).toBeUndefined();
  });

  it('uses explicit Artemis FCS linked-equipment metadata before same-location guidance fallback', () => {
    const linkedArtemisUnit: IFullUnit = {
      id: 'synthetic-linked-artemis-iv',
      chassis: 'Synthetic',
      variant: 'Linked Artemis IV',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [
        { id: 'lrm-10', location: 'RIGHT_TORSO' },
        { id: 'srm-6', location: 'RIGHT_TORSO' },
        {
          id: 'artemis-iv',
          location: 'RIGHT_TORSO',
          linkedEquipment: ['lrm-10'],
        },
      ],
      criticalSlots: {
        RIGHT_TORSO: [
          'IS LRM 10',
          'IS SRM 6',
          'ISArtemisIV',
          'IS Ammo LRM-10 Artemis-capable',
          'IS Ammo SRM-6 Artemis-capable',
        ],
      },
    };

    const weapons = hydrateAIWeaponsFromFullUnit(
      linkedArtemisUnit,
      weaponLookup,
    );
    const lrm = weapons.find((weapon) => weapon.name === 'LRM 10');
    const srm = weapons.find((weapon) => weapon.name === 'SRM 6');

    expect(lrm?.hasArtemisIV).toBe(true);
    expect(srm?.hasArtemisIV).toBeUndefined();
    expect(srm?.hasPrototypeArtemisIV).toBeUndefined();
    expect(srm?.hasArtemisV).toBeUndefined();
  });

  it('does not infer Artemis allocation for multiple unlinked same-location launchers', () => {
    const ambiguousArtemisUnit: IFullUnit = {
      id: 'synthetic-ambiguous-artemis-iv',
      chassis: 'Synthetic',
      variant: 'Ambiguous Artemis IV',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [
        { id: 'lrm-10', location: 'RIGHT_TORSO' },
        { id: 'srm-6', location: 'RIGHT_TORSO' },
        { id: 'artemis-iv', location: 'RIGHT_TORSO' },
      ],
      criticalSlots: {
        RIGHT_TORSO: [
          'IS LRM 10',
          'IS SRM 6',
          'ISArtemisIV',
          'IS Ammo LRM-10 Artemis-capable',
          'IS Ammo SRM-6 Artemis-capable',
        ],
      },
    };

    const weapons = hydrateAIWeaponsFromFullUnit(
      ambiguousArtemisUnit,
      weaponLookup,
    );
    const lrm = weapons.find((weapon) => weapon.name === 'LRM 10');
    const srm = weapons.find((weapon) => weapon.name === 'SRM 6');

    expect(lrm?.hasArtemisIV).toBeUndefined();
    expect(srm?.hasArtemisIV).toBeUndefined();
    expect(lrm?.hasPrototypeArtemisIV).toBeUndefined();
    expect(srm?.hasPrototypeArtemisIV).toBeUndefined();
    expect(lrm?.hasArtemisV).toBeUndefined();
    expect(srm?.hasArtemisV).toBeUndefined();
  });

  it('hydrates unlinked same-location Artemis guidance when FCS cardinality exactly matches compatible launchers', () => {
    const cardinalityMatchedArtemisUnit: IFullUnit = {
      id: 'synthetic-cardinality-matched-artemis-iv',
      chassis: 'Synthetic',
      variant: 'Cardinality Matched Artemis IV',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [
        { id: 'lrm-10', location: 'RIGHT_TORSO' },
        { id: 'srm-6', location: 'RIGHT_TORSO' },
        { id: 'artemis-iv', location: 'RIGHT_TORSO' },
        { id: 'artemis-iv', location: 'RIGHT_TORSO' },
      ],
      criticalSlots: {
        RIGHT_TORSO: [
          'IS LRM 10',
          'IS SRM 6',
          'ISArtemisIV',
          'ISArtemisIV',
          'IS Ammo LRM-10 Artemis-capable',
          'IS Ammo SRM-6 Artemis-capable',
        ],
      },
    };

    const weapons = hydrateAIWeaponsFromFullUnit(
      cardinalityMatchedArtemisUnit,
      weaponLookup,
    );
    const lrm = weapons.find((weapon) => weapon.name === 'LRM 10');
    const srm = weapons.find((weapon) => weapon.name === 'SRM 6');

    expect(lrm?.hasArtemisIV).toBe(true);
    expect(srm?.hasArtemisIV).toBe(true);
    expect(lrm?.hasPrototypeArtemisIV).toBeUndefined();
    expect(srm?.hasPrototypeArtemisIV).toBeUndefined();
    expect(lrm?.hasArtemisV).toBeUndefined();
    expect(srm?.hasArtemisV).toBeUndefined();
  });

  it('does not infer Artemis allocation when exact-cardinality FCS kinds conflict', () => {
    const mixedKindArtemisUnit: IFullUnit = {
      id: 'synthetic-mixed-kind-cardinality-artemis',
      chassis: 'Synthetic',
      variant: 'Mixed Kind Cardinality Artemis',
      tonnage: 50,
      techBase: 'Mixed',
      era: '3070',
      unitType: 'BattleMech',
      equipment: [
        { id: 'lrm-10', location: 'RIGHT_TORSO' },
        { id: 'srm-6', location: 'RIGHT_TORSO' },
        { id: 'artemis-iv', location: 'RIGHT_TORSO' },
        { id: 'artemis-iv', location: 'RIGHT_TORSO' },
        { id: 'cl-artemis-v', location: 'RIGHT_TORSO' },
        { id: 'cl-artemis-v', location: 'RIGHT_TORSO' },
      ],
      criticalSlots: {
        RIGHT_TORSO: [
          'IS LRM 10',
          'IS SRM 6',
          'ISArtemisIV',
          'ISArtemisIV',
          'CLArtemisV',
          'CLArtemisV',
          'IS Ammo LRM-10 Artemis-capable',
          'IS Ammo SRM-6 Artemis-capable',
          'CL Ammo LRM-10 Artemis V-capable',
          'CL Ammo SRM-6 Artemis V-capable',
        ],
      },
    };

    const weapons = hydrateAIWeaponsFromFullUnit(
      mixedKindArtemisUnit,
      weaponLookup,
    );
    const lrm = weapons.find((weapon) => weapon.name === 'LRM 10');
    const srm = weapons.find((weapon) => weapon.name === 'SRM 6');

    expect(lrm?.hasArtemisIV).toBeUndefined();
    expect(srm?.hasArtemisIV).toBeUndefined();
    expect(lrm?.hasPrototypeArtemisIV).toBeUndefined();
    expect(srm?.hasPrototypeArtemisIV).toBeUndefined();
    expect(lrm?.hasArtemisV).toBeUndefined();
    expect(srm?.hasArtemisV).toBeUndefined();
  });

  it('carries explicit Artemis FCS linked-equipment metadata into critical slots', () => {
    const linkedArtemisUnit: IFullUnit = {
      id: 'synthetic-linked-artemis-iv-critical',
      chassis: 'Synthetic',
      variant: 'Linked Artemis IV Critical',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [
        { id: 'lrm-10', location: 'RIGHT_TORSO' },
        { id: 'srm-6', location: 'RIGHT_TORSO' },
        {
          id: 'artemis-iv',
          location: 'RIGHT_TORSO',
          linkedEquipment: ['lrm-10'],
        },
      ],
      criticalSlots: {
        RIGHT_TORSO: [
          'IS LRM 10',
          'IS SRM 6',
          'ISArtemisIV',
          'IS Ammo LRM-10 Artemis-capable',
          'IS Ammo SRM-6 Artemis-capable',
        ],
      },
    };

    const weapons = hydrateAIWeaponsFromFullUnit(
      linkedArtemisUnit,
      weaponLookup,
    );
    const manifest = hydrateCriticalSlotManifestFromFullUnit(
      linkedArtemisUnit,
      weapons,
    );
    const artemisSlot = manifest?.right_torso.find(
      (slot) => slot.componentName === 'ISArtemisIV',
    );

    expect(artemisSlot).toMatchObject({
      componentType: 'equipment',
      linkedCriticalWeaponId: expect.stringContaining('lrm-10'),
      linkedCriticalWeaponName: 'LRM 10',
    });
  });

  it('hydrates prototype Artemis IV guidance from matching FCS and Artemis-capable ammo', () => {
    const prototypeUnit: IFullUnit = {
      id: 'synthetic-prototype-artemis-iv',
      chassis: 'Synthetic',
      variant: 'Prototype Artemis IV',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [{ id: 'srm-6', location: 'RIGHT_TORSO' }],
      criticalSlots: {
        RIGHT_TORSO: [
          'IS SRM 6',
          'ISArtemisIVProto',
          'IS Ammo SRM-6 Artemis-capable',
        ],
      },
    };

    const weapons = hydrateAIWeaponsFromFullUnit(prototypeUnit, weaponLookup);

    expect(weapons).toHaveLength(1);
    expect(weapons[0].hasPrototypeArtemisIV).toBe(true);
    expect(weapons[0].hasArtemisIV).toBeUndefined();
    expect(weapons[0].hasArtemisV).toBeUndefined();
  });

  it('hydrates Artemis V guidance from matching FCS and Artemis V-capable ammo', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('alpha-wolf-b');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    const srmLaunchers = weapons.filter((weapon) =>
      /srm\s*6/i.test(weapon.name),
    );

    expect(srmLaunchers).toHaveLength(2);
    expect(srmLaunchers.every((weapon) => weapon.hasArtemisV)).toBe(true);
    expect(srmLaunchers.every((weapon) => !weapon.hasArtemisIV)).toBe(true);
    expect(srmLaunchers.every((weapon) => !weapon.hasPrototypeArtemisIV)).toBe(
      true,
    );
  });

  it('reports unresolved weapon refs so strict catalog hydration cannot fall back silently', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const brokenUnit: IFullUnit = {
      ...fullUnit,
      equipment: [
        ...((fullUnit.equipment as readonly unknown[] | undefined) ?? []),
        { id: 'missing-catalog-weapon', location: 'RIGHT_ARM' },
      ],
    };
    const emptyUnit: IFullUnit = {
      ...fullUnit,
      id: 'atlas-as7-d-empty-loadout',
      equipment: [],
    };

    const partialReport = hydrateAIWeaponsFromFullUnitWithReport(
      brokenUnit,
      weaponLookup,
    );
    expect(partialReport.weapons).toHaveLength(7);
    expect(partialReport.resolvedEquipmentIds).toHaveLength(7);
    expect(partialReport.unresolvedEquipmentIds).toEqual([
      'missing-catalog-weapon',
    ]);
    expect(() =>
      hydrateAIWeaponsFromFullUnitStrict(brokenUnit, weaponLookup),
    ).toThrow('missing-catalog-weapon');

    const emptyReport = hydrateAIWeaponsFromFullUnitWithReport(
      emptyUnit,
      weaponLookup,
    );
    expect(emptyReport.weapons).toHaveLength(0);
    expect(() =>
      hydrateAIWeaponsFromFullUnitStrict(emptyUnit, weaponLookup),
    ).toThrow('no combat weapons resolved');

    const unitState = createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    expect(() => toCatalogAIUnitState(unitState, [])).toThrow(
      'refusing synthetic Medium Laser fallback',
    );
  });

  it('hydrates Atlas armor: per-location map sums to 304 across 11 locations', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const { armor, totalArmor, locationCount } =
      hydrateArmorFromFullUnit(fullUnit);

    expect(totalArmor).toBe(ATLAS_CANONICAL_TOTAL_ARMOR);
    // Atlas has 11 distinct armor slots: HD, CT, CT_rear, LT, LT_rear,
    // RT, RT_rear, LA, RA, LL, RL.
    expect(locationCount).toBe(11);

    // Spot-check the canonical per-location values.
    expect(armor.head).toBe(9);
    expect(armor.center_torso).toBe(47);
    expect(armor.center_torso_rear).toBe(14);
    expect(armor.left_torso).toBe(32);
    expect(armor.left_torso_rear).toBe(10);
    expect(armor.right_torso).toBe(32);
    expect(armor.right_torso_rear).toBe(10);
    expect(armor.left_arm).toBe(34);
    expect(armor.right_arm).toBe(34);
    expect(armor.left_leg).toBe(41);
    expect(armor.right_leg).toBe(41);
  });

  it('hydrates Atlas internal structure: 100t profile (HD=3, CT=31, ST=21, arm=17, leg=21)', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const { structure, totalStructure } =
      hydrateStructureFromFullUnit(fullUnit);
    // 3 + 31 + 21*2 + 17*2 + 21*2 = 3 + 31 + 42 + 34 + 42 = 152.
    expect(totalStructure).toBe(152);
    expect(structure.head).toBe(3);
    expect(structure.center_torso).toBe(31);
    expect(structure.left_torso).toBe(21);
    expect(structure.right_torso).toBe(21);
    expect(structure.left_arm).toBe(17);
    expect(structure.right_arm).toBe(17);
    expect(structure.left_leg).toBe(21);
    expect(structure.right_leg).toBe(21);
  });

  it('hydrates Atlas heat sinks from the catalog', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const heatSinks = hydrateHeatSinksFromFullUnit(fullUnit);

    expect(heatSinks).toEqual({
      count: ATLAS_CANONICAL_HEAT_SINKS,
      kind: 'single',
    });
  });

  it('normalizes double heat sink catalog strings for runner state', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const doubleSinkUnit: IFullUnit = {
      ...fullUnit,
      id: 'double-sink-test',
      heatSinks: { type: 'DOUBLE', count: 14 },
    };

    expect(hydrateHeatSinksFromFullUnit(doubleSinkUnit)).toEqual({
      count: 14,
      kind: 'double',
    });
  });

  it('hydrates source-backed pilot abilities and generic Edge points from full unit state', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const edgeUnit: IFullUnit = {
      ...fullUnit,
      id: 'edge-hydration-test',
      abilities: ['edge', 'edge_when_headhit'],
      edgePointsRemaining: 2,
    };
    const genericEdgeUnit: IFullUnit = {
      ...fullUnit,
      id: 'generic-edge-hydration-test',
      abilities: ['edge'],
    };
    const triggerOnlyEdgeUnit: IFullUnit = {
      ...fullUnit,
      id: 'trigger-only-edge-hydration-test',
      abilities: ['edge_when_headhit'],
    };

    expect(hydratePilotAbilitiesFromFullUnit(edgeUnit)).toEqual([
      'edge',
      'edge_when_headhit',
    ]);
    expect(hydrateEdgePointsFromFullUnit(edgeUnit)).toBe(2);
    expect(hydrateEdgePointsFromFullUnit(genericEdgeUnit)).toBe(1);
    expect(hydrateEdgePointsFromFullUnit(triggerOnlyEdgeUnit)).toBeUndefined();

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: genericEdgeUnit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.abilities).toEqual(['edge']);
    expect(unitState.edgePointsRemaining).toBe(1);
  });

  it('hydrates TSM movement enhancements into runner physical damage state', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const baseMovement =
      (fullUnit as { movement?: Record<string, unknown> }).movement ?? {};
    const tsmUnit: IFullUnit = {
      ...fullUnit,
      id: 'tsm-hydration-test',
      movement: {
        ...baseMovement,
        enhancements: ['TSM'],
      },
    };
    const booleanTsmUnit: IFullUnit = {
      ...fullUnit,
      id: 'tsm-boolean-hydration-test',
      movement: {
        ...baseMovement,
        hasTSM: true,
      },
    };

    expect(hydrateHasTSMFromFullUnit(fullUnit)).toBe(false);
    expect(hydrateHasTSMFromFullUnit(tsmUnit)).toBe(true);
    expect(hydrateHasTSMFromFullUnit(booleanTsmUnit)).toBe(true);

    const aiWeapons = hydrateAIWeaponsFromFullUnit(tsmUnit, weaponLookup);
    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: tsmUnit,
      aiWeapons,
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.hasTSM).toBe(true);
  });

  it('hydrates installed MASC and Supercharger without implicitly activating them', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const baseMovement =
      (fullUnit as { movement?: Record<string, unknown> }).movement ?? {};
    const existingEquipment =
      (fullUnit.equipment as readonly unknown[] | undefined) ?? [];
    const boosterUnit: IFullUnit = {
      ...fullUnit,
      id: 'masc-supercharger-hydration-test',
      movement: {
        ...baseMovement,
        enhancements: ['MASC', 'Supercharger'],
      },
      equipment: [
        ...existingEquipment,
        { id: 'IS MASC', location: 'RIGHT_TORSO' },
        { id: 'CLMASC(Clan)', location: 'RIGHT_TORSO' },
        { id: 'IS Supercharger', location: 'LEFT_TORSO' },
        { id: 'Supercharger (Clan) (OMNIPOD)', location: 'LEFT_TORSO' },
      ],
    };

    expect(hydrateHasMASCFromFullUnit(fullUnit)).toBe(false);
    expect(hydrateHasSuperchargerFromFullUnit(fullUnit)).toBe(false);
    expect(hydrateHasMASCFromFullUnit(boosterUnit)).toBe(true);
    expect(hydrateHasSuperchargerFromFullUnit(boosterUnit)).toBe(true);

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: boosterUnit,
      aiWeapons: hydrateAIWeaponsFromFullUnit(boosterUnit, weaponLookup),
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.hasMASC).toBe(true);
    expect(unitState.hasSupercharger).toBe(true);
    expect(unitState.activeMASC).toBeUndefined();
    expect(unitState.activeSupercharger).toBeUndefined();
  });

  it('hydrates BattleMech Partial Wing jump bonus by weight class', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const existingEquipment =
      (fullUnit.equipment as readonly unknown[] | undefined) ?? [];
    const mediumPartialWingUnit: IFullUnit = {
      ...fullUnit,
      id: 'medium-partial-wing-test',
      tonnage: 55,
      unitType: 'BattleMech',
      equipment: [
        ...existingEquipment,
        { id: 'IS Partial Wing', location: 'LEFT_TORSO' },
      ],
    };
    const heavyPartialWingUnit: IFullUnit = {
      ...mediumPartialWingUnit,
      id: 'heavy-partial-wing-test',
      tonnage: 75,
    };
    const battleArmorWingUnit: IFullUnit = {
      ...mediumPartialWingUnit,
      id: 'battle-armor-partial-wing-test',
      unitType: 'Battle Armor',
      equipment: [
        ...existingEquipment,
        { id: 'Battle Armor Partial Wing', location: 'BODY' },
      ],
    };
    const protoMechWingUnit: IFullUnit = {
      ...mediumPartialWingUnit,
      id: 'protomech-partial-wing-test',
      unitType: 'ProtoMech',
      equipment: [
        ...existingEquipment,
        { id: 'ProtoMech Partial Wing', location: 'TORSO' },
      ],
    };

    expect(hydratePartialWingJumpBonusFromFullUnit(fullUnit)).toBeUndefined();
    expect(hydratePartialWingJumpBonusFromFullUnit(mediumPartialWingUnit)).toBe(
      2,
    );
    expect(hydratePartialWingJumpBonusFromFullUnit(heavyPartialWingUnit)).toBe(
      1,
    );
    expect(
      hydratePartialWingJumpBonusFromFullUnit(battleArmorWingUnit),
    ).toBeUndefined();
    expect(
      hydratePartialWingJumpBonusFromFullUnit(protoMechWingUnit),
    ).toBeUndefined();

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: mediumPartialWingUnit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.partialWingJumpBonus).toBe(2);
  });

  it('hydrates BattleMech talons from leg critical slots into unit state', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('caesar-ces-5d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(hydrateTalonStateFromFullUnit(fullUnit)).toEqual({
      leftLegHasTalons: true,
      rightLegHasTalons: true,
      leftArmHasTalons: false,
      rightArmHasTalons: false,
    });

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup),
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.leftLegHasTalons).toBe(true);
    expect(unitState.rightLegHasTalons).toBe(true);
    expect(unitState.leftArmHasTalons).toBe(false);
    expect(unitState.rightArmHasTalons).toBe(false);
  });

  it('hydrates quad front-leg talons from arm critical slots into unit state', () => {
    const fullUnit = {
      id: 'synthetic-quad-talons',
      chassis: 'Synthetic Quad',
      variant: 'QT',
      tonnage: 80,
      techBase: 'Inner Sphere',
      era: 'Civil War',
      unitType: 'BattleMech',
      criticalSlots: {
        LEFT_ARM: ['Talons'],
        RIGHT_ARM: ['Talons'],
      },
    } satisfies IFullUnit;

    expect(hydrateTalonStateFromFullUnit(fullUnit)).toEqual({
      leftLegHasTalons: false,
      rightLegHasTalons: false,
      leftArmHasTalons: true,
      rightArmHasTalons: true,
    });

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.leftArmHasTalons).toBe(true);
    expect(unitState.rightArmHasTalons).toBe(true);
  });

  it('hydrates BattleMech claws from arm critical slots into unit state', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('mantis-mts-t3');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(hydrateClawStateFromFullUnit(fullUnit)).toEqual({
      leftArmHasClaw: true,
      rightArmHasClaw: true,
    });

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup),
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.leftArmHasClaw).toBe(true);
    expect(unitState.rightArmHasClaw).toBe(true);
  });

  it('hydrates Prototype Improved Jump Jet critical text as secondary-effect-gated explosive equipment', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-prototype-improved-jump-jet',
      chassis: 'Synthetic',
      variant: 'PIJJ',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3020',
      unitType: 'BattleMech',
      criticalSlots: {
        RIGHT_TORSO: ['ISPrototypeImprovedJumpJet'],
      },
    };

    const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);

    expect(manifest?.right_torso).toContainEqual(
      expect.objectContaining({
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'ISPrototypeImprovedJumpJet',
        explosionDamage: 10,
        explosionRequiresSecondaryEffects: true,
      }),
    );
  });

  it('hydrates Extended Fuel Tank critical text as secondary-effect-gated explosive equipment', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-extended-fuel-tank',
      chassis: 'Synthetic',
      variant: 'Fuel',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3020',
      unitType: 'BattleMech',
      criticalSlots: {
        RIGHT_TORSO: ['Extended Fuel Tank'],
      },
    };

    const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);

    expect(manifest?.right_torso).toContainEqual(
      expect.objectContaining({
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'Extended Fuel Tank',
        explosionDamage: 20,
        explosionRequiresSecondaryEffects: true,
      }),
    );
  });

  it('hydrates official tonnage-suffixed Extended Fuel Tank critical text as represented explosive equipment', async () => {
    const service = getNodeCanonicalUnitService();
    const carbine = await service.getById('carbine-con-8h-haulermech');
    const vampyr = await service.getById('vampyr-sc-v-1-salvagemech');
    expect(carbine).not.toBeNull();
    expect(vampyr).not.toBeNull();
    if (!carbine || !vampyr) return;

    const carbineSlots = Object.values(
      hydrateCriticalSlotManifestFromFullUnit(carbine) ?? {},
    ).flat();
    const vampyrSlots = Object.values(
      hydrateCriticalSlotManifestFromFullUnit(vampyr) ?? {},
    ).flat();

    expect(carbineSlots).toContainEqual(
      expect.objectContaining({
        componentType: 'equipment',
        componentName: 'Extended Fuel Tank (1 ton)',
        explosionDamage: 20,
        explosionRequiresSecondaryEffects: true,
      }),
    );
    expect(vampyrSlots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentType: 'equipment',
          componentName: 'Extended Fuel Tank (3 tons)',
          explosionDamage: 20,
          explosionRequiresSecondaryEffects: true,
        }),
      ]),
    );
  });

  it('hydrates official Blue Shield Particle Field Damper critical text as represented explosive equipment', async () => {
    const service = getNodeCanonicalUnitService();
    const spatha = await service.getById('spatha-sp2-x-warlord');
    expect(spatha).not.toBeNull();
    if (!spatha) return;

    const slots = Object.values(
      hydrateCriticalSlotManifestFromFullUnit(spatha) ?? {},
    ).flat();

    expect(slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          componentType: 'equipment',
          componentName: 'Blue Shield Particle Field Damper',
          explosionDamage: 5,
          explosionRequiresSecondaryEffects: true,
        }),
      ]),
    );
  });

  it('keeps represented Blue Shield critical explosion metadata when the source mode is active', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-blue-shield-active',
      chassis: 'Synthetic',
      variant: 'Blue Shield Active',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3090',
      unitType: 'BattleMech',
      equipment: [
        {
          id: 'Blue Shield Particle Field Damper',
          location: 'Right Torso',
          mode: 'On',
        },
      ],
      criticalSlots: {
        RIGHT_TORSO: ['Blue Shield Particle Field Damper'],
      },
    };

    const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);

    expect(manifest?.right_torso).toContainEqual(
      expect.objectContaining({
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'Blue Shield Particle Field Damper',
        explosionDamage: 5,
        explosionRequiresSecondaryEffects: true,
      }),
    );
  });

  it('omits represented Blue Shield critical explosion metadata when the source mode is Off', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-blue-shield-off',
      chassis: 'Synthetic',
      variant: 'Blue Shield Off',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3090',
      unitType: 'BattleMech',
      equipment: [
        {
          id: 'Blue Shield Particle Field Damper',
          location: 'Right Torso',
          currentMode: 'Off',
        },
      ],
      criticalSlots: {
        RIGHT_TORSO: ['Blue Shield Particle Field Damper'],
      },
    };

    const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);
    const [slot] = manifest?.right_torso ?? [];

    expect(slot).toMatchObject({
      slotIndex: 0,
      componentType: 'equipment',
      componentName: 'Blue Shield Particle Field Damper',
    });
    expect(slot).not.toHaveProperty('explosionDamage');
    expect(slot).not.toHaveProperty('explosionRequiresSecondaryEffects');
  });

  it('hydrates HotLoad weapon mode critical state only with explicit explosion damage metadata', () => {
    const aiWeapons = [
      {
        id: 'lrm-20-0',
        name: 'LRM 20',
        shortRange: 7,
        mediumRange: 14,
        longRange: 21,
        damage: 20,
        heat: 6,
        minRange: 6,
        ammoPerTon: 6,
        location: 'RIGHT_TORSO',
        destroyed: false,
      },
    ];
    const fullUnit: IFullUnit = {
      id: 'synthetic-hot-load-mode-state',
      chassis: 'Synthetic',
      variant: 'HotLoad',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3020',
      unitType: 'BattleMech',
      equipment: [
        {
          id: 'lrm-20',
          location: 'RIGHT_TORSO',
          currentMode: 'HotLoad',
          explosionDamage: 12,
        },
      ],
      criticalSlots: {
        RIGHT_TORSO: ['LRM 20'],
      },
    };

    const manifest = hydrateCriticalSlotManifestFromFullUnit(
      fullUnit,
      aiWeapons,
    );

    expect(manifest?.right_torso[0]).toMatchObject({
      slotIndex: 0,
      componentType: 'weapon',
      componentName: 'LRM 20',
      weaponId: 'lrm-20-0',
      hotLoaded: true,
      explosionDamage: 12,
    });

    const modeOnlyManifest = hydrateCriticalSlotManifestFromFullUnit(
      {
        ...fullUnit,
        equipment: [
          {
            id: 'lrm-20',
            location: 'RIGHT_TORSO',
            currentMode: 'HotLoad',
          },
        ],
      },
      aiWeapons,
    );

    expect(modeOnlyManifest?.right_torso[0]).toMatchObject({
      componentType: 'weapon',
      componentName: 'LRM 20',
      weaponId: 'lrm-20-0',
    });
    expect(modeOnlyManifest?.right_torso[0]).not.toHaveProperty('hotLoaded');
    expect(modeOnlyManifest?.right_torso[0]).not.toHaveProperty(
      'explosionDamage',
    );

    const linkedAmmoOnlyManifest = hydrateCriticalSlotManifestFromFullUnit(
      {
        ...fullUnit,
        equipment: [
          {
            id: 'lrm-20',
            location: 'RIGHT_TORSO',
            currentMode: 'HotLoad',
            linkedEquipment: ['lrm-20-ammo'],
          },
          {
            id: 'lrm-20-ammo',
            location: 'RIGHT_TORSO',
            explosionDamage: 120,
          },
        ],
      },
      aiWeapons,
    );

    expect(linkedAmmoOnlyManifest?.right_torso[0]).toMatchObject({
      componentType: 'weapon',
      componentName: 'LRM 20',
      weaponId: 'lrm-20-0',
      hotLoaded: true,
      explosionDamage: 120,
    });

    const ambiguousLinkedAmmoManifest = hydrateCriticalSlotManifestFromFullUnit(
      {
        ...fullUnit,
        equipment: [
          {
            id: 'lrm-20',
            location: 'RIGHT_TORSO',
            currentMode: 'HotLoad',
            linkedEquipment: ['lrm-20-ammo'],
          },
          {
            id: 'lrm-20-ammo',
            location: 'RIGHT_TORSO',
            explosionDamage: 120,
          },
          {
            id: 'lrm-20-ammo',
            location: 'RIGHT_TORSO',
            explosionDamage: 120,
          },
        ],
      },
      aiWeapons,
    );

    expect(ambiguousLinkedAmmoManifest?.right_torso[0]).toMatchObject({
      componentType: 'weapon',
      componentName: 'LRM 20',
      weaponId: 'lrm-20-0',
    });
    expect(ambiguousLinkedAmmoManifest?.right_torso[0]).not.toHaveProperty(
      'hotLoaded',
    );
    expect(ambiguousLinkedAmmoManifest?.right_torso[0]).not.toHaveProperty(
      'explosionDamage',
    );

    const ambiguousManifest = hydrateCriticalSlotManifestFromFullUnit(
      {
        ...fullUnit,
        equipment: [
          {
            id: 'lrm-20',
            location: 'RIGHT_TORSO',
            currentMode: 'HotLoad',
            explosionDamage: 12,
          },
          {
            id: 'lrm-20',
            location: 'RIGHT_TORSO',
            currentMode: 'HotLoad',
            explosionDamage: 12,
          },
        ],
      },
      aiWeapons,
    );

    expect(ambiguousManifest?.right_torso[0]).toMatchObject({
      componentType: 'weapon',
      componentName: 'LRM 20',
      weaponId: 'lrm-20-0',
    });
    expect(ambiguousManifest?.right_torso[0]).not.toHaveProperty('hotLoaded');
    expect(ambiguousManifest?.right_torso[0]).not.toHaveProperty(
      'explosionDamage',
    );
  });

  it('hydrates RISC Emergency Coolant System critical text as secondary-effect-gated explosive equipment', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-risc-emergency-coolant-system',
      chassis: 'Synthetic',
      variant: 'ECS',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3136',
      unitType: 'BattleMech',
      criticalSlots: {
        RIGHT_TORSO: ['RISC Emergency Coolant System'],
      },
    };

    const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);

    expect(manifest?.right_torso).toContainEqual(
      expect.objectContaining({
        slotIndex: 0,
        componentType: 'equipment',
        componentName: 'RISC Emergency Coolant System',
        explosionDamage: 5,
        explosionRequiresSecondaryEffects: true,
      }),
    );
  });

  it('hydrates generic equipment explosion damage only from explicit source metadata', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-explicit-equipment-explosion',
      chassis: 'Synthetic',
      variant: 'Explicit Explosion',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3136',
      unitType: 'BattleMech',
      equipment: [
        {
          id: 'PPC Capacitor',
          location: 'Right Torso',
          explosionDamage: 15,
        },
      ],
      criticalSlots: {
        RIGHT_TORSO: ['PPC Capacitor'],
      },
    };

    const manifest = hydrateCriticalSlotManifestFromFullUnit(fullUnit);

    expect(manifest?.right_torso[0]).toMatchObject({
      slotIndex: 0,
      componentType: 'equipment',
      componentName: 'PPC Capacitor',
      explosionDamage: 15,
    });

    const nameOnlyManifest = hydrateCriticalSlotManifestFromFullUnit({
      ...fullUnit,
      equipment: [
        {
          id: 'PPC Capacitor',
          location: 'Right Torso',
        },
      ],
    });
    expect(nameOnlyManifest?.right_torso[0]).toMatchObject({
      componentType: 'equipment',
      componentName: 'PPC Capacitor',
    });
    expect(nameOnlyManifest?.right_torso[0]).not.toHaveProperty(
      'explosionDamage',
    );

    const duplicateMetadataManifest = hydrateCriticalSlotManifestFromFullUnit({
      ...fullUnit,
      equipment: [
        {
          id: 'PPC Capacitor',
          location: 'Right Torso',
          explosionDamage: 15,
        },
        {
          id: 'PPC Capacitor',
          location: 'Right Torso',
          explosionDamage: 15,
        },
      ],
    });
    expect(duplicateMetadataManifest?.right_torso[0]).toMatchObject({
      componentType: 'equipment',
      componentName: 'PPC Capacitor',
    });
    expect(duplicateMetadataManifest?.right_torso[0]).not.toHaveProperty(
      'explosionDamage',
    );
  });

  it('hydrates RISC Laser Pulse Module linked-laser criticals from exact explicit or unambiguous same-location laser state', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-risc-laser-pulse-module',
      chassis: 'Synthetic',
      variant: 'RISC LPM',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3020',
      unitType: 'BattleMech',
      equipment: [
        {
          id: 'medium-laser',
          location: 'RIGHT_TORSO',
        },
        {
          id: 'risclaserpulsemodule',
          location: 'RIGHT_TORSO',
          linkedEquipment: ['medium-laser'],
        },
      ],
      criticalSlots: {
        RIGHT_TORSO: ['Medium Laser', 'RISC Laser Pulse Module'],
      },
    };
    const aiWeapons = [
      {
        id: 'medium-laser-0',
        name: 'Medium Laser',
        shortRange: 3,
        mediumRange: 6,
        longRange: 9,
        damage: 5,
        heat: 3,
        minRange: 0,
        ammoPerTon: -1,
        location: 'RIGHT_TORSO',
        destroyed: false,
      },
    ];

    const manifest = hydrateCriticalSlotManifestFromFullUnit(
      fullUnit,
      aiWeapons,
    );

    expect(manifest?.right_torso).toContainEqual(
      expect.objectContaining({
        slotIndex: 1,
        componentType: 'equipment',
        componentName: 'RISC Laser Pulse Module',
        linkedCriticalWeaponId: 'medium-laser-0',
        linkedCriticalWeaponName: 'Medium Laser',
      }),
    );

    const unambiguousFallbackManifest = hydrateCriticalSlotManifestFromFullUnit(
      {
        ...fullUnit,
        equipment: [
          {
            id: 'medium-laser',
            location: 'RIGHT_TORSO',
          },
          {
            id: 'risclaserpulsemodule',
            location: 'RIGHT_TORSO',
          },
        ],
      },
      aiWeapons,
    );

    expect(unambiguousFallbackManifest?.right_torso[1]).toMatchObject({
      componentType: 'equipment',
      componentName: 'RISC Laser Pulse Module',
      linkedCriticalWeaponId: 'medium-laser-0',
      linkedCriticalWeaponName: 'Medium Laser',
    });

    if (!unambiguousFallbackManifest) {
      throw new Error('expected RISC LPM critical manifest');
    }

    const result = resolveCriticalHits(
      'synthetic-risc-laser-pulse-module',
      'right_torso',
      unambiguousFallbackManifest,
      DEFAULT_COMPONENT_DAMAGE,
      () => 2,
      1,
    );

    expect(result.hits[0].effect).toEqual({
      type: CriticalEffectType.WeaponDestroyed,
      equipmentDestroyed: 'Medium Laser',
      weaponDisabled: 'medium-laser-0',
    });
    expect(result.updatedComponentDamage.weaponsDestroyed).toEqual([
      'medium-laser-0',
    ]);
  });

  it('keeps RISC Laser Pulse Module criticals generic when same-location laser fallback is ambiguous or absent', () => {
    const fullUnit: IFullUnit = {
      id: 'synthetic-risc-laser-pulse-module-ambiguous',
      chassis: 'Synthetic',
      variant: 'RISC LPM',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3020',
      unitType: 'BattleMech',
      equipment: [
        {
          id: 'medium-laser',
          location: 'RIGHT_TORSO',
        },
        {
          id: 'risclaserpulsemodule',
          location: 'RIGHT_TORSO',
        },
      ],
      criticalSlots: {
        RIGHT_TORSO: ['Medium Laser', 'RISC Laser Pulse Module'],
      },
    };
    const ambiguousLaserWeapons = [
      {
        id: 'medium-laser-0',
        name: 'Medium Laser',
        shortRange: 3,
        mediumRange: 6,
        longRange: 9,
        damage: 5,
        heat: 3,
        minRange: 0,
        ammoPerTon: -1,
        location: 'RIGHT_TORSO',
        destroyed: false,
      },
      {
        id: 'small-laser-1',
        name: 'Small Laser',
        shortRange: 1,
        mediumRange: 2,
        longRange: 3,
        damage: 3,
        heat: 1,
        minRange: 0,
        ammoPerTon: -1,
        location: 'RIGHT_TORSO',
        destroyed: false,
      },
    ];
    const noSameLocationLaserWeapons = [
      {
        id: 'medium-laser-0',
        name: 'Medium Laser',
        shortRange: 3,
        mediumRange: 6,
        longRange: 9,
        damage: 5,
        heat: 3,
        minRange: 0,
        ammoPerTon: -1,
        location: 'LEFT_TORSO',
        destroyed: false,
      },
    ];

    const ambiguousManifest = hydrateCriticalSlotManifestFromFullUnit(
      fullUnit,
      ambiguousLaserWeapons,
    );
    const noSameLocationManifest = hydrateCriticalSlotManifestFromFullUnit(
      fullUnit,
      noSameLocationLaserWeapons,
    );

    expect(ambiguousManifest?.right_torso[1]).toMatchObject({
      componentType: 'equipment',
      componentName: 'RISC Laser Pulse Module',
    });
    expect(ambiguousManifest?.right_torso[1]).not.toHaveProperty(
      'linkedCriticalWeaponId',
    );
    expect(noSameLocationManifest?.right_torso[1]).toMatchObject({
      componentType: 'equipment',
      componentName: 'RISC Laser Pulse Module',
    });
    expect(noSameLocationManifest?.right_torso[1]).not.toHaveProperty(
      'linkedCriticalWeaponId',
    );

    const explicitMultiLinkedManifest = hydrateCriticalSlotManifestFromFullUnit(
      {
        ...fullUnit,
        equipment: [
          {
            id: 'medium-laser',
            location: 'RIGHT_TORSO',
          },
          {
            id: 'small-laser',
            location: 'RIGHT_TORSO',
          },
          {
            id: 'risclaserpulsemodule',
            location: 'RIGHT_TORSO',
            linkedEquipment: ['medium-laser', 'small-laser'],
          },
        ],
      },
      ambiguousLaserWeapons,
    );
    expect(explicitMultiLinkedManifest?.right_torso[1]).toMatchObject({
      componentType: 'equipment',
      componentName: 'RISC Laser Pulse Module',
    });
    expect(explicitMultiLinkedManifest?.right_torso[1]).not.toHaveProperty(
      'linkedCriticalWeaponId',
    );
  });

  it('hydrates BattleMech stealth armor and critical-slot ECM from a real unit', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('wasp-wsp-3l');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(hydrateHasStealthArmorFromFullUnit(fullUnit)).toBe(true);
    expect(hydrateECMSuitesFromFullUnit(fullUnit)).toEqual([
      {
        type: 'guardian',
        sourceEquipmentId: 'ISGuardianECMSuite',
        sourceLocation: 'LEFT_TORSO',
      },
    ]);

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.hasStealthArmor).toBe(true);
  });

  it('hydrates standard ECM and CEWS equipment ids for EW seeding', () => {
    const ecmUnit: IFullUnit = {
      id: 'synthetic-ecm-suite-hydration-test',
      chassis: 'Synthetic',
      variant: 'ECM',
      tonnage: 50,
      techBase: 'Mixed',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [
        { id: '1-isguardianecm', location: 'HEAD', currentMode: 'ECCM' },
        { id: '1-isangelecm', location: 'LEFT_TORSO', mode: 'Off' },
        { id: '1-clecmsuite', location: 'RIGHT_TORSO,_AMMO:10' },
        { id: '1-clwatchdogcews', location: 'CENTER_TORSO' },
        {
          id: 'nova-combined-electronic-warfare-system-cews',
          location: 'HEAD',
        },
      ],
    };

    expect(hydrateECMSuitesFromFullUnit(ecmUnit)).toEqual([
      {
        type: 'guardian',
        sourceEquipmentId: '1-isguardianecm',
        sourceLocation: 'HEAD',
        mode: 'eccm',
      },
      {
        type: 'angel',
        sourceEquipmentId: '1-isangelecm',
        sourceLocation: 'LEFT_TORSO',
        mode: 'off',
      },
      {
        type: 'clan',
        sourceEquipmentId: '1-clecmsuite',
        sourceLocation: 'RIGHT_TORSO',
      },
      {
        type: 'clan',
        sourceEquipmentId: '1-clwatchdogcews',
        sourceLocation: 'CENTER_TORSO',
      },
      {
        type: 'clan',
        sourceEquipmentId: 'nova-combined-electronic-warfare-system-cews',
        sourceLocation: 'HEAD',
      },
    ]);
  });

  it('hydrates active probe and CEWS equipment ids for ECM countering', () => {
    const probeUnit: IFullUnit = {
      id: 'synthetic-active-probe-hydration-test',
      chassis: 'Synthetic',
      variant: 'Probe',
      tonnage: 50,
      techBase: 'Mixed',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [
        { id: '1-isbeagleactiveprobe', location: 'HEAD' },
        { id: '1-isbloodhoundactiveprobe', location: 'LEFT_TORSO' },
        { id: '1-clactiveprobe', location: 'RIGHT_TORSO' },
        { id: '1-cllightactiveprobe', location: 'RIGHT_ARM' },
        { id: '1-clwatchdogcews', location: 'CENTER_TORSO' },
        {
          id: 'nova-combined-electronic-warfare-system-cews',
          location: 'HEAD',
        },
      ],
    };

    expect(hydrateActiveProbesFromFullUnit(probeUnit)).toEqual([
      {
        type: 'beagle',
        sourceEquipmentId: '1-isbeagleactiveprobe',
        sourceLocation: 'HEAD',
      },
      {
        type: 'bloodhound',
        sourceEquipmentId: '1-isbloodhoundactiveprobe',
        sourceLocation: 'LEFT_TORSO',
      },
      {
        type: 'clan-active-probe',
        sourceEquipmentId: '1-clactiveprobe',
        sourceLocation: 'RIGHT_TORSO',
      },
      {
        type: 'light-active-probe',
        sourceEquipmentId: '1-cllightactiveprobe',
        sourceLocation: 'RIGHT_ARM',
      },
      {
        type: 'watchdog-cews',
        sourceEquipmentId: '1-clwatchdogcews',
        sourceLocation: 'CENTER_TORSO',
      },
      {
        type: 'nova-cews',
        sourceEquipmentId: 'nova-combined-electronic-warfare-system-cews',
        sourceLocation: 'HEAD',
      },
    ]);
  });

  it('hydrates BattleMech C3 equipment roles from mounted equipment and critical slots', () => {
    const c3Unit: IFullUnit = {
      id: 'synthetic-c3-equipment-hydration-test',
      chassis: 'Synthetic',
      variant: 'C3',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3050',
      unitType: 'BattleMech',
      equipment: [
        { id: 'c3-master', location: 'HEAD' },
        { id: '1-c3-slave', location: 'RIGHT_TORSO,_AMMO:10' },
        { id: 'ISC3BoostedSystemSlaveUnit', location: 'LEFT_TORSO' },
        { id: 'C3 Boosted System (Master)', location: 'CENTER_TORSO' },
        { id: 'Improved C3 Computer (C3I)', location: 'RIGHT_ARM' },
        { id: 'BattleArmorC3', location: 'BODY' },
        { id: 'ISBC3i', location: 'BODY' },
      ],
      criticalSlots: {
        LEFT_ARM: ['ISC3MasterUnit', 'IS C3i Computer'],
      },
    };

    const c3Equipment = hydrateC3EquipmentFromFullUnit(c3Unit);

    expect(c3Equipment).toEqual([
      {
        role: 'master',
        sourceEquipmentId: 'c3-master',
        sourceLocation: 'HEAD',
      },
      {
        role: 'slave',
        sourceEquipmentId: '1-c3-slave',
        sourceLocation: 'RIGHT_TORSO',
      },
      {
        role: 'slave',
        sourceEquipmentId: 'ISC3BoostedSystemSlaveUnit',
        sourceLocation: 'LEFT_TORSO',
        boosted: true,
      },
      {
        role: 'master',
        sourceEquipmentId: 'C3 Boosted System (Master)',
        sourceLocation: 'CENTER_TORSO',
        boosted: true,
      },
      {
        role: 'c3i',
        sourceEquipmentId: 'Improved C3 Computer (C3I)',
        sourceLocation: 'RIGHT_ARM',
      },
      {
        role: 'master',
        sourceEquipmentId: 'ISC3MasterUnit',
        sourceLocation: 'LEFT_ARM',
      },
      {
        role: 'c3i',
        sourceEquipmentId: 'IS C3i Computer',
        sourceLocation: 'LEFT_ARM',
      },
    ]);

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: c3Unit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.c3Equipment).toEqual(c3Equipment);
  });

  it('hydrates Boosted Comm Implant pilot ability as represented BattleMech C3i network-capable state', () => {
    const c3iImplantUnit: IFullUnit = {
      id: 'synthetic-boosted-comm-implant-hydration-test',
      chassis: 'Synthetic',
      variant: 'Boosted Comm',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3070',
      unitType: 'BattleMech',
      abilities: ['boost_comm_implant'],
    };

    expect(hydrateC3EquipmentFromFullUnit(c3iImplantUnit)).toEqual([
      {
        role: 'c3i',
        sourceEquipmentId: 'boost_comm_implant',
      },
    ]);

    const unitState = createHydratedUnitState({
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit: c3iImplantUnit,
      aiWeapons: [],
      gunnery: 4,
      piloting: 5,
    });

    expect(unitState.c3Equipment).toEqual([
      {
        role: 'c3i',
        sourceEquipmentId: 'boost_comm_implant',
      },
    ]);
  });

  it('does not hydrate Battle Armor C3 entries as BattleMech C3 equipment', () => {
    const battleArmorUnit: IFullUnit = {
      id: 'synthetic-battle-armor-c3-hydration-test',
      chassis: 'Synthetic',
      variant: 'BA C3',
      tonnage: 1,
      techBase: 'Inner Sphere',
      era: '3073',
      unitType: 'Battle Armor',
      equipment: [
        { id: 'BattleArmorC3', location: 'BODY' },
        { id: 'ISBC3i', location: 'BODY' },
      ],
      criticalSlots: {
        BODY: ['Battle Armor C3 (BC3)', 'Battle Armor Improved C3 (BC3I)'],
      },
    };

    expect(hydrateC3EquipmentFromFullUnit(battleArmorUnit)).toEqual([]);
  });

  it('hydrates represented initiative equipment into hydrated runner state', () => {
    const commandUnit: IFullUnit = {
      id: 'synthetic-command-console-hydration-test',
      chassis: 'Synthetic',
      variant: 'Command',
      tonnage: 100,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'BattleMech',
      cockpit: 'COMMAND_CONSOLE',
      commandConsoleCrewActive: true,
      equipment: [{ id: 'medium-laser', location: 'CENTER_TORSO' }],
      criticalSlots: {
        LEFT_TORSO: [
          'Communications Equipment (3 ton)',
          'Communications Equipment (3 ton)',
          'Communications Equipment (3 ton)',
        ],
      },
    } as unknown as IFullUnit;
    const expected = {
      workingCommunicationsTonnage: 3,
      communicationsMode: 'Default',
      cockpitType: 'Command Console',
      commandConsoleCrewActive: true,
      tonnage: 100,
      unitType: 'BattleMech',
    };

    expect(hydrateInitiativeEquipmentFromFullUnit(commandUnit)).toEqual(
      expected,
    );
    expect(
      createHydratedUnitState({
        runnerUnitId: 'player-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit: commandUnit,
        aiWeapons: hydrateAIWeaponsFromFullUnit(commandUnit, weaponLookup),
      }).initiativeEquipment,
    ).toEqual(expected);
  });

  it('hydrates mounted Targeting Computer equipment into combat state', () => {
    const unit: IFullUnit = {
      id: 'synthetic-targeting-computer-hydration-test',
      chassis: 'Synthetic',
      variant: 'TC',
      tonnage: 75,
      techBase: 'Inner Sphere',
      era: '3060',
      unitType: 'BattleMech',
      equipment: [{ id: 'targeting-computer', location: 'RIGHT_TORSO' }],
      criticalSlots: {
        RIGHT_TORSO: ['IS Targeting Computer'],
      },
    };

    expect(hydrateTargetingComputerEquipmentFromFullUnit(unit)).toBe(true);
    expect(
      createHydratedUnitState({
        runnerUnitId: 'player-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit: unit,
        aiWeapons: [],
      }).targetingComputerEquipment,
    ).toBe(true);
  });

  it('hydrates initiative equipment from official command-console BattleMech critical slots', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('kiso-k-3n-krhq-commandmech');

    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;
    expect(fullUnit.id).toBe('kiso-k-3n-krhq-commandmech');

    expect(hydrateInitiativeEquipmentFromFullUnit(fullUnit)).toMatchObject({
      workingCommunicationsTonnage: 3,
      communicationsMode: 'Default',
      cockpitType: 'Command Console',
      tonnage: 100,
      unitType: 'BattleMech',
    });
  });

  it('hydrates official communications equipment id tonnage shapes without inferring tank command consoles', async () => {
    const mobileHq: IFullUnit = {
      id: 'mobile-headquarters',
      chassis: 'Mobile Headquarters',
      variant: 'Standard',
      tonnage: 25,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'Vehicle',
      equipment: [
        { id: 'communications-equipment:size:7.0', location: 'BODY' },
      ],
    };
    const packratToc: IFullUnit = {
      id: 'packrat-lrpv-pkr-t5-toc',
      chassis: 'Packrat LRPV',
      variant: 'PKR-T5 (TOC)',
      tonnage: 20,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'Vehicle',
      equipment: [
        { id: 'communications-equipment-2-ton:omni', location: 'BODY' },
      ],
    };

    expect(mobileHq.id).toBe('mobile-headquarters');
    expect(packratToc.id).toBe('packrat-lrpv-pkr-t5-toc');
    expect(hydrateInitiativeEquipmentFromFullUnit(mobileHq)).toMatchObject({
      workingCommunicationsTonnage: 7,
      communicationsMode: 'Default',
      tonnage: 25,
      unitType: 'Vehicle',
    });
    expect(hydrateInitiativeEquipmentFromFullUnit(packratToc)).toMatchObject({
      workingCommunicationsTonnage: 2,
      communicationsMode: 'Default',
      tonnage: 20,
      unitType: 'Vehicle',
    });
    expect(
      hydrateInitiativeEquipmentFromFullUnit(packratToc)?.cockpitType,
    ).toBeUndefined();
  });

  it('hydrates official command-console producer ids without granting BattleMech cockpit eligibility', async () => {
    const tankCommandConsole: IFullUnit = {
      id: 'fury-command-tank-cx-17',
      chassis: 'Fury Command Tank',
      variant: 'CX-17',
      tonnage: 80,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'Vehicle',
      equipment: [{ id: 'istankcockpitcommandconsole', location: 'BODY' }],
    };
    const packratToc: IFullUnit = {
      id: 'packrat-lrpv-pkr-t5-toc',
      chassis: 'Packrat LRPV',
      variant: 'PKR-T5 (TOC)',
      tonnage: 20,
      techBase: 'Inner Sphere',
      era: '3025',
      unitType: 'Vehicle',
      equipment: [
        { id: 'communications-equipment-2-ton:omni', location: 'BODY' },
        { id: 'istankcockpitcommandconsole', location: 'BODY' },
      ],
    };
    const service = getNodeCanonicalUnitService();
    const remoteDroneCommandConsole = await service.getById('lament-lmt-2d');

    expect(tankCommandConsole.id).toBe('fury-command-tank-cx-17');
    expect(packratToc.id).toBe('packrat-lrpv-pkr-t5-toc');
    expect(remoteDroneCommandConsole).not.toBeNull();
    if (!remoteDroneCommandConsole) return;

    const furyInitiativeEquipment =
      hydrateInitiativeEquipmentFromFullUnit(tankCommandConsole);
    const packratInitiativeEquipment =
      hydrateInitiativeEquipmentFromFullUnit(packratToc);
    const remoteDroneInitiativeEquipment =
      hydrateInitiativeEquipmentFromFullUnit(remoteDroneCommandConsole);

    expect(furyInitiativeEquipment).toEqual({
      commandConsoleProducerEquipmentIds: ['istankcockpitcommandconsole'],
      tonnage: 80,
      unitType: 'Vehicle',
    });
    expect(packratInitiativeEquipment).toMatchObject({
      workingCommunicationsTonnage: 2,
      communicationsMode: 'Default',
      commandConsoleProducerEquipmentIds: ['istankcockpitcommandconsole'],
      tonnage: 20,
      unitType: 'Vehicle',
    });
    expect(remoteDroneInitiativeEquipment).toEqual({
      cockpitType: 'Standard',
      commandConsoleProducerEquipmentIds: ['ISRemoteDroneCommandConsole'],
      tonnage: 65,
      unitType: 'BattleMech',
    });
    expect(
      calculateCommandConsoleInitiativeBonus(furyInitiativeEquipment),
    ).toBe(0);
    expect(
      calculateCommandConsoleInitiativeBonus(packratInitiativeEquipment),
    ).toBe(0);
    expect(
      calculateCommandConsoleInitiativeBonus(remoteDroneInitiativeEquipment),
    ).toBe(0);
  });

  it('produces a fully-hydrated IUnitGameState with armor / structure / weapons all populated', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('atlas-as7-d');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const aiWeapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    const hydrated: IHydratedUnitData = {
      runnerUnitId: 'player-1',
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons,
      gunnery: 4,
      piloting: 5,
    };
    const unitState = createHydratedUnitState(hydrated);

    // Identity + spawn fields.
    expect(unitState.id).toBe('player-1');
    expect(unitState.side).toBe(GameSide.Player);
    expect(unitState.gunnery).toBe(4);
    expect(unitState.piloting).toBe(5);
    expect(unitState.heatSinks).toBe(ATLAS_CANONICAL_HEAT_SINKS);
    expect(unitState.heatSinkType).toBe('single');

    // Armor + structure end up on the IUnitGameState directly.
    const armorTotal = Object.values(unitState.armor).reduce(
      (a, b) => a + b,
      0,
    );
    expect(armorTotal).toBe(ATLAS_CANONICAL_TOTAL_ARMOR);
    expect(unitState.structure.center_torso).toBe(31);
    expect(unitState.armorTypeByLocation).toBeDefined();
    expect(Object.keys(unitState.armorTypeByLocation ?? {}).sort()).toEqual(
      Object.keys(unitState.armor).sort(),
    );
    expect(unitState.armorTypeByLocation?.head).toBe('STANDARD');
    expect(unitState.armorTypeByLocation?.center_torso_rear).toBe('STANDARD');

    // startingInternalStructure is seeded for the retreat-trigger ratio.
    expect(unitState.startingInternalStructure).toBeDefined();
    expect(unitState.startingInternalStructure?.center_torso).toBe(31);

    const wigeState = createHydratedUnitState({
      ...hydrated,
      fullUnit: {
        ...fullUnit,
        id: 'wige-motion-state-test',
        unitType: 'Vehicle',
        motionType: GroundMotionType.WIGE,
      },
    });
    expect(wigeState.unitType).toBe('Vehicle');
    expect(wigeState.motionType).toBe(GroundMotionType.WIGE);
  });
});

describe('UnitHydration — Locust LCT-1V (P1, task 1.4)', () => {
  it('hydrates Locust weapons: 1× ML + 2× MG (3 mounts total)', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('locust-lct-1v');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    expect(fullUnit.chassis).toBe('Locust');
    expect(fullUnit.tonnage).toBe(LOCUST_TONNAGE);

    const weapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    expect(weapons).toHaveLength(3);

    const idCounts = weapons.reduce<Record<string, number>>((acc, w) => {
      const baseId = w.id.replace(/-\d+$/, '');
      acc[baseId] = (acc[baseId] ?? 0) + 1;
      return acc;
    }, {});
    expect(idCounts['medium-laser']).toBe(1);
    expect(idCounts['machine-gun']).toBe(2);
  });

  it('hydrates Locust armor: total 64 across 11 locations', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('locust-lct-1v');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const { totalArmor, locationCount } = hydrateArmorFromFullUnit(fullUnit);
    expect(totalArmor).toBe(LOCUST_CANONICAL_TOTAL_ARMOR);
    expect(locationCount).toBe(11);
  });

  it('hydrates Locust internal structure: 20t profile', async () => {
    const service = getNodeCanonicalUnitService();
    const fullUnit = await service.getById('locust-lct-1v');
    expect(fullUnit).not.toBeNull();
    if (!fullUnit) return;

    const { structure } = hydrateStructureFromFullUnit(fullUnit);
    expect(structure.head).toBe(3);
    expect(structure.center_torso).toBe(6);
    expect(structure.left_torso).toBe(5);
    expect(structure.left_arm).toBe(3);
    expect(structure.left_leg).toBe(4);
  });
});

describe('UnitHydration — resolveCatalogDamage (numeric / missile-string parser)', () => {
  it('returns numeric damage as-is for non-string entries', () => {
    expect(resolveCatalogDamage(5, 'medium-laser')).toBe(5);
    expect(resolveCatalogDamage(20, 'ac-20')).toBe(20);
    expect(resolveCatalogDamage(2, 'machine-gun')).toBe(2);
  });

  it('parses "N/missile" damage strings, multiplying by missile count from id', () => {
    expect(resolveCatalogDamage('1/missile', 'lrm-20')).toBe(20);
    expect(resolveCatalogDamage('1/missile', 'lrm-15')).toBe(15);
    expect(resolveCatalogDamage('1/missile', 'lrm-10')).toBe(10);
    expect(resolveCatalogDamage('1/missile', 'lrm-5')).toBe(5);
    expect(resolveCatalogDamage('2/missile', 'srm-6')).toBe(12);
    expect(resolveCatalogDamage('2/missile', 'srm-4')).toBe(8);
    expect(resolveCatalogDamage('2/missile', 'srm-2')).toBe(4);
    expect(resolveCatalogDamage('1/missile', 'mrm-30')).toBe(30);
  });

  it('returns 0 for unparseable damage shapes (defensive fallback)', () => {
    expect(resolveCatalogDamage('???', 'whatever')).toBe(0);
    expect(resolveCatalogDamage('cluster-table', 'lb-x-ac-10')).toBe(0);
  });
});
