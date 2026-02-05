import type { Decorator } from '@storybook/react';

import React, { useEffect } from 'react';

import { IDesktopSettings } from '../../src/components/settings/useElectron';
import {
  enableMockElectron,
  disableMockElectron,
  setMockElectronSettings,
  resetMockElectronSettings,
} from '../mocks/useElectron';

interface ElectronParameters {
  enabled?: boolean;
  settings?: Partial<IDesktopSettings>;
}

export const ElectronDecorator: Decorator = (Story, context) => {
  const { electron } =
    (context.parameters as { electron?: ElectronParameters }) || {};

  useEffect(() => {
    if (electron?.enabled !== false) {
      if (electron?.settings) {
        setMockElectronSettings(electron.settings);
      }
      enableMockElectron();
    }

    return () => {
      disableMockElectron();
      resetMockElectronSettings();
    };
  }, [electron?.enabled, electron?.settings]);

  return <Story />;
};
