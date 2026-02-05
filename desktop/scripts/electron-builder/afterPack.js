/* oxlint-disable no-console */
/**
 * electron-builder afterPack hook
 *
 * Why:
 * - On Windows CI, copying large extraResources trees can intermittently fail with EBUSY/EPERM
 *   (AV scanning / transient locks). electron-builder's internal copy has no retries.
 *
 * What:
 * - Copy repo-root `public/**` into the packaged app at:
 *     <resourcesDir>/next-standalone/public/**
 * - Do so with retry + backoff on common transient Windows lock errors.
 */

const path = require('path');
const fs = require('fs/promises');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFsError(err) {
  const code = err && err.code ? String(err.code) : '';
  return code === 'EBUSY' || code === 'EPERM' || code === 'EACCES';
}

async function rmWithRetry(
  targetPath,
  { retries = 8, baseDelayMs = 150 } = {},
) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
      return;
    } catch (err) {
      if (!isRetryableFsError(err) || attempt === retries) {
        throw err;
      }
      const delay = baseDelayMs * attempt;
      console.warn(
        `[afterPack] rm failed (${err.code}) attempt ${attempt}/${retries}; retrying in ${delay}ms: ${targetPath}`,
      );
      await sleep(delay);
    }
  }
}

async function cpWithRetry(src, dest, { retries = 8, baseDelayMs = 200 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.cp(src, dest, {
        recursive: true,
        force: true,
        errorOnExist: false,
      });
      return;
    } catch (err) {
      if (!isRetryableFsError(err) || attempt === retries) {
        throw err;
      }
      const delay = baseDelayMs * attempt;
      console.warn(
        `[afterPack] cp failed (${err.code}) attempt ${attempt}/${retries}; retrying in ${delay}ms:\n` +
          `  from=${src}\n` +
          `  to=${dest}`,
      );
      await sleep(delay);
    }
  }
}

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async function afterPack(context) {
  // Prefer electron-builder's projectDir (desktop/). Fall back to this script location.
  const desktopDir =
    context &&
    context.packager &&
    typeof context.packager.projectDir === 'string'
      ? context.packager.projectDir
      : path.resolve(__dirname, '..', '..'); // desktop/scripts/electron-builder -> desktop

  // Repo root is one level up from desktop/
  const repoRootDir = path.resolve(desktopDir, '..');
  const publicSrcDir = path.join(repoRootDir, 'public');

  // Cross-platform resources dir (Windows: <appOutDir>/resources, mac: .../Contents/Resources)
  const resourcesDir = context.packager.getResourcesDir(context.appOutDir);
  const publicDestDir = path.join(resourcesDir, 'next-standalone', 'public');

  console.log(
    `[afterPack] Ensuring Next standalone public assets are packaged`,
  );
  console.log(`[afterPack]   from: ${publicSrcDir}`);
  console.log(`[afterPack]   to:   ${publicDestDir}`);

  // Remove any stale folder (e.g., incremental local builds) before copying.
  await rmWithRetry(publicDestDir);
  await cpWithRetry(publicSrcDir, publicDestDir);

  console.log('[afterPack] Public assets copy complete');
};
