import assert from 'node:assert/strict';
import { hash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  planTechnologyUpdates,
  renderTechnologyUpdates,
  retainNativeTechnologyReferences,
  verifyTechnologyExtraction,
} from './technology-advancement.mjs';

const { goalPins } = JSON.parse(
  readFileSync(
    new URL('../../config/reference-policy/derivation.json', import.meta.url),
    'utf8',
  ),
);
const revision = goalPins.megamek;
function example() {
  const side = Object.fromEntries(
    ['prototype', 'production', 'common', 'extinct', 'reintroduced'].map(
      (phase, index) => [
        phase,
        { year: index ? -1 : 2300, approximate: index === 0 },
      ],
    ),
  );
  const fact = {
    techBase: 'ALL',
    staticTechLevel: 'STANDARD',
    advancement: {
      IS: side,
      CLAN: { ...side, common: { year: 2800, approximate: false } },
    },
    factions: {
      prototype: ['TH'],
      production: [],
      extinct: [],
      reintroduced: [],
    },
  };
  const item = { id: 'local', weight: 1, ranges: { short: 3 } };
  const file = 'weapons/example.json';
  const documents = new Map([
    [file, { items: [item, { id: 'other', weight: 2 }] }],
  ]);
  const baseline = [
    {
      file,
      index: 0,
      id: item.id,
      item,
      sha256: hash('sha256', JSON.stringify(item)),
    },
  ];
  return {
    manifest: {
      revision,
      entries: [
        {
          file,
          index: 0,
          id: item.id,
          nativeTechnologyNames: ['Native exact'],
        },
      ],
    },
    facts: { 'Native exact': fact, Unused: fact },
    documents,
    baseline,
    sidecar: {},
  };
}
const plan = (x) =>
  planTechnologyUpdates(
    x.manifest,
    x.facts,
    x.documents,
    x.baseline,
    x.sidecar,
  );
test('exact bindings preserve ALL, raw sided stages and all unrelated values', () => {
  const input = example(),
    before = structuredClone(input),
    result = plan(input);
  assert.deepEqual(input, before);
  assert.deepEqual(result.documents.get('weapons/example.json').items[0], {
    ...input.baseline[0].item,
    nativeTechnologyNames: ['Native exact'],
  });
  assert.deepEqual(result.sidecar, {
    'Native exact': input.facts['Native exact'],
  });
  assert.equal(result.sidecar['Native exact'].techBase, 'ALL');
  assert.equal(result.sidecar['Native exact'].advancement.IS.common.year, -1);
  assert.equal(
    result.sidecar['Native exact'].advancement.CLAN.common.year,
    2800,
  );
  assert.equal(
    result.baseline[0].sha256,
    hash('sha256', JSON.stringify(result.baseline[0].item)),
  );
  assert.deepEqual(plan({ ...input, ...result }).changed, []);
});
test('one shared fact serves records with the same id in different catalogs', () => {
  const x = example();
  const second = 'electronics/example.json';
  x.documents.set(second, structuredClone(x.documents.values().next().value));
  x.baseline.push({ ...structuredClone(x.baseline[0]), file: second });
  x.manifest.entries.push({ ...x.manifest.entries[0], file: second });
  const result = plan(x);
  assert.equal(result.changed.length, 2);
  assert.deepEqual(Object.keys(result.sidecar), ['Native exact']);
});
for (const [label, mutate, pattern] of [
  [
    'pin',
    (x) => {
      x.manifest.revision = 'wrong';
    },
    /revision/,
  ],
  [
    'path traversal',
    (x) => {
      x.manifest.entries[0].file = '../weapons/x.json';
    },
    /path/,
  ],
  [
    'moved index',
    (x) => {
      x.manifest.entries[0].index = 1;
    },
    /identity/,
  ],
  [
    'duplicate binding',
    (x) => {
      x.manifest.entries.push(x.manifest.entries[0]);
    },
    /Duplicate/,
  ],
  [
    'missing native',
    (x) => {
      x.manifest.entries[0].nativeTechnologyNames = ['native exact'];
    },
    /Missing native/,
  ],
  [
    'empty references',
    (x) => {
      x.manifest.entries[0].nativeTechnologyNames = [];
    },
    /./,
  ],
  [
    'duplicate references',
    (x) => {
      x.manifest.entries[0].nativeTechnologyNames.push('Native exact');
    },
    /./,
  ],
  [
    'stale item',
    (x) => {
      x.baseline[0].item = { ...x.baseline[0].item, weight: 4 };
    },
    /Stale/,
  ],
  [
    'stale hash',
    (x) => {
      x.baseline[0].sha256 = 'bad';
    },
    /hash/,
  ],
  [
    'moved baseline',
    (x) => {
      x.baseline[0].index = 2;
    },
    /baseline/,
  ],
  [
    'conflicting binding',
    (x) => {
      x.documents.get('weapons/example.json').items[0].nativeTechnologyNames = [
        'Other',
      ];
      x.baseline[0].sha256 = hash('sha256', JSON.stringify(x.baseline[0].item));
    },
    /Conflicting/,
  ],
  [
    'conflicting shared fact',
    (x) => {
      x.sidecar = {
        'Native exact': { ...x.facts['Native exact'], techBase: 'IS' },
      };
    },
    /Conflicting/,
  ],
  [
    'binary collapse',
    (x) => {
      x.facts['Native exact'].techBase = 'BOTH';
    },
    /./,
  ],
  [
    'derived fact',
    (x) => {
      x.facts['Native exact'].legal = true;
    },
    /./,
  ],
  [
    'empty manifest',
    (x) => {
      x.manifest.entries = [];
    },
    /Empty/,
  ],
])
  test(`reject ${label} without mutating inputs`, () => {
    const x = example();
    mutate(x);
    const before = structuredClone(x);
    assert.throws(() => plan(x), pattern);
    assert.deepEqual(x, before);
  });
