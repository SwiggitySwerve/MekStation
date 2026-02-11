/**
 * Folder Manager Type Definitions
 *
 * All type interfaces for folder management components.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import type {
  IVaultFolder,
  IFolderItem,
  IPermissionGrant,
  IContact,
  ShareableContentType,
  PermissionLevel,
} from '@/types/vault';

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
