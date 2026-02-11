/**
 * Folder Manager Components
 *
 * Components for managing vault folders with sharing capabilities.
 * Includes folder list, create/edit dialogs, and sharing/items panels.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

export type {
  FolderListProps,
  FolderCreateDialogProps,
  FolderEditDialogProps,
  FolderSharePanelProps,
  FolderItemsPanelProps,
} from './folder-manager';

export {
  FolderList,
  FolderCreateDialog,
  FolderEditDialog,
  FolderSharePanel,
  FolderItemsPanel,
} from './folder-manager';

import {
  FolderList as _FolderList,
  FolderCreateDialog as _FolderCreateDialog,
  FolderEditDialog as _FolderEditDialog,
  FolderSharePanel as _FolderSharePanel,
  FolderItemsPanel as _FolderItemsPanel,
} from './folder-manager';

export const FolderManager = {
  FolderList: _FolderList,
  FolderCreateDialog: _FolderCreateDialog,
  FolderEditDialog: _FolderEditDialog,
  FolderSharePanel: _FolderSharePanel,
  FolderItemsPanel: _FolderItemsPanel,
};
