import * as fs from 'fs';
import * as path from 'path';

import { getAppIcon, getTrayIcon } from '../main.config';

describe('packaged Windows icons', () => {
  const originalPlatform = Object.getOwnPropertyDescriptor(
    process,
    'platform',
  )!;
  const appRoot = path.resolve(__dirname, '../..');
  const compiledMainDir = path.join(appRoot, 'dist', 'electron');

  beforeAll(() => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
  });

  afterAll(() => {
    Object.defineProperty(process, 'platform', originalPlatform);
  });

  it.each([
    [getAppIcon, 'icon.ico', [16, 32, 48, 64, 128, 256]],
    [getTrayIcon, 'tray.ico', [16, 32, 48]],
  ] as const)(
    'resolves %s to shipped ICO frames',
    (resolveIcon, name, sizes) => {
      const iconPath = resolveIcon(compiledMainDir);
      expect(iconPath).toBe(path.join(appRoot, 'assets', 'icons', name));
      const icon = fs.readFileSync(iconPath);
      expect(icon.readUInt16LE(0)).toBe(0);
      expect(icon.readUInt16LE(2)).toBe(1);
      expect(icon.readUInt16LE(4)).toBe(sizes.length);
      sizes.forEach((size, index) => {
        const entry = 6 + index * 16;
        expect(icon[entry] || 256).toBe(size);
        expect(icon[entry + 1] || 256).toBe(size);
        const length = icon.readUInt32LE(entry + 8);
        const offset = icon.readUInt32LE(entry + 12);
        expect(offset + length).toBeLessThanOrEqual(icon.length);
        expect(icon.subarray(offset, offset + 8).toString('hex')).toBe(
          '89504e470d0a1a0a',
        );
      });
    },
  );
});
