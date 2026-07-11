import {
  affordance,
  quarantineAllViewports,
  type AffordanceDescriptor,
  type SweptScreenEntry,
} from './screenInventory.types';

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

export const staticCatalogEntries: readonly SweptScreenEntry[] = [
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
