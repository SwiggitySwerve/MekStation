import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const text = (value) => typeof value === 'string' && value.trim();

export const directory = 'openspec/planning/2026-09-12-roadmap-completion';
export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex');
export const requireThat = (condition, message) => {
  if (!condition) throw new Error(message);
};
export const schemas = {
  'step0-observation': 0,
  'closure-rewind': 7,
  'installer-rehearsal': 8,
  'human-session': 8,
  publication: 9,
  'local-seat-proof': 2,
};
export function evidenceStep(schema) {
  requireThat(Object.hasOwn(schemas, schema), 'Unknown evidence schema');
  return schemas[schema];
}
export function stepInputSha(plan, ledger, id) {
  const step = plan.steps.find((s) => s.id === id);
  requireThat(step, `Unknown step ${id}`);
  const ids =
    id >= 7
      ? ledger.l1ReleaseChecklist20261018.closures
      : [...(step.units ?? []), ...(step.witnesses ?? [])];
  const snapshot = ids.map((id) => {
    const u = ledger.units.find((u) => u.id === id);
    return [id, u?.state, u?.mergeSha ?? null];
  });
  return sha256(JSON.stringify([step, snapshot]));
}
export function verifyReference(root, ref, prefix = '') {
  requireThat(
    typeof ref?.path === 'string' &&
      ref.path.startsWith(prefix) &&
      !path.win32.parse(ref.path).root &&
      !path.posix.isAbsolute(ref.path) &&
      !ref.path.split(/[\\/]/).includes('..'),
    'Unsafe evidence reference path',
  );
  requireThat(
    ref?.path &&
      fs.realpathSync(path.resolve(root, ref.path)) ===
        path.resolve(fs.realpathSync(root), ref.path) &&
      /^[a-f0-9]{64}$/.test(ref.sha256) &&
      sha256(fs.readFileSync(path.resolve(root, ref.path))) === ref.sha256,
    'Missing or stale evidence reference',
  );
}
export function readRecord(root, ref, prefix = '') {
  verifyReference(root, ref, prefix);
  return JSON.parse(fs.readFileSync(path.resolve(root, ref.path)));
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
  const { bundle, ledger, plan, rcSha, artifacts } = context;
  requireThat(
    /^[a-f0-9]{40}$/.test(rcSha) && manifest.rcSha === rcSha,
    'Wrong candidate SHA',
  );
  const load = (ref) => readRecord(bundle, ref);
  const records = Object.fromEntries(
    Object.keys(schemas)
      .filter((kind) => schemas[kind] >= 7)
      .map((kind) => [kind, load(manifest.records?.[kind])]),
  );
  requireThat(
    Object.keys(manifest.records).length === Object.keys(records).length &&
      new Set(Object.values(manifest.records).map((ref) => ref.path)).size ===
        Object.keys(records).length,
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
    plan.steps.every(proofImplemented),
    'Release proof not implemented',
  );
  for (const [kind, record] of Object.entries(records))
    checkEvidenceRecord(kind, record, context);
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

export const proofImplemented = (s) =>
  !s.doneTests.some((p) => p.status) && s.doneTests.some((p) => !p.baseline);

export const sameArtifacts = (expected, actual) =>
  actual &&
  Object.keys(actual).length === Object.keys(expected).length &&
  Object.keys(expected).every((name) => actual[name] === expected[name]);

export function checkEvidenceRecord(kind, record, context) {
  const { root, bundle, ledger, plan, rcSha, git = execFileSync } = context;
  requireThat(
    record.inputSha256 === stepInputSha(plan, ledger, evidenceStep(kind)),
    'Stale evidence inputs',
  );
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
  const load = (ref) => readRecord(bundle, ref);
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
            text(o.description),
        ),
      'Missing timestamped PASS observations',
    );
  if (kind === 'closure-rewind') {
    const ids = ledger.l1ReleaseChecklist20261018.closures;
    requireThat(
      record.closures?.length === ids.length &&
        new Set(record.closures.map((c) => c.unit)).size === ids.length,
      'Missing closure references',
    );
    for (const id of ids) {
      const unit = ledger.units.find((u) => u.id === id);
      const ref = record.closures.find((c) => c.unit === id)?.reference;
      requireThat(
        closed(unit, root) &&
          ref?.path === `${directory}/${unit.stageReceipts.mainProof.path}`,
        `Missing closure ${id}`,
      );
      verifyReference(root, ref, directory + '/');
      git('git', ['merge-base', '--is-ancestor', unit.mergeSha, rcSha], {
        cwd: root,
      });
    }
    const commands = plan.steps
      .filter((s) => [3, 5, 6].includes(s.id))
      .flatMap((s) =>
        s.doneTests.filter((p) => p.argv).map((p) => [s.id, p.argv]),
      );
    const reruns = (record.reruns ?? []).map(load);
    requireThat(
      commands.length >= 4 &&
        commands.every(([id, argv]) =>
          reruns.some(
            (p) =>
              p.inputSha256 === stepInputSha(plan, ledger, id) &&
              p.rcSha === rcSha &&
              p.verdict === 'PASS' &&
              JSON.stringify(p.argv) === JSON.stringify(argv),
          ),
        ),
      'Missing exact RC rerun',
    );
    requireThat(text(record.rewind?.command), 'Missing rewind command');
    observations(record.rewind);
    for (const key of ['persisted', 'broadcast', 'replay'])
      verifyReference(bundle, record.rewind[key]);
  } else if (['installer-rehearsal', 'human-session'].includes(kind)) {
    requireThat(
      record.checklist?.path === 'playtest/checklists/coop-uat.md' &&
        text(record.operator?.identity) &&
        text(record.operator.attestation),
      'Missing operator attestation or checklist',
    );
    verifyReference(root, record.checklist);
    requireThat(
      ['human', 'agent'].includes(record.operator.kind),
      'Missing operator kind',
    );
    if (kind === 'human-session')
      requireThat(
        record.operator.kind === 'human' && text(record.humanAttestation),
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
      'The server enforces loopback binding.',
      'Do not expose the port through a reverse proxy or tunnel.',
      'Remote play is not a supported configuration in this release.',
      "fail the server's HOSTNAME admission check",
      'Docker hosting is unsupported',
      'fog-of-war is unavailable in multiplayer in this release',
      'co-op sessions are currently listed in the lobby browser to other users of the same server (fixed by B15-PRIV)',
    ])
      requireThat(notes.includes(limit), 'Missing release-note limit');
  } else if (kind === 'local-seat-proof') {
    const hex = (v, n) => new RegExp(`^[a-f0-9]{${n}}$`).test(v);
    const { installer: i, installed: n, publicIdentities: ids } = record;
    requireThat(
      /^MekStation-.+-win-x64\.exe$/.test(i?.filename) &&
        hex(i.sha256, 64) &&
        i.sizeBytes > 0 &&
        text(i.authenticode) &&
        hex(n?.exeSha256, 64) &&
        text(n.productVersion) &&
        n.authorityUrl === 'http://127.0.0.1:3001' &&
        n.freshAuthority === true &&
        n.listener,
      'Missing installed-artifact identity',
    );
    requireThat(
      ids?.length === 3 &&
        ['primary', 'seat1', 'seat2'].every(
          (c) => ids.filter((x) => x.choice === c).length === 1,
        ) &&
        new Set(ids.map((x) => x.playerId)).size === 3 &&
        ids.every((x) => /^pid_[1-9A-HJ-NP-Za-km-z]+$/.test(x.playerId)),
      'Public identities must be three distinct players',
    );
    requireThat(
      ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'].every((id) => {
        const s = record.scenarios?.find((x) => x.id === id);
        return s?.result === 'PASS' && Number.isFinite(Date.parse(s.endedAt));
      }),
      'Every scenario S0-S7 must PASS',
    );
    observations(record);
    requireThat(
      Array.isArray(record.defects) &&
        record.defects.length === 0 &&
        text(record.operator?.identity) &&
        text(record.operator.attestation),
      'Open defects or missing operator attestation',
    );
  } else throw new Error('Unknown evidence schema');
}
