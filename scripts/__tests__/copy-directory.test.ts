import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.resolve(__dirname, '../next/copy-directory.mjs'),
).href;
const roots: string[] = [];
function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-copy-directory-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'input/nested/empty'), { recursive: true });
  fs.writeFileSync(path.join(root, 'input/.hidden'), 'hidden');
  fs.writeFileSync(path.join(root, 'input/nested/unicode-λ.txt'), 'λ');
  fs.writeFileSync(path.join(root, 'input/run.sh'), '#!/bin/sh\nexit 0\n');
  fs.chmodSync(path.join(root, 'input/run.sh'), 0o755);
  fs.writeFileSync(
    path.join(root, 'input/readonly.bin'),
    Buffer.from([0, 255]),
  );
  fs.chmodSync(path.join(root, 'input/readonly.bin'), 0o444);
  return root;
}
function run(root: string, setup = '') {
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import fs from 'node:fs'; import path from 'node:path';
       import { copyDirectory } from ${JSON.stringify(moduleUrl)};
       const root = ${JSON.stringify(root)};
       ${setup}
       fs.cpSync(path.join(root, 'input'), path.join(root, 'expected'), { recursive: true, force: true });
       await copyDirectory(path.join(root, 'input'), path.join(root, 'actual'));
       function snapshot(directory, relative = '', rows = []) {
         for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
           const file = path.join(directory, entry.name), name = path.posix.join(relative, entry.name);
           const stats = fs.lstatSync(file);
           if (stats.isSymbolicLink()) rows.push({ name, link: fs.readlinkSync(file) });
           else if (stats.isDirectory()) { rows.push({ name, directory: true, mode: stats.mode }); snapshot(file, name, rows); }
           else rows.push({ name, mode: stats.mode, data: fs.readFileSync(file).toString('hex') });
         }
         return rows;
       }
       console.log(JSON.stringify({ actual: snapshot(path.join(root, 'actual')), expected: snapshot(path.join(root, 'expected')) }));`,
    ],
    { cwd: root, encoding: 'utf8' },
  );
}
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

describe('standalone complete directory copying', () => {
  it('preserves bytes, modes, hidden files and empty directories like fs.cpSync', () => {
    const root = fixture();
    const result = run(root);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.actual).toEqual(output.expected);
  });

  it('preserves directory-link behavior like fs.cpSync', () => {
    const root = fixture();
    const result = run(
      root,
      `fs.symlinkSync(path.join(root, 'input/nested'), path.join(root, 'input/linked'), process.platform === 'win32' ? 'junction' : 'dir');`,
    );
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.actual).toEqual(output.expected);
  });

  (process.platform === 'win32' ? it.skip : it)(
    'preserves file links and permissions despite a restrictive umask',
    () => {
      const root = fixture();
      const result = run(
        root,
        `process.umask(0o077); fs.symlinkSync(path.join(root, 'input/run.sh'), path.join(root, 'input/linked-file'));`,
      );
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      const output = JSON.parse(result.stdout);
      expect(output.actual).toEqual(output.expected);
    },
  );
});
