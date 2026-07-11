/**
 * Screen inventory for the viewport layout sweep (design D5/D9/D10).
 *
 * Derives every sweep-relevant classification from `e2e/app-shell-route-manifest.json`
 * -- the existing route source of truth `app-shell-route-proof.spec.ts` already
 * consumes -- and layers sweep metadata on top. This file never forks the route
 * list: `manifestPaths` on every entry names the exact manifest path(s) or
 * delegated-route pattern(s) the entry classifies, and the inventory guard test
 * (`screenInventory.guard.spec.ts`) walks the manifest and fails when a route is
 * unclassified.
 *
 * Five classes (design D5):
 *  - `standalone`    -- swept now, a literal primary/recovery route.
 *  - `recovery`       -- swept now, a literal recovery route.
 *  - `static-catalog` -- swept now, a delegated route with a known-stable concrete
 *                        slug (no pack/seed dependency).
 *  - `pack-seeded`    -- NOT swept yet (group 5, gated on the W4 scenario-pack
 *                        loaders landing); classified now so the guard's coverage
 *                        stays exhaustive as routes are added.
 *  - `excluded`        -- never swept by this change; each entry carries a
 *                        non-empty reason (design D10 for the two contract-risky
 *                        routes; "no covering pack" for the rest).
 *
 * Per-viewport check-target applicability (design D9) is the load-bearing
 * mechanism here: every check target (primary affordance or overlap-group
 * member) carries an optional `viewports` allowlist. Omitting it means
 * "applicable at all four sweep viewports" (the common case -- most page
 * content does not collapse with the app shell's chrome). The one target group
 * that *does* collapse by design -- the TopBar's three mutually exclusive nav
 * variants (labeled >=1024, icon-only 768-1023, hamburger-only <768; see
 * `src/components/common/TopBar.tsx:108,158,241`) -- is declared once below as
 * the shared "app shell chrome" group and referenced by the dashboard entry,
 * never re-declared per screen (D9 rule 5).
 */

import type { Locator, Page } from '@playwright/test';

import appShellRouteManifest from '../app-shell-route-manifest.json';
import { SWEEP_VIEWPORTS } from '../helpers/layout';

// ============================================================================
// Viewport labels -- derived from SWEEP_VIEWPORTS (design D4), never copied.
// ============================================================================

export type SweepViewportLabel = (typeof SWEEP_VIEWPORTS)[number]['label'];

/** All four sweep viewport labels, in SWEEP_VIEWPORTS order. */
export const ALL_SWEEP_VIEWPORT_LABELS: readonly SweepViewportLabel[] =
  SWEEP_VIEWPORTS.map((viewport) => viewport.label);

// ============================================================================
// Check-target declaration (design D9): a locator plus optional per-viewport
// applicability. Omitting `viewports` means "applicable at all four".
// ============================================================================

type AffordanceRole = Parameters<Page['getByRole']>[0];

/**
 * Declarative locator strategy for a check target, mirroring the shape
 * `app-shell-route-proof.spec.ts` already uses for its own affordances (same
 * role/testId/selector/text vocabulary) so the inventory's authoring style
 * stays familiar. `within` optionally scopes the lookup to a CSS-selected
 * container first -- used by the app-shell chrome group to disambiguate the
 * TopBar's two structurally-distinct `<nav>` blocks regardless of which one
 * CSS currently shows.
 */
export interface AffordanceDescriptor {
  readonly label: string;
  readonly role?: AffordanceRole;
  readonly name?: string | RegExp;
  readonly testId?: string | RegExp;
  readonly selector?: string;
  readonly text?: string | RegExp;
  readonly within?: string;
}

/** A single check target: a resolvable locator plus its viewport applicability. */
export interface CheckTarget {
  readonly label: string;
  readonly resolve: (page: Page) => Locator;
  /** Sweep viewports this target is applicable at. Omit for "all four". */
  readonly viewports?: readonly SweepViewportLabel[];
}

/** Resolve an `AffordanceDescriptor` against a page (optionally pre-scoped). */
function affordanceLocator(
  page: Page,
  descriptor: AffordanceDescriptor,
): Locator {
  const scope: Page | Locator = descriptor.within
    ? page.locator(descriptor.within)
    : page;
  if (descriptor.testId) return scope.getByTestId(descriptor.testId).first();
  if (descriptor.selector) return scope.locator(descriptor.selector).first();
  if (descriptor.role) {
    return scope
      .getByRole(
        descriptor.role,
        descriptor.name ? { name: descriptor.name } : undefined,
      )
      .first();
  }
  if (descriptor.text) return scope.getByText(descriptor.text).first();
  throw new Error(
    `Affordance descriptor "${descriptor.label}" declares no locator strategy`,
  );
}

/** Build a `CheckTarget` from an `AffordanceDescriptor`, optionally viewport-scoped. */
function affordance(
  descriptor: AffordanceDescriptor,
  viewports?: readonly SweepViewportLabel[],
): CheckTarget {
  return {
    label: descriptor.label,
    resolve: (page) => affordanceLocator(page, descriptor),
    viewports,
  };
}

