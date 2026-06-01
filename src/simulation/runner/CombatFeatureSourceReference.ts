export type CombatFeatureSourceKind =
  | 'rulebook'
  | 'megamek-source'
  | 'mekhq-behavior'
  | 'mekstation-deviation';

export interface ICombatFeatureSourceReference {
  readonly kind: CombatFeatureSourceKind;
  readonly citation: string;
  readonly url: string;
  readonly sourceVersion: string;
}
