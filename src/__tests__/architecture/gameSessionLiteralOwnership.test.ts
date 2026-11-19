/**
 * Event-log ownership, checked by the type checker (A6, PARITY-PLAN §197).
 *
 * Only the event-log owner may build an IGameSession that sets `events` or
 * `currentState`: createGameSession and hydrateGameSessionFromEvents
 * (gameSessionCore.ts) and appendEvent (gameSessionEvents.ts). A session built
 * anywhere else carries a state no event of its log produced, which an
 * incremental append would persist (D-8). Existing builders are allow-listed
 * by file and enclosing function, each with its reason.
 *
 * Also proves the test-only fault seam (eventLogFault.test-helpers.ts) is
 * imported by no non-test file.
 *
 * Reads src/ only.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const SRC = path.resolve(__dirname, '../..');
const ROOT = path.dirname(SRC);
const TEST_FILE =
  /(?:^|\/)(?:__tests__|__mocks__)\/|\.(?:test|spec|test-helpers)\.[cm]?[jt]sx?$/;
const SESSION_TYPES = 'src/types/gameplay/GameSessionStateTypes.ts';
const LOG_KEYS = new Set(['events', 'currentState']);
const FAULT_SEAM = 'eventLogFault.test-helpers';

/** `<repo-relative file>#<enclosing function>` */
const OWNER = new Set([
  'src/utils/gameplay/gameSessionCore.ts#createGameSession',
  'src/utils/gameplay/gameSessionCore.ts#hydrateGameSessionFromEvents',
  'src/utils/gameplay/gameSessionEvents.ts#appendEvent',
]);

/**
 * Builders outside the owner, by kind (Root, §197 follow-up):
 * - test-or-fixture: permanent; fixtures, stories and harness pages.
 * - production-follow-up: owed fixes; this set may only shrink (see the
 *   PRODUCTION_FOLLOW_UPS check below).
 */
interface IAllowedBuilder {
  readonly kind: 'test-or-fixture' | 'production-follow-up';
  readonly reason: string;
}

const ALLOWED: Readonly<Record<string, IAllowedBuilder>> = {
  'src/__fixtures__/gameplay/demoSession.ts#createDemoSession': {
    kind: 'test-or-fixture',
    reason: 'demo fixture: a hand-built state over a three-event log',
  },
  'src/components/gameplay/CombatPlanningPanel.stories.tsx#createSession': {
    kind: 'test-or-fixture',
    reason: 'Storybook fixture: a hand-built state with an empty log',
  },
  'src/pages/e2e/intel-tier-projection.tsx#buildSyntheticSession': {
    kind: 'test-or-fixture',
    reason: 'E2E harness page: a hand-built state with an empty log',
  },
  'src/testing/tactical-map.combat-scenarios.core.ts#tacticalMapCombatSession':
    {
      kind: 'test-or-fixture',
      reason:
        'tactical-map scenario harness: overlays a hand-built combat state',
    },
  'src/lib/multiplayer/server/MatchSessionProjector.ts#createMatchSessionProjector':
    {
      kind: 'production-follow-up',
      reason:
        'replay projector initial value: a frozen sentinel session with an empty log, replaced by the first applied event',
    },
  'src/simulation/generator/ScenarioGenerator.ts#generate': {
    kind: 'production-follow-up',
    reason: 'simulation scenario: a hand-built initial state with an empty log',
  },
  'src/simulation/snapshot/SnapshotManager.ts#loadSnapshot': {
    kind: 'production-follow-up',
    reason:
      'simulation snapshot load: a hand-built state beside the saved events',
  },
  'src/simulation/runner/SimulationRunner.nativeUnits.ts#tryResolveNativeRunnerHit':
    {
      kind: 'production-follow-up',
      reason:
        'native-unit hit resolution: wraps the runner state and log for one resolver call',
    },
  'src/engine/InteractiveSession.actions.attackProjection.ts#enrichAttackDeclaredEventFromProjection':
    {
      kind: 'production-follow-up',
      reason:
        'rewrites the declaration and refolds with deriveFoldedState (owned); F2 follow-up: build the declaration complete before append',
    },
  'src/lib/p2p/intentTranslationCombatTranslators.ts#translateDeclareAttack': {
    kind: 'production-follow-up',
    reason:
      'appends AttackLocked to the log without folding it; leaves with the build under §193',
  },
  'src/stores/useGameplayStore.actionHandlers.ts#handleUndoAction': {
    kind: 'production-follow-up',
    reason: 'undo: drops the last event and replays to the previous sequence',
  },
};

/**
 * The production-follow-up entries as of A6. Fixing one removes it here and
 * from ALLOWED; adding one is a deliberate edit of this list.
 */
const PRODUCTION_FOLLOW_UPS = [
  'src/engine/InteractiveSession.actions.attackProjection.ts#enrichAttackDeclaredEventFromProjection',
  'src/lib/multiplayer/server/MatchSessionProjector.ts#createMatchSessionProjector',
  'src/lib/p2p/intentTranslationCombatTranslators.ts#translateDeclareAttack',
  'src/simulation/generator/ScenarioGenerator.ts#generate',
  'src/simulation/runner/SimulationRunner.nativeUnits.ts#tryResolveNativeRunnerHit',
  'src/simulation/snapshot/SnapshotManager.ts#loadSnapshot',
  'src/stores/useGameplayStore.actionHandlers.ts#handleUndoAction',
] as const;
const PRODUCTION_FOLLOW_UP_CEILING = 7;

