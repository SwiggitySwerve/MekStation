import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  GATES,
  decide,
  dataSpecsForDiff,
  detect,
  importClosure,
  referencedFiles,
} from './ci-changes.mjs';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const allTrue = Object.fromEntries(GATES.map((gate) => [gate, true]));

test('no unit diff produces no data-keyed specs', () => {
  assert.deepEqual(dataSpecsForDiff(root, 'HEAD', 'HEAD'), []);
});

test('non-pull-request events check everything', () => {
  for (const event of ['push', 'schedule', 'workflow_dispatch']) {
    const { gates } = detect(root, { GITHUB_EVENT_NAME: event });
    assert.deepEqual(gates, allTrue, event);
  }
});

test('an unreadable diff fails open', () => {
  const { gates, reason } = detect(
    root,
    { GITHUB_EVENT_NAME: 'pull_request' },
    'refs/heads/no-such-ref-for-ci-changes',
    'HEAD',
  );
  assert.deepEqual(gates, allTrue);
  assert.match(reason, /failing open/);
});

test('dependency, compiler, test-config and CI changes turn every gate on', () => {
  for (const file of [
    'package-lock.json',
    'desktop/package.json',
    'tsconfig.json',
    'jest.config.js',
    'jest.setup.ts',
    'next.config.ts',
    '.github/workflows/pr-checks.yml',
    '.github/actions/setup-node-and-install/action.yml',
    'scripts/ci/ci-changes.mjs',
  ]) {
    assert.deepEqual(decide(root, [file]).gates, allTrue, file);
  }
});

test('documentation and OpenSpec changes skip every code gate', () => {
  const { gates } = decide(root, [
    'docs/readme.md',
    'openspec/specs/x/spec.md',
  ]);
  assert.equal(gates.code, false);
  assert.equal(gates.e2e, false);
  assert.equal(gates.desktop, false);
  assert.equal(gates.equipment, false);
  assert.equal(gates.storybook, false);
  // Validate Combat Suite reads openspec specs/changes (next test).
  assert.equal(decide(root, ['docs/readme.md']).gates.combat, false);
});

test('an OpenSpec-only change to the combat spec runs Validate Combat Suite', () => {
  const { gates } = decide(root, ['openspec/specs/combat-resolution/spec.md']);
  assert.equal(gates.code, false);
  assert.equal(gates.combat, true);
});

test('files a combat catalog cites by path run Validate Combat Suite', () => {
  // combatValidationCatalog.test-helpers reads these to check line anchors.
  for (const file of [
    'src/components/gameplay/PhysicalAttackPanel.tsx',
    'src/lib/spa/designation/getDesignationOptions.ts',
  ]) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
    assert.equal(decide(root, [file]).gates.combat, true, file);
  }
});