test('rendering adds only references and the matching baseline item/hash', () => {
  const x = example(),
    result = plan(x);
  const texts = new Map(
    [...x.documents].map(([file, doc]) => [
      file,
      JSON.stringify(doc, null, 2) + '\n',
    ]),
  );
  const baselineText = JSON.stringify(x.baseline, null, 2) + '\n';
  const rendered = renderTechnologyUpdates(x, result, texts, baselineText);
  assert.deepEqual(
    JSON.parse(rendered.documents.get('weapons/example.json')),
    result.documents.get('weapons/example.json'),
  );
  assert.deepEqual(JSON.parse(rendered.baseline), result.baseline);
  assert.equal(
    rendered.documents.get('weapons/example.json'),
    texts
      .get('weapons/example.json')
      .replace(
        '"short": 3\n      }',
        '"short": 3\n      },\n      "nativeTechnologyNames": ["Native exact"]',
      ),
  );
  assert.deepEqual(
    renderTechnologyUpdates(
      { ...x, ...result },
      plan({ ...x, ...result }),
      rendered.documents,
      rendered.baseline,
    ),
    rendered,
  );
  const bad = new Map(texts);
  bad.set(
    'weapons/example.json',
    texts.get('weapons/example.json').replace('"weight": 1', '"weight": 9'),
  );
  assert.throws(
    () => renderTechnologyUpdates(x, result, bad, baselineText),
    /preimage/,
  );
});
test('extraction verification binds bytes, producer and pin before facts are consumed', () => {
  const bytes = Buffer.from(JSON.stringify(example().facts));
  const receipt = {
    revision,
    extractorSha256: hash('sha256', 'producer'),
    factsSha256: hash('sha256', bytes),
  };
  assert.deepEqual(
    verifyTechnologyExtraction(bytes, receipt, Buffer.from('producer')),
    example().facts,
  );
  assert.throws(
    () =>
      verifyTechnologyExtraction(
        Buffer.concat([bytes, Buffer.from('\n')]),
        receipt,
        Buffer.from('producer'),
      ),
    /hash/,
  );
  assert.throws(
    () => verifyTechnologyExtraction(bytes, receipt, Buffer.from('changed')),
    /producer/,
  );
  assert.throws(
    () =>
      verifyTechnologyExtraction(
        bytes,
        { ...receipt, revision: 'wrong' },
        Buffer.from('producer'),
      ),
    /revision/,
  );
});
test('regeneration requires facts for metadata, preserves exact arrays and refuses loss', () => {
  const x = example(),
    published = plan(x),
    file = 'weapons/java-registry.json';
  const old = new Map([
    [file, published.documents.get('weapons/example.json')],
  ]);
  const generated = [{ kind: 'weapons', entry: { id: 'local', weight: 1 } }];
  const before = structuredClone(generated);
  assert.throws(
    () => retainNativeTechnologyReferences(generated, old),
    /facts/,
  );
  const kept = retainNativeTechnologyReferences(generated, old, x.facts);
  assert.deepEqual(kept[0].entry.nativeTechnologyNames, ['Native exact']);
  assert.deepEqual(generated, before);
  assert.throws(
    () => retainNativeTechnologyReferences([], old, x.facts),
    /lost/,
  );
  assert.throws(
    () =>
      retainNativeTechnologyReferences(
        [
          {
            kind: 'weapons',
            entry: { id: 'local', nativeTechnologyNames: ['Other'] },
          },
        ],
        old,
        x.facts,
      ),
    /Conflicting/,
  );
  assert.throws(
    () =>
      retainNativeTechnologyReferences(generated, old, {
        Unused: x.facts.Unused,
      }),
    /Missing native/,
  );
  assert.deepEqual(
    retainNativeTechnologyReferences(generated, x.documents),
    generated,
  );
});

