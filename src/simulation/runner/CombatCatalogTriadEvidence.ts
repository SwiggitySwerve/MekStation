export type CombatCatalogTriadAuthorityBoundaryKind =
  | 'entry-source-refs'
  | 'requirement-primary-authority'
  | 'mekstation-deviation';

export interface ICombatCatalogTriadTestReference {
  readonly file: string;
  readonly assertion: string;
}

export interface ICombatCatalogTriadEvidence {
  readonly authorityBoundary: {
    readonly kind: CombatCatalogTriadAuthorityBoundaryKind;
    readonly rationale: string;
  };
  readonly testRefs: readonly ICombatCatalogTriadTestReference[];
}
