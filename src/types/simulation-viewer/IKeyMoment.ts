import type { GamePhase } from '@/types/gameplay/GameSessionInterfaces';

/**
 * Represents a significant battle event that warrants player attention.
 * Key moments are categorized by tier (1-3) and type, with tier 1 being most significant.
 *
 * @example
 * const firstBlood: IKeyMoment = {
 *   id: 'km-001',
 *   type: 'first-blood',
 *   tier: 1,
 *   turn: 5,
 *   phase: 'weapon-attack',
 *   description: 'Alpha Lance destroyed first enemy unit',
 *   relatedUnitIds: ['unit-001', 'unit-002'],
 *   timestamp: Date.now()
 * };
 */
export interface IKeyMoment {
  readonly id: string;
  readonly type: KeyMomentType;
  readonly tier: 1 | 2 | 3;
  readonly turn: number;
  readonly phase: GamePhase;
  readonly description: string;
  readonly relatedUnitIds: string[];
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: number;
}

/**
 * Types of key moments, organized by tier.
 * Tier 1: Game-changing events
 * Tier 2: Significant tactical events
 * Tier 3: Notable but routine events
 */
export type KeyMomentType =
  // Tier 1 - Game-changing events
  | 'first-blood'
  | 'bv-swing-major'
  | 'comeback'
  | 'wipe'
  | 'last-stand'
  | 'ace-kill'
  // Tier 2 - Significant tactical events
  | 'head-shot'
  | 'ammo-explosion'
  | 'pilot-kill'
  | 'critical-engine'
  | 'critical-gyro'
  | 'alpha-strike'
  | 'focus-fire'
  // Tier 3 - Notable routine events
  | 'heat-crisis'
  | 'mobility-kill'
  | 'weapons-kill'
  | 'rear-arc-hit'
  | 'overkill';
