import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

const read = (file) =>
  parse(fs.readFileSync(`.github/workflows/${file}`, 'utf8'));

test('label reevaluation is unfiltered, trusted, head-bound and uses the shared outcome', () => {
  const label = read('ci-budget-label-approval.yml');
  assert.deepEqual(label.on, {
    pull_request_target: {
      branches: ['main'],
      types: ['labeled', 'unlabeled'],
    },
  });
  assert.deepEqual(label.permissions, {});
  assert.deepEqual(
    label.jobs.approval.permissions,
    read('ci-budget-approval.yml').jobs.approval.permissions,
  );
  assert.equal(label.jobs.approval['timeout-minutes'], 3);
  const steps = label.jobs.approval.steps;
  const checkouts = steps.filter((step) =>
    step.uses?.startsWith('actions/checkout@'),
  );
  assert.equal(checkouts.length, 1);
  assert.equal(
    checkouts[0].with.ref,
    '${{ github.event.repository.default_branch }}',
  );
  assert.equal(checkouts[0].with['persist-credentials'], false);
  assert.equal(steps.length, 2);
  const script = steps[1].with.script;
  assert.match(
    script,
    /import\(`\$\{process.env.GITHUB_WORKSPACE\}\/scripts\/ci\/budget-approval.mjs`\)/,
  );
  assert.match(
    script,
    /checkBudgetPolicy\(\{ github, owner, repo, number, expectedHead: context.payload.pull_request.head.sha \}\)/,
  );
  assert.match(script, /const outcome = guardOutcome\(number, result\)/);
  assert.match(script, /if \(outcome.fail\) core.setFailed\(outcome.line\)/);
  for (const type of ['labeled', 'unlabeled'])
    assert.ok(
      !read('ci-budget-approval.yml').on.pull_request_target.types.includes(
        type,
      ),
    );
});
