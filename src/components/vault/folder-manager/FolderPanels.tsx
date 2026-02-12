/**
 * Folder Panel Components
 *
 * FolderSharePanel and FolderItemsPanel for sharing and item management.
 */

import React, { useState, useCallback, useMemo } from 'react';

import type { ShareableContentType, PermissionLevel } from '@/types/vault';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

import type {
  FolderSharePanelProps,
  FolderItemsPanelProps,
} from './FolderManagerTypes';

import {
  FolderIcon,
  FolderOpenIcon,
  ShareIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  MechIcon,
  PilotIcon,
  ForceIcon,
  EncounterIcon,
  SpinnerIcon,
} from './FolderManagerIcons';

// =============================================================================
// Helpers
// =============================================================================

function getItemTypeIcon(type: ShareableContentType): React.ReactNode {
  switch (type) {
    case 'unit':
      return <MechIcon className="h-4 w-4" />;
    case 'pilot':
      return <PilotIcon className="h-4 w-4" />;
    case 'force':
      return <ForceIcon className="h-4 w-4" />;
    case 'encounter':
      return <EncounterIcon className="h-4 w-4" />;
    default:
      return <MechIcon className="h-4 w-4" />;
  }
}

function getPermissionBadgeVariant(
  level: PermissionLevel,
): 'emerald' | 'amber' | 'violet' {
  switch (level) {
    case 'read':
      return 'emerald';
    case 'write':
      return 'amber';
    case 'admin':
      return 'violet';
    default:
      return 'emerald';
  }
}

// =============================================================================
// FolderSharePanel Component
// =============================================================================

export function FolderSharePanel({
  folder,
  shares = [],
  contacts = [],
  isLoading,
  onAddShare,
  onRemoveShare,
}: FolderSharePanelProps): React.ReactElement {
  const [selectedContact, setSelectedContact] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<PermissionLevel>('read');
  const [adding, setAdding] = useState(false);

  const availableContacts = useMemo(() => {
    const sharedContactIds = new Set(shares.map((s) => s.granteeId));
    return contacts.filter((c) => !sharedContactIds.has(c.friendCode));
  }, [contacts, shares]);

  const handleAddShare = useCallback(async () => {
    if (!selectedContact || !onAddShare) return;

    setAdding(true);
    try {
      await onAddShare(selectedContact, selectedLevel);
      setSelectedContact('');
      setSelectedLevel('read');
    } finally {
      setAdding(false);
    }
  }, [selectedContact, selectedLevel, onAddShare]);

  if (!folder) {
    return (
      <Card className="p-6">
        <div className="py-8 text-center">
          <ShareIcon className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">Select a folder to manage sharing</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-4">
        <div className="flex items-center gap-3">
          <ShareIcon className="h-5 w-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-white">Sharing</h3>
            <p className="text-xs text-gray-400">{folder.name}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Add Share Section */}
        {availableContacts.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-700/50 bg-gray-700/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <PlusIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">
                Add Contact
              </span>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="flex-1 rounded-lg border border-gray-600 bg-gray-800/50 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select contact...</option>
                {availableContacts.map((contact) => (
                  <option key={contact.id} value={contact.friendCode}>
                    {contact.nickname || contact.displayName}
                  </option>
                ))}
              </select>
              <select
                value={selectedLevel}
                onChange={(e) =>
                  setSelectedLevel(e.target.value as PermissionLevel)
                }
                className="rounded-lg border border-gray-600 bg-gray-800/50 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="read">Read</option>
                <option value="write">Write</option>
                <option value="admin">Admin</option>
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddShare}
                disabled={!selectedContact || adding}
                isLoading={adding}
              >
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Share List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <SpinnerIcon className="h-5 w-5 text-blue-400" />
            <span className="ml-2 text-sm text-gray-400">
              Loading shares...
            </span>
          </div>
        ) : shares.length === 0 ? (
          <div className="py-8 text-center">
            <UserIcon className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-sm text-gray-400">Not shared with anyone</p>
            <p className="mt-1 text-xs text-gray-500">
              Add contacts to share this folder
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-700/30 p-3 transition-colors hover:border-gray-600/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30">
                    <UserIcon className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {share.granteeName || share.granteeId}
                    </p>
                    <p className="font-mono text-xs text-gray-500">
                      {share.granteeId.slice(0, 12)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={getPermissionBadgeVariant(share.level)}
                    size="sm"
                  >
                    {share.level}
                  </Badge>
                  <button
                    onClick={() => onRemoveShare?.(share.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Remove share"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// FolderItemsPanel Component
// =============================================================================

export function FolderItemsPanel({
  folder,
  items = [],
  isLoading,
  onAddItem,
  onRemoveItem,
}: FolderItemsPanelProps): React.ReactElement {
  if (!folder) {
    return (
      <Card className="p-6">
        <div className="py-8 text-center">
          <FolderIcon className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="text-gray-400">Select a folder to view contents</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpenIcon className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-white">Contents</h3>
              <p className="text-xs text-gray-400">
                {folder.name} &middot; {items.length} items
              </p>
            </div>
          </div>
          {onAddItem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddItem}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Add Item
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <SpinnerIcon className="h-5 w-5 text-emerald-400" />
            <span className="ml-2 text-sm text-gray-400">Loading items...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-700/50">
              <FolderOpenIcon className="h-6 w-6 text-gray-500" />
            </div>
            <p className="text-sm text-gray-400">This folder is empty</p>
            <p className="mt-1 text-xs text-gray-500">
              Add units, pilots, or forces to organize them
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={`${item.itemType}-${item.itemId}`}
                className="group flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-700/30 p-3 transition-colors hover:border-gray-600/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.itemType === 'unit' ? 'bg-amber-500/20 text-amber-400' : ''} ${item.itemType === 'pilot' ? 'bg-blue-500/20 text-blue-400' : ''} ${item.itemType === 'force' ? 'bg-violet-500/20 text-violet-400' : ''} ${item.itemType === 'encounter' ? 'bg-cyan-500/20 text-cyan-400' : ''} `}
                  >
                    {getItemTypeIcon(item.itemType)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {item.itemId}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {item.itemType}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveItem?.(item.itemId, item.itemType)}
                  className="rounded-lg p-1.5 text-gray-400 opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                  title="Remove from folder"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
