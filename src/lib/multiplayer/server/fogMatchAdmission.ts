import type { IMatchConfig } from './IMatchStore';

/** Fixed, secret-free refusal reason for B14 fog containment. */
export const FOG_REFUSAL = 'fog-projection-unavailable';

/**
 * The single B14 capability predicate: "no per-viewer reveal projection
 * available for this match". Fog-on private reads are served only through a
 * per-viewer projection, and none exists yet, so fog-on and unknown
 * configuration refuse. A known config that omits the legacy flag is fog-off.
 *
 * @spec openspec/specs/fog-of-war/spec.md
 */
export function noPerViewerRevealProjection(
  config: IMatchConfig | undefined,
): boolean {
  return config === undefined || config.fogOfWar === true;
}
