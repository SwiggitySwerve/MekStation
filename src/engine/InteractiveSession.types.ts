import type { IEncounterMeta } from '@/types/gameplay/GameSessionInterfaces';

/**
 * Campaign linkage threaded into an interactive session at construction time.
 */
export interface IInteractiveSessionLinkage {
  readonly campaignId?: string | null;
  readonly contractId?: string | null;
  readonly scenarioId?: string | null;
  readonly encounterId?: string | null;
  readonly encounterMeta?: IEncounterMeta;
}
