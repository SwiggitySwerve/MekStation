import {
  APP_SHELL_CHROME_OVERLAP_TARGETS,
  APP_SHELL_CHROME_PRIMARY_AFFORDANCE,
} from './screenInventory.chrome';
import {
  affordance,
  quarantineAllViewports,
  type SweptScreenEntry,
} from './screenInventory.types';

/** Standalone catalog, utility, and account routes. */
export const standaloneCatalogEntries: readonly SweptScreenEntry[] = [
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
