/**
 * PilotDetailModals
 *
 * Modal components and small helpers used on the Pilot Detail page:
 * - StatusBadge – coloured badge for PilotStatus
 * - DeleteConfirmModal – confirmation dialog before deleting a pilot
 * - EditIdentityModal – form to edit pilot name / callsign / affiliation
 */

import { useEffect, useState } from 'react';

import { Button, Badge } from '@/components/ui';
import { IPilot, PilotStatus } from '@/types/pilot';

// =============================================================================
// StatusBadge
// =============================================================================

export interface StatusBadgeProps {
  status: PilotStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({
  status,
  size = 'md',
}: StatusBadgeProps): React.ReactElement {
  const variants: Record<
    PilotStatus,
    { variant: 'emerald' | 'amber' | 'orange' | 'red' | 'slate'; label: string }
  > = {
    [PilotStatus.Active]: { variant: 'emerald', label: 'Active' },
    [PilotStatus.Injured]: { variant: 'orange', label: 'Injured' },
    [PilotStatus.MIA]: { variant: 'amber', label: 'MIA' },
    [PilotStatus.KIA]: { variant: 'red', label: 'KIA' },
    [PilotStatus.Retired]: { variant: 'slate', label: 'Retired' },
  };

  const { variant, label } = variants[status] || {
    variant: 'slate',
    label: status,
  };

  return (
    <Badge variant={variant} size={size}>
      {label}
    </Badge>
  );
}

// =============================================================================
// DeleteConfirmModal
// =============================================================================

export interface DeleteConfirmModalProps {
  pilotName: string;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  pilotName,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isDeleting ? onCancel : undefined}
      />

      {/* Modal */}
      <div className="bg-surface-base border-border-theme relative w-full max-w-md rounded-xl border p-6 shadow-2xl">
        <div className="text-center">
          {/* Warning Icon */}
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
            Delete Pilot?
          </h3>
          <p className="text-text-theme-secondary mb-6">
            Are you sure you want to permanently delete{' '}
            <span className="text-accent font-semibold">{pilotName}</span>? This
            action cannot be undone.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              isLoading={isDeleting}
              className="bg-red-600 hover:bg-red-500"
            >
              Delete Pilot
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EditIdentityModal
// =============================================================================

export interface EditIdentityModalProps {
  pilot: IPilot;
  isOpen: boolean;
  onSave: (updates: {
    name: string;
    callsign?: string;
    affiliation?: string;
  }) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function EditIdentityModal({
  pilot,
  isOpen,
  onSave,
  onCancel,
  isSaving,
}: EditIdentityModalProps): React.ReactElement | null {
  const [name, setName] = useState(pilot.name);
  const [callsign, setCallsign] = useState(pilot.callsign || '');
  const [affiliation, setAffiliation] = useState(pilot.affiliation || '');

  // Reset form when pilot changes
  useEffect(() => {
    setName(pilot.name);
    setCallsign(pilot.callsign || '');
    setAffiliation(pilot.affiliation || '');
  }, [pilot]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave({
        name: name.trim(),
        callsign: callsign.trim() || undefined,
        affiliation: affiliation.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isSaving ? onCancel : undefined}
      />

      {/* Modal */}
      <div className="bg-surface-base border-border-theme relative w-full max-w-md rounded-xl border p-6 shadow-2xl">
        <h3 className="text-text-theme-primary mb-4 text-xl font-bold">
          Edit Pilot Identity
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-text-theme-secondary mb-1.5 block text-sm font-medium">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface-raised border-border-theme-subtle text-text-theme-primary placeholder-text-theme-muted focus:border-accent focus:ring-accent/30 w-full rounded-lg border px-4 py-2.5 focus:ring-1 focus:outline-none"
              placeholder="Pilot name"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-text-theme-secondary mb-1.5 block text-sm font-medium">
              Callsign
            </label>
            <input
              type="text"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="bg-surface-raised border-border-theme-subtle text-text-theme-primary placeholder-text-theme-muted focus:border-accent focus:ring-accent/30 w-full rounded-lg border px-4 py-2.5 focus:ring-1 focus:outline-none"
              placeholder="Optional callsign"
            />
          </div>

          <div>
            <label className="text-text-theme-secondary mb-1.5 block text-sm font-medium">
              Affiliation
            </label>
            <input
              type="text"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              className="bg-surface-raised border-border-theme-subtle text-text-theme-primary placeholder-text-theme-muted focus:border-accent focus:ring-accent/30 w-full rounded-lg border px-4 py-2.5 focus:ring-1 focus:outline-none"
              placeholder="Faction or house"
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
