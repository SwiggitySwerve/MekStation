/** Identity artifact paths, original bytes and exclusive archive publication. */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual, TextDecoder } from 'node:util';

import { evidenceDirOf, sha256 } from '../roadmap-loop-runtime.mjs';
import { checkRef, identityCheck } from './contract.mjs';

export function identityPath(base, relative) {
  identityCheck(
    typeof relative === 'string' &&
      relative.length > 0 &&
      !/[\\:]/.test(relative) &&
      !relative.startsWith('/') &&
      relative.split('/').every((p) => p && p !== '.' && p !== '..'),
    'unsafe relative identity path',
  );
  let file = path.resolve(base);
  for (const part of ['.', ...relative.split('/')]) {
    file = path.join(file, part);
    identityCheck(
      !fs.lstatSync(file).isSymbolicLink(),
      'identity path is a reparse alias',
    );
  }
  identityCheck(fs.statSync(file).isFile(), 'identity path is not a file');
  const inside = path.relative(fs.realpathSync(base), fs.realpathSync(file));
  identityCheck(
    inside && !inside.startsWith('..') && !path.isAbsolute(inside),
    'identity path escaped its root',
  );
  return file;
}

export function identityArtifact(base, ref) {
  checkRef(ref);
  const file = identityPath(base, ref.path);
  const bytes = fs.readFileSync(file);
  identityCheck(
    bytes.length === ref.bytes && sha256(bytes) === ref.sha256,
    'artifact hash/bytes mismatch',
  );
  return { file, bytes, value: JSON.parse(bytes.toString('utf8')) };
}

// Native-only custody; legacy reads retain their original predicates and Buffer law.
export function nativePath(file, directory = false) {
  identityCheck(
    path.isAbsolute(file) &&
      !file.split(/[\\/]/).some((p) => p === '.' || p === '..'),
    'native selector must be explicit and unambiguous',
  );
  const absolute = path.resolve(file);
  identityCheck(!absolute.startsWith('\\\\'), 'native UNC path refused');
  const root = path.parse(absolute).root;
  let current = root;
  const rootStat = fs.lstatSync(root, { bigint: true });
  const identities = [[root, rootStat.dev.toString(), rootStat.ino.toString()]];
  for (const part of absolute
    .slice(root.length)
    .split(path.sep)
    .filter(Boolean)) {
    identityCheck(
      fs.readdirSync(current).includes(part),
      'native path case/alias mismatch',
    );
    current = path.join(current, part);
    const stat = fs.lstatSync(current, { bigint: true });
    identityCheck(!stat.isSymbolicLink(), 'native reparse path refused');
    identities.push([current, stat.dev.toString(), stat.ino.toString()]);
  }
  const stat = fs.lstatSync(absolute, { bigint: true });
  identityCheck(
    directory ? stat.isDirectory() : stat.isFile(),
    'native path type/link mismatch',
  );
  identityCheck(
    fs.realpathSync(absolute) === absolute,
    'native realpath alias',
  );
  if (process.platform === 'win32') {
    const attributes = spawnSync(
      'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '[Console]::InputEncoding=[Text.UTF8Encoding]::new($false); $ErrorActionPreference="Stop"; ' +
          '$paths=$input|ConvertFrom-Json; foreach($p in $paths) { ' +
          'if((Get-Item -Force -LiteralPath $p).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Native reparse point" } }; "OK"',
      ],
      {
        input: JSON.stringify(identities.map(([entry]) => entry)),
        encoding: 'utf8',
        windowsHide: true,
      },
    );
    identityCheck(
      attributes.status === 0 && attributes.stdout.trim() === 'OK',
      'native Windows attribute guard refused',
    );
  }
  return { absolute, stat, identities };
}

export function nativeBytes(file, prefixBytes) {
  const before = nativePath(file);
  const descriptor = fs.openSync(before.absolute, 'r');
  try {
    const opened = fs.fstatSync(descriptor, { bigint: true });
    identityCheck(
      opened.dev === before.stat.dev && opened.ino === before.stat.ino,
      'native opened file changed',
    );
    const length = prefixBytes ?? Number(opened.size);
    identityCheck(
      Number.isSafeInteger(length) &&
        length >= 0 &&
        BigInt(length) <= opened.size,
      'native byte bounds invalid',
    );
    const bytes = Buffer.alloc(length);
    const read = () => {
      let offset = 0;
      while (offset < length) {
        const count = fs.readSync(
          descriptor,
          bytes,
          offset,
          length - offset,
          offset,
        );
        identityCheck(count > 0, 'native incomplete read');
        offset += count;
      }
    };
    read();
    const first = Buffer.from(bytes);
    read();
    const closed = fs.fstatSync(descriptor, { bigint: true });
    const after = nativePath(file);
    identityCheck(
      isDeepStrictEqual(before.identities, after.identities) &&
        first.equals(bytes) &&
        opened.dev === closed.dev &&
        opened.ino === closed.ino &&
        (prefixBytes !== undefined ||
          (opened.size === before.stat.size &&
            opened.mtimeNs === before.stat.mtimeNs &&
            opened.size === closed.size &&
            opened.mtimeNs === closed.mtimeNs)),
      'native path/bytes drift',
    );
    return first;
  } finally {
    fs.closeSync(descriptor);
  }
}

export const nativeText = (bytes) =>
  new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);

export function archiveReviewIdentity(ledgerDir, verified) {
  const evidence = evidenceDirOf(ledgerDir);
  identityCheck(
    !fs.lstatSync(evidence).isSymbolicLink(),
    'evidence directory is a reparse alias',
  );
  const pending = [];
  const add = (kind, bytes) => {
    const hash = sha256(bytes);
    const ref = {
      path: `${kind}-${hash}.json`,
      sha256: hash,
      bytes: bytes.length,
    };
    pending.push({ ref, bytes });
    return ref;
  };
  const refs = verified.snapshots.map((s) => add('identity', s.bytes));
  const manifest = {
    ...verified.manifest,
    author: refs[0],
    finishers: refs.slice(1, -1),
    reviewer: refs.at(-1),
  };
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const ref = add('review-identity', bytes);
  for (const p of pending) {
    const target = path.join(evidence, p.ref.path);
    if (fs.existsSync(target))
      identityCheck(
        fs.readFileSync(identityPath(evidence, p.ref.path)).equals(p.bytes),
        'existing identity archive content conflicts',
      );
  }
  for (const p of pending) {
    const target = path.join(evidence, p.ref.path);
    if (!fs.existsSync(target))
      fs.writeFileSync(target, p.bytes, { flag: 'wx' });
  }
  return { ...ref, path: `evidence/${ref.path}` };
}
