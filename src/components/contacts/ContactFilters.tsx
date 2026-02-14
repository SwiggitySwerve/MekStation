import type { IContact, ContactStatus } from '@/types/vault';

// =============================================================================
// Shared Types
// =============================================================================

export interface ContactsResponse {
  contacts: IContact[];
  count: number;
}

export interface AddContactResponse {
  success: boolean;
  contact: IContact;
  error?: string;
}

export interface ErrorResponse {
  error: string;
}

export interface ActionState {
  contactId: string | null;
  type: 'edit' | 'trust' | 'delete' | null;
}

// =============================================================================
// Display Helpers
// =============================================================================

export function formatLastSeen(lastSeenAt: string | null): string {
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

export function truncateFriendCode(code: string): string {
  if (code.length <= 12) return code;
  return `${code.slice(0, 6)}...${code.slice(-4)}`;
}

export function getDisplayName(contact: IContact): {
  primary: string;
  secondary: string | null;
} {
  if (contact.nickname) {
    return { primary: contact.nickname, secondary: contact.displayName };
  }
  return { primary: contact.displayName, secondary: null };
}

export function getStatusDisplay(status: ContactStatus): {
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

export function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function getAvatarColor(id: string): string {
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
// Shared Icons
// =============================================================================

export function UserPlusIcon({
  className = 'w-5 h-5',
}: {
  className?: string;
}): React.ReactElement {
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

export function ShieldCheckIcon({
  className = 'w-4 h-4',
}: {
  className?: string;
}): React.ReactElement {
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

// =============================================================================
// Contact Filter Stats
// =============================================================================

export interface ContactFilterStatsProps {
  onlineCount: number;
  trustedCount: number;
}

export function ContactFilterStats({
  onlineCount,
  trustedCount,
}: ContactFilterStatsProps): React.ReactElement {
  return (
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
  );
}
