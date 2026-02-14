import type { IVersionSnapshot, ShareableContentType } from '@/types/vault';

export interface VersionHistoryPanelProps {
  itemId: string;
  contentType: ShareableContentType;
  onVersionSelect?: (version: IVersionSnapshot) => void;
  onRollback?: (version: IVersionSnapshot) => void;
  className?: string;
}

export interface VersionDiffViewProps {
  itemId: string;
  contentType: ShareableContentType;
  versions: IVersionSnapshot[];
  initialFromVersion?: number;
  initialToVersion?: number;
  className?: string;
}

export interface VersionPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  version: IVersionSnapshot | null;
  onRollback?: (version: IVersionSnapshot) => void;
}

export interface VersionRollbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  version: IVersionSnapshot | null;
  currentVersion: number;
  onConfirm?: (version: IVersionSnapshot) => void;
}
