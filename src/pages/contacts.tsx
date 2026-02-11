import Head from 'next/head';
/**
 * Contacts Management Page
 * View and manage vault contacts for sharing and P2P sync.
 */
import { useEffect, useState, useCallback } from 'react';

import type { IContact, ContactStatus } from '@/types/vault';

import {
  PageLayout,
  PageLoading,
  PageError,
  EmptyState,
  Card,
  Button,
  Badge,
  Input,
} from '@/components/ui';
import { logger } from '@/utils/logger';

// =============================================================================
// Types
// =============================================================================

interface ContactsResponse {
  contacts: IContact[];
  count: number;
}

interface ContactFormData {
  friendCode: string;
  nickname: string;
  notes: string;
}

interface ActionState {
  contactId: string | null;
  type: 'edit' | 'trust' | 'delete' | null;
}

interface EditingContact {
  id: string;
  nickname: string;
  notes: string;
}

interface AddContactResponse {
  success: boolean;
  contact: IContact;
  error?: string;
}

interface ErrorResponse {
  error: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format relative time for last seen
 */
function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) {
    return 'Never';
  }

  const lastSeen = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return lastSeen.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Truncate friend code for display
 */
function truncateFriendCode(code: string): string {
  if (code.length <= 12) return code;
  return `${code.slice(0, 6)}...${code.slice(-4)}`;
}

/**
 * Get display name (nickname takes priority)
 */
function getDisplayName(contact: IContact): {
  primary: string;
  secondary: string | null;
} {
  if (contact.nickname) {
    return { primary: contact.nickname, secondary: contact.displayName };
  }
  return { primary: contact.displayName, secondary: null };
}

/**
 * Get status badge variant and label
 */
function getStatusDisplay(status: ContactStatus): {
  variant: 'emerald' | 'slate' | 'amber' | 'cyan';
  label: string;
} {
  switch (status) {
    case 'online':
      return { variant: 'emerald', label: 'Online' };
    case 'syncing':
      return { variant: 'cyan', label: 'Syncing' };
    case 'connecting':
      return { variant: 'amber', label: 'Connecting' };
    case 'offline':
    default:
      return { variant: 'slate', label: 'Offline' };
  }
}

/**
 * Generate avatar initials from name
 */
function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Generate a deterministic color from a string (for avatar backgrounds)
 */
