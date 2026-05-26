import type { ICombatCatalogTriadEvidence } from './CombatCatalogTriadEvidence';

export const PILOT_ABILITY_FEATURE_TRIAD = {
  authorityBoundary: {
    kind: 'entry-source-refs',
    rationale:
      'Legacy pilot ability support rows must carry row-level sourceRefs that bind each SPA claim to pinned MegaMek behavior, MekStation helper/deviation paths, or explicit unsupported scope gaps.',
  },
  testRefs: [
    {
      file: 'src/simulation/runner/__tests__/battlemechCombatCatalog.contract.test.ts',
      assertion:
        'Feature-support rows stay aligned with official weapons, ammo, SPAs, quirks, and source-backed mechanic rows.',
    },
  ],
} satisfies ICombatCatalogTriadEvidence;
