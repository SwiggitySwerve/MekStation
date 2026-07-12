import {
  APP_SHELL_CHROME_OVERLAP_TARGETS,
  APP_SHELL_CHROME_PRIMARY_AFFORDANCE,
} from './screenInventory.chrome';
import {
  affordance,
  quarantineAllViewports,
  type SweptScreenEntry,
} from './screenInventory.types';

/** Standalone gameplay and dashboard routes. */
export const standalonePrimaryEntries: readonly SweptScreenEntry[] = [
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
];
