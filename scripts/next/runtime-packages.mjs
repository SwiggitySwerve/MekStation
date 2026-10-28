import { build } from 'esbuild';
import fs from 'node:fs';
import { createRequire, isBuiltin } from 'node:module';
import path from 'node:path';

function packageName(request) {
  const name = request.startsWith('@')
    ? request.split('/').slice(0, 2).join('/')
    : request.split('/')[0];
  if (!/^(?:@[\w-]+\/)?[\w-][\w.-]*$/.test(name)) {
    throw new Error(`Invalid runtime package request: ${request}`);
  }
  return name;
}

function isOutside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    path.isAbsolute(relative) ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`)
  );
}

function findPackage(root, name, importer, optional = false) {
  // Resolve the installed directory, not package.json through exports: some
  // packages hide that subpath or expose only conditional/subpath entries.
  const resolver = createRequire(importer);
  for (const directory of resolver.resolve.paths(`${name}/package.json`) ??
    []) {
    // Ancestor and global folders are not part of the image.
    if (isOutside(root, directory)) break;
    const candidate = path.join(directory, name);
    if (!fs.existsSync(path.join(candidate, 'package.json'))) continue;
    if (
      fs.lstatSync(candidate).isSymbolicLink() ||
      isOutside(fs.realpathSync.native(root), fs.realpathSync.native(candidate))
    ) {
      throw new Error(
        `Linked runtime package ${name} is not supported: ${candidate}`,
      );
    }
    return candidate;
  }
  if (optional) return null;
  throw new Error(`Missing runtime package ${name} required by ${importer}`);
}

/** Next copies Turbopack's generated package aliases as checkout links. */
export function collectTurbopackExternals(root, aliasRoot) {
  if (!fs.existsSync(aliasRoot)) return [];
  const packages = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        const source = fs.realpathSync.native(target);
        if (isOutside(path.join(root, 'node_modules'), source)) {
          throw new Error(
            `Turbopack external source is outside installed packages: ${target}`,
          );
        }
        const manifestPath = path.join(source, 'package.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const name = packageName(manifest.name);
        if (
          fs.realpathSync.native(findPackage(root, name, manifestPath)) !==
          source
        ) {
          throw new Error(
            `Turbopack external source does not match installed package ${name}: ${target}`,
          );
        }
        packages.push({
          source,
          target,
          canForwardNativeEntry:
            fs.existsSync(path.join(source, 'binding.gyp')) &&
            manifest.type !== 'module' &&
            !manifest.exports &&
            path.extname(manifest.main ?? 'index.js') !== '.mjs',
        });
      } else if (entry.isDirectory()) {
        visit(target);
      }
    }
  }
  visit(aliasRoot);
  return packages.sort((a, b) => a.target.localeCompare(b.target));
}

/** Discover raw server imports without executing server.js or its TS modules. */
export async function collectRuntimePackages(root, loaders) {
  const server = path.join(root, 'server.js');
  const { metafile } = await build({
    absWorkingDir: root,
    entryPoints: [server],
    bundle: true,
    treeShaking: false,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    metafile: true,
    write: false,
    logLevel: 'silent',
  });
  // Output imports exclude type-only declarations retained in input metadata.
  const requests = new Set([
    ...loaders,
    ...Object.values(metafile.outputs).flatMap((output) =>
      output.imports
        .filter((entry) => entry.external && !isBuiltin(entry.path))
        .map((entry) => entry.path),
    ),
  ]);
  const directories = new Set();
  function visit(name, importer, optional = false) {
    // Next owns its own framework deployment and native dependencies. This
    // supplements the separate raw-TS server graph, not Next's trace.
    if (name === 'next') return;
    const directory = findPackage(root, name, importer, optional);
    if (!directory || directories.has(directory)) return;
    directories.add(directory);
    const manifestPath = path.join(directory, 'package.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const optionalDependencies = manifest.optionalDependencies ?? {};
    for (const dependency of Object.keys({
      ...manifest.dependencies,
      ...optionalDependencies,
      ...manifest.peerDependencies,
    })) {
      packageName(dependency);
      visit(
        dependency,
        manifestPath,
        Object.hasOwn(optionalDependencies, dependency) ||
          (!Object.hasOwn(manifest.dependencies ?? {}, dependency) &&
            manifest.peerDependenciesMeta?.[dependency]?.optional === true),
      );
    }
  }

  for (const loader of loaders) visit(packageName(loader), server);
  for (const [input, metadata] of Object.entries(metafile.inputs)) {
    for (const entry of metadata.imports) {
      if (!entry.external || !requests.has(entry.path)) continue;
      const name = packageName(entry.path);
      visit(name, path.resolve(root, input));
    }
  }
  return {
    requests: [...requests].sort(),
    // Parents first: replacing a package must not erase its nested versions.
    directories: [...directories].sort(
      (a, b) =>
        a.split(path.sep).length - b.split(path.sep).length ||
        a.localeCompare(b),
    ),
  };
}
