import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { getAmmoExplosionTN } from '@/constants/heat';
import {
  CombatLocation,
  GameEventType,
  GamePhase,
  IAmmoSlotState,
  IGameEvent,
  IGameState,
  IUnitGameState,
} from '@/types/gameplay';
import {
  applyAmmoExplosionRearArmorBlowout,
  resolveCaseAdjustedAmmoExplosionDamage,
} from '@/utils/gameplay/ammoTracking';
import { resolveInternalDamage } from '@/utils/gameplay/damage';

import type { IWeapon } from '../../ai/types';

import {
  applyDamageResultToState,
  buildDamageState,
} from '../SimulationRunnerState';
import { applyAmmoExplosionPilotDamage } from './ammoExplosionPilotDamage';
import { createGameEvent } from './utils';
import { damagePerRoundForBin } from './weaponAttackHelpers';

interface IApplyHeatInducedAmmoExplosionsOptions {
  readonly currentState: IGameState;
  readonly unit: IUnitGameState;
  readonly unitId: string;
  readonly heat: number;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly d6Roller: D6Roller;
  readonly unitWeapons?: readonly IWeapon[];
  readonly targetNumberModifier?: number;
}

function explosionDamageForBin(
  bin: IAmmoSlotState,
  unitWeapons: readonly IWeapon[] | undefined,
): number {
  return bin.remainingRounds * damagePerRoundForBin(bin, unitWeapons);
}

function selectHeatExplosionBin(
  loadedBins: readonly IAmmoSlotState[],
  unitWeapons: readonly IWeapon[] | undefined,
): IAmmoSlotState {
  return loadedBins.reduce((best, candidate) => {
    const bestDamagePerRound = damagePerRoundForBin(best, unitWeapons);
    const candidateDamagePerRound = damagePerRoundForBin(
      candidate,
      unitWeapons,
    );
    if (candidateDamagePerRound > bestDamagePerRound) {
      return candidate;
    }
    if (
      candidateDamagePerRound === bestDamagePerRound &&
      explosionDamageForBin(candidate, unitWeapons) >
        explosionDamageForBin(best, unitWeapons)
    ) {
      return candidate;
    }
    return best;
  });
}

export function applyHeatInducedAmmoExplosions(
  options: IApplyHeatInducedAmmoExplosionsOptions,
): IGameState {
  const {
    d6Roller,
    events,
    gameId,
    heat,
    targetNumberModifier = 0,
    unit,
    unitId,
    unitWeapons,
  } = options;
  let currentState = {
    ...options.currentState,
    units: {
      ...options.currentState.units,
      [unitId]: unit,
    },
  };

  if (unit.destroyed) {
    return currentState;
  }

  const loadedBins = Object.values(unit.ammoState ?? {}).filter(
    (bin) => bin.remainingRounds > 0 && bin.isExplosive,
  );
  if (loadedBins.length === 0) {
    return currentState;
  }

  const ammoTN = getAmmoExplosionTN(heat, targetNumberModifier);
  if (ammoTN <= 0) {
    return currentState;
  }

  const auto = ammoTN === Infinity;
  let triggered = auto;
  if (!auto) {
    const ammoRoll = d6Roller() + d6Roller();
    triggered = ammoRoll < ammoTN;
  }

  if (triggered) {
    const bin = selectHeatExplosionBin(loadedBins, unitWeapons);
    const explosionDamage = explosionDamageForBin(bin, unitWeapons);
    const caseAdjustedDamage = resolveCaseAdjustedAmmoExplosionDamage(
      unit,
      bin.location as CombatLocation,
      explosionDamage,
    );
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.AmmoExplosion,
        currentState.turn,
        GamePhase.Heat,
        {
          unitId,
          location: bin.location,
          binId: bin.binId,
          weaponType: bin.weaponType,
          roundsDestroyed: bin.remainingRounds,
          damage: explosionDamage,
          caseProtection: caseAdjustedDamage.caseProtection,
          source: 'HeatInduced' as const,
        },
        unitId,
      ),
    );

    const emptiedAmmoState = {
      ...(unit.ammoState ?? {}),
      [bin.binId]: { ...bin, remainingRounds: 0 },
    };
    const cascadeState = buildDamageState({
      ...unit,
      ammoState: emptiedAmmoState,
    });
    const blowout = applyAmmoExplosionRearArmorBlowout(
      cascadeState,
      bin.location as CombatLocation,
      caseAdjustedDamage.caseProtection,
      caseAdjustedDamage.damageToApply,
    );
    const cascadeResult = resolveInternalDamage(
      blowout.state,
      bin.location as CombatLocation,
      caseAdjustedDamage.damageToApply,
      d6Roller,
      { applyHeadPilotDamage: false },
    );
    const cascadeLocationDamages = [
      ...blowout.locationDamages,
      ...cascadeResult.result.locationDamages,
    ];

    currentState = applyDamageResultToState(
      currentState,
      unitId,
      cascadeResult.state,
      {
        ...cascadeResult.result,
        locationDamages: cascadeLocationDamages,
        destructionCause: 'ammo_explosion',
      },
    );
    currentState = {
      ...currentState,
      units: {
        ...currentState.units,
        [unitId]: {
          ...currentState.units[unitId],
          ammoState: emptiedAmmoState,
        },
      },
    };

    const cascadeChain = cascadeLocationDamages;
    for (let i = 0; i < cascadeChain.length; i++) {
      const locDmg = cascadeChain[i];
      const isCascadeTransfer = i > 0;
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.DamageApplied,
          currentState.turn,
          GamePhase.Heat,
          {
            unitId,
            location: locDmg.location,
            damage: locDmg.damage,
            armorRemaining: locDmg.armorRemaining,
            structureRemaining: locDmg.structureRemaining,
            locationDestroyed: locDmg.destroyed,
            sourceUnitId: unitId,
          },
          unitId,
        ),
      );
      if (locDmg.destroyed) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.LocationDestroyed,
            currentState.turn,
            GamePhase.Heat,
            {
              unitId,
              location: locDmg.location,
              viaTransfer: isCascadeTransfer,
            },
            unitId,
          ),
        );
      }
      if (locDmg.transferredDamage > 0 && locDmg.transferLocation) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.TransferDamage,
            currentState.turn,
            GamePhase.Heat,
            {
              unitId,
              fromLocation: locDmg.location,
              toLocation: locDmg.transferLocation,
              damage: locDmg.transferredDamage,
            },
            unitId,
          ),
        );
      }
    }

    const pilotResult = applyAmmoExplosionPilotDamage({
      currentState,
      events,
      gameId,
      targetId: unitId,
      sourceUnitId: unitId,
      phase: GamePhase.Heat,
      totalExplosionDamage: explosionDamage,
      caseProtection: caseAdjustedDamage.caseProtection,
      d6Roller,
    });
    currentState = pilotResult.currentState;

    if (
      (cascadeResult.result.unitDestroyed || pilotResult.pilotDestroyed) &&
      !unit.destroyed
    ) {
      const finalUnit = currentState.units[unitId];
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.UnitDestroyed,
          currentState.turn,
          GamePhase.Heat,
          {
            unitId,
            cause: finalUnit?.destructionCause ?? ('ammo_explosion' as const),
          },
        ),
      );
    }
  }

  return currentState;
}
