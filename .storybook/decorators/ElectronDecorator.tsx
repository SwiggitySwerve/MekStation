import React, { useEffect } from 'react';
import type { Decorator } from '@storybook/react';
import { 
  enableMockElectron, 
  disableMockElectron,
  setMockElectronSettings,
  resetMockElectronSettings,
} from '../mocks/useElectron';
import { IDesktopSettings } from '../../src/components/settings/useElectron';

interface ElectronParameters {
  enabled?: boolean;
  settings?: Partial<IDesktopSettings>;
}

export const ElectronDecorator: Decorator = (Story, context) => {
  const { electron } = context.parameters as { electron?: ElectronParameters } || {};
  
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
