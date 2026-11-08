import type { IEncounter } from '@/types/encounter';

import { EncounterStatus } from '@/types/encounter';

/** Existing configuration/cascade classification, independent of persistence. */
export function recalculateEncounterLifecycleStatus(
  encounter: IEncounter,
): EncounterStatus {
  if (encounter.status === EncounterStatus.Completed) return encounter.status;
  if (encounter.status === EncounterStatus.Launched) {
    return !encounter.playerForce && !encounter.opponentForce
      ? EncounterStatus.Draft
      : encounter.status;
  }
  return encounter.playerForce &&
    (encounter.opponentForce || encounter.opForConfig) &&
    encounter.victoryConditions.length > 0
    ? EncounterStatus.Ready
    : EncounterStatus.Draft;
}
