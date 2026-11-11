import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

const read = (file) =>
  parse(fs.readFileSync(`.github/workflows/${file}`, 'utf8'));

test('all budget status publishers serialize in the same event-aware group without cancelling the running job', () => {
  const group =
    "ci-budget-publish-${{ github.repository }}-${{ github.event.pull_request.head.ref || github.event.workflow_run.head_branch || format('dispatch-pr-{0}', inputs.pull_request) }}";
  const publishers = [];
  for (const file of fs
    .readdirSync('.github/workflows')
    .filter((file) => /\.ya?ml$/.test(file))) {
    const workflow = read(file);
    for (const [id, job] of Object.entries(workflow.jobs)) {
      let publishes = false;
      for (const step of job.steps ?? []) {
        const code = step.with?.script ?? step.run ?? '';
        if (!/budget-approval\.mjs|checkBudgetPolicy/.test(code)) continue;
        const calls = [
          ...code.matchAll(/checkBudgetPolicy\(\{([\s\S]*?)\}\)/g),
        ];
        assert.ok(
          calls.length,
          `${file}/${id}: unclassified budget policy consumer`,
        );
        if (calls.some((call) => !/\bpublish:\s*false\b/.test(call[1])))
          publishes = true;
      }
      if (!publishes) continue;
      publishers.push(`${file}/${id}`);
      assert.deepEqual(
        job.concurrency,
        { group, 'cancel-in-progress': false },
        `${file}/${id}`,
      );
    }
  }
  assert.deepEqual(publishers.sort(), [
    'ci-budget-approval.yml/approval',
    'ci-budget-label-approval.yml/approval',
    'lint-and-test-guard.yml/guard',
  ]);
  assert.equal(read('ci-budget-approval.yml').concurrency, undefined);
  assert.equal(
    read('lint-and-test-guard.yml').concurrency.group,
    'ci-report-${{ github.repository }}-${{ github.event.workflow_run.head_branch }}',
  );
});

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
