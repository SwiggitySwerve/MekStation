/**
 * Folder Dialog Components
 *
 * FolderCreateDialog and FolderEditDialog for creating and editing folders.
 */

import React, { useState, useCallback, useEffect } from 'react';

import type { IVaultFolder } from '@/types/vault';

import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { logger } from '@/utils/logger';

import type {
  FolderCreateDialogProps,
  FolderEditDialogProps,
} from './FolderManagerTypes';

import { FolderIcon, XMarkIcon, TrashIcon } from './FolderManagerIcons';

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
        const errorData = (await response.json().catch((e) => {
          logger.debug('Response not JSON when creating folder', e);
          return {};
        })) as {
          error?: string;
        };
        throw new Error(
          errorData.error || `Failed to create folder (${response.status})`,
        );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-800 p-6 shadow-2xl shadow-black/50">
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
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-3 text-sm text-red-300">
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
        const errorData = (await response.json().catch((e) => {
          logger.debug('Response not JSON when updating folder', e);
          return {};
        })) as {
          error?: string;
        };
        throw new Error(
          errorData.error || `Failed to update folder (${response.status})`,
        );
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
        const errorData = (await response.json().catch((e) => {
          logger.debug('Response not JSON when deleting folder', e);
          return {};
        })) as {
          error?: string;
        };
        throw new Error(
          errorData.error || `Failed to delete folder (${response.status})`,
        );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-800 p-6 shadow-2xl shadow-black/50">
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
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/30 px-4 py-3 text-sm text-red-300">
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
        {confirmDelete ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-900/20 p-4">
            <p className="mb-3 text-sm text-red-300">
              Are you sure you want to delete this folder? Items inside will be
              moved to root.
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
            className="mt-6 flex items-center gap-2 text-sm text-red-400 transition-colors hover:text-red-300"
          >
            <TrashIcon className="h-4 w-4" />
            Delete this folder
          </button>
        )}

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
      </div>
    </div>
  );
}
