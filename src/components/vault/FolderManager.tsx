/**
 * Folder Manager Components
 *
 * Components for managing vault folders with sharing capabilities.
 * Includes folder list, create/edit dialogs, and sharing/items panels.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  IVaultFolder,
  IFolderItem,
  IPermissionGrant,
  IContact,
  ShareableContentType,
  PermissionLevel,
} from '@/types/vault';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

// =============================================================================
// Types
// =============================================================================

export interface FolderListProps {
  /** List of folders to display */
  folders: IVaultFolder[];
  /** Currently selected folder ID */
  selectedFolderId?: string | null;
  /** Callback when folder is selected */
  onSelectFolder?: (folder: IVaultFolder) => void;
  /** Callback when folder expand/collapse is toggled */
  onToggleExpand?: (folderId: string) => void;
  /** Set of expanded folder IDs */
  expandedFolderIds?: Set<string>;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
}

export interface FolderCreateDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close the dialog */
  onClose: () => void;
  /** Available parent folders */
  parentFolders?: IVaultFolder[];
  /** Callback when folder is created */
  onCreated?: (folder: IVaultFolder) => void;
}

export interface FolderEditDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close the dialog */
  onClose: () => void;
  /** Folder to edit */
  folder: IVaultFolder | null;
  /** Callback when folder is updated */
  onUpdated?: (folder: IVaultFolder) => void;
  /** Callback when folder is deleted */
  onDeleted?: (folderId: string) => void;
}

export interface FolderSharePanelProps {
  /** Folder to show shares for */
  folder: IVaultFolder | null;
  /** List of permission grants for this folder */
  shares?: IPermissionGrant[];
  /** Available contacts to share with */
  contacts?: IContact[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when share is added */
  onAddShare?: (contactId: string, level: PermissionLevel) => void;
  /** Callback when share is removed */
  onRemoveShare?: (grantId: string) => void;
}

export interface FolderItemsPanelProps {
  /** Folder to show items for */
  folder: IVaultFolder | null;
  /** Items in the folder */
  items?: IFolderItem[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when add item button is clicked */
  onAddItem?: () => void;
  /** Callback when item is removed */
  onRemoveItem?: (itemId: string, itemType: ShareableContentType) => void;
}

// =============================================================================
// Icons
// =============================================================================

function FolderIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function FolderOpenIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
    </svg>
  );
}

function ChevronRightIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ChevronDownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function ShareIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
    </svg>
  );
}

function PlusIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function UserIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function MechIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

function PilotIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function ForceIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function EncounterIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function XMarkIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SpinnerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getItemTypeIcon(type: ShareableContentType): React.ReactNode {
  switch (type) {
    case 'unit':
      return <MechIcon className="w-4 h-4" />;
    case 'pilot':
      return <PilotIcon className="w-4 h-4" />;
    case 'force':
      return <ForceIcon className="w-4 h-4" />;
    case 'encounter':
      return <EncounterIcon className="w-4 h-4" />;
    default:
      return <MechIcon className="w-4 h-4" />;
  }
}