// ============================================================================
// Shared app-shell chrome group (design D9 rule 5) -- defined once, referenced
// by screens whose own primary affordance IS the TopBar chrome (the dashboard).
// Profile verified against src/components/common/TopBar.tsx: the labeled nav
// (`nav:nth-of-type(1)`) is `hidden ... lg:flex` (visible only >=1024), the
// icon-only nav (`nav:nth-of-type(2)`) is `hidden ... md:flex lg:hidden`
// (visible 768-1023), and the hamburger (`aria-label="Open menu"`) is
// `md:hidden` (the only nav affordance below 768).
// ============================================================================

const CHROME_LABELED_NAV = 'header nav:nth-of-type(1)';
const CHROME_ICON_NAV = 'header nav:nth-of-type(2)';

function chromeDropdown(
  menuName: 'Browse' | 'Tools' | 'Gameplay' | 'History',
): {
  readonly icon: CheckTarget;
  readonly labeled: CheckTarget;
} {
  const name = new RegExp(`^${menuName}$`, 'i');
  return {
    icon: affordance(
      {
        label: `app shell ${menuName.toLowerCase()} menu (tablet icon nav)`,
        within: CHROME_ICON_NAV,
        role: 'button',
        name,
      },
      ['tablet-portrait-768'],
    ),
    labeled: affordance(
      {
        label: `app shell ${menuName.toLowerCase()} menu (desktop labeled nav)`,
        within: CHROME_LABELED_NAV,
        role: 'button',
        name,
      },
      ['tablet-landscape-1024', 'desktop-1280'],
    ),
  };
}

const CHROME_HAMBURGER: CheckTarget = affordance(
  {
    label: 'app shell hamburger menu trigger',
    role: 'button',
    name: /Open menu/i,
  },
  ['mobile-375'],
);

const CHROME_BROWSE = chromeDropdown('Browse');
const CHROME_TOOLS = chromeDropdown('Tools');
const CHROME_GAMEPLAY = chromeDropdown('Gameplay');

/**
 * The dashboard's primary affordance at each sweep viewport: the browse menu
 * (icon variant at 768, labeled variant at 1024/1280) and the hamburger
 * trigger at 375 -- the mobile stand-in for every TopBar dropdown (design D9
 * Context: "the aria-label='Open menu' hamburger at 375").
 */
const APP_SHELL_CHROME_PRIMARY_AFFORDANCE: readonly CheckTarget[] = [
  CHROME_HAMBURGER,
  CHROME_BROWSE.icon,
  CHROME_BROWSE.labeled,
];

/** The dashboard's overlap group: every TopBar dropdown, per-viewport-scoped. */
const APP_SHELL_CHROME_OVERLAP_TARGETS: readonly CheckTarget[] = [
  CHROME_HAMBURGER,
  CHROME_BROWSE.icon,
  CHROME_BROWSE.labeled,
  CHROME_TOOLS.icon,
  CHROME_TOOLS.labeled,
  CHROME_GAMEPLAY.icon,
  CHROME_GAMEPLAY.labeled,
];

// ============================================================================
// Inventory entry types (design D5).
// ============================================================================

export type SweepClass =
  | 'standalone'
  | 'recovery'
  | 'static-catalog'
  | 'pack-seeded'
  | 'excluded';

export type LayoutCheckKind =
  | 'overflow'
  | 'overlap'
  | 'clickable'
  | 'non-blank-render';

/**
 * A pre-existing violation quarantined at authoring time (design D5/R2): a
 * documented, visible skip of exactly one check at one viewport, never a
 * silent filter and never a stand-in for by-design responsive collapse
 * (design D9 rule 2 -- collapse is applicability data, not quarantine).
 */
export interface QuarantineEntry {
  readonly viewport: SweepViewportLabel;
  readonly check: LayoutCheckKind;
  readonly reason: string;
  readonly followUp: string;
}

/**
 * Build one quarantine entry per sweep viewport for a violation that is
 * genuinely viewport-independent (a fixed line-height/padding target with no
 * responsive size classes, confirmed by reading its source) rather than a
 * per-width finding -- avoids repeating identical reason/followUp text four
 * times while keeping each entry individually reviewable (design D5).
 */
function quarantineAllViewports(
  check: LayoutCheckKind,
  reason: string,
  followUp: string,
): readonly QuarantineEntry[] {
  return ALL_SWEEP_VIEWPORT_LABELS.map((viewport) => ({
    viewport,
    check,
    reason,
    followUp,
  }));
}

interface BaseEntry {
  readonly id: string;
  readonly class: SweepClass;
  readonly label: string;
  /** Manifest primaryRoutes/recoveryRoutes path(s) or delegatedRoutes pattern(s) this entry classifies. */
  readonly manifestPaths: readonly string[];
}

/** A swept-now screen: standalone, recovery, or static-catalog. */
export interface SweptScreenEntry extends BaseEntry {
  readonly class: 'standalone' | 'recovery' | 'static-catalog';
  /** Concrete literal path the sweep navigates to. */
  readonly goto: string;
  /** At least one entry MUST be applicable at each of the four sweep viewports (design D9 rule 1). */
  readonly primaryAffordances: readonly CheckTarget[];
  /** Overlap check-target group -- defaults to the route's unconditional affordance set (design D5). */
  readonly overlapTargets: readonly CheckTarget[];
  /** Optional canvas-bearing locator for `expectNonBlankRender`. */
  readonly canvasLocator?: CheckTarget;
  /** Set when the screen reads viewport state only at mount (design R3) -- forces goto-per-viewport. */
  readonly remountPerViewport?: boolean;
  readonly quarantine?: readonly QuarantineEntry[];
}

