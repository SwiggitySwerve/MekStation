import type { Meta, StoryObj } from '@storybook/react';
import type { ReactElement, ReactNode } from 'react';

import { fn } from '@storybook/test';

import type {
  IExportableUnit,
  IImportHandlers,
  ISyncConflict,
} from '@/types/vault';

import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { ExportDialog } from './ExportDialog';
import { ImportDialog } from './ImportDialog';
import { ShareDialog } from './ShareDialog';

const sampleUnit: IExportableUnit = {
  id: 'unit-atlas-as7-d',
  name: 'Atlas AS7-D',
  chassis: 'Atlas',
  model: 'AS7-D',
  data: {
    tonnage: 100,
    battleValue: 1897,
    techBase: 'Inner Sphere',
  },
  source: 'storybook',
};

const conflict: ISyncConflict = {
  id: 'conflict-unit-atlas',
  contentType: 'unit',
  itemId: 'unit-atlas-as7-d',
  itemName: 'Atlas AS7-D',
  localVersion: 12,
  localHash: 'local-a06a44e8b8fb4c6f9fca76f9ed67b422',
  remoteVersion: 13,
  remoteHash: 'remote-f2d624d5e1a44f60b99ceef24c6272a8',
  remotePeerId: 'KSTL-713F-VAULT-01',
  detectedAt: '2026-04-29T04:22:00.000Z',
  resolution: 'pending',
};

const importHandlers: IImportHandlers<IExportableUnit> = {
  checkExists: fn(async () => false),
  checkNameConflict: fn(async () => null),
  save: fn(async (item) => item.id),
};

const DialogStoryHost = ({
  children,
}: {
  children: ReactNode;
}): ReactElement => (
  <div className="min-h-[620px] bg-gray-950 p-8">{children}</div>
);

const meta: Meta<typeof ShareDialog> = {
  title: 'Vault/Dialogs',
  component: ShareDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ShareDialog>;

export const ShareUnitDialog: Story = {
  render: () => (
    <DialogStoryHost>
      <ShareDialog
        isOpen
        onClose={fn()}
        scopeType="item"
        scopeId="unit-atlas-as7-d"
        itemName="Atlas AS7-D"
        onShareCreated={fn()}
      />
    </DialogStoryHost>
  ),
};

export const ConflictResolution: Story = {
  render: () => (
    <DialogStoryHost>
      <ConflictResolutionDialog
        isOpen
        onClose={fn()}
        conflict={conflict}
        onResolved={fn()}
      />
    </DialogStoryHost>
  ),
};

export const ExportLocked: Story = {
  render: () => (
    <DialogStoryHost>
      <ExportDialog
        isOpen
        onClose={fn()}
        contentType="unit"
        content={sampleUnit}
        onExportComplete={fn()}
      />
    </DialogStoryHost>
  ),
};

export const ImportBundle: Story = {
  render: () => (
    <DialogStoryHost>
      <ImportDialog
        isOpen
        onClose={fn()}
        handlers={importHandlers}
        onImportComplete={fn()}
      />
    </DialogStoryHost>
  ),
};
