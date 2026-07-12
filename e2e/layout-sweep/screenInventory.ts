/**
 * Public facade for the viewport layout-sweep screen inventory.
 *
 * Route classifications remain intentionally declarative in cohesive modules:
 * standalone routes, recovery routes, static catalog routes, scenario-pack
 * routes, and explicit exclusions. Consumers continue importing only here.
 */

import appShellRouteManifest from '../app-shell-route-manifest.json';
import { excludedEntries } from './screenInventory.excluded';
import { packSeededEntries } from './screenInventory.packSeeded';
import { recoveryEntries } from './screenInventory.recovery';
import { standaloneCatalogEntries } from './screenInventory.standalone-catalog';
import { standalonePrimaryEntries } from './screenInventory.standalone-primary';
import { staticCatalogEntries } from './screenInventory.staticCatalog';

export type {
  AffordanceDescriptor,
  CheckTarget,
  ExcludedScreenEntry,
  LayoutCheckKind,
  PackSeededScreenEntry,
  QuarantineEntry,
  ScreenInventoryEntry,
  SweptScreenEntry,
  SweepClass,
  SweepViewportLabel,
} from './screenInventory.types';
export { ALL_SWEEP_VIEWPORT_LABELS } from './screenInventory.types';

import type {
  PackSeededScreenEntry,
  ScreenInventoryEntry,
  SweptScreenEntry,
} from './screenInventory.types';

/** Every classified app-shell route, preserving manifest coverage order. */
export const SCREEN_INVENTORY: readonly ScreenInventoryEntry[] = [
  ...standalonePrimaryEntries,
  ...standaloneCatalogEntries,
  ...recoveryEntries,
  ...staticCatalogEntries,
  ...packSeededEntries,
  ...excludedEntries,
];

/** Literal routes swept without scenario-pack loading. */
export const SWEPT_NOW_ENTRIES: readonly SweptScreenEntry[] = [
  ...standalonePrimaryEntries,
  ...standaloneCatalogEntries,
  ...recoveryEntries,
  ...staticCatalogEntries,
];

/** Scenario-pack routes swept after their pack loaders establish state. */
export const PACK_SEEDED_SWEPT_ENTRIES: readonly PackSeededScreenEntry[] =
  packSeededEntries;

/** Test-harness routes are intentionally outside the screen inventory. */
export const TEST_HARNESS_ROUTE_PATTERNS: readonly string[] =
  appShellRouteManifest.testHarnessRoutes.flatMap((group) => group.patterns);
