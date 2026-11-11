/**
 * Structural pin: ONE owner builds `projectEditableMech`'s input.
 *
 * Three hand-built copies of that input (the status bar, PreviewTab, RecordSheetPreview) each dropped
 * what the others passed; PreviewTab omitted `bvContext`, so the printed BV differed from the status
 * bar for 2,609 of 4,263 BattleMechs. Two layers keep that from coming back:
 *
 *  1. Compile time. `projectEditableMech` accepts only the owner's branded `EditableMechProjectionInput`
 *     (the brand symbol is not exported), so no caller can hand-build an input however it imports.
 *     The `@ts-expect-error` lines below are checked by the typecheck: remove the brand and they fail.
 *  2. This test, over the TypeScript AST of every non-test source file, with import aliases and
 *     namespace imports resolved to their module. The brand cannot see what is given to the owner
 *     itself (`buildEditableMechProjectionInput({ ...state, bvContext: undefined })` type-checks), so
 *     the test fails on:
 *       - a `projectEditableMech` caller that is not listed (with a reason), or whose argument is not
 *         the owner's output;
 *       - an object literal (or spread with overrides) given to the owner or its hooks, except the
 *         listed rename;
 *       - a `useUnitEditorRoutingStats` caller that passes neither `bvContext` nor the whole state;
 *       - a record-sheet projection built from anything but `usePreviewUnitState()`;
 *       - a re-export of an owner module (it would hide the callers from this scan);
 *       - the input types named outside the owner, its hooks and the sheet's unit-state type.
 * Planted callers below must be caught.
 *
 * @spec openspec/specs/battle-value-system/spec.md
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { createDefaultUnitState } from '@/stores/unitState';
import { TechBase } from '@/types/enums/TechBase';

import {
  buildEditableMechProjectionInput,
  projectEditableMech,
} from '../editableMechProjection';

const repoRoot = path.resolve(__dirname, '../../../..');

/** Non-test source roots scanned. Tests and fixtures legitimately build inputs by hand. */
const SCAN_ROOTS = ['src', 'scripts', 'e2e'];
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const TEST_FILE =
  /(__tests__|__mocks__|\.test\.|\.spec\.|\.stories\.|test-helpers|\.test-helper)/;
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage']);

const OWNER_FILE = 'src/services/construction/editableMechProjection.ts';
const OWNER_MODULE = 'src/services/construction/editableMechProjection';
const HOOK_MODULE = 'src/hooks/useEditableMechProjectionInput';
const STATS_MODULE = 'src/components/customizer/UnitEditorWithRoutingStats';
const SHEET_LOGIC_MODULE =
  'src/components/customizer/preview/recordSheetPreview.logic';
const SHEET_STATE_MODULE =
  'src/components/customizer/preview/usePreviewUnitState';

/** Exports the scan follows through imports (aliases and namespace members resolve to these). */
const TARGET_EXPORTS: Record<string, readonly string[]> = {
  [OWNER_MODULE]: ['buildEditableMechProjectionInput', 'projectEditableMech'],
  [HOOK_MODULE]: [
    'useEditableMechProjectionInput',
    'useStableEditableMechProjectionInput',
  ],
  [STATS_MODULE]: ['useUnitEditorRoutingStats'],
  [SHEET_LOGIC_MODULE]: ['buildBattleMechPreviewProjection'],
  [SHEET_STATE_MODULE]: ['usePreviewUnitState'],
};

/** The owner and the read-point hooks: whatever they return is the owner's output. */
const OWNER_OUTPUT_CALLS = new Set([
  'buildEditableMechProjectionInput',
  'useEditableMechProjectionInput',
  'useStableEditableMechProjectionInput',
]);

/** Every `projectEditableMech(...)` call site outside tests, with why it may exist. */
const ALLOWED_PROJECT_CALLERS: Record<string, string> = {
  'src/components/customizer/UnitEditorWithRoutingStats.ts':
    'status bar: the input is useStableEditableMechProjectionInput(...) over the hook parameters, i.e. the owner; the hook adds only the walk MP and id "editor"',
  'src/components/customizer/tabs/PreviewTab.builders.ts':
    'record sheet: buildEditableMech passes buildEditableMechProjectionInput(state) over the sheet unit state, i.e. the owner',
  'src/services/units/quickGameSavedDesigns.ts':
    'saved designs: passes buildEditableMechProjectionInput(state) over the full UnitState from mapToUnitState, which always carries bvContext, so saved-design BV already used the source context',
  'src/utils/serialization/CustomUnitSerializer.ts':
    'serializer: reads only criticalSlots from the projection; passes buildEditableMechProjectionInput(state) over the full UnitState',
};

