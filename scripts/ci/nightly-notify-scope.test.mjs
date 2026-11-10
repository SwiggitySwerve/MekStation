import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

const file = '.github/workflows/nightly-validation.yml';

// Nightly Validation may be dispatched on a PR branch to run the full E2E
// suite before merge. Its only write outside the run is the failure issue,
// which tracks main's nightly, so a branch dispatch must never reach it.
test("nightly failure issue is written only for main's runs", () => {
  const workflow = parse(fs.readFileSync(file, 'utf8'));
  assert.ok(
    'workflow_dispatch' in workflow.on,
    'branch dispatch stays available',
  );
  // The repository's default token is read-only and the workflow sets no
  // top-level permissions, so a job can write only where it asks to.
  assert.equal(workflow.permissions, undefined);
  const writers = Object.entries(workflow.jobs).filter(([, job]) =>
    Object.values(job.permissions ?? {}).includes('write'),
  );
  assert.deepEqual(
    writers.map(([id, job]) => [id, job.permissions]),
    [['notify-on-failure', { issues: 'write' }]],
  );
  assert.equal(
    workflow.jobs['notify-on-failure'].if,
    "failure() && github.ref == 'refs/heads/main'",
  );
});
