/**
 * Update metadata utilities for hosting electron-updater channel files on a static site (e.g., GitHub Pages),
 * while keeping GitHub Releases "package-only" (no latest*.yml / *.blockmap clutter).
 *
 * This module:
 * - Reads electron-builder-generated channel files (e.g., latest.yml, latest-linux.yml, latest-mac*.yml)
 * - Rewrites update file URLs to absolute GitHub Release download URLs
 * - Writes channel files into an opinionated folder structure for GitHub Pages:
 *   - updates/win/<channel>.yml
 *   - updates/linux/<channel>-linux*.yml
 *   - updates/mac/x64/<channel>-mac.yml
 *   - updates/mac/arm64/<channel>-mac.yml
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {'win'|'linux'|'mac'} PlatformKey
 * @typedef {'x64'|'arm64'} MacArchKey
 */

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readYamlFile(filePath) {
  // `js-yaml` is already present via electron-updater.
  // oxlint-disable-next-line @typescript-eslint/no-var-requires
  const yaml = require('js-yaml');
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

function writeYamlFile(filePath, data) {
  // oxlint-disable-next-line @typescript-eslint/no-var-requires
  const yaml = require('js-yaml');
  const content = yaml.dump(data, { lineWidth: -1, noRefs: true });
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function githubReleaseDownloadBaseUrl(owner, repo, tag) {
  return `https://github.com/${owner}/${repo}/releases/download/${tag}/`;
}

function toGithubDownloadUrl(downloadBaseUrl, fileName) {
  // Preserve file name as a single URL path segment.
  // (electron-builder artifact names should not contain '/', but encode defensively)
  const encoded = encodeURIComponent(fileName).replace(/%2F/g, '/');
  return `${downloadBaseUrl}${encoded}`;
}

function rewriteUpdateInfoUrls(updateInfo, downloadBaseUrl) {
  if (typeof updateInfo !== 'object' || updateInfo === null) {
    throw new Error('Invalid update info: expected an object');
  }

  // files[].url
  if (Array.isArray(updateInfo.files)) {
    updateInfo.files = updateInfo.files.map((f) => {
      if (typeof f !== 'object' || f === null) return f;
      const fileObj = f;
      const urlValue = fileObj.url;
      if (typeof urlValue === 'string' && !/^https?:\/\//i.test(urlValue)) {
        fileObj.url = toGithubDownloadUrl(downloadBaseUrl, urlValue);
      }
      return fileObj;
    });
  }

  // legacy top-level path
  if (
    typeof updateInfo.path === 'string' &&
    !/^https?:\/\//i.test(updateInfo.path)
  ) {
    updateInfo.path = toGithubDownloadUrl(downloadBaseUrl, updateInfo.path);
  }

  // Windows web installer packages (rare, but supported by schema)
  if (typeof updateInfo.packages === 'object' && updateInfo.packages !== null) {
    for (const key of Object.keys(updateInfo.packages)) {
      const pkg = updateInfo.packages[key];
      if (
        typeof pkg === 'object' &&
        pkg !== null &&
        typeof pkg.path === 'string' &&
        !/^https?:\/\//i.test(pkg.path)
      ) {
        pkg.path = toGithubDownloadUrl(downloadBaseUrl, pkg.path);
      }
    }
  }

  return updateInfo;
}

/**
 * Classify an electron-builder channel file into a GitHub Pages destination.
 *
 * @param {string} fileName
 * @returns {null | { platform: PlatformKey, macArch?: MacArchKey, destDirs: string[], destFileName: string }}
 */
function classifyChannelFile(fileName) {
  if (!fileName.endsWith('.yml')) return null;

  // Skip non-channel yaml emitted by electron-builder.
  if (fileName === 'builder-debug.yml') return null;

  // Linux: <channel>-linux(-<arch>)?.yml
  const linuxMatch =
    /^(?<channel>.+)-linux(?<archSuffix>-[a-z0-9]+)?\.yml$/i.exec(fileName);
  if (linuxMatch?.groups?.channel) {
    return {
      platform: 'linux',
      destDirs: ['updates', 'linux'],
      destFileName: fileName,
    };
  }

  // macOS arch-specific: <channel>-mac-(x64|arm64).yml -> store as <channel>-mac.yml in arch dir
  const macArchMatch = /^(?<channel>.+)-mac-(?<arch>x64|arm64)\.yml$/i.exec(
    fileName,
  );
  if (macArchMatch?.groups?.channel && macArchMatch?.groups?.arch) {
    const channel = macArchMatch.groups.channel;
    /** @type {MacArchKey} */
    const arch = macArchMatch.groups.arch === 'arm64' ? 'arm64' : 'x64';
    return {
      platform: 'mac',
      macArch: arch,
      destDirs: ['updates', 'mac', arch],
      destFileName: `${channel}-mac.yml`,
    };
  }

  // macOS universal/default: <channel>-mac.yml -> copy to both arch dirs
  const macMatch = /^(?<channel>.+)-mac\.yml$/i.exec(fileName);
  if (macMatch?.groups?.channel) {
    const channel = macMatch.groups.channel;
    return {
      platform: 'mac',
      destDirs: ['updates', 'mac', 'x64'],
      destFileName: `${channel}-mac.yml`,
      // We'll copy to both x64 and arm64 in prepare step by adding an extra destDir entry.
      // The CLI wrapper will expand this.
    };
  }

  // Windows: <channel>.yml (no platform suffix)
  const winMatch = /^(?<channel>.+)\.yml$/i.exec(fileName);
  if (winMatch?.groups?.channel) {
    return {
      platform: 'win',
      destDirs: ['updates', 'win'],
      destFileName: fileName,
    };
  }

  return null;
}

/**
 * Prepare GitHub Pages update metadata (channel files) from an electron-builder output directory.
 *
 * @param {object} opts
 * @param {string} opts.releaseDir
 * @param {string} opts.outDir
 * @param {string} opts.owner
 * @param {string} opts.repo
 * @param {string} opts.tag
 * @returns {{ writtenFiles: string[] }}
 */
function prepareUpdateMetadata(opts) {
  const { releaseDir, outDir, owner, repo, tag } = opts;
  const downloadBaseUrl = githubReleaseDownloadBaseUrl(owner, repo, tag);

  if (!fs.existsSync(releaseDir)) {
    throw new Error(`Release directory not found: ${releaseDir}`);
  }

  // Clean output directory
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  ensureDir(outDir);

  const entries = fs.readdirSync(releaseDir, { withFileTypes: true });
  const ymlFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.yml'))
    .map((e) => e.name);

  /** @type {string[]} */
  const writtenFiles = [];

  for (const fileName of ymlFiles) {
    const classification = classifyChannelFile(fileName);
    if (!classification) continue;

    const srcPath = path.join(releaseDir, fileName);
    const updateInfo = readYamlFile(srcPath);
    const rewritten = rewriteUpdateInfoUrls(updateInfo, downloadBaseUrl);

    const isMacUniversalChannelFile =
      /-mac\.yml$/i.test(fileName) && !/-mac-(x64|arm64)\.yml$/i.test(fileName);
    if (classification.platform === 'mac' && isMacUniversalChannelFile) {
      // Universal mac channel file case: also copy into arm64 directory.
      const destDirsList = [
        ['updates', 'mac', 'x64'],
        ['updates', 'mac', 'arm64'],
      ];

      for (const destDirs of destDirsList) {
        const destPath = path.join(
          outDir,
          ...destDirs,
          classification.destFileName,
        );
        writeYamlFile(destPath, rewritten);
        writtenFiles.push(destPath);
      }
      continue;
    }

    const destPath = path.join(
      outDir,
      ...classification.destDirs,
      classification.destFileName,
    );
    writeYamlFile(destPath, rewritten);
    writtenFiles.push(destPath);
  }

  // Ensure GitHub Pages does not run Jekyll (so it serves .yml as-is).
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '', 'utf8');

  return { writtenFiles };
}

module.exports = {
  prepareUpdateMetadata,
  githubReleaseDownloadBaseUrl,
};
