import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import { DesktopSettingsDialog } from './DesktopSettingsDialog';

const meta: Meta<typeof DesktopSettingsDialog> = {
  title: 'Settings/DesktopSettingsDialog',
  component: DesktopSettingsDialog,
  parameters: {
    layout: 'centered',
    electron: {
      enabled: true,
    },
  },
  tags: ['autodocs'],
  args: {
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DesktopSettingsDialog>;

export const GeneralTab: Story = {
  args: {
    isOpen: true,
  },
};

export const BackupsTab: Story = {
  args: {
    isOpen: true,
  },
  parameters: {
    electron: {
      enabled: true,
      settings: {
        enableAutoBackup: true,
        backupIntervalMinutes: 10,
        maxBackupCount: 20,
        backupDirectory: '/Users/pilot/Documents/MekStation/backups',
      },
    },
  },
};

export const UpdatesTab: Story = {
  args: {
    isOpen: true,
  },
  parameters: {
    electron: {
      enabled: true,
      settings: {
        checkForUpdatesAutomatically: true,
        updateChannel: 'beta',
      },
    },
  },
};

export const AdvancedTab: Story = {
  args: {
    isOpen: true,
  },
  parameters: {
    electron: {
      enabled: true,
      settings: {
        enableDevTools: true,
        maxRecentFiles: 25,
        dataDirectory: '/Users/pilot/.mekstation',
      },
    },
  },
};

export const WithCustomSettings: Story = {
  args: {
    isOpen: true,
  },
  parameters: {
    electron: {
      enabled: true,
      settings: {
        launchAtLogin: true,
        startMinimized: false,
        reopenLastUnit: true,
        defaultSaveDirectory: '/Users/pilot/BattleTech/Units',
        rememberWindowState: true,
        enableAutoBackup: true,
        backupIntervalMinutes: 15,
        maxBackupCount: 5,
        checkForUpdatesAutomatically: false,
        updateChannel: 'stable',
      },
    },
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
