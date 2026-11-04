const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Hash the actual native build inputs, not checkout paths or package versions
// alone. Runner/kernel/libc changes and custom compiler flags invalidate reuse.
/** @param {string} moduleDir @param {readonly string[]} buildSources @param {string} electronVersion @param {object} toolchain */
function nativeBindingCacheKey(
  moduleDir,
  buildSources,
  electronVersion,
  toolchain = {},
) {
  const hash = crypto.createHash('sha256');
  const header = process.report.getReport().header;
  hash.update(
    JSON.stringify({
      format: 1,
      electronVersion,
      nodeVersion: process.versions.node,
      runnerImage: process.env.ImageVersion ?? null,
      toolchain,
      platform: process.platform,
      arch: process.arch,
      kernel: os.release(),
      libc: header.glibcVersionRuntime ?? null,
      flags: Object.fromEntries(
        [
          'CC',
          'CXX',
          'CFLAGS',
          'CXXFLAGS',
          'CPPFLAGS',
          'LDFLAGS',
          'GYP_DEFINES',
          'npm_config_debug',
        ].map((name) => [name, process.env[name] ?? null]),
      ),
    }),
  );
  function visit(relative) {
    const source = path.join(moduleDir, relative);
    const stats = fs.lstatSync(source);
    if (stats.isSymbolicLink()) {
      throw new Error(`Native cache input must not be linked: ${source}`);
    }
    if (stats.isDirectory()) {
      for (const name of fs.readdirSync(source).sort())
        visit(path.join(relative, name));
    } else {
      hash.update(relative.replaceAll(path.sep, '/'));
      hash.update('\0');
      hash.update(fs.readFileSync(source));
      hash.update('\0');
    }
  }
  for (const source of ['package.json', ...buildSources].sort()) visit(source);
  return hash.digest('hex');
}

/** @param {string} cacheDir @param {string} key @param {boolean} create */
function cacheFile(cacheDir, key, create) {
  if (!/^[0-9a-f]{64}$/.test(key)) throw new Error('Invalid native cache key');
  let directory = fs.lstatSync(cacheDir, { throwIfNoEntry: false });
  if (!directory && !create) return null;
  if (!directory) {
    fs.mkdirSync(cacheDir, { recursive: true });
    directory = fs.lstatSync(cacheDir);
  }
  if (!directory.isDirectory() || directory.isSymbolicLink()) {
    throw new Error(`Native cache must be a physical directory: ${cacheDir}`);
  }
  const file = path.join(cacheDir, `${key}.node`);
  const stats = fs.lstatSync(file, { throwIfNoEntry: false });
  if (stats && (!stats.isFile() || stats.isSymbolicLink())) {
    throw new Error(`Native cache entry must be a physical file: ${file}`);
  }
  return file;
}

/** @param {string} cacheDir @param {string} key @param {string} binding */
function restoreNativeBinding(cacheDir, key, binding) {
  const source = cacheFile(cacheDir, key, false);
  if (!source || !fs.existsSync(source)) return false;
  fs.mkdirSync(path.dirname(binding), { recursive: true });
  fs.copyFileSync(source, binding);
  return true;
}

/** @param {string} cacheDir @param {string} key @param {string} binding */
function saveNativeBinding(cacheDir, key, binding) {
  const target = cacheFile(cacheDir, key, true);
  const temporary = `${target}.${process.pid}.tmp`;
  // Exclusive creation also rejects a restored link or stale file at this name.
  const descriptor = fs.openSync(temporary, 'wx');
  try {
    try {
      fs.writeFileSync(descriptor, fs.readFileSync(binding));
    } finally {
      fs.closeSync(descriptor);
    }
    fs.renameSync(temporary, target);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

module.exports = {
  nativeBindingCacheKey,
  restoreNativeBinding,
  saveNativeBinding,
};
