import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Native modules and browsers must never cross Linux distribution releases. */
export function cachePlatform({ os, arch, release }) {
  if (os === 'Windows' || os === 'macOS') return os;
  if (os !== 'Linux') throw new Error(`Unknown runner OS: ${os}`);
  if (!/^(X64|ARM64)$/.test(arch)) throw new Error('Unknown Linux runner architecture');
  const fields = {};
  for (const line of (release ?? '').split(/\r?\n/)) {
    const match = /^(ID|VERSION_ID)=(?:"([a-zA-Z0-9._-]+)"|'([a-zA-Z0-9._-]+)'|([a-zA-Z0-9._-]+))\s*$/.exec(line);
    if (!match) continue;
    if (Object.hasOwn(fields, match[1])) throw new Error(`Duplicate Linux ${match[1]}`);
    fields[match[1]] = match[2] ?? match[3] ?? match[4];
  }
  if (!/^[a-z][a-z0-9_-]*$/.test(fields.ID ?? '') || !/^\d+(?:\.\d+)*$/.test(fields.VERSION_ID ?? '')) {
    throw new Error('Linux cache requires valid ID and VERSION_ID from /etc/os-release');
  }
  return `${os}-${fields.ID}-${fields.VERSION_ID}-${arch}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const key = cachePlatform({
    os: process.env.RUNNER_OS,
    arch: process.env.RUNNER_ARCH,
    release: process.env.RUNNER_OS === 'Linux' ? fs.readFileSync('/etc/os-release', 'utf8') : null,
  });
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `key=${key}\n`);
  console.log(`Native/browser cache platform: ${key}`);
}
