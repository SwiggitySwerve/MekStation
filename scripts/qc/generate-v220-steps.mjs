#!/usr/bin/env node
// Owns the L1 outcome crosswalk and its deterministic owner view, never admissions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  directory,
  sha256,
  requireThat,
  verifyReference,
  closed,
  checkReleaseEvidence,
  checkEvidenceRecord,
  sameArtifacts,
  proofImplemented,
  stepInputSha,
  evidenceStep,
  readRecord,
} from './v220-evidence.mjs';
import { observe } from './v220-observe.mjs';
export { directory, sha256, requireThat, verifyReference, closed };
export { stepInputSha, observe };

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
    for (const id of s.witnesses)
      requireThat(closed(units.get(id), root), `Open witness ${id}`);
    for (const proof of s.doneTests) {
      if (proof.status === 'PROOF NOT IMPLEMENTED') {
        requireThat(
          proof.plannedIn && proof.description,
          'Missing proof owner',
        );
      } else if (proof.kind === 'evidence') {
        requireThat(proof.schema, 'Missing evidence schema');
        requireThat(
          evidenceStep(proof.schema) === s.id,
          'Misplaced evidence schema',
        );
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
    const ids = s.id < 7 ? [...s.units, ...s.witnesses] : checklist.closures;
    requireThat(
      ids.every((id) => closed(units.get(id), root)) &&
        s.gates.every((g) => evidence.gates?.[g]?.status === 'accepted') &&
        evidence.steps[s.id].doneTest === 'PASS' &&
        proofImplemented(s) &&
        evidence.steps[s.id].reference,
      `Complete without closures, gates and evidence: ${s.id}`,
    );
    verifyReference(root, evidence.steps[s.id].reference, directory + '/');
    for (const gate of s.gates)
      verifyReference(root, evidence.gates[gate].reference, directory + '/');
    const manual = {};
    for (const proof of s.doneTests.filter((p) => p.kind === 'evidence')) {
      const ref = evidence.steps[s.id].records?.[proof.schema];
      const record = readRecord(root, ref, directory + '/');
      manual[proof.schema] = record;
      checkEvidenceRecord(proof.schema, record, {
        root,
        bundle: path.dirname(path.resolve(root, ref.path)),
        ledger,
        plan,
        rcSha: evidence.rcSha,
      });
    }
    if (manual['installer-rehearsal'])
      requireThat(
        sameArtifacts(
          manual['installer-rehearsal'].artifacts,
          manual['human-session']?.artifacts,
        ),
        'Session differs from rehearsal',
      );
  }
  for (const [id, proof] of Object.entries(evidence.steps ?? {}))
    requireThat(
      proof.inputSha256 === stepInputSha(plan, ledger, Number(id)),
      `Stale evidence inputs: step ${id}`,
    );
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
  return `# V2.2.0 steps\n\nGenerated from v220-steps.json and units.json; source SHA256: ${inputSha}.\n\nHOLD lifted 2026-10-24 (holdLiftAmendment20261024): roadmap units proceed one at a time under the Step 0 rules. This page grants no admission. Root reconciles live observations before selection. Baselines are not completion signals. No local PASS closes a step.\n\n| Step | State | Done-test | Main ledger state | Gates |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`;
}
export function main(
  args,
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
) {
  const read = (name) =>
    fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n');
  const planText = read(`${directory}/v220-steps.json`),
    ledgerText = read(`${directory}/units.json`);
  const plan = JSON.parse(planText),
    ledger = JSON.parse(ledgerText);
  const evidencePath = path.join(root, directory, 'v220-step-evidence.json');
  const evidence = fs.existsSync(evidencePath)
    ? JSON.parse(fs.readFileSync(evidencePath))
    : {};
  const pageSha = sha256(planText + ledgerText);
  validate(plan, ledger, root, evidence);
  const option = (name) => args[args.indexOf(name) + 1];
  if (args.includes('--gate-check')) {
    const file = path.resolve(option('--evidence'));
    checkReleaseEvidence(JSON.parse(fs.readFileSync(file)), {
      root,
      bundle: path.dirname(file),
      ledger,
      plan,
      rcSha: option('--candidate-sha'),
      artifacts: option('--artifacts'),
    });
    console.log(`V2.2 GATE PASSED ${option('--candidate-sha')}`);
  }
  if (args.includes('--observe'))
    console.log(
      `Observation ${new Date().toISOString()}\n${observe(
        args.filter((a) => a.includes('=')),
        root,
      )}`,
    );
  const page = render(plan, ledger, pageSha, evidence),
    output = path.join(root, directory, 'V2.2.0-STEPS.md');
  if (args.includes('--write')) fs.writeFileSync(output, page);
  if (args.includes('--check'))
    requireThat(
      fs.existsSync(output) && read(`${directory}/V2.2.0-STEPS.md`) === page,
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
