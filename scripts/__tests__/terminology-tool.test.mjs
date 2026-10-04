import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const tempRoot = path.join(repo, '.omo/evidence/terminology-correction/tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const tsx = path.join(repo, 'node_modules/tsx/dist/cli.mjs');
const modern = path.join(repo, 'openspec/scripts/terminology-tool.ts');

function withSpec(content, scenario) {
  const directory = fs.mkdtempSync(path.join(tempRoot, 'term-'));
  const target = path.join(directory, 'openspec/specs/example/spec.md');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  try {
    return scenario(target, directory);
  } finally {
    assert.equal(path.dirname(directory), tempRoot);
    fs.rmSync(directory, { recursive: true });
  }
}

function runModern(target, args = []) {
  return spawnSync(
    process.execPath,
    [tsx, modern, 'validate', '--json', '--strict', ...args, target],
    {
      cwd: repo,
      encoding: 'utf8',
      env: {
        ...process.env,
        TSX_DISABLE_CACHE: '1',
        TMP: tempRoot,
        TEMP: tempRoot,
      },
      timeout: 30000,
    },
  );
}

function output(run) {
  assert.equal(run.error, undefined);
  assert.equal(run.signal, null);
  return JSON.parse(run.stdout);
}

test('prose terminology remains a strict failure', () => {
  withSpec('A heatsink uses a technology base.\n', (target) => {
    const run = runModern(target);
    assert.equal(run.status, 1);
    assert.equal(output(run).totalErrors, 1);
    assert.equal(output(run).totalViolations, 2);
  });
});

test('political factions and existing heat-sink code keys remain accepted', () => {
  withSpec(
    "```typescript\ninterface System {\n  readonly faction: string | null;\n  readonly heatsink: TechBase;\n}\nconst system = {\n  faction: 'Lyran Commonwealth',\n};\nenum Component {\n  HEATSINK = 'heatsink',\n}\n```\n",
    (target) => {
      const run = runModern(target);
      assert.equal(run.status, 0);
      assert.equal(output(run).totalViolations, 0);
    },
  );
});

test('existing typed property rules remain failures', () => {
  withSpec(
    '```typescript\ninterface Equipment {\n  readonly tons: number;\n  readonly mass: number;\n  readonly critSlots: number;\n  readonly introYear: number;\n}\n```\n',
    (target) => {
      const run = runModern(target);
      assert.equal(run.status, 1);
      assert.deepEqual(
        output(run).results[0].violations.map((v) => v.ruleId),
        ['prop-tons', 'prop-mass', 'prop-crit-slots', 'prop-intro-year'],
      );
    },
  );
});

test('fix dry-run preserves exact input bytes and creates no backup', () => {
  withSpec('A heatsink is installed.\n', (target) => {
    const before = fs.readFileSync(target);
    const run = runModern(target, ['--fix', '--dry-run']);
    assert.equal(run.status, 1);
    assert.equal(output(run).totalFixed, 1);
    assert.deepEqual(fs.readFileSync(target), before);
    assert.equal(fs.existsSync(target + '.bak'), false);
  });
});

test('fix applies the classified prose replacement with an exact backup', () => {
  withSpec('A heatsink is installed.\n', (target) => {
    const run = runModern(target, ['--fix']);
    assert.equal(run.status, 1);
    assert.equal(output(run).totalFixed, 1);
    assert.equal(
      fs.readFileSync(target, 'utf8'),
      'A heat sink is installed.\n',
    );
    assert.equal(
      fs.readFileSync(target + '.bak', 'utf8'),
      'A heatsink is installed.\n',
    );
  });
});

const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const core = require('../../openspec/scripts/terminology-tool.core.js');
const { applyFixes } =
  await import('../../openspec/scripts/terminology-tool.fixers.js');
const config = core.loadConfig();
const compatibility = path.join(
  repo,
  'openspec/scripts/validate-terminology.js',
);

function runCompatibility(target, args = []) {
  return spawnSync(
    process.execPath,
    [compatibility, '--json', ...args, target],
    {
      cwd: repo,
      encoding: 'utf8',
      timeout: 30000,
    },
  );
}

test('all six reported political/code examples are accepted by the rule owner', () => {
  const fixtures = [
    "faction: 'Lyran Commonwealth',",
    'readonly faction: string | null;',
    "faction: 'ComStar',",
    "faction: 'Lyran Commonwealth',",
    'readonly heatsink: TechBase;',
    "HEATSINK = 'heatsink',",
  ];
  for (const fixture of fixtures) {
    assert.deepEqual(
      core.detectViolations(
        'example.md',
        '```typescript\n' + fixture + '\n```\n',
        config,
      ),
      [],
    );
  }
});

test('numeric critical-slot counts fail before their owning rename; arrays and canonical counts pass', () => {
  const before = core.detectViolations(
    'example.md',
    '```typescript\n  readonly slots: number;\n```',
    config,
  );
  assert.deepEqual(
    before.map((v) => v.ruleId),
    ['prop-slots-count'],
  );
  assert.equal(before[0].fixable, false);
  for (const field of [
    'readonly criticalSlots: number;',
    'readonly slots: number[];',
    'readonly slots: ICriticalSlot[];',
  ]) {
    assert.deepEqual(
      core.detectViolations(
        'example.md',
        '```typescript\n' + field + '\n```',
        config,
      ),
      [],
    );
  }
});

test('typed technology classification remains an error and cannot auto-rename a source contract', () => {
  const source = '```typescript\nreadonly faction: TechBase;\n```';
  const violations = core.detectViolations('example.md', source, config);
  assert.deepEqual(
    violations.map((v) => v.ruleId),
    ['prop-tech-base-faction'],
  );
  assert.equal(applyFixes(source, violations, config).content, source);
});

test('deprecated comparison examples retain their exclusions and capitalization errors remain', () => {
  assert.deepEqual(
    core.detectViolations(
      'example.md',
      'Deprecated: heatsink\nheatsink ≠ heat sink',
      config,
    ),
    [],
  );
  assert.equal(
    core.detectViolations('example.md', 'A Battlemech.', config)[0].ruleId,
    'battlemech-lower-m',
  );
});

test('both public CLIs agree on the same explicit file and directory scope', () => {
  withSpec('A heatsink is installed.\n', (target) => {
    for (const scope of [target, path.dirname(target)]) {
      const modernRun = spawnSync(
        process.execPath,
        [tsx, modern, 'validate', '--json', '--strict', scope],
        {
          cwd: repo,
          encoding: 'utf8',
          env: { ...process.env, TSX_DISABLE_CACHE: '1' },
        },
      );
      const legacyRun = runCompatibility(scope);
      assert.equal(modernRun.status, 1);
      assert.equal(legacyRun.status, 1);
      assert.deepEqual(output(modernRun), output(legacyRun));
      assert.equal(output(modernRun).filesScanned, 1);
    }
  });
});

test('missing targets and empty explicit inventories refuse in both CLIs', () => {
  withSpec('Valid prose.\n', (target, directory) => {
    const empty = path.join(directory, 'empty');
    fs.mkdirSync(empty);
    for (const scope of [empty, path.join(directory, 'missing')]) {
      for (const run of [runModern(scope), runCompatibility(scope)]) {
        assert.equal(run.status, 1);
        assert.match(run.stderr, /No files found|ENOENT/);
      }
    }
  });
});

test('required unreadable input cannot become a green zero inventory', () => {
  withSpec('Valid prose.\n', (target) => {
    const original = fs.readdirSync;
    fs.readdirSync = (directory, ...args) => {
      if (directory === path.dirname(target))
        throw Object.assign(new Error('Denied fixture directory'), {
          code: 'EACCES',
        });
      return original(directory, ...args);
    };
    try {
      assert.throws(
        () =>
          core.findFiles(path.dirname(target), { canonicalOnly: true }, config),
        /Denied fixture directory/,
      );
    } finally {
      fs.readdirSync = original;
    }
  });
});

test('malformed, incomplete and unsafe configurations refuse in both CLIs', () => {
  withSpec('Valid prose.\n', (target, directory) => {
    const invalid = path.join(directory, 'config.json');
    const nonglobal = structuredClone(config);
    nonglobal.deprecatedTerms[0].flags = 'i';
    const emptyMatch = structuredClone(config);
    emptyMatch.deprecatedTerms[0].pattern = '.*';
    for (const contents of [
      '{',
      '{}',
      JSON.stringify(nonglobal),
      JSON.stringify(emptyMatch),
    ]) {
      fs.writeFileSync(invalid, contents);
      for (const run of [
        runModern(target, ['--config', invalid]),
        runCompatibility(target, ['--config', invalid]),
      ]) {
        assert.equal(run.status, 1);
        assert.match(
          run.stderr,
          /configuration|Configuration|global match|JSON/,
        );
      }
    }
  });
});

test('fixer changes classified prose matches only and preserves political fields and enum keys', () => {
  const content =
    "A heatsink and another heatsink.\n```typescript\n  faction: 'ComStar',\n  HEATSINK = 'heatsink',\n```\n";
  const violations = core.detectViolations('example.md', content, config);
  assert.equal(violations.length, 2);
  const fixed = applyFixes(content, violations, config);
  assert.equal(fixed.fixed, 2);
  assert.equal(
    fixed.content,
    content.replace(
      'A heatsink and another heatsink.',
      'A heat sink and another heat sink.',
    ),
  );
});

test('fix refuses a stale backup instead of overwriting it', () => {
  withSpec('A heatsink.\n', (target) => {
    fs.writeFileSync(target + '.bak', 'pre-existing backup\n');
    const run = runModern(target, ['--fix']);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /EEXIST/);
    assert.equal(
      fs.readFileSync(target + '.bak', 'utf8'),
      'pre-existing backup\n',
    );
    assert.equal(fs.readFileSync(target, 'utf8'), 'A heatsink.\n');
  });
});

test('unknown options and missing configuration arguments refuse', () => {
  withSpec('Valid prose.\n', (target) => {
    for (const run of [
      runModern(target, ['--unknown']),
      runCompatibility(target, ['--unknown']),
    ])
      assert.equal(run.status, 1);
    for (const argv of [
      [tsx, modern, 'validate', '--config'],
      [compatibility, '--config'],
    ]) {
      const run = spawnSync(process.execPath, argv, {
        cwd: repo,
        encoding: 'utf8',
      });
      assert.equal(run.status, 1);
      assert.match(run.stderr, /requires a path/);
    }
  });
});
