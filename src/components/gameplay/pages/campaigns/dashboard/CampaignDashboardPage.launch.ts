/**
 * Dashboard launch-authority facade (umbrella 10.3).
 *
 * The decision lives in `requestLaunchAuthority` so this page and the
 * mission-launch page cannot drift into two launchers. This file keeps
 * the names the dashboard page and its suite already import.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 */

export {
  classifyLaunchFailure,
  resolveLaunchForces as resolveDashboardLaunchForces,
} from '@/lib/campaign/encounter/requestLaunchAuthority';
