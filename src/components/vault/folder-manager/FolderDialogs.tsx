/**
 * Folder Dialog Components
 *
 * FolderCreateDialog and FolderEditDialog for creating and editing folders.
 */

import React, { useState, useCallback, useEffect } from 'react';

import type { IVaultFolder } from '@/types/vault';

import { InlineErrorMessage } from '@/components/common/InlineErrorMessage';
import { runBusyErrorOperation } from '@/components/common/runUiOperation';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

import type {
  FolderCreateDialogProps,
  FolderEditDialogProps,
} from './FolderManagerTypes';

import { buildResponseError } from '../vaultDialogApi';
import { VaultDialogFrame } from '../VaultDialogFrame';
import { FolderEditDeleteSection } from './FolderDialogSections';
import { FolderIcon, XMarkIcon } from './FolderManagerIcons';

interface FolderPayload {
  name: string;
  description: string | null;
  parentId?: string | null;
}

async function createFolder(payload: FolderPayload): Promise<IVaultFolder> {
  const response = await fetch('/api/vault/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await buildResponseError(
      response,
      'Response not JSON when creating folder',
      'Failed to create folder',
    );
  }

  return (await response.json()) as IVaultFolder;
}

async function updateFolder(
  folderId: string,
  payload: FolderPayload,
): Promise<IVaultFolder> {
  const response = await fetch(`/api/vault/folders/${folderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await buildResponseError(
      response,
      'Response not JSON when updating folder',
      'Failed to update folder',
    );
  }

  return (await response.json()) as IVaultFolder;
}

async function deleteFolder(folderId: string): Promise<void> {
  const response = await fetch(`/api/vault/folders/${folderId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw await buildResponseError(
      response,
      'Response not JSON when deleting folder',
      'Failed to delete folder',
    );
  }
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

    await runBusyErrorOperation(
      setCreating,
      setError,
      'Failed to create folder',
      async () => {
        const folder = await createFolder({
          name: name.trim(),
          description: description.trim() || null,
          parentId: parentId || null,
        });
        onCreated?.(folder);
        resetForm();
        onClose();
      },
    );
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
    <VaultDialogFrame
      overlayClassName="bg-black/60 backdrop-blur-sm"
      panelClassName="mx-4 w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-800 p-6 shadow-2xl shadow-black/50"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <FolderIcon className="h-5 w-5 text-cyan-400" />
          </div>
          <h2 className="text-xl font-bold text-white">New Folder</h2>
        </div>
        <button
          onClick={handleClose}
          aria-label="Close folder create dialog"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <InlineErrorMessage message={error} variant="dialogSoft" />

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
          <label className="mb-1 block text-sm text-gray-400">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700/50 px-4 py-2 text-white placeholder-gray-500 transition-colors focus:border-cyan-500 focus:outline-none"
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
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={handleClose} disabled={creating}>
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
    </VaultDialogFrame>
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

    await runBusyErrorOperation(
      setSaving,
      setError,
      'Failed to update folder',
      async () => {
        const updatedFolder = await updateFolder(folder.id, {
          name: name.trim(),
          description: description.trim() || null,
        });
        onUpdated?.(updatedFolder);
        resetState();
        onClose();
      },
    );
  }, [folder, name, description, onUpdated, resetState, onClose]);

  const handleDelete = useCallback(async () => {
    if (!folder) return;

    await runBusyErrorOperation(
      setDeleting,
      setError,
      'Failed to delete folder',
      async () => {
        await deleteFolder(folder.id);
        onDeleted?.(folder.id);
        resetState();
        onClose();
      },
    );
  }, [folder, onDeleted, resetState, onClose]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  if (!isOpen || !folder) return null;

  return (
    <VaultDialogFrame
      overlayClassName="bg-black/60 backdrop-blur-sm"
      panelClassName="mx-4 w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-800 p-6 shadow-2xl shadow-black/50"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <FolderIcon className="h-5 w-5 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Edit Folder</h2>
        </div>
        <button
          onClick={handleClose}
          aria-label="Close folder edit dialog"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <InlineErrorMessage message={error} variant="dialogSoft" />

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
          <label className="mb-1 block text-sm text-gray-400">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full resize-none rounded-lg border border-gray-600 bg-gray-700/50 px-4 py-2 text-white placeholder-gray-500 transition-colors focus:border-amber-500 focus:outline-none"
            rows={3}
          />
        </div>
      </div>

      {/* Delete Confirmation */}
      <FolderEditDeleteSection
        confirmDelete={confirmDelete}
        deleting={deleting}
        onStartDelete={() => setConfirmDelete(true)}
        onDelete={handleDelete}
        onCancelDelete={() => setConfirmDelete(false)}
      />

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3 border-t border-gray-700/50 pt-4">
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
    </VaultDialogFrame>
  );
}
