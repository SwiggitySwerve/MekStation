import type { NextRouter } from 'next/router';

import { useCallback, useState } from 'react';

import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IAdaptedUnit } from '@/engine/types';
import type { IPilot } from '@/types/pilot';
import type {
  ISkirmishLaunchConfig,
  ISkirmishUnitSelection,
} from '@/utils/gameplay/preBattleSessionBuilder';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameEngine } from '@/engine/GameEngine';
import { createGridFromTerrainPreset } from '@/engine/GameEngine.helpers';
import { EncounterStatus, type IEncounter } from '@/types/encounter';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { buildFromSkirmishConfig } from '@/utils/gameplay/preBattleSessionBuilder';
import { logger } from '@/utils/logger';

import { persistInteractiveLaunchRecoveryLog } from './usePreBattleLaunch';

interface UsePreBattleSkirmishOptions {
  encounter: IEncounter | undefined;
  router: NextRouter;
  setInteractiveSession: (session: InteractiveSession) => void;
  showToast: (toast: { message: string; variant: 'success' | 'error' }) => void;
}

interface UsePreBattleSkirmishResult {
  playerUnits: readonly ISkirmishUnitSelection[];
  opponentUnits: readonly ISkirmishUnitSelection[];
  isLaunching: boolean;
  addPlayerUnit: (selection: ISkirmishUnitSelection) => void;
  removePlayerUnit: (unitId: string) => void;
  assignPlayerPilot: (unitId: string, pilot: IPilot | null) => void;
  addOpponentUnit: (selection: ISkirmishUnitSelection) => void;
  removeOpponentUnit: (unitId: string) => void;
  assignOpponentPilot: (unitId: string, pilot: IPilot | null) => void;
  launchSkirmish: (config: ISkirmishLaunchConfig) => Promise<void>;
}

type SkirmishSide = 'player' | 'opponent';

function stripPilotFromSelections(
  list: readonly ISkirmishUnitSelection[],
  pilot: IPilot | null,
): readonly ISkirmishUnitSelection[] {
  if (!pilot) return list;
  return list.map((unit) =>
    unit.pilot?.pilotId === pilot.id ? { ...unit, pilot: null } : unit,
  );
}

function applyPilotToSelection(
  list: readonly ISkirmishUnitSelection[],
  unitId: string,
  pilot: IPilot | null,
): readonly ISkirmishUnitSelection[] {
  return list.map((unit) =>
    unit.unitId === unitId
      ? {
          ...unit,
          pilot: pilot
            ? {
                pilotId: pilot.id,
                callsign: pilot.callsign ?? pilot.name,
                gunnery: pilot.skills.gunnery,
                piloting: pilot.skills.piloting,
                rpgToughness: pilot.rpgToughness,
              }
            : null,
        }
      : unit,
  );
}

function updatePilotAssignment(
  list: readonly ISkirmishUnitSelection[],
  targetSide: SkirmishSide,
  currentSide: SkirmishSide,
  unitId: string,
  pilot: IPilot | null,
): readonly ISkirmishUnitSelection[] {
  const stripped = stripPilotFromSelections(list, pilot);
  return targetSide === currentSide
    ? applyPilotToSelection(stripped, unitId, pilot)
    : stripped;
}

function addUniqueSkirmishUnit(
  units: readonly ISkirmishUnitSelection[],
  selection: ISkirmishUnitSelection,
): readonly ISkirmishUnitSelection[] {
  if (units.length >= 2) return units;
  if (units.some((unit) => unit.unitId === selection.unitId)) return units;
  return [...units, selection];
}

function ensureEncounterCanLaunch(
  encounter: IEncounter | undefined,
): string | null {
  if (!encounter) return 'Encounter not loaded';
  if (
    encounter.status === EncounterStatus.Launched ||
    encounter.status === EncounterStatus.Completed
  ) {
    return 'Encounter already launched - return to the encounter page to continue.';
  }
  return null;
}

async function adaptSelection(
  selection: ISkirmishUnitSelection,
  side: GameSide,
): Promise<IAdaptedUnit | null> {
  const pilot = selection.pilot;
  return adaptUnit(selection.unitId, {
    side,
    gunnery: pilot?.gunnery ?? 4,
    piloting: pilot?.piloting ?? 5,
  });
}

function requireAllAdaptedUnits(
  adaptedUnits: readonly (IAdaptedUnit | null)[],
  expectedCount: number,
): IAdaptedUnit[] {
  const units = adaptedUnits.filter(
    (unit): unit is IAdaptedUnit => unit !== null,
  );
  if (units.length !== expectedCount) {
    throw new Error(
      'Failed to adapt one or more picked units - check the unit catalog',
    );
  }
  return units;
}

function buildGameUnits(
  session: ReturnType<typeof buildFromSkirmishConfig>,
): IGameUnit[] {
  return session.units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    side: unit.side,
    unitRef: unit.unitRef,
    pilotRef: unit.pilotRef,
    gunnery: unit.gunnery,
    piloting: unit.piloting,
    pilotToughness: unit.pilotToughness,
  }));
}

