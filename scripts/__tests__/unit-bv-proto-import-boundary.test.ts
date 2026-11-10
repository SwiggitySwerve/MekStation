import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

const root = path.resolve(__dirname, '..', '..');
const compilerOptions: ts.CompilerOptions = {
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  allowJs: true,
  resolveJsonModule: true,
  paths: { '@/*': [path.join(root, 'src', '*')] },
};

/** Follow local imports and re-exports, including aliases and dynamic imports. */
function importPaths(entry: string): Map<string, readonly string[]> {
  const first = path.join(root, entry);
  const paths = new Map<string, readonly string[]>([[first, [entry]]]);
  for (const [file, chain] of paths) {
    if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
    const imports = ts.preProcessFile(
      fs.readFileSync(file, 'utf8'),
      true,
      true,
    );
    for (const { fileName: specifier } of imports.importedFiles) {
      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) continue;
      const resolved = ts.resolveModuleName(
        specifier,
        file,
        compilerOptions,
        ts.sys,
      ).resolvedModule?.resolvedFileName;
      if (!resolved)
        throw new Error(`Unresolved local import ${specifier} in ${file}`);
      const dependency = path.resolve(resolved);
      if (!paths.has(dependency)) {
        paths.set(dependency, [...chain, path.relative(root, dependency)]);
      }
    }
  }
  return paths;
}

describe('ordinary BV import boundaries', () => {
  test.each([
    'src/utils/construction/protomech/protoMechBVCalculator.ts',
    'src/utils/construction/battleValueCalculations.ts',
    'src/utils/construction/protomech/index.ts',
    'src/utils/construction/protomech/protoMechBV.ts',
    'src/utils/construction/protomech/bvTrace.ts',
  ])('%s cannot reach native one-shot trace data', (entry) => {
    const paths = importPaths(entry);
    const forbidden = [
      'src/utils/construction/equipmentBV/nativeOneShotAmmoMounts.ts',
      'src/utils/construction/protomech/nativeEquipmentIndices.ts',
      'src/utils/construction/protomech/nativeTraceEnrichment.ts',
    ];
    expect(
      forbidden.flatMap((file) => paths.get(path.join(root, file)) ?? []),
    ).toEqual([]);
  });
});
