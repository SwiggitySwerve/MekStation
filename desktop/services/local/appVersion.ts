/**
 * App version comparison for the backup restore check (S1b).
 *
 * Strict numeric `major.minor.patch`, so `0.10.0` is newer than `0.9.0`. A
 * prerelease sorts below its own release. Build metadata (`+...`) is ignored.
 * Deliberately not a dependency: the desktop package needs ten lines of this,
 * not a semver library.
 */

interface IParsedVersion {
  readonly numbers: readonly [number, number, number];
  readonly prerelease: string | null;
}

const VERSION_PATTERN =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function parseAppVersion(raw: string): IParsedVersion | null {
  const match = VERSION_PATTERN.exec(raw);
  if (!match) return null;
  return {
    numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] ?? null,
  };
}

/**
 * Positive when `a` is newer than `b`, negative when older, 0 when equal;
 * `null` when either side is not a readable version.
 */
export function compareAppVersions(a: string, b: string): number | null {
  const left = parseAppVersion(a);
  const right = parseAppVersion(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i += 1) {
    if (left.numbers[i] !== right.numbers[i]) {
      return left.numbers[i] - right.numbers[i];
    }
  }
  if (left.prerelease === right.prerelease) return 0;
  if (left.prerelease === null) return 1;
  if (right.prerelease === null) return -1;
  return left.prerelease < right.prerelease ? -1 : 1;
}
