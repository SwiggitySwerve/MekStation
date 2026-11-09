/** Existing persisted projections, shared with save-state fingerprints. No field defaults are added here. */
import type { AerospaceState } from './aerospaceState';
import type { BattleArmorState } from './battleArmorState';
import type { InfantryState } from './infantryState';
import type { ProtoMechState } from './protoMechState';
import type { IUnitSaveMetadata } from './unitSaveState';
import type { VehicleState } from './vehicleState';

import { pickPersistedUnitIdentity } from './unitStoreIdentityActions';

function pickStoreFields<TState, const TKey extends keyof TState>(
  state: TState,
  keys: readonly TKey[],
): Pick<TState, TKey> {
  return Object.fromEntries(keys.map((key) => [key, state[key]])) as Pick<
    TState,
    TKey
  >;
}

export function pickPersistedVehicleState(
  state: VehicleState,
): Partial<VehicleState> {
  return {
    ...pickPersistedUnitIdentity(state),
    tonnage: state.tonnage,
    techBase: state.techBase,
    unitType: state.unitType,
    motionType: state.motionType,
    isOmni: state.isOmni,
    baseChassisTurretWeight: state.baseChassisTurretWeight,
    baseChassisSecondaryTurretWeight: state.baseChassisSecondaryTurretWeight,
    hasNoControlSystems: state.hasNoControlSystems,
    engineType: state.engineType,
    engineRating: state.engineRating,
    engineTechRating: state.engineTechRating,
    structuralTechRating: state.structuralTechRating,
    cruiseMP: state.cruiseMP,
    turret: state.turret,
    secondaryTurret: state.secondaryTurret,
    armorType: state.armorType,
    usesBarArmor: state.usesBarArmor,
    armorTechRating: state.armorTechRating,
    armorTonnage: state.armorTonnage,
    armorAllocation: state.armorAllocation,
    isSuperheavy: state.isSuperheavy,
    hasEnvironmentalSealing: state.hasEnvironmentalSealing,
    hasFlotationHull: state.hasFlotationHull,
    isAmphibious: state.isAmphibious,
    hasTrailerHitch: state.hasTrailerHitch,
    isTrailer: state.isTrailer,
    structureType: state.structureType,
    crewSize: state.crewSize,
    passengerSlots: state.passengerSlots,
    transporters: state.transporters,
    barRating: state.barRating,
    powerAmpWeight: state.powerAmpWeight,
    equipment: state.equipment,
    isModified: state.isModified,
    createdAt: state.createdAt,
    lastModifiedAt: state.lastModifiedAt,
  };
}

export function pickPersistedInfantryState(
  state: InfantryState,
): Partial<InfantryState> {
  return {
    ...pickPersistedUnitIdentity(state),
    techBase: state.techBase,
    unitType: state.unitType,
    squadSize: state.squadSize,
    numberOfSquads: state.numberOfSquads,
    motionType: state.motionType,
    infantryMotive: state.infantryMotive,
    platoonComposition: state.platoonComposition,
    groundMP: state.groundMP,
    jumpMP: state.jumpMP,
    primaryWeapon: state.primaryWeapon,
    primaryWeaponId: state.primaryWeaponId,
    secondaryWeapon: state.secondaryWeapon,
    secondaryWeaponId: state.secondaryWeaponId,
    secondaryWeaponCount: state.secondaryWeaponCount,
    armorKit: state.armorKit,
    damageDivisor: state.damageDivisor,
    specialization: state.specialization,
    hasAntiMechTraining: state.hasAntiMechTraining,
    isAugmented: state.isAugmented,
    augmentationType: state.augmentationType,
    librarySource: state.librarySource,
    umuMP: state.umuMP,
    fieldGuns: state.fieldGuns,
    bvBreakdown: state.bvBreakdown,
    isModified: state.isModified,
    createdAt: state.createdAt,
    lastModifiedAt: state.lastModifiedAt,
  };
}

