import type { IBatchResult } from '@/simulation/batchOutcome';
import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';

// =============================================================================
// Types
// =============================================================================

export interface QuickSimResultPanelProps {
  /** Aggregated Monte Carlo result. */
  result: IBatchResult;
  /**
   * Optional unit metadata so the casualty section can render
   * designations and split per-unit survival between Player / Opponent
   * columns. Typically the same `gameUnits` array passed to `runBatch`.
   */
  unitMeta?: readonly IGameUnit[];
  /** True when the result was assembled from a cancelled batch. */
  partial?: boolean;
  /** Optional rerun handler that mounts a "Rerun" button in the header. */
  onRerun?: () => void;
  /** Optional run handler used by the empty-state CTA (`totalRuns === 0`). */
  onRunBatch?: () => void;
  /** Optional className for the outer container. */
  className?: string;
}
