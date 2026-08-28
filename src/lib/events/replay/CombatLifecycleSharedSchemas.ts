/**
 * Shared nested schemas for the combat lifecycle baseline pack
 * (replay-safety PR 4).
 *
 * Strict concrete v1 mirrors of the nested shapes `IGameCreatedPayload`
 * embeds: `IGameConfig`, `IGameUnit` (with its five per-type construction
 * init blocks), `IHexTerrain`, `IC3NetworkState`, `IEncounterMeta`,
 * `IObjectiveMarker`, `IRepresentedGroundObjectState`, and
 * `IRepresentedMinefieldState`. Every object is `.strict()` — no
 * passthrough, no unconstrained records (concrete key/value maps use
 * typed values per the change law).
 *
 * Runtime imports are confined to `zod` and pure `@/types` enum modules;
 * string-literal unions from `@/utils` sources are re-declared as exact
 * `z.enum` literals (alignment held by the pack contract test and the
 * PR-4 independent schema review), so validating a payload needs no
 * catalog, clock, or RNG access (task 4.3).
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import { z } from 'zod';

import { EngineType } from '@/types/construction/EngineType';
import { ActuatorType } from '@/types/construction/MechConfigTypes';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { GamePhase, GameSide } from '@/types/gameplay/GameSessionCoreTypes';
import { RangeBracket } from '@/types/gameplay/HexGridInterfaces';
import { TerrainType } from '@/types/gameplay/TerrainTypeDefinitions';
import { Era } from '@/types/temporal/Era';
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

// =============================================================================
// Scalars and small shared shapes
// =============================================================================

const finiteNumber = z.number().finite();
const finiteInt = z.number().int().finite();

export const hexCoordinateSchema = z
  .object({ q: finiteNumber, r: finiteNumber })
  .strict();

// =============================================================================
// Terrain (IHexTerrain / ITerrainFeature)
// =============================================================================

const terrainFeatureSchema = z
  .object({
    type: z.nativeEnum(TerrainType),
    level: finiteNumber,
    constructionFactor: finiteNumber.optional(),
    buildingId: z.string().optional(),
    fuelTankElevation: finiteNumber.optional(),
    fuelTankId: z.string().optional(),
    isOnFire: z.boolean().optional(),
    isFrozen: z.boolean().optional(),
    cliffTopExits: z.array(finiteInt).optional(),
  })
  .strict();

export const hexTerrainSchema = z
  .object({
    coordinate: hexCoordinateSchema,
    elevation: finiteNumber,
    features: z.array(terrainFeatureSchema),
  })
  .strict();

// =============================================================================
// Environmental conditions (IEnvironmentalConditions)
// =============================================================================

export const environmentalConditionsSchema = z
  .object({
    light: z.enum([
      'daylight',
      'dawn',
      'dusk',
      'night',
      'full_moon',
      'glare',
      'moonless',
      'solar_flare',
      'pitch_black',
    ]),
    precipitation: z.enum(['none', 'light_rain', 'heavy_rain', 'snow']),
    fog: z.enum(['none', 'light_fog', 'heavy_fog']),
    blowingSand: z.boolean(),
    wind: z.enum(['none', 'moderate', 'strong']),
    gravity: finiteNumber,
    atmosphere: z.enum(['standard', 'thin', 'trace', 'vacuum']),
    temperature: z.enum(['extreme_cold', 'normal', 'extreme_heat']),
  })
  .strict();

// =============================================================================
// Encounter snapshot (IEncounterMeta)
// =============================================================================

export const encounterMetaSchema = z
  .object({
    encounterId: z.string(),
    encounterName: z.string(),
    templateType: z.string().nullable(),
    playerForceSummary: z.string(),
    opponentSummary: z.string(),
  })
  .strict();

// =============================================================================
// C3 (IC3NetworkState / IC3EquipmentMountState)
// =============================================================================

const c3UnitRoleSchema = z.enum(['master', 'slave', 'c3i', 'nova']);

export const c3EquipmentMountStateSchema = z
  .object({
    role: c3UnitRoleSchema,
    sourceEquipmentId: z.string(),
    sourceLocation: z.string().optional(),
    boosted: z.boolean().optional(),
  })
  .strict();

const c3NetworkUnitSchema = z
  .object({
    entityId: z.string(),
    teamId: z.string(),
    role: c3UnitRoleSchema,
    position: hexCoordinateSchema,
    operational: z.boolean(),
    ecmDisrupted: z.boolean(),
  })
  .strict();

const c3NetworkSchema = z
  .object({
    networkId: z.string(),
    type: z.enum(['master-slave', 'improved', 'nova']),
    teamId: z.string(),
    members: z.array(c3NetworkUnitSchema),
  })
  .strict();

export const c3NetworkStateSchema = z
  .object({ networks: z.array(c3NetworkSchema) })
  .strict();

// =============================================================================
// Objectives (IObjectiveMarker)
// =============================================================================

export const objectiveMarkerSchema = z
  .object({
    id: z.string(),
    hexKey: z.string(),
    objectiveType: z.enum(['capture', 'defend', 'breakthrough']),
    owningSide: z.enum(['player', 'opponent', 'neutral']),
    controlSide: z.enum(['player', 'opponent', 'neutral']),
    controlRule: z.enum(['sole-occupancy']),
    holdTurnsRequired: finiteInt,
    holdProgress: finiteInt,
  })
  .strict();

// =============================================================================
// Ground objects and minefields
// =============================================================================

export const representedGroundObjectStateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    tonnage: finiteNumber,
    position: hexCoordinateSchema.optional(),
    carryLocation: z.enum(['leftArm', 'rightArm', 'both']).optional(),
    carriedByUnitId: z.string().optional(),
    destroyed: z.boolean().optional(),
    invulnerable: z.boolean().optional(),
  })
  .strict();

export const representedMinefieldStateSchema = z
  .object({
    type: z
      .enum([
        'conventional',
        'command-detonated',
        'vibrabomb',
        'active',
        'emp',
        'inferno',
      ])
      .optional(),
    damagePerLeg: finiteNumber,
    density: finiteNumber.optional(),
    setting: finiteNumber.optional(),
    detonated: z.boolean().optional(),
    hidden: z.boolean().optional(),
    revealed: z.boolean().optional(),
    detectedBySides: z.array(z.nativeEnum(GameSide)).optional(),
    source: z.enum(['scenario', 'event', 'test']).optional(),
  })
  .strict();

// =============================================================================
// Game config (IGameConfig)
// =============================================================================

export const gameConfigSchema = z
  .object({
    mapRadius: finiteNumber,
    turnLimit: finiteNumber,
    victoryConditions: z.array(z.string()),
    optionalRules: z.array(z.string()),
    fogOfWar: z.boolean().optional(),
    environmentalConditions: environmentalConditionsSchema.optional(),
    encounterId: z.string().nullable().optional(),
    campaignId: z.string().nullable().optional(),
    contractId: z.string().nullable().optional(),
    scenarioId: z.string().nullable().optional(),
    forcedWithdrawal: z.boolean().optional(),
    seed: finiteNumber.nullable().optional(),
  })
  .strict();

// =============================================================================
// Unit nested blocks
// =============================================================================

const initiativeEquipmentProfileSchema = z
  .object({
    workingCommunicationsTonnage: finiteNumber.optional(),
    communicationsMode: z.string().optional(),
    cockpitType: z.string().optional(),
    commandConsoleProducerEquipmentIds: z.array(z.string()).optional(),
    commandConsoleCrewActive: z.boolean().optional(),
    tonnage: finiteNumber.optional(),
    weightClass: z.string().optional(),
    unitType: z.string().optional(),
    hasAdvancedFireControl: z.boolean().optional(),
  })
  .strict();

const ammoConstructionInitSchema = z
  .object({
    binId: z.string(),
    weaponType: z.string(),
    location: z.string(),
    maxRounds: finiteNumber,
    damagePerRound: finiteNumber,
    isExplosive: z.boolean(),
  })
  .strict();

const criticalSlotEntrySchema = z
  .object({
    slotIndex: finiteInt,
    componentType: z.enum([
      'engine',
      'gyro',
      'cockpit',
      'sensor',
      'life_support',
      'actuator',
      'weapon',
      'ammo',
      'heat_sink',
      'jump_jet',
      'equipment',
    ]),
    componentName: z.string(),
    destroyed: z.boolean(),
    missing: z.boolean().optional(),
    breached: z.boolean().optional(),
    actuatorType: z.nativeEnum(ActuatorType).optional(),
    weaponId: z.string().optional(),
    ammoBinId: z.string().optional(),
    hotLoaded: z.boolean().optional(),
    linkedCriticalWeaponId: z.string().optional(),
    linkedCriticalWeaponName: z.string().optional(),
    explosionDamage: finiteNumber.optional(),
    explosionRequiresSecondaryEffects: z.boolean().optional(),
  })
  .strict();

const criticalSlotManifestSchema = z.record(
  z.string(),
  z.array(criticalSlotEntrySchema),
);

const aerospaceInitSchema = z
  .object({
    maxSI: finiteNumber,
    armorByArc: z
      .object({
        nose: finiteNumber,
        leftWing: finiteNumber.optional(),
        rightWing: finiteNumber.optional(),
        leftSide: finiteNumber.optional(),
        rightSide: finiteNumber.optional(),
        aft: finiteNumber,
      })
      .strict(),
    heatSinks: finiteNumber,
    fuelPoints: finiteNumber,
    safeThrust: finiteNumber,
    maxThrust: finiteNumber,
    altitude: finiteNumber.optional(),
    currentVelocity: finiteNumber.optional(),
    nextVelocity: finiteNumber.optional(),
    airborneState: z
      .enum(['grounded', 'taking-off', 'airborne', 'landing'])
      .optional(),
    dogfightWith: z.string().optional(),
  })
  .strict();

const systemManufacturerSchema = z
  .object({
    chassis: z.string().optional(),
    engine: z.string().optional(),
    armor: z.string().optional(),
    jumpJets: z.string().optional(),
    communications: z.string().optional(),
    targetingAndTracking: z.string().optional(),
  })
  .strict();

const unitFluffSchema = z
  .object({
    overview: z.string().optional(),
    capabilities: z.string().optional(),
    deployment: z.string().optional(),
    history: z.string().optional(),
    manufacturer: z.string().optional(),
    primaryFactory: z.string().optional(),
    systemManufacturer: systemManufacturerSchema.optional(),
  })
  .strict();

const unitMetadataSchema = z
  .object({
    chassis: z.string(),
    model: z.string(),
    variant: z.string().optional(),
    source: z.string().optional(),
    era: z.nativeEnum(Era),
    year: finiteNumber,
    rulesLevel: z.nativeEnum(RulesLevel),
    role: z.string().optional(),
    manufacturer: z.string().optional(),
    primaryFactory: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();

const infantryFieldGunSchema = z
  .object({ equipmentId: z.string(), name: z.string(), crew: finiteNumber })
  .strict();

const infantryBVBreakdownSchema = z
  .object({
    perTrooper: finiteNumber,
    motiveMultiplier: finiteNumber,
    antiMechMultiplier: finiteNumber,
    fieldGunBV: finiteNumber,
    platoonBV: finiteNumber,
    pilotMultiplier: finiteNumber,
    final: finiteNumber,
    primaryBV: finiteNumber,
    secondaryBV: finiteNumber,
    armorKitBV: finiteNumber,
    fieldGunWeaponBV: finiteNumber,
    fieldGunAmmoBV: finiteNumber,
    troopers: finiteNumber,
  })
  .strict();

/**
 * Full `IInfantry` mirror (extends ISquadUnit -> IBaseUnit -> IEntity /
 * ITechBaseEntity / ITemporalEntity / IValuedComponent) — the runtime
 * `infantryInit` block carries the complete construction record.
 */
