import { useState, useEffect } from 'react';

interface DeviceCapabilities {
  hasTouch: boolean;
  hasMouse: boolean;
  isMobile: boolean;
}

let mockCapabilities: DeviceCapabilities = {
  hasTouch: false,
  hasMouse: true,
  isMobile: false,
};

export function setMockDeviceCapabilities(capabilities: Partial<DeviceCapabilities>): void {
  mockCapabilities = { ...mockCapabilities, ...capabilities };
}

export function resetMockDeviceCapabilities(): void {
  mockCapabilities = {
    hasTouch: false,
    hasMouse: true,
    isMobile: false,
  };
}

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(mockCapabilities);

  useEffect(() => {
    setCapabilities(mockCapabilities);
  }, []);

  return capabilities;
}
