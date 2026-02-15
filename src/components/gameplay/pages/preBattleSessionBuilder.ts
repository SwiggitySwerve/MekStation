import type { IAdaptedUnit } from '@/engine/types';
import type { IForce } from '@/types/force';
import type { IPilot } from '@/types/pilot';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameSide, type IGameUnit } from '@/types/gameplay';

type ForceAssignment = IForce['assignments'][number];
type AssignedForceUnit = ForceAssignment & { unitId: string };

interface IPilotSkills {
  gunnery: number;
  piloting: number;
}

interface IBuildPreparedBattleDataInput {
  playerForce: IForce | undefined;
  opponentForce: IForce | undefined;
  pilots: readonly IPilot[];
}

export interface IPreparedBattleData {
  playerAdapted: IAdaptedUnit[];
  opponentAdapted: IAdaptedUnit[];
  gameUnits: IGameUnit[];
}

function hasAssignedUnit(
  assignment: ForceAssignment,
): assignment is AssignedForceUnit {
  return typeof assignment.unitId === 'string' && assignment.unitId.length > 0;
}

function getPilotSkills(
  pilotId: string | null,
  pilots: readonly IPilot[],
): IPilotSkills {
  if (!pilotId) {
    return { gunnery: 4, piloting: 5 };
  }

  const pilot = pilots.find((item) => item.id === pilotId);
  if (!pilot) {
    return { gunnery: 4, piloting: 5 };
  }

  return {
    gunnery: pilot.skills.gunnery,
    piloting: pilot.skills.piloting,
  };
}

async function adaptAssignments(
  assignments: readonly AssignedForceUnit[],
  side: GameSide,
  pilots: readonly IPilot[],
): Promise<IAdaptedUnit[]> {
  const adaptedUnits: IAdaptedUnit[] = [];

  for (const assignment of assignments) {
    const skills = getPilotSkills(assignment.pilotId, pilots);
    const adapted = await adaptUnit(assignment.unitId, {
      side,
      gunnery: skills.gunnery,
      piloting: skills.piloting,
    });

    if (adapted) {
      adaptedUnits.push(adapted);
    }
  }

  return adaptedUnits;
}

function buildGameUnits(
  playerAssignments: readonly AssignedForceUnit[],
  opponentAssignments: readonly AssignedForceUnit[],
  playerAdapted: readonly IAdaptedUnit[],
  opponentAdapted: readonly IAdaptedUnit[],
  pilots: readonly IPilot[],
): IGameUnit[] {
  return [
    ...playerAssignments.map((assignment, index) => ({
      id: playerAdapted[index]?.id ?? assignment.unitId ?? assignment.id,
      name: playerAdapted[index]?.id ?? `Player Unit ${index + 1}`,
      side: GameSide.Player,
      unitRef: assignment.unitId ?? '',
      pilotRef: assignment.pilotId ?? 'Unknown',
      gunnery: getPilotSkills(assignment.pilotId, pilots).gunnery,
      piloting: getPilotSkills(assignment.pilotId, pilots).piloting,
    })),
    ...opponentAssignments.map((assignment, index) => ({
      id: opponentAdapted[index]?.id ?? assignment.unitId ?? assignment.id,
      name: opponentAdapted[index]?.id ?? `Opponent Unit ${index + 1}`,
      side: GameSide.Opponent,
      unitRef: assignment.unitId ?? '',
      pilotRef: assignment.pilotId ?? 'Unknown',
      gunnery: getPilotSkills(assignment.pilotId, pilots).gunnery,
      piloting: getPilotSkills(assignment.pilotId, pilots).piloting,
    })),
  ];
}

export function getAssignedUnitIds(force: IForce | undefined): string[] {
  const unitIds: string[] = [];

  if (!force) {
    return unitIds;
  }

  for (const assignment of force.assignments) {
    if (assignment.unitId) {
      unitIds.push(assignment.unitId);
    }
  }

  return unitIds;
}

export async function buildPreparedBattleData({
  playerForce,
  opponentForce,
  pilots,
}: IBuildPreparedBattleDataInput): Promise<IPreparedBattleData> {
  const playerAssignments =
    playerForce?.assignments.filter(hasAssignedUnit) ?? [];
  const opponentAssignments =
    opponentForce?.assignments.filter(hasAssignedUnit) ?? [];

  const playerAdapted = await adaptAssignments(
    playerAssignments,
    GameSide.Player,
    pilots,
  );
  const opponentAdapted = await adaptAssignments(
    opponentAssignments,
    GameSide.Opponent,
    pilots,
  );

  const gameUnits = buildGameUnits(
    playerAssignments,
    opponentAssignments,
    playerAdapted,
    opponentAdapted,
    pilots,
  );

  return {
    playerAdapted,
    opponentAdapted,
    gameUnits,
  };
}
