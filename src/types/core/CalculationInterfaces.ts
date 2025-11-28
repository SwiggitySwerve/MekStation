/**
 * Calculation-oriented interfaces consumed by the orchestration layer.
 */

export interface ICalculatedOptimizationImprovement {
  readonly category: 'weight' | 'heat' | 'armor' | 'slots' | 'movement';
  readonly description: string;
  readonly impact: number;
  readonly difficulty: 'easy' | 'moderate' | 'hard';
  readonly priority: 'high' | 'medium' | 'low';
}


