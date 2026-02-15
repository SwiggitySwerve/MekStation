import type { ISharedItem } from '@/pages-modules/shared/types';
import type { PermissionLevel, ShareableContentType } from '@/types/vault';

import {
  DocumentIcon,
  EncounterIcon,
  FolderIcon,
  ForceIcon,
  MechIcon,
  PilotIcon,
} from '@/pages-modules/shared/icons';

export function getTypeDisplay(type: ShareableContentType | 'folder'): {
  icon: React.ReactNode;
  label: string;
  color: string;
} {
  switch (type) {
    case 'unit':
      return {
        icon: <MechIcon className="h-5 w-5" />,
        label: 'Unit',
        color: 'text-cyan-400',
      };
    case 'pilot':
      return {
        icon: <PilotIcon className="h-5 w-5" />,
        label: 'Pilot',
        color: 'text-violet-400',
      };
    case 'force':
      return {
        icon: <ForceIcon className="h-5 w-5" />,
        label: 'Force',
        color: 'text-amber-400',
      };
    case 'encounter':
      return {
        icon: <EncounterIcon className="h-5 w-5" />,
        label: 'Encounter',
        color: 'text-rose-400',
      };
    case 'folder':
      return {
        icon: <FolderIcon className="h-5 w-5" />,
        label: 'Folder',
        color: 'text-emerald-400',
      };
    default:
      return {
        icon: <DocumentIcon className="h-5 w-5" />,
        label: 'Item',
        color: 'text-slate-400',
      };
  }
}

export function getLevelVariant(
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

export function getSyncStatusDisplay(status: ISharedItem['syncStatus']): {
  variant: 'emerald' | 'amber' | 'red' | 'slate';
  label: string;
} {
  switch (status) {
    case 'synced':
      return { variant: 'emerald', label: 'Synced' };
    case 'pending':
      return { variant: 'amber', label: 'Pending' };
    case 'conflict':
      return { variant: 'red', label: 'Conflict' };
    case 'offline':
    default:
      return { variant: 'slate', label: 'Offline' };
  }
}
