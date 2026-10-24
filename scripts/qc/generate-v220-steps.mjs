#!/usr/bin/env node
import { createHash } from 'node:crypto';
// Owns the L1 outcome crosswalk and its deterministic owner view, never admissions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const directory = 'openspec/planning/2026-09-12-roadmap-completion';
export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');
export const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
export function validate(plan, ledger, root, evidence = {}) {
  const checklist = ledger.l1ReleaseChecklist20261018;
  const units = new Map(ledger.units.map((u) => [u.id, u]));
  const assignments = new Map();
  const gates = plan.steps.flatMap((s) => s.gates);
  requireThat(plan.steps.length === 10, 'Expected steps 0-9');
  plan.steps.forEach((s, index) => {
    requireThat(
      s.id === index &&
        s.name &&
        s.scope &&
        s.prBudget > 0 &&
        typeof s.userVisible === 'boolean',
      'Invalid step',
    );
    requireThat(!('state' in s), 'Lifecycle state belongs in the ledger');
    for (const id of [...s.witnesses, ...s.units]) {
      requireThat(
        checklist.closures.includes(id) && units.has(id),
        `Unknown unit ${id}`,
      );
      requireThat(!assignments.has(id), `Duplicate unit ${id}`);
      assignments.set(id, index);
    }
    for (const proof of s.doneTests) {
      if (proof.status === 'PROOF NOT IMPLEMENTED') {
        requireThat(
          proof.plannedIn && proof.description,
          'Missing proof owner',
        );
      } else if (proof.kind === 'evidence') {
        requireThat(proof.schema, 'Missing evidence schema');
      } else {
        const argv = proof.argv;
        requireThat(Array.isArray(argv) && argv.length > 1, 'Missing argv');
        if (/^npm(?:\.cmd)?$/.test(argv[0])) {
          const scripts = JSON.parse(
            fs.readFileSync(path.join(root, 'package.json')),
          ).scripts;
          requireThat(
            argv[1] === 'run' && scripts[argv[2]],
            `Missing npm script ${argv[2]}`,
          );
          for (const target of scripts[argv[2]].match(
            /(?:scripts|src|e2e)\/[^\s'"]+\.(?:mjs|cjs|js|tsx|ts)/g,
          ) ?? []) {
            requireThat(
              fs.existsSync(path.join(root, target)),
              `Missing command target ${target}`,
            );
          }
        } else {
          requireThat(argv[0] === 'node', 'Unsupported command');
          const target = argv.slice(1).find((a) => !a.startsWith('-'));
          requireThat(
            target && fs.existsSync(path.join(root, target)),
            `Missing command target ${target}`,
          );
        }
        for (const arg of argv
          .slice(1)
          .filter(
            (a) => !a.startsWith('-') && /\.(?:mjs|cjs|js|tsx|ts)$/.test(a),
          )) {
          requireThat(
            fs.existsSync(path.join(root, arg)),
            `Missing command target ${arg}`,
          );
        }
      }
    }
  });
  requireThat(
    checklist.closures.every((id) => assignments.has(id)),
    'Missing unit',
  );
  requireThat(
    gates.length === checklist.checklist.length &&
      new Set(gates).size === gates.length &&
      gates.every((id) => checklist.checklist.some((g) => g.id === id)),
    'Unmapped or unknown gates',
  );
  const visiting = new Set(),
    visited = new Set();
  function visit(id) {
    requireThat(!visiting.has(id), `Dependency cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    const u = units.get(id);
    requireThat(u, `Unknown predecessor ${id}`);
    for (const p of [
      ...(u.predecessors ?? []),
      ...(u.registration20261016?.predecessors ?? []),
    ]) {
      visit(p);
      // Historical witnesses are already closed; their display group is not execution order.
      if (
        assignments.has(p) &&
        assignments.has(id) &&
        !closed(units.get(p), root)
      ) {
        const sequence = plan.steps.flatMap((s) => s.units);
        requireThat(
          sequence.indexOf(p) < sequence.indexOf(id),
          `Predecessor order ${p} -> ${id}`,
        );
      }
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of assignments.keys()) visit(id);
  for (const s of plan.steps) {
    if (evidence.steps?.[s.id]?.state !== 'complete') continue;
    requireThat(
      [...s.units, ...s.witnesses].every((id) => closed(units.get(id), root)) &&
        s.gates.every((g) => evidence.gates?.[g]?.status === 'accepted') &&
        evidence.steps[s.id].doneTest === 'PASS' &&
        !s.doneTests.some((p) => p.status) &&
        evidence.steps[s.id].reference,
      `Complete without closures, gates and evidence: ${s.id}`,
    );
    verifyReference(root, evidence.steps[s.id].reference);
  }
}
export function verifyReference(root, ref) {
  requireThat(
    ref?.path &&
      /^[a-f0-9]{64}$/.test(ref.sha256) &&
      sha256(fs.readFileSync(path.resolve(root, ref.path))) === ref.sha256,
    'Missing or stale evidence reference',
  );
}
export function closed(unit, root) {
  const proof = unit?.stageReceipts?.mainProof;
  if (
    !['main-verified', 'complete', 'archived'].includes(unit?.state) ||
    proof?.verdict !== 'PASS' ||
    proof.mergeCommit !== unit.mergeSha ||
    !proof.path
  )
    return false;
  const file = path.join(root, directory, proof.path);
  if (!fs.existsSync(file)) return false;
  const record = JSON.parse(fs.readFileSync(file));
  return record.verdict === 'PASS' && record.mergeCommit === unit.mergeSha;
}
export function render(plan, ledger, inputSha, evidence = {}) {
  const rows = plan.steps.map((s) => {
    const states =
      [...s.units, ...s.witnesses]
        .map((id) => `${id}: ${ledger.units.find((u) => u.id === id).state}`)
        .join('; ') || 'non-unit';
    const proof = evidence.steps?.[s.id];
    const status = s.doneTests.some((p) => p.status)
      ? 'NOT IMPLEMENTED'
      : (proof?.doneTest ??
        (s.doneTests.some((p) => p.kind === 'evidence')
          ? 'manual evidence pending'
          : 'NOT RUN'));
    const state =
      proof?.state ??
      (s.doneTests.some((p) => p.status) ? 'unknowns open' : 'not started');
    requireThat(
      ['not started', 'unknowns open', 'execution only', 'complete'].includes(
        state,
      ) &&
        [
          'NOT IMPLEMENTED',
          'NOT RUN',
          'FAIL',
          'PASS',
          'manual evidence pending',
        ].includes(status),
      'Invalid evidence status',
    );
    return `| ${s.id}. ${s.name} | ${state} | ${status} | ${states} | ${s.gates.join(', ') || 'none'} |`;
  });
  return `# V2.2.0 steps\n\nGenerated from v220-steps.json and units.json; source SHA256: ${inputSha}.\n\nHOLD: roadmap units remain held. This page grants no admission. Root reconciles live observations before selection. Baselines are not completion signals. No local PASS closes a step.\n\n| Step | State | Done-test | Main ledger state | Gates |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`;
}
export function main(
  args,
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
) {
  const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
  const planText = read(`${directory}/v220-steps.json`),
    ledgerText = read(`${directory}/units.json`);
  const plan = JSON.parse(planText),
    ledger = JSON.parse(ledgerText);
  const evidencePath = path.join(root, directory, 'v220-step-evidence.json');
  const evidence = fs.existsSync(evidencePath)
    ? JSON.parse(fs.readFileSync(evidencePath))
    : {};
  const inputSha = sha256(planText + ledgerText + read('package.json'));
  if (Object.keys(evidence).length)
    requireThat(evidence.inputSha256 === inputSha, 'Stale evidence inputs');
  validate(plan, ledger, root, evidence);
  const page = render(plan, ledger, inputSha, evidence),
    output = path.join(root, directory, 'V2.2.0-STEPS.md');
  if (args.includes('--write')) fs.writeFileSync(output, page);
  if (args.includes('--check'))
    requireThat(
      fs.existsSync(output) && fs.readFileSync(output, 'utf8') === page,
      'Stale committed page',
    );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
