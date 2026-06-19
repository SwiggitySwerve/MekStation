import {
  CombatLocation,
  getFrontCombatLocation,
  getTransferCombatLocation,
  isRearCombatLocation,
} from '@/types/gameplay';

import {
  addDestroyedLocation,
  getArmForSideTorso,
  getRearArmorLocation,
  isLocationDestroyed,
} from './helpers';
import {
  ILocationDamageResult,
  IUnitDamageState,
  RearArmorLocation,
} from './types';

interface DamageLocationContext {
  readonly location: CombatLocation;
  readonly structureKey: CombatLocation;
  readonly rearArmorLocation: RearArmorLocation | null;
  readonly isRear: boolean;
}

interface DamageWorkingState {
  readonly armor: Record<CombatLocation, number>;
  readonly rearArmor: Record<RearArmorLocation, number>;
  readonly structure: Record<CombatLocation, number>;
  readonly destroyedLocations: readonly CombatLocation[];
}

interface ArmorDamageApplication {
  readonly workingState: DamageWorkingState;
  readonly armorDamage: number;
  readonly remainingDamage: number;
}

interface StructureDamageApplication {
  readonly workingState: DamageWorkingState;
  readonly structureDamage: number;
  readonly remainingDamage: number;
  readonly destroyed: boolean;
  readonly transferredDamage: number;
}

export function applyDamageToLocationCore(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
): ILocationDamageResult {
  const destroyedResult = createDestroyedLocationResult(
    state,
    location,
    damage,
  );
  if (destroyedResult) {
    return destroyedResult;
  }

  const context = createDamageLocationContext(location);
  const armorApplication = applyArmorDamage(
    createWorkingState(state),
    context,
    getCurrentArmor(state, context),
    damage,
  );
  const structureApplication = applyStructureDamage(
    armorApplication.workingState,
    context,
    armorApplication.remainingDamage,
  );

  return {
    state: createUpdatedDamageState(state, structureApplication.workingState),
    result: {
      location,
      damage,
      armorDamage: armorApplication.armorDamage,
      structureDamage: structureApplication.structureDamage,
      armorRemaining: getArmorRemaining(
        structureApplication.workingState,
        context,
      ),
      structureRemaining:
        structureApplication.workingState.structure[context.structureKey],
      destroyed: structureApplication.destroyed,
      transferredDamage: structureApplication.transferredDamage,
      transferLocation:
        structureApplication.transferredDamage > 0
          ? (getTransferCombatLocation(location) ?? undefined)
          : undefined,
    },
  };
}

function createDestroyedLocationResult(
  state: IUnitDamageState,
  location: CombatLocation,
  damage: number,
): ILocationDamageResult | null {
  if (!isLocationDestroyed(state, location)) {
    return null;
  }

  const transferTo = getTransferCombatLocation(location);

  return {
    state,
    result: {
      location,
      damage,
      armorDamage: 0,
      structureDamage: 0,
      armorRemaining: 0,
      structureRemaining: 0,
      destroyed: true,
      transferredDamage: transferTo ? damage : 0,
      transferLocation: transferTo ?? undefined,
    },
  };
}

function createDamageLocationContext(
  location: CombatLocation,
): DamageLocationContext {
  const isRear = isRearCombatLocation(location);

  return {
    location,
    structureKey: isRear ? getFrontCombatLocation(location) : location,
    rearArmorLocation: getRearArmorLocation(location),
    isRear,
  };
}

function createWorkingState(state: IUnitDamageState): DamageWorkingState {
  return {
    armor: { ...state.armor },
    rearArmor: { ...state.rearArmor },
    structure: { ...state.structure },
    destroyedLocations: state.destroyedLocations,
  };
}

function getCurrentArmor(
  state: IUnitDamageState,
  context: DamageLocationContext,
): number {
  if (context.rearArmorLocation) {
    return state.rearArmor[context.rearArmorLocation] ?? 0;
  }

  return state.armor[context.location] ?? 0;
}

