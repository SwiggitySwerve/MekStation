/**
 * How the viewport sweep groups its pack-seeded screens (umbrella 19.4,
 * finding #39).
 *
 * This grouping used to live inline in `viewport-layout-sweep.spec.ts` as
 * `PACK_SEEDED_SWEPT_ENTRIES.filter(entry => entry.pack === 'navigation')`,
 * and that hardcoded literal is what lost two routes: repointing
 * `/gameplay/campaigns/[id]` at `coop-host-review` and
 * `/gameplay/campaigns/[id]/finances` at `coop-guest-proposal` so the co-op
 * surfaces would mount left both entries matching no block at all. The sweep
 * shrank from 51 screens to 49 and reported success.
 *
 * So the grouping lives here, as data rather than a filter literal: one
 * campaign group per pack present among the entries, created automatically
 * for any pack a future entry names. The spec builds its describe blocks
 * from `groupPackSeededEntriesByPack`, and the Jest guard
 * (`src/__tests__/unit/layoutSweep/packSeededSweepCoverage.test.ts`) asserts
 * the result covers the whole inventory -- both reading the SAME function,
 * which is the only arrangement in which the guard proves anything about
 * what the sweep actually iterates.
 *
 * Playwright-free on purpose: the guard is a Jest test, and importing
 * `@playwright/test` (or `sharp`, via `helpers/layout`) blows up under Jest.
 * Only a type import from `screenInventory.types` appears below.
 */

import type { PackSeededScreenEntry } from './screenInventory.types';

/**
 * Inventory short pack name -> the manifest pack id `loadCampaignPack`
 * takes. The two are NOT interchangeable: the inventory's `pack` field says
 * `navigation`, while `e2e/scenario-packs/manifest.ts` registers
 * `navigation-briefing`. The co-op names happen to coincide with their
 * manifest ids; that coincidence is not a rule, which is why the mapping is
 * written out rather than inferred, and why the guard asserts every value
 * here resolves to a registered manifest entry.
 *
 * `combat` is deliberately absent: it is an ENCOUNTER pack, loaded by
 * `loadEncounterPack`, and belongs to `encounterPackSeededEntries` below.
 */
export const PACK_SEEDED_CAMPAIGN_PACK_IDS = {
  navigation: 'navigation-briefing',
  'coop-host-review': 'coop-host-review',
  'coop-guest-proposal': 'coop-guest-proposal',
} as const;

export type CampaignSeedPackName = keyof typeof PACK_SEEDED_CAMPAIGN_PACK_IDS;
export type CampaignSeedManifestId =
  (typeof PACK_SEEDED_CAMPAIGN_PACK_IDS)[CampaignSeedPackName];

/** One campaign pack's screens, swept under a single pack load. */
export interface PackSeededCampaignGroup {
  /** The inventory short name, and the describe block's label. */
  readonly packId: CampaignSeedPackName;
  /** The manifest id the group's `loadCampaignPack` call passes. */
  readonly campaignPackId: CampaignSeedManifestId;
  /** Every entry seeded by this pack, in inventory order. */
  readonly entries: readonly PackSeededScreenEntry[];
}

/** True when a pack name is one this module knows how to campaign-load. */
function isCampaignSeedPackName(pack: string): pack is CampaignSeedPackName {
  return pack in PACK_SEEDED_CAMPAIGN_PACK_IDS;
}

/**
 * Group the campaign-pack-seeded entries by the pack that seeds them, in
 * first-appearance order. A pack with no entries produces no group (nothing
 * to sweep, so nothing to load).
 */
export function groupPackSeededEntriesByPack(
  entries: readonly PackSeededScreenEntry[],
): readonly PackSeededCampaignGroup[] {
  // An array accumulator rather than a Map: `tsconfig`'s target does not
  // allow spreading a Map iterator without `downlevelIteration`, and the
  // group count here is single digits.
  const groups: Array<{
    packId: CampaignSeedPackName;
    campaignPackId: CampaignSeedManifestId;
    entries: PackSeededScreenEntry[];
  }> = [];
  for (const entry of entries) {
    const pack = entry.pack;
    if (!isCampaignSeedPackName(pack)) continue;
    const existing = groups.find((group) => group.packId === pack);
    if (existing) {
      existing.entries.push(entry);
      continue;
    }
    groups.push({
      packId: pack,
      campaignPackId: PACK_SEEDED_CAMPAIGN_PACK_IDS[pack],
      entries: [entry],
    });
  }
  return groups;
}

/**
 * The encounter-pack-seeded entries, swept by their own block.
 *
 * A POSITIVE filter on `combat`, never "everything the campaign map did not
 * claim". The complement version passes the coverage guard by construction
 * -- every entry would land in one bucket or the other no matter how badly
 * the campaign map drifted -- which is precisely the vacuous green that let
 * finding #39 through in the first place. An entry naming a pack neither
 * side claims must fall out of BOTH and turn the guard red.
 */
export function encounterPackSeededEntries(
  entries: readonly PackSeededScreenEntry[],
): readonly PackSeededScreenEntry[] {
  return entries.filter((entry) => entry.pack === 'combat');
}

/** Every entry id the sweep actually iterates, across every block. */
export function sweptPackSeededEntryIds(
  entries: readonly PackSeededScreenEntry[],
): ReadonlySet<string> {
  return new Set([
    ...groupPackSeededEntriesByPack(entries).flatMap((group) =>
      group.entries.map((entry) => entry.id),
    ),
    ...encounterPackSeededEntries(entries).map((entry) => entry.id),
  ]);
}
