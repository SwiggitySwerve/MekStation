import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { generateEntries } from './generate.mjs';

const fixture = JSON.parse(
  readFileSync(new URL('./prototype-fixture.json', import.meta.url)),
);

test('all 33 audited prototype-only Java records are selected without mounted gaps', () => {
  assert.equal(fixture.java.length, 33);
  const result = generateEntries(fixture.java, [], fixture.facts, {}, [], {});
  assert.equal(result.items.length, 33);
  for (const native of fixture.java) {
    const item = result.items.find(
      (item) => item.internalName === native.internalName,
    );
    assert(item, native.internalName);
    const fact = fixture.facts[native.internalName];
    assert.equal(item.entry.battleValue, native.bv);
    assert.equal(item.entry.weight, native.tons);
    assert.equal(item.entry.heat, fact.heat);
    assert.deepEqual(item.entry.ranges, fact.ranges);
    assert(item.entry.special[0].includes(fixture.revision));
    assert(
      item.entry.special[0].includes(native.javaClass.replaceAll('.', '/')),
    );
  }
});
