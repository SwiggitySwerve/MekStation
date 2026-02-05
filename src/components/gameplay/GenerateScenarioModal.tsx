import type { IGeneratedScenario } from '@/types/scenario';

/**
 * Generate Scenario Modal
 * Modal dialog for generating a battle scenario with full configuration options.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */
import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { Button } from '@/components/ui';

import { ScenarioGenerator } from './ScenarioGenerator';

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
    <ModalOverlay isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-text-theme-primary text-xl font-semibold">
            Generate Battle Scenario
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
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
          <div className="py-8 text-center">
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
