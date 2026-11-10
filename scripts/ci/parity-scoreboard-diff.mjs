// Scoreboard snapshots, row fingerprints, numeric differences and Markdown.
import fs from 'node:fs';
import path from 'node:path';

import {
  readJson,
  readRows,
  ROW_FILES,
  sha256,
  tallyBv,
} from './parity-scoreboard.mjs';

export function buildSnapshot(out, identity) {
  const result = readJson(path.join(out, 'RESULTS.json'));
  const provenance = readJson(path.join(out, 'run-provenance.json'));
  if (
    result.head !== identity.head ||
    provenance.head !== identity.head ||
    provenance.failure
  )
    throw new Error('Scoreboard identity does not match completed census');
  const terms = path.join(out, 'terms');
  const families = {},
    rows = {};
  for (const file of ROW_FILES) {
    const items = readRows(path.join(terms, file));
    const index = {};
    for (const row of items) {
      if (typeof row.family !== 'string' || typeof row.path !== 'string')
        throw new Error(`Missing row identity: ${file}`);
      // A source edit changes the row at this path, rather than removing/adding it.
      const key = JSON.stringify([row.family, row.path]);
      if (Object.hasOwn(index, key))
        throw new Error(`Duplicate row identity: ${file}: ${key}`);
      index[key] = sha256(JSON.stringify(row));
    }
    rows[file] = index;
    if (file === 'delta-rows.jsonl') {
      const { finiteByFamily } = tallyBv(items);
      for (const [family, bv] of Object.entries(result.bv.families))
        families[family] = {
          bv: {
            rows: bv.rows,
            exact: bv.exactTotals,
            finite: finiteByFamily[family] ?? 0,
            missing: bv.missing,
          },
          validity: result.validity.byFamily[family] ?? {},
          weight: Object.fromEntries(
            [
              'rows',
              'matched',
              'different',
              'incomplete',
              'missingLocal',
              'failedLocal',
              'missingReference',
            ].map((key) => [
              key === 'missingLocal' ? 'missing-local' : key,
              result.weight.byFamily[family]?.[key] ?? 0,
            ]),
          ),
          settings: {},
        };
    }
  }
  const quantity = readJson(
    path.join(terms, 'construction-quantity-report.json'),
  );
  for (const cell of quantity.settings.cells) {
    const family = families[cell.family];
    if (!family)
      throw new Error(`Settings family absent from census: ${cell.family}`);
    for (const setting of cell.results)
      family.settings[setting.status] =
        (family.settings[setting.status] ?? 0) + 1;
  }
  return {
    schemaVersion: 1,
    identity,
    pythonVersion: provenance.pythonVersion,
    compatibilityExtra: provenance.extraSha256 !== null,
    families,
    rows,
  };
}

export function compareRows(previous, current) {
  const result = { added: 0, removed: 0, changed: 0, unchanged: 0 };
  for (const key of new Set([
    ...Object.keys(previous),
    ...Object.keys(current),
  ])) {
    if (!Object.hasOwn(previous, key)) result.added++;
    else if (!Object.hasOwn(current, key)) result.removed++;
    else if (previous[key] !== current[key]) result.changed++;
    else result.unchanged++;
  }
  return result;
}

function validateSnapshot(snapshot) {
  if (
    snapshot?.schemaVersion !== 1 ||
    !/^[a-f0-9]{40}$/.test(snapshot.identity?.head) ||
    typeof snapshot.pythonVersion !== 'string' ||
    !snapshot.families ||
    !snapshot.rows
  )
    throw new Error('Invalid scoreboard snapshot');
  for (const family of Object.values(snapshot.families))
    for (const group of Object.values(family)) {
      for (const value of Object.values(group))
        if (!Number.isSafeInteger(value) || value < 0)
          throw new Error('Invalid scoreboard metric');
    }
  for (const index of Object.values(snapshot.rows))
    for (const value of Object.values(index))
      if (typeof value !== 'string') throw new Error('Invalid row fingerprint');
}

