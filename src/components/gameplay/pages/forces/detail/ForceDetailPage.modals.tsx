import { useEffect, useState } from 'react';

import { Button, Input } from '@/components/ui';

interface DeleteConfirmModalProps {
  forceName: string;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  forceName,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps): React.ReactElement | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isDeleting ? onCancel : undefined}
      />
      <div
        className="bg-surface-base border-border-theme relative w-full max-w-md rounded-xl border p-6 shadow-2xl"
        data-testid="delete-confirm-dialog"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-900/30">
            <svg
              className="h-8 w-8 text-red-400"
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

          <h3 className="text-text-theme-primary mb-2 text-xl font-bold">
            Delete Force?
          </h3>
          <p className="text-text-theme-secondary mb-6">
            Are you sure you want to permanently delete{' '}
            <span className="text-accent font-semibold">{forceName}</span>? This
            action cannot be undone.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={isDeleting}
              data-testid="cancel-delete-btn"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              isLoading={isDeleting}
              className="bg-red-600 hover:bg-red-500"
              data-testid="confirm-delete-btn"
            >
              Delete Force
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditNameModalProps {
  currentName: string;
  currentDescription?: string;
  currentAffiliation?: string;
  isOpen: boolean;
  isSaving: boolean;
  onSave: (updates: {
    name: string;
    description?: string;
    affiliation?: string;
  }) => void;
  onCancel: () => void;
}

export function EditNameModal({
  currentName,
  currentDescription,
  currentAffiliation,
  isOpen,
  isSaving,
  onSave,
  onCancel,
}: EditNameModalProps): React.ReactElement | null {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription || '');
  const [affiliation, setAffiliation] = useState(currentAffiliation || '');

  useEffect(() => {
    setName(currentName);
    setDescription(currentDescription || '');
    setAffiliation(currentAffiliation || '');
  }, [currentAffiliation, currentDescription, currentName]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim()) {
      onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        affiliation: affiliation.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isSaving ? onCancel : undefined}
      />
      <div className="bg-surface-base border-border-theme relative w-full max-w-md rounded-xl border p-6 shadow-2xl">
        <h3 className="text-text-theme-primary mb-4 text-xl font-bold">
          Edit Force Details
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-text-theme-secondary mb-1.5 block text-sm font-medium">
              Name *
            </label>
            <Input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Force name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-text-theme-secondary mb-1.5 block text-sm font-medium">
              Affiliation
            </label>
            <Input
              type="text"
              value={affiliation}
              onChange={(event) => setAffiliation(event.target.value)}
              placeholder="Faction or house"
            />
          </div>

          <div>
            <label className="text-text-theme-secondary mb-1.5 block text-sm font-medium">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional notes..."
              rows={3}
              className="bg-surface-raised border-border-theme-subtle text-text-theme-primary placeholder-text-theme-muted focus:border-accent focus:ring-accent/30 w-full resize-none rounded-lg border px-4 py-2.5 focus:ring-1 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              disabled={!name.trim()}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
