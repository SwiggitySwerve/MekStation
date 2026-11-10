import { parseGmCorrectionAppliedPayload } from '@/lib/interventions/GmReplayCorrectionSchema';
import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';
import type { IReplayEventSchemaRegistration } from './ReplaySchemaRegistry';

export type CombatGmCorrectionEventType = GameEventType.GmCorrectionApplied;

export const COMBAT_GM_CORRECTION_SCHEMA_PACK: readonly IReplayEventSchemaRegistration[] = Object.freeze([{
  eventType: GameEventType.GmCorrectionApplied,
  targetSchemaVersion: 1,
  schemas: [{ schemaVersion: 1, schemaId: 'combat.gm_correction_applied.v1', parse: parseGmCorrectionAppliedPayload }],
  transitions: [],
}]);
