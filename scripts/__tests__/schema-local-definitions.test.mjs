import { jsonSchemaToZod } from 'json-schema-to-zod';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { require as tsxRequire } from 'tsx/cjs/api';
import { z } from 'zod';

import { prepareSchemaDefinitions } from '../schema-local-definitions.mjs';

test('enum-keyed optional records preserve omissions and reject unknown keys and values', () => {
  const input = {
    $defs: {
      Location: { type: 'string', enum: ['HEAD', 'LEFT_ARM'] },
      Structure: { type: 'string', enum: ['STANDARD', 'ENDO_STEEL_CLAN'] },
    },
    type: 'object',
    properties: {
      donors: {
        type: 'object',
        propertyNames: { $ref: '#/$defs/Location' },
        additionalProperties: { $ref: '#/$defs/Structure' },
      },
    },
  };
  const prepared = prepareSchemaDefinitions(input);
  const code = jsonSchemaToZod(prepared.schema, {
    parserOverride: prepared.parserOverride,
  });
  const contract = new Function(
    'z',
    `${prepared.declarations}; return ${code}`,
  )(z);
  assert.deepEqual(contract.parse({}), {});
  assert.deepEqual(contract.parse({ donors: {} }), { donors: {} });
  assert.deepEqual(
    contract.parse({ donors: { LEFT_ARM: 'ENDO_STEEL_CLAN' } }),
    { donors: { LEFT_ARM: 'ENDO_STEEL_CLAN' } },
  );
  assert.equal(
    contract.safeParse({ donors: { WRONG: 'STANDARD' } }).success,
    false,
  );
  assert.equal(
    contract.safeParse({ donors: { HEAD: 'UNKNOWN' } }).success,
    false,
  );
});

test('local enum references resolve and generate one reusable declaration', () => {
  const input = {
    $defs: { Armor: { type: 'string', enum: ['STANDARD'] } },
    type: 'object',
    properties: {
      armor: { $ref: '#/$defs/Armor' },
      other: { $ref: '#/$defs/Armor' },
    },
  };
  const result = prepareSchemaDefinitions(input);
  assert.deepEqual(result.schema.properties.armor, input.$defs.Armor);
  assert.deepEqual(input.properties.armor, { $ref: '#/$defs/Armor' });
  assert.equal((result.declarations.match(/STANDARD/g) ?? []).length, 1);
  assert.equal(
    (
      jsonSchemaToZod(result.schema, {
        parserOverride: result.parserOverride,
      }).match(/SchemaDef_Armor/g) ?? []
    ).length,
    2,
  );
});

test('unhandled references and definitions fail closed', () => {
  for (const input of [
    { $ref: 'external.json' },
    { $ref: '#/$defs/Missing' },
    { $defs: { A: { enum: [1] } } },
    { $defs: { A: { type: 'string' } } },
    // A non-string type would be dropped by the Zod literal while JSON Schema keeps it (#2458 review).
    { $defs: { A: { type: 'number', enum: ['STANDARD'] } } },
    { $defs: { A: { type: ['string', 'null'], enum: ['STANDARD'] } } },
    {
      $defs: { A: { enum: ['x'] } },
      $ref: '#/$defs/A',
      description: 'sibling constraint',
    },
  ])
    assert.throws(() => prepareSchemaDefinitions(input), /Unsupported/);
});

