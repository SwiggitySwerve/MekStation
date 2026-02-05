/**
 * Quick Game Page
 * Entry point for quick session mode - standalone games without campaign persistence.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

import {
  QuickGameSetup,
  QuickGameReview,
  QuickGamePlay,
  QuickGameResults,
} from '@/components/quickgame';
import { Button, Card } from '@/components/ui';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { QuickGameStep } from '@/types/quickgame';

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

function StepIndicator({
  currentStep,
}: StepIndicatorProps): React.ReactElement {
  const currentIndex = SETUP_STEPS.findIndex((s) => s.step === currentStep);

  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {SETUP_STEPS.map((stepInfo, index) => {
        const isActive = stepInfo.step === currentStep;
        const isCompleted = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={stepInfo.step} className="flex items-center">
            {index > 0 && (
              <div
                className={`h-0.5 w-12 ${
                  isCompleted ? 'bg-cyan-500' : 'bg-gray-600'
                }`}
              />
            )}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isActive
                    ? 'bg-cyan-500 text-white'
                    : isCompleted
                      ? 'border border-cyan-500 bg-cyan-500/20 text-cyan-400'
                      : 'bg-gray-700 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={`mt-1 text-xs ${
                  isActive
                    ? 'text-cyan-400'
                    : isPending
                      ? 'text-gray-500'
                      : 'text-gray-400'
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
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-lg p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/20">
            <svg
              className="h-8 w-8 text-cyan-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Quick Game</h1>
          <p className="text-gray-400">
            Play a standalone skirmish without campaign setup. Perfect for
            testing units, learning mechanics, or a quick battle.
          </p>
        </div>

        <div className="mb-8 space-y-3 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-emerald-500/20">
              <svg
                className="h-4 w-4 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                No persistence required
              </p>
              <p className="text-xs text-gray-500">
                Units exist only for this session
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-emerald-500/20">
              <svg
                className="h-4 w-4 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                Auto-generated opponents
              </p>
              <p className="text-xs text-gray-500">
                Balanced forces created for you
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-emerald-500/20">
              <svg
                className="h-4 w-4 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Session replay</p>
              <p className="text-xs text-gray-500">
                Review the battle after completion
              </p>
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
        return <QuickGamePlay />;

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
        <header className="border-b border-gray-700 bg-gray-800 px-4 py-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/gameplay/games')}
                className="text-gray-400 transition-colors hover:text-white"
                aria-label="Back to games"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-white">Quick Game</h1>
            </div>
            {/* Step indicator for setup steps */}
            {game.step !== QuickGameStep.Playing &&
              game.step !== QuickGameStep.Results && (
                <StepIndicator currentStep={game.step} />
              )}
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="border-b border-red-700 bg-red-900/50 px-4 py-2">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300"
                aria-label="Dismiss error"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
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
