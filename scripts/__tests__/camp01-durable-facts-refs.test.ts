import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-durable-facts.mjs'),
).href;

const pendingId = 'tuple-pending-owned';
const mergedId = 'tuple-merged-owned';
const auditRef = {
  ref: 'ref-audit-anchor',
  kind: 'audit',
  targetDigest: 'sha256:' + 'a'.repeat(64),
  validationProvenanceId: pendingId,
};
const reboundAuditRef = {
  ...auditRef,
  validationProvenanceId: mergedId,
};
const receiptRef = {
  ref: 'ref-reproduction-receipt',
  kind: 'receipt',
  targetDigest: 'sha256:' + 'b'.repeat(64),
  validationProvenanceId: 'receipt-reproduction',
};

function invoke(action: string) {
  const harness = `
import fs from 'node:fs';
import { overlayIdentityRefs, Camp01FactsError } from ${JSON.stringify(moduleUrl)};
const request=JSON.parse(fs.readFileSync(0,'utf8'));
try {
  const value=overlayIdentityRefs(request.inherited,request.overlay);
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch (error) {
  process.stdout.write(JSON.stringify({
    ok:false,
    error:error instanceof Error?error.message:String(error),
    name:error instanceof Error?error.name:null,
    isFacts:error instanceof Camp01FactsError,
  }));
  process.exitCode=1;
}
`;
  const payload =
    action === 'rebind'
      ? {
          inherited: [auditRef, receiptRef],
          overlay: [reboundAuditRef, receiptRef],
        }
      : action === 'keep'
        ? { inherited: [auditRef, receiptRef], overlay: [] }
        : {
            inherited: [
              auditRef,
              { ...auditRef, validationProvenanceId: mergedId },
            ],
            overlay: [],
          };
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { encoding: 'utf8', input: JSON.stringify(payload) },
  );
  return result.stdout
    ? (JSON.parse(result.stdout) as {
        ok: boolean;
        value?: unknown;
        error?: string;
        name?: string;
        isFacts?: boolean;
      })
    : { ok: false, error: result.stderr };
}

describe('CAMP-01 identity-ref overlay', () => {
  it('rebinds an audit ref when exact-main owned mergeSha changes the tuple id', () => {
    const result = invoke('rebind');
    expect(result).toMatchObject({ ok: true });
    expect(result.value).toEqual(
      [reboundAuditRef, receiptRef].sort((left, right) =>
        left.ref.localeCompare(right.ref),
      ),
    );
  });

  it('keeps inherited refs when exact-main does not overlay them', () => {
    const result = invoke('keep');
    expect(result).toMatchObject({ ok: true });
    expect(result.value).toEqual(
      [auditRef, receiptRef].sort((left, right) =>
        left.ref.localeCompare(right.ref),
      ),
    );
  });

  it('still fail-closes when inherited refs collide without an overlay', () => {
    const result = invoke('collide');
    expect(result).toMatchObject({
      ok: false,
      name: 'Camp01FactsError',
      isFacts: true,
      error: 'CAMP01_FACTS_INVALID: durable registry identity drift',
    });
  });
});
