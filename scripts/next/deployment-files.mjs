import fs from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';

import { nativeModules } from '../../desktop/scripts/electron-native-modules.js';

const nativeOutputs = nativeModules.map(({ name, runtimeBinding }) => {
  const file = `node_modules/${name}/${runtimeBinding.replaceAll('\\', '/')}`;
  return { file, root: path.posix.dirname(path.posix.dirname(file)) };
});

// Build traces and development material are inputs to packaging, not runtime
// assets. Keep this list shared by tracing, hydration and Electron packaging.
export const deploymentTraceExcludes = [
  // Never trace a previous desktop build or its caches back into the image.
  './desktop/{dist,release,release-test,.tmp,.electron-cache,.electron-native-cache}{,/**/*}',
  // Hydration owns the complete public copy; avoid tracing it for every route.
  './public/**/*',
  '**/*.nft.json',
  '**/*.map',
  '**/*.d.{ts,mts,cts}',
  './src/docs/*.mdx',
  '**/__tests__/**',
  '**/__mocks__/**',
  '**/*.{test,spec,stories}.{ts,tsx,js,jsx,mjs,cjs}',
  // Retain documentation and notices, which some packages combine.
  '**/node_modules/**/{test,tests,examples}/**',
  // The API uses its platform package binary; this duplicate serves the CLI.
  '**/node_modules/esbuild/bin/esbuild{,.exe}',
  ...nativeModules.flatMap(({ name, buildSources }) =>
    buildSources.map((source) => `**/node_modules/${name}/${source}{,/**}`),
  ),
  ...nativeOutputs.map(({ root }) => `**/${root}/**`),
];

const excluded = picomatch(deploymentTraceExcludes, { dot: true });

/** @param {string} relative */
export function isDeploymentFile(relative) {
  const normalized = relative.replaceAll('\\', '/');
  // Every public file and path must stay byte-identical, including catalogs.
  if (normalized === 'public' || normalized.startsWith('public/')) return true;
  const native = nativeOutputs.find(
    ({ root }) => normalized === root || normalized.startsWith(`${root}/`),
  );
  if (native) {
    // Keep the binding and its parent directories; every other build output
    // (objects, PDBs, intermediate copies) is reconstructed before rebuilding.
    return (
      normalized === native.file || native.file.startsWith(`${normalized}/`)
    );
  }
  return !excluded(normalized) && !excluded(`./${normalized}`);
}

/** Remove non-runtime inputs from an already isolated, physical output tree.
 * @param {string} root
 */
export function pruneDeploymentFiles(root) {
  if (fs.lstatSync(root).isSymbolicLink()) {
    throw new Error(`Deployment root must be a physical directory: ${root}`);
  }
  let removed = 0;
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      // Never follow a link into a checkout, native cache or another image.
      if (entry.isSymbolicLink()) continue;
      if (!isDeploymentFile(path.relative(root, file))) {
        fs.rmSync(file, { recursive: entry.isDirectory(), force: true });
        removed++;
      } else if (entry.isDirectory()) {
        visit(file);
      }
    }
  }
  visit(root);
  return removed;
}