export function pickPersistedBattleArmorState(
  state: BattleArmorState,
): Partial<BattleArmorState> {
  return {
    ...pickPersistedUnitIdentity(state),
    librarySource: state.librarySource,
    techBase: state.techBase,
    unitType: state.unitType,
    chassisType: state.chassisType,
    weightClass: state.weightClass,
    weightPerTrooper: state.weightPerTrooper,
    squadSize: state.squadSize,
    motionType: state.motionType,
    groundMP: state.groundMP,
    jumpMP: state.jumpMP,
    hasMechanicalJumpBoosters: state.hasMechanicalJumpBoosters,
    umuMP: state.umuMP,
    leftManipulator: state.leftManipulator,
    rightManipulator: state.rightManipulator,
    armorType: state.armorType,
    baArmorType: state.baArmorType,
    armorPerTrooper: state.armorPerTrooper,
    hasAPMount: state.hasAPMount,
    hasModularMount: state.hasModularMount,
    hasTurretMount: state.hasTurretMount,
    hasStealthSystem: state.hasStealthSystem,
    stealthType: state.stealthType,
    hasMimeticArmor: state.hasMimeticArmor,
    hasFireResistantArmor: state.hasFireResistantArmor,
    equipment: state.equipment,
    isModified: state.isModified,
    createdAt: state.createdAt,
    lastModifiedAt: state.lastModifiedAt,
  };
}

export function pickPersistedProtoMechState(
  state: ProtoMechState,
): Partial<ProtoMechState> {
  return {
    ...pickPersistedUnitIdentity(state),
    librarySource: state.librarySource,
    techBase: state.techBase,
    unitType: state.unitType,
    tonnage: state.tonnage,
    weightClass: state.weightClass,
    chassisType: state.chassisType,
    pointSize: state.pointSize,
    engineRating: state.engineRating,
    walkMP: state.walkMP,
    cruiseMP: state.cruiseMP,
    flankMP: state.flankMP,
    jumpMP: state.jumpMP,
    structureByLocation: state.structureByLocation,
    armorByLocation: state.armorByLocation,
    armorType: state.armorType,
    hasMainGun: state.hasMainGun,
    mainGunWeaponId: state.mainGunWeaponId,
    hasMyomerBooster: state.hasMyomerBooster,
    glidingWings: state.glidingWings,
    hasMagneticClamps: state.hasMagneticClamps,
    hasExtendedTorsoTwist: state.hasExtendedTorsoTwist,
    equipment: state.equipment,
    isModified: state.isModified,
    createdAt: state.createdAt,
    lastModifiedAt: state.lastModifiedAt,
    // Persist the last-computed BV breakdown so hydrated sessions read
    // the same value the parity harness would produce. Stale copies are
    // rewritten on the first BV-affecting mutation.
    bvBreakdown: state.bvBreakdown,
  };
}

const AEROSPACE_PERSIST_KEYS =
  'tonnage techBase unitType aerospaceSubType isFixedWingSupport structuralTechRating engineTechRating motionType isOmni engineType aerospaceEngineType engineRating safeThrust fuelTons structuralIntegrity cockpitType heatSinks doubleHeatSinks armorType smallCraftArmorType armorTypeByArc barRating armorTonnage armorAllocation hasBombBay bombCapacity hasReinforcedCockpit hasEjectionSeat crew equipment isModified createdAt lastModifiedAt'.split(
    ' ',
  ) as ReadonlyArray<keyof AerospaceState>;

export function pickPersistedAerospaceState(
  state: AerospaceState,
): Partial<AerospaceState> {
  return {
    ...pickPersistedUnitIdentity(state),
    ...pickStoreFields(state, AEROSPACE_PERSIST_KEYS),
  };
}

/** Append confirmed metadata only when present; legacy drafts keep their exact field set. */
export function withUnitLibraryReceipt<
  TState extends IUnitSaveMetadata,
  TPersisted extends object,
>(
  partialize: (state: TState) => TPersisted,
): (state: TState) => TPersisted & Pick<IUnitSaveMetadata, 'librarySave'> {
  return (state) => {
    const persisted = partialize(state);
    return state.librarySave === undefined
      ? persisted
      : { ...persisted, librarySave: state.librarySave };
  };
}
