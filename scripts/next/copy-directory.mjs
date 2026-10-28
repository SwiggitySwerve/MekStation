import fs from 'node:fs';

/** Copy a complete tree after the hydration owner validates and clears target. */
export async function copyDirectory(source, target) {
  fs.cpSync(source, target, { recursive: true, force: true });
}
