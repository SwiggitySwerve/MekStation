import fs from 'node:fs';
import path from 'node:path';

/** Copy a complete tree after the hydration owner validates and clears target. */
export async function copyDirectory(source, target, { filter } = {}) {
  if (fs.lstatSync(target, { throwIfNoEntry: false })) {
    throw new Error(`Directory copy target must be absent: ${target}`);
  }
  const directories = [];
  const files = [];
  function scan(from, to) {
    if (filter && !filter(from, to)) return true;
    const stats = fs.lstatSync(from);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return false;
    directories.push({ target: to, mode: stats.mode });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      const input = path.join(from, entry.name);
      const output = path.join(to, entry.name);
      if (entry.isDirectory()) {
        if (!scan(input, output)) return false;
      } else if (entry.isFile()) {
        if (!filter || filter(input, output)) {
          files.push({ source: input, target: output });
        }
      } else return false;
    }
    return true;
  }
  // Leave link and special-file semantics to the existing copier. The entire
  // scan finishes before writes, so fallback never merges partially copied data.
  if (!scan(source, target)) {
    fs.cpSync(source, target, { recursive: true, force: true, filter });
    return;
  }
  // Node 22's no-filter cpSync uses default mkdir permissions, not source modes.
  for (const { target } of directories)
    fs.mkdirSync(target, { recursive: true });
  let next = 0;
  let failed = false;
  let failure;
  async function worker() {
    while (next < files.length && !failed) {
      const file = files[next++];
      try {
        // Target is fresh: copyFile preserves the source file's permissions.
        await fs.promises.copyFile(file.source, file.target);
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
      }
    }
  }
  // Bound handles and queued I/O; drain every worker before returning an error.
  await Promise.all(
    Array.from({ length: Math.min(8, files.length) }, () => worker()),
  );
  // Node 22's filtered JS copier restores source directory modes after their
  // contents, while its unfiltered native copier keeps default mkdir modes.
  if (filter) {
    for (const { target, mode } of directories.toReversed()) {
      try {
        fs.chmodSync(target, mode);
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
      }
    }
  }
  if (failed) throw failure;
}
