/**
 * The one status-bar observer shared by the runtime-parity Jest captures (load and reopen).
 *
 * It reads what the editor shows for a unit store: BV from the status bar, validity from the real
 * validation hook after its real debounce, weight and MP from the status bar, `allocatedWeight`
 * from the real validator input hook, and the BV terms from the real calculator's result. The load
 * capture observes the freshly opened unit; the reopen capture observes the unit before and after
 * a cold save with this same function, so load BV and reopen BV are the same read by construction.
 *
 * Usage, in a capture file that jest selects (name not *.test.*):
 *   import * as observer from '../lib/runtime-parity/status-observer';   // first import of the file
 *   const o = observer.create({ repoRoot });
 *   const store = await o.openCanonical(entry);
 *   const { observed, terms, issues } = await o.observeStore(store);
 * The first import below, './install-mocks', is a side-effect module that registers the globals and
 * jest mocks; ES imports evaluate in source order, so every product module imported after it sees
 * them. A capture must import this file before any product module.
 * It does no BV math and compares nothing.
 */
import './install-mocks';
import { act, render, cleanup } from '@testing-library/react';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import React from 'react';

import { UnitInfoBanner } from '@/components/customizer/shared/UnitInfoBanner';
import { getStatusNotes } from '@/components/customizer/shared/unitStatStatus';
import { ValidationSummary } from '@/components/customizer/shared/ValidationSummary';
import { getLibrarySaveStore } from '@/components/customizer/tabs/MultiUnitTabsUnitState';
import { loadUnitIntoTab } from '@/components/customizer/tabs/useMultiUnitTabsController.helpers';
import { useUnitEditorRoutingStats } from '@/components/customizer/UnitEditorWithRoutingStats';
import { useUnitLoadDiagnostics } from '@/hooks/useUnitLoadDiagnostics';
import { useUnitValidation } from '@/hooks/useUnitValidation';
import { useMechValidationInput } from '@/hooks/validation/useMechValidationInput';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { clearAllStores } from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { useUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { mechBVTerms } from '@/utils/construction/mechBV/bvTrace';

import { numericTerms } from '../../vehicle-aero-bv-delta';
import { probe, toasts } from './install-mocks';

const sha256 = (bytes) =>
  crypto.createHash('sha256').update(bytes).digest('hex');
// Git blob id of the file bytes: proves a working-tree file is the committed object a join named.
const gitBlobId = (bytes) =>
  crypto
    .createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');

/** A failed observation, carrying the stage and whether it is a harness (not product) failure. */
class ObservationError extends Error {
  constructor(error, stage, infrastructure) {
    super(String(error?.message ?? error));
    this.name = String(error?.name ?? 'Error');
    this.stage = stage;
    this.infrastructure = infrastructure;
  }
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

/**
 * The save-loss facts exactly as the dialog receives them from useUnitLoadDiagnostics. Unknown is
 * never coerced to empty: `entries` stays null when the hook's entries are undefined.
 */
function saveLossOf(diagnostics) {
  const { entries, isRefreshing, armorSaveLoss } = diagnostics;
  return {
    settled: !isRefreshing,
    lossTrackingUnknown: entries === undefined,
    entries:
      entries === undefined
        ? null
        : entries.map(({ location, slot, text }) => ({ location, slot, text })),
    armorSaveLoss: armorSaveLoss
      ? { sourceType: String(armorSaveLoss.sourceType) }
      : null,
  };
}

function create({ repoRoot }) {
  const served = new Map();

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
    // What the save dialog is fed (MultiUnitTabs StoreValidatedSaveUnitDialog): the real
    // diagnostics hook. The dialog confirms a loss when entries is non-empty, entries is undefined
    // (lossTrackingUnknown) or armorSaveLoss is set; nothing here recomputes any of the three.
    const diagnostics = useUnitLoadDiagnostics();
    probe.status = { validation, unitStats, allocatedWeight, diagnostics };
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

  /** Reset everything a previous unit left behind: renders, timers, stores, tabs, drafts. */
  function clear() {
    cleanup();
    jest.useRealTimers();
    clearAllStores(true);
    useTabManagerStore.setState({ tabs: [], activeTabId: null });
    localStorage.clear();
    toasts.length = 0;
    probe.bv = null;
    probe.status = null;
  }

  /**
   * Render the real status probe over `store` and read BV, validity, weight, MP, terms and issues.
   * Throws ObservationError(stage, infrastructure) on any failure. The render is cleaned up after.
   */
  async function observeStore(store) {
    let stage = 'status-bar';
    let infrastructure = true;
    try {
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
      return {
        observed: {
          bv,
          validity: status.validation.isValid ? 'valid' : 'invalid',
          weight: unitStats.weightUsed,
          allocatedWeight: status.allocatedWeight,
          mp: {
            walk: unitStats.walkMP,
            run: unitStats.runMP,
            jump: unitStats.jumpMP,
          },
        },
        terms,
        issues: issuesOf(native),
        saveLoss: saveLossOf(status.diagnostics),
      };
    } catch (error) {
      throw new ObservationError(error, stage, infrastructure);
    } finally {
      cleanup();
      jest.useRealTimers();
    }
  }

  return { openCanonical, observeStore, clear, makeTransport, served, toasts };
}

export { create, ObservationError, sha256, gitBlobId };