async function createInteractiveSkirmishSession(
  config: ISkirmishLaunchConfig,
  encounter: IEncounter,
): Promise<InteractiveSession> {
  const session = buildFromSkirmishConfig(config);
  const [playerAdapted, opponentAdapted] = await Promise.all([
    Promise.all(
      config.player.units.map((unit) => adaptSelection(unit, GameSide.Player)),
    ),
    Promise.all(
      config.opponent.units.map((unit) =>
        adaptSelection(unit, GameSide.Opponent),
      ),
    ),
  ]);

  const adaptedPlayerUnits = requireAllAdaptedUnits(
    playerAdapted,
    config.player.units.length,
  );
  const adaptedOpponentUnits = requireAllAdaptedUnits(
    opponentAdapted,
    config.opponent.units.length,
  );

  const engine = new GameEngine({
    seed: Date.now(),
    mapRadius: config.mapRadius,
    turnLimit: config.turnLimit,
    grid: createGridFromTerrainPreset(config.mapRadius, config.terrainPreset),
  });
  return engine.createInteractiveSession(
    adaptedPlayerUnits,
    adaptedOpponentUnits,
    buildGameUnits(session),
    { encounterId: encounter.id },
  );
}

export function usePreBattleSkirmish({
  encounter,
  router,
  setInteractiveSession,
  showToast,
}: UsePreBattleSkirmishOptions): UsePreBattleSkirmishResult {
  const [playerUnits, setPlayerUnits] = useState<
    readonly ISkirmishUnitSelection[]
  >([]);
  const [opponentUnits, setOpponentUnits] = useState<
    readonly ISkirmishUnitSelection[]
  >([]);
  const [isLaunching, setIsLaunching] = useState(false);

  const assignPilotMoving = useCallback(
    (targetSide: SkirmishSide, unitId: string, pilot: IPilot | null) => {
      setPlayerUnits((prev) =>
        updatePilotAssignment(prev, targetSide, 'player', unitId, pilot),
      );
      setOpponentUnits((prev) =>
        updatePilotAssignment(prev, targetSide, 'opponent', unitId, pilot),
      );
    },
    [],
  );

  const addPlayerUnit = useCallback((selection: ISkirmishUnitSelection) => {
    setPlayerUnits((prev) => addUniqueSkirmishUnit(prev, selection));
  }, []);

  const removePlayerUnit = useCallback((unitId: string) => {
    setPlayerUnits((prev) => prev.filter((unit) => unit.unitId !== unitId));
  }, []);

  const addOpponentUnit = useCallback((selection: ISkirmishUnitSelection) => {
    setOpponentUnits((prev) => addUniqueSkirmishUnit(prev, selection));
  }, []);

  const removeOpponentUnit = useCallback((unitId: string) => {
    setOpponentUnits((prev) => prev.filter((unit) => unit.unitId !== unitId));
  }, []);

  const assignPlayerPilot = useCallback(
    (unitId: string, pilot: IPilot | null) => {
      assignPilotMoving('player', unitId, pilot);
    },
    [assignPilotMoving],
  );

  const assignOpponentPilot = useCallback(
    (unitId: string, pilot: IPilot | null) => {
      assignPilotMoving('opponent', unitId, pilot);
    },
    [assignPilotMoving],
  );

  const launchSkirmish = useCallback(
    async (config: ISkirmishLaunchConfig) => {
      const launchError = ensureEncounterCanLaunch(encounter);
      if (launchError || !encounter) {
        showToast({
          message: launchError ?? 'Encounter not loaded',
          variant: 'error',
        });
        return;
      }

      setIsLaunching(true);
      try {
        const interactiveSession = await createInteractiveSkirmishSession(
          config,
          encounter,
        );
        const liveSession = interactiveSession.getSession();

        setInteractiveSession(interactiveSession);
        await persistInteractiveLaunchRecoveryLog(liveSession);
        logger.info('Skirmish session launched', {
          sessionId: liveSession.id,
          encounterId: encounter.id,
        });
        showToast({ message: 'Launching skirmish...', variant: 'success' });

        void router.push(`/gameplay/games/${liveSession.id}`);
      } catch (err) {
        logger.error('Skirmish launch failed:', err);
        showToast({
          message:
            err instanceof Error ? err.message : 'Failed to launch skirmish',
          variant: 'error',
        });
      } finally {
        setIsLaunching(false);
      }
    },
    [encounter, router, setInteractiveSession, showToast],
  );

  return {
    playerUnits,
    opponentUnits,
    isLaunching,
    addPlayerUnit,
    removePlayerUnit,
    assignPlayerPilot,
    addOpponentUnit,
    removeOpponentUnit,
    assignOpponentPilot,
    launchSkirmish,
  };
}
