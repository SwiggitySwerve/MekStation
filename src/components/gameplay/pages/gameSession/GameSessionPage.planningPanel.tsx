import type { useSelectedPlanningWeapons } from '@/pages-modules/gameplay/games/gameSessionPage.helpers';

import {
  CombatPlanningPanel,
  type CombatPlanningPanelProps,
} from '@/components/gameplay/CombatPlanningPanel';

import type { useGameMovementPlanning } from './GameSessionPage.movement';

type GameMovementPlanning = ReturnType<typeof useGameMovementPlanning>;
type SelectedPlanningWeapons = ReturnType<typeof useSelectedPlanningWeapons>;

interface GameSessionPlanningPanelProps {
  readonly showPlanningPanel: boolean;
  readonly movement: GameMovementPlanning;
  readonly selectedUnitId: string | null | undefined;
  readonly selectedPlanningWeapons: SelectedPlanningWeapons;
  readonly onPhysicalAttackIntentChange: NonNullable<
    CombatPlanningPanelProps['onPhysicalAttackIntentChange']
  >;
}

export function GameSessionPlanningPanel({
  movement,
  onPhysicalAttackIntentChange,
  selectedPlanningWeapons,
  selectedUnitId,
  showPlanningPanel,
}: GameSessionPlanningPanelProps): React.ReactElement | null {
  if (!showPlanningPanel || movement.composerActive || !selectedUnitId) {
    return null;
  }

  return (
    <CombatPlanningPanel
      className="max-h-[30vh] min-h-0 shrink-0 overflow-y-auto"
      walkMP={movement.effectiveMovementMps?.walkMP ?? 0}
      runMP={movement.effectiveMovementMps?.runMP ?? 0}
      jumpMP={movement.effectiveMovementMps?.jumpMP ?? 0}
      movementHeatProfile={movement.capability?.movementHeatProfile}
      weapons={selectedPlanningWeapons}
      onPhysicalAttackIntentChange={onPhysicalAttackIntentChange}
    />
  );
}
