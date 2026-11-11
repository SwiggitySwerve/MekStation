/**
 * Runtime round-trip capture, reopen = load after save. Per unit: the real canonical open and the
 * shared status-bar observation (before), serialize, a cold SQLite save through the real
 * UnitRepository, then after the database is closed and reopened: getById, parse, the real loader,
 * a fresh unit store and the same observation (after). Both observations are the one shared
 * observer in scripts/lib/runtime-parity, in this same process and run.
 *
 * Cold, as C3's accepted census does it: every unit is written inside one committed transaction,
 * the database is closed and a fresh connection opened once, and the unit-store registry and tab
 * manager are cleared before any read, so nothing a read returns can come from memory. A readback
 * that differs from what was saved, or a reopened store that is the saved one, is a harness failure.
 *
 * Launched only by scripts/runtime-roundtrip/run.mjs through config/jest/runtime-roundtrip.config.js
 * (file name deliberately not *.test.*). Reads RUNTIME_ROUNDTRIP_CONTEXT (planFile, outputDirectory,
 * dbPath) and writes captured.jsonl, capture-summary.json, resources.json and sqlite-receipt.json.
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const observer = require('../lib/runtime-parity/status-observer');
observer.installMocks(); // before any product module is required

const {
  getCanonicalUnitService,
} = require('@/services/units/CanonicalUnitService');
const {
  UnitLoaderService,
} = require('@/services/units/unitLoaderService/unitLoader');
const {
  parseUnit,
} = require('@/services/units/unitLoaderService/unitContractAdapter');
const {
  serializeCustomUnitState,
} = require('@/utils/serialization/CustomUnitSerializer');
const { Era } = require('@/types/temporal/Era');
const { getSQLiteService } = require('@/services/persistence/SQLiteService');
const { UnitRepository } = require('@/services/units/UnitRepository');
const { createUnitFromFullState } = require('@/stores/unitStoreRegistry');
const { createRoundTripDiff } = require('./round-trip-diff.cjs');

const repoRoot = path.resolve(__dirname, '../..');
const o = observer.create({ repoRoot });
const context = JSON.parse(
  fs.readFileSync(process.env.RUNTIME_ROUNDTRIP_CONTEXT, 'utf8'),
);
const plans = JSON.parse(fs.readFileSync(context.planFile, 'utf8'));
const outputFile = path.join(context.outputDirectory, 'captured.jsonl');
const counts = {
  emitted: 0,
  ok: 0,
  productErrors: 0,
  infrastructureFailures: 0,
};
const sqlite = {
  written: 0,
  read: 0,
  readbackEqualToSaved: 0,
  writeTransactionCommitted: false,
  closesBeforeReads: 0,
  reopensBeforeReads: 0,
};

const harnessFailure = (message) =>
  Object.assign(new Error(message), { infrastructure: true });

beforeAll(() => {
  expect(new Set(plans.map((p) => p.unitId)).size).toBe(plans.length);
  global.fetch = o.makeTransport();
  fs.writeFileSync(outputFile, '');
});
afterAll(() => {
  o.clear();
  try {
    getSQLiteService().close();
  } catch {}
  fs.writeFileSync(
    path.join(context.outputDirectory, 'capture-summary.json'),
    JSON.stringify(counts) + '\n',
  );
  fs.writeFileSync(
    path.join(context.outputDirectory, 'sqlite-receipt.json'),
    JSON.stringify(sqlite) + '\n',
  );
  fs.writeFileSync(
    path.join(context.outputDirectory, 'resources.json'),
    JSON.stringify(process.resourceUsage()) + '\n',
  );
});

const emptyRecord = (plan) => ({
  unitId: plan.unitId,
  family: plan.family,
  path: plan.path,
  sha256: plan.sha256,
  catalog: { path: plan.catalogPath, blob: plan.catalogBlob },
  error: null,
  infrastructure: false,
});

test('canonical open, cold SQLite save and reopen, and observation at both ends for every planned unit', async () => {
  const service = getSQLiteService({ path: context.dbPath });
  assert(
    !fs.existsSync(context.dbPath),
    'the capture needs a fresh database file per run',
  );
  service.initialize();
  const db = service.getDatabase();
  const compareRoundTrip = createRoundTripDiff();
  const loader = new UnitLoaderService();

  // Phase 1: open, observe, serialize and write every unit inside one transaction.
  const pending = [];
  db.exec('BEGIN');
  for (const plan of plans) {
    o.clear();
    const item = {
      plan,
      record: emptyRecord(plan),
      stage: 'input',
      infrastructure: true,
    };
    pending.push(item);
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
      item.stage = 'open';
      item.infrastructure = false;
      const store = await o.openCanonical(entry);
      item.infrastructure = true;
      if (
        o.served.get(`/${plan.catalogPath.replace(/^public\//, '')}`) !==
        observer.sha256(bytes)
      )
        throw new Error('Canonical open did not read the joined catalog file');
      item.before = await o.observeStore(store);
      const state = store.getState();
      item.infrastructure = false;
      item.stage = 'save';
      assert(
        Array.isArray(state.unrecoveredCriticalSlots),
        'The loader did not supply the notice residual',
      );
      item.source = JSON.parse(bytes.toString('utf8'));
      item.noticeBefore = state.unrecoveredCriticalSlots;
      item.equipmentBefore = state.equipment;
      item.saved = JSON.parse(
        JSON.stringify(
          serializeCustomUnitState(state, {
            id: state.id,
            chassis: state.chassis,
            variant: state.model,
            era: Era.LATE_SUCCESSION_WARS,
          }),
        ),
      );
      item.savedStore = new WeakRef(store);
      item.stage = 'sqlite-write';
      const result = new UnitRepository().create({
        chassis: item.saved.chassis,
        variant: plan.unitId,
        data: item.saved,
      });
      if (!result.success)
        throw new Error(
          `UnitRepository.create failed: ${JSON.stringify(result.error)}`,
        );
      item.persistedId = result.data.id;
      sqlite.written++;
    } catch (error) {
      // Keep the stage and flag as they were at the point of failure; phase 2 reports them.
      if (error instanceof observer.ObservationError) {
        item.stage = `before:${error.stage}`;
        item.infrastructure = error.infrastructure;
      } else if (error.code === 'ERR_ASSERTION') item.infrastructure = true;
      item.failed = error;
    }
  }
  db.exec('COMMIT');
  sqlite.writeTransactionCommitted = true;

  // Cold: close the database, open a fresh connection, and drop everything held in memory.
  service.close();
  assert.equal(service.isInitialized(), false);
  sqlite.closesBeforeReads = 1;
  service.initialize();
  sqlite.reopensBeforeReads = 1;
  o.clear();

  // Phase 2: read every unit back from disk, reopen it and observe it again.
  for (const item of pending) {
    const { plan, record } = item;
    let { stage, infrastructure } = item;
    try {
      if (item.failed) throw item.failed;
      stage = 'cold-sqlite-read';
      infrastructure = true;
      const row = new UnitRepository().getById(item.persistedId);
      if (!row) throw harnessFailure('The cold SQLite row is missing');
      const readback = JSON.parse(row.data);
      sqlite.read++;
      assert.deepEqual(
        readback,
        item.saved,
        'The cold SQLite readback differs from what was saved',
      );
      sqlite.readbackEqualToSaved++;
      infrastructure = false;
      stage = 'contract-parse';
      const parsed = parseUnit(readback);
      stage = 'reopen';
      o.clear();
      const reopened = loader.mapToUnitState(parsed, false);
      const store = createUnitFromFullState(reopened);
      infrastructure = true;
      if (store === item.savedStore.deref())
        throw harnessFailure('The reopened store is the saved one');
      // Observe the reopened store first: its save-loss facts are part of the comparison.
      item.after = await o.observeStore(store);
      stage = 'comparison';
      infrastructure = false;
      const comparison = compareRoundTrip({
        source: item.source,
        noticeBefore: item.noticeBefore,
        equipmentBefore: item.equipmentBefore,
        reopened,
        saveLossBefore: item.before.saveLoss,
        saveLossAfter: item.after.saveLoss,
      });
      Object.assign(record, comparison, {
        before: item.before,
        after: item.after,
      });
      counts.ok++;
    } catch (error) {
      if (item.failed) {
        // A phase 1 failure: its stage and flag were recorded where it happened.
        stage = item.stage;
        infrastructure = item.infrastructure;
      } else if (error instanceof observer.ObservationError) {
        stage = `after:${error.stage}`;
        infrastructure = error.infrastructure;
      } else if (error.infrastructure || error.code === 'ERR_ASSERTION')
        infrastructure = true;
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
    item.source =
      item.saved =
      item.before =
      item.after =
      item.noticeBefore =
      item.equipmentBefore =
        null;
    if (counts.emitted % 100 === 0)
      console.log(
        'RUNTIME_ROUNDTRIP_PROGRESS',
        counts.emitted,
        'of',
        plans.length,
      );
  }
  expect(counts.emitted).toBe(plans.length);
}, 3600000);
