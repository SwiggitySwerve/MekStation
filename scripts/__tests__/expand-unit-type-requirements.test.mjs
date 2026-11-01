import assert from 'node:assert/strict';
import { test } from 'node:test';

import { expandUnitTypeRequirements } from '../expand-unit-type-requirements.mjs';

function schema(maximum = 10) {
  return {
    type: 'object',
    properties: {
      unitType: { type: 'string', enum: ['Mech', 'Support', 'Capital'] },
      tonnage: { type: 'number', maximum },
    },
    allOf: [
      {
        if: {
          required: ['unitType'],
          properties: { unitType: { enum: ['Mech'] } },
        },
        then: { properties: { tonnage: { maximum: 20 } } },
      },
    ],
  };
}

test('conditional maxima intersect an existing bound', () => {
  const result = expandUnitTypeRequirements(schema());
  assert.equal(result.anyOf[0].properties.tonnage.maximum, 10);
});

test('a single numeric alternative folds into the existing object', () => {
  const input = schema(1000);
  input.anyOf = [
    { properties: { tonnage: { type: 'number', maximum: 15 } } },
    {
      required: ['unitType'],
      properties: {
        unitType: { enum: ['Support'] },
        tonnage: { type: 'number', maximum: 600 },
      },
    },
    {
      required: ['unitType'],
      properties: {
        unitType: { enum: ['Capital'] },
        tonnage: { type: 'number', maximum: 900 },
      },
    },
  ];
  const result = expandUnitTypeRequirements(input);
  assert.equal(result.anyOf[0].properties.tonnage.maximum, 15);
  assert.equal(result.anyOf[0].anyOf, undefined);
  assert.equal(result.anyOf[1].anyOf.length, 3);
  assert.equal(input.properties.tonnage.maximum, 1000);
});

test('unsupported conditional rules still fail rather than disappear', () => {
  const input = schema();
  input.allOf[0].then.properties.tonnage.exclusiveMaximum = 20;
  assert.throws(
    () => expandUnitTypeRequirements(input),
    /Unsupported conditional/,
  );
});

test('folding preserves a normal armor constraint and excludes capital alternatives', () => {
  const input = schema(1000);
  const normal = { type: 'string', enum: ['STANDARD'] };
  input.properties.armor = {
    type: 'object',
    properties: { type: { anyOf: [normal, { enum: ['CAPITAL'] }] } },
  };
  input.anyOf = [
    {
      properties: {
        unitType: { not: { enum: ['Capital'] } },
        tonnage: { type: 'number', maximum: 250 },
        armor: { type: 'object', properties: { type: normal } },
      },
    },
    {
      required: ['unitType'],
      properties: {
        unitType: { enum: ['Capital'] },
        tonnage: { type: 'number', maximum: 900 },
      },
    },
  ];
  const result = expandUnitTypeRequirements(input);
  assert.deepEqual(result.anyOf[0].properties.armor.properties.type, normal);
  assert.equal(result.anyOf[0].anyOf, undefined);
  assert.equal(result.anyOf[1].anyOf.length, 2);
});

test('an unsupported discriminator guard remains enforced by its alternative', () => {
  const input = schema(1000);
  input.anyOf = [
    {
      properties: {
        unitType: { pattern: '^M' },
        tonnage: { type: 'number', maximum: 15 },
      },
    },
  ];
  assert.deepEqual(
    expandUnitTypeRequirements(input).anyOf[0].anyOf,
    input.anyOf,
  );
});
