import Link from 'next/link';

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
