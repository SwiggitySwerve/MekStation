/**
 * Scenario Pack Registry — the single source of truth for every minted
 * pack (design D2, task 3.2). Precedent: `e2e/flows/manifest.ts` (typed TS
 * module, one entry per registered item, `validate*()` called at module
 * load so a malformed registry crashes any consumer immediately).
 *
 * Every entry is re-validated at module load against `manifestEntrySchema`
 * (`src/lib/scenarioPacks/packSchemas.ts`, task 2.1) — a hand-edited entry
 * that drifts from the closed shape fails loud here, before any loader or
 * minter ever reads it. `MANIFEST_VERSION` below is asserted equal to the
 * pack library's own exported `MANIFEST_VERSION` constant by a guard test
 * (`__tests__/manifest.test.ts`) — the two must never silently diverge
 * (design D2: "a registry test asserts the manifest module's declared
 * `manifestVersion` equals this constant, failing loud on mismatch").
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D2)
 */

import {
  manifestEntrySchema,
  MANIFEST_VERSION,
  type ManifestEntry,
} from '../../src/lib/scenarioPacks/packSchemas';

/** Re-exported under the loader's own name (`scenarioPackLoading.ts` imports this type). */
export type ScenarioPackManifestEntry = ManifestEntry;

/** The registry module's own format version — see this file's header comment. */
export const manifestVersion = MANIFEST_VERSION;

/**
 * One entry per minted pack. Group-3 (this change) registers the three
 * ungated pilot packs (navigation/personnel/experience); groups 4/5 append
 * the W2/W3-gated packs (combat/economy/maintenance) once their upstream
 * artifacts land (design D10).
 */
export const SCENARIO_PACK_MANIFEST: readonly ManifestEntry[] = [
  {
    id: 'navigation-briefing',
    kind: 'campaign',
    subsystems: ['navigation'],
    viewports: [],
    targetRoute: '/gameplay/campaigns/{id}/contract-market',
    parityAnchorJourney: 'flow:campaign-create-to-launch@contract-accepted',
    payloadPath: 'campaign/navigation-briefing.campaign.json',
    provenance: {
      genesisSource: 'flow:campaign-create-to-launch@contract-accepted',
      mintedAt: '2026-07-11T08:32:56.200Z',
      baseCommit: 'ae93394bbc54bd3a9255b5af6606e84a30321b10',
    },
    pins: { schemaVersion: 1 },
    postLoadActions: [],
  },
  {
    id: 'personnel-roster',
    kind: 'campaign',
    subsystems: ['personnel'],
    viewports: [],
    targetRoute: '/gameplay/campaigns/{id}/personnel',
    parityAnchorJourney: 'flow:personnel-hiring@roster-updated',
    payloadPath: 'campaign/personnel-roster.campaign.json',
    provenance: {
      genesisSource: 'flow:personnel-hiring@roster-updated',
      mintedAt: '2026-07-11T08:34:35.867Z',
      baseCommit: 'ae93394bbc54bd3a9255b5af6606e84a30321b10',
    },
    pins: { schemaVersion: 1 },
    postLoadActions: [],
  },
  {
    id: 'experience-pilot',
    kind: 'campaign',
    subsystems: ['experience'],
    viewports: [],
    // {pilotId} is substituted with the front-door-created standalone vault
    // pilot's id (design R10 — see scenarioPackLoading.ts's
    // `createStandalonePilotIfDeclared`), never the campaign id.
    targetRoute: '/gameplay/pilots/{pilotId}?tab=career',
    parityAnchorJourney: 'flow:pilot-xp-progression@xp-surface-viewed',
    payloadPath: 'campaign/experience-pilot.campaign.json',
    provenance: {
      genesisSource: 'flow:pilot-xp-progression@xp-surface-viewed',
      mintedAt: '2026-07-11T08:34:56.971Z',
      baseCommit: 'ae93394bbc54bd3a9255b5af6606e84a30321b10',
    },
    pins: { schemaVersion: 1 },
    postLoadActions: [],
  },
];

/**
 * Fail loud on a malformed registry (spec: "registry validation"; the
 * `e2e/flows/manifest.ts` `validateFlowManifest` precedent): every entry
 * must satisfy `manifestEntrySchema`, and pack ids must be unique.
 */
export function validateScenarioPackManifest(
  entries: readonly ManifestEntry[] = SCENARIO_PACK_MANIFEST,
): void {
  const seenIds = new Set<string>();
  for (const entry of entries) {
    manifestEntrySchema.parse(entry);
    if (seenIds.has(entry.id)) {
      throw new Error(
        `Scenario pack manifest invalid: duplicate pack id "${entry.id}"`,
      );
    }
    seenIds.add(entry.id);
  }
}

// Validate at module load — importing a bad manifest fails any consumer now.
validateScenarioPackManifest();

/** Look up a pack's manifest entry by id, or throw naming the id (never a silent `undefined` a loader would NPE on). */
export function getManifestEntry(id: string): ManifestEntry {
  const entry = SCENARIO_PACK_MANIFEST.find((candidate) => candidate.id === id);
  if (!entry) {
    throw new Error(
      `getManifestEntry: no scenario pack registered with id "${id}". Registered ids: ${SCENARIO_PACK_MANIFEST.map((e) => e.id).join(', ')}`,
    );
  }
  return entry;
}
