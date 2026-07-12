import { affordance, type CheckTarget } from './screenInventory.types';

const CHROME_LABELED_NAV = 'header nav:nth-of-type(1)';
const CHROME_ICON_NAV = 'header nav:nth-of-type(2)';

/** Build responsive desktop/tablet variants for an app-shell dropdown. */
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

const CHROME_HAMBURGER = affordance(
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

const CAMPAIGN_NAV_DASHBOARD_TAB = affordance({
  label: 'campaign nav dashboard tab',
  role: 'link',
  name: /^Dashboard$/i,
});
const CAMPAIGN_NAV_PERSONNEL_TAB = affordance({
  label: 'campaign nav personnel tab',
  role: 'link',
  name: /^Personnel$/i,
});
const CAMPAIGN_NAV_FORCES_TAB = affordance({
  label: 'campaign nav forces tab',
  role: 'link',
  name: /^Forces$/i,
});
const CAMPAIGN_NAV_MISSIONS_TAB = affordance({
  label: 'campaign nav missions tab',
  role: 'link',
  name: /^Missions$/i,
});
const CAMPAIGN_NAV_STARMAP_TAB = affordance({
  label: 'campaign nav starmap tab',
  role: 'link',
  name: /^Starmap$/i,
});
const CAMPAIGN_NAV_BAYS_GROUP = affordance({
  label: 'campaign nav bays group',
  testId: 'campaign-nav-bays-group',
});
const CAMPAIGN_NAV_COMMAND_GROUP = affordance({
  label: 'campaign nav command group',
  testId: 'campaign-nav-command-group',
});

export const CAMPAIGN_NAV_PRIMARY_AFFORDANCE: readonly CheckTarget[] = [
  CAMPAIGN_NAV_DASHBOARD_TAB,
];

export const CAMPAIGN_NAV_OVERLAP_TARGETS: readonly CheckTarget[] = [
  CAMPAIGN_NAV_DASHBOARD_TAB,
  CAMPAIGN_NAV_PERSONNEL_TAB,
  CAMPAIGN_NAV_FORCES_TAB,
  CAMPAIGN_NAV_MISSIONS_TAB,
  CAMPAIGN_NAV_STARMAP_TAB,
  CAMPAIGN_NAV_BAYS_GROUP,
  CAMPAIGN_NAV_COMMAND_GROUP,
];

const COMBAT_TACTICAL_TURN_RAIL = affordance({
  label: 'tactical turn rail',
  testId: 'tactical-turn-rail',
});
const COMBAT_HEX_MAP_CANVAS = affordance({
  label: 'hex map canvas',
  testId: 'hex-map-container',
});

export const APP_SHELL_CHROME_PRIMARY_AFFORDANCE: readonly CheckTarget[] = [
  CHROME_HAMBURGER,
  CHROME_BROWSE.icon,
  CHROME_BROWSE.labeled,
];

export const APP_SHELL_CHROME_OVERLAP_TARGETS: readonly CheckTarget[] = [
  CHROME_HAMBURGER,
  CHROME_BROWSE.icon,
  CHROME_BROWSE.labeled,
  CHROME_TOOLS.icon,
  CHROME_TOOLS.labeled,
  CHROME_GAMEPLAY.icon,
  CHROME_GAMEPLAY.labeled,
];

export const COMBAT_TACTICAL_TURN_RAIL_TARGET = COMBAT_TACTICAL_TURN_RAIL;
export const COMBAT_HEX_MAP_CANVAS_TARGET = COMBAT_HEX_MAP_CANVAS;
