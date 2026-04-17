/**
 * Canonical SPA catalog — aggregator for the per-category data files.
 *
 * Imported from MegaMek's OptionsConstants.java + PilotOptions.java +
 * messages.properties at `E:\Projects\megamek\...`. IDs are snake_case
 * to match the Java constants. When a later supplement renamed / split
 * an ability, the legacy id is registered in catalog/legacyAliases.ts
 * so code that still uses the older form keeps resolving correctly.
 *
 * Roster:
 *  - 19 Piloting abilities     (catalog/pilotingSPAs.ts)
 *  - 13 Gunnery abilities      (catalog/gunnerySPAs.ts)
 *  - 7  Miscellaneous + 2 Infantry + 2 aToW
 *                              (catalog/miscAndInfantrySPAs.ts)
 *  - 26 Manei Domini / proto DNI / suicide bioware
 *                              (catalog/biowareSPAs.ts)
 *  - 11 Unofficial / legacy     (catalog/unofficialSPAs.ts)
 *  - 11 Edge triggers           (catalog/edgeSPAs.ts)
 *  = 91 canonical entries.
 */

import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { BIOWARE_SPAS } from './catalog/biowareSPAs';
import { EDGE_SPAS } from './catalog/edgeSPAs';
import { GUNNERY_SPAS } from './catalog/gunnerySPAs';
import {
  ATOW_SPAS,
  INFANTRY_SPAS,
  MISC_SPAS,
} from './catalog/miscAndInfantrySPAs';
import { PILOTING_SPAS } from './catalog/pilotingSPAs';
import { UNOFFICIAL_SPAS } from './catalog/unofficialSPAs';

const ALL_SPAS: readonly ISPADefinition[] = [
  ...PILOTING_SPAS,
  ...GUNNERY_SPAS,
  ...MISC_SPAS,
  ...INFANTRY_SPAS,
  ...ATOW_SPAS,
  ...BIOWARE_SPAS,
  ...UNOFFICIAL_SPAS,
  ...EDGE_SPAS,
];

/** The canonical SPA catalog — id → definition. */
export const CANONICAL_SPA_CATALOG: Readonly<Record<string, ISPADefinition>> =
  Object.freeze(
    ALL_SPAS.reduce<Record<string, ISPADefinition>>((acc, spa) => {
      acc[spa.id] = spa;
      return acc;
    }, {}),
  );

/** Ordered list form (for UI iteration / random selection). */
export const CANONICAL_SPA_LIST: readonly ISPADefinition[] = ALL_SPAS;

export { SPA_LEGACY_ALIASES } from './catalog/legacyAliases';
