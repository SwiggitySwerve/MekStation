/**
 * createInitialUnitState — combatState seeding tests
 *
 * Per `wire-combat-behavior-dispatch` (Council #1 PR7) tasks §3.1 / §3.2 and
 * `game-state-management` delta spec (Combat-State Seeding at Initialization
 * + Discriminated Initialization Assertion). Verifies:
 *   - Each of the four per-type discriminants seeds the matching `combatState`
 *     envelope using the real factory (no mocks).
 *   - Mech / vehicle / capital paths leave `combatState === undefined`.
 *   - Missing required fields throw an Error whose message names the unit id
 *     and the missing field(s).
 */

import type { IInfantry } from '@/types/unit/PersonnelInterfaces';

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import {
  Facing,
  GameSide,
  type IGameUnit,
  type IUnitGameState,
} from '@/types/gameplay';
import {
  GroundMotionType,
  SquadMotionType,
} from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { createInitialUnitState } from '../initialization';

// =============================================================================
// Fixtures
// =============================================================================

const POSITION = { q: 0, r: 0 } as const;

function baseGameUnit(overrides: Partial<IGameUnit> = {}): IGameUnit {
  return {
    id: 'unit-1',
    name: 'Test Unit',
    side: GameSide.Player,
    unitRef: 'test-ref',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

function vehicleArmor(
  values: Record<string, number>,
): Partial<Record<VehicleLocation | VTOLLocation, number>> {
  return values as Partial<Record<VehicleLocation | VTOLLocation, number>>;
}

/** Minimal `IInfantry` shape sufficient for `createInfantryCombatStateFromUnit`. */
function makeInfantryUnit(): IInfantry {
  // The factory only reads `platoonStrength`, `armorKit`, `hasAntiMechTraining`,
  // and the first `fieldGuns[0]`. The rest of `IInfantry` is filled in with
  // sensible defaults to satisfy the type without exercising the calculator.
  return {
    unitType: UnitType.INFANTRY,
    tonnage: 3,
    weightClass: 'Light',
    metadata: {
      chassis: 'Test Platoon',
      model: 'TST-1',
      era: 'Succession Wars',
      year: 3025,
      rulesLevel: 'Standard',
    },
    totalWeight: 3,
    remainingTonnage: 0,
    isValid: true,
    validationErrors: [],
    techBase: 'IS',
    introductionYear: 3025,
    extinctionYear: 0,
    cBills: 0,
    bv: 0,
    crew: 28,
    squadSize: 7,
    numberOfSquads: 4,
    platoonStrength: 28,
    motionType: SquadMotionType.FOOT,
    primaryWeapon: 'SRM Launcher',
    secondaryWeaponCount: 0,
    armorKit: InfantryArmorKit.STANDARD,
    specialization: InfantrySpecialization.NONE,
    fieldGuns: [],
    hasAntiMechTraining: true,
    isAugmented: false,
    canSwarm: true,
    canLegAttack: true,
  } as unknown as IInfantry;
}

const SAMPLE_AERO_INIT = {
  maxSI: 8,
  armorByArc: { nose: 20, leftWing: 15, rightWing: 15, aft: 10 },
  heatSinks: 12,
  fuelPoints: 400,
  safeThrust: 5,
  maxThrust: 8,
} as const;

const SAMPLE_PROTO_INIT = {
  chassisType: ProtoChassis.BIPED,
  hasMainGun: true,
  armorByLocation: {
    [ProtoLocation.HEAD]: 2,
    [ProtoLocation.TORSO]: 6,
    [ProtoLocation.LEFT_ARM]: 2,
    [ProtoLocation.RIGHT_ARM]: 2,
    [ProtoLocation.LEGS]: 4,
    [ProtoLocation.MAIN_GUN]: 2,
  },
  structureByLocation: {
    [ProtoLocation.HEAD]: 1,
    [ProtoLocation.TORSO]: 5,
    [ProtoLocation.LEFT_ARM]: 1,
    [ProtoLocation.RIGHT_ARM]: 1,
    [ProtoLocation.LEGS]: 3,
    [ProtoLocation.MAIN_GUN]: 1,
  },
} as const;

const SAMPLE_BA_INIT = {
  squadSize: 5,
  armorPointsPerTrooper: 8,
} as const;

// =============================================================================
// Mech / Vehicle / Legacy paths
// =============================================================================

describe('createInitialUnitState — mech / vehicle / legacy', () => {
  it('leaves combatState undefined when unitType is omitted', () => {
    const unit = baseGameUnit();
    const state = createInitialUnitState(unit, POSITION, Facing.North);
    expect(state.combatState).toBeUndefined();
  });

  it('leaves combatState undefined for BATTLEMECH', () => {
    const unit = baseGameUnit({ unitType: UnitType.BATTLEMECH });
    const state = createInitialUnitState(unit, POSITION, Facing.North);
    expect(state.combatState).toBeUndefined();
  });

  it('throws when VEHICLE is missing vehicleInit', () => {
    const unit = baseGameUnit({
      id: 'vehicle-missing',
      unitType: UnitType.VEHICLE,
    });
    expect(() => createInitialUnitState(unit, POSITION, Facing.North)).toThrow(
      /vehicle-missing.*vehicleInit/i,
    );
  });

  it("seeds combatState with kind='vehicle' for represented vehicles", () => {
    const unit = baseGameUnit({
      id: 'vehicle-1',
      unitType: UnitType.VEHICLE,
      vehicleInit: {
        motionType: GroundMotionType.TRACKED,
        turretType: TurretType.SINGLE,
        originalCruiseMP: 4,
        armor: vehicleArmor({
          [VehicleLocation.FRONT]: 24,
          [VehicleLocation.TURRET]: 12,
        }),
        structure: vehicleArmor({
          [VehicleLocation.FRONT]: 12,
          [VehicleLocation.TURRET]: 6,
        }),
      },
    });
    const state = createInitialUnitState(unit, POSITION, Facing.North);

    expect(state.combatState?.kind).toBe('vehicle');
    if (state.combatState?.kind === 'vehicle') {
      expect(state.combatState.state.motionType).toBe(GroundMotionType.TRACKED);
      expect(state.combatState.state.motive.originalCruiseMP).toBe(4);
      expect(
        (state.combatState.state.armor as Record<string, number>)[
          VehicleLocation.FRONT
        ],
      ).toBe(24);
      expect(state.combatState.state.turretType).toBe(TurretType.SINGLE);
    }
  });

  it('seeds VTOL vehicle state with altitude', () => {
    const unit = baseGameUnit({
      id: 'vtol-1',
      unitType: UnitType.VTOL,
      vehicleInit: {
        motionType: GroundMotionType.VTOL,
        turretType: TurretType.CHIN,
        originalCruiseMP: 6,
        altitude: 3,
        armor: vehicleArmor({
          [VTOLLocation.FRONT]: 18,
          [VTOLLocation.ROTOR]: 2,
        }),
        structure: vehicleArmor({
          [VTOLLocation.FRONT]: 9,
          [VTOLLocation.ROTOR]: 1,
        }),
      },
    });
    const state = createInitialUnitState(unit, POSITION, Facing.North);

    expect(state.combatState?.kind).toBe('vehicle');
    if (state.combatState?.kind === 'vehicle') {
      expect(state.combatState.state.motionType).toBe(GroundMotionType.VTOL);
      expect(state.combatState.state.altitude).toBe(3);
      expect(
        (state.combatState.state.armor as Record<string, number>)[
          VTOLLocation.ROTOR
        ],
      ).toBe(2);
    }
  });
});

// =============================================================================
// Aerospace path
// =============================================================================

describe('createInitialUnitState — aerospace seeding', () => {
  function buildAeroUnit(altitude?: number): IGameUnit {
    return baseGameUnit({
      id: 'aero-1',
      unitType: UnitType.AEROSPACE,
      aerospaceInit: { ...SAMPLE_AERO_INIT, altitude },
    });
  }

  it("seeds combatState with kind='aero' for AEROSPACE", () => {
    const state = createInitialUnitState(buildAeroUnit(), POSITION);
    expect(state.combatState?.kind).toBe('aero');
  });

  it.each([
    UnitType.AEROSPACE,
    UnitType.CONVENTIONAL_FIGHTER,
    UnitType.SMALL_CRAFT,
  ])('seeds aero envelope for unitType=%s', (unitType) => {
    const unit = baseGameUnit({
      id: `${unitType}-unit`,
      unitType,
      aerospaceInit: SAMPLE_AERO_INIT,
    });
    const state = createInitialUnitState(unit, POSITION);
    expect(state.combatState?.kind).toBe('aero');
    if (state.combatState?.kind === 'aero') {
      expect(state.combatState.state.maxSI).toBe(SAMPLE_AERO_INIT.maxSI);
      expect(state.combatState.state.armorByArc.nose).toBe(20);
    }
  });

  it('defaults altitude to 1 (airborne) when omitted', () => {
    const state = createInitialUnitState(buildAeroUnit(), POSITION);
    if (state.combatState?.kind === 'aero') {
      expect(state.combatState.state.altitude).toBe(1);
    } else {
      throw new Error('expected aero combatState');
    }
  });

  it('honours explicit altitude=0 (landed)', () => {
    const state = createInitialUnitState(buildAeroUnit(0), POSITION);
    if (state.combatState?.kind === 'aero') {
      expect(state.combatState.state.altitude).toBe(0);
      expect(state.combatState.state.currentVelocity).toBe(0);
      expect(state.combatState.state.nextVelocity).toBe(0);
      expect(state.combatState.state.airborneState).toBe('grounded');
    } else {
      throw new Error('expected aero combatState');
    }
  });

  it('honours explicit aerospace velocity fields', () => {
    const unit = baseGameUnit({
      id: 'aero-velocity',
      unitType: UnitType.AEROSPACE,
      aerospaceInit: {
        ...SAMPLE_AERO_INIT,
        altitude: 4,
        currentVelocity: 7,
        nextVelocity: 8,
        airborneState: 'airborne',
        dogfightWith: 'bandit-1',
      },
    });
    const state = createInitialUnitState(unit, POSITION);
    if (state.combatState?.kind === 'aero') {
      expect(state.combatState.state).toMatchObject({
        altitude: 4,
        currentVelocity: 7,
        nextVelocity: 8,
        airborneState: 'airborne',
        dogfightWith: 'bandit-1',
      });
    } else {
      throw new Error('expected aero combatState');
    }
  });

  it('throws when aerospaceInit block is missing entirely', () => {
    const unit = baseGameUnit({ id: 'aero-2', unitType: UnitType.AEROSPACE });
    expect(() => createInitialUnitState(unit, POSITION)).toThrow(
      /aero-2.*aerospaceInit/i,
    );
  });

  it('throws when a required aerospaceInit field is missing', () => {
    const unit = baseGameUnit({
      id: 'aero-3',
      unitType: UnitType.AEROSPACE,
      // Cast is necessary because the missing-field is the test's whole point.
      aerospaceInit: {
        ...SAMPLE_AERO_INIT,
        maxSI: undefined as unknown as number,
      },
    });
    expect(() => createInitialUnitState(unit, POSITION)).toThrow(
      /aero-3.*aerospaceInit\.maxSI/i,
    );
  });
});

// =============================================================================
// Infantry path
// =============================================================================

describe('createInitialUnitState — infantry seeding', () => {
  it("seeds combatState with kind='platoon' for INFANTRY", () => {
    const unit = baseGameUnit({
      id: 'inf-1',
      unitType: UnitType.INFANTRY,
      infantryInit: makeInfantryUnit(),
    });
    const state = createInitialUnitState(unit, POSITION);
    expect(state.combatState?.kind).toBe('platoon');
    if (state.combatState?.kind === 'platoon') {
      expect(state.combatState.state.startingTroopers).toBe(28);
      expect(state.combatState.state.survivingTroopers).toBe(28);
      expect(state.combatState.state.hasAntiMechTraining).toBe(true);
    }
  });

  it('throws when infantryInit is missing for INFANTRY', () => {
    const unit = baseGameUnit({ id: 'inf-2', unitType: UnitType.INFANTRY });
    expect(() => createInitialUnitState(unit, POSITION)).toThrow(
      /inf-2.*infantryInit/i,
    );
  });
});

// =============================================================================
// ProtoMech path
// =============================================================================

describe('createInitialUnitState — protomech seeding', () => {
  it("seeds combatState with kind='proto' for PROTOMECH", () => {
    const unit = baseGameUnit({
      id: 'proto-1',
      unitType: UnitType.PROTOMECH,
      protoMechInit: SAMPLE_PROTO_INIT,
    });
    const state = createInitialUnitState(unit, POSITION);
    expect(state.combatState?.kind).toBe('proto');
    if (state.combatState?.kind === 'proto') {
      expect(state.combatState.state.chassisType).toBe(ProtoChassis.BIPED);
      expect(state.combatState.state.hasMainGun).toBe(true);
      expect(state.combatState.state.armorByLocation[ProtoLocation.TORSO]).toBe(
        6,
      );
    }
  });

  it("seeds altitude=0 for GLIDER chassis when caller doesn't pass altitude", () => {
    const unit = baseGameUnit({
      id: 'proto-glider',
      unitType: UnitType.PROTOMECH,
      protoMechInit: { ...SAMPLE_PROTO_INIT, chassisType: ProtoChassis.GLIDER },
    });
    const state = createInitialUnitState(unit, POSITION);
    if (state.combatState?.kind === 'proto') {
      expect(state.combatState.state.altitude).toBe(0);
    } else {
      throw new Error('expected proto combatState');
    }
  });

  it("Quad chassis still seeds with kind='proto'", () => {
    const unit = baseGameUnit({
      id: 'proto-quad',
      unitType: UnitType.PROTOMECH,
      protoMechInit: { ...SAMPLE_PROTO_INIT, chassisType: ProtoChassis.QUAD },
    });
    const state = createInitialUnitState(unit, POSITION);
    expect(state.combatState?.kind).toBe('proto');
  });

  it('throws when protoMechInit block is missing', () => {
    const unit = baseGameUnit({
      id: 'proto-2',
      unitType: UnitType.PROTOMECH,
    });
    expect(() => createInitialUnitState(unit, POSITION)).toThrow(
      /proto-2.*protoMechInit/i,
    );
  });

  it('throws when a required protoMechInit field is missing', () => {
    const unit = baseGameUnit({
      id: 'proto-3',
      unitType: UnitType.PROTOMECH,
      protoMechInit: {
        ...SAMPLE_PROTO_INIT,
        hasMainGun: undefined as unknown as boolean,
      },
    });
    expect(() => createInitialUnitState(unit, POSITION)).toThrow(
      /proto-3.*protoMechInit\.hasMainGun/i,
    );
  });
});

// =============================================================================
// Battle Armor path
// =============================================================================

describe('createInitialUnitState — battle armor seeding', () => {
  it("seeds combatState with kind='squad' for BATTLE_ARMOR", () => {
    const unit = baseGameUnit({
      id: 'ba-1',
      unitType: UnitType.BATTLE_ARMOR,
      battleArmorInit: SAMPLE_BA_INIT,
    });
    const state = createInitialUnitState(unit, POSITION);
    expect(state.combatState?.kind).toBe('squad');
    if (state.combatState?.kind === 'squad') {
      expect(state.combatState.state.squadSize).toBe(5);
      expect(state.combatState.state.troopers).toHaveLength(5);
      // All troopers alive at battle start.
      expect(
        state.combatState.state.troopers.every(
          (t: { alive: boolean }) => t.alive,
        ),
      ).toBe(true);
    }
  });

  it('throws when battleArmorInit block is missing', () => {
    const unit = baseGameUnit({
      id: 'ba-2',
      unitType: UnitType.BATTLE_ARMOR,
    });
    expect(() => createInitialUnitState(unit, POSITION)).toThrow(
      /ba-2.*battleArmorInit/i,
    );
  });

  it('throws when armorPointsPerTrooper is missing', () => {
    const unit = baseGameUnit({
      id: 'ba-3',
      unitType: UnitType.BATTLE_ARMOR,
      battleArmorInit: {
        squadSize: 4,
        armorPointsPerTrooper: undefined as unknown as number,
      },
    });
    expect(() => createInitialUnitState(unit, POSITION)).toThrow(
      /ba-3.*armorPointsPerTrooper/i,
    );
  });
});

// =============================================================================
// Type narrowing — IUnitGameState shape
// =============================================================================

describe('IUnitGameState combatState shape', () => {
  it("narrows on combatState.kind === 'platoon' for downstream consumers", () => {
    const unit = baseGameUnit({
      id: 'inf-narrow',
      unitType: UnitType.INFANTRY,
      infantryInit: makeInfantryUnit(),
    });
    const state: IUnitGameState = createInitialUnitState(unit, POSITION);
    if (state.combatState?.kind === 'platoon') {
      // TypeScript should narrow `state` to the IInfantryCombatState branch.
      const survivingTroopers: number =
        state.combatState.state.survivingTroopers;
      expect(survivingTroopers).toBe(28);
    } else {
      throw new Error('expected platoon combatState');
    }
  });
});
