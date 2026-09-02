/**
 * Every pack-seeded screen in the inventory must actually be swept
 * (umbrella 19.4, finding #39).
 *
 * The failure this exists for: `viewport-layout-sweep.spec.ts` selected its
 * campaign screens with `entry.pack === 'navigation'`. When two entries were
 * repointed at the new co-op packs so the co-op surfaces would mount
 * (`/gameplay/campaigns/[id]` -> `coop-host-review`,
 * `/gameplay/campaigns/[id]/finances` -> `coop-guest-proposal`), the pack
 * literal no longer matched and NO describe block iterated them. The sweep
 * went from 51 screens to 49 and stayed green, because nothing asserted that
 * the inventory and the sweep's iteration surface agree. A change that meant
 * to ADD two surfaces silently REMOVED two routes.
 *
 * This guard is deliberately a JEST test, for the same reason
 * `coopPackCoverage.test.ts` is: the Playwright suites need a dev server this
 * worktree cannot start, so a red-first proof written there could not be
 * watched failing before the fix -- and an unwatched red is not a red.
 *
 * It loads the grouping through `packSeededGroups.ts`, the SAME module the
 * sweep spec builds its describe blocks from. That is the whole point: a
 * guard that re-implemented the grouping would assert its own copy agrees
 * with the inventory while the spec quietly did something else -- which is
 * exactly the shape of the bug above.
 */

import type { PackSeededScreenEntry } from '../../../../e2e/layout-sweep/screenInventory.types';

import {
  encounterPackSeededEntries,
  groupPackSeededEntriesByPack,
  PACK_SEEDED_CAMPAIGN_PACK_IDS,
  sweptPackSeededEntryIds,
} from '../../../../e2e/layout-sweep/packSeededGroups';
import { PACK_SEEDED_SWEPT_ENTRIES } from '../../../../e2e/layout-sweep/screenInventory';
import { SCENARIO_PACK_MANIFEST } from '../../../../e2e/scenario-packs/manifest';

/**
 * An entry naming a pack NOTHING in the module knows about. The cast is the
 * point: `PackSeededScreenEntry['pack']` is a closed union, so this state is
 * unreachable through the type system and no real inventory entry can stand
 * in for it -- but it is exactly the state a future repoint produces the
 * moment someone adds a pack to the union and forgets the grouping map.
 */
const UNKNOWN_PACK_ENTRY = {
  id: 'synthetic-unknown-pack',
  class: 'pack-seeded',
  label: 'synthetic screen on an unmapped pack',
  manifestPaths: ['/gameplay/campaigns/[id]/synthetic'],
  pack: 'not-a-registered-pack',
  navigation: 'direct-goto',
  routeTemplate: '/gameplay/campaigns/{id}/synthetic',
  primaryAffordances: [],
  overlapTargets: [],
  quarantine: [],
} as unknown as PackSeededScreenEntry;

