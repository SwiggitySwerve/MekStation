import type { ReloadTiming } from './campaignUnload';

export type TimingVerdict = 'ok' | 'recorded' | 'gating';

/**
 * Reload/pagehide schedule check for one arm of one trial. A miss gates
 * (INCONCLUSIVE) only for measured trials; a warm-up miss is recorded so the
 * cold-start trial cannot void the sweep, yet stays visible.
 */
export function judgeReloadTiming(
  timing: Pick<ReloadTiming, 'reloadCallMs' | 'pagehideMs'>,
  offsetMs: number,
  measured: boolean,
): TimingVerdict {
  const missed =
    timing.reloadCallMs >= offsetMs + 100 ||
    timing.pagehideMs >= offsetMs + 150;
  if (!missed) return 'ok';
  return measured ? 'gating' : 'recorded';
}
