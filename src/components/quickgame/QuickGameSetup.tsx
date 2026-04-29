/**
 * Quick Game Setup Component
 * Handles unit selection and scenario configuration steps.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useQuickGameSelector } from '@/stores/useQuickGameStore';
import { QuickGameStep } from '@/types/quickgame';

import { ScenarioConfigStep } from './QuickGameSetupScenarioConfig';
import { UnitSelectionStep } from './QuickGameSetupUnitSelection';

export function QuickGameSetup(): React.ReactElement {
  const game = useQuickGameSelector((state) => state.game);

  if (!game) {
    return (
      <div className="py-8 text-center text-gray-400">No game in progress</div>
    );
  }

  switch (game.step) {
    case QuickGameStep.SelectUnits:
      return <UnitSelectionStep />;
    case QuickGameStep.ConfigureScenario:
      return <ScenarioConfigStep />;
    default:
      return <UnitSelectionStep />;
  }
}
