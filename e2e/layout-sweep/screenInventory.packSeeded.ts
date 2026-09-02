import {
  CAMPAIGN_NAV_OVERLAP_TARGETS,
  CAMPAIGN_NAV_PRIMARY_AFFORDANCE,
  COMBAT_HEX_MAP_CANVAS_TARGET,
  COMBAT_TACTICAL_TURN_RAIL_TARGET,
} from './screenInventory.chrome';
import {
  affordance,
  type CheckTarget,
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

/**
 * The co-op lifecycle UI IS swept now (umbrella 19.4, finding #32 closed).
 *
 * It previously was not, and could not be: these surfaces mount only on a
 * campaign carrying a `coopSession`, and no scenario pack seeded one, so
 * `CampaignCoopRouteSurface` rendered null on every swept route. The
 * `coop-host-review` and `coop-guest-proposal` packs fix that, and the two
 * notes below replace the note that used to record the gap.
 *
 * The gap was recorded as a `note` rather than a `QuarantineEntry`, and
 * the reasoning is worth keeping now that the note is being replaced: a
 * quarantine is a SUPPRESSION - `viewport-layout-sweep.spec.ts` looks one
 * up by viewport+check and skips that check - so filing it as a quarantine
 * would have switched OFF the clickable check that already passed on this
 * screen, reducing real coverage in order to document a gap in coverage.
 */
const COOP_HOST_SWEPT =
  ' CO-OP HOST SURFACE: this entry is seeded by the `coop-host-review` pack ' +
  'rather than `navigation`, because `host-gm-review-surface` mounts only on ' +
  'a campaign carrying a host `coopSession`. The GM review surface is checked ' +
  'here as an overlap target. NON-CLAIM: the surface is swept in its EMPTY ' +
  "state, posture `live`. Its `pending` posture needs a guest's proposal, " +
  'which lives in the in-memory runtime session (`coopRuntimeSession.ts`: ' +
  '"not persisted campaign data") and has no front-door control to create -- ' +
  'so it is covered by jest rows only, and becomes sweepable when the sweep ' +
  'becomes two-browser.';

const COOP_GUEST_SWEPT =
  ' CO-OP GUEST SURFACES: this entry is seeded by the `coop-guest-proposal` ' +
  'pack rather than `navigation`, because `guest-proposal-surface` and the ' +
  '`campaign-sync-state` banner it carries mount only on a campaign carrying ' +
  'a guest `coopSession`. Both are checked here as overlap targets. The ' +
  'banner renders posture `blocked` (no grant token in a single-browser ' +
  'sweep), which is a real posture, not a placeholder. NON-CLAIM: the other ' +
  'four mutation sub-routes (personnel / mech-bay / hiring / contract-market) ' +
  'stay on the `navigation` pack and do NOT cover the guest surface -- one ' +
  'route is enough to sweep the surface, and repointing all five would swap ' +
  'their seeded state wholesale for no extra coverage.';

/**
 * Routes repointed at a co-op pack so the lifecycle surfaces actually
 * mount. A screen entry names ONE pack, and the guard requires exactly one
 * classification per manifest route, so these could not be added as
 * parallel entries alongside the navigation-pack ones -- the existing
 * entries are repointed instead, keeping their campaign-nav affordances.
 */
const COOP_ROUTE_OVERRIDES: Readonly<
  Record<
    string,
    {
      readonly pack: 'coop-host-review' | 'coop-guest-proposal';
      readonly targets: readonly CheckTarget[];
      readonly note: string;
    }
  >
> = {
  '/gameplay/campaigns/[id]': {
    pack: 'coop-host-review',
    targets: [
      affordance({
        label: 'host GM review surface',
        testId: 'host-gm-review-surface',
      }),
    ],
    note: COOP_HOST_SWEPT,
  },
  '/gameplay/campaigns/[id]/finances': {
    pack: 'coop-guest-proposal',
    targets: [
      affordance({
        label: 'guest proposal surface',
        testId: 'guest-proposal-surface',
      }),
      affordance({
        label: 'campaign sync posture banner',
        testId: 'campaign-sync-state',
      }),
    ],
    note: COOP_GUEST_SWEPT,
  },
};

export const packSeededEntries: readonly PackSeededScreenEntry[] = [
  ...CAMPAIGN_SUBROUTE_LABELS.map(([pattern, label]): PackSeededScreenEntry => {
    const coop = COOP_ROUTE_OVERRIDES[pattern];
    return {
      id: `pack-seeded-${pattern.replace(/[[\]/]/g, '-').replace(/^-+|-+$/g, '')}`,
      class: 'pack-seeded',
      label,
      manifestPaths: [pattern],
      pack: coop?.pack ?? 'navigation',
      navigation: 'direct-goto',
      routeTemplate: pattern.replace('[id]', '{id}'),
      primaryAffordances: CAMPAIGN_NAV_PRIMARY_AFFORDANCE,
      // Co-op surfaces ride as OVERLAP targets, not primary affordances:
      // they are panels rather than the screen's call to action, which is
      // the same call `pack-seeded-mission-launch` makes for its briefing
      // panel. The campaign-nav primary affordance is unchanged, so
      // repointing the pack does not drop the check that already passed.
      overlapTargets: coop
        ? [...CAMPAIGN_NAV_OVERLAP_TARGETS, ...coop.targets]
        : CAMPAIGN_NAV_OVERLAP_TARGETS,
      quarantine: [],
      note:
        "Campaign id sourced from the pack loader's post-navigation URL (design D5) -- never pack payload internals." +
        (coop?.note ?? ''),
    };
  }),
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
