/**
 * Generate Scenario Modal
 * Modal dialog for generating a battle scenario with full configuration options.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */
import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { Button } from '@/components/ui';
import { ScenarioGenerator } from './ScenarioGenerator';
import type { IGeneratedScenario } from '@/types/scenario';

// =============================================================================
// Types
// =============================================================================

export interface GenerateScenarioModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Called when modal is closed */
  onClose: () => void;
  /** Player force BV */
  playerBV: number;
  /** Player force unit count */
  playerUnitCount: number;
  /** Callback when scenario is generated and accepted */
  onGenerate: (scenario: IGeneratedScenario) => void;
}

// =============================================================================
// Component
// =============================================================================

export function GenerateScenarioModal({
  isOpen,
  onClose,
  playerBV,
  playerUnitCount,
  onGenerate,
}: GenerateScenarioModalProps): React.ReactElement | null {
  const handleGenerate = (scenario: IGeneratedScenario) => {
    onGenerate(scenario);
    onClose();
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-4xl"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-theme-primary">
            Generate Battle Scenario
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {playerBV > 0 ? (
          <ScenarioGenerator
            playerBV={playerBV}
            playerUnitCount={playerUnitCount}
            onGenerate={handleGenerate}
            variant="modal"
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-text-theme-secondary mb-4">
              You need to select a player force before generating a scenario.
            </p>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

export default GenerateScenarioModal;
