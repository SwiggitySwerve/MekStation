import type { ICombatFeatureSupportEntry } from './CombatFeatureSupport';

export type CombatActionLayer =
  | 'absent-action-surface'
  | 'tactical-command'
  | 'direct-ui-control'
  | 'game-intent'
  | 'wire-intent'
  | 'p2p-translation'
  | 'physical-attack-type';

export interface ICombatActionSupportEntry extends ICombatFeatureSupportEntry {
  readonly layer: CombatActionLayer;
}
