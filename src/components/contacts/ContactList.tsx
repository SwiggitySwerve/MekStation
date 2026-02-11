import { useState } from 'react';

import type { IContact, ContactStatus } from '@/types/vault';

import { Card, Badge, Button, EmptyState } from '@/components/ui';

import { ContactCardActions } from './ContactDeleteDialog';
import {
  formatLastSeen,
  truncateFriendCode,
  getDisplayName,
  getStatusDisplay,
  getAvatarInitials,
  getAvatarColor,
  UserPlusIcon,
  ShieldCheckIcon,
  ContactFilterStats,
} from './ContactFilters';

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

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-text-theme-primary truncate font-semibold">
                  {displayName.primary}
                </h3>
                {contact.isTrusted && (
                  <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                )}
              </div>
              {displayName.secondary && (
                <p className="text-text-theme-muted truncate text-sm">
                  {displayName.secondary}
                </p>
              )}
            </div>

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

          <div className="mt-2 flex items-center gap-2">
            <span className="text-text-theme-muted bg-surface-raised/50 rounded px-2 py-0.5 font-mono text-xs">
              {truncateFriendCode(contact.friendCode)}
            </span>
            <span className="text-text-theme-muted text-xs">
              Last seen: {formatLastSeen(contact.lastSeenAt)}
            </span>
          </div>

          {contact.notes && (
            <p className="text-text-theme-secondary mt-2 line-clamp-1 text-sm">
              {contact.notes}
            </p>
          )}

          {!contact.isTrusted && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400/80">
              <ShieldExclamationIcon className="h-3.5 w-3.5" />
              <span>Unverified</span>
            </div>
          )}
        </div>
      </div>

      <ContactCardActions
        isTrusted={contact.isTrusted}
        isProcessing={isProcessing}
        showDeleteConfirm={showDeleteConfirm}
        onEdit={onEdit}
        onToggleTrust={onToggleTrust}
        onDelete={onDelete}
        onConfirmDelete={onConfirmDelete}
        onCancelDelete={onCancelDelete}
      />
    </Card>
  );
}

export interface ContactListProps {
  contacts: IContact[];
  contactStatuses: Record<string, ContactStatus>;
  onEdit: (contact: IContact) => void;
  onToggleTrust: (contact: IContact) => Promise<void>;
  onDelete: (contact: IContact) => Promise<void>;
  onOpenAddDialog: () => void;
}

export function ContactList({
  contacts,
  contactStatuses,
  onEdit,
  onToggleTrust,
  onDelete,
  onOpenAddDialog,
}: ContactListProps): React.ReactElement {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const trustedCount = contacts.filter((c) => c.isTrusted).length;
  const onlineCount = Object.values(contactStatuses).filter(
    (s) => s === 'online',
  ).length;

  const handleToggleTrust = async (contact: IContact) => {
    setProcessingId(contact.id);
    try {
      await onToggleTrust(contact);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (contact: IContact) => {
    setProcessingId(contact.id);
    try {
      await onDelete(contact);
      setDeleteConfirmId(null);
    } finally {
      setProcessingId(null);
    }
  };

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon className="text-text-theme-muted mx-auto h-12 w-12" />}
        title="No contacts yet"
        message="Add contacts to share vault content and sync with other MekStation users."
        action={
          <Button
            variant="primary"
            onClick={onOpenAddDialog}
            leftIcon={<UserPlusIcon className="h-4 w-4" />}
            className="!bg-cyan-600 hover:!bg-cyan-500"
          >
            Add Your First Contact
          </Button>
        }
      />
    );
  }

  return (
    <>
      <ContactFilterStats
        onlineCount={onlineCount}
        trustedCount={trustedCount}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            status={contactStatuses[contact.id] || 'offline'}
            isProcessing={processingId === contact.id}
            showDeleteConfirm={deleteConfirmId === contact.id}
            onEdit={() => onEdit(contact)}
            onToggleTrust={() => handleToggleTrust(contact)}
            onDelete={() => setDeleteConfirmId(contact.id)}
            onConfirmDelete={() => handleDelete(contact)}
            onCancelDelete={() => setDeleteConfirmId(null)}
          />
        ))}
      </div>
    </>
  );
}
