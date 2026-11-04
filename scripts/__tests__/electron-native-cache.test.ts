import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  nativeBindingCacheKey,
  restoreNativeBinding,
  saveNativeBinding,
} from '../../desktop/scripts/electron-native-cache';

const roots: string[] = [];
function temporary(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-native-cache-'));
  roots.push(root);
  return root;
}
function nativeSource(root: string): string {
  const source = path.join(root, 'module');
  fs.mkdirSync(path.join(source, 'src'), { recursive: true });
  fs.writeFileSync(path.join(source, 'package.json'), '{"version":"1.0.0"}');
  fs.writeFileSync(path.join(source, 'binding.gyp'), '{}');
  fs.writeFileSync(path.join(source, 'src/main.cc'), 'source');
  return source;
}
afterEach(() => {
  jest.restoreAllMocks();
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

describe('Electron native binding cache', () => {
  it('reuses identical inputs across checkouts and invalidates source or ABI changes', () => {
    const first = nativeSource(temporary());
    const second = nativeSource(temporary());
    const inputs = ['binding.gyp', 'src'];
    const key = nativeBindingCacheKey(first, inputs, '43.2.0');
    expect(nativeBindingCacheKey(second, inputs, '43.2.0')).toBe(key);
    expect(nativeBindingCacheKey(second, inputs, '43.3.0')).not.toBe(key);
    expect(
      nativeBindingCacheKey(second, inputs, '43.2.0', {
        desktopLock: 'changed',
      }),
    ).not.toBe(key);
    fs.writeFileSync(path.join(second, 'src/main.cc'), 'edited');
    expect(nativeBindingCacheKey(second, inputs, '43.2.0')).not.toBe(key);
  });

  it('restores only published bindings and leaves the source binding unchanged', () => {
    const root = temporary();
    const cache = path.join(root, 'cache');
    const source = path.join(root, 'node-binding.node');
    const target = path.join(root, 'electron-image/binding.node');
    const key = 'a'.repeat(64);
    fs.writeFileSync(source, 'verified Electron binding');
    expect(restoreNativeBinding(cache, key, target)).toBe(false);
    saveNativeBinding(cache, key, source);
    expect(restoreNativeBinding(cache, key, target)).toBe(true);
    expect(fs.readFileSync(target)).toEqual(fs.readFileSync(source));
    expect(fs.readFileSync(source, 'utf8')).toBe('verified Electron binding');
    expect(fs.readdirSync(cache)).toEqual([`${key}.node`]);
  });

  it('does not publish a partial cache entry when publication fails', () => {
    const root = temporary();
    const cache = path.join(root, 'cache');
    const source = path.join(root, 'binding.node');
    const key = 'b'.repeat(64);
    fs.writeFileSync(source, 'verified binding');
    jest.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('write interrupted');
    });
    expect(() => saveNativeBinding(cache, key, source)).toThrow(
      'write interrupted',
    );
    expect(
      restoreNativeBinding(cache, key, path.join(root, 'image.node')),
    ).toBe(false);
    expect(fs.readdirSync(cache)).toEqual([]);
  });

  it('refuses a cache directory linked outside the owned cache', () => {
    const root = temporary();
    const outside = temporary();
    const cache = path.join(root, 'cache');
    const key = 'c'.repeat(64);
    fs.writeFileSync(path.join(outside, `${key}.node`), 'outside binding');
    fs.symlinkSync(
      outside,
      cache,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    expect(() =>
      restoreNativeBinding(cache, key, path.join(root, 'image.node')),
    ).toThrow('physical directory');
    expect(fs.existsSync(path.join(root, 'image.node'))).toBe(false);
    expect(fs.readFileSync(path.join(outside, `${key}.node`), 'utf8')).toBe(
      'outside binding',
    );
  });

  it('does not overwrite or remove an existing temporary entry', () => {
    const root = temporary();
    const cache = path.join(root, 'cache');
    const source = path.join(root, 'binding.node');
    const key = 'd'.repeat(64);
    fs.mkdirSync(cache);
    fs.writeFileSync(source, 'binding');
    const existing = path.join(cache, `${key}.node.${process.pid}.tmp`);
    fs.writeFileSync(existing, 'existing entry');
    expect(() => saveNativeBinding(cache, key, source)).toThrow();
    expect(fs.readFileSync(existing, 'utf8')).toBe('existing entry');
    expect(fs.existsSync(path.join(cache, `${key}.node`))).toBe(false);
  });
});