/** A route pattern gated on the W4 scenario-pack loaders (group 5, not swept here). */
export interface PackSeededScreenEntry extends BaseEntry {
  readonly class: 'pack-seeded';
  readonly pack: 'navigation' | 'combat';
  readonly navigation: 'direct-goto' | 'in-page-discovery';
  readonly note?: string;
}

/** A route pattern this change never sweeps, with a mandatory documented reason. */
export interface ExcludedScreenEntry extends BaseEntry {
  readonly class: 'excluded';
  readonly reason: string;
  readonly followUp?: string;
}

export type ScreenInventoryEntry =
  | SweptScreenEntry
  | PackSeededScreenEntry
  | ExcludedScreenEntry;

// ============================================================================
// Standalone screens (28) -- primaryRoutes, one entry per unique underlying
// screen file ("/settings" and "/settings#vault" share one file and one entry).
// ============================================================================

const standaloneEntries: readonly SweptScreenEntry[] = [
  {
    id: 'dashboard',
    class: 'standalone',
    label: 'dashboard',
    manifestPaths: ['/'],
    goto: '/',
    primaryAffordances: APP_SHELL_CHROME_PRIMARY_AFFORDANCE,
    overlapTargets: [
      ...APP_SHELL_CHROME_OVERLAP_TARGETS,
      affordance({
        label: 'compendium card',
        role: 'link',
        name: /Compendium/i,
      }),
      affordance({
        label: 'custom units card',
        role: 'link',
        name: /My Units/i,
      }),
      affordance({
        label: 'unit builder card',
        role: 'link',
        name: /Unit Builder/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'onboarding',
    class: 'standalone',
    label: 'onboarding',
    manifestPaths: ['/onboarding'],
    goto: '/onboarding',
    primaryAffordances: [
      affordance({
        label: 'dashboard backlink',
        role: 'link',
        name: /Back to dashboard/i,
      }),
    ],
    quarantine: quarantineAllViewports(
      'clickable',
      'The plain-text "Back to dashboard" backlink (src/pages/onboarding.tsx, `text-sm` with no button ' +
        'chrome or responsive size classes) renders at ~16px tall -- below the 32px touch-target floor -- at ' +
        'every sweep viewport (the height is fixed regardless of container width). Pre-existing; first ' +
        'surfaced by this sweep.',
      "Give the onboarding backlink the same button-affordance padding PageLayout's backLink pattern uses elsewhere.",
    ),
    overlapTargets: [
      affordance({
        label: 'dashboard backlink',
        role: 'link',
        name: /Back to dashboard/i,
      }),
      affordance({
        label: 'glossary section',
        role: 'heading',
        name: /Glossary/i,
      }),
    ],
  },
  {
    id: 'gameplay-hub',
    class: 'standalone',
    label: 'gameplay hub',
    manifestPaths: ['/gameplay'],
    goto: '/gameplay',
    primaryAffordances: [
      affordance({
        label: 'quick game route card',
        role: 'link',
        name: /Quick Game/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'quick game route card',
        role: 'link',
        name: /Quick Game/i,
      }),
      affordance({
        label: 'campaigns route card',
        role: 'link',
        name: /Campaigns/i,
      }),
      affordance({
        label: 'encounters route card',
        role: 'link',
        name: /Encounters/i,
      }),
      affordance({ label: 'forces route card', role: 'link', name: /Forces/i }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-quick',
    class: 'standalone',
    label: 'quick game',
    manifestPaths: ['/gameplay/quick'],
    goto: '/gameplay/quick',
    primaryAffordances: [
      affordance({
        label: 'quick game setup CTA',
        role: 'button',
        name: /Start Quick Game Setup/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'quick game setup CTA',
        role: 'button',
        name: /Start Quick Game Setup/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-pilots',
    class: 'standalone',
    label: 'pilot roster',
    manifestPaths: ['/gameplay/pilots'],
    goto: '/gameplay/pilots',
    primaryAffordances: [
      affordance({
        label: 'create pilot CTA',
        role: 'button',
        name: /Create Pilot/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'pilot search',
        role: 'textbox',
        name: /Search pilots/i,
      }),
      affordance({
        label: 'create pilot CTA',
        role: 'button',
        name: /Create Pilot/i,
      }),
      affordance({
        label: 'active-only filter',
        role: 'button',
        name: /Active Only/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-pilots-create',
    class: 'standalone',
    label: 'create pilot',
    manifestPaths: ['/gameplay/pilots/create'],
    goto: '/gameplay/pilots/create',
    primaryAffordances: [
      affordance({
        label: 'pilot wizard close',
        role: 'button',
        name: /Close/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'pilot wizard heading',
        role: 'heading',
        name: /Create Pilot/i,
      }),
      affordance({
        label: 'pilot wizard close',
        role: 'button',
        name: /Close/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-forces',
    class: 'standalone',
    label: 'force roster',
    manifestPaths: ['/gameplay/forces'],
    goto: '/gameplay/forces',
    primaryAffordances: [
      affordance({ label: 'create force CTA', testId: 'create-force-btn' }),
    ],
    overlapTargets: [
      affordance({ label: 'force search', testId: 'force-search' }),
      affordance({ label: 'create force CTA', testId: 'create-force-btn' }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-forces-create',
    class: 'standalone',
    label: 'create force',
    manifestPaths: ['/gameplay/forces/create'],
    goto: '/gameplay/forces/create',
    // The submit action is disabled until the form is filled (validation-gated,
    // true at every viewport, not a layout concern) and the wizard's primary
    // affordance sits below the fold at 375px on a fresh page load; the name
    // input is always enabled and visible without scrolling, so it is the
    // primary affordance here. The submit button stays in overlapTargets.
    primaryAffordances: [
      affordance({ label: 'force name input', testId: 'force-name-input' }),
    ],
    overlapTargets: [
      affordance({ label: 'force name input', testId: 'force-name-input' }),
      affordance({ label: 'lance force type', testId: 'force-type-lance' }),
      affordance({ label: 'submit force action', testId: 'submit-force-btn' }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-campaigns',
    class: 'standalone',
    label: 'campaigns',
    manifestPaths: ['/gameplay/campaigns'],
    goto: '/gameplay/campaigns',
    primaryAffordances: [
      affordance({
        label: 'create campaign CTA',
        testId: 'create-campaign-btn',
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'create campaign CTA',
        testId: 'create-campaign-btn',
      }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-campaigns-create',
    class: 'standalone',
    label: 'create campaign',
    manifestPaths: ['/gameplay/campaigns/create'],
    goto: '/gameplay/campaigns/create',
    // The wizard's "Next" action sits below the fold at 375px on a fresh page
    // load (a long form -- name, description, presets); the name input is
    // always visible without scrolling, so it is the primary affordance here.
    primaryAffordances: [
      affordance({
        label: 'campaign name input',
        testId: 'campaign-name-input',
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'campaign name input',
        testId: 'campaign-name-input',
      }),
      affordance({ label: 'campaign wizard next', testId: 'wizard-next-btn' }),
      affordance({
        label: 'campaign wizard cancel',
        testId: 'wizard-cancel-btn',
      }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-encounters',
    class: 'standalone',
    label: 'encounters',
    manifestPaths: ['/gameplay/encounters'],
    goto: '/gameplay/encounters',
    primaryAffordances: [
      affordance({
        label: 'create encounter CTA',
        testId: 'create-encounter-btn',
      }),
    ],
    overlapTargets: [
      affordance({ label: 'encounter search', testId: 'encounter-search' }),
      affordance({ label: 'encounter status filter', testId: 'status-filter' }),
      affordance({
        label: 'create encounter CTA',
        testId: 'create-encounter-btn',
      }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-encounters-create',
    class: 'standalone',
    label: 'create encounter',
    manifestPaths: ['/gameplay/encounters/create'],
    goto: '/gameplay/encounters/create',
    // The submit action sits below the fold at 375px on a fresh page load; the
    // name input is always visible without scrolling, so it is the primary
    // affordance here. The submit button stays in overlapTargets.
    primaryAffordances: [
      affordance({
        label: 'encounter name input',
        testId: 'encounter-name-input',
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'encounter name input',
        testId: 'encounter-name-input',
      }),
      affordance({
        label: 'battle scenario template',
        testId: 'template-battle',
      }),
      affordance({
        label: 'submit encounter action',
        testId: 'submit-encounter-btn',
      }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-games',
    class: 'standalone',
    label: 'games',
    manifestPaths: ['/gameplay/games'],
    goto: '/gameplay/games',
    primaryAffordances: [
      affordance({ label: 'demo game CTA', testId: 'new-game-btn' }),
    ],
    overlapTargets: [
      affordance({ label: 'demo game CTA', testId: 'new-game-btn' }),
      affordance({
        label: 'network lobby create',
        role: 'button',
        name: /Create Lobby/i,
      }),
      affordance({
        label: 'network room code input',
        role: 'textbox',
        name: /Networked 1v1 room code/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'gameplay-repair',
    class: 'standalone',
    label: 'repair bay',
    manifestPaths: ['/gameplay/repair'],
    goto: '/gameplay/repair',
    primaryAffordances: [
      affordance({ label: 'field repair action', testId: 'repair-field-btn' }),
    ],
    overlapTargets: [
      affordance({ label: 'repair search', testId: 'repair-search-input' }),
      affordance({ label: 'repair stats', testId: 'repair-stats' }),
      affordance({ label: 'field repair action', testId: 'repair-field-btn' }),
    ],
    quarantine: [],
  },
  {
    id: 'compendium-hub',
    class: 'standalone',
    label: 'compendium',
    manifestPaths: ['/compendium'],
    goto: '/compendium',
    primaryAffordances: [
      affordance({ label: 'compendium search', testId: 'compendium-search' }),
    ],
    overlapTargets: [
      affordance({ label: 'compendium search', testId: 'compendium-search' }),
      affordance({
        label: 'units section',
        testId: 'compendium-units-section',
      }),
      affordance({
        label: 'equipment section',
        testId: 'compendium-equipment-section',
      }),
      affordance({
        label: 'rules section',
        testId: 'compendium-rules-section',
      }),
    ],
    quarantine: [],
  },
  {
    id: 'compendium-units',
    class: 'standalone',
    label: 'compendium units',
    manifestPaths: ['/compendium/units'],
    goto: '/compendium/units',
    primaryAffordances: [
      affordance({
        label: 'unit filters toggle',
        role: 'button',
        name: /Filters/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'unit database search',
        role: 'textbox',
        name: /Search units/i,
      }),
      affordance({
        label: 'unit tech-base filter',
        role: 'combobox',
        name: /Filter by tech base/i,
      }),
      affordance({
        label: 'unit filters toggle',
        role: 'button',
        name: /Filters/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'compendium-equipment',
    class: 'standalone',
    label: 'compendium equipment',
    manifestPaths: ['/compendium/equipment'],
    goto: '/compendium/equipment',
    primaryAffordances: [
      affordance({
        label: 'equipment filters',
        role: 'button',
        name: /Filters/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'equipment search',
        role: 'textbox',
        name: /Search equipment/i,
      }),
      affordance({
        label: 'equipment filters',
        role: 'button',
        name: /Filters/i,
      }),
      affordance({
        label: 'equipment view mode selector',
        role: 'group',
        name: /View mode selection/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'compendium-rules',
    class: 'standalone',
    label: 'compendium rules',
    manifestPaths: ['/compendium/rules'],
    goto: '/compendium/rules',
    primaryAffordances: [
      affordance({
        label: 'internal structure anchor',
        role: 'button',
        name: /Internal Structure/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'internal structure anchor',
        role: 'button',
        name: /Internal Structure/i,
      }),
      affordance({ label: 'engine anchor', role: 'button', name: /^Engine$/i }),
      affordance({ label: 'armor anchor', role: 'button', name: /^Armor$/i }),
    ],
    quarantine: [],
  },
  {
    id: 'custom-units',
    class: 'standalone',
    label: 'custom units',
    manifestPaths: ['/units'],
    goto: '/units',
    primaryAffordances: [
      affordance({
        label: 'create unit CTA',
        role: 'link',
        name: /Create Unit/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'custom unit search',
        role: 'textbox',
        name: /Search units/i,
      }),
      affordance({
        label: 'create unit CTA',
        role: 'link',
        name: /Create Unit/i,
      }),
      affordance({ label: 'filter toggle', role: 'button', name: /Filters/i }),
    ],
    quarantine: [
      {
        viewport: 'mobile-375',
        check: 'clickable',
        reason:
          'The toolbar "Create Unit" link (src/pages/units/index.tsx FilterToolbar) sits in a ' +
          'non-wrapping flex row (`flex items-center justify-between gap-4`) alongside a fixed-256px ' +
          'search input; at 375px the row has no room left and the link is pushed out of the viewport. ' +
          'Pre-existing; first surfaced by this sweep. (The page also renders a second, always-reachable ' +
          '"Create Unit" button inside the empty-state panel, but the toolbar instance is the one ' +
          "app-shell-route-proof.spec.ts's affordance declaration resolves first.)",
        followUp:
          'Let the FilterToolbar row wrap (`flex-wrap`) or shrink the search input at sub-md widths so the ' +
          'Create Unit link stays reachable without an accompanying horizontal squeeze.',
      },
    ],
  },
  {
    id: 'customizer',
    class: 'standalone',
    label: 'customizer',
    manifestPaths: ['/customizer'],
    goto: '/customizer',
    primaryAffordances: [
      affordance({
        label: 'customizer new unit CTA',
        role: 'button',
        name: /New Unit/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'customizer new unit CTA',
        role: 'button',
        name: /New Unit/i,
      }),
      affordance({
        label: 'customizer library load CTA',
        role: 'button',
        name: /Load from Library/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'unit-comparison',
    class: 'standalone',
    label: 'unit comparison',
    manifestPaths: ['/compare'],
    goto: '/compare',
    primaryAffordances: [
      affordance({
        label: 'compare search',
        role: 'textbox',
        name: /Search units to compare/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'compare search',
        role: 'textbox',
        name: /Search units to compare/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'multiplayer',
    class: 'standalone',
    label: 'multiplayer',
    manifestPaths: ['/multiplayer'],
    goto: '/multiplayer',
    primaryAffordances: [
      affordance({
        label: 'vault identity recovery link',
        role: 'link',
        name: /Set up vault identity/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'vault identity recovery link',
        role: 'link',
        name: /Set up vault identity/i,
      }),
      affordance({
        label: 'password input',
        selector: 'input[placeholder="Vault password"]',
      }),
    ],
    quarantine: quarantineAllViewports(
      'clickable',
      'The "Set up vault identity" link (src/pages/multiplayer/index.tsx, fixed `px-3 py-1.5` padding with ' +
        'no responsive size classes) renders at ~30px tall -- 2px under the 32px touch-target floor -- at ' +
        'every sweep viewport. Pre-existing; first surfaced by this sweep.',
      "Bump the vault-identity recovery link's vertical padding by ~2px so it clears the 32px floor.",
    ),
  },
  {
    id: 'event-timeline',
    class: 'standalone',
    label: 'event timeline',
    manifestPaths: ['/audit/timeline'],
    goto: '/audit/timeline',
    primaryAffordances: [
      affordance({
        label: 'timeline refresh',
        role: 'button',
        name: /Refresh timeline/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'timeline refresh',
        role: 'button',
        name: /Refresh timeline/i,
      }),
      affordance({
        label: 'timeline search',
        role: 'textbox',
        name: /Search events/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'replay-library',
    class: 'standalone',
    label: 'replay library',
    manifestPaths: ['/replay-library'],
    goto: '/replay-library',
    primaryAffordances: [
      affordance({ label: 'source filter', testId: 'source-filter' }),
    ],
    overlapTargets: [
      affordance({ label: 'source filter', testId: 'source-filter' }),
    ],
    quarantine: [],
  },
  {
    id: 'share-links',
    class: 'standalone',
    label: 'share links',
    manifestPaths: ['/share'],
    goto: '/share',
    // The page's only unconditional interactive affordance is the PageLayout
    // "Home" backlink -- a fresh app deterministically has zero share links,
    // so the empty-state message (no interactive semantics) is not a
    // legitimate clickability target.
    primaryAffordances: [
      affordance({
        label: 'share links home backlink',
        role: 'link',
        name: /Home/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'share links home backlink',
        role: 'link',
        name: /Home/i,
      }),
      affordance({
        label: 'share links empty state',
        text: /No share links yet/i,
      }),
    ],
    quarantine: quarantineAllViewports(
      'clickable',
      'The PageLayout "Home" backlink (icon + text, no button chrome or responsive size classes) renders ' +
        'at ~24px tall -- below the 32px touch-target floor -- at every sweep viewport. Pre-existing; first ' +
        'surfaced by this sweep.',
      "Give PageLayout's backLink pattern button-affordance padding, matching the touch-target floor used elsewhere.",
    ),
  },
  {
    id: 'vault-contacts',
    class: 'standalone',
    label: 'vault contacts',
    manifestPaths: ['/contacts'],
    goto: '/contacts',
    primaryAffordances: [
      affordance({
        label: 'add contact action',
        role: 'button',
        name: /Add Contact/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'add contact action',
        role: 'button',
        name: /Add Contact/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'shared-items',
    class: 'standalone',
    label: 'shared items',
    manifestPaths: ['/shared'],
    goto: '/shared',
    primaryAffordances: [
      affordance({ label: 'sync action', role: 'button', name: /Sync Now/i }),
    ],
    overlapTargets: [
      affordance({ label: 'sync action', role: 'button', name: /Sync Now/i }),
      affordance({
        label: 'received tab',
        role: 'button',
        name: /Shared with Me/i,
      }),
      affordance({
        label: 'owned shares tab',
        role: 'button',
        name: /My Shared Items/i,
      }),
    ],
    quarantine: [],
  },
  {
    id: 'settings',
    class: 'standalone',
    label: 'settings',
    // '/settings' and '/settings#vault' render the same page file -- one
    // inventory entry covers both manifest paths.
    manifestPaths: ['/settings', '/settings#vault'],
    goto: '/settings',
    primaryAffordances: [
      affordance({
        label: 'appearance settings panel',
        role: 'button',
        name: /Appearance/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'appearance settings panel',
        role: 'button',
        name: /Appearance/i,
      }),
      affordance({
        label: 'vault settings panel',
        role: 'button',
        name: /Vault/i,
      }),
      affordance({
        label: 'accessibility settings panel',
        role: 'button',
        name: /Accessibility/i,
      }),
    ],
    quarantine: [],
  },
];

// ============================================================================
// Recovery screens (2).
// ============================================================================

const recoveryEntries: readonly SweptScreenEntry[] = [
  {
    id: 'recovery-invalid-share-token',
    class: 'recovery',
    label: 'invalid share token',
    manifestPaths: ['/share/e2e-missing-token'],
    goto: '/share/e2e-missing-token',
    primaryAffordances: [
      affordance({ label: 'go home action', role: 'button', name: /Go Home/i }),
    ],
    overlapTargets: [
      affordance({
        label: 'retry share token action',
        role: 'button',
        name: /Try Again/i,
      }),
      affordance({ label: 'go home action', role: 'button', name: /Go Home/i }),
    ],
    quarantine: [],
  },
  {
    id: 'recovery-global-not-found',
    class: 'recovery',
    label: 'global not found',
    manifestPaths: ['/app-shell-e2e-missing-route'],
    goto: '/app-shell-e2e-missing-route',
    primaryAffordances: [
      affordance({
        label: 'dashboard recovery link',
        role: 'link',
        name: /Go to Dashboard/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'dashboard recovery link',
        role: 'link',
        name: /Go to Dashboard/i,
      }),
      affordance({
        label: 'gameplay recovery link',
        role: 'link',
        name: /Open Gameplay/i,
      }),
      affordance({
        label: 'replay library recovery link',
        role: 'link',
        name: /Open Replay Library/i,
      }),
    ],
    quarantine: [],
  },
];

// ============================================================================
// Static-catalog screens (3) -- delegated compendium detail routes with a
// known-stable concrete slug (the `compendium.spec.ts` precedent), so no
// pack/seed dependency is needed. `/compendium/units/[id]` and
// `/compendium/equipment/[id]` render the same `CompendiumLayout` breadcrumb
// (`nav[aria-label="Breadcrumb"]`, always the same first "Compendium" crumb)
// -- a reliable, viewport-stable primary affordance shared by both.
//
// `/compendium/rules/[id]` (`src/pages/compendium/rules/[id].tsx`) is
// different: it is a client-side redirect to `/compendium/rules#{id}`, the
// same combined rules page the "compendium-rules" standalone entry already
// covers, landing scrolled to the anchored section. The hash-anchor scroll
// carries the breadcrumb out of the initial viewport by browser design, so
// this entry reuses the rule-section tab buttons (visible post-scroll,
// verified against the same fixture) instead of the breadcrumb.
// ============================================================================

const COMPENDIUM_BREADCRUMB_HOME: AffordanceDescriptor = {
  label: 'compendium breadcrumb home link',
  within: 'nav[aria-label="Breadcrumb"]',
  role: 'link',
  name: /^Compendium$/i,
};

const COMPENDIUM_BREADCRUMB_TOUCH_TARGET_REASON =
  'The CompendiumLayout breadcrumb\'s "Compendium" link (no button chrome or responsive size classes) ' +
  'renders at ~20px tall -- below the 32px touch-target floor -- at every sweep viewport. Pre-existing; ' +
  'first surfaced by this sweep.';

const COMPENDIUM_BREADCRUMB_TOUCH_TARGET_FOLLOW_UP =
  "Give CompendiumLayout's breadcrumb links button-affordance padding, matching the touch-target floor used elsewhere.";

const staticCatalogEntries: readonly SweptScreenEntry[] = [
  {
    id: 'compendium-rules-detail',
    class: 'static-catalog',
    label: 'compendium rules detail (structure)',
    manifestPaths: ['/compendium/rules/[id]'],
    goto: '/compendium/rules/structure',
    primaryAffordances: [
      affordance({
        label: 'engine anchor',
        role: 'button',
        name: /^Engine$/i,
      }),
    ],
    overlapTargets: [
      affordance({
        label: 'internal structure anchor',
        role: 'button',
        name: /Internal Structure/i,
      }),
      affordance({ label: 'engine anchor', role: 'button', name: /^Engine$/i }),
      affordance({ label: 'armor anchor', role: 'button', name: /^Armor$/i }),
    ],
    quarantine: [],
  },
  {
    id: 'compendium-units-detail',
    class: 'static-catalog',
    label: 'compendium unit detail (akuma-aku-1x)',
    manifestPaths: ['/compendium/units/[id]'],
    goto: '/compendium/units/akuma-aku-1x',
    primaryAffordances: [affordance(COMPENDIUM_BREADCRUMB_HOME)],
    overlapTargets: [
      affordance(COMPENDIUM_BREADCRUMB_HOME),
      affordance({ label: 'unit detail heading', selector: 'h1' }),
    ],
    quarantine: quarantineAllViewports(
      'clickable',
      COMPENDIUM_BREADCRUMB_TOUCH_TARGET_REASON,
      COMPENDIUM_BREADCRUMB_TOUCH_TARGET_FOLLOW_UP,
    ),
  },
  {
    id: 'compendium-equipment-detail',
    class: 'static-catalog',
    label: 'compendium equipment detail (medium-laser)',
    manifestPaths: ['/compendium/equipment/[id]'],
    goto: '/compendium/equipment/medium-laser',
    primaryAffordances: [affordance(COMPENDIUM_BREADCRUMB_HOME)],
    overlapTargets: [
      affordance(COMPENDIUM_BREADCRUMB_HOME),
      affordance({ label: 'equipment detail heading', selector: 'h1' }),
    ],
    quarantine: quarantineAllViewports(
      'clickable',
      COMPENDIUM_BREADCRUMB_TOUCH_TARGET_REASON,
      COMPENDIUM_BREADCRUMB_TOUCH_TARGET_FOLLOW_UP,
    ),
  },
];

// ============================================================================
// Pack-seeded screens (18) -- W4-gated (group 5). Classified now so the guard
// stays exhaustive; not swept until `e2e/helpers/scenarioPackLoading.ts`
// exists and the gate (task 5.0) passes (design D7).
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

const packSeededEntries: readonly PackSeededScreenEntry[] = [
  ...CAMPAIGN_SUBROUTE_LABELS.map(
    ([pattern, label]): PackSeededScreenEntry => ({
      id: `pack-seeded-${pattern.replace(/[[\]/]/g, '-').replace(/^-+|-+$/g, '')}`,
      class: 'pack-seeded',
      label,
      manifestPaths: [pattern],
      pack: 'navigation',
      navigation: 'direct-goto',
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
    note:
      'Reached only via in-page discovery from the pack-seeded missions screen (design D10a): goto the ' +
      "missions subroute, click the mission's launch/briefing affordance -- never construct a mission id, " +
      "and never actuate the launch control itself. Task 5.0's gate verifies the navigation pack's " +
      'documented target state actually surfaces the discovery affordance; if it does not, this entry ' +
      'reclassifies to `excluded` with that reason (D10a fallback).',
  },
  {
    id: 'pack-seeded-game-detail',
    class: 'pack-seeded',
    label: 'game session detail',
    manifestPaths: ['/gameplay/games/[id]'],
    pack: 'combat',
    navigation: 'direct-goto',
    note: "Match id sourced from the combat-pack loader's post-navigation URL (design D5).",
  },
];

// ============================================================================
// Excluded screens (13) -- never swept by this change, each with a
// non-empty documented reason (design D5/D10).
// ============================================================================

const NO_COVERING_PACK_REASON =
  'No scenario pack (this change consumes only the navigation and combat pilot packs, design D10b) or ' +
  "front-door observable sources this route's required identifier/state; reaching it would require store " +
  'injection, hand-seeded rows, or an uncontracted loader surface, all forbidden (design D5/D7).';

const excludedEntries: readonly ExcludedScreenEntry[] = [
  {
    id: 'excluded-encounter-detail',
    class: 'excluded',
    label: 'encounter detail',
    manifestPaths: ['/gameplay/encounters/[id]'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/encounter-flow.spec.ts and e2e/encounter.spec.ts already seed encounter detail state; a future ' +
      "encounter/combat pack (per the manifest's own delegatedRoutes proof precedent) would unlock this route.",
  },
  {
    id: 'excluded-encounter-pre-battle',
    class: 'excluded',
    label: 'encounter pre-battle',
    manifestPaths: ['/gameplay/encounters/[id]/pre-battle'],
    reason: NO_COVERING_PACK_REASON,
    followUp: 'Same follow-up path as encounter detail.',
  },
  {
    id: 'excluded-encounter-sim',
    class: 'excluded',
    label: 'encounter sim',
    manifestPaths: ['/gameplay/encounters/[id]/sim'],
    reason: NO_COVERING_PACK_REASON,
    followUp: 'Same follow-up path as encounter detail.',
  },
  {
    id: 'excluded-force-detail',
    class: 'excluded',
    label: 'force detail',
    manifestPaths: ['/gameplay/forces/[id]'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/force.spec.ts already generates a roster object; a follow-up may promote that seeder to a ' +
      'front-door pattern this sweep can consume.',
  },
  {
    id: 'excluded-pilot-detail',
    class: 'excluded',
    label: 'pilot detail',
    manifestPaths: ['/gameplay/pilots/[id]'],
    reason:
      "Design D10b: pilot ids are not in W4's enumerated remap families (join only conditionally per its " +
      "own R10), no pack contract makes any targetRoute a pilot detail route, and a fresh app's pilot " +
      'roster is empty so in-page discovery from /gameplay/pilots has no promised row to click either.',
    followUp:
      'Unlocks via either W4\'s R10 verdict landing on "loader creates pilot rows front-door", or the ' +
      'existing non-pack seeder precedent the manifest names for this pattern (force.spec.ts/' +
      'replay-player.spec.ts-style generated roster objects).',
  },
  {
    id: 'excluded-game-replay',
    class: 'excluded',
    label: 'game replay',
    manifestPaths: ['/gameplay/games/[id]/replay'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/replay-player.spec.ts already seeds replay state for a future pack.',
  },
  {
    id: 'excluded-game-review',
    class: 'excluded',
    label: 'game review',
    manifestPaths: ['/gameplay/games/[id]/review'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/game.spec.ts already seeds completed match state for a future pack.',
  },
  {
    id: 'excluded-game-victory',
    class: 'excluded',
    label: 'game victory',
    manifestPaths: ['/gameplay/games/[id]/victory'],
    reason: NO_COVERING_PACK_REASON,
    followUp: 'Same follow-up path as game review.',
  },
  {
    id: 'excluded-match-detail',
    class: 'excluded',
    label: 'match detail',
    manifestPaths: ['/gameplay/matches/[id]'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/quick-play.spec.ts already seeds match state for a future pack.',
  },
  {
    id: 'excluded-gameplay-lobby',
    class: 'excluded',
    label: 'gameplay lobby',
    manifestPaths: ['/gameplay/lobby/[roomCode]'],
    reason:
      NO_COVERING_PACK_REASON +
      ' Lobby routes additionally require live multiplayer runtime state, not just seeded rows.',
    followUp:
      'e2e/p2p-sync.spec.ts and e2e/playtest-mp-smoke.spec.ts already exercise lobby state live.',
  },
  {
    id: 'excluded-multiplayer-lobby',
    class: 'excluded',
    label: 'multiplayer lobby',
    manifestPaths: ['/multiplayer/lobby/[roomCode]'],
    reason:
      NO_COVERING_PACK_REASON +
      ' Lobby routes additionally require live multiplayer runtime state, not just seeded rows.',
    followUp: 'Same follow-up path as gameplay lobby.',
  },
  {
    id: 'excluded-multiplayer-spectate',
    class: 'excluded',
    label: 'multiplayer spectate',
    manifestPaths: ['/multiplayer/spectate/[matchId]'],
    reason:
      NO_COVERING_PACK_REASON +
      ' Spectate additionally requires a signed vault identity and a live match to observe.',
    followUp:
      'e2e/multiplayer-live-vault-auth.spec.ts already exercises this live.',
  },
  {
    id: 'excluded-custom-unit-detail',
    class: 'excluded',
    label: 'custom unit detail',
    manifestPaths: ['/units/[id]'],
    reason: NO_COVERING_PACK_REASON,
    followUp:
      'e2e/customizer.spec.ts already generates a saved unit; a follow-up may promote that seeder to a ' +
      'front-door pattern this sweep can consume.',
  },
];

// ============================================================================
// The full inventory.
// ============================================================================

export const SCREEN_INVENTORY: readonly ScreenInventoryEntry[] = [
  ...standaloneEntries,
  ...recoveryEntries,
  ...staticCatalogEntries,
  ...packSeededEntries,
  ...excludedEntries,
];

/** Swept-now entries (standalone + recovery + static-catalog) -- the 33 the sweep spec covers today. */
export const SWEPT_NOW_ENTRIES: readonly SweptScreenEntry[] = [
  ...standaloneEntries,
  ...recoveryEntries,
  ...staticCatalogEntries,
];

/** Test-harness route patterns (design: auto-excluded, never required in the inventory). */
export const TEST_HARNESS_ROUTE_PATTERNS: readonly string[] =
  appShellRouteManifest.testHarnessRoutes.flatMap((group) => group.patterns);
