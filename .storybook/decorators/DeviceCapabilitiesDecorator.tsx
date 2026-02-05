import type { Decorator } from '@storybook/react';

import React, { createContext, useContext, ReactNode } from 'react';

interface DeviceCapabilities {
  hasTouch: boolean;
  hasMouse: boolean;
  isMobile: boolean;
}

const DeviceCapabilitiesContext = createContext<DeviceCapabilities>({
  hasTouch: false,
  hasMouse: true,
  isMobile: false,
});

export function useDeviceCapabilitiesMock(): DeviceCapabilities {
  return useContext(DeviceCapabilitiesContext);
}

interface DeviceCapabilitiesProviderProps {
  children: ReactNode;
  capabilities?: Partial<DeviceCapabilities>;
}

export function DeviceCapabilitiesProvider({
  children,
  capabilities = {},
}: DeviceCapabilitiesProviderProps): React.ReactElement {
  const value: DeviceCapabilities = {
    hasTouch: capabilities.hasTouch ?? false,
    hasMouse: capabilities.hasMouse ?? true,
    isMobile: capabilities.isMobile ?? false,
  };

  return (
    <DeviceCapabilitiesContext.Provider value={value}>
      {children}
    </DeviceCapabilitiesContext.Provider>
  );
}

export const DeviceCapabilitiesDecorator: Decorator = (Story, context) => {
  const { deviceCapabilities } = context.parameters || {};

  return (
    <DeviceCapabilitiesProvider capabilities={deviceCapabilities}>
      <Story />
    </DeviceCapabilitiesProvider>
  );
};
