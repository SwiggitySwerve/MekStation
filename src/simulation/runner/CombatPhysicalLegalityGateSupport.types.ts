import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

export type PhysicalLegalityAttackFamily =
  | 'shared'
  | 'punch'
  | 'kick'
  | 'push'
  | 'charge'
  | 'dfa';

export interface IPhysicalLegalityGateSupportEntry extends ICombatFeatureSupportEntry {
  readonly attackFamily: PhysicalLegalityAttackFamily;
  readonly authority: string;
}
