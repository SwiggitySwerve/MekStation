import { deserialize, serialize } from 'node:v8';

import { decodeComputedRows, encodeComputedRows } from '../unit-bv-artifacts';

it('encodes equal computed values identically despite V8 reference/encoding differences', () => {
  const shared = { name: 'Café' };
  const base = { path: 'meks/x.mtf', sha256: 'a'.repeat(64) };
  const aliased = [{ ...base, unit: { a: shared, b: shared } }];
  const independent = [
    { ...base, unit: { a: { ...shared }, b: { ...shared } } },
  ];
  expect(serialize(aliased).equals(serialize(independent))).toBe(false);
  expect(encodeComputedRows(aliased)).toEqual(encodeComputedRows(independent));
  expect(decodeComputedRows(encodeComputedRows(aliased))).toEqual(
    deserialize(serialize(aliased)),
  );
});

it('retains undefined, nonfinite values, negative zero, sparse arrays, key order and literal tags', () => {
  const row = {
    path: 'vehicles/x.blk',
    sha256: 'a'.repeat(64),
    figure: {
      total: NaN,
      defensive: Infinity,
      offensive: -Infinity,
      terms: { missing: undefined, negativeZero: -0 },
    },
    unit: {
      strings: ['\0u', '\0n', '\0+', '\0-', '\0z', '\0h', '\0\0text', 'Café'],
      sparse: [1, , undefined, null],
    },
  };
  const output = decodeComputedRows(encodeComputedRows([row]));
  expect(output).toStrictEqual([row]);
  expect(Object.keys((output as (typeof row)[])[0].figure.terms)).toEqual([
    'missing',
    'negativeZero',
  ]);
});
