// Reopen (b) for vehicles: which facts of the source catalog document the saved document lost or changed.
// The one owner of the editor-owned key list and of the document and mount comparisons; the vehicle reopen
// capture calls these functions and rows.mjs checks its rows against the same list. Pure: documents in,
// sorted lists out.
//
// The source document is the committed catalog JSON the canonical open read; the saved document is what the
// real save writer (serializeCustomVehicleState) produced, read back cold. A key path is LOST when the source
// has it and the saved document does not, and CHANGED when both have it with different values. Keys only the
// saved document has (the writer's `schemaVersion`, `variant`, `family`, `vehicleEditor` extension, explicit
// defaults) are not losses and are not listed. Equipment is compared as a multiset (mountDiff), not by path,
// so a reordered list is not a loss.
import { canonicalJson } from './rows.mjs';

/**
 * Source keys the editor legitimately rewrites, so a difference there is not a loss. Every entry names its
 * reason in one line; a key without one is measured. Matches the key itself and every path under it.
 * Empty on purpose: no source key has been shown to be rewritten legitimately yet. Measured, not listed (C2
 * ruling): fluff.*, role, source and weightClass.
 */
export const EDITOR_OWNED_KEYS = Object.freeze([]);

/** The source key compared as a multiset by mountDiff instead of by path. */
export const MOUNT_LIST_KEY = 'equipment';

/** True when `path` is an editor-owned key or lies under one. */
export function isEditorOwned(path, owned = EDITOR_OWNED_KEYS) {
  return owned.some(
    ({ key }) =>
      path === key || path.startsWith(`${key}.`) || path === `${key}[]`,
  );
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Every leaf of a document as path -> canonical value text. Objects are walked (`armor.barRating`); an array is
 * one leaf compared whole (`quirks[]`); an empty object is a leaf (`{}`). The mount list is left out.
 */
export function documentLeaves(document) {
  const leaves = new Map();
  const walk = (value, path) => {
    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      if (!keys.length) leaves.set(path, '{}');
      for (const key of keys) {
        if (!path && key === MOUNT_LIST_KEY) continue;
        walk(value[key], path ? `${path}.${key}` : key);
      }
    } else if (Array.isArray(value))
      leaves.set(`${path}[]`, canonicalJson(value));
    else leaves.set(path, canonicalJson(value));
  };
  walk(document, '');
  return leaves;
}

/**
 * Source paths lost or changed in the saved document, outside the editor-owned keys, sorted by path:
 * `[{path, change: 'lost' | 'changed'}]`.
 */
export function documentDiff(source, saved, owned = EDITOR_OWNED_KEYS) {
  const before = documentLeaves(source);
  const after = documentLeaves(saved);
  const losses = [];
  for (const [path, value] of before) {
    if (isEditorOwned(path, owned)) continue;
    if (!after.has(path)) losses.push({ path, change: 'lost' });
    else if (after.get(path) !== value)
      losses.push({ path, change: 'changed' });
  }
  return losses.sort((a, b) =>
    a.path < b.path ? -1 : a.path > b.path ? 1 : 0,
  );
}

/**
 * A mount's identity in both documents: `<location>:<equipment id>`. These are the only mount fields the source
 * catalog carries for every mount (its `name` is display text, and rear, pod and turret flags are not in the
 * source), and both documents name locations by the same enum keys (FRONT, TURRET, BODY, ...).
 */
export const mountKey = (mount) => `${mount.location}:${mount.id}`;

/**
 * The equipment lists as multisets: `losses` are mount keys the source has more of, `additions` keys the saved
 * document has more of. Each surplus copy is its own entry, numbered `<key>#<n>` from 1, so the lists stay
 * duplicate-free and a set fact over them is monotone: losing a second copy adds `#2`, recovering it removes it.
 * Each list is sorted.
 */
export function mountDiff(sourceMounts = [], savedMounts = []) {
  const count = (mounts) => {
    const counts = new Map();
    for (const mount of mounts) {
      const key = mountKey(mount);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  };
  const before = count(sourceMounts);
  const after = count(savedMounts);
  const surplus = (a, b) =>
    [...a]
      .flatMap(([key, n]) =>
        Array.from(
          { length: Math.max(0, n - (b.get(key) ?? 0)) },
          (_, i) => `${key}#${i + 1}`,
        ),
      )
      .sort();
  return { losses: surplus(before, after), additions: surplus(after, before) };
}