function getAvatarColor(id: string): string {
  const colors = [
    'bg-gradient-to-br from-cyan-600 to-cyan-800',
    'bg-gradient-to-br from-violet-600 to-violet-800',
    'bg-gradient-to-br from-emerald-600 to-emerald-800',
    'bg-gradient-to-br from-amber-600 to-amber-800',
    'bg-gradient-to-br from-rose-600 to-rose-800',
    'bg-gradient-to-br from-sky-600 to-sky-800',
    'bg-gradient-to-br from-fuchsia-600 to-fuchsia-800',
    'bg-gradient-to-br from-teal-600 to-teal-800',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
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

function UsersIcon({ className = 'w-5 h-5' }: { className?: string }) {
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
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
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

function ShieldCheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
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
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function ShieldExclamationIcon({
  className = 'w-4 h-4',
}: {
  className?: string;
}) {
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
        d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285zm0 13.036h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
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
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
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

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function SignalIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 24 24"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.636 4.575a.75.75 0 010 1.061 9 9 0 000 12.728.75.75 0 01-1.06 1.06c-4.101-4.1-4.101-10.748 0-14.849a.75.75 0 011.06 0zm12.728 0a.75.75 0 011.06 0c4.101 4.1 4.101 10.749 0 14.85a.75.75 0 11-1.06-1.061 9 9 0 000-12.728.75.75 0 010-1.06zM7.757 6.697a.75.75 0 010 1.06 6 6 0 000 8.486.75.75 0 01-1.06 1.06 7.5 7.5 0 010-10.606.75.75 0 011.06 0zm8.486 0a.75.75 0 011.06 0 7.5 7.5 0 010 10.607.75.75 0 11-1.06-1.061 6 6 0 000-8.486.75.75 0 010-1.06zM9.879 8.818a.75.75 0 010 1.06 3 3 0 000 4.243.75.75 0 11-1.061 1.061 4.5 4.5 0 010-6.364.75.75 0 011.06 0zm4.242 0a.75.75 0 011.061 0 4.5 4.5 0 010 6.364.75.75 0 01-1.06-1.06 3 3 0 000-4.243.75.75 0 010-1.061zM12 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// =============================================================================
// Add Contact Dialog
// =============================================================================

interface AddContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContactFormData) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

function AddContactDialog({
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

interface EditContactDialogProps {
  contact: EditingContact | null;
  onClose: () => void;
  onSave: (id: string, nickname: string, notes: string) => Promise<void>;
  isSaving: boolean;
}

function EditContactDialog({
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

// =============================================================================
// Contact Card Component
// =============================================================================

interface ContactCardProps {
  contact: IContact;
  status: ContactStatus;
  isProcessing: boolean;
  showDeleteConfirm: boolean;
  onEdit: () => void;
  onToggleTrust: () => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function ContactCard({
  contact,
  status,
  isProcessing,
  showDeleteConfirm,
  onEdit,
  onToggleTrust,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
}: ContactCardProps): React.ReactElement {
  const displayName = getDisplayName(contact);
  const statusDisplay = getStatusDisplay(status);
  const avatarColor = getAvatarColor(contact.id);
  const initials = getAvatarInitials(displayName.primary);

  return (
    <Card
      variant="dark"
      className="group hover:border-border-theme relative overflow-hidden transition-all duration-200"
    >
      {/* Subtle gradient overlay on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-violet-500/0 transition-all duration-300 group-hover:from-cyan-500/5 group-hover:to-violet-500/5" />

      <div className="relative flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`relative h-14 w-14 flex-shrink-0 rounded-xl ${avatarColor} flex items-center justify-center shadow-lg`}
        >
          <span className="text-lg font-bold text-white/90">{initials}</span>
          {/* Status indicator dot */}
          <div
            className={`border-surface-base absolute -right-1 -bottom-1 h-4 w-4 rounded-full border-2 ${
              status === 'online'
                ? 'bg-emerald-500'
                : status === 'syncing'
                  ? 'animate-pulse bg-cyan-500'
                  : status === 'connecting'
                    ? 'animate-pulse bg-amber-500'
                    : 'bg-slate-500'
            }`}
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* Name */}
              <div className="flex items-center gap-2">
                <h3 className="text-text-theme-primary truncate font-semibold">
                  {displayName.primary}
                </h3>
                {contact.isTrusted && (
                  <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                )}
              </div>
              {/* Secondary name if nickname exists */}
              {displayName.secondary && (
                <p className="text-text-theme-muted truncate text-sm">
                  {displayName.secondary}
                </p>
              )}
            </div>

            {/* Status badge */}
            <Badge
              variant={statusDisplay.variant}
              size="sm"
              className="flex-shrink-0"
            >
              {status === 'syncing' && (
                <SignalIcon className="mr-1 h-3 w-3 animate-pulse" />
              )}
              {statusDisplay.label}
            </Badge>
          </div>

          {/* Friend code */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-text-theme-muted bg-surface-raised/50 rounded px-2 py-0.5 font-mono text-xs">
              {truncateFriendCode(contact.friendCode)}
            </span>
            <span className="text-text-theme-muted text-xs">
              Last seen: {formatLastSeen(contact.lastSeenAt)}
            </span>
          </div>

          {/* Notes preview */}
          {contact.notes && (
            <p className="text-text-theme-secondary mt-2 line-clamp-1 text-sm">
              {contact.notes}
            </p>
          )}

          {/* Trust indicator if not trusted */}
          {!contact.isTrusted && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400/80">
              <ShieldExclamationIcon className="h-3.5 w-3.5" />
              <span>Unverified</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-border-theme-subtle/50 mt-4 flex items-center justify-end gap-2 border-t pt-4">
        {showDeleteConfirm ? (
          <>
            <span className="text-text-theme-muted mr-2 text-sm">
              Delete this contact?
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={onConfirmDelete}
              disabled={isProcessing}
              isLoading={isProcessing}
            >
              <CheckIcon className="h-4 w-4" />
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelDelete}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            {/* Edit */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              disabled={isProcessing}
              title="Edit nickname & notes"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>

            {/* Toggle Trust */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTrust}
              disabled={isProcessing}
              title={contact.isTrusted ? 'Remove trust' : 'Mark as trusted'}
              className={
                contact.isTrusted ? 'text-emerald-400' : 'text-text-theme-muted'
              }
            >
              {contact.isTrusted ? (
                <ShieldCheckIcon className="h-4 w-4" />
              ) : (
                <ShieldExclamationIcon className="h-4 w-4" />
              )}
            </Button>

            {/* Delete */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isProcessing}
              title="Delete contact"
              className="text-red-400/70 hover:text-red-400"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ContactsPage(): React.ReactElement {
  const [contacts, setContacts] = useState<IContact[]>([]);
  const [contactStatuses, setContactStatuses] = useState<
    Record<string, ContactStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>({
    contactId: null,
    type: null,
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogError, setAddDialogError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingContact, setEditingContact] = useState<EditingContact | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      const response = await fetch('/api/vault/contacts');
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      const data = (await response.json()) as ContactsResponse;
      setContacts(data.contacts);

      // Initialize statuses (in real app, this would come from P2P service)
      const statuses: Record<string, ContactStatus> = {};
      data.contacts.forEach((contact) => {
        statuses[contact.id] = 'offline';
      });
      setContactStatuses(statuses);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Add contact
  const handleAddContact = async (data: ContactFormData) => {
    setIsAdding(true);
    setAddDialogError(null);

    try {
      const response = await fetch('/api/vault/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          friendCode: data.friendCode,
          nickname: data.nickname || undefined,
          notes: data.notes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ErrorResponse;
        throw new Error(errorData.error || 'Failed to add contact');
      }

      const result = (await response.json()) as AddContactResponse;
      setContacts((prev) => [...prev, result.contact]);
      setContactStatuses((prev) => ({
        ...prev,
        [result.contact.id]: 'offline',
      }));
      setShowAddDialog(false);
    } catch (err) {
      setAddDialogError(
        err instanceof Error ? err.message : 'Failed to add contact',
      );
    } finally {
      setIsAdding(false);
    }
  };

  // Edit contact
  const handleEditContact = (contact: IContact) => {
    setEditingContact({
      id: contact.id,
      nickname: contact.nickname || '',
      notes: contact.notes || '',
    });
  };

  const handleSaveEdit = async (
    id: string,
    nickname: string,
    notes: string,
  ) => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/vault/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname || null,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update contact');
      }

      // Update local state
      setContacts((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, nickname: nickname || null, notes: notes || null }
            : c,
        ),
      );
      setEditingContact(null);
    } catch (err) {
      logger.error('Failed to save edit:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle trust
  const handleToggleTrust = async (contact: IContact) => {
    setActionState({ contactId: contact.id, type: 'trust' });

    try {
      const response = await fetch(`/api/vault/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTrusted: !contact.isTrusted }),
      });

      if (!response.ok) {
        throw new Error('Failed to update trust status');
      }

      // Update local state
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contact.id ? { ...c, isTrusted: !c.isTrusted } : c,
        ),
      );
    } catch (err) {
      logger.error('Failed to toggle trust:', err);
    } finally {
      setActionState({ contactId: null, type: null });
    }
  };

  // Delete contact
  const handleDelete = async (contact: IContact) => {
    setActionState({ contactId: contact.id, type: 'delete' });

    try {
      const response = await fetch(`/api/vault/contacts/${contact.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      // Remove from local state
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      setDeleteConfirmId(null);
    } catch (err) {
      logger.error('Failed to delete:', err);
    } finally {
      setActionState({ contactId: null, type: null });
    }
  };

  // Loading state
  if (loading) {
    return <PageLoading message="Loading contacts..." />;
  }

  // Error state
  if (error) {
    return (
      <PageError
        title="Error Loading Contacts"
        message={error}
        backLink="/"
        backLabel="Return Home"
      />
    );
  }

  // Count stats
  const trustedCount = contacts.filter((c) => c.isTrusted).length;
  const onlineCount = Object.values(contactStatuses).filter(
    (s) => s === 'online',
  ).length;

  return (
    <>
      <Head>
        <title>Contacts | MekStation</title>
      </Head>

      <PageLayout
        title="Contacts"
        subtitle={`Manage your ${contacts.length} vault contact${contacts.length !== 1 ? 's' : ''}`}
        maxWidth="wide"
        backLink={{ href: '/', label: 'Home' }}
        headerContent={
          <Button
            variant="primary"
            onClick={() => setShowAddDialog(true)}
            leftIcon={<UserPlusIcon className="h-4 w-4" />}
            className="!bg-cyan-600 hover:!bg-cyan-500"
          >
            Add Contact
          </Button>
        }
      >
        {/* Empty State */}
        {contacts.length === 0 ? (
          <EmptyState
            icon={
              <UsersIcon className="text-text-theme-muted mx-auto h-12 w-12" />
            }
            title="No contacts yet"
            message="Add contacts to share vault content and sync with other MekStation users."
            action={
              <Button
                variant="primary"
                onClick={() => setShowAddDialog(true)}
                leftIcon={<UserPlusIcon className="h-4 w-4" />}
                className="!bg-cyan-600 hover:!bg-cyan-500"
              >
                Add Your First Contact
              </Button>
            }
          />
        ) : (
          <>
            {/* Stats Summary */}
            <div className="mb-6 flex flex-wrap gap-4">
              <div className="bg-surface-base/30 border-border-theme-subtle flex items-center gap-2 rounded-lg border px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-text-theme-secondary text-sm">
                  <span className="text-text-theme-primary font-medium">
                    {onlineCount}
                  </span>{' '}
                  online
                </span>
              </div>
              <div className="bg-surface-base/30 border-border-theme-subtle flex items-center gap-2 rounded-lg border px-4 py-2">
                <ShieldCheckIcon className="h-4 w-4 text-emerald-400" />
                <span className="text-text-theme-secondary text-sm">
                  <span className="text-text-theme-primary font-medium">
                    {trustedCount}
                  </span>{' '}
                  trusted
                </span>
              </div>
            </div>

            {/* Contact Cards Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  status={contactStatuses[contact.id] || 'offline'}
                  isProcessing={actionState.contactId === contact.id}
                  showDeleteConfirm={deleteConfirmId === contact.id}
                  onEdit={() => handleEditContact(contact)}
                  onToggleTrust={() => handleToggleTrust(contact)}
                  onDelete={() => setDeleteConfirmId(contact.id)}
                  onConfirmDelete={() => handleDelete(contact)}
                  onCancelDelete={() => setDeleteConfirmId(null)}
                />
              ))}
            </div>
          </>
        )}

        {/* Add Contact Dialog */}
        <AddContactDialog
          isOpen={showAddDialog}
          onClose={() => {
            setShowAddDialog(false);
            setAddDialogError(null);
          }}
          onSubmit={handleAddContact}
          isSubmitting={isAdding}
          error={addDialogError}
        />

        {/* Edit Contact Dialog */}
        <EditContactDialog
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSave={handleSaveEdit}
          isSaving={isSaving}
        />
      </PageLayout>
    </>
  );
}
