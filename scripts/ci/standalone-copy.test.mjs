import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { copyDirectory } from '../next/copy-directory.mjs';

for (const missing of [false, true]) {
  for (const filtered of [false, true]) {
    test(`standalone npm link remains relative (missing target: ${missing}, filtered: ${filtered})`, async (context) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'standalone-link-'));
      try {
        const source = path.join(root, 'source');
        const output = path.join(root, 'artifact');
        const relative = path.join('node_modules', '.bin', 'x');
        fs.mkdirSync(path.join(source, 'node_modules/.bin'), {
          recursive: true,
        });
        if (!missing) {
          fs.mkdirSync(path.join(source, 'node_modules/pkg/bin'), {
            recursive: true,
          });
          fs.writeFileSync(
            path.join(source, 'node_modules/pkg/bin/x.js'),
            'complete runtime',
          );
        }
        const original = path.join(source, relative);
        try {
          fs.symlinkSync('../pkg/bin/x.js', original, 'file');
        } catch (error) {
          if (process.platform !== 'win32' || error.code !== 'EPERM')
            throw error;
          context.skip(
            'Windows account lacks file-symlink privilege; Linux CI must run this contract',
          );
          return;
        }
        await copyDirectory(
          source,
          output,
          filtered ? { filter: () => true } : {},
        );
        const copied = path.join(output, relative);
        assert.equal(fs.readlinkSync(copied), fs.readlinkSync(original));
        assert.equal(path.isAbsolute(fs.readlinkSync(copied)), false);
        if (missing) {
          assert.ok(fs.lstatSync(copied).isSymbolicLink());
          assert.equal(fs.existsSync(copied), false);
        } else {
          assert.equal(
            fs.realpathSync(copied),
            fs.realpathSync(path.join(output, 'node_modules/pkg/bin/x.js')),
          );
          assert.equal(fs.readFileSync(copied, 'utf8'), 'complete runtime');
        }
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
}
