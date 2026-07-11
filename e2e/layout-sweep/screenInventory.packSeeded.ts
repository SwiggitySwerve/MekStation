import {
  CAMPAIGN_NAV_OVERLAP_TARGETS,
  CAMPAIGN_NAV_PRIMARY_AFFORDANCE,
  COMBAT_HEX_MAP_CANVAS_TARGET,
  COMBAT_TACTICAL_TURN_RAIL_TARGET,
} from './screenInventory.chrome';
import {
  affordance,
  type PackSeededScreenEntry,
} from './screenInventory.types';

// ============================================================================
// Pack-seeded screens (18) -- W4-gated (group 5). Swept as of this change
// (task 5.1): the gate (task 5.0) verified `e2e/helpers/scenarioPackLoading.ts`
// exports `loadCampaignPack`/`loadEncounterPack` and the navigation/combat
// pilot packs exist with manifest entries, plus D10a's discovery precondition
// (the navigation pack's missions screen surfaces the mission launch-briefing
// affordance) -- confirmed green via `navigation-briefing.parity.spec.ts`, no
// reclassify-to-excluded fallback needed. `class` stays "pack-seeded" (route
// taxonomy is unchanged by whether this change currently sweeps a class);
// `PACK_SEEDED_SWEPT_ENTRIES` below is the sweep spec's iteration surface.
// ============================================================================

const CAMPAIGN_SUBROUTE_LABELS: ReadonlyArray<readonly [string, string]> = [
  ['/gameplay/campaigns/[id]', 'campaign detail'],
  ['/gameplay/campaigns/[id]/acquisitions', 'campaign acquisitions'],
  ['/gameplay/campaigns/[id]/contract-market', 'campaign contract market'],
  ['/gameplay/campaigns/[id]/finances', 'campaign finances'],
  ['/gameplay/campaigns/[id]/forces', 'campaign forces'],
  ['/gameplay/campaigns/[id]/gm-ledger', 'campaign GM ledger'],
  ['/gameplay/campaigns/[id]/hiring', 'campaign hiring'],
  ['/gameplay/campaigns/[id]/log', 'campaign log'],
  ['/gameplay/campaigns/[id]/mech-bay', 'campaign mech bay'],
  ['/gameplay/campaigns/[id]/medical-bay', 'campaign medical bay'],
  ['/gameplay/campaigns/[id]/missions', 'campaign missions'],
  ['/gameplay/campaigns/[id]/personnel', 'campaign personnel'],
  ['/gameplay/campaigns/[id]/prestige-morale', 'campaign prestige & morale'],
  ['/gameplay/campaigns/[id]/repair-bay', 'campaign repair bay'],
  ['/gameplay/campaigns/[id]/salvage', 'campaign salvage'],
  ['/gameplay/campaigns/[id]/starmap', 'campaign starmap'],
];

export const packSeededEntries: readonly PackSeededScreenEntry[] = [
  ...CAMPAIGN_SUBROUTE_LABELS.map(
    ([pattern, label]): PackSeededScreenEntry => ({
      id: `pack-seeded-${pattern.replace(/[[\]/]/g, '-').replace(/^-+|-+$/g, '')}`,
      class: 'pack-seeded',
      label,
      manifestPaths: [pattern],
      pack: 'navigation',
      navigation: 'direct-goto',
      routeTemplate: pattern.replace('[id]', '{id}'),
      primaryAffordances: CAMPAIGN_NAV_PRIMARY_AFFORDANCE,
      overlapTargets: CAMPAIGN_NAV_OVERLAP_TARGETS,
      quarantine: [],
      note: "Campaign id sourced from the navigation-pack loader's post-navigation URL (design D5) -- never pack payload internals.",
    }),
  ),
  {
    id: 'pack-seeded-mission-launch',
    class: 'pack-seeded',
    label: 'mission launch briefing',
    manifestPaths: ['/gameplay/campaigns/[id]/missions/[missionId]/launch'],
    pack: 'navigation',
    navigation: 'in-page-discovery',
    primaryAffordances: CAMPAIGN_NAV_PRIMARY_AFFORDANCE,
    overlapTargets: [
      ...CAMPAIGN_NAV_OVERLAP_TARGETS,
      affordance({
        label: 'mission launch briefing panel',
        testId: 'mission-launch-briefing',
      }),
    ],
    quarantine: [],
    note:
      'Reached only via in-page discovery from the pack-seeded missions screen (design D10a): goto the ' +
      "missions subroute, click the mission's launch/briefing affordance -- never construct a mission id, " +
      "and never actuate the launch control itself (the sweep's `expectClickable` never calls `.click()`, " +
      'but the shared campaign-nav Dashboard tab, not `launch-mission-direct`, is the declared primary ' +
      "affordance here regardless). Task 5.0's gate verified the navigation pack's documented target state " +
      'actually surfaces the discovery affordance (navigation-briefing.parity.spec.ts, green); the ' +
      'reclassify-to-excluded fallback (D10a) was not needed.',
  },
  {
    id: 'pack-seeded-game-detail',
    class: 'pack-seeded',
    label: 'game session detail',
    manifestPaths: ['/gameplay/games/[id]'],
    pack: 'combat',
    navigation: 'direct-goto',
    routeTemplate: '/gameplay/games/{id}',
    primaryAffordances: [COMBAT_TACTICAL_TURN_RAIL_TARGET],
    overlapTargets: [COMBAT_TACTICAL_TURN_RAIL_TARGET],
    canvasLocator: COMBAT_HEX_MAP_CANVAS_TARGET,
    quarantine: [],
    note: "Match id sourced from the combat-pack loader's post-navigation URL (design D5).",
  },
];
