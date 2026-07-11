/**
 * Fast-Forward Pack Dump Helper (task 5.1)
 *
 * The mint-from-fast-forward minter mode (design D7 layer 1) needs to dump
 * a headless `fastForwardCampaign()` run's end-state campaign into a
 * `CampaignPackPayload` — the SAME shape `loadCampaignPack` expects (design
 * D3/D4). Two things a live-UI mint (task 3.2's flow-checkpoint minter,
 * which captures via a live `GET /api/campaigns/:id`) gets for free that a
 * headless jest run does not:
 *
 *  1. **A roster-projection snapshot.** The live GET returns whatever the
 *     server persisted, which already includes `rosterProjection` (the
 *     server mirrors `useCampaignRosterStore` on every PUT). A headless
 *     fast-forward run never PUTs anything — `fastForwardCampaign()` drives
 *     `useCampaignStore` directly (module doc: "imports nothing from
 *     dayAdvancement.ts... loops `useCampaignStore().advanceDay()`") — so
 *     this module builds the SAME `SerializedCampaignRosterState` shape
 *     `useCampaignPersistenceStore.ts`'s own (private, unexported)
 *     `readLiveRosterSnapshot`/`serializeRosterEntry`/`cloneRosterMission`
 *     trio builds, reading `useCampaignRosterStore.getState()` directly
 *     (the fast-forward fixture seeds this store — `fastForwardFixture.ts`'s
 *     `seedFastForwardRoster` — and `postBattleProcessor`'s pilot-attribution
 *     writes land there too, design D9). Duplicated here rather than
 *     exporting the private helpers: the persistence store's version reads
 *     `roster.campaignId` implicitly (the store IS the roster for whichever
 *     campaign is currently loaded); this version takes `campaignId`
 *     explicitly so a minter never accidentally serializes an unrelated
 *     roster.
 *  2. **The envelope wrap + canonicalization pass**, composed here as one
 *     call so every fast-forward mint mode (economy, maintenance) shares
 *     the exact same dump path — `buildSerializedCampaign` (pre-existing
 *     `campaign-persistence` production code, `campaignEnvelope.ts:32-47`,
 *     consumed as-is per the zero-production-touch non-goal) followed by
 *     `canonicalizePackPayload` (design D11, task 2.2) so every fast-forward
 *     pack payload becomes a true id-template exactly like the
 *     flow-checkpoint packs (groups 3/4).
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D7 layer 1, D11)
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type {
  SerializedCampaignRosterEntry,
  SerializedCampaignRosterMissionRecord,
  SerializedCampaignRosterState,
} from '@/types/campaign/SerializedCampaign';

import {
  buildSerializedCampaign,
  getDeviceId,
} from '@/lib/campaign/persistence';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

import type { CampaignPackPayload } from './packSchemas';

import { campaignPackSchema } from './packSchemas';
import { canonicalizePackPayload } from './packStamping';

// =============================================================================
// Roster-projection snapshot (mirrors useCampaignPersistenceStore.ts's
// private readLiveRosterSnapshot/serializeRosterEntry/cloneRosterMission —
// see module doc point 1 for why this cannot simply import them).
// =============================================================================

function dateToIsoOrEpoch(value: Date | string | undefined): string {
  if (!value) return new Date(0).toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date(0).toISOString()
    : date.toISOString();
}

function dateToIsoOrUndefined(
  value: Date | string | undefined,
): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** `ICampaignRosterEntry` -> `SerializedCampaignRosterEntry` — the exact transform `useCampaignPersistenceStore.ts`'s `serializeRosterEntry` performs. */
function serializeRosterPilotEntry(
  entry: ICampaignRosterEntry,
): SerializedCampaignRosterEntry {
  const { hireDate, lastPromotionDate, salary, ...rest } = entry;
  const promotionDate = dateToIsoOrUndefined(lastPromotionDate);
  return {
    ...rest,
    hireDate: dateToIsoOrEpoch(hireDate),
    ...(salary ? { salary: salary.amount } : {}),
    ...(promotionDate ? { lastPromotionDate: promotionDate } : {}),
  };
}

/**
 * Builds a `SerializedCampaignRosterState` snapshot from the LIVE
 * `useCampaignRosterStore` for `campaignId` — the roster-projection
 * companion `buildSerializedCampaign`'s `rosterProjection` parameter
 * expects. Throws if the roster store's own `campaignId` doesn't match
 * (a mint driving the wrong roster into a pack is exactly the kind of
 * silent-drift bug this capability's whole fail-loud posture defends
 * against — never soft-skip to an empty/mismatched projection).
 */
export function buildFastForwardRosterProjectionSnapshot(
  campaignId: string,
): SerializedCampaignRosterState {
  const roster = useCampaignRosterStore.getState();
  if (roster.campaignId !== campaignId) {
    throw new Error(
      `buildFastForwardRosterProjectionSnapshot: roster store's campaignId "${roster.campaignId}" does not match requested "${campaignId}" — the fast-forward fixture must seed the roster store before minting`,
    );
  }
  return {
    campaignId,
    units: roster.units.map((unit) => ({ ...unit })),
    pilots: roster.pilots.map(serializeRosterPilotEntry),
    missions: roster.missions.map(
      (mission): SerializedCampaignRosterMissionRecord => ({
        ...mission,
        deployedUnitIds: [...mission.deployedUnitIds],
      }),
    ),
    activeMissionId: roster.activeMissionId,
    missionCount: roster.missionCount,
  };
}

// =============================================================================
// Dump + canonicalize (module doc point 2)
// =============================================================================

export interface DumpFastForwardCampaignPackOptions {
  readonly packId: string;
  /** Defaults to `getDeviceId()` (the same call `putLiveCampaign` makes). */
  readonly originDeviceId?: string;
}

export interface DumpFastForwardCampaignPackResult {
  readonly payload: CampaignPackPayload;
}

/**
 * Wraps a fast-forward run's end-state `ICampaign` in a `SerializedCampaign`
 * envelope (production `buildSerializedCampaign`, unmodified) with a live
 * roster-projection snapshot attached, then runs it through
 * `canonicalizePackPayload` (design D11) so the result is a true id-template
 * ready for `campaignPackSchema.parse` + committing to
 * `e2e/scenario-packs/campaign/`.
 *
 * `version` is stamped `1` (the envelope's own first-write version, mirroring
 * a freshly-`createCampaign`'d campaign's first save) — the pack loader
 * always PUTs with `baseVersion: 0` regardless (design: "a fresh stamped id
 * is always an unseen row"), so this value is never read by the load path.
 */
export function dumpAndCanonicalizeFastForwardCampaign(
  campaign: ICampaign,
  options: DumpFastForwardCampaignPackOptions,
): DumpFastForwardCampaignPackResult {
  const rosterProjection = buildFastForwardRosterProjectionSnapshot(
    campaign.id,
  );
  const envelope = buildSerializedCampaign(
    campaign,
    options.originDeviceId ?? getDeviceId(),
    1,
    rosterProjection,
  );

  // Fail-loud on the raw dump BEFORE canonicalizing (mirrors
  // `e2e/scenario-pack-minting.spec.ts`'s `captureCanonicalizeAndWrite` —
  // a malformed dump must never silently become a malformed committed
  // pack).
  const captured = campaignPackSchema.parse(envelope);

  const { payload: canonicalized } = canonicalizePackPayload(captured, {
    packId: options.packId,
  });

  // Round-trip validation (mirrors the flow-checkpoint minter's own
  // acceptance: "the canonicalized... payload must still satisfy the
  // campaign pack schema").
  campaignPackSchema.parse(canonicalized);

  return { payload: canonicalized };
}
