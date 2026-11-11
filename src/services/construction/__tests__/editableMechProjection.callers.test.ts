/**
 * Structural pin: ONE owner builds `projectEditableMech`'s input.
 *
 * Three hand-built copies of that input (the status bar, PreviewTab, RecordSheetPreview) each dropped
 * what the others passed; PreviewTab omitted `bvContext`, so the printed BV differed from the status
 * bar for 2,609 of 4,263 BattleMechs. This test fails when any non-test source file
 *  - calls `projectEditableMech(...)` with anything but the owner's output, or is an unlisted caller;
 *  - names `IEditableMechProjectionInput` without being the owner, the read-point hooks or the sheet's
 *    unit-state type;
 *  - calls `useUnitEditorRoutingStats(...)` without passing the unit's `bvContext` (or its whole state);
 *  - builds the record-sheet projection from anything but `usePreviewUnitState()`.
 * Every caller is listed with the reason it is allowed. A planted hand-built caller must be caught.
 *
 * @spec openspec/specs/battle-value-system/spec.md
 */
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../../..');

/** Non-test source roots scanned. Tests and fixtures legitimately build inputs by hand. */
const SCAN_ROOTS = ['src', 'scripts', 'e2e'];
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const TEST_FILE =
  /(__tests__|__mocks__|\.test\.|\.spec\.|\.stories\.|test-helpers|\.test-helper)/;
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage']);

const OWNER_FILE = 'src/services/construction/editableMechProjection.ts';

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

