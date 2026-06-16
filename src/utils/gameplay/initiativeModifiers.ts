import {
  GameSide,
  type IGameState,
  type IInitiativeEquipmentProfile,
} from '@/types/gameplay';

import { resolveECMStatus } from './electronicWarfare';
import { calculateInitiativeQuirkModifier } from './quirkModifiers';
import { hasSPA } from './spaModifiers/canonicalize';

function isActiveInitiativeUnit(
  unit: IGameState['units'][string],
  side: GameSide,
): boolean {
  return (
    unit.side === side &&
    !unit.destroyed &&
    !unit.hasRetreated &&
    !unit.hasEjected &&
    unit.pilotConscious
  );
}

function initiativeAbilityIds(
  unit: IGameState['units'][string],
): readonly string[] {
  return [...(unit.abilities ?? []), ...(unit.pilotSpas ?? [])];
}

function normalizeInitiativeGate(value: string | undefined): string {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, '') ?? '';
}

function isDefaultCommunicationsMode(
  profile: IInitiativeEquipmentProfile | undefined,
): boolean {
  return normalizeInitiativeGate(profile?.communicationsMode) === 'default';
}

export function calculateHQEquipmentInitiativeBonus(
  profile: IInitiativeEquipmentProfile | undefined,
): number {
  const tonnage = profile?.workingCommunicationsTonnage;
  if (tonnage === undefined || !Number.isFinite(tonnage)) return 0;
  if (!isDefaultCommunicationsMode(profile)) return 0;
  if (tonnage >= 7) return 2;
  if (tonnage >= 3) return 1;
  return 0;
}

function isCommandConsole(profile: IInitiativeEquipmentProfile | undefined) {
  return normalizeInitiativeGate(profile?.cockpitType) === 'commandconsole';
}

function isIndustrialMek(profile: IInitiativeEquipmentProfile | undefined) {
  return normalizeInitiativeGate(profile?.unitType) === 'industrialmech';
}

function isHeavyOrLarger(profile: IInitiativeEquipmentProfile | undefined) {
  if (profile?.tonnage !== undefined) return profile.tonnage >= 60;

  switch (normalizeInitiativeGate(profile?.weightClass)) {
    case 'heavy':
    case 'assault':
    case 'superheavy':
      return true;
    default:
      return false;
  }
}

export function calculateCommandConsoleInitiativeBonus(
  profile: IInitiativeEquipmentProfile | undefined,
): number {
  if (!isCommandConsole(profile)) return 0;
  if (profile?.commandConsoleCrewActive !== true) return 0;
  if (!isHeavyOrLarger(profile)) return 0;
  if (isIndustrialMek(profile) && profile.hasAdvancedFireControl !== true) {
    return 0;
  }

  return 2;
}

function isBattleMechTcpInitiativeUnit(
  unit: IGameState['units'][string],
): boolean {
  const normalized = normalizeInitiativeGate(unit.unitType);
  return (
    normalized === '' ||
    normalized === 'battlemech' ||
    normalized === 'omnimech' ||
    normalized === 'industrialmech'
  );
}

function hasTcpCommandEquipment(unit: IGameState['units'][string]): boolean {
  const communicationsTonnage =
    unit.initiativeEquipment?.workingCommunicationsTonnage;

  return (
    calculateCommandConsoleInitiativeBonus(unit.initiativeEquipment) > 0 ||
    (communicationsTonnage !== undefined &&
      Number.isFinite(communicationsTonnage) &&
      communicationsTonnage > 3) ||
    (unit.c3Equipment?.length ?? 0) > 0
  );
}

function hasOwnOperationalEcm(
  unit: IGameState['units'][string],
  state: IGameState,
): boolean {
  return (
    state.electronicWarfare?.ecmSuites.some(
      (suite) =>
        suite.operational &&
        suite.mode === 'ecm' &&
        suite.teamId === unit.side &&
        (suite.entityId === unit.id ||
          suite.entityId.startsWith(`${unit.id}:`)),
    ) === true
  );
}

function hasTcpEcmPenalty(
  unit: IGameState['units'][string],
  state: IGameState,
): boolean {
  if (!state.electronicWarfare) return false;
  const status = resolveECMStatus(
    unit.position,
    unit.side,
    unit.id,
    state.electronicWarfare,
  );

  return status.ecmDisrupted && !hasOwnOperationalEcm(unit, state);
}

export function calculateTripleCoreProcessorInitiativeBonus(
  unit: IGameState['units'][string],
  state?: IGameState,
): number {
  if (!isBattleMechTcpInitiativeUnit(unit)) return 0;
  if (unit.neuralInterfaceActive === false) return 0;

  const abilities = initiativeAbilityIds(unit);
  if (!hasSPA(abilities, 'triple_core_processor')) return 0;
  if (!hasSPA(abilities, 'vdni') && !hasSPA(abilities, 'bvdni')) return 0;

  let bonus = 2;
  if (hasTcpCommandEquipment(unit)) bonus += 1;
  if (unit.shutdown) bonus -= 1;
  if (state && hasTcpEcmPenalty(unit, state)) bonus -= 1;
  if (state?.electromagneticInterference === true) bonus -= 1;

  return bonus;
}

export function calculateSideInitiativeModifier(
  state: IGameState,
  side: GameSide,
): number {
  const activeUnits = Object.values(state.units).filter((unit) =>
    isActiveInitiativeUnit(unit, side),
  );
  const forceQuirks = activeUnits.map((unit) => unit.unitQuirks ?? []);
  const quirkBonus = calculateInitiativeQuirkModifier(forceQuirks);
  const hqBonus = Math.max(
    0,
    ...activeUnits.map((unit) => unit.initiativeHQBonus ?? 0),
    ...activeUnits.map((unit) =>
      calculateHQEquipmentInitiativeBonus(unit.initiativeEquipment),
    ),
  );
  const commandBonus = Math.max(
    0,
    ...activeUnits.map((unit) => unit.initiativeCommandBonus ?? 0),
    ...activeUnits.map((unit) =>
      calculateCommandConsoleInitiativeBonus(unit.initiativeEquipment),
    ),
  );
  const tcpBonus = Math.max(
    0,
    ...activeUnits.map((unit) =>
      calculateTripleCoreProcessorInitiativeBonus(unit, state),
    ),
  );

  return Math.max(quirkBonus, hqBonus, commandBonus, tcpBonus);
}

export function hasSideTacticalGeniusInitiativeReroll(
  state: IGameState,
  side: GameSide,
): boolean {
  return Object.values(state.units).some(
    (unit) =>
      isActiveInitiativeUnit(unit, side) &&
      hasSPA(initiativeAbilityIds(unit), 'tactical_genius'),
  );
}