/**
 * Object literals allowed as the argument of the owner or its hooks: a spread of the state plus ONLY
 * the listed override keys. Anything else (a field list, `bvContext: undefined`, ...) fails.
 */
const ALLOWED_OWNER_LITERALS: Record<
  string,
  { readonly overrides: readonly string[]; readonly reason: string }
> = {
  'src/components/customizer/UnitEditorWithRoutingStats.ts': {
    overrides: ['name'],
    reason:
      'the stats hook receives the unit name as unitName; the literal spreads its parameters and renames that one field to the projection input name',
  },
};

/** Files that may name the input types, and why. */
const ALLOWED_INPUT_TYPE_FILES: Record<string, string> = {
  [OWNER_FILE]: 'defines the types and the one owner function',
  'src/hooks/useEditableMechProjectionInput.ts':
    'read-point hooks: they take and return the owner’s types and call the owner; no field list',
  'src/components/customizer/tabs/PreviewTab.builders.ts':
    'PreviewUnitState extends the type (projection input + sheet-only fields); it is never built field by field',
};

/** Production callers of the status-bar stats hook; each must hand over bvContext or the whole state. */
const ALLOWED_STATS_HOOK_CALLERS: Record<string, string> = {
  'src/components/customizer/UnitEditorWithRouting.tsx':
    'the editor passes the unit store fields, including bvContext',
  'src/components/customizer/tabs/overview/useOverviewBuildSummary.ts':
    'the overview passes the unit store fields, including bvContext',
  'scripts/lib/runtime-parity/status-observer.js':
    'the parity observer spreads the whole unit store state',
};

/** Files that project the record sheet; each must take its state from usePreviewUnitState(). */
const ALLOWED_SHEET_PROJECTION_CALLERS: Record<string, string> = {
  'src/components/customizer/tabs/PreviewTab.tsx':
    'Preview tab, PDF and print: usePreviewUnitState()',
  'src/components/customizer/preview/RecordSheetPreview.tsx':
    'canvas without a unitConfig: usePreviewUnitState()',
};

// ---------------------------------------------------------------------------------------------
// AST helpers

const scriptKind = (file: string) =>
  file.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : file.endsWith('.ts')
      ? ts.ScriptKind.TS
      : file.endsWith('.jsx')
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.JS;

/** Module specifier as a repo path without extension or /index, or undefined for a package. */
function resolveSpecifier(fromFile: string, specifier: string) {
  let target: string;
  if (specifier.startsWith('@/')) target = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith('.'))
    target = path.posix.normalize(
      path.posix.join(path.posix.dirname(fromFile), specifier),
    );
  else return undefined;
  return target
    .replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '')
    .replace(/\/index$/, '');
}

interface Target {
  readonly module: string;
  readonly name: string;
}
interface FileFacts {
  readonly source: ts.SourceFile;
  /** local name -> imported/required export of a followed module */
  readonly named: Map<string, Target>;
  /** local name -> followed module (namespace import or `const ns = require(...)`) */
  readonly namespaces: Map<string, string>;
  readonly reexports: string[];
}

const isTargetModule = (module: string | undefined): module is string =>
  module !== undefined && module in TARGET_EXPORTS;