test('producer receipt and unreleased source stay bound without publishing identities', () => {
  const read = (name) =>
    JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
  const source = read('./technology-advancement-source.json');
  const receipt = read('./technology-advancement-provenance.json');
  assert.equal(source.revision, revision);
  assert.equal(source.status, 'unreleased');
  assert.deepEqual(source.entries, []);
  assert.equal(receipt.revision, revision);
  assert.equal(receipt.published, false);
  assert.equal(
    receipt.extractorSha256,
    hash(
      'sha256',
      readFileSync(
        new URL('./TechnologyAdvancementFacts.java', import.meta.url),
      ),
    ),
  );
  assert.match(receipt.factsSha256, /^[a-f0-9]{64}$/);
  assert(receipt.nativeTypeCount > 0);
});

test('all-preimage validation rejects a later bad row before returning any plan', () => {
  const x = example();
  const second = { id: 'last', weight: 3 };
  x.documents.get('weapons/example.json').items.push(second);
  x.manifest.entries.push({ ...x.manifest.entries[0], index: 2, id: 'last' });
  x.baseline.push({
    file: 'weapons/example.json',
    index: 2,
    id: 'last',
    item: second,
    sha256: 'stale',
  });
  const before = structuredClone(x);
  assert.throws(() => plan(x), /hash/);
  assert.deepEqual(x, before);
});

test('missing, duplicate and dangling identities cannot become accepted references', () => {
  for (const mutate of [
    (x) => {
      x.baseline = [];
    },
    (x) => {
      x.baseline.push(x.baseline[0]);
    },
    (x) => {
      x.documents
        .get('weapons/example.json')
        .items.push(x.documents.get('weapons/example.json').items[0]);
    },
    (x) => {
      x.documents.get('weapons/example.json').items[1].nativeTechnologyNames = [
        'Dangling',
      ];
    },
  ]) {
    const x = example();
    mutate(x);
    assert.throws(() => plan(x));
  }
});

test('native name spelling and reference order survive; shared output ordering is deterministic', () => {
  const x = example();
  x.facts[' Clan (Exact) '] = structuredClone(x.facts.Unused);
  x.manifest.entries[0].nativeTechnologyNames = [
    ' Clan (Exact) ',
    'Native exact',
  ];
  const result = plan(x);
  assert.deepEqual(result.baseline[0].item.nativeTechnologyNames, [
    ' Clan (Exact) ',
    'Native exact',
  ]);
  assert.deepEqual(Object.keys(result.sidecar), [
    ' Clan (Exact) ',
    'Native exact',
  ]);
  const shuffled = {
    ...x,
    facts: Object.fromEntries(Object.entries(x.facts).reverse()),
  };
  assert.equal(
    JSON.stringify(result.sidecar),
    JSON.stringify(plan(shuffled).sidecar),
  );
});
