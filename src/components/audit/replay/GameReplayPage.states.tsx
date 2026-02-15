import Link from 'next/link';

import { KeyboardShortcutsHelp } from '@/components/audit/replay';
import { Button } from '@/components/ui';

export function ReplayLoading(): React.ReactElement {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="border-accent mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
        <p className="text-text-theme-secondary">Loading game replay...</p>
      </div>
    </div>
  );
}

interface ReplayErrorProps {
  message: string;
  gameId?: string;
}

export function ReplayError({
  message,
  gameId,
}: ReplayErrorProps): React.ReactElement {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-900">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/20">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-text-theme-primary mb-2 text-xl font-bold">
          Replay Error
        </h2>
        <p className="text-text-theme-secondary mb-4">{message}</p>
        <Link href={gameId ? `/gameplay/games/${gameId}` : '/gameplay/games'}>
          <Button variant="primary">
            {gameId ? 'Back to Game' : 'Back to Games'}
          </Button>
        </Link>
      </div>
    </div>
  );
}

interface ReplayKeyboardHelpModalProps {
  onClose: () => void;
}

export function ReplayKeyboardHelpModal({
  onClose,
}: ReplayKeyboardHelpModalProps): React.ReactElement {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <div className="relative">
        <KeyboardShortcutsHelp />
        <button
          onClick={onClose}
          className="text-text-theme-secondary hover:text-text-theme-primary absolute top-4 right-4 p-2 transition-colors"
          aria-label="Close keyboard shortcuts"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
  );
}
