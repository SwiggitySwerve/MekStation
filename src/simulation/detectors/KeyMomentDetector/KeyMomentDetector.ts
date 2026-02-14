import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';

import {
  GameEventType,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import { processUnitDestroyed } from './tier1Moments';
import {
  processAmmoExplosion,
  processAttackResolved,
  processCriticalHit,
  processDamageApplied,
  processPilotHit,
} from './tier2Moments';
import {
  processCriticalHitTier3,
  processHeatEffectApplied,
} from './tier3Moments';
import {
  calculateBvAdvantage,
  calculateBvRatio,
  type BattleState,
  type DetectorTrackingState,
  TIER_MAP,
} from './types';

export class KeyMomentDetector {
  detect(
    events: readonly IGameEvent[],
    battleState: BattleState,
  ): IKeyMoment[] {
    const state = this.initializeTrackingState(battleState);
    const moments: IKeyMoment[] = [];

    for (const event of events) {
      const detected = this.processEvent(event, battleState, state);
      for (const moment of detected) {
        moments.push(moment);
      }
    }

    return this.deduplicateMoments(moments);
  }

  private initializeTrackingState(
    battleState: BattleState,
  ): DetectorTrackingState {
    const armorPerUnit = new Map<string, Record<string, number>>();
    const structurePerUnit = new Map<string, Record<string, number>>();

    for (const unit of battleState.units) {
      armorPerUnit.set(unit.id, { ...unit.initialArmor });
      structurePerUnit.set(unit.id, { ...unit.initialStructure });
    }

    const initialAdvantage = calculateBvAdvantage(battleState.units, new Set());

    return {
      firstBloodDetected: false,
      destroyedUnits: new Set(),
      killsPerUnit: new Map(),
      previousBvAdvantage: initialAdvantage,
      minPlayerBvRatio: calculateBvRatio(
        battleState.units,
        new Set(),
        GameSide.Player,
      ),
      minOpponentBvRatio: calculateBvRatio(
        battleState.units,
        new Set(),
        GameSide.Opponent,
      ),
      comebackDetectedPlayer: false,
      comebackDetectedOpponent: false,
      wipeDetected: false,
      lastStandDetected: new Set(),
      aceKillDetected: new Set(),
      attacksPerTurnPerTarget: new Map(),
      weaponsFiredPerTurnPerUnit: new Map(),
      focusFireDetected: new Map(),
      alphaStrikeDetected: new Map(),
      armorPerUnit,
      structurePerUnit,
      destroyedWeaponsPerUnit: new Map(),
      mobilityKillDetected: new Set(),
      weaponsKillDetected: new Set(),
      momentCounter: 0,
    };
  }

  private processEvent(
    event: IGameEvent,
    battleState: BattleState,
    state: DetectorTrackingState,
  ): IKeyMoment[] {
    switch (event.type) {
      case GameEventType.UnitDestroyed:
        return processUnitDestroyed(
          event,
          battleState,
          state,
          this.createMoment.bind(this),
        );

      case GameEventType.DamageApplied:
        return processDamageApplied(
          event,
          battleState,
          state,
          this.createMoment.bind(this),
        );

      case GameEventType.AttackResolved:
        return processAttackResolved(
          event,
          battleState,
          state,
          this.createMoment.bind(this),
        );

      case GameEventType.CriticalHit:
        const tier2Moments = processCriticalHit(
          event,
          battleState,
          state,
          this.createMoment.bind(this),
        );
        const tier3Moments = processCriticalHitTier3(
          event,
          battleState,
          state,
          this.createMoment.bind(this),
        );
        return [...tier2Moments, ...tier3Moments];

      case GameEventType.AmmoExplosion:
        return processAmmoExplosion(
          event,
          battleState,
          state,
          this.createMoment.bind(this),
        );

      case GameEventType.HeatEffectApplied:
        return processHeatEffectApplied(
          event,
          battleState,
          state,
          this.createMoment.bind(this),
        );

      case GameEventType.PilotHit:
        return processPilotHit(
          event,
          battleState,
          state,
          this.createMoment.bind(this),
        );

      default:
        return [];
    }
  }

  private createMoment(
    type: string,
    event: IGameEvent,
    description: string,
    relatedUnitIds: string[],
    state: DetectorTrackingState,
    metadata?: Record<string, unknown>,
  ): IKeyMoment {
    const id = `km-${type}-${event.turn}-${state.momentCounter++}`;
    const momentType = type as unknown as keyof typeof TIER_MAP;

    return {
      id,
      type: momentType,
      tier: TIER_MAP[momentType],
      turn: event.turn,
      phase: event.phase,
      description,
      relatedUnitIds,
      metadata,
      timestamp: Date.parse(event.timestamp) || Date.now(),
    };
  }

  private deduplicateMoments(moments: IKeyMoment[]): IKeyMoment[] {
    const seen = new Set<string>();
    const result: IKeyMoment[] = [];

    for (const moment of moments) {
      const key = `${moment.type}-${moment.turn}-${[...moment.relatedUnitIds].sort().join(',')}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(moment);
      }
    }

    return result;
  }
}
