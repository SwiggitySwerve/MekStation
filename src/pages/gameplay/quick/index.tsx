/**
 * Quick Game Page
 * Entry point for quick session mode - standalone games without campaign persistence.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { QuickGameStep } from '@/types/quickgame';
import { QuickGameSetup, QuickGameReview, QuickGameResults } from '@/components/quickgame';
import { Button, Card } from '@/components/ui';

// =============================================================================
// Step Indicator Component
// =============================================================================

interface StepIndicatorProps {
  currentStep: QuickGameStep;
}

const SETUP_STEPS = [
  { step: QuickGameStep.SelectUnits, label: 'Select Units' },
  { step: QuickGameStep.ConfigureScenario, label: 'Configure' },
  { step: QuickGameStep.Review, label: 'Review' },
];

function StepIndicator({ currentStep }: StepIndicatorProps): React.ReactElement {
  const currentIndex = SETUP_STEPS.findIndex((s) => s.step === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {SETUP_STEPS.map((stepInfo, index) => {
        const isActive = stepInfo.step === currentStep;
        const isCompleted = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={stepInfo.step} className="flex items-center">
            {index > 0 && (
              <div
                className={`w-12 h-0.5 ${
                  isCompleted ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isActive
                    ? 'bg-cyan-500 text-white'
                    : isCompleted
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`text-xs mt-1 ${
                  isActive ? 'text-cyan-400' : isPending ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {stepInfo.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Welcome Screen Component
// =============================================================================

interface WelcomeScreenProps {
  onStart: () => void;
}

function WelcomeScreen({ onStart }: WelcomeScreenProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Quick Game</h1>
          <p className="text-gray-400">
            Play a standalone skirmish without campaign setup. Perfect for testing units, 
            learning mechanics, or a quick battle.
          </p>
        </div>

        <div className="space-y-3 text-left mb-8">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">No persistence required</p>
              <p className="text-gray-500 text-xs">Units exist only for this session</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Auto-generated opponents</p>
              <p className="text-gray-500 text-xs">Balanced forces created for you</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">Session replay</p>
              <p className="text-gray-500 text-xs">Review the battle after completion</p>
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={onStart}
          data-testid="start-quick-game-btn"
        >
          Start Quick Game
        </Button>
      </Card>
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function QuickGamePage(): React.ReactElement {
  const router = useRouter();
  const { game, startNewGame, error, clearError } = useQuickGameStore();

  // Restore from session storage on mount
  useEffect(() => {
    // Session storage restore is handled by zustand persist middleware
  }, []);

  // Handle starting a new game
  const handleStart = () => {
    startNewGame();
  };

  // Show welcome screen if no game
  if (!game) {
    return (
      <>
        <Head>
          <title>Quick Game | MekStation</title>
        </Head>
        <WelcomeScreen onStart={handleStart} />
      </>
    );
  }

  // Route to appropriate view based on step
  const renderContent = () => {
    switch (game.step) {
      case QuickGameStep.SelectUnits:
      case QuickGameStep.ConfigureScenario:
        return <QuickGameSetup />;

      case QuickGameStep.Review:
        return <QuickGameReview />;

      case QuickGameStep.Playing:
        // For now, redirect to the game interface
        // In a full implementation, this would render the game
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <Card className="p-8 text-center">
              <p className="text-gray-400 mb-4">Game in progress...</p>
              <p className="text-xs text-gray-500">
                (Full game interface would be rendered here)
              </p>
            </Card>
          </div>
        );

      case QuickGameStep.Results:
        return <QuickGameResults />;

      default:
        return <QuickGameSetup />;
    }
  };

  return (
    <>
      <Head>
        <title>Quick Game | MekStation</title>
      </Head>

      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/gameplay/games')}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Back to games"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-white">Quick Game</h1>
            </div>

            {/* Step indicator for setup steps */}
            {game.step !== QuickGameStep.Playing && game.step !== QuickGameStep.Results && (
              <StepIndicator currentStep={game.step} />
            )}

            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="bg-red-900/50 border-b border-red-700 px-4 py-2">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <p className="text-red-300 text-sm">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300"
                aria-label="Dismiss error"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <main>{renderContent()}</main>
      </div>
    </>
  );
}