const infantryInitSchema = z
  .object({
    // IEntity / IIdentifiable
    id: z.string(),
    name: z.string(),
    // ITechBaseEntity
    techBase: z.nativeEnum(TechBase),
    rulesLevel: z.nativeEnum(RulesLevel),
    // ITemporalEntity
    introductionYear: finiteNumber,
    era: z.nativeEnum(Era),
    extinctionYear: finiteNumber.optional(),
    reintroductionYear: finiteNumber.optional(),
    // IValuedComponent
    cost: finiteNumber,
    battleValue: finiteNumber,
    // IBaseUnit
    unitType: z.literal(UnitType.INFANTRY),
    tonnage: finiteNumber,
    weightClass: z.nativeEnum(WeightClass),
    metadata: unitMetadataSchema,
    source: z.string().optional(),
    role: z.string().optional(),
    quirks: z.array(z.string()).optional(),
    fluff: unitFluffSchema.optional(),
    totalWeight: finiteNumber,
    remainingTonnage: finiteNumber,
    isValid: z.boolean(),
    validationErrors: z.array(z.string()),
    // ISquadUnit
    motionType: z.nativeEnum(SquadMotionType),
    movement: z
      .object({
        groundMP: finiteNumber,
        jumpMP: finiteNumber,
        umuMP: finiteNumber,
      })
      .strict(),
    squadSize: finiteNumber,
    armorPerTrooper: finiteNumber,
    // IInfantry
    numberOfSquads: finiteNumber,
    platoonStrength: finiteNumber,
    primaryWeapon: z.string(),
    primaryWeaponId: z.string().optional(),
    secondaryWeapon: z.string().optional(),
    secondaryWeaponId: z.string().optional(),
    secondaryWeaponCount: finiteNumber,
    armorKit: z.nativeEnum(InfantryArmorKit),
    specialization: z.nativeEnum(InfantrySpecialization),
    fieldGuns: z.array(infantryFieldGunSchema),
    hasAntiMechTraining: z.boolean(),
    isAugmented: z.boolean(),
    augmentationType: z.string().optional(),
    canSwarm: z.boolean(),
    canLegAttack: z.boolean(),
    bvBreakdown: infantryBVBreakdownSchema.optional(),
  })
  .strict();

