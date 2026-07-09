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

function getAssignedPilot(
  pilotId: string | null,
  pilots: readonly IPilot[],
): IPilot | undefined {
  if (!pilotId) {
    return undefined;
  }

  return pilots.find((item) => item.id === pilotId);
}

function getPilotSkills(
  pilotId: string | null,
  pilots: readonly IPilot[],
): IPilotSkills {
  if (!pilotId) {
    return { gunnery: 4, piloting: 5 };
  }

  const pilot = getAssignedPilot(pilotId, pilots);
  if (!pilot) {
    return { gunnery: 4, piloting: 5 };
  }

  return {
    gunnery: pilot.skills.gunnery,
    piloting: pilot.skills.piloting,
  };
}

function getPilotToughness(
  pilotId: string | null,
  pilots: readonly IPilot[],
): number | undefined {
  const pilot = getAssignedPilot(pilotId, pilots);
  const toughness = pilot?.rpgToughness;
  return typeof toughness === 'number' && Number.isFinite(toughness)
    ? toughness
    : undefined;
}

function getAssignedPilotDisplayName(
  pilotId: string | null,
  pilots: readonly IPilot[],
): string | undefined {
  const pilot = getAssignedPilot(pilotId, pilots);
  return pilot?.callsign ?? pilot?.name;
}

function buildSessionUnitId(
  side: GameSide,
  slotIndex: number,
  unitRef: string,
): string {
  return `${side}-${slotIndex + 1}-${unitRef}`;
}

function withSessionScopedAdaptedUnitIds(
  assignments: readonly AssignedForceUnit[],
  adaptedUnits: readonly IAdaptedUnit[],
  side: GameSide,
): IAdaptedUnit[] {
  return adaptedUnits.map((unit, index) => ({
    ...unit,
    id: buildSessionUnitId(side, index, assignments[index]?.unitId ?? unit.id),
  }));
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
      id: buildSessionUnitId(GameSide.Player, index, assignment.unitId),
      name:
        getAssignedPilotDisplayName(assignment.pilotId, pilots) ??
        assignment.unitId ??
        `Player Unit ${index + 1}`,
      side: GameSide.Player,
      unitRef: assignment.unitId ?? '',
      pilotRef: assignment.pilotId ?? 'Unknown',
      gunnery: getPilotSkills(assignment.pilotId, pilots).gunnery,
      piloting: getPilotSkills(assignment.pilotId, pilots).piloting,
      pilotToughness: getPilotToughness(assignment.pilotId, pilots),
      heatSinks: playerAdapted[index]?.heatSinks,
      heatSinkType: playerAdapted[index]?.heatSinkType,
      initiativeEquipment: playerAdapted[index]?.initiativeEquipment,
      c3Equipment: playerAdapted[index]?.c3Equipment,
    })),
    ...opponentAssignments.map((assignment, index) => ({
      id: buildSessionUnitId(GameSide.Opponent, index, assignment.unitId),
      name:
        getAssignedPilotDisplayName(assignment.pilotId, pilots) ??
        assignment.unitId ??
        `Opponent Unit ${index + 1}`,
      side: GameSide.Opponent,
      unitRef: assignment.unitId ?? '',
      pilotRef: assignment.pilotId ?? 'Unknown',
      gunnery: getPilotSkills(assignment.pilotId, pilots).gunnery,
      piloting: getPilotSkills(assignment.pilotId, pilots).piloting,
      pilotToughness: getPilotToughness(assignment.pilotId, pilots),
      heatSinks: opponentAdapted[index]?.heatSinks,
      heatSinkType: opponentAdapted[index]?.heatSinkType,
      initiativeEquipment: opponentAdapted[index]?.initiativeEquipment,
      c3Equipment: opponentAdapted[index]?.c3Equipment,
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
  const playerSessionAdapted = withSessionScopedAdaptedUnitIds(
    playerAssignments,
    playerAdapted,
    GameSide.Player,
  );
  const opponentSessionAdapted = withSessionScopedAdaptedUnitIds(
    opponentAssignments,
    opponentAdapted,
    GameSide.Opponent,
  );

  const gameUnits = buildGameUnits(
    playerAssignments,
    opponentAssignments,
    playerSessionAdapted,
    opponentSessionAdapted,
    pilots,
  );

  return {
    playerAdapted: playerSessionAdapted,
    opponentAdapted: opponentSessionAdapted,
    gameUnits,
  };
}
