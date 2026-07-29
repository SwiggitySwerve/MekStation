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
  it('delegates to the executable fail-closed validator', () => {
    const auditStep = readDeterminismAuditStep();

    expect(auditStep).toContain(
      'run: node scripts/qc/audit-combat-determinism.mjs',
    );
    expect(auditStep).not.toContain('shell: bash');
    expect(auditStep).not.toContain('|| true');
  });
});
