import { toast } from '@/components/shared/Toast';
import {
  MIRROR_SESSION_ROLLED_DICE_MESSAGE,
  MirrorSessionRolledDiceError,
} from '@/lib/p2p/mirrorDiceRoller';

/**
 * Run a store action; if a guest mirror was asked to roll, tell the
 * player why nothing happened instead of letting the click vanish.
 * Only the mirror's named error is caught - anything else rethrows.
 */
export function withMirrorDiceNotice(action: () => void): void {
  try {
    action();
  } catch (error) {
    if (!(error instanceof MirrorSessionRolledDiceError)) throw error;
    toast({
      message: MIRROR_SESSION_ROLLED_DICE_MESSAGE,
      variant: 'error',
      duration: 8000,
    });
  }
}
