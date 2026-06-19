import {
  Facing,
  GameSide,
  IUnitGameState,
  LockState,
  MovementType,
} from '@/types/gameplay';

import type { IHydratedUnitData } from './UnitHydrationTypes';

import { DEFAULT_COMPONENT_DAMAGE } from './SimulationRunnerConstants';
import { hydrateAmmoStateFromFullUnit } from './UnitHydrationAmmo';
import {
  hydrateArmorFromFullUnit,
  hydrateArmorTypeByLocationFromFullUnit,
  hydrateStructureFromFullUnit,
} from './UnitHydrationArmor';
import { hydrateCASEProtectionFromFullUnit } from './UnitHydrationCase';
import { hydrateC3EquipmentFromFullUnit } from './UnitHydrationElectronics';
import { hydrateInitiativeEquipmentFromFullUnit } from './UnitHydrationInitiative';
import {
  hydrateClawStateFromFullUnit,
  hydrateEdgePointsFromFullUnit,
  hydrateHasMASCFromFullUnit,
  hydrateHasStealthArmorFromFullUnit,
  hydrateHasSuperchargerFromFullUnit,
  hydrateHasTSMFromFullUnit,
  hydrateHeatSinksFromFullUnit,
  hydrateMotionTypeFromFullUnit,
  hydratePartialWingJumpBonusFromFullUnit,
  hydratePilotAbilitiesFromFullUnit,
  hydrateTalonStateFromFullUnit,
  hydrateTargetingComputerEquipmentFromFullUnit,
  hydrateUnitQuirksFromFullUnit,
} from './UnitHydrationMovement';

export function createHydratedUnitState(
  hydrated: IHydratedUnitData,
): IUnitGameState {
  const { runnerUnitId, side, position, fullUnit, gunnery, piloting } =
    hydrated;
  const { armor } = hydrateArmorFromFullUnit(fullUnit);
  const armorTypeByLocation = hydrateArmorTypeByLocationFromFullUnit(
    fullUnit,
    armor,
  );
  const { structure } = hydrateStructureFromFullUnit(fullUnit);
  const heatSinks = hydrateHeatSinksFromFullUnit(fullUnit);
  const talons = hydrateTalonStateFromFullUnit(fullUnit);
  const claws = hydrateClawStateFromFullUnit(fullUnit);
  const c3Equipment = hydrateC3EquipmentFromFullUnit(fullUnit);
  const initiativeEquipment = hydrateInitiativeEquipmentFromFullUnit(fullUnit);
  const targetingComputerEquipment =
    hydrateTargetingComputerEquipmentFromFullUnit(fullUnit);
  const ammoState = hydrateAmmoStateFromFullUnit(fullUnit);
  const caseProtection = hydrateCASEProtectionFromFullUnit(fullUnit);
  const abilities = hydratePilotAbilitiesFromFullUnit(fullUnit);
  const edgePointsRemaining = hydrateEdgePointsFromFullUnit(fullUnit);

  return {
    id: runnerUnitId,
    unitType: fullUnit.unitType,
    motionType: hydrateMotionTypeFromFullUnit(fullUnit),
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    gunnery,
    piloting,
    ...(abilities !== undefined ? { abilities } : {}),
    ...(edgePointsRemaining !== undefined ? { edgePointsRemaining } : {}),
    heatSinks: heatSinks.count,
    heatSinkType: heatSinks.kind,
    hasTSM: hydrateHasTSMFromFullUnit(fullUnit),
    hasMASC: hydrateHasMASCFromFullUnit(fullUnit),
    hasSupercharger: hydrateHasSuperchargerFromFullUnit(fullUnit),
    ...(c3Equipment.length > 0 ? { c3Equipment } : {}),
    ...(targetingComputerEquipment ? { targetingComputerEquipment } : {}),
    partialWingJumpBonus: hydratePartialWingJumpBonusFromFullUnit(fullUnit),
    leftLegHasTalons: talons.leftLegHasTalons,
    rightLegHasTalons: talons.rightLegHasTalons,
    leftArmHasTalons: talons.leftArmHasTalons,
    rightArmHasTalons: talons.rightArmHasTalons,
    leftArmHasClaw: claws.leftArmHasClaw,
    rightArmHasClaw: claws.rightArmHasClaw,
    hasStealthArmor: hydrateHasStealthArmorFromFullUnit(fullUnit),
    unitQuirks: hydrateUnitQuirksFromFullUnit(fullUnit),
    ...(initiativeEquipment !== undefined ? { initiativeEquipment } : {}),
    weaponLocationById: weaponLocationByIdFromWeapons(hydrated.aiWeapons),
    armor,
    ...(armorTypeByLocation !== undefined ? { armorTypeByLocation } : {}),
    startingInternalStructure: { ...structure },
    structure,
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    ...(ammoState !== undefined ? { ammoState } : {}),
    ...(caseProtection !== undefined ? { caseProtection } : {}),
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    hasRetreated: false,
    hasEjected: false,
    lockState: LockState.Pending,
    componentDamage: DEFAULT_COMPONENT_DAMAGE,
    prone: false,
    isStuck: false,
    shutdown: false,
    pendingPSRs: [],
    damageThisPhase: 0,
    weaponsFiredThisTurn: [],
  };
}

export function weaponLocationByIdFromWeapons(
  weapons: readonly { readonly id: string; readonly location?: string }[],
): Readonly<Record<string, string>> | undefined {
  const out: Record<string, string> = {};
  for (const weapon of weapons) {
    if (weapon.location !== undefined && weapon.location.length > 0) {
      out[weapon.id] = weapon.location;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
