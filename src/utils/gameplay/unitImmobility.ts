import type { IUnitGameState } from '@/types/gameplay';

export function representedUnitImmobileReason(
  unit: IUnitGameState | undefined,
): string | null {
  if (unit?.shutdown === true) return 'Unit is shut down and cannot move';
  if (unit?.pilotConscious === false) {
    return 'Pilot is unconscious and unit cannot move';
  }
  return null;
}

export function isRepresentedUnitImmobile(
  unit: IUnitGameState | undefined,
): boolean {
  return representedUnitImmobileReason(unit) !== null;
}