function getPermissionBadgeVariant(level: PermissionLevel): 'emerald' | 'amber' | 'violet' {
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

function buildFolderTree(folders: IVaultFolder[]): Map<string | null, IVaultFolder[]> {
  const tree = new Map<string | null, IVaultFolder[]>();
  
  for (const folder of folders) {
    const parentId = folder.parentId;
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    tree.get(parentId)!.push(folder);
  }
  
  return tree;
}

// =============================================================================
// FolderList Component
// =============================================================================

function FolderTreeItem({
  folder,
  isSelected,
  isExpanded,
  hasChildren,
  depth,
  onSelect,
  onToggleExpand,
}: {
  folder: IVaultFolder;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  depth: number;
  onSelect: () => void;
  onToggleExpand: () => void;
}) {
  return (
    <div
      className={`
        group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 shadow-lg shadow-cyan-500/5' 
          : 'hover:bg-gray-700/50 border border-transparent hover:border-gray-600/50'
        }
      `}
      style={{ paddingLeft: `${12 + depth * 20}px` }}
      onClick={onSelect}
    >
      {/* Expand/Collapse Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
        className={`
          flex-shrink-0 w-5 h-5 flex items-center justify-center rounded
          transition-all duration-200
          ${hasChildren 
            ? 'text-gray-400 hover:text-white hover:bg-gray-600/50' 
            : 'text-transparent pointer-events-none'
          }
        `}
      >
        {hasChildren && (
          isExpanded ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Folder Icon */}
      <div className={`flex-shrink-0 transition-colors ${isSelected ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'}`}>
        {isExpanded && hasChildren ? (
          <FolderOpenIcon className="w-5 h-5" />
        ) : (
          <FolderIcon className="w-5 h-5" />
        )}
      </div>

      {/* Folder Name & Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
            {folder.name}
          </span>
          {folder.isShared && (
            <ShareIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-cyan-400' : 'text-blue-400'}`} />
          )}
        </div>
        {folder.description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{folder.description}</p>
        )}
      </div>

      {/* Item Count Badge */}
      <div className={`
        flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium
        ${isSelected 
          ? 'bg-cyan-500/20 text-cyan-300' 
          : 'bg-gray-700/50 text-gray-400 group-hover:bg-gray-600/50'
        }
      `}>
        {folder.itemCount}
      </div>
    </div>
  );
}

export function FolderList({
  folders,
  selectedFolderId,
  onSelectFolder,
  onToggleExpand,
  expandedFolderIds = new Set(),
  isLoading,
  error,
}: FolderListProps): React.ReactElement {
  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const renderFolderLevel = (parentId: string | null, depth: number): React.ReactNode[] => {
    const children = folderTree.get(parentId) || [];
    
    return children.flatMap((folder) => {
      const hasChildren = folderTree.has(folder.id);
      const isExpanded = expandedFolderIds.has(folder.id);
      const isSelected = folder.id === selectedFolderId;

      return [
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          isSelected={isSelected}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          depth={depth}
          onSelect={() => onSelectFolder?.(folder)}
          onToggleExpand={() => onToggleExpand?.(folder.id)}
        />,
        ...(isExpanded ? renderFolderLevel(folder.id, depth + 1) : []),
      ];
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerIcon className="w-6 h-6 text-cyan-400" />
        <span className="ml-3 text-gray-400">Loading folders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No folders yet</p>
        <p className="text-sm text-gray-500 mt-1">Create a folder to organize your vault</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {renderFolderLevel(null, 0)}
    </div>
  );
}

// =============================================================================
// FolderCreateDialog Component
// =============================================================================

export function FolderCreateDialog({
  isOpen,
  onClose,
  parentFolders = [],
  onCreated,
}: FolderCreateDialogProps): React.ReactElement | null {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setParentId('');
    setError(null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/vault/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          parentId: parentId || null,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Failed to create folder (${response.status})`);
      }

      const folder = (await response.json()) as IVaultFolder;
      onCreated?.(folder);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  }, [name, description, parentId, onCreated, resetForm, onClose]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  if (!isOpen) return null;

  const parentOptions = [
    { value: '', label: 'No parent (root folder)' },
    ...parentFolders.map((f) => ({ value: f.id, label: f.name })),
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <FolderIcon className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white">New Folder</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <Input
            label="Folder Name"
            placeholder="Enter folder name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            accent="cyan"
          />

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              rows={3}
            />
          </div>

          <Select
            label="Parent Folder"
            options={parentOptions}
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            accent="cyan"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            isLoading={creating}
          >
            Create Folder
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FolderEditDialog Component
// =============================================================================

export function FolderEditDialog({
  isOpen,
  onClose,
  folder,
  onUpdated,
  onDeleted,
}: FolderEditDialogProps): React.ReactElement | null {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form with folder prop
  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setDescription(folder.description || '');
    }
  }, [folder]);

  const resetState = useCallback(() => {
    setError(null);
    setConfirmDelete(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!folder || !name.trim()) {
      setError('Folder name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/vault/folders/${folder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Failed to update folder (${response.status})`);
      }

      const updatedFolder = (await response.json()) as IVaultFolder;
      onUpdated?.(updatedFolder);
      resetState();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder');
    } finally {
      setSaving(false);
    }
  }, [folder, name, description, onUpdated, resetState, onClose]);

  const handleDelete = useCallback(async () => {
    if (!folder) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/vault/folders/${folder.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Failed to delete folder (${response.status})`);
      }

      onDeleted?.(folder.id);
      resetState();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
    } finally {
      setDeleting(false);
    }
  }, [folder, onDeleted, resetState, onClose]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  if (!isOpen || !folder) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700/50 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
              <FolderIcon className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Edit Folder</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <Input
            label="Folder Name"
            placeholder="Enter folder name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            accent="amber"
          />

          <div>
            <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Delete Confirmation */}
        {confirmDelete ? (
          <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
            <p className="text-red-300 text-sm mb-3">
              Are you sure you want to delete this folder? Items inside will be moved to root.
            </p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={deleting}
                disabled={deleting}
              >
                Yes, Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-6 flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            Delete this folder
          </button>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700/50">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={saving || deleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || deleting || !name.trim()}
            isLoading={saving}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
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
        <div className="text-center py-8">
          <ShareIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Select a folder to manage sharing</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <ShareIcon className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="font-semibold text-white">Sharing</h3>
            <p className="text-xs text-gray-400">{folder.name}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Add Share Section */}
        {availableContacts.length > 0 && (
          <div className="mb-6 p-4 bg-gray-700/30 rounded-xl border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <PlusIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Add Contact</span>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
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
                onChange={(e) => setSelectedLevel(e.target.value as PermissionLevel)}
                className="px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
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
            <SpinnerIcon className="w-5 h-5 text-blue-400" />
            <span className="ml-2 text-gray-400 text-sm">Loading shares...</span>
          </div>
        ) : shares.length === 0 ? (
          <div className="text-center py-8">
            <UserIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Not shared with anyone</p>
            <p className="text-gray-500 text-xs mt-1">Add contacts to share this folder</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {share.granteeName || share.granteeId}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">{share.granteeId.slice(0, 12)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getPermissionBadgeVariant(share.level)} size="sm">
                    {share.level}
                  </Badge>
                  <button
                    onClick={() => onRemoveShare?.(share.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove share"
                  >
                    <TrashIcon className="w-4 h-4" />
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
        <div className="text-center py-8">
          <FolderIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Select a folder to view contents</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpenIcon className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-semibold text-white">Contents</h3>
              <p className="text-xs text-gray-400">{folder.name} &middot; {items.length} items</p>
            </div>
          </div>
          {onAddItem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddItem}
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              Add Item
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <SpinnerIcon className="w-5 h-5 text-emerald-400" />
            <span className="ml-2 text-gray-400 text-sm">Loading items...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-gray-700/50 flex items-center justify-center mx-auto mb-3">
              <FolderOpenIcon className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm">This folder is empty</p>
            <p className="text-gray-500 text-xs mt-1">Add units, pilots, or forces to organize them</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={`${item.itemType}-${item.itemId}`}
                className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    ${item.itemType === 'unit' ? 'bg-amber-500/20 text-amber-400' : ''}
                    ${item.itemType === 'pilot' ? 'bg-blue-500/20 text-blue-400' : ''}
                    ${item.itemType === 'force' ? 'bg-violet-500/20 text-violet-400' : ''}
                    ${item.itemType === 'encounter' ? 'bg-cyan-500/20 text-cyan-400' : ''}
                  `}>
                    {getItemTypeIcon(item.itemType)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{item.itemId}</p>
                    <p className="text-xs text-gray-500 capitalize">{item.itemType}</p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveItem?.(item.itemId, item.itemType)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from folder"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Combined Export Object
// =============================================================================

/**
 * All folder management components bundled together
 */
export const FolderManager = {
  FolderList,
  FolderCreateDialog,
  FolderEditDialog,
  FolderSharePanel,
  FolderItemsPanel,
};
