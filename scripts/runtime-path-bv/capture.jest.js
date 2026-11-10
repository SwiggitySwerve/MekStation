/**
 * Runtime-path BV capture, load measure: committed unit JSON -> the real canonical open
 * (CanonicalUnitService -> loadUnitIntoTab -> UnitLoaderService -> mapper -> unit store) -> the
 * real status-bar hooks and UI -> BV, validity, weight and MP as the editor shows them.
 *
 * Launched only by scripts/runtime-path-bv/run.mjs through config/jest/runtime-path-bv.config.js
 * (file name deliberately not *.test.*). Reads RUNTIME_PATH_BV_CONTEXT (a JSON file written by
 * run.mjs) and writes <outputDirectory>/captured.jsonl, capture-summary.json and resources.json.
 * The observation itself is the shared status-bar observer (scripts/lib/runtime-parity), the same
 * function the reopen capture uses. It does no BV math and compares nothing: run.mjs maps these
 * records to schema rows.
 */
const fs = require('fs');
const path = require('path');

const observer = require('../lib/runtime-parity/status-observer');
observer.installMocks(); // before any product module is required

const {
  getCanonicalUnitService,
} = require('@/services/units/CanonicalUnitService');

const repoRoot = path.resolve(__dirname, '../..');
const o = observer.create({ repoRoot });
const context = JSON.parse(
  fs.readFileSync(process.env.RUNTIME_PATH_BV_CONTEXT, 'utf8'),
);
const plans = JSON.parse(fs.readFileSync(context.planFile, 'utf8'));
const outputFile = path.join(context.outputDirectory, 'captured.jsonl');
const counts = {
  emitted: 0,
  ok: 0,
  productErrors: 0,
  infrastructureFailures: 0,
};

beforeAll(() => {
  expect(new Set(plans.map((p) => p.unitId)).size).toBe(plans.length);
  global.fetch = o.makeTransport();
  fs.writeFileSync(outputFile, '');
});
afterAll(() => {
  o.clear();
  fs.writeFileSync(
    path.join(context.outputDirectory, 'capture-summary.json'),
    JSON.stringify(counts) + '\n',
  );
  fs.writeFileSync(
    path.join(context.outputDirectory, 'resources.json'),
    JSON.stringify(process.resourceUsage()) + '\n',
  );
});

test('canonical open, status BV/terms, validity, weight and MP for every planned unit', async () => {
  for (const plan of plans) {
    o.clear();
    let stage = 'input';
    let infrastructure = true;
    const record = {
      unitId: plan.unitId,
      family: plan.family,
      path: plan.path,
      sha256: plan.sha256,
      catalog: { path: plan.catalogPath, blob: plan.catalogBlob },
      error: null,
      infrastructure: false,
      observed: null,
      terms: null,
      issues: null,
    };
    try {
      const bytes = fs.readFileSync(path.join(repoRoot, plan.catalogPath));
      if (observer.gitBlobId(bytes) !== plan.catalogBlob)
        throw new Error(
          'Working-tree catalog file is not the committed object the join named',
        );
      const entry = (
        await getCanonicalUnitService().getIndex({
          family: plan.family,
          strict: true,
        })
      ).find((e) => e.id === plan.unitId);
      if (!entry)
        throw new Error('Joined unit absent from the canonical index');
      stage = 'open';
      infrastructure = false;
      const store = await o.openCanonical(entry);
      infrastructure = true;
      if (
        o.served.get(`/${plan.catalogPath.replace(/^public\//, '')}`) !==
        observer.sha256(bytes)
      )
        throw new Error('Canonical open did not read the joined catalog file');
      const observation = await o.observeStore(store);
      record.observed = observation.observed;
      record.terms = observation.terms;
      record.issues = observation.issues;
      counts.ok++;
    } catch (error) {
      if (error instanceof observer.ObservationError) {
        stage = error.stage;
        infrastructure = error.infrastructure;
      }
      record.observed = null;
      record.terms = null;
      record.issues = null;
      record.infrastructure = infrastructure;
      record.error = {
        stage,
        name: String(error.name ?? 'Error'),
        message: String(error.message ?? error),
      };
      if (infrastructure) counts.infrastructureFailures++;
      else counts.productErrors++;
    }
    fs.appendFileSync(outputFile, JSON.stringify(record) + '\n');
    counts.emitted++;
    if (counts.emitted % 100 === 0)
      console.log(
        'RUNTIME_PATH_BV_PROGRESS',
        counts.emitted,
        'of',
        plans.length,
      );
  }
  expect(counts.emitted).toBe(plans.length);
}, 1800000);
