import { jsonSchemaToZod } from 'json-schema-to-zod';
import assert from 'node:assert/strict';
import { test } from 'node:test';
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
