import React from 'react';

import { Button } from '@/components/ui/Button';

import { TrashIcon } from './FolderManagerIcons';

interface FolderEditDeleteSectionProps {
  confirmDelete: boolean;
  deleting: boolean;
  onStartDelete: () => void;
  onDelete: () => void | Promise<void>;
  onCancelDelete: () => void;
}

export function FolderEditDeleteSection({
  confirmDelete,
  deleting,
  onStartDelete,
  onDelete,
  onCancelDelete,
}: FolderEditDeleteSectionProps): React.ReactElement {
  if (confirmDelete) {
    return (
      <div className="mt-6 rounded-xl border border-red-500/30 bg-red-900/20 p-4">
        <p className="mb-3 text-sm text-red-300">
          Are you sure you want to delete this folder? Items inside will be
          moved to root.
        </p>
        <div className="flex gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={onDelete}
            isLoading={deleting}
            disabled={deleting}
          >
            Yes, Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelDelete}
            disabled={deleting}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onStartDelete}
      className="mt-6 flex items-center gap-2 text-sm text-red-400 transition-colors hover:text-red-300"
    >
      <TrashIcon className="h-4 w-4" />
      Delete this folder
    </button>
  );
}