test('a negated local definition generates unknown, not any', () => {
  // z.any() in an intersected branch widens the inferred unitType to any, so
  // family narrowing (Extract on unitType) stops excluding that branch.
  const input = {
    $defs: { Capital: { type: 'string', enum: ['DropShip'] } },
    type: 'object',
    properties: { unitType: { not: { $ref: '#/$defs/Capital' } } },
  };
  const prepared = prepareSchemaDefinitions(input);
  const code = jsonSchemaToZod(prepared.schema, {
    parserOverride: prepared.parserOverride,
  });
  assert.match(code, /z\.unknown\(\)\.refine\(/);
  assert.doesNotMatch(code, /z\.any\(\)/);
  assert.match(code, /SchemaDef_Capital\.safeParse\(value\)/);
});

test('schemas without definitions keep identical generated output', () => {
  const input = { type: 'object', properties: { id: { type: 'string' } } };
  const prepared = prepareSchemaDefinitions(input);
  assert.equal(prepared.declarations, '');
  assert.equal(
    jsonSchemaToZod(prepared.schema, {
      parserOverride: prepared.parserOverride,
    }),
    jsonSchemaToZod(input),
  );
});

test('existing enum-keyed scalar records keep identical generated output', () => {
  const input = {
    $defs: { Location: { type: 'string', enum: ['HEAD'] } },
    type: 'object',
    propertyNames: { $ref: '#/$defs/Location' },
    additionalProperties: { type: 'integer', minimum: 1 },
  };
  const prepared = prepareSchemaDefinitions(input);
  assert.equal(
    jsonSchemaToZod(prepared.schema, {
      parserOverride: prepared.parserOverride,
    }),
    jsonSchemaToZod(prepared.schema),
  );
});

test('structured local definitions reuse dependencies and fail closed on cycles', () => {
  const input = {
    $defs: {
      Stage: {
        type: 'object',
        properties: { year: { type: 'integer' } },
        required: ['year'],
        additionalProperties: false,
      },
      Fact: {
        type: 'object',
        properties: { stage: { $ref: '#/$defs/Stage' } },
        required: ['stage'],
        additionalProperties: false,
      },
    },
    $ref: '#/$defs/Fact',
  };
  const original = structuredClone(input);
  // Draft-07 reference siblings are not accepted as a shortcut to definitions.
  const root = {
    type: 'object',
    properties: { fact: input.$defs.Fact },
    $defs: input.$defs,
  };
  const prepared = prepareSchemaDefinitions(root);
  const code = jsonSchemaToZod(prepared.schema, {
    parserOverride: prepared.parserOverride,
  });
  const contract = new Function(
    'z',
    `${prepared.declarations}; return ${code}`,
  )(z);
  assert.deepEqual(contract.parse({ fact: { stage: { year: -1 } } }), {
    fact: { stage: { year: -1 } },
  });
  assert.equal(contract.safeParse({ fact: { stage: {} } }).success, false);
  assert.ok(
    prepared.declarations.indexOf('SchemaDef_Stage') <
      prepared.declarations.indexOf('SchemaDef_Fact'),
  );
  assert.deepEqual(input, original);
  assert.throws(
    () =>
      prepareSchemaDefinitions({
        $defs: {
          A: { type: 'object', properties: { a: { $ref: '#/$defs/A' } } },
        },
      }),
    /[Cc]ycl/,
  );
});

test('registered external references retain document-local fragment scope', () => {
  const document = {
    $id: 'https://example.invalid/local.json',
    $defs: { Side: { type: 'string', enum: ['ALL'] } },
    type: 'object',
    properties: { side: { $ref: '#/$defs/Side' } },
    required: ['side'],
    additionalProperties: false,
  };
  const input = {
    $defs: { Side: { type: 'string', enum: ['IS'] } },
    type: 'object',
    properties: {
      fact: { $ref: document.$id },
      side: { $ref: document.$id + '#/$defs/Side' },
      local: { $ref: '#/$defs/Side' },
    },
  };
  const prepared = prepareSchemaDefinitions(input, [document]);
  const code = jsonSchemaToZod(prepared.schema, {
    parserOverride: prepared.parserOverride,
  });
  const contract = new Function(
    'z',
    `${prepared.declarations}; return ${code}`,
  )(z);
  assert.deepEqual(
    contract.parse({ fact: { side: 'ALL' }, side: 'ALL', local: 'IS' }),
    {
      fact: { side: 'ALL' },
      side: 'ALL',
      local: 'IS',
    },
  );
  assert.equal(contract.safeParse({ fact: { side: 'BOTH' } }).success, false);
  assert.throws(
    () =>
      prepareSchemaDefinitions(
        { $ref: 'https://unregistered.invalid/schema.json' },
        [document],
      ),
    /Unsupported/,
  );
  assert.throws(
    () =>
      prepareSchemaDefinitions({ $ref: document.$id + '#/$defs/Missing' }, [
        document,
      ]),
    /Unsupported/,
  );
  assert.throws(
    () =>
      prepareSchemaDefinitions({ $ref: document.$id, type: 'object' }, [
        document,
      ]),
    /Unsupported/,
  );
});

test('generated technology sidecar contract agrees with Python cases without changing data', () => {
  const pythonTest = fileURLToPath(
    new URL('./test_technology_advancements_schema.py', import.meta.url),
  );
  const cases = JSON.parse(
    execFileSync('python', ['-B', pythonTest, '--cases'], { encoding: 'utf8' }),
  );
  const { TechnologyAdvancementsContract } = tsxRequire(
    '../../src/types/contracts/generated/technology-advancements.zod.ts',
    import.meta.url,
  );
  for (const entry of cases) {
    const before = structuredClone(entry.document);
    const result = TechnologyAdvancementsContract.safeParse(entry.document);
    assert.equal(result.success, entry.accepted, entry.name);
    assert.deepEqual(entry.document, before, entry.name);
    if (result.success)
      assert.deepEqual(result.data, entry.document, entry.name);
  }
  const source = readFileSync(
    new URL(
      '../../src/types/contracts/generated/technology-advancements.zod.ts',
      import.meta.url,
    ),
    'utf8',
  );
  assert.doesNotMatch(
    source,
    /z\.any\(|fetch\(|import .*technology-advancements\.json/,
  );
});
