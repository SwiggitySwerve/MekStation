import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const directory = 'openspec/planning/2026-09-12-roadmap-completion';
export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');
export const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
export function verifyReference(root, ref) {
  const relative = path.relative(root, path.resolve(root, ref?.path ?? ''));
  requireThat(
    relative && !relative.startsWith('..') && !path.isAbsolute(relative),
    'Evidence escapes its bundle',
  );
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

// Completeness and binding checks; Root still verifies the truth of human attestations.
export function checkReleaseEvidence(manifest, context) {
  const {
    root,
    bundle,
    ledger,
    plan,
    rcSha,
    artifacts,
    git = execFileSync,
  } = context;
  requireThat(
    /^[a-f0-9]{40}$/.test(rcSha) && manifest.rcSha === rcSha,
    'Wrong candidate SHA',
  );
  const load = (ref) => {
    verifyReference(bundle, ref);
    return JSON.parse(fs.readFileSync(path.resolve(bundle, ref.path)));
  };
  const records = Object.fromEntries(
    [
      'closure-rewind',
      'installer-rehearsal',
      'human-session',
      'publication',
    ].map((kind) => {
      const record = load(manifest.records?.[kind]);
      requireThat(
        record.kind === kind && record.rcSha === rcSha,
        `Wrong candidate or record: ${kind}`,
      );
      return [kind, record];
    }),
  );
  requireThat(
    new Set(Object.values(manifest.records).map((ref) => ref.path)).size === 4,
    'Records must be separate',
  );
  const gates = ledger.l1ReleaseChecklist20261018.checklist.map((g) => g.id);
  requireThat(
    Object.keys(manifest.gates ?? {}).length === gates.length &&
      gates.every((id) => manifest.gates[id]?.status === 'accepted'),
    'Missing accepted gate',
  );
  for (const id of gates) verifyReference(bundle, manifest.gates[id].reference);
  requireThat(
    !plan.steps.some((s) =>
      s.doneTests.some((p) => p.status === 'PROOF NOT IMPLEMENTED'),
    ),
    'Release proof not implemented',
  );
  for (const [kind, record] of Object.entries(records))
    checkEvidenceRecord(kind, record, { ...context, git });
  const expected = records['installer-rehearsal'].artifacts;
  for (const kind of ['human-session', 'publication']) {
    const actual = records[kind].artifacts;
    requireThat(sameArtifacts(expected, actual), 'Mismatched artifact hashes');
  }
  const files = fs.readdirSync(artifacts);
  requireThat(
    files.length === Object.keys(expected).length &&
      files.every(
        (name) =>
          fs.lstatSync(path.join(artifacts, name)).isFile() &&
          sha256(fs.readFileSync(path.join(artifacts, name))) ===
            expected[name],
      ),
    'Published bytes differ from rehearsal',
  );
}

export const sameArtifacts = (expected, actual) =>
  actual &&
  Object.keys(actual).length === Object.keys(expected).length &&
  Object.keys(expected).every((name) => actual[name] === expected[name]);

export function checkEvidenceRecord(kind, record, context) {
  const { root, bundle, ledger, plan, rcSha, git = execFileSync } = context;
  requireThat(record.kind === kind, 'Wrong evidence schema');
  if (kind === 'step0-observation') {
    requireThat(
      record.timestamp &&
        record.mainSha &&
        record.pr2313?.head &&
        record.lsc2c?.state === 'local-verified' &&
        record.lsc2c.head &&
        record.lsc2c.branch === 'codex/lsc-2c-sol-20261020',
      'Incomplete Step 0 observation',
    );
    return;
  }
  requireThat(
    /^[a-f0-9]{40}$/.test(rcSha) && record.rcSha === rcSha,
    'Wrong candidate SHA',
  );
  if (kind !== 'closure-rewind')
    requireThat(
      record.artifacts &&
        Object.keys(record.artifacts).length > 0 &&
        Object.values(record.artifacts).every((h) => /^[a-f0-9]{64}$/.test(h)),
      'Missing artifact SHA256',
    );
  const load = (ref) => {
    verifyReference(bundle, ref);
    return JSON.parse(fs.readFileSync(path.resolve(bundle, ref.path)));
  };
  const gates = ledger.l1ReleaseChecklist20261018.checklist.map((g) => g.id);
  const observations = (record) =>
    requireThat(
      Array.isArray(record.observations) &&
        record.observations.length > 0 &&
        record.observations.every(
          (o) =>
            /^\d{4}-\d\d-\d\dT/.test(o.timestamp) &&
            Number.isFinite(Date.parse(o.timestamp)) &&
            o.status === 'PASS' &&
            o.description,
        ),
      'Missing timestamped PASS observations',
    );
  if (kind === 'closure-rewind') {
    const qualification = record;
    const ids = ledger.l1ReleaseChecklist20261018.closures;
    requireThat(
      qualification.closures?.length === ids.length &&
        new Set(qualification.closures.map((c) => c.unit)).size === ids.length,
      'Missing closure references',
    );
    for (const id of ids) {
      const unit = ledger.units.find((u) => u.id === id);
      const ref = qualification.closures.find((c) => c.unit === id)?.reference;
      requireThat(
        closed(unit, root) &&
          ref?.path === `${directory}/${unit.stageReceipts.mainProof.path}`,
        `Missing closure ${id}`,
      );
      verifyReference(root, ref);
      git('git', ['merge-base', '--is-ancestor', unit.mergeSha, rcSha], {
        cwd: root,
      });
    }
    const commands = plan.steps
      .filter((s) => [3, 5, 6].includes(s.id))
      .flatMap((s) => s.doneTests.filter((p) => p.argv).map((p) => p.argv));
    const reruns = (qualification.reruns ?? []).map(load);
    requireThat(
      commands.length >= 4 &&
        commands.every((argv) =>
          reruns.some(
            (p) =>
              p.rcSha === rcSha &&
              p.verdict === 'PASS' &&
              JSON.stringify(p.argv) === JSON.stringify(argv),
          ),
        ),
      'Missing exact RC rerun',
    );
    requireThat(record.rewind?.command, 'Missing rewind command');
    observations(record.rewind);
    for (const key of ['persisted', 'broadcast', 'replay'])
      verifyReference(bundle, record.rewind[key]);
  } else if (['installer-rehearsal', 'human-session'].includes(kind)) {
    requireThat(
      record.checklist === 'playtest/checklists/coop-uat.md' &&
        typeof record.operator?.identity === 'string' &&
        record.operator.identity.trim() &&
        typeof record.operator.attestation === 'string' &&
        record.operator.attestation.trim(),
      'Missing operator attestation or checklist',
    );
    requireThat(
      ['human', 'agent'].includes(record.operator.kind),
      'Missing operator kind',
    );
    if (kind === 'human-session')
      requireThat(
        record.operator.kind === 'human' &&
          typeof record.humanAttestation === 'string' &&
          record.humanAttestation.trim(),
        'Absent human attestation; agent rehearsal cannot qualify',
      );
    observations(record);
    requireThat(
      Array.isArray(record.defects) &&
        record.defects.every(
          (d) =>
            d.id &&
            d.status === 'closed' &&
            Number.isFinite(Date.parse(d.retest?.timestamp)) &&
            d.retest.reference,
        ),
      'Open or un-retested defects',
    );
    for (const defect of record.defects)
      verifyReference(bundle, defect.retest.reference);
  } else if (kind === 'publication') {
    const rehearsal = load(record.rehearsal);
    requireThat(
      rehearsal.kind === 'installer-rehearsal' &&
        rehearsal.rcSha === rcSha &&
        sameArtifacts(rehearsal.artifacts, record.artifacts),
      'Publication differs from rehearsal',
    );
    requireThat(
      record.releaseNotes?.path === 'release-notes.md',
      'Wrong release-note file',
    );
    requireThat(
      record.acceptedGates?.length === gates.length &&
        gates.every((g) => record.acceptedGates.includes(g)),
      'Publication gates differ',
    );
    verifyReference(bundle, record.releaseNotes);
    const notes = fs.readFileSync(
      path.resolve(bundle, record.releaseNotes.path),
      'utf8',
    );
    for (const limit of [
      /same-host/i,
      /loopback/i,
      /no[^\n]*proxy[^\n]*tunnel/i,
      /Docker[^\n]*HOSTNAME[^\n]*refus/i,
      /unsupported[^\n]*host/i,
      /fog-of-war is unavailable in multiplayer in this release/i,
      /co-op sessions are currently listed in the lobby browser to other users of the same server \(fixed by B15-PRIV\)/i,
    ])
      requireThat(limit.test(notes), 'Missing release-note limit');
  } else throw new Error('Unknown evidence schema');
}