function collectFacts(file: string, text: string): FileFacts {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file),
  );
  const named = new Map<string, Target>();
  const namespaces = new Map<string, string>();
  const reexports: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const module = resolveSpecifier(file, node.moduleSpecifier.text);
      const bindings = node.importClause?.namedBindings;
      if (isTargetModule(module) && bindings) {
        if (ts.isNamespaceImport(bindings))
          namespaces.set(bindings.name.text, module);
        else
          for (const element of bindings.elements)
            named.set(element.name.text, {
              module,
              name: (element.propertyName ?? element.name).text,
            });
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const module = resolveSpecifier(file, node.moduleSpecifier.text);
      if (isTargetModule(module)) reexports.push(module);
    } else if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === 'require' &&
      node.initializer.arguments[0] &&
      ts.isStringLiteral(node.initializer.arguments[0])
    ) {
      const module = resolveSpecifier(file, node.initializer.arguments[0].text);
      if (isTargetModule(module)) {
        if (ts.isIdentifier(node.name)) namespaces.set(node.name.text, module);
        else if (ts.isObjectBindingPattern(node.name))
          for (const element of node.name.elements)
            if (ts.isIdentifier(element.name))
              named.set(element.name.text, {
                module,
                name: (element.propertyName ?? element.name).getText(source),
              });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { source, named, namespaces, reexports };
}

/** Which followed export a call expression calls, through aliases and namespace members. */
function calleeTarget(facts: FileFacts, call: ts.CallExpression) {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return facts.named.get(callee.text);
  if (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression)
  ) {
    const module = facts.namespaces.get(callee.expression.text);
    if (module && TARGET_EXPORTS[module].includes(callee.name.text))
      return { module, name: callee.name.text } as Target;
  }
  return undefined;
}

function calls(facts: FileFacts, names: ReadonlySet<string> | string) {
  const wanted = typeof names === 'string' ? new Set([names]) : names;
  const found: { call: ts.CallExpression; target: Target }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const target = calleeTarget(facts, node);
      if (target && wanted.has(target.name)) found.push({ call: node, target });
    }
    ts.forEachChild(node, visit);
  };
  visit(facts.source);
  return found;
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current)
  )
    current = current.expression;
  return current;
}

/** Is this expression the owner's output: a call of the owner or a read-point hook, or a const bound to one. */
function isOwnerOutput(
  facts: FileFacts,
  expression: ts.Expression | undefined,
): boolean {
  if (!expression) return false;
  const value = unwrap(expression);
  if (ts.isCallExpression(value)) {
    const target = calleeTarget(facts, value);
    return Boolean(target && OWNER_OUTPUT_CALLS.has(target.name));
  }
  if (ts.isIdentifier(value)) {
    const initializers: (ts.Expression | undefined)[] = [];
    const visit = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === value.text
      )
        initializers.push(node.initializer);
      ts.forEachChild(node, visit);
    };
    visit(facts.source);
    return (
      initializers.length > 0 &&
      initializers.every((initializer) => isOwnerOutput(facts, initializer))
    );
  }
  return false;
}

/** Is this expression a `const` bound to a call of the given followed export? */
function isBoundToCallOf(
  facts: FileFacts,
  expression: ts.Expression | undefined,
  exportName: string,
): boolean {
  if (!expression) return false;
  const value = unwrap(expression);
  if (!ts.isIdentifier(value)) return false;
  let bound = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === value.text &&
      node.initializer &&
      ts.isCallExpression(unwrap(node.initializer))
    ) {
      const target = calleeTarget(
        facts,
        unwrap(node.initializer) as ts.CallExpression,
      );
      if (target?.name === exportName) bound = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(facts.source);
  return bound;
}

/** The owner's argument must be a reference or a call result; a literal only as the listed rename. */
function argumentProblem(
  file: string,
  facts: FileFacts,
  argument: ts.Expression | undefined,
): string | undefined {
  if (!argument) return 'no argument';
  const value = unwrap(argument);
  if (ts.isObjectLiteralExpression(value)) {
    const allowed = ALLOWED_OWNER_LITERALS[file];
    const problems: string[] = [];
    for (const property of value.properties) {
      if (ts.isSpreadAssignment(property)) {
        const spread = unwrap(property.expression);
        if (!ts.isIdentifier(spread) && !ts.isPropertyAccessExpression(spread))
          problems.push(`spread of ${spread.getText(facts.source)}`);
      } else {
        const key = property.name?.getText(facts.source) ?? '?';
        if (!allowed?.overrides.includes(key)) problems.push(`override ${key}`);
      }
    }
    return problems.length
      ? `object literal with ${problems.join(', ')}`
      : undefined;
  }
  if (
    ts.isIdentifier(value) ||
    ts.isPropertyAccessExpression(value) ||
    ts.isElementAccessExpression(value) ||
    ts.isCallExpression(value) ||
    value.kind === ts.SyntaxKind.ThisKeyword
  )
    return undefined;
  return `unexpected ${ts.SyntaxKind[value.kind]}`;
}

