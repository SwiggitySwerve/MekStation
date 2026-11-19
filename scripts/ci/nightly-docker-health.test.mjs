import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';

import { inducedWorkflowCensus } from './budget-workflow.mjs';

const workflowFile = '.github/workflows/nightly-validation.yml';
const script = path.resolve('scripts/ci/nightly-docker-health.sh');
const nightly = () => parse(fs.readFileSync(workflowFile, 'utf8'));

test('Nightly builds the production image and health-checks it, outside every PR trigger', () => {
  const wf = nightly();
  assert.deepEqual(Object.keys(wf.on).sort(), [
    'schedule',
    'workflow_dispatch',
  ]);
  const census = inducedWorkflowCensus(process.cwd(), ['Dockerfile']);
  assert.ok(!census.files.includes('nightly-validation.yml'));
  const job = wf.jobs['docker-health'];
  assert.ok(job, 'docker-health job is present');
  assert.equal(job['runs-on'], 'ubuntu-latest');
  // Owner-held: proposed from C7's slowest measured build (984 s) x 1.5.
  assert.equal(job['timeout-minutes'], 25);
  assert.deepEqual(job.permissions, { contents: 'read' });
  assert.equal(job.needs, undefined);
  const [checkout, check, upload] = job.steps;
  assert.match(checkout.uses, /^actions\/checkout@/);
  assert.equal(checkout.with['persist-credentials'], false);
  assert.equal(
    check.run,
    'bash scripts/ci/nightly-docker-health.sh "$RUNNER_TEMP/docker-health"',
  );
  assert.ok(!check['continue-on-error']);
  assert.match(upload.uses, /^actions\/upload-artifact@/);
  assert.equal(upload.if, '${{ always() }}');
  assert.equal(upload.with.name, 'nightly-docker-health');
  assert.equal(upload.with.path, '${{ runner.temp }}/docker-health/');
  assert.equal(upload.with['if-no-files-found'], 'error');
  assert.equal(job.steps.length, 3);
  // No buildx GHA cache (the Actions cache is at its cap) and no expression in a script.
  const text = JSON.stringify(job);
  assert.doesNotMatch(text, /type=gha|cache-from|cache-to|setup-buildx/);
  for (const step of job.steps)
    if (step.run) assert.ok(!step.run.includes('${{'), step.name);
  // A red Docker leg reaches the failure issue like the other legs.
  assert.ok(wf.jobs['notify-on-failure'].needs.includes('docker-health'));
  assert.match(
    wf.jobs['notify-on-failure'].steps[0].run,
    /Lanes:.*production Docker image health/,
  );
});

