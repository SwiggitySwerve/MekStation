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
  {
    id: 'combat-midbattle',
    kind: 'encounter',
    subsystems: ['combat'],
    viewports: [],
    targetRoute: '/gameplay/games/{id}',
    // `anchor:<spec-basename>` (design D2/D9) — the fresh-construction
    // seam trust anchor whose launched-and-advanced session this pack is
    // captured from (W2 gate, task 4.0).
    parityAnchorJourney: 'anchor:seam-fresh-construction-no-instant-defeat',
    payloadPath: 'encounter/combat-midbattle.matchlog.json',
    provenance: {
      genesisSource: 'anchor:seam-fresh-construction-no-instant-defeat',
      mintedAt: '2026-07-11T09:09:51.924Z',
      baseCommit: 'ff879cc86387fffd99a6965a7cabbe9ec801e0aa',
    },
    // `MATCH_LOG_DB_VERSION` (`matchLogStorageSchema.ts:4`) at mint time —
    // strictly equal-checked by `loadEncounterPack` (design D3), never a
    // ladder-tolerant pin (no migration ladder exists for this store).
    pins: { matchLogDbVersion: 2 },
    postLoadActions: [],
  },
  {
    id: 'economy-midcampaign',
    kind: 'campaign',
    subsystems: ['economy'],
    viewports: [],
    targetRoute: '/gameplay/campaigns/{id}/finances',
    // `fast-forward:<fixtureId>` (design D2/D9) — dumped from a
    // `fastForwardCampaign()` run via `buildSerializedCampaign` (W3 gate,
    // task 5.0). Standing is recorded per design D9: the
    // `campaign-fast-forward-api` live-parity acceptance was verified
    // GREEN (3/3) at gate-check time (task 5.0) — not triage-only.
    parityAnchorJourney: 'fast-forward:economy-midcampaign',
    payloadPath: 'campaign/economy-midcampaign.campaign.json',
    provenance: {
      genesisSource: 'fast-forward:economy-midcampaign',
      mintedAt: '2026-07-11T09:52:31.961Z',
      baseCommit: '472c7ca30eb30a085e039f4e84e9375d75bfbf1e',
    },
    pins: { schemaVersion: 1 },
    postLoadActions: [],
  },
  {
    id: 'maintenance-repairbay',
    kind: 'campaign',
    subsystems: ['maintenance'],
    viewports: [],
    targetRoute: '/gameplay/campaigns/{id}/repair-bay',
    // Standing per design D9 — same green (3/3) live-parity acceptance as
    // the economy pack above (task 5.0 gate check).
    parityAnchorJourney: 'fast-forward:maintenance-repairbay',
    payloadPath: 'campaign/maintenance-repairbay.campaign.json',
    provenance: {
      genesisSource: 'fast-forward:maintenance-repairbay',
      mintedAt: '2026-07-11T09:52:42.914Z',
      baseCommit: '472c7ca30eb30a085e039f4e84e9375d75bfbf1e',
    },
    pins: { schemaVersion: 1 },
    // Design D8 — the repair-bay projection is populated only by the
    // production CLEANUP-phase processor on `advanceDay`; the minted
    // payload's tickets are captured UNTOUCHED (`status: 'parts-needed'`)
    // and the target state is documented as minted-state-plus-one-day
    // (repair hours partially applied, a day's costs posted).
    postLoadActions: ['advance-day'],
  },
  // ---------------------------------------------------------------------
  // Co-op lifecycle packs (umbrella 19.4, finding #32).
  //
  // These two are HAND-AUTHORED, and their provenance says so rather than
  // borrowing a genesis they do not have. Neither sanctioned minter can
  // produce them: the flow-checkpoint minter captures a live GET against a
  // registered flow and `e2e/flows/manifest.ts` registers no co-op flow,
  // while the fast-forward minter dumps a headless `fastForwardCampaign()`
  // day-advance run, which never opens a co-op session.
  //
  // TWO entries, not one: `coopSession.mode` is single-valued per campaign
  // and the surfaces split on it. `postLoadActions` is EMPTY on both - see
  // the non-claim in the sweep inventory: a pending GM row cannot be
  // created through the front door, and a proposal no guest sent would be
  // a fixture wearing the pending posture's clothes.
  //
  // NO `coop` SUBSYSTEM TAG, deliberately. `PACK_SUBSYSTEMS` is not merely
  // a closed list - `packSchemas.test.ts` asserts it equals the set of
  // subsystems the REGISTERED FLOWS actually exercise
  // (`FLOW_MANIFEST.flatMap((flow) => flow.subsystems)`), so a tag no flow
  // exercises is dead vocabulary the guard correctly rejects. Adding
  // `coop` therefore requires registering a co-op FLOW first, which is a
  // larger change than this pack. Each entry instead carries the tag of
  // the flow that already covers its target route: the host pack loads a
  // campaign dashboard (`navigation`), the guest pack the finances
  // sub-route (`economy`). The tag describes the route family the pack
  // loads through, and the pack ids say what they actually seed.
  // ---------------------------------------------------------------------
  {
    id: 'coop-host-review',
    kind: 'campaign',
    subsystems: ['navigation'],
    viewports: [],
    targetRoute: '/gameplay/campaigns/{id}',
    parityAnchorJourney:
      'anchor:harden-gm-two-player-campaign-sessions-19.4-coop-host',
    payloadPath: 'campaign/coop-host-review.campaign.json',
    provenance: {
      genesisSource:
        'hand-authored:harden-gm-two-player-campaign-sessions@19.4-coop-host',
      mintedAt: '2026-09-02T12:13:00.000Z',
      baseCommit: 'e67d2bf9c160e49bea97989e42990a4a6103e156',
    },
    pins: { schemaVersion: 1 },
    postLoadActions: [],
  },
  {
    id: 'coop-guest-proposal',
    kind: 'campaign',
    subsystems: ['economy'],
    viewports: [],
    targetRoute: '/gameplay/campaigns/{id}/finances',
    parityAnchorJourney:
      'anchor:harden-gm-two-player-campaign-sessions-19.4-coop-guest',
    payloadPath: 'campaign/coop-guest-proposal.campaign.json',
    provenance: {
      genesisSource:
        'hand-authored:harden-gm-two-player-campaign-sessions@19.4-coop-guest',
      mintedAt: '2026-09-02T12:13:00.000Z',
      baseCommit: 'e67d2bf9c160e49bea97989e42990a4a6103e156',
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