const statsArgumentOk = (
  facts: FileFacts,
  argument: ts.Expression | undefined,
) => {
  if (!argument) return false;
  const value = unwrap(argument);
  if (!ts.isObjectLiteralExpression(value)) return false;
  return value.properties.some(
    (property) =>
      (ts.isShorthandPropertyAssignment(property) &&
        property.name.text === 'bvContext') ||
      (ts.isPropertyAssignment(property) &&
        property.name.getText(facts.source) === 'bvContext') ||
      (ts.isSpreadAssignment(property) &&
        /state/i.test(property.expression.getText(facts.source))),
  );
};

// ---------------------------------------------------------------------------------------------
// The scan

export interface Violation {
  readonly file: string;
  readonly rule: string;
  readonly detail: string;
}

const RULE = {
  projectArgument: 'projectEditableMech input must be the owner’s output',
  projectCaller: 'unlisted projectEditableMech caller',
  ownerArgument:
    'the owner and its hooks take a reference or call result, never a literal or spread with overrides',
  typeName:
    'only the owner and its read-point hooks name the projection input types',
  statsHook:
    'useUnitEditorRoutingStats must receive bvContext or the whole unit state',
  statsCaller: 'unlisted useUnitEditorRoutingStats caller',
  sheetState:
    'the record-sheet projection must be built from usePreviewUnitState()',
  sheetCaller: 'unlisted record-sheet projection caller',
  reexport:
    'an owner module must not be re-exported (it hides callers from this scan)',
  stale: 'listed projectEditableMech caller no longer calls it',
} as const;

/** Scan non-test sources (relative path -> text). Pure, so a planted caller can be fed to it. */
export function findOwnerViolations(
  files: Record<string, string>,
): Violation[] {
  const violations: Violation[] = [];
  const add = (file: string, rule: string, detail: string) =>
    violations.push({ file, rule, detail: detail.slice(0, 100) });
  const seenProjectCallers = new Set<string>();

  for (const [file, text] of Object.entries(files)) {
    if (file === OWNER_FILE) continue;
    const facts = collectFacts(file, text);
    const where = (node: ts.Node) =>
      `${facts.source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${node
        .getText(facts.source)
        .replace(/\s+/g, ' ')}`;

    for (const module of facts.reexports) add(file, RULE.reexport, module);

    for (const { call } of calls(facts, 'projectEditableMech')) {
      seenProjectCallers.add(file);
      const argument = call.arguments[0];
      if (!isOwnerOutput(facts, argument))
        add(file, RULE.projectArgument, where(call));
      if (!(file in ALLOWED_PROJECT_CALLERS))
        add(file, RULE.projectCaller, where(call));
    }

    for (const { call, target } of calls(facts, OWNER_OUTPUT_CALLS)) {
      // The store hook takes no argument: it reads the unit store.
      if (target.name === 'useEditableMechProjectionInput') continue;
      const problem = argumentProblem(file, facts, call.arguments[0]);
      if (problem)
        add(file, RULE.ownerArgument, `${problem} in ${where(call)}`);
    }

    for (const { call } of calls(facts, 'useUnitEditorRoutingStats')) {
      if (!statsArgumentOk(facts, call.arguments[0]))
        add(file, RULE.statsHook, where(call));
      if (!(file in ALLOWED_STATS_HOOK_CALLERS))
        add(file, RULE.statsCaller, where(call));
    }

    for (const { call } of calls(facts, 'buildBattleMechPreviewProjection')) {
      if (!isBoundToCallOf(facts, call.arguments[0], 'usePreviewUnitState'))
        add(file, RULE.sheetState, where(call));
      if (!(file in ALLOWED_SHEET_PROJECTION_CALLERS))
        add(file, RULE.sheetCaller, where(call));
    }

    if (
      /\b(?:I)?EditableMechProjectionInput\b/.test(text) &&
      !(file in ALLOWED_INPUT_TYPE_FILES)
    )
      add(file, RULE.typeName, 'names a projection input type');
  }

  for (const listed of Object.keys(ALLOWED_PROJECT_CALLERS))
    if (!seenProjectCallers.has(listed) && listed in files)
      add(listed, RULE.stale, 'remove the stale entry');
  return violations;
}

