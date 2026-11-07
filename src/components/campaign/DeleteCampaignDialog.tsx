import type { ReactElement } from 'react';

import { Card, Button } from '@/components/ui';

interface DeleteCampaignDialogProps {
  open: boolean;
  campaignName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteCampaignDialog({
  open,
  campaignName,
  onCancel,
  onConfirm,
}: DeleteCampaignDialogProps): ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="delete-confirm-dialog"
    >
      <Card className="mx-4 max-w-md">
        <h3 className="text-text-theme-primary mb-2 text-lg font-medium">
          Delete Campaign?
        </h3>
        <p className="text-text-theme-secondary mb-4 text-sm">
          This will permanently delete &quot;{campaignName}&quot; and all its
          progress. This action cannot be undone.
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