test('deleting a file a check imports or cites still runs the check', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-changes-del-'));
  try {
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    // The importer still names './gone' and cites 'src/cited.ts#L3', but
    // this change deleted both files.
    fs.writeFileSync(
      path.join(dir, 'src', 'entry.test.ts'),
      "import { x } from './gone';\nimport { y } from './esm-gone.js';\nconst ref = 'src/cited.ts#L3';\n",
    );
    const closure = importClosure(dir, ['src/entry.test.ts']);
    assert.ok(closure.has('src/gone.ts'));
    assert.ok(closure.has('src/gone/index.tsx'));
    // A '.js' specifier naming a deleted TypeScript source.
    assert.ok(closure.has('src/esm-gone.ts'));
    assert.ok(referencedFiles(dir, ['src/entry.test.ts']).has('src/cited.ts'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('e2e-only changes run the browser gates but no code gate', () => {
  const { gates } = decide(root, ['e2e/customizer.spec.ts']);
  assert.equal(gates.e2e, true);
  assert.equal(gates.code, false);
  assert.equal(gates.storybook, false);
});

test('a source file no check imports runs code but no closure gate', () => {
  const { gates } = decide(root, ['src/not-imported-by-any-check.ts']);
  assert.equal(gates.code, true);
  assert.equal(gates.equipment, false);
  assert.equal(gates.combat, false);
  assert.equal(gates.storybook, false);
});

test('a file in a check import closure turns that check on', () => {
  // The equipment guard loads EquipmentRegistry through tsx by path string.
  const equipment = decide(root, [
    'src/services/equipment/EquipmentRegistry.ts',
  ]);
  assert.equal(equipment.gates.equipment, true);

  const combat = decide(root, ['src/utils/gameplay/heat.ts']);
  assert.equal(combat.gates.combat, true);

  const story = fs
    .readdirSync(path.join(root, 'src/components/ui'))
    .find((name) => name.endsWith('.stories.tsx'));
  assert.ok(story, 'expected a story under src/components/ui');
  const storybook = decide(root, [`src/components/ui/${story}`]);
  assert.equal(storybook.gates.storybook, true);
});

test('runtime data inputs turn their checks on', () => {
  const units = decide(root, ['public/data/units/battlemechs/x.json']);
  assert.equal(units.gates.equipment, true);
  assert.equal(units.gates.combat, true);
  // Storybook copies all of public/, including data; copying is a build input.
  assert.equal(units.gates.storybook, true);

  const spec = decide(root, ['src/simulation/runner/__tests__/new.test.ts']);
  assert.equal(spec.gates.combat, true);
  const newStory = decide(root, ['src/components/x/New.stories.tsx']);
  assert.equal(newStory.gates.storybook, true);
});

test('desktop changes run the desktop gate', () => {
  assert.equal(decide(root, ['desktop/src/main.ts']).gates.desktop, true);
  assert.equal(decide(root, ['src/utils/uuid.ts']).gates.desktop, false);
});

test('importClosure follows aliases, relative paths, mocks and side-effect imports', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-changes-'));
  try {
    const write = (file, text) => {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), text);
    };
    write(
      'entry.test.ts',
      [
        "import { a } from '@/lib/a';",
        'import type {',
        '  B,',
        "} from './b';",
        "import './styles.css';",
        "jest.mock('@/lib/mocked');",
        "const lazy = () => import('./lazy');",
        "export * from './reexport.js';",
        "import 'react';",
      ].join('\n'),
    );
    write('src/lib/a.ts', "import { c } from './c';\n");
    write('src/lib/c/index.ts', 'export const c = 1;\n');
    write('src/lib/mocked.tsx', 'export {};\n');
    write('b.ts', 'export type B = 1;\n');
    write('styles.css', 'body {}\n');
    write('lazy.ts', 'export {};\n');
    write('reexport.ts', 'export {};\n');
    write('unrelated.ts', 'export {};\n');

    const closure = importClosure(dir, ['entry.test.ts']);
    assert.deepEqual([...closure].sort(), [
      'b.ts',
      'entry.test.ts',
      'lazy.ts',
      'reexport.ts',
      'src/lib/a.ts',
      'src/lib/c/index.ts',
      'src/lib/mocked.tsx',
      'styles.css',
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('catalog and converter changes run the corpus suites', () => {
  assert.equal(
    decide(root, ['public/data/units/battlemechs/x.json']).gates.corpus,
    true,
  );
  assert.equal(
    decide(root, ['src/utils/construction/battleValueEquipment.ts']).gates
      .corpus,
    true,
  );
  assert.equal(
    decide(root, ['src/not-imported-by-any-check.ts']).gates.corpus,
    false,
  );
});

test('roadmap tooling and openspec changes run the roadmap suites, even without code', () => {
  assert.equal(decide(root, ['openspec/specs/x/spec.md']).gates.roadmap, true);
  assert.equal(
    decide(root, ['scripts/qc/roadmap-loop-proof.mjs']).gates.roadmap,
    true,
  );
  assert.equal(decide(root, ['docs/readme.md']).gates.roadmap, false);
});

test('a snapshot-only change runs the suite that owns the snapshot', () => {
  const snap =
    'src/__tests__/service/printing/__snapshots__/catalogRecordSheets.battlemechs.1.test.ts.snap';
  assert.ok(fs.existsSync(path.join(root, snap)));
  assert.equal(decide(root, [snap]).gates.corpus, true);
});