/** Runs the script with a fake docker and curl; returns the exit, the report and every docker/curl call. */
function runScript(t, env = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'docker-health-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bin = path.join(root, 'bin');
  const out = path.join(root, 'out');
  fs.mkdirSync(bin);
  const calls = path.join(root, 'calls');
  fs.writeFileSync(
    path.join(bin, 'docker'),
    [
      '#!/bin/sh',
      'echo "docker $*" >> "$CALLS"',
      'case "$1 $2" in',
      '  "build "*) echo "step 1/9"; exit "${DOCKER_BUILD_EXIT:-0}" ;;',
      '  "image inspect") case "$*" in *len*) echo 10 ;; *) echo 978589314 ;; esac ;;',
      '  "run "*) [ "${DOCKER_RUN_EXIT:-0}" = 0 ] && : > "$RAN"; exit "${DOCKER_RUN_EXIT:-0}" ;;',
      '  "container inspect") [ -f "$RAN" ]; exit $? ;;',
      '  "logs "*) echo "MEKSTATION_LISTENER_READY" ;;',
      'esac',
      'exit 0',
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
  fs.writeFileSync(
    path.join(bin, 'curl'),
    [
      '#!/bin/sh',
      'echo "curl $*" >> "$CALLS"',
      'while [ $# -gt 0 ]; do [ "$1" = -o ] && body="$2"; shift; done',
      'printf "%s" "$CURL_BODY" > "$body"',
      'printf "%s" "$CURL_CODE"',
      '',
    ].join('\n'),
    { mode: 0o755 },
  );
  const result = spawnSync('bash', [script, out], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}${path.delimiter}${process.env.PATH}`,
      CALLS: calls,
      RAN: path.join(root, 'ran'),
      GITHUB_STEP_SUMMARY: '',
      HEALTH_ATTEMPTS: '3',
      HEALTH_INTERVAL: '0',
      CURL_CODE: '200',
      CURL_BODY: JSON.stringify({
        status: 'healthy',
        checks: { server: 'ok', memory: 'ok' },
        environment: 'production',
        version: '0.0.0',
      }),
      ...env,
    },
  });
  const read = (file) =>
    fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  return {
    status: result.status,
    stdout: result.stdout,
    report: JSON.parse(read(path.join(out, 'report.json')) || 'null'),
    calls: read(calls).split('\n').filter(Boolean),
    out,
  };
}

test('a healthy image: loopback-only port, the image own env, a bounded probe, then removal', (t) => {
  const run = runScript(t);
  assert.equal(run.status, 0, run.stdout);
  assert.equal(run.report.verdict, 'healthy');
  assert.equal(run.report.bodyOk, true);
  assert.equal(run.report.httpCode, '200');
  assert.equal(run.report.buildExit, 0);
  assert.equal(run.report.imageBytes, 978589314);
  assert.equal(run.report.layers, 10);
  assert.equal(typeof run.report.buildSeconds, 'number');
  assert.equal(typeof run.report.healthSeconds, 'number');
  assert.ok(
    run.calls.includes(
      'docker build --progress=plain -f Dockerfile -t mekstation-nightly-health:local .',
    ),
  );
  // Run exactly as `npm run docker:run` publishes it: 127.0.0.1 only, no env override.
  const started = run.calls.find((call) => call.startsWith('docker run '));
  assert.equal(
    started,
    'docker run -d --name mekstation-nightly-health -p 127.0.0.1:3600:3600 mekstation-nightly-health:local',
  );
  assert.doesNotMatch(started, / -e /);
  const probes = run.calls.filter((call) => call.startsWith('curl '));
  assert.equal(probes.length, 1);
  assert.match(probes[0], /--max-time 5 /);
  assert.match(probes[0], /http:\/\/127\.0\.0\.1:3600\/api\/health$/);
  assert.equal(run.calls.at(-1), 'docker rm -f mekstation-nightly-health');
  assert.ok(fs.existsSync(path.join(run.out, 'container.log')));
});

test('every failure exits 1 with a report and still removes the container', (t) => {
  for (const [label, env, verdict, ranContainer, probes] of [
    ['build fails', { DOCKER_BUILD_EXIT: '1' }, 'build-failed', false, 0],
    ['run fails', { DOCKER_RUN_EXIT: '125' }, 'run-failed', false, 0],
    ['health 503 every time', { CURL_CODE: '503' }, 'unhealthy', true, 3],
    ['no answer', { CURL_CODE: '000' }, 'unhealthy', true, 3],
    [
      '200 with an unhealthy body',
      {
        CURL_BODY: JSON.stringify({
          status: 'unhealthy',
          checks: { server: 'error' },
        }),
      },
      'unhealthy',
      true,
      1,
    ],
    ['200 with a non-JSON body', { CURL_BODY: 'ok' }, 'unhealthy', true, 1],
  ]) {
    const run = runScript(t, env);
    assert.equal(run.status, 1, label);
    assert.equal(run.report.verdict, verdict, label);
    assert.equal(run.report.bodyOk, false, label);
    assert.equal(
      run.calls.some((call) => call.startsWith('docker run ')),
      label !== 'build fails',
      label,
    );
    assert.equal(
      run.calls.filter((call) => call.startsWith('curl ')).length,
      probes,
      label,
    );
    assert.equal(
      run.calls.at(-1),
      'docker rm -f mekstation-nightly-health',
      label,
    );
    assert.equal(
      fs.existsSync(path.join(run.out, 'container.log')),
      ranContainer,
      label,
    );
  }
});
