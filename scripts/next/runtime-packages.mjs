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

function findPackage(name, importer, optional = false) {
  // Resolve the installed directory, not package.json through exports: some
  // packages hide that subpath or expose only conditional/subpath entries.
  const resolver = createRequire(importer);
  for (const directory of resolver.resolve.paths(`${name}/package.json`) ??
    []) {
    const candidate = path.join(directory, name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
  }
  if (optional) return null;
  throw new Error(`Missing runtime package ${name} required by ${importer}`);
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
    const directory = findPackage(name, importer, optional);
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
      // Next owns its own framework deployment and native dependencies. This
      // supplements the separate raw-TS server graph, not Next's trace.
      if (name !== 'next') visit(name, path.resolve(root, input));
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