const protoMechInitSchema = z
  .object({
    chassisType: z.nativeEnum(ProtoChassis),
    hasMainGun: z.boolean(),
    // zod 4 enum-keyed z.record demands EXHAUSTIVE keys; these maps are
    // Partial<Record<ProtoLocation, number>> (main-gun and quad keys are
    // conditional), so partialRecord is the faithful mirror.
    armorByLocation: z.partialRecord(z.nativeEnum(ProtoLocation), finiteNumber),
    structureByLocation: z.partialRecord(
      z.nativeEnum(ProtoLocation),
      finiteNumber,
    ),
    altitude: finiteNumber.optional(),
  })
  .strict();

const battleArmorInitSchema = z
  .object({
    squadSize: finiteNumber,
    armorPointsPerTrooper: finiteNumber,
    stealthKind: z
      .enum([
        'none',
        'mimetic',
        'stealth_basic',
        'stealth_improved',
        'stealth_prototype',
      ])
      .optional(),
    hasMagneticClamp: z.boolean().optional(),
    hasVibroClaws: z.boolean().optional(),
    vibroClawCount: finiteNumber.optional(),
  })
  .strict();

const vehicleArmorLocationSchema = z.union([
  z.nativeEnum(VehicleLocation),
  z.nativeEnum(VTOLLocation),
]);

