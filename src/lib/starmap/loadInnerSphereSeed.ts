/**
 * Inner Sphere seed-dataset loader.
 *
 * Per `wire-starmap-into-campaign` (Wave 6.4): loads the 40-system MVP
 * seed from `src/lib/starmap/seed/inner-sphere-seed.json` and validates
 * every entry through the `isStarSystem` type guard. Throws on malformed
 * payload so a regression in the JSON surfaces immediately in the
 * `seedDataset.test.ts` unit-test seed-shape assertion rather than
 * silently producing a starmap with blank dots.
 *
 * @spec openspec/changes/wire-starmap-into-campaign/specs/starmap-interface/spec.md
 */

import { type IStarSystem, isStarSystem } from '@/types/starmap/StarSystem';

// Import the JSON at build time. Next.js bundles JSON imports through
// the standard webpack json-loader — the seed dataset travels with the
// app bundle (no network fetch at runtime). The file lives under
// src/lib/starmap/seed/ (NOT public/data/) so the broad `data/`
// gitignore rule for the local SQLite database doesn't accidentally
// suppress it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import seedJson from './seed/inner-sphere-seed.json';

interface ISeedShape {
  readonly _meta: {
    readonly version: number;
    readonly description: string;
    readonly snapshotYear: number;
    readonly coordinateConvention: string;
    readonly spec: string;
  };
  readonly systems: readonly unknown[];
}

/**
 * Load and validate the Inner Sphere seed dataset.
 *
 * Returns `{ systems, meta }` so callers can render version / snapshot
 * info (e.g. on the starmap page footer for context).
 *
 * @throws Error when the JSON payload is structurally malformed or any
 *   entry fails the `isStarSystem` type guard. The error message names
 *   the offending entry index so a bad commit is easy to bisect.
 */
export function loadInnerSphereSeed(): {
  readonly systems: readonly IStarSystem[];
  readonly meta: ISeedShape['_meta'];
} {
  const raw = seedJson as ISeedShape;

  if (
    typeof raw !== 'object' ||
    raw === null ||
    typeof raw._meta !== 'object' ||
    !Array.isArray(raw.systems)
  ) {
    throw new Error(
      "[loadInnerSphereSeed] malformed seed JSON — expected an object with '_meta' and 'systems' keys.",
    );
  }

  const validated: IStarSystem[] = [];
  const seenIds = new Set<string>();
  for (let i = 0; i < raw.systems.length; i++) {
    const entry = raw.systems[i];
    if (!isStarSystem(entry)) {
      throw new Error(
        `[loadInnerSphereSeed] malformed seed entry at index ${i}: ` +
          `${JSON.stringify(entry)}`,
      );
    }
    if (seenIds.has(entry.id)) {
      throw new Error(
        `[loadInnerSphereSeed] duplicate seed id '${entry.id}' at index ${i}.`,
      );
    }
    seenIds.add(entry.id);
    validated.push(entry);
  }

  return { systems: validated, meta: raw._meta };
}

/**
 * Convenience accessor: look up a system by id in the seed dataset.
 * Returns `undefined` for unknown ids. Used by `travelToSystem` to
 * validate the systemId and by the page to read the display name for
 * the activity-log summary.
 */
export function findSystemById(id: string): IStarSystem | undefined {
  const { systems } = loadInnerSphereSeed();
  return systems.find((s) => s.id === id);
}
