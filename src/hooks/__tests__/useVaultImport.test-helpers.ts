import type { IImportConflict, IImportHandlers } from '@/types/vault';

import {
  importFromString,
  previewBundle,
  readBundleFromFile,
  validateBundleFile,
} from '@/services/vault/ImportService';

jest.mock('@/services/vault/ImportService');

export const mockImportFromString = importFromString as jest.MockedFunction<
  typeof importFromString
>;
export const mockReadBundleFromFile = readBundleFromFile as jest.MockedFunction<
  typeof readBundleFromFile
>;
export const mockValidateBundleFile = validateBundleFile as jest.MockedFunction<
  typeof validateBundleFile
>;
export const mockPreviewBundle = previewBundle as jest.MockedFunction<
  typeof previewBundle
>;

export const createMockFile = (name: string, _size: number = 1000): File => {
  const blob = new Blob(['test content'], { type: 'application/json' });
  return new File([blob], name, { type: 'application/json' });
};

export const createMockHandlers = <T>(): IImportHandlers<T> => ({
  checkExists: jest.fn().mockResolvedValue(false),
  checkNameConflict: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue('new-id'),
});

export const createMockConflict = (
  resolution: IImportConflict['resolution'] = 'skip',
): IImportConflict => ({
  contentType: 'unit',
  bundleItemId: 'unit-1',
  bundleItemName: 'Test Unit',
  existingItemId: 'existing-1',
  existingItemName: 'Existing Unit',
  resolution,
});

export const mockBundleContent = JSON.stringify({
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

export const setupVaultImportTest = () => {
  jest.clearAllMocks();
  mockValidateBundleFile.mockReturnValue(null);
  mockReadBundleFromFile.mockResolvedValue(mockBundleContent);
  mockPreviewBundle.mockResolvedValue({
    valid: true,
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
    itemCount: 1,
  });
  mockImportFromString.mockResolvedValue({
    success: true,
    data: {
      importedCount: 1,
      skippedCount: 0,
      replacedCount: 0,
    },
  });
};
