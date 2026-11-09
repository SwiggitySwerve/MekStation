import { KeyboardShortcutsHelp } from '@/components/audit/replay';
import { Button, PageLoading } from '@/components/ui';
import { SvgIcon } from '@/components/ui/SvgIcon';

export function ReplayLoading(): React.ReactElement {
  return <PageLoading message="Loading game replay..." />;
}

interface ReplayErrorProps {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export function ReplayError({
  message,
  onRetry,
  isRetrying,
}: ReplayErrorProps): React.ReactElement {
  return (
    <div
      role="alert"
      className="bg-surface-base border-border-theme flex flex-shrink-0 flex-wrap items-center gap-3 border-b px-4 py-3"
    >
      <p className="text-text-theme-primary min-w-0 flex-1 text-sm break-words">
        {message}
      </p>
      <Button onClick={onRetry} isLoading={isRetrying} aria-busy={isRetrying}>
        {isRetrying ? 'Retrying...' : 'Retry'}
      </Button>
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
          <SvgIcon
            size="control"
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
          </SvgIcon>
        </button>
      </div>
    </div>
  );
}
