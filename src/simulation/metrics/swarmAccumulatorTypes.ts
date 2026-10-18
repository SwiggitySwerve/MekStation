// =============================================================================
// Mutable accumulators (private — implementation detail)
// =============================================================================

export interface MutableChassisMatchup {
  wins: number;
  losses: number;
  draws: number;
  /**
   * Phase 5 combat-fidelity counters — running totals across every run
   * that contributed to this cell. The freeze step divides by `runCount`
   * to produce the per-record averages.
   */
  totalCriticalsLanded: number;
  totalComponentsDestroyed: number;
  totalAmmoExplosions: number;
  totalShutdowns: number;
  totalFalls: number;
  /** Number of runs that contributed to this cell (denominator for averages). */
  runCount: number;
}

export interface MutableGunneryBracketAcc {
  wins: number;
  losses: number;
  draws: number;
  totalDamage: number;
  participantRunCount: number;
}

export interface MutableAIVariantAcc {
  wins: number;
  losses: number;
  draws: number;
  totalTurns: number;
  runCount: number;
}

export interface MutablePilotAcc {
  runs: number;
  wins: number;
  kills: number;
  takenWounds: number;
}

export interface MutableUnitPerformanceAcc {
  wins: number;
  losses: number;
  draws: number;
  totalDamageDealt: number;
}
