/**
 * Game session configuration and unit binding types
 * Extracted from GameSessionInterfaces.ts to keep focused type modules under the lint line cap.
 */

import type { EngineType } from '../construction/EngineType';
import type {
  VehicleLocation,
  VTOLLocation,
} from '../construction/UnitLocation';
import type { GroundMotionType } from '../unit/BaseUnitInterfaces';
import type { TurretType } from '../unit/VehicleInterfaces';
import type { IAmmoConstructionInit } from './AmmoTypes';
import type { IEnvironmentalConditions } from './EnvironmentalConditions';
import type { GameSide } from './GameSessionCoreTypes';
import type { MovementMotiveMode, RangeBracket } from './HexGridInterfaces';

// Game Configuration
// =============================================================================

/**
 * Game configuration.
 */
export interface IGameConfig {
  /** Map size (radius) */
  readonly mapRadius: number;
  /** Turn limit (0 = no limit) */
  readonly turnLimit: number;
  /** Victory conditions */
  readonly victoryConditions: readonly string[];
  /** Optional rules enabled */
  readonly optionalRules: readonly string[];
  /** Double-blind tactical visibility mode for multiplayer/fog-aware UIs. */
  readonly fogOfWar?: boolean;
  /** Environmental conditions (default: standard daylight, 1.0g, etc.) */
  readonly environmentalConditions?: IEnvironmentalConditions;
  /**
   * Per `wire-encounter-to-campaign-round-trip` Wave 5: encounter that
   * launched this session. Always populated when the session originated
   * from `EncounterService.launchEncounter`. Null/undefined for the
   * legacy quick-play / SimulationRunner flows that bypass that path.
   */
  readonly encounterId?: string | null;
  /**
   * Campaign this session belongs to. Populated for campaign-launched
   * encounters; null for standalone quick-play / handcrafted encounters.
   */
  readonly campaignId?: string | null;
  /**
   * Campaign contract this session resolves. Populated when the encounter
   * was generated from a contract. Null for standalone encounters.
   */
  readonly contractId?: string | null;
  /**
   * Scenario instance this session represents. Populated when scenario
   * generation produced the encounter. Null for handcrafted encounters.
   */
  readonly scenarioId?: string | null;
  /**
   * Per `add-combat-morale-and-withdrawal` (D5): the Forced Withdrawal
   * optional rule. When `true`, an end-of-phase check withdraws any
   * unit — player or bot — whose side `battleMorale` is `BROKEN` or
   * worse, or that is crippled (a vital-component critical, or more
   * than 50% internal-structure loss). Defaults to `false` (omitted),
   * preserving the current fight-to-destruction behavior.
   */
  readonly forcedWithdrawal?: boolean;
}

export interface IVehicleCriticalAvailabilityProfile {
  /**
   * Vehicle locations with represented target weapon mounts, including weapons
   * that are already unavailable for weapon-jam/destroyed critical entries.
   * Stabilizer criticals use this as mount-presence evidence.
   */
  readonly weaponLocations?: readonly (VehicleLocation | VTOLLocation)[];
  /** Count of represented target weapon mounts by vehicle location. */
  readonly weaponLocationCounts?: Partial<Record<string, number>>;
  /** Vehicle locations with represented weapons that can jam. */
  readonly jammableWeaponLocations?: readonly (
    | VehicleLocation
    | VTOLLocation
  )[];
  /** Count of represented target weapons that can jam by vehicle location. */
  readonly jammableWeaponLocationCounts?: Partial<Record<string, number>>;
  /** Vehicle locations with represented weapons that can be destroyed. */
  readonly destroyableWeaponLocations?: readonly (
    | VehicleLocation
    | VTOLLocation
  )[];
  /** Count of represented target weapons that can be destroyed by location. */
  readonly destroyableWeaponLocationCounts?: Partial<Record<string, number>>;
  /** True/false only when scenario construction can prove loaded cargo state. */
  readonly cargoLoaded?: boolean;
  /** Locations whose weapon stabilizer critical has already been represented. */
  readonly stabilizerHitLocations?: readonly (VehicleLocation | VTOLLocation)[];
}

/**
 * Unit participating in a game.
 */
