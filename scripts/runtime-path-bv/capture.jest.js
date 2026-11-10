/**
 * Runtime-path BV capture, load measure: committed unit JSON -> the real canonical open
 * (CanonicalUnitService -> loadUnitIntoTab -> UnitLoaderService -> mapper -> unit store) -> the
 * real status-bar hooks and UI -> BV, validity, weight and MP as the editor shows them.
 *
 * Launched only by scripts/runtime-path-bv/run.mjs through config/jest/runtime-path-bv.config.js
 * (file name deliberately not *.test.*). Reads RUNTIME_PATH_BV_CONTEXT (a JSON file written by
 * run.mjs) and writes <outputDirectory>/captured.jsonl, capture-summary.json and resources.json.
 * It does no BV math and compares nothing: run.mjs maps these records to schema rows.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});
jest.mock('@/utils/logger', () => ({
  logger: Object.fromEntries(
    ['debug', 'info', 'warn', 'error', 'log'].map((k) => [k, jest.fn()]),
  ),
}));
const toasts = [];
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: (value) => toasts.push(value) }),
}));
// Observe the real calculator's result or exception without changing either. The status bar shows 0
// when the calculation fails or the registry is not ready; this probe is how that is told from a BV.
const probe = { bv: null, status: null };
jest.mock('@/utils/construction/mechBV/calculator', () => {
  const actual = jest.requireActual('@/utils/construction/mechBV/calculator');
  return {
    ...actual,
    calculateUnitBV(...args) {
      try {
        const result = actual.calculateUnitBV.apply(this, args);
        probe.bv = { result, error: null };
        return result;
      } catch (error) {
        probe.bv = { result: null, error };
        throw error;
      }
    },
  };
});

const React = require('react');
const { act, render, cleanup } = require('@testing-library/react');
const { useUnitStore, UnitStoreContext } = require('@/stores/useUnitStore');
const { useUnitValidation } = require('@/hooks/useUnitValidation');
const {
  useUnitEditorRoutingStats,
} = require('@/components/customizer/UnitEditorWithRoutingStats');
const {
  UnitInfoBanner,
} = require('@/components/customizer/shared/UnitInfoBanner');
const {
  ValidationSummary,
} = require('@/components/customizer/shared/ValidationSummary');
const {
  getStatusNotes,
} = require('@/components/customizer/shared/unitStatStatus');
const {
  getCanonicalUnitService,
} = require('@/services/units/CanonicalUnitService');
const {
  getEquipmentRegistry,
} = require('@/services/equipment/EquipmentRegistry');
const { useTabManagerStore } = require('@/stores/useTabManagerStore');
const { mechBVTerms } = require('@/utils/construction/mechBV/bvTrace');
const {
  useMechValidationInput,
} = require('@/hooks/validation/useMechValidationInput');
const { numericTerms } = require('../vehicle-aero-bv-delta');

const repoRoot = path.resolve(__dirname, '../..');
const context = JSON.parse(
  fs.readFileSync(process.env.RUNTIME_PATH_BV_CONTEXT, 'utf8'),
);
const plans = JSON.parse(fs.readFileSync(context.planFile, 'utf8'));
const outputFile = path.join(context.outputDirectory, 'captured.jsonl');
const served = new Map();
const counts = {
  emitted: 0,
  ok: 0,
  productErrors: 0,
  infrastructureFailures: 0,
};

const sha256 = (bytes) =>
  crypto.createHash('sha256').update(bytes).digest('hex');
// Git blob id of the file bytes: proves the working-tree file is the committed object the join named.
const gitBlobId = (bytes) =>
  crypto
    .createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');

/** Serve GET /data/** from the repo's public/ directory, as the app's static server would. */
function makeTransport() {
  return async function transport(input, options = {}) {
    if (options.method && options.method !== 'GET')
      throw new Error('Read-only transport required');
    const pathname = decodeURIComponent(
      new URL(String(input), 'http://localhost').pathname,
    );
    if (!pathname.startsWith('/data/'))
      throw new Error(`Unexpected fixture request: ${pathname}`);
    const root = path.resolve(repoRoot, 'public');
    const file = path.resolve(root, pathname.slice(1));
    if (!file.startsWith(root + path.sep))
      throw new Error('Fixture path escapes source');
    if (!fs.existsSync(file))
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({}),
      };
    const bytes = fs.readFileSync(file);
    served.set(pathname, sha256(bytes));
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => JSON.parse(bytes.toString('utf8')),
    };
  };
}

/** The real canonical open, as the unit library's Load button does it. */
async function openCanonical(entry) {
  const {
    loadUnitIntoTab,
  } = require('@/components/customizer/tabs/useMultiUnitTabsController.helpers');
  const {
    getLibrarySaveStore,
  } = require('@/components/customizer/tabs/MultiUnitTabsUnitState');
  let tabId;
  await act(async () => {
    await loadUnitIntoTab({
      unit: entry,
      source: 'canonical',
      createTab() {
        throw new Error('Unexpected template fallback');
      },
      navigateToTab: (id) => {
        tabId = id;
      },
      setIsLoadDialogOpen() {},
      setIsLoadingUnit() {},
      showToast: (value) => toasts.push(value),
    });
  });
  const tab = useTabManagerStore.getState().tabs.find((t) => t.id === tabId);
  const store = tab && getLibrarySaveStore(tabId, tab.unitType);
  if (!store)
    throw new Error(`Canonical open rejected: ${JSON.stringify(toasts)}`);
  return store;
}