/** Files that may name the input type, and why. */
const ALLOWED_INPUT_TYPE_FILES: Record<string, string> = {
  [OWNER_FILE]: 'defines the type and the one owner function',
  'src/hooks/useEditableMechProjectionInput.ts':
    'read-point hooks: they take and return the owner’s type and call the owner; no field list',
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

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** The text of the first argument of each `name(` call, with the call's offset. */
function firstArguments(source: string, name: string): string[] {
  const results: string[] = [];
  const pattern = new RegExp(`(^|[^\\w.$])${name}\\s*\\(`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    // A declaration (`function name(`), not a call.
    if (
      /function\s*\*?\s*$/.test(source.slice(0, match.index + match[1].length))
    )
      continue;
    let depth = 0;
    let i = match.index + match[0].length;
    const start = i;
    for (; i < source.length; i++) {
      const c = source[i];
      if (c === '(' || c === '{' || c === '[') depth++;
      else if (c === ')' || c === '}' || c === ']') {
        if (depth === 0) break;
        depth--;
      } else if (c === ',' && depth === 0) break;
    }
    results.push(source.slice(start, i).trim());
  }
  return results;
}

function isOwnerOutput(argument: string, source: string): boolean {
  if (/^buildEditableMechProjectionInput\s*\(/.test(argument)) return true;
  if (!/^[A-Za-z_$][\w$]*$/.test(argument)) return false;
  const declaration = new RegExp(
    `const\\s+${argument.replace(/\$/g, '\\$')}\\s*=\\s*(?:useStableEditableMechProjectionInput|useEditableMechProjectionInput|buildEditableMechProjectionInput)\\s*\\(`,
  );
  return declaration.test(source);
}

export interface Violation {
  readonly file: string;
  readonly rule: string;
  readonly detail: string;
}

/** Scan non-test sources (relative path -> text). Pure, so a planted caller can be fed to it. */
export function findOwnerViolations(
  files: Record<string, string>,
): Violation[] {
  const violations: Violation[] = [];
  const seenProjectCallers = new Set<string>();
  for (const [file, raw] of Object.entries(files)) {
    if (file === OWNER_FILE) continue;
    const source = stripComments(raw);

    const projectArgs = firstArguments(source, 'projectEditableMech');
    if (projectArgs.length > 0) seenProjectCallers.add(file);
    for (const argument of projectArgs)
      if (!isOwnerOutput(argument, source))
        violations.push({
          file,
          rule: 'projectEditableMech input must be the owner’s output',
          detail: argument.slice(0, 80),
        });
    if (projectArgs.length > 0 && !(file in ALLOWED_PROJECT_CALLERS))
      violations.push({
        file,
        rule: 'unlisted projectEditableMech caller',
        detail: 'add it to the owner or list it with a reason',
      });

    if (
      /\bIEditableMechProjectionInput\b/.test(source) &&
      !(file in ALLOWED_INPUT_TYPE_FILES)
    )
      violations.push({
        file,
        rule: 'only the owner and its read-point hooks name IEditableMechProjectionInput',
        detail: 'a hand-built input',
      });

    for (const argument of firstArguments(
      source,
      'useUnitEditorRoutingStats',
    )) {
      if (
        !/\bbvContext\b/.test(argument) &&
        !/\.\.\.\s*\w*[sS]tate\b/.test(argument)
      )
        violations.push({
          file,
          rule: 'useUnitEditorRoutingStats must receive bvContext or the whole unit state',
          detail: argument.slice(0, 80),
        });
      if (!(file in ALLOWED_STATS_HOOK_CALLERS))
        violations.push({
          file,
          rule: 'unlisted useUnitEditorRoutingStats caller',
          detail: 'list it with a reason',
        });
    }

    for (const argument of firstArguments(
      source,
      'buildBattleMechPreviewProjection',
    )) {
      const ok =
        /^[A-Za-z_$][\w$]*$/.test(argument) &&
        new RegExp(
          `const\\s+${argument}\\s*=\\s*usePreviewUnitState\\s*\\(`,
        ).test(source);
      if (!ok)
        violations.push({
          file,
          rule: 'the record-sheet projection must be built from usePreviewUnitState()',
          detail: argument.slice(0, 80),
        });
      if (
        !(file in ALLOWED_SHEET_PROJECTION_CALLERS) &&
        !file.endsWith('recordSheetPreview.logic.ts')
      )
        violations.push({
          file,
          rule: 'unlisted record-sheet projection caller',
          detail: 'list it with a reason',
        });
    }
  }
  for (const listed of Object.keys(ALLOWED_PROJECT_CALLERS))
    if (!seenProjectCallers.has(listed) && listed in files)
      violations.push({
        file: listed,
        rule: 'listed projectEditableMech caller no longer calls it',
        detail: 'remove the stale entry',
      });
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
        /projectEditableMech|IEditableMechProjectionInput|useUnitEditorRoutingStats|buildBattleMechPreviewProjection/.test(
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
    ])
      expect(Object.keys(sources)).toContain(file);
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
  });

  describe('planted hand-built callers are caught', () => {
    const planted = (file: string, text: string) =>
      findOwnerViolations({ ...sources, [file]: text });
    const rules = (violations: Violation[]) => violations.map((v) => v.rule);

    it('PreviewTab builds the sheet state by hand again', () => {
      const original = sources['src/components/customizer/tabs/PreviewTab.tsx'];
      const handBuilt = original.replace(
        /const previewState = usePreviewUnitState\(\);/,
        'const previewState = useMemo(() => ({ name, chassis, model }), [name]);',
      );
      expect(handBuilt).not.toBe(original);
      expect(
        rules(
          planted('src/components/customizer/tabs/PreviewTab.tsx', handBuilt),
        ),
      ).toContain(
        'the record-sheet projection must be built from usePreviewUnitState()',
      );
    });

    it('the status bar projects an object literal', () => {
      const file = 'src/components/customizer/UnitEditorWithRoutingStats.ts';
      const original = sources[file];
      const handBuilt = original.replace(
        'projectEditableMech(projectionInput, calculations.walkMP',
        'projectEditableMech({ name: unitName, tonnage }, calculations.walkMP',
      );
      expect(handBuilt).not.toBe(original);
      expect(rules(planted(file, handBuilt))).toContain(
        'projectEditableMech input must be the owner’s output',
      );
    });

    it('a new component calls the projection with its own state', () => {
      expect(
        rules(
          planted(
            'src/components/customizer/NewThing.tsx',
            'const mech = projectEditableMech(state, 4);',
          ),
        ),
      ).toEqual(
        expect.arrayContaining([
          'projectEditableMech input must be the owner’s output',
          'unlisted projectEditableMech caller',
        ]),
      );
    });

    it('a new file builds the input type by hand', () => {
      expect(
        rules(
          planted(
            'src/components/customizer/NewThing.tsx',
            'const input: IEditableMechProjectionInput = { name, tonnage } as never;',
          ),
        ),
      ).toContain(
        'only the owner and its read-point hooks name IEditableMechProjectionInput',
      );
    });

    it('a stats-hook caller that drops bvContext', () => {
      expect(
        rules(
          planted(
            'src/components/customizer/tabs/overview/useOverviewBuildSummary.ts',
            'useUnitEditorRoutingStats({ unitName, tonnage, validation });',
          ),
        ),
      ).toContain(
        'useUnitEditorRoutingStats must receive bvContext or the whole unit state',
      );
    });

    it('routes quickGameSavedDesigns around the owner', () => {
      const file = 'src/services/units/quickGameSavedDesigns.ts';
      const handBuilt = sources[file].replace(
        'buildEditableMechProjectionInput(state)',
        'state',
      );
      expect(handBuilt).not.toBe(sources[file]);
      expect(rules(planted(file, handBuilt))).toContain(
        'projectEditableMech input must be the owner’s output',
      );
    });
  });
});