describe('pack-seeded sweep coverage', () => {
  it('has pack-seeded entries to check at all', () => {
    // Guards the guard: an inventory that stopped exporting entries would
    // make every row below vacuously green.
    expect(PACK_SEEDED_SWEPT_ENTRIES.length).toBeGreaterThan(0);
  });

  it('sweeps every pack-seeded inventory entry', () => {
    // The finding-#39 row. `sweptPackSeededEntryIds` is derived from the
    // same grouping the spec loops, so an entry missing here is an entry no
    // describe block will ever iterate.
    const swept = sweptPackSeededEntryIds(PACK_SEEDED_SWEPT_ENTRIES);
    const unswept = PACK_SEEDED_SWEPT_ENTRIES.filter(
      (entry) => !swept.has(entry.id),
    ).map((entry) => `${entry.id} (pack: ${entry.pack})`);

    expect(unswept).toEqual([]);
  });

  it('maps every seeded campaign pack name to a registered manifest pack', () => {
    // The second half of the same failure: a short name the grouping does
    // not map is a pack the sweep cannot load, and a short name mapped to
    // an unregistered id would fail at `loadCampaignPack` time instead of
    // here. Both are wiring errors this row names precisely.
    const campaignShortNames = PACK_SEEDED_SWEPT_ENTRIES.map(
      (entry) => entry.pack,
    ).filter(
      (pack, index, all) => pack !== 'combat' && all.indexOf(pack) === index,
    );
    const registeredIds = new Set(
      SCENARIO_PACK_MANIFEST.map((entry) => entry.id),
    );

    const unmapped = campaignShortNames.filter((name) => {
      const manifestId = (
        PACK_SEEDED_CAMPAIGN_PACK_IDS as Record<string, string | undefined>
      )[name];
      return !manifestId || !registeredIds.has(manifestId);
    });

    expect(unmapped).toEqual([]);
  });

  it('leaves an entry on an unmapped pack in NO group at all', () => {
    // The row behind `encounterPackSeededEntries`' positive filter on
    // `combat`. Written as the COMPLEMENT of the campaign map
    // (`!(entry.pack in PACK_SEEDED_CAMPAIGN_PACK_IDS)`) it passes every
    // other row in this file by construction: an entry lands in one bucket
    // or the other no matter how badly the campaign map drifts, so
    // `sweptPackSeededEntryIds` covers the inventory unconditionally. That
    // mutant survived the suite, because nothing in the real inventory
    // names an unmapped pack -- the intention had no row behind it.
    //
    // The synthetic entry is that missing row. An unmapped pack has no
    // `loadCampaignPack` id and no `loadEncounterPack` call, so no block
    // CAN sweep it; the grouping must say so rather than quietly filing it
    // under combat, where it would be swept against the wrong seeded state
    // while reporting success.
    const withUnknown = [...PACK_SEEDED_SWEPT_ENTRIES, UNKNOWN_PACK_ENTRY];

    const groupedIds = groupPackSeededEntriesByPack(withUnknown).flatMap(
      (group) => group.entries.map((entry) => entry.id),
    );
    const encounterIds = encounterPackSeededEntries(withUnknown).map(
      (entry) => entry.id,
    );

    expect(groupedIds).not.toContain(UNKNOWN_PACK_ENTRY.id);
    expect(encounterIds).not.toContain(UNKNOWN_PACK_ENTRY.id);
    // And therefore the coverage check reports it, rather than swallowing it.
    expect(
      sweptPackSeededEntryIds(withUnknown).has(UNKNOWN_PACK_ENTRY.id),
    ).toBe(false);
  });

  it('loads a pack whose target route the group actually sweeps', () => {
    // "Registered" is not enough, and a mutant proved it: repointing
    // `coop-guest-proposal` at `navigation-briefing` left every row above
    // green, because `navigation-briefing` IS a registered pack. The sweep
    // would then load the navigation campaign for the finances group, the
    // guest co-op surface would never mount, and the repoint that this
    // whole arc exists for would be silently undone.
    //
    // So bind the mapping to something only the RIGHT pack satisfies: the
    // pack's `targetRoute` -- the route `loadCampaignPack` lands on, and
    // the route `campaignIdFromUrl` reads the stamped id out of -- must be
    // one of the routes the group sweeps.
    const routelessGroups: string[] = [];
    const mismatched: string[] = [];

    for (const group of groupPackSeededEntriesByPack(
      PACK_SEEDED_SWEPT_ENTRIES,
    )) {
      const manifestEntry = SCENARIO_PACK_MANIFEST.find(
        (candidate) => candidate.id === group.campaignPackId,
      );
      const sweptRoutes = group.entries
        .map((entry) => entry.routeTemplate)
        .filter((template): template is string => Boolean(template));

      if (sweptRoutes.length === 0) {
        // A group of discovery-only screens has no route to match against;
        // recorded rather than silently skipped so the row cannot go
        // vacuous the way the sweep itself did.
        routelessGroups.push(group.packId);
        continue;
      }
      if (!sweptRoutes.includes(manifestEntry?.targetRoute ?? '')) {
        mismatched.push(
          `${group.packId} -> ${group.campaignPackId} (targets ${manifestEntry?.targetRoute ?? 'nothing'})`,
        );
      }
    }

    expect(mismatched).toEqual([]);
    expect(routelessGroups).toEqual([]);
  });

  it('puts every campaign group under exactly one pack load', () => {
    // A duplicated group would load the same pack twice and sweep the same
    // screen twice under two campaign ids -- cheap to assert, and the
    // failure mode a hand-written grouping loop invites.
    const packIds = groupPackSeededEntriesByPack(PACK_SEEDED_SWEPT_ENTRIES).map(
      (group) => group.packId,
    );

    expect(new Set(packIds).size).toBe(packIds.length);
  });

  it('never routes an encounter-pack entry through a campaign group', () => {
    // The combat entry is seeded by `loadEncounterPack`, not
    // `loadCampaignPack`. If it drifted into a campaign group the sweep
    // would try to load it as a campaign pack and fail confusingly.
    const campaignIds = new Set(
      groupPackSeededEntriesByPack(PACK_SEEDED_SWEPT_ENTRIES).flatMap((group) =>
        group.entries.map((entry) => entry.id),
      ),
    );
    const encounterIds = encounterPackSeededEntries(
      PACK_SEEDED_SWEPT_ENTRIES,
    ).map((entry) => entry.id);

    expect(encounterIds.filter((id) => campaignIds.has(id))).toEqual([]);
    expect(encounterIds.length).toBeGreaterThan(0);
  });
});
