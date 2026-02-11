/**
 * Folder List Components
 *
 * FolderTreeItem and FolderList for displaying folder hierarchy.
 */

import React, { useMemo } from 'react';

import type { IVaultFolder } from '@/types/vault';

import type { FolderListProps } from './FolderManagerTypes';

import {
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ShareIcon,
  SpinnerIcon,
} from './FolderManagerIcons';

// =============================================================================
// Helpers
// =============================================================================

function buildFolderTree(
  folders: IVaultFolder[],
): Map<string | null, IVaultFolder[]> {
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
// FolderTreeItem Component
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
      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-all duration-200 ${
        isSelected
          ? 'border border-cyan-500/30 bg-gradient-to-r from-cyan-500/20 to-blue-500/10 shadow-lg shadow-cyan-500/5'
          : 'border border-transparent hover:border-gray-600/50 hover:bg-gray-700/50'
      } `}
      style={{ paddingLeft: `${12 + depth * 20}px` }}
      onClick={onSelect}
    >
      {/* Expand/Collapse Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition-all duration-200 ${
          hasChildren
            ? 'text-gray-400 hover:bg-gray-600/50 hover:text-white'
            : 'pointer-events-none text-transparent'
        } `}
      >
        {hasChildren &&
          (isExpanded ? (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronRightIcon className="h-3.5 w-3.5" />
          ))}
      </button>

      {/* Folder Icon */}
      <div
        className={`flex-shrink-0 transition-colors ${isSelected ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-300'}`}
      >
        {isExpanded && hasChildren ? (
          <FolderOpenIcon className="h-5 w-5" />
        ) : (
          <FolderIcon className="h-5 w-5" />
        )}
      </div>

      {/* Folder Name & Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate font-medium ${isSelected ? 'text-white' : 'text-gray-200'}`}
          >
            {folder.name}
          </span>
          {folder.isShared && (
            <ShareIcon
              className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? 'text-cyan-400' : 'text-blue-400'}`}
            />
          )}
        </div>
        {folder.description && (
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {folder.description}
          </p>
        )}
      </div>

      {/* Item Count Badge */}
      <div
        className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
          isSelected
            ? 'bg-cyan-500/20 text-cyan-300'
            : 'bg-gray-700/50 text-gray-400 group-hover:bg-gray-600/50'
        } `}
      >
        {folder.itemCount}
      </div>
    </div>
  );
}

// =============================================================================
// FolderList Component
// =============================================================================

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

  const renderFolderLevel = (
    parentId: string | null,
    depth: number,
  ): React.ReactNode[] => {
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
        <SpinnerIcon className="h-6 w-6 text-cyan-400" />
        <span className="ml-3 text-gray-400">Loading folders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="py-12 text-center">
        <FolderIcon className="mx-auto mb-3 h-12 w-12 text-gray-600" />
        <p className="text-gray-400">No folders yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Create a folder to organize your vault
        </p>
      </div>
    );
  }

  return <div className="space-y-1">{renderFolderLevel(null, 0)}</div>;
}