export function diffScoreboards(current, previous) {
  validateSnapshot(current);
  if (previous) validateSnapshot(previous);
  const families = {};
  for (const family of new Set([
    ...Object.keys(previous?.families ?? {}),
    ...Object.keys(current.families),
  ])) {
    families[family] = {};
    for (const group of ['bv', 'validity', 'weight', 'settings']) {
      const before = previous?.families[family]?.[group],
        after = current.families[family]?.[group];
      families[family][group] = {};
      for (const metric of new Set([
        ...Object.keys(before ?? {}),
        ...Object.keys(after ?? {}),
      ])) {
        // An absent status in an existing group means zero; an absent family is unknown.
        const oldValue = before ? (before[metric] ?? 0) : null,
          newValue = after ? (after[metric] ?? 0) : null;
        families[family][group][metric] = {
          previous: oldValue,
          current: newValue,
          delta:
            oldValue === null || newValue === null ? null : newValue - oldValue,
        };
      }
    }
  }
  const rows = {};
  for (const file of new Set([
    ...Object.keys(previous?.rows ?? {}),
    ...Object.keys(current.rows),
  ]))
    rows[file] = previous
      ? compareRows(previous.rows[file] ?? {}, current.rows[file] ?? {})
      : null;
  return {
    schemaVersion: 1,
    current: current.identity,
    baseline: previous?.identity ?? null,
    pythonVersion: current.pythonVersion,
    compatibilityExtra: current.compatibilityExtra ?? false,
    families,
    rows,
  };
}

export function renderSummary(diff) {
  const text = (value) => String(value).replace(/[|\r\n]/g, ' ');
  const lines = [
    '## Parity scoreboard — report only',
    '',
    `Census target: \`${text(diff.current.head)}\`. Interpreter: ${text(diff.pythonVersion)}.`,
    '',
    diff.baseline
      ? `Previous main baseline: run ${text(diff.baseline.runId)}, attempt ${text(diff.baseline.attempt)}, SHA \`${text(diff.baseline.head)}\`.`
      : 'No previous main scoreboard artifact is available; baseline: null.',
    '',
    diff.compatibilityExtra
      ? 'W2 compatibility input was supplied for the local byte-stability proof.'
      : 'W2 infantry extra is omitted in S0a; infantry weight terms remain an input/coverage limitation (missing-local or missing-reference in the reports).',
    '',
    'Values are current (change from previous main); — means unavailable.',
    '',
    '| Family | Area | Metric | Current | Change |',
    '| --- | --- | --- | ---: | ---: |',
  ];
  for (const [family, groups] of Object.entries(diff.families))
    for (const [group, metrics] of Object.entries(groups))
      for (const [metric, value] of Object.entries(metrics))
        lines.push(
          `| ${text(family)} | ${text(group)} | ${text(metric)} | ${value.current ?? '—'} | ${value.delta === null ? '—' : (value.delta > 0 ? '+' : '') + value.delta} |`,
        );
  lines.push(
    '',
    '| Row file | Added | Removed | Changed | Unchanged |',
    '| --- | ---: | ---: | ---: | ---: |',
  );
  for (const [file, counts] of Object.entries(diff.rows))
    lines.push(
      `| ${text(file)} | ${counts?.added ?? '—'} | ${counts?.removed ?? '—'} | ${counts?.changed ?? '—'} | ${counts?.unchanged ?? '—'} |`,
    );
  return lines.join('\n') + '\n';
}

export function writeReports(out, snapshot, baseline) {
  const diff = diffScoreboards(snapshot, baseline);
  fs.writeFileSync(
    path.join(out, 'scoreboard-row-index.json'),
    JSON.stringify(snapshot, null, 2) + '\n',
  );
  fs.writeFileSync(
    path.join(out, 'scoreboard-diff.json'),
    JSON.stringify(diff, null, 2) + '\n',
  );
  const summary = renderSummary(diff);
  fs.writeFileSync(path.join(out, 'scoreboard-summary.md'), summary);
  return summary;
}