function repoPath(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts'))
      out.push(full);
  }
  return out;
}

function setsLogKey(node: ts.ObjectLiteralExpression): boolean {
  return node.properties.some(
    (property) =>
      property.name !== undefined &&
      ts.isIdentifier(property.name) &&
      LOG_KEYS.has(property.name.text),
  );
}

function enclosingFunctionName(node: ts.Node): string {
  for (let at = node.parent; at; at = at.parent) {
    if ((ts.isFunctionDeclaration(at) || ts.isMethodDeclaration(at)) && at.name)
      return at.name.getText();
    if (
      (ts.isArrowFunction(at) || ts.isFunctionExpression(at)) &&
      (ts.isVariableDeclaration(at.parent) ||
        ts.isPropertyDeclaration(at.parent))
    )
      return at.parent.name.getText();
  }
  return '<module>';
}

interface IScan {
  readonly nonTestFiles: readonly string[];
  readonly hits: ReadonlyMap<string, readonly string[]>;
}

/** Literals typed as (or assignable to) IGameSession that set the log. */
function scanSessionLiterals(): IScan {
  const nonTestFiles = sourceFiles(SRC).filter(
    (file) => !TEST_FILE.test(repoPath(file)),
  );
  const candidates = nonTestFiles.filter((file) => {
    const text = readFileSync(file, 'utf8');
    if (!/\b(?:events|currentState)\b/.test(text)) return false;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest);
    let found = false;
    const visit = (node: ts.Node): void => {
      if (found) return;
      if (ts.isObjectLiteralExpression(node) && setsLogKey(node)) found = true;
      else ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
  });

  const config = ts.readConfigFile(
    path.join(ROOT, 'tsconfig.json'),
    ts.sys.readFile,
  );
  const { options } = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    ROOT,
  );
  const sessionTypesFile = path.join(ROOT, SESSION_TYPES);
  const program = ts.createProgram({
    rootNames: [...candidates, sessionTypesFile],
    options: { ...options, noEmit: true, incremental: false },
  });
  const checker = program.getTypeChecker();
  let sessionType: ts.Type | undefined;
  ts.forEachChild(program.getSourceFile(sessionTypesFile)!, (node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'IGameSession')
      sessionType = checker.getTypeAtLocation(node.name);
  });
  if (!sessionType)
    throw new Error(`IGameSession not found in ${SESSION_TYPES}`);
  const target = sessionType;
  const IGNORED =
    ts.TypeFlags.Any |
    ts.TypeFlags.Unknown |
    ts.TypeFlags.Undefined |
    ts.TypeFlags.Null;
  const isSession = (type: ts.Type | undefined): boolean =>
    type !== undefined &&
    (type.isUnion() ? type.types : [type]).some(
      (part) =>
        (part.flags & IGNORED) === 0 &&
        checker.isTypeAssignableTo(part, target),
    );

  const hits = new Map<string, string[]>();
  for (const file of candidates) {
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`not in the program: ${repoPath(file)}`);
    const visit = (node: ts.Node): void => {
      if (
        ts.isObjectLiteralExpression(node) &&
        setsLogKey(node) &&
        (isSession(checker.getContextualType(node)) ||
          isSession(checker.getTypeAtLocation(node)))
      ) {
        const key = `${repoPath(file)}#${enclosingFunctionName(node)}`;
        const line = source.getLineAndCharacterOfPosition(node.getStart()).line;
        hits.set(key, [
          ...(hits.get(key) ?? []),
          `${repoPath(file)}:${line + 1}`,
        ]);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return { nonTestFiles, hits };
}

describe('IGameSession literal ownership', () => {
  let scan: IScan;

  beforeAll(() => {
    scan = scanSessionLiterals();
  }, 240_000);

  it('builds sessions that set events or currentState only in the owner or an allow-listed function', () => {
    const offenders = [...scan.hits]
      .filter(([key]) => !OWNER.has(key) && !(key in ALLOWED))
      .flatMap(([, lines]) => lines);
    expect(offenders).toEqual([]);
  });

  it('only shrinks the production-follow-up set', () => {
    const production = Object.entries(ALLOWED)
      .filter(([, entry]) => entry.kind === 'production-follow-up')
      .map(([key]) => key)
      .sort();
    expect(production).toEqual([...PRODUCTION_FOLLOW_UPS]);
    expect(production.length).toBeLessThanOrEqual(PRODUCTION_FOLLOW_UP_CEILING);
    for (const entry of Object.values(ALLOWED))
      expect(entry.reason.trim()).not.toBe('');
  });

  it('keeps no stale entry: every owner and allow-listed function still builds one', () => {
    const expected = [...OWNER, ...Object.keys(ALLOWED)].sort();
    expect(expected.filter((key) => !scan.hits.has(key))).toEqual([]);
  });

  it('imports the test-only fault seam from no non-test file', () => {
    expect(scan.nonTestFiles.length).toBeGreaterThan(1000);
    const importers = scan.nonTestFiles
      .filter((file) => readFileSync(file, 'utf8').includes(FAULT_SEAM))
      .map(repoPath);
    expect(importers).toEqual([]);
  });
});