// Deduplicated literal vocabulary of VehicleLocation + VTOLLocation values,
// usable as a partialRecord key schema for the per-location maps.
const vehicleArmorLocationKeySchema = z.enum(
  Array.from(
    new Set<string>([
      ...Object.values(VehicleLocation),
      ...Object.values(VTOLLocation),
    ]),
  ) as [string, ...string[]],
);

const vehicleCriticalAvailabilityProfileSchema = z
  .object({
    weaponLocations: z.array(vehicleArmorLocationSchema).optional(),
    weaponLocationCounts: z.record(z.string(), finiteNumber).optional(),
    jammableWeaponLocations: z.array(vehicleArmorLocationSchema).optional(),
    jammableWeaponLocationCounts: z.record(z.string(), finiteNumber).optional(),
    destroyableWeaponLocations: z.array(vehicleArmorLocationSchema).optional(),
    destroyableWeaponLocationCounts: z
      .record(z.string(), finiteNumber)
      .optional(),
    cargoLoaded: z.boolean().optional(),
    stabilizerHitLocations: z.array(vehicleArmorLocationSchema).optional(),
  })
  .strict();

const vehicleInitSchema = z
  .object({
    motionType: z.nativeEnum(GroundMotionType),
    turretType: z.nativeEnum(TurretType).optional(),
    engineType: z
      .union([z.nativeEnum(EngineType), z.string(), finiteNumber])
      .optional(),
    originalCruiseMP: finiteNumber,
    armor: z.partialRecord(vehicleArmorLocationKeySchema, finiteNumber),
    structure: z.partialRecord(vehicleArmorLocationKeySchema, finiteNumber),
    altitude: finiteNumber.optional(),
    criticalAvailability: vehicleCriticalAvailabilityProfileSchema.optional(),
  })
  .strict();

// =============================================================================
// Game unit (IGameUnit)
// =============================================================================