function applyArmorDamage(
  workingState: DamageWorkingState,
  context: DamageLocationContext,
  currentArmor: number,
  damage: number,
): ArmorDamageApplication {
  if (currentArmor <= 0) {
    return {
      workingState,
      armorDamage: 0,
      remainingDamage: damage,
    };
  }

  const armorDamage = Math.min(currentArmor, damage);
  const remainingDamage = damage - armorDamage;

  if (context.rearArmorLocation) {
    return {
      workingState: {
        ...workingState,
        rearArmor: {
          ...workingState.rearArmor,
          [context.rearArmorLocation]: currentArmor - armorDamage,
        },
      },
      armorDamage,
      remainingDamage,
    };
  }

  return {
    workingState: {
      ...workingState,
      armor: {
        ...workingState.armor,
        [context.location]: currentArmor - armorDamage,
      },
    },
    armorDamage,
    remainingDamage,
  };
}

function addDestroyedLocationSideEffects(
  workingState: DamageWorkingState,
  context: DamageLocationContext,
): DamageWorkingState {
  let destroyedLocations = addDestroyedLocation(
    workingState.destroyedLocations,
    context.location,
  );

  if (context.isRear) {
    destroyedLocations = addDestroyedLocation(
      destroyedLocations,
      context.structureKey,
    );
  }

  const cascadedArm = getArmForSideTorso(context.structureKey);
  if (!cascadedArm || destroyedLocations.includes(cascadedArm)) {
    return { ...workingState, destroyedLocations };
  }

  return {
    ...workingState,
    destroyedLocations: addDestroyedLocation(destroyedLocations, cascadedArm),
    armor: { ...workingState.armor, [cascadedArm]: 0 },
    structure: { ...workingState.structure, [cascadedArm]: 0 },
  };
}

function getTransferredDamage(
  location: CombatLocation,
  remainingDamage: number,
): number {
  if (remainingDamage <= 0) {
    return 0;
  }

  return getTransferCombatLocation(location) ? remainingDamage : 0;
}

function applyStructureDamage(
  workingState: DamageWorkingState,
  context: DamageLocationContext,
  remainingDamage: number,
): StructureDamageApplication {
  const currentStructure = workingState.structure[context.structureKey] ?? 0;

  if (remainingDamage <= 0 || currentStructure <= 0) {
    return {
      workingState,
      structureDamage: 0,
      remainingDamage,
      destroyed: false,
      transferredDamage: 0,
    };
  }

  const structureDamage = Math.min(currentStructure, remainingDamage);
  const damageAfterStructure = remainingDamage - structureDamage;
  const damagedState: DamageWorkingState = {
    ...workingState,
    structure: {
      ...workingState.structure,
      [context.structureKey]: currentStructure - structureDamage,
    },
  };

  if (damagedState.structure[context.structureKey] > 0) {
    return {
      workingState: damagedState,
      structureDamage,
      remainingDamage: damageAfterStructure,
      destroyed: false,
      transferredDamage: 0,
    };
  }

  return {
    workingState: addDestroyedLocationSideEffects(damagedState, context),
    structureDamage,
    remainingDamage: damageAfterStructure,
    destroyed: true,
    transferredDamage: getTransferredDamage(
      context.location,
      damageAfterStructure,
    ),
  };
}

function createUpdatedDamageState(
  state: IUnitDamageState,
  workingState: DamageWorkingState,
): IUnitDamageState {
  return {
    ...state,
    armor: workingState.armor,
    rearArmor: workingState.rearArmor,
    structure: workingState.structure,
    destroyedLocations: workingState.destroyedLocations,
  };
}

function getArmorRemaining(
  workingState: DamageWorkingState,
  context: DamageLocationContext,
): number {
  if (context.rearArmorLocation) {
    return workingState.rearArmor[context.rearArmorLocation];
  }

  return workingState.armor[context.location];
}
