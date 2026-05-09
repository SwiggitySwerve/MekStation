import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback } from 'react';

import { Button, Card } from '@/components/ui';

interface EncounterScenarioGeneratorSectionProps {
  onOpenGenerateModal: () => void;
}

export function EncounterScenarioGeneratorSection({
  onOpenGenerateModal,
}: EncounterScenarioGeneratorSectionProps): React.ReactElement {
  return (
    <Card className="mt-6" data-testid="scenario-generator-section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-text-theme-primary text-lg font-medium">
            Auto-Generate Scenario
          </h2>
          <p className="text-text-theme-muted mt-1 text-sm">
            Automatically generate enemy forces, battle modifiers, and terrain
            based on your player force.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={onOpenGenerateModal}
          data-testid="open-generate-modal-btn"
        >
          Generate Scenario
        </Button>
      </div>
    </Card>
  );
}

interface EncounterActionsFooterProps {
  encounterId: string;
  onDelete: () => void;
}

export function EncounterActionsFooter({
  encounterId,
  onDelete,
}: EncounterActionsFooterProps): React.ReactElement {
  return (
    <div className="border-border-theme-subtle mt-6 flex justify-between border-t pt-6">
      <Button
        variant="ghost"
        className="text-red-400 hover:bg-red-900/20 hover:text-red-300"
        onClick={onDelete}
        data-testid="delete-encounter-btn"
      >
        Delete Encounter
      </Button>

      <Link href={`/gameplay/encounters/${encounterId}/edit`}>
        <Button variant="secondary" data-testid="edit-encounter-btn">
          Edit Settings
        </Button>
      </Link>
    </div>
  );
}

interface EncounterWatchReplayButtonProps {
  /**
   * The launched session id stamped onto the encounter row by
   * `EncounterRepository.linkSession`. The button is rendered only
   * when this is a non-empty string.
   */
  gameSessionId: string | undefined;
}

/**
 * Per `add-replay-step-and-effect-animations` (encounter-system delta —
 * "Encounter Detail Watch Replay Link"). Renders a Watch Replay action
 * that routes the user to `/gameplay/games/<gameSessionId>/replay` when
 * the loaded encounter has been launched. Hidden when `gameSessionId`
 * is `undefined` so unlaunched / draft / completed-but-unstamped
 * encounters never expose the link.
 *
 * Uses `next/router`'s `push` (D7) to keep the encounter store warm
 * across the navigation — the watcher who hits the back button lands
 * on the same encounter detail page without a re-fetch.
 */
export function EncounterWatchReplayButton({
  gameSessionId,
}: EncounterWatchReplayButtonProps): React.ReactElement | null {
  const router = useRouter();

  const handleClick = useCallback(() => {
    if (gameSessionId === undefined) return;
    void router.push('/gameplay/games/' + gameSessionId + '/replay');
  }, [router, gameSessionId]);

  if (gameSessionId === undefined) return null;

  return (
    <Button
      variant="primary"
      onClick={handleClick}
      data-testid="encounter-watch-replay-link"
    >
      Watch Replay
    </Button>
  );
}

interface DeleteEncounterConfirmDialogProps {
  encounterName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteEncounterConfirmDialog({
  encounterName,
  onCancel,
  onConfirm,
}: DeleteEncounterConfirmDialogProps): React.ReactElement {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="delete-confirm-dialog"
    >
      <Card className="mx-4 max-w-md">
        <h3 className="text-text-theme-primary mb-2 text-lg font-medium">
          Delete Encounter?
        </h3>
        <p className="text-text-theme-secondary mb-4 text-sm">
          This will permanently delete &quot;{encounterName}&quot;. This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            data-testid="cancel-delete-btn"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-600 hover:bg-red-700"
            onClick={onConfirm}
            data-testid="confirm-delete-btn"
          >
            Delete
          </Button>
        </div>
      </Card>
    </div>
  );
}
