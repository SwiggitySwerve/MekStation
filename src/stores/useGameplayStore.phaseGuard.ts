import { toast } from '@/components/shared/Toast';
import { GamePhase } from '@/types/gameplay';

export type PhaseGatedIntent = 'movement' | 'attack';

const PHASE_LABELS: Readonly<Record<GamePhase, string>> = {
  [GamePhase.Initiative]: 'Initiative',
  [GamePhase.Movement]: 'Movement',
  [GamePhase.WeaponAttack]: 'Weapon Attack',
  [GamePhase.PhysicalAttack]: 'Physical Attack',
  [GamePhase.Heat]: 'Heat',
  [GamePhase.End]: 'End',
};

const ADVANCE_CONTROL_LABELS: Readonly<Record<GamePhase, string>> = {
  [GamePhase.Initiative]: 'Roll Initiative & Begin',
  [GamePhase.Movement]: 'End Phase',
  [GamePhase.WeaponAttack]: 'End Phase',
  [GamePhase.PhysicalAttack]: 'End Phase',
  [GamePhase.Heat]: 'Continue',
  [GamePhase.End]: 'Next Turn',
};

function formatIntent(intent: PhaseGatedIntent): string {
  return intent === 'movement' ? 'Movement' : 'Attack';
}

export function notifyOutOfPhaseIntent(
  intent: PhaseGatedIntent,
  currentPhase: GamePhase,
): void {
  toast({
    message: `${formatIntent(intent)} is unavailable during ${
      PHASE_LABELS[currentPhase]
    }. Use ${ADVANCE_CONTROL_LABELS[currentPhase]} to advance the phase.`,
    variant: 'info',
    duration: 5000,
  });
}

export function allowIntentInPhase({
  currentPhase,
  requiredPhase,
  intent,
}: {
  readonly currentPhase: GamePhase;
  readonly requiredPhase: GamePhase;
  readonly intent: PhaseGatedIntent;
}): boolean {
  if (currentPhase === requiredPhase) return true;
  notifyOutOfPhaseIntent(intent, currentPhase);
  return false;
}

export function allowMovementIntentInPhase(currentPhase: GamePhase): boolean {
  return allowIntentInPhase({
    currentPhase,
    requiredPhase: GamePhase.Movement,
    intent: 'movement',
  });
}

export function allowAttackIntentInPhase(currentPhase: GamePhase): boolean {
  return allowIntentInPhase({
    currentPhase,
    requiredPhase: GamePhase.WeaponAttack,
    intent: 'attack',
  });
}
