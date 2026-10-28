import fs from 'node:fs';
import path from 'node:path';

/** Copy a complete tree after the hydration owner validates and clears target. */
export async function copyDirectory(source, target) {
  if (fs.lstatSync(target, { throwIfNoEntry: false })) {
    throw new Error(`Directory copy target must be absent: ${target}`);
  }
  const directories = [];
  const files = [];
  function scan(from, to) {
    const stats = fs.lstatSync(from);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return false;
    directories.push({ target: to, mode: stats.mode & ~process.umask() });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      const input = path.join(from, entry.name);
      const output = path.join(to, entry.name);
      if (entry.isDirectory()) {
        if (!scan(input, output)) return false;
      } else if (entry.isFile()) {
        files.push({ source: input, target: output });
      } else return false;
    }
    return true;
  }
  // Leave link and special-file semantics to the existing copier. The entire
  // scan finishes before writes, so fallback never merges partially copied data.
  if (!scan(source, target)) {
    fs.cpSync(source, target, { recursive: true, force: true });
    return;
  }
  for (const directory of directories)
    fs.mkdirSync(directory.target, { recursive: true });
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
  if (failed) throw failure;
  // Match cpSync's directory creation permissions, including the caller's umask.
  for (const directory of directories.reverse())
    fs.chmodSync(directory.target, directory.mode);
}
