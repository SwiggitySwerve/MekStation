import { jsonSchemaToZod } from 'json-schema-to-zod';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { prepareSchemaDefinitions } from '../schema-local-definitions.mjs';

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
