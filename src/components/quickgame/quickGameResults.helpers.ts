/**
 * Quick Game Results Helpers
 * Constants and types for the results display.
 */

import { GameEventType, GamePhase } from '@/types/gameplay';

export type ResultsTab = 'summary' | 'units' | 'damage' | 'timeline';

export const RESULTS_TABS: readonly { id: ResultsTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'units', label: 'Units' },
  { id: 'damage', label: 'Damage' },
  { id: 'timeline', label: 'Timeline' },
];

export const EVENT_LABELS: Partial<Record<GameEventType, string>> = {
  [GameEventType.GameCreated]: 'Game Created',
  [GameEventType.GameStarted]: 'Game Started',
  [GameEventType.GameEnded]: 'Game Ended',
  [GameEventType.TurnStarted]: 'Turn Started',
  [GameEventType.TurnEnded]: 'Turn Ended',
  [GameEventType.PhaseChanged]: 'Phase Changed',
  [GameEventType.InitiativeRolled]: 'Initiative Rolled',
  [GameEventType.MovementDeclared]: 'Movement',
  [GameEventType.AttackDeclared]: 'Attack Declared',
  [GameEventType.AttackResolved]: 'Attack Resolved',
  [GameEventType.DamageApplied]: 'Damage Applied',
  [GameEventType.UnitDestroyed]: 'Unit Destroyed',
  [GameEventType.CriticalHit]: 'Critical Hit',
};

export const PHASE_LABELS: Record<GamePhase, string> = {
  [GamePhase.Initiative]: 'Initiative',
  [GamePhase.Movement]: 'Movement',
  [GamePhase.WeaponAttack]: 'Weapon Attack',
  [GamePhase.PhysicalAttack]: 'Physical Attack',
  [GamePhase.Heat]: 'Heat',
  [GamePhase.End]: 'End',
};
