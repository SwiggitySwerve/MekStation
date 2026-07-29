import * as fs from 'fs';
import * as path from 'path';

const workflowPath = path.resolve(
  process.cwd(),
  '.github/workflows/pr-checks.yml',
);

function readDeterminismAuditStep(): string {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  const start = workflow.indexOf(
    '      - name: Audit Math.random() in combat pipeline',
  );
  const end = workflow.indexOf(
    '\n  # ---------------------------------------------------------------',
    start,
  );

  if (start < 0 || end < 0) {
    throw new Error('Determinism Audit workflow step was not found');
  }

  return workflow.slice(start, end);
}

describe('Determinism Audit workflow', () => {
  it('fails closed when its scanner cannot run', () => {
    const auditStep = readDeterminismAuditStep();

    expect(auditStep).toContain('command -v git');
    expect(auditStep).toContain('scan_status=$?');
    expect(auditStep).toMatch(/if \[ "\$scan_status" -gt 1 \]; then/);
    expect(auditStep).toContain('filter_status=$?');
    expect(auditStep).toMatch(/if \[ "\$filter_status" -gt 1 \]; then/);
    expect(auditStep).not.toContain('|| true');
  });

  it('keeps a clean no-match scan as a successful result', () => {
    const auditStep = readDeterminismAuditStep();

    expect(auditStep).toContain('set +e');
    expect(auditStep).toContain('set -e');
    expect(auditStep).toContain(
      'Determinism audit passed: no unseeded dice in combat pipeline.',
    );
  });
});
