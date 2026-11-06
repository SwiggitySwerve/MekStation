import assert from 'node:assert/strict';
import { test } from 'node:test';

import { prepareGarden, projectGardenEvidence } from './garden-prepare.mjs';

test('projection calls G1 ownership APIs and leaves incomplete budget evidence null', () => {
  const envelope = {
    repositoryMetrics: { budgetConfigHash: 'd'.repeat(64) },
    packages: { web: { raw: 'G1' } },
  };
  const api = {
    validateRepositoryMetrics: (value) => {
      assert.equal(value, envelope.repositoryMetrics);
      return value;
    },
    observedBudgetValues: (config, metrics, packages) => {
      assert.equal(config, 'G1 config');
      assert.equal(metrics, envelope.repositoryMetrics);
      assert.equal(packages, envelope.packages);
      return { complete: false, values: { ignoredPartial: 1 } };
    },
    packageContributors: () => ({ files: [{ path: 'member', bytes: 12 }] }),
  };
  const result = projectGardenEvidence(envelope, 'G1 config', api);
  assert.equal(result.budgetValues, null);
  assert.deepEqual(result.contributors, [{ path: 'member', bytes: 12 }]);
  assert.equal(
    projectGardenEvidence({ repositoryMetrics: null }, 'G1 config', api)
      .budgetConfigHash,
    null,
  );
});

test('live empty inventory prepares an honest issue and never calls the budget updater', async () => {
  const github = {
    rest: {
      repos: {
        get: async () => ({
          data: { full_name: 'owner/repo', default_branch: 'main' },
        }),
      },
      actions: { listArtifactsForRepo: 'list' },
    },
    paginate: async () => [],
  };
  const result = await prepareGarden({
    github,
    owner: 'owner',
    repo: 'repo',
    now: '2026-11-05T12:00:00Z',
    config: 'G1 config',
    budgetConfigHash: 'd'.repeat(64),
    expectedBaseSha: 'a'.repeat(40),
    projectEvidence: () => {
      throw new Error('No observations should be projected');
    },
    api: {
      budgetTargetGaps: (_config, observed) => {
        assert.equal(observed['G1 id'], null);
        return [
          {
            id: 'G1 id',
            enforced: 100,
            target: 90,
            configuredGap: 10,
            observed: null,
            gapToTarget: null,
            unit: 'files',
          },
        ];
      },
      budgetDescriptors: () => [{ id: 'G1 id', value: 100, ratchet: true }],
      ratchetBudgets: () => {
        throw new Error('No proposal should be made');
      },
    },
  });
  assert.equal(result.ratchetContent, null);
  assert.equal(result.report.observations, 0);
  assert.match(
    result.body,
    /Unknown: complete package member census unavailable/,
  );
  assert.match(result.body, /Association does not establish/);
  assert.equal(result.artifactsScanned, 0);
  assert.equal(result.report.targetGaps[0].observed, null);
  assert.match(
    result.body,
    /G1 id \| 100 \| 90 \| 10 \| unknown \| unknown \| files/,
  );
});
