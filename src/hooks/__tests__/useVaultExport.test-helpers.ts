import type {
  IExportableForce,
  IExportablePilot,
  IExportableUnit,
  IShareableBundle,
} from '@/types/vault';

import { serializeBundle } from '@/services/vault/BundleService';
import {
  useIdentitySelector,
  useIdentityStore,
} from '@/stores/useIdentityStore';

import { ExportOptions } from '../useVaultExport';

jest.mock('@/stores/useIdentityStore');
jest.mock('@/services/vault/BundleService');

export const mockUseIdentityStore = useIdentityStore as jest.MockedFunction<
  typeof useIdentityStore
>;
const mockUseIdentitySelector = useIdentitySelector as jest.MockedFunction<
  typeof useIdentitySelector
>;
export const mockSerializeBundle = serializeBundle as jest.MockedFunction<
  typeof serializeBundle
>;

export const mockFetch = jest.fn();
global.fetch = mockFetch;

export const createMockBundle = (): IShareableBundle => ({
  metadata: {
    version: '1.0.0',
    contentType: 'unit',
    itemCount: 1,
    author: {
      displayName: 'Test Author',
      publicKey: 'abc123',
      friendCode: 'TEST-1234',
    },
    createdAt: '2024-01-01T00:00:00Z',
    appVersion: '0.1.0',
  },
  payload: JSON.stringify([{ id: 'unit-1', name: 'Test Unit' }]),
  signature: 'test-signature',
});

export const createMockUnit = (
  overrides: Partial<IExportableUnit> = {},
): IExportableUnit => ({
  id: 'unit-1',
  name: 'Test Mech',
  chassis: 'Atlas',
  model: 'AS7-D',
  data: { tonnage: 100 },
  ...overrides,
});

export const createMockPilot = (
  overrides: Partial<IExportablePilot> = {},
): IExportablePilot => ({
  id: 'pilot-1',
  name: 'John Doe',
  callsign: 'Maverick',
  data: { gunnery: 4, piloting: 5 },
  ...overrides,
});

export const createMockForce = (
  overrides: Partial<IExportableForce> = {},
): IExportableForce => ({
  id: 'force-1',
  name: 'Alpha Lance',
  description: 'Test force',
  data: { units: [] },
  ...overrides,
});

export const createExportOptions = (
  overrides: Partial<ExportOptions> = {},
): ExportOptions => ({
  password: 'test-password',
  description: 'Test export',
  tags: ['test'],
  ...overrides,
});

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
export const mockClick = jest.fn();
export const mockWriteText = jest.fn();
let createElementSpy: jest.SpyInstance | undefined;
let appendChildSpy: jest.SpyInstance | undefined;
let removeChildSpy: jest.SpyInstance | undefined;

export const setupVaultExportTest = () => {
  jest.clearAllMocks();

  mockUseIdentityStore.mockReturnValue({
    isUnlocked: true,
    initialized: true,
    hasIdentity: true,
    publicIdentity: {
      displayName: 'Test User',
      publicKey: 'abc123',
      friendCode: 'TEST-1234',
    },
    loading: false,
    error: null,
    checkIdentity: jest.fn(),
    createIdentity: jest.fn(),
    unlockIdentity: jest.fn(),
    lockIdentity: jest.fn(),
    updateDisplayName: jest.fn(),
    clearError: jest.fn(),
  });
  mockUseIdentitySelector.mockImplementation((selector) =>
    selector(mockUseIdentityStore()),
  );

  mockFetch.mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        bundle: createMockBundle(),
        suggestedFilename: 'test-unit-20240101.mekbundle',
      }),
  });
  mockSerializeBundle.mockReturnValue('{"serialized":"bundle"}');
  URL.createObjectURL = jest.fn().mockReturnValue('blob:test-url');
  URL.revokeObjectURL = jest.fn();

  const mockAnchor = {
    href: '',
    download: '',
    click: mockClick,
  } as unknown as HTMLAnchorElement;

  const originalCreateElement = document.createElement.bind(document);
  createElementSpy = jest.spyOn(document, 'createElement').mockImplementation(((
    tagName: string,
  ) => {
    if (tagName === 'a') {
      return mockAnchor;
    }
    return originalCreateElement(tagName);
  }) as unknown as jest.Mock) as unknown as jest.SpyInstance;

  appendChildSpy = jest
    .spyOn(document.body, 'appendChild')
    .mockImplementation((node) => node);
  removeChildSpy = jest
    .spyOn(document.body, 'removeChild')
    .mockImplementation((node) => node);

  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText.mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
};

export const cleanupVaultExportTest = () => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  createElementSpy?.mockRestore();
  appendChildSpy?.mockRestore();
  removeChildSpy?.mockRestore();
};