export const gameUnitSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    side: z.nativeEnum(GameSide),
    unitRef: z.string(),
    pilotRef: z.string(),
    gunnery: finiteNumber,
    piloting: finiteNumber,
    pilotSpas: z.array(z.string()).optional(),
    movementMode: z
      .enum([
        'walk',
        'tracked',
        'wheeled',
        'hover',
        'vtol',
        'naval',
        'hydrofoil',
        'submarine',
        'umu',
        'biped_swim',
        'quad_swim',
        'wige',
        'rail',
        'maglev',
      ])
      .optional(),
    gyroType: z.string().optional(),
    tonnage: finiteNumber.optional(),
    heatSinks: finiteNumber.optional(),
    heatSinkType: z.enum(['single', 'double']).optional(),
    hasTSM: z.boolean().optional(),
    hasMASC: z.boolean().optional(),
    hasSupercharger: z.boolean().optional(),
    hasDroneOS: z.boolean().optional(),
    targetingComputerEquipment: z.boolean().optional(),
    activeMASC: z.boolean().optional(),
    activeSupercharger: z.boolean().optional(),
    mascTurnsUsed: finiteNumber.optional(),
    superchargerTurnsUsed: finiteNumber.optional(),
    mascFailureLevelIncreasedLastTurn: z.boolean().optional(),
    superchargerFailureLevelIncreasedLastTurn: z.boolean().optional(),
    abilities: z.array(z.string()).optional(),
    neuralInterfaceActive: z.boolean().optional(),
    edgePointsRemaining: finiteNumber.optional(),
    pilotToughness: finiteNumber.optional(),
    designatedWeaponType: z.string().optional(),
    designatedWeaponCategory: z.string().optional(),
    designatedTargetId: z.string().optional(),
    designatedRangeBracket: z.nativeEnum(RangeBracket).optional(),
    designatedEnvironment: z.string().optional(),
    unitQuirks: z.array(z.string()).optional(),
    weaponQuirks: z.record(z.string(), z.array(z.string())).optional(),
    initiativeHQBonus: finiteNumber.optional(),
    initiativeCommandBonus: finiteNumber.optional(),
    initiativeEquipment: initiativeEquipmentProfileSchema.optional(),
    c3Equipment: z.array(c3EquipmentMountStateSchema).optional(),
    weaponLocationById: z.record(z.string(), z.string()).optional(),
    ammoConstruction: z.array(ammoConstructionInitSchema).optional(),
    criticalSlotManifest: criticalSlotManifestSchema.optional(),
    armorTypeByLocation: z.record(z.string(), z.string()).optional(),
    armorByLocation: z.record(z.string(), finiteNumber).optional(),
    structureByLocation: z.record(z.string(), finiteNumber).optional(),
    caseProtection: z
      .record(z.string(), z.enum(['case', 'case_ii']))
      .optional(),
    unitType: z.nativeEnum(UnitType).optional(),
    motionType: z.string().optional(),
    isQuad: z.boolean().optional(),
    armsFlipped: z.boolean().optional(),
    isPassenger: z.boolean().optional(),
    isSwarming: z.boolean().optional(),
    isMakingDFA: z.boolean().optional(),
    isMakingDisplacementAttack: z.boolean().optional(),
    isPushing: z.boolean().optional(),
    displacementAttackTargetId: z.string().optional(),
    targetedByDisplacementAttackerId: z.string().optional(),
    isAirborne: z.boolean().optional(),
    occupiedBuildingId: z.string().optional(),
    isEvading: z.boolean().optional(),
    evasionBonus: finiteNumber.optional(),
    sprintedThisTurn: z.boolean().optional(),
    isLoadingOrUnloadingCargo: z.boolean().optional(),
    leftArmCarryingCargo: z.boolean().optional(),
    rightArmCarryingCargo: z.boolean().optional(),
    boardId: z.string().optional(),
    aerospaceInit: aerospaceInitSchema.optional(),
    infantryInit: infantryInitSchema.optional(),
    protoMechInit: protoMechInitSchema.optional(),
    battleArmorInit: battleArmorInitSchema.optional(),
    vehicleInit: vehicleInitSchema.optional(),
  })
  .strict();

// =============================================================================
// Phase / side re-exports for the pack module
// =============================================================================

export const gamePhaseSchema = z.nativeEnum(GamePhase);
export const gameSideSchema = z.nativeEnum(GameSide);
