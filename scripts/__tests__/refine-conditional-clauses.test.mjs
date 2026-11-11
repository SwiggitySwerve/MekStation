import { jsonSchemaToZod } from 'json-schema-to-zod';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { z } from 'zod';

import { expandUnitTypeRequirements } from '../expand-unit-type-requirements.mjs';
import {
  createClauseRefiner,
  hasClauseChain,
} from '../refine-conditional-clauses.mjs';
import { prepareSchemaDefinitions } from '../schema-local-definitions.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const UNIT_SCHEMA = 'public/data/equipment/_schema/unit-schema.json';
const SCHEMA_DIR = 'public/data/equipment/_schema/';
// Evidence runs point this at another generated file (the 14-union output, main's file).
const GENERATED =
  process.env.UNIT_ZOD_PATH ??
  `${root}src/types/contracts/generated/unit.zod.ts`;

/**
 * The structural rule: the inferred type must not carry a chain of more than one union.
 * A chain is a maximal tree of `.and(x)` / `z.intersection(a, b)` calls; its terms are the leaves
 * after flattening. N unions in one chain is a union-of-intersections with up to 2^N members, which
 * is what tsc expands (14 of them took a machine past 90 GB). Parse only; nothing is type-checked.
 */
function maxUnionsInChain(text) {
  const sf = ts.createSourceFile(
    'generated.ts',
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const wrappers = new Set([
    'describe',
    'optional',
    'nullable',
    'strict',
    'catchall',
    'default',
    'nullish',
    'readonly',
  ]);
  const isCall = (n) => n?.kind === ts.SyntaxKind.CallExpression;
  const method = (n) =>
    isCall(n) && n.expression.kind === ts.SyntaxKind.PropertyAccessExpression
      ? n.expression.name.text
      : null;
  const isZ = (n, name) =>
    isCall(n) &&
    n.expression.kind === ts.SyntaxKind.PropertyAccessExpression &&
    n.expression.expression.kind === ts.SyntaxKind.Identifier &&
    n.expression.expression.text === 'z' &&
    n.expression.name.text === name;
  const isAnd = (n) => method(n) === 'and' && n.arguments.length === 1;
  const isInter = (n) => isZ(n, 'intersection') && n.arguments.length === 2;
  const isChain = (n) => isAnd(n) || isInter(n);
  const peel = (n) => {
    while (isCall(n) && wrappers.has(method(n))) n = n.expression.expression;
    return n;
  };
  const operands = (n) =>
    isAnd(n)
      ? [n.expression.expression, n.arguments[0]]
      : [n.arguments[0], n.arguments[1]];
  const leaves = (n, out = []) => {
    const p = peel(n);
    if (isChain(p)) for (const o of operands(p)) leaves(o, out);
    else out.push(p);
    return out;
  };
  const chains = [];
  (function visit(n) {
    if (isChain(n)) chains.push(n);
    ts.forEachChild(n, visit);
  })(sf);
  const inner = new Set(
    chains.flatMap((n) => operands(n).map(peel).filter(isChain)),
  );
  return Math.max(
    0,
    ...chains
      .filter((n) => !inner.has(n))
      .map((n) => leaves(n).filter((leaf) => isZ(leaf, 'union')).length),
  );
}

test('the chain counter sees a conjunction of unions and a lone union', () => {
  const u = 'z.union([z.string(), z.number()])';
  assert.equal(
    maxUnionsInChain(
      `export const A = z.object({}).and(${u}).and(${u}).and(${u});`,
    ),
    3,
  );
  assert.equal(maxUnionsInChain(`export const A = z.object({}).and(${u});`), 1);
  assert.equal(
    maxUnionsInChain(
      `export const A = z.intersection(z.intersection(${u}, ${u}), z.object({}));`,
    ),
    2,
  );
  assert.equal(maxUnionsInChain('export const A = z.object({});'), 0);
});

test('the committed unit contract has no chain of more than one union', () => {
  const max = maxUnionsInChain(readFileSync(GENERATED, 'utf8'));
  assert.ok(
    max <= 1,
    `${GENERATED}: a chain carries ${max} unions; render conditional clauses through refine-conditional-clauses`,
  );
});

/** The unit contract exactly as the generator builds it, with or without the hook. */
function unitBody(withHook) {
  const read = (file) => JSON.parse(readFileSync(root + file, 'utf8'));
  const others = [
    'technology-advancements-schema.json',
    'source-provenance-schema.json',
    'weapon-schema.json',
    'ammunition-schema.json',
    'electronics-schema.json',
    'misc-equipment-schema.json',
    'physical-weapon-schema.json',
    'name-mappings-schema.json',
  ].map((file) => read(SCHEMA_DIR + file));
  const prepared = prepareSchemaDefinitions(read(UNIT_SCHEMA), others);
  const refiner = createClauseRefiner((clause) =>
    jsonSchemaToZod(clause, { parserOverride }),
  );
  function parserOverride(candidate) {
    return (
      (withHook ? refiner.override(candidate) : undefined) ??
      prepared.parserOverride(candidate)
    );
  }
  return jsonSchemaToZod(expandUnitTypeRequirements(prepared.schema), {
    module: 'esm',
    name: 'UnitContract',
    type: true,
    parserOverride,
  });
}

test('without the hook the unit schema renders a chain of more than one union (the rule is red)', () => {
  assert.ok(maxUnionsInChain(unitBody(false)) > 1);
});

test('with the hook the unit schema renders no chain of more than one union (the rule is green)', () => {
  const body = unitBody(true);
  assert.ok(maxUnionsInChain(body) <= 1);
  assert.match(
    body,
    /\.superRefine\(\(value, ctx\) => \{\s+for \(const \[clause, message\] of schemaClauses1\(\)\)/,
  );
});

test('the hook takes only the unit armor; every other schema renders as before', () => {
  const read = (file) =>
    JSON.parse(readFileSync(`${root}${SCHEMA_DIR}${file}-schema.json`, 'utf8'));
  const stems = [
    'unit',
    'weapon',
    'ammunition',
    'electronics',
    'misc-equipment',
    'physical-weapon',
    'source-provenance',
    'technology-advancements',
    'name-mappings',
  ];
  const documents = stems.map(read);
  for (const [index, stem] of stems.entries()) {
    // Walk what the generator renders: references resolved, the unit's discriminator rules already expanded.
    const prepared = prepareSchemaDefinitions(
      documents[index],
      documents.filter((_, other) => other !== index),
    );
    const schema =
      stem === 'unit'
        ? expandUnitTypeRequirements(prepared.schema)
        : prepared.schema;
    const hooked = [];
    (function walk(node, path) {
      if (!node || typeof node !== 'object') return;
      if (hasClauseChain(node)) hooked.push(path);
      for (const [key, child] of Object.entries(node))
        walk(child, `${path}/${key}`);
    })(schema, '');
    if (stem === 'unit') {
      assert.ok(
        hooked.length > 0 &&
          hooked.every((path) => path.endsWith('/properties/armor')),
        `unit: ${hooked}`,
      );
    } else assert.deepEqual(hooked, [], stem);
  }
});

function render(schema) {
  const refiner = createClauseRefiner((clause) =>
    jsonSchemaToZod(clause, { parserOverride }),
  );
  function parserOverride(candidate) {
    return refiner.override(candidate);
  }
  const code = jsonSchemaToZod(schema, { parserOverride });
  // The declarations are TypeScript; drop the annotations to evaluate them as JavaScript.
  const declarations = refiner
    .declarations()
    .replaceAll(': [z.ZodType, string][]', '');
  const once =
    'const once = (make) => { let value; return () => (value ??= make()); };';
  return {
    code,
    contract: new Function('z', `${once}${declarations}; return ${code}`)(z),
  };
}

const pair = (title, extra = {}) => ({
  ...(title ? { title } : {}),
  ...extra,
  anyOf: [
    { type: 'object', required: ['a'], properties: { a: { const: 1 } } },
    { type: 'object', required: ['b'], properties: { b: { const: 2 } } },
  ],
});

test('two conditional clauses become one refine that reports each clause title', () => {
  const { code, contract } = render({
    type: 'object',
    properties: {
      a: { type: 'integer' },
      b: { type: 'integer' },
      c: { type: 'integer' },
    },
    allOf: [
      pair('needs a=1 or b=2'),
      {
        title: 'needs c',
        anyOf: [
          {
            type: 'object',
            required: ['c'],
            properties: { c: { type: 'integer' } },
          },
          { type: 'object', required: ['a'], properties: { a: { const: 1 } } },
        ],
      },
    ],
  });
  assert.equal(code.split('.superRefine(').length - 1, 1);
  assert.ok(!code.includes('.and('));
  assert.equal(contract.safeParse({ a: 1 }).success, true);
  assert.deepEqual(
    contract.safeParse({ c: 3 }).error.issues.map((i) => i.message),
    ['needs a=1 or b=2'],
  );
  assert.deepEqual(
    contract.safeParse({ b: 5 }).error.issues.map((i) => i.message),
    ['needs a=1 or b=2', 'needs c'],
  );
});

test('a clause without a title reports its description, then a fixed fallback', () => {
  const { contract } = render({
    type: 'object',
    properties: { a: { type: 'integer' }, b: { type: 'integer' } },
    allOf: [
      pair(undefined, { description: 'by description' }),
      pair(undefined),
    ],
  });
  assert.deepEqual(
    contract.safeParse({}).error.issues.map((i) => i.message),
    ['by description', 'Schema condition not met'],
  );
});

test('non-conditional allOf members stay in the type; one conditional clause is left to the library', () => {
  const plain = { type: 'object', properties: { d: { type: 'integer' } } };
  const { code } = render({
    type: 'object',
    properties: { a: { type: 'integer' } },
    allOf: [plain, pair('x'), pair('y')],
  });
  assert.ok(
    code.includes('d: z') || code.includes('"d"'),
    'the plain member survives',
  );
  const single = {
    type: 'object',
    properties: { a: { type: 'integer' } },
    allOf: [pair('only one')],
  };
  assert.equal(hasClauseChain(single), false);
  assert.ok(!render(single).code.includes('superRefine((value, ctx)'));
});