function StatusProbe() {
  const state = useUnitStore((s) => s);
  // Same default options and store inputs as UnitEditorWithRouting.
  const validation = useUnitValidation();
  const { unitStats } = useUnitEditorRoutingStats({
    ...state,
    unitName: state.name,
    validation,
  });
  const notes = getStatusNotes(
    unitStats.heatGenerated,
    unitStats.heatDissipation,
    unitStats.heatGeneration,
  );
  // The weight validation actually sees: the real validator input hook, read beside the status
  // bar's weightUsed. The two real paths pass different tonnage arguments to useUnitCalculations,
  // so an owner split would show here. They are compared exactly per unit (a difference is a
  // finding, never a tolerance); nothing is rebuilt or copied between them.
  const { allocatedWeight } = useMechValidationInput();
  probe.status = { validation, unitStats, allocatedWeight };
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(UnitInfoBanner, { stats: unitStats }),
    React.createElement(ValidationSummary, {
      validation,
      unitName: state.name,
      notes,
    }),
  );
}

function clear() {
  cleanup();
  jest.useRealTimers();
  require('@/stores/unitStoreRegistry').clearAllStores(true);
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
  localStorage.clear();
  toasts.length = 0;
  probe.bv = null;
  probe.status = null;
}

const issuesOf = (result) =>
  result.results.flatMap((rule) =>
    ['errors', 'warnings', 'infos'].flatMap((channel) =>
      (rule[channel] ?? []).map((issue) => ({
        ruleId: String(rule.ruleId),
        channel,
        severity: String(issue.severity),
        field: issue.field ?? null,
        message: String(issue.message),
      })),
    ),
  );

beforeAll(() => {
  expect(new Set(plans.map((p) => p.unitId)).size).toBe(plans.length);
  global.fetch = makeTransport();
  fs.writeFileSync(outputFile, '');
});
afterAll(() => {
  clear();
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
    clear();
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
      if (gitBlobId(bytes) !== plan.catalogBlob)
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
      const store = await openCanonical(entry);
      infrastructure = true;
      if (
        served.get(`/${plan.catalogPath.replace(/^public\//, '')}`) !==
        sha256(bytes)
      )
        throw new Error('Canonical open did not read the joined catalog file');
      stage = 'status-bar';
      probe.bv = null;
      probe.status = null;
      if (!getEquipmentRegistry().isReady())
        throw new Error('Equipment registry not ready');
      // Advance the real default 300ms validation debounce without wall-clock delays.
      jest.useFakeTimers({
        doNotFake: [
          'Date',
          'performance',
          'hrtime',
          'nextTick',
          'queueMicrotask',
          'setImmediate',
          'clearImmediate',
        ],
      });
      const view = render(
        React.createElement(
          UnitStoreContext.Provider,
          { value: store },
          React.createElement(StatusProbe),
        ),
      );
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000);
      });
      const status = probe.status;
      if (
        !status ||
        status.validation.isLoading ||
        status.validation.isValidating
      )
        throw new Error(
          'Status-bar validation did not settle after the real default debounce',
        );
      infrastructure = false;
      stage = 'validation';
      const native = status.validation.result;
      if (!native) throw new Error('useUnitValidation returned no result');
      infrastructure = true;
      if (!view.container.querySelector('[data-build-status]'))
        throw new Error('Status validation summary was not rendered');
      stage = 'bv';
      infrastructure = false;
      const { unitStats } = status;
      if (!Number.isFinite(unitStats.battleValue))
        throw new Error('Status-bar BV absent or nonfinite');
      const calculated = probe.bv?.result;
      let bv = null;
      let terms = null;
      if (calculated) {
        infrastructure = true;
        if (unitStats.battleValue !== calculated.bv)
          throw new Error('Status-bar BV differs from the calculator result');
        bv = calculated.bv;
        if (calculated.breakdown)
          terms = numericTerms(mechBVTerms(calculated.breakdown));
        infrastructure = false;
        for (const [name, value] of Object.entries(terms ?? {}))
          if (typeof value === 'number' && !Number.isFinite(value))
            throw new Error(`BV term ${name} is not finite`);
        infrastructure = true;
        if (
          !view
            .getByRole('group', { name: 'Battle Value' })
            .textContent.includes(unitStats.battleValue.toLocaleString())
        )
          throw new Error('Status UI does not show the status-bar BV');
      }
      for (const value of [
        unitStats.weightUsed,
        status.allocatedWeight,
        unitStats.walkMP,
        unitStats.runMP,
        unitStats.jumpMP,
      ])
        if (!Number.isFinite(value)) {
          infrastructure = false;
          throw new Error('Status-bar weight or MP absent or nonfinite');
        }
      record.observed = {
        bv,
        validity: status.validation.isValid ? 'valid' : 'invalid',
        weight: unitStats.weightUsed,
        allocatedWeight: status.allocatedWeight,
        mp: {
          walk: unitStats.walkMP,
          run: unitStats.runMP,
          jump: unitStats.jumpMP,
        },
      };
      record.terms = terms;
      record.issues = issuesOf(native);
      counts.ok++;
    } catch (error) {
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
