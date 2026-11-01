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
    {
      $defs: { A: { enum: ['x'] } },
      $ref: '#/$defs/A',
      description: 'sibling constraint',
    },
  ])
    assert.throws(() => prepareSchemaDefinitions(input), /Unsupported/);
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
