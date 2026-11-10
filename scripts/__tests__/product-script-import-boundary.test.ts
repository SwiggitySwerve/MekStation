import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as ts from 'typescript';

const root = path.resolve(__dirname, '..', '..');
const config = ts.readConfigFile(
  path.join(root, 'tsconfig.json'),
  ts.sys.readFile,
);
const compilerOptions = ts.convertCompilerOptionsFromJson(
  config.config.compilerOptions,
  root,
).options;
const resolutionCaches = new WeakMap<
  ts.CompilerOptions,
  ts.ModuleResolutionCache
>();

function cachedExists(exists: (file: string) => boolean) {
  const cache = new Map<string, boolean>();
  return (file: string): boolean => {
    const result = cache.get(file) ?? exists(file);
    cache.set(file, result);
    return result;
  };
}

// Resolution probes the same candidate files and parent directories repeatedly.
const resolutionHost: ts.ModuleResolutionHost = {
  ...ts.sys,
  fileExists: cachedExists(ts.sys.fileExists),
  directoryExists: cachedExists(ts.sys.directoryExists),
};

function dependencies(
  file: string,
  options: ts.CompilerOptions,
): { line: number; resolved: string }[] {
  let cache = resolutionCaches.get(options);
  if (!cache) {
    cache = ts.createModuleResolutionCache(
      path.dirname(file),
      (name) => name,
      options,
    );
    resolutionCaches.set(options, cache);
  }
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const imports: { line: number; resolved: string }[] = [];
  function inspect(node: ts.Node): void {
    let specifier: ts.Node | undefined;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      specifier = node.moduleSpecifier;
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      specifier = node.moduleReference.expression;
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    ) {
      specifier = node.arguments[0];
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument)
    ) {
      specifier = node.argument.literal;
    }
    if (
      specifier &&
      (ts.isStringLiteral(specifier) ||
        ts.isNoSubstitutionTemplateLiteral(specifier))
    ) {
      const resolved = ts.resolveModuleName(
        specifier.text,
        file,
        options,
        resolutionHost,
        cache,
      ).resolvedModule?.resolvedFileName;
      if (resolved) {
        const line =
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        imports.push({ line, resolved: path.resolve(resolved) });
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
  return imports;
}

function violations(
  file: string,
  projectRoot: string,
  options: ts.CompilerOptions,
): string[] {
  const scripts = path.join(projectRoot, 'scripts');
  return dependencies(file, options).flatMap(({ line, resolved }) => {
    const relative = path.relative(scripts, resolved);
    return relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
      ? [
          `${path.relative(projectRoot, file)}:${line} -> ${path.relative(projectRoot, resolved)}`,
        ]
      : [];
  });
}

function productFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory())
      return ['__tests__', '__mocks__'].includes(entry.name)
        ? []
        : productFiles(file);
    return /\.[cm]?[jt]sx?$/.test(entry.name) &&
      !/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)
      ? [file]
      : [];
  });
}

describe('product imports stay outside tooling', () => {
  test('every non-test src module resolves imports within the product boundary', () => {
    const declarations = productFiles(path.join(root, 'src')).flatMap((file) =>
      violations(file, root, compilerOptions),
    );
    expect({ count: declarations.length, declarations }).toEqual({
      count: 0,
      declarations: [],
    });
  });

  describe('module syntax fixtures', () => {
    let fixtureRoot: string;
    let file: string;
    let options: ts.CompilerOptions;
    beforeAll(() => {
      fixtureRoot = fs.mkdtempSync(
        path.join(os.tmpdir(), 'mekstation-import-boundary-'),
      );
      fs.mkdirSync(path.join(fixtureRoot, 'scripts'));
      fs.mkdirSync(path.join(fixtureRoot, 'src'));
      fs.writeFileSync(
        path.join(fixtureRoot, 'scripts', 'rule.ts'),
        'export const rule = 1; export type Rule = number;',
      );
      fs.writeFileSync(
        path.join(fixtureRoot, 'src', 'rule.ts'),
        'export const rule = 1;',
      );
      file = path.join(fixtureRoot, 'src', 'consumer.ts');
      options = {
        ...compilerOptions,
        paths: { '@/*': [path.join(fixtureRoot, 'src', '*')] },
      };
    });
    afterAll(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

    test.each([
      "import { rule } from '../scripts/rule';",
      "import '../scripts/rule';",
      "import type { Rule } from '../scripts/rule';",
      "import { type Rule } from '../scripts/rule';",
      "export { rule } from '../scripts/rule';",
      "export * from '../scripts/rule';",
      "export type { Rule } from '../scripts/rule';",
      "export type * from '../scripts/rule';",
      "const rule = require('../scripts/rule');",
      "import rule = require('../scripts/rule');",
      "import type rule = require('../scripts/rule');",
      "const rule = import('../scripts/rule');",
      'const rule = import(`../scripts/rule`);',
      "type Rule = import('../scripts/rule').Rule;",
      "import { rule } from '@/../scripts/rule';",
      "import type { Rule } from '@/../scripts/rule';",
      "export * from '@/../scripts/rule';",
      "const rule = require('@/../scripts/rule');",
      "const rule = import('@/../scripts/rule');",
      "import rule = require('@/../scripts/rule');",
      "type Rule = import('@/../scripts/rule').Rule;",
    ])('rejects %s', (source) => {
      fs.writeFileSync(file, source);
      expect(violations(file, fixtureRoot, options)).toHaveLength(1);
    });

    test('accepts product aliases and ignores comments and ordinary strings', () => {
      fs.writeFileSync(
        file,
        "import { rule } from '@/rule'; // require('../scripts/rule')\nconst text = \"import('../scripts/rule')\";",
      );
      expect(violations(file, fixtureRoot, options)).toEqual([]);
    });
  });
});