export interface IGameUnit {
  /** Unit ID */
  readonly id: string;
  /** Unit name */
  readonly name: string;
  /** Which side this unit belongs to */
  readonly side: GameSide;
  /** Unit reference (ID from unit database) */
  readonly unitRef: string;
  /** Pilot reference (ID from pilot database, or inline statblock) */
  readonly pilotRef: string;
  /** Pilot skills */
  readonly gunnery: number;
  readonly piloting: number;
  /** Canonical Special Piloting Ability ids carried by this unit's pilot. */
  readonly pilotSpas?: readonly string[];
  /**
   * Rules-level chassis/squad motive mode copied from the adapted unit.
   * Physical projections use this to mirror MegaMek movement-mode gates
   * such as WiGE/hover charge eligibility instead of treating every
   * represented vehicle alike.
   */
  readonly movementMode?: MovementMotiveMode;
  /**
   * Represented construction gyro type. Movement and PSR projection use this
   * for variant-specific destroyed thresholds such as heavy-duty gyros.
   */
  readonly gyroType?: string;
  /**
   * Unit mass in tons, projected into combat state for source-backed rules
   * that compare unit load against terrain or equipment thresholds.
   */
  readonly tonnage?: number;
  /** Total heat sinks on unit (default: 10 if not provided) */
  readonly heatSinks?: number;
  /**
   * Per `wire-heat-generation-and-effects` task 4.2: heat-sink rating.
   * - `'single'` → 1 dissipation per sink (default when omitted)
   * - `'double'` → 2 dissipation per sink (IS or Clan DHS)
   *
   * Destroyed sinks in `IComponentDamageState.heatSinksDestroyed` are
   * also debited at this rating (a destroyed DHS loses 2 dissipation).
   */
  readonly heatSinkType?: 'single' | 'double';
  /**
   * Triple-strength myomer construction flag. When true, physical damage
   * helpers double effective weight once the unit reaches heat 9+.
   */
  readonly hasTSM?: boolean;
  /** MASC construction flag; active use is represented separately. */
  readonly hasMASC?: boolean;
  /** Supercharger construction flag; active use is represented separately. */
  readonly hasSupercharger?: boolean;
  /** MASC active for the current movement declaration. */
  readonly activeMASC?: boolean;
  /** Supercharger active for the current movement declaration. */
  readonly activeSupercharger?: boolean;
  /** Consecutive previous turns of MASC use, for source-backed failure TNs. */
  readonly mascTurnsUsed?: number;
  /** Consecutive previous turns of Supercharger use, for source-backed failure TNs. */
  readonly superchargerTurnsUsed?: number;
  /** Source-backed MASC failure-level decay marker copied into combat state. */
  readonly mascFailureLevelIncreasedLastTurn?: boolean;
  /** Source-backed Supercharger failure-level decay marker copied into combat state. */
  readonly superchargerFailureLevelIncreasedLastTurn?: boolean;
  /** Pilot SPA ids copied into combat state for modifier resolution. */
  readonly abilities?: readonly string[];
  /**
   * Source-backed RPG Toughness numeric crew value copied into combat state
   * for consciousness checks. Ability aliases named "toughness" do not imply
   * this value.
   */
  readonly pilotToughness?: number;
  /** SPA designation fields copied into combat state for to-hit resolution. */
  readonly designatedWeaponType?: string;
  readonly designatedWeaponCategory?: string;
  readonly designatedTargetId?: string;
  readonly designatedRangeBracket?: RangeBracket;
  /** Unit and weapon quirk ids copied into combat state for modifier resolution. */
  readonly unitQuirks?: readonly string[];
  readonly weaponQuirks?: Readonly<Record<string, readonly string[]>>;
  /**
   * Explicit source-backed per-unit HQ initiative bonus. MegaMek takes the
   * best HQ/quirk bonus across the force rather than stacking them.
   */
  readonly initiativeHQBonus?: number;
  /**
   * Explicit source-backed command initiative bonus, such as a qualifying
   * cockpit command console or active tech officer. This stacks with the
   * best HQ/quirk force bonus.
   */
  readonly initiativeCommandBonus?: number;
  /**
   * Mounted weapon location by runtime weapon id. Optional so legacy setup
   * paths keep working; hydrated runners and adapters populate it for physical
   * arm-fired legality checks.
   */
  readonly weaponLocationById?: Readonly<Record<string, string>>;
  /**
   * Ammo bin construction data (one entry per ton of ammo carried).
   * When present, `createGameSession` seeds this unit's `ammoState` so
   * the attack resolver can consume bins per fire. When absent, the
   * unit has zero ammo bins; any ammo-consuming weapon fire will emit
   * `AttackInvalid { reason: 'OutOfAmmo' }`. Producers (e.g.,
   * `InteractiveSession`) populate this from catalog / construction
   * data per `wire-ammo-consumption`.
   */
  readonly ammoConstruction?: readonly IAmmoConstructionInit[];
  /**
   * Optional per-location armor type projected into combat state. Producers
   * may supply a single uniform armor type across all locations or a richer
   * per-location map; missing keys behave as standard armor.
   */
  readonly armorTypeByLocation?: Readonly<Record<string, string>>;
  /**
   * Per-location ammo explosion containment projected from construction data
   * into interactive game sessions. Missing keys mean no CASE protection.
   */
  readonly caseProtection?: Readonly<Record<string, 'case' | 'case_ii'>>;
  /**
   * Construction-side `UnitType` (BattleMech / Aerospace / Infantry / Battle
   * Armor / ProtoMech / Vehicle / etc.). Per `wire-combat-behavior-dispatch`
   * (Council #1 PR7), `createInitialUnitState` branches on this value to
   * seed `IUnitGameState.combatState` via the matching per-type factory.
   *
   * Optional for backward compatibility: legacy callers (existing fixtures,
   * tests, lobby builders that haven't been updated) leave it `undefined`,
   * which behaves exactly like the prior mech-only path (no `combatState`
   * envelope, mech tokens render). New callers wiring aerospace / proto /
   * infantry / BA units MUST set both `unitType` AND the matching per-type
   * construction inputs below — the init-time assertion will throw otherwise.
   */
  readonly unitType?: import('@/types/unit/BattleMechInterfaces').UnitType;
  /**
   * Optional construction movement/motion mode copied into combat state for
   * targetability branches that need VTOL/WIGE-like airborne behavior without
   * widening top-level UnitType.
   */
  readonly motionType?: string;
  /**
   * Optional BattleMech chassis posture copied into combat state for physical
   * legality gates. Undefined preserves legacy synthetic biped fixtures.
   */
  readonly isQuad?: boolean;
  /**
   * Optional arm-posture state copied into combat state. Explicit true blocks
   * source-backed push declarations with rear-flipped arms.
   */
  readonly armsFlipped?: boolean;
  /**
   * Optional transport/passenger state copied into combat state. Explicit true
   * blocks source-backed physical target declarations against this unit.
   */
  readonly isPassenger?: boolean;
  /**
   * Optional swarm-attack state copied into combat state. Explicit true blocks
   * source-backed physical target declarations against this unit.
   */
  readonly isSwarming?: boolean;
  /**
   * Optional death-from-above attack state copied into combat state. Explicit
   * true blocks source-backed physical target declarations against this unit.
   */
  readonly isMakingDFA?: boolean;
  /**
   * Optional displacement attack state copied into combat state. Explicit true
   * blocks source-backed charge/DFA target declarations against this unit.
   */
  readonly isMakingDisplacementAttack?: boolean;
  /**
   * Optional push lifecycle state copied into combat state. Push declarations
   * use this plus `displacementAttackTargetId` to distinguish counter-pushes.
   */
  readonly isPushing?: boolean;
  /**
   * Optional target id of this unit's active displacement attack. Push legality
   * allows counter-pushes only when this id points at the new attacker.
   */
  readonly displacementAttackTargetId?: string;
  /**
   * Optional attacker id whose charge/DFA/push displacement currently targets
   * this unit. Charge/DFA reject when another attacker already owns it.
   */
  readonly targetedByDisplacementAttackerId?: string;
  /**
   * Optional airborne state copied into combat state. Explicit true blocks
   * source-backed physical target declarations against this unit.
   */
  readonly isAirborne?: boolean;
  /**
   * Optional building occupancy identifier copied into combat state. Explicit
   * ids allow source-backed physical target declarations only from the same
   * building.
   */
  readonly occupiedBuildingId?: string;
  /**
   * Optional evasion state copied into combat state. Explicit true blocks
   * source-backed physical attack declarations by this unit.
   */
  readonly isEvading?: boolean;
  /**
   * Optional source-backed target evasion to-hit bonus copied into combat
   * state. Undefined keeps the normal +1 for explicit evading targets.
   */
  readonly evasionBonus?: number;
  /**
   * Optional current-turn sprint state copied into combat state. Declared
   * TacOps Sprint sets this state for target-sprinted to-hit relief and
   * sprinting-attacker invalidation.
   */
  readonly sprintedThisTurn?: boolean;
  /**
   * Optional end-of-turn cargo interaction state copied into combat state.
   * Explicit true blocks source-backed physical attack declarations by this
   * unit while it is loading or unloading cargo.
   */
  readonly isLoadingOrUnloadingCargo?: boolean;
  /**
   * Optional board identity copied into combat state. When both attacker and
   * target provide explicit ids, source-backed physical declarations require
   * them to match.
   */
  readonly boardId?: string;
  /**
   * Per-type construction inputs consumed by `createInitialUnitState` to
   * build `combatState` via `create{Type}CombatState` factories. Each block
   * is OPTIONAL at the type level so the legacy mech-only call path stays
   * compile-clean; the init-time assertion enforces presence at runtime
   * when `unitType` is one of the four supported per-type discriminants.
   */
  readonly aerospaceInit?: {
    readonly maxSI: number;
    readonly armorByArc: import('@/utils/gameplay/aerospace/state').IAerospaceArcArmor;
    readonly heatSinks: number;
    readonly fuelPoints: number;
    readonly safeThrust: number;
    readonly maxThrust: number;
    /** Initial altitude band; defaults to `1` (airborne) when omitted. */
    readonly altitude?: number;
    /** Velocity entering the first turn; defaults to 0. */
    readonly currentVelocity?: number;
    /** Velocity after initial thrust planning; defaults to currentVelocity. */
    readonly nextVelocity?: number;
    /** Initial aerospace lifecycle state; defaults from altitude. */
    readonly airborneState?: import('@/utils/gameplay/aerospace/state').AerospaceAirborneState;
    /** Dogfight opponent if the scenario starts mid-engagement. */
    readonly dogfightWith?: string;
  };
  readonly infantryInit?: import('@/types/unit/PersonnelInterfaces').IInfantry;
  readonly protoMechInit?: {
    readonly chassisType: import('@/types/unit/ProtoMechInterfaces').ProtoChassis;
    readonly hasMainGun: boolean;
    readonly armorByLocation: import('@/utils/gameplay/protomech/state').ProtoLocationSlotMap;
    readonly structureByLocation: import('@/utils/gameplay/protomech/state').ProtoLocationSlotMap;
    readonly altitude?: number;
  };
  readonly battleArmorInit?: {
    readonly squadSize: number;
    readonly armorPointsPerTrooper: number;
    readonly stealthKind?: import('./BattleArmorCombatInterfaces').BattleArmorStealthKind;
    readonly hasMagneticClamp?: boolean;
    readonly hasVibroClaws?: boolean;
    readonly vibroClawCount?: number;
  };
  readonly vehicleInit?: {
    readonly motionType: GroundMotionType;
    readonly turretType?: TurretType;
    readonly engineType?: EngineType | string | number;
    readonly originalCruiseMP: number;
    readonly armor: Partial<Record<VehicleLocation | VTOLLocation, number>>;
    readonly structure: Partial<Record<VehicleLocation | VTOLLocation, number>>;
    readonly altitude?: number;
    readonly criticalAvailability?: IVehicleCriticalAvailabilityProfile;
  };
}

// `IAmmoConstructionInit` is imported at the top of this module (so
// `IGameUnit.ammoConstruction` can reference it) AND re-exported here so
// existing `import { IAmmoConstructionInit } from '@/types/gameplay/...'`
// call-sites keep working after the PR6 collapse. Source-of-truth lives in
// `./AmmoTypes` (also exposed via `@/types/gameplay/AmmoTypes`).
export type { IAmmoConstructionInit };