function collectSources(): Record<string, string> {
  const files: Record<string, string> = {};
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(path.join(directory, entry.name));
        continue;
      }
      const absolute = path.join(directory, entry.name);
      const relative = path
        .relative(repoRoot, absolute)
        .split(path.sep)
        .join('/');
      if (!SOURCE_EXT.test(entry.name) || TEST_FILE.test(relative)) continue;
      const text = fs.readFileSync(absolute, 'utf8');
      if (
        /projectEditableMech|EditableMechProjectionInput|useUnitEditorRoutingStats|buildBattleMechPreviewProjection|useEditableMechProjectionInput|useStableEditableMechProjectionInput|usePreviewUnitState|editableMechProjection|recordSheetPreview\.logic|UnitEditorWithRoutingStats/.test(
          text,
        )
      )
        files[relative] = text;
    }
  };
  for (const root of SCAN_ROOTS) {
    const absolute = path.join(repoRoot, root);
    if (fs.existsSync(absolute)) visit(absolute);
  }
  return files;
}

describe('one owner of projectEditableMech’s input', () => {
  const sources = collectSources();

  it('finds no violation in the real tree', () => {
    expect(findOwnerViolations(sources)).toEqual([]);
  });

  it('sees every listed caller in the tree (the scan is not vacuous)', () => {
    for (const file of [
      ...Object.keys(ALLOWED_PROJECT_CALLERS),
      ...Object.keys(ALLOWED_STATS_HOOK_CALLERS),
      ...Object.keys(ALLOWED_SHEET_PROJECTION_CALLERS),
      ...Object.keys(ALLOWED_OWNER_LITERALS),
    ])
      expect(Object.keys(sources)).toContain(file);
  });

  it('resolves the real tree’s calls to the followed exports', () => {
    const resolved = (file: string, name: string) =>
      calls(collectFacts(file, sources[file]), name).length;
    expect(
      resolved(
        'src/services/units/quickGameSavedDesigns.ts',
        'projectEditableMech',
      ),
    ).toBe(1);
    expect(
      resolved(
        'src/components/customizer/tabs/PreviewTab.tsx',
        'buildBattleMechPreviewProjection',
      ),
    ).toBe(1);
    expect(
      resolved(
        'scripts/lib/runtime-parity/status-observer.js',
        'useUnitEditorRoutingStats',
      ),
    ).toBe(1);
  });

  it('lists a written reason for every allowed caller', () => {
    for (const table of [
      ALLOWED_PROJECT_CALLERS,
      ALLOWED_INPUT_TYPE_FILES,
      ALLOWED_STATS_HOOK_CALLERS,
      ALLOWED_SHEET_PROJECTION_CALLERS,
    ])
      for (const reason of Object.values(table))
        expect(reason.length).toBeGreaterThan(20);
    for (const { reason } of Object.values(ALLOWED_OWNER_LITERALS))
      expect(reason.length).toBeGreaterThan(20);
  });

  describe('planted hand-built callers are caught', () => {
    const planted = (file: string, text: string) =>
      findOwnerViolations({ ...sources, [file]: text });
    const rules = (violations: Violation[]) => violations.map((v) => v.rule);
    const replaced = (file: string, from: string, to: string) => {
      const next = sources[file].replace(from, to);
      expect(next).not.toBe(sources[file]);
      return planted(file, next);
    };

    it('PreviewTab builds the sheet state by hand again', () => {
      expect(
        rules(
          replaced(
            'src/components/customizer/tabs/PreviewTab.tsx',
            'const previewState = usePreviewUnitState();',
            'const previewState = useMemo(() => ({ name, chassis, model }), [name]);',
          ),
        ),
      ).toContain(RULE.sheetState);
    });

    it('the status bar projects an object literal', () => {
      expect(
        rules(
          replaced(
            'src/components/customizer/UnitEditorWithRoutingStats.ts',
            'projectEditableMech(projectionInput, calculations.walkMP',
            'projectEditableMech({ name: unitName, tonnage }, calculations.walkMP',
          ),
        ),
      ).toContain(RULE.projectArgument);
    });

    it('a direct projectEditableMech({...literal}) in an allowed file', () => {
      expect(
        rules(
          replaced(
            'src/services/units/quickGameSavedDesigns.ts',
            'buildEditableMechProjectionInput(state),',
            '{ name: state.name, chassis: state.chassis } as never,',
          ),
        ),
      ).toContain(RULE.projectArgument);
    });

    it('an aliased import of projectEditableMech', () => {
      const found = planted(
        'src/components/customizer/NewThing.tsx',
        `import { projectEditableMech as p } from '@/services/construction/editableMechProjection';
         export const mech = p({ name: 'x' } as never, 4);`,
      );
      expect(rules(found)).toEqual(
        expect.arrayContaining([RULE.projectArgument, RULE.projectCaller]),
      );
    });

    it('a namespace call of projectEditableMech', () => {
      const found = planted(
        'src/components/customizer/NewThing.tsx',
        `import * as m from '../../services/construction/editableMechProjection';
         export const mech = m.projectEditableMech(state, 4);`,
      );
      expect(rules(found)).toEqual(
        expect.arrayContaining([RULE.projectArgument, RULE.projectCaller]),
      );
    });

    it('a require()d projectEditableMech in a script', () => {
      const found = planted(
        'scripts/new-thing.js',
        `const { projectEditableMech: project } = require('../src/services/construction/editableMechProjection');
         project(state, 4);`,
      );
      expect(rules(found)).toContain(RULE.projectCaller);
    });

    it('a spread override that drops bvContext, given to the owner in an allowed file', () => {
      expect(
        rules(
          replaced(
            'src/services/units/quickGameSavedDesigns.ts',
            'buildEditableMechProjectionInput(state),',
            'buildEditableMechProjectionInput({ ...state, bvContext: undefined }),',
          ),
        ),
      ).toContain(RULE.ownerArgument);
    });

    it('a spread override given to the owner through an alias', () => {
      expect(
        rules(
          planted(
            'src/components/customizer/NewThing.tsx',
            `import { buildEditableMechProjectionInput as pick } from '@/services/construction/editableMechProjection';
             export const input = pick({ ...state, bvContext: undefined });`,
          ),
        ),
      ).toContain(RULE.ownerArgument);
    });

    it('the stats hook’s literal gaining an override beyond the listed rename', () => {
      expect(
        rules(
          replaced(
            'src/components/customizer/UnitEditorWithRoutingStats.ts',
            'name: unitName,',
            'name: unitName, bvContext: undefined,',
          ),
        ),
      ).toContain(RULE.ownerArgument);
    });

    it('a new file builds the input type by hand', () => {
      expect(
        rules(
          planted(
            'src/components/customizer/NewThing.tsx',
            'const input: IEditableMechProjectionInput = { name, tonnage } as never;',
          ),
        ),
      ).toContain(RULE.typeName);
    });

    it('a stats-hook caller that drops bvContext', () => {
      expect(
        rules(
          planted(
            'src/components/customizer/tabs/overview/useOverviewBuildSummary.ts',
            `import { useUnitEditorRoutingStats } from '../../UnitEditorWithRoutingStats';
             useUnitEditorRoutingStats({ unitName, tonnage, validation });`,
          ),
        ),
      ).toContain(RULE.statsHook);
    });

    it('a re-export of an owner module', () => {
      expect(
        rules(
          planted(
            'src/services/construction/barrel.ts',
            `export { projectEditableMech } from './editableMechProjection';`,
          ),
        ),
      ).toContain(RULE.reexport);
    });
  });
});

describe('the compile-time brand (checked by the typecheck, not at run time)', () => {
  it('projectEditableMech accepts only the owner’s output', () => {
    const state = createDefaultUnitState({
      id: '12db40bc-1d71-428a-8834-7137a2209afe',
      name: 'Brand Fixture',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    });
    const partial = { name: 'x', chassis: 'x', model: 'x', tonnage: 20 };
    // Never called: the two lines below exist to be type-checked. If the brand is removed, each
    // directive turns into an unused one and the typecheck fails. Each call stays on one line so the
    // error lands on the line the directive covers.
    const handBuilt = () => {
      // @ts-expect-error a hand-built object is not the owner's input
      projectEditableMech(partial, 4);
      // @ts-expect-error a raw unit state is not the owner's input
      projectEditableMech(state, 4);
    };
    expect(typeof handBuilt).toBe('function');
    expect(() =>
      projectEditableMech(buildEditableMechProjectionInput(state), 4),
    ).not.toThrow();
  });
});
