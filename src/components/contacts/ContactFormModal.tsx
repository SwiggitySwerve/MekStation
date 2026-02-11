/**
 * Contact Form Modals
 *
 * Add and Edit contact dialog components for the Contacts page.
 * Handles form state, validation, and submission for contact CRUD operations.
 */

import { useEffect, useState } from 'react';

import { Button, Input } from '@/components/ui';

// =============================================================================
// Types
// =============================================================================

export interface ContactFormData {
  friendCode: string;
  nickname: string;
  notes: string;
}

export interface EditingContact {
  id: string;
  nickname: string;
  notes: string;
}

// =============================================================================
// Icons
// =============================================================================

function UserPlusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
      />
    </svg>
  );
}

function PencilIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function XMarkIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

// =============================================================================
// Add Contact Dialog
// =============================================================================

export interface AddContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export function AddContactDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: AddContactDialogProps): React.ReactElement | null {
  const [formData, setFormData] = useState<ContactFormData>({
    friendCode: '',
    nickname: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleClose = () => {
    setFormData({ friendCode: '', nickname: '', notes: '' });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="bg-surface-deep/90 absolute inset-0 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="bg-surface-base border-border-theme relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="border-border-theme-subtle relative border-b bg-gradient-to-r from-cyan-950/30 to-transparent px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600/20">
              <UserPlusIcon className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-text-theme-primary text-lg font-semibold">
                Add Contact
              </h2>
              <p className="text-text-theme-muted text-sm">
                Connect with another MekStation user
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-text-theme-muted hover:text-text-theme-primary hover:bg-surface-raised/50 absolute top-4 right-4 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Friend Code Input */}
          <div>
            <label className="text-text-theme-secondary mb-2 block text-sm font-medium">
              Friend Code <span className="text-red-400">*</span>
            </label>
            <Input
              type="text"
              value={formData.friendCode}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, friendCode: e.target.value }))
              }
              placeholder="Enter friend code (e.g., MK-XXXX-XXXX-XXXX)"
              accent="cyan"
              required
            />
            <p className="text-text-theme-muted mt-1.5 text-xs">
              Ask your contact for their friend code from their Profile settings
            </p>
          </div>

          {/* Nickname Input */}
          <div>
            <label className="text-text-theme-secondary mb-2 block text-sm font-medium">
              Nickname <span className="text-text-theme-muted">(optional)</span>
            </label>
            <Input
              type="text"
              value={formData.nickname}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nickname: e.target.value }))
              }
              placeholder="Give this contact a nickname"
              accent="cyan"
            />
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="text-text-theme-secondary mb-2 block text-sm font-medium">
              Notes <span className="text-text-theme-muted">(optional)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Add notes about this contact..."
              rows={3}
              className="bg-surface-raised/50 border-border-theme text-text-theme-primary placeholder-text-theme-secondary w-full resize-none rounded-lg border px-4 py-2 transition-colors focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!formData.friendCode.trim() || isSubmitting}
              isLoading={isSubmitting}
              className="flex-1 !bg-cyan-600 hover:!bg-cyan-500"
            >
              Add Contact
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Edit Contact Dialog
// =============================================================================

export interface EditContactDialogProps {
  contact: EditingContact | null;
  onClose: () => void;
  onSave: (id: string, nickname: string, notes: string) => Promise<void>;
  isSaving: boolean;
}

export function EditContactDialog({
  contact,
  onClose,
  onSave,
  isSaving,
}: EditContactDialogProps): React.ReactElement | null {
  const [nickname, setNickname] = useState(contact?.nickname || '');
  const [notes, setNotes] = useState(contact?.notes || '');

  useEffect(() => {
    if (contact) {
      setNickname(contact.nickname);
      setNotes(contact.notes);
    }
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contact) {
      await onSave(contact.id, nickname, notes);
    }
  };

  if (!contact) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="bg-surface-deep/90 absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="bg-surface-base border-border-theme relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="border-border-theme-subtle relative border-b bg-gradient-to-r from-violet-950/30 to-transparent px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20">
              <PencilIcon className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-text-theme-primary text-lg font-semibold">
                Edit Contact
              </h2>
              <p className="text-text-theme-muted text-sm">
                Update nickname and notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-theme-muted hover:text-text-theme-primary hover:bg-surface-raised/50 absolute top-4 right-4 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Nickname Input */}
          <div>
            <label className="text-text-theme-secondary mb-2 block text-sm font-medium">
              Nickname
            </label>
            <Input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Set a nickname"
              accent="violet"
            />
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="text-text-theme-secondary mb-2 block text-sm font-medium">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this contact..."
              rows={3}
              className="bg-surface-raised/50 border-border-theme text-text-theme-primary placeholder-text-theme-secondary w-full resize-none rounded-lg border px-4 py-2 transition-colors focus:border-violet-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              className="flex-1 !bg-violet-600 hover:!bg-violet-500"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
