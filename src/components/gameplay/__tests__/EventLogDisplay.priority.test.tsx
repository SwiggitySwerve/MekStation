/**
 * EventLogDisplay — getEventPriority helper
 *
 * Verifies the four-tier priority bucketing used by the combat feed
 * to surface high-signal events when the log is collapsed.
 *
 * @spec openspec/changes/add-tactical-map-lenses-feed-replay/specs/tactical-map-interface/spec.md
 *   "Feed prioritizes combat-critical events" scenario
 */

import type { IGameEvent } from '@/types/gameplay';

import { GameEventType, GamePhase } from '@/types/gameplay';

import { getEventPriority } from '../EventLogDisplay.helpers';

// =============================================================================
// Helpers
// =============================================================================

function makeEvent(type: GameEventType, id = 'evt-1'): IGameEvent {
  return {
    id,
    gameId: 'game-1',
    sequence: 1,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    type,
    timestamp: new Date().toISOString(),
    payload: {},
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('getEventPriority', () => {
  describe('critical tier', () => {
    it('UnitDestroyed is critical', () => {
      expect(getEventPriority(makeEvent(GameEventType.UnitDestroyed))).toBe(
        'critical',
      );
    });

    it('AmmoExplosion is critical', () => {
      expect(getEventPriority(makeEvent(GameEventType.AmmoExplosion))).toBe(
        'critical',
      );
    });

    it('GameEnded is critical', () => {
      expect(getEventPriority(makeEvent(GameEventType.GameEnded))).toBe(
        'critical',
      );
    });
  });

  describe('high tier', () => {
    it('CriticalHit is high', () => {
      expect(getEventPriority(makeEvent(GameEventType.CriticalHit))).toBe(
        'high',
      );
    });

    it('CriticalHitResolved is high', () => {
      expect(
        getEventPriority(makeEvent(GameEventType.CriticalHitResolved)),
      ).toBe('high');
    });

    it('HeatEffectApplied is high', () => {
      expect(getEventPriority(makeEvent(GameEventType.HeatEffectApplied))).toBe(
        'high',
      );
    });
  });

  describe('normal tier', () => {
    it('AttackResolved is normal', () => {
      expect(getEventPriority(makeEvent(GameEventType.AttackResolved))).toBe(
        'normal',
      );
    });

    it('DamageApplied is normal', () => {
      expect(getEventPriority(makeEvent(GameEventType.DamageApplied))).toBe(
        'normal',
      );
    });

    it('PhysicalAttackResolved is normal', () => {
      expect(
        getEventPriority(makeEvent(GameEventType.PhysicalAttackResolved)),
      ).toBe('normal');
    });

    it('PhaseChanged is normal', () => {
      expect(getEventPriority(makeEvent(GameEventType.PhaseChanged))).toBe(
        'normal',
      );
    });

    it('PilotHit is normal', () => {
      expect(getEventPriority(makeEvent(GameEventType.PilotHit))).toBe(
        'normal',
      );
    });
  });

  describe('low tier', () => {
    it('MovementDeclared is low', () => {
      expect(getEventPriority(makeEvent(GameEventType.MovementDeclared))).toBe(
        'low',
      );
    });

    it('TurnStarted is low', () => {
      expect(getEventPriority(makeEvent(GameEventType.TurnStarted))).toBe(
        'low',
      );
    });

    it('HeatGenerated is low', () => {
      expect(getEventPriority(makeEvent(GameEventType.HeatGenerated))).toBe(
        'low',
      );
    });

    it('InitiativeRolled is low', () => {
      expect(getEventPriority(makeEvent(GameEventType.InitiativeRolled))).toBe(
        'low',
      );
    });
  });
});
