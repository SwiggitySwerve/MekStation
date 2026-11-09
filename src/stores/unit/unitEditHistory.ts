import { createStore, type StoreApi } from 'zustand/vanilla';

import { isUnitDraftModified } from '@/stores/unitSaveState';

import type { UnitActions, UnitStore } from '../unitState';

import {
  getUnitEditFingerprint,
  getUnitDraftFingerprint,
  type UnitEditSnapshot,
} from './unitEditSnapshot';

export interface IUnitEditHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  undo: () => void;
  redo: () => void;
}

interface IEditEntry {
  label: string;
  before: UnitEditSnapshot;
  after: UnitEditSnapshot;
}
interface IHistoryController {
  store: StoreApi<IUnitEditHistoryState>;
  run: <T>(label: string, operation: () => T) => T;
}

const histories = new WeakMap<StoreApi<UnitStore>, IHistoryController>();
const MAX_ENTRIES = 50;

function copySnapshot(state: UnitStore): UnitEditSnapshot {
  const copy = JSON.parse(getUnitEditFingerprint(state)) as UnitEditSnapshot;
  return {
    ...copy,
    role: copy.role,
    fluff: copy.fluff,
    crewSeats: copy.crewSeats,
    frankenStructure: copy.frankenStructure,
  };
}

function createHistory(unit: StoreApi<UnitStore>): IHistoryController {
  const past: IEditEntry[] = [];
  const future: IEditEntry[] = [];
  let depth = 0;
  let cleanFingerprint = unit.getState().isModified
    ? undefined
    : getUnitDraftFingerprint(unit.getState());
  const changed = (): boolean => {
    const state = unit.getState();
    const baseline = state.librarySave?.draftFingerprint ?? cleanFingerprint;
    return isUnitDraftModified(() => getUnitDraftFingerprint(state), baseline);
  };
  const publish = (): void => {
    const next = {
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      undoLabel: past.at(-1)?.label ?? null,
      redoLabel: future.at(-1)?.label ?? null,
    };
    const current = history.getState();
    if (
      current.canUndo !== next.canUndo ||
      current.canRedo !== next.canRedo ||
      current.undoLabel !== next.undoLabel ||
      current.redoLabel !== next.redoLabel
    )
      history.setState(next);
  };
  const move = (
    from: IEditEntry[],
    to: IEditEntry[],
    direction: 'before' | 'after',
  ): void => {
    const entry = from.at(-1);
    if (!entry) return;
    depth++;
    // Zustand applies state before a storage failure. Keep the cursor aligned
    // with the actual in-memory state even when persistence throws.
    from.pop();
    to.push(entry);
    try {
      const current = unit.getState();
      const patch = Object.fromEntries(
        (Object.keys(entry.before) as Array<keyof UnitEditSnapshot>)
          .filter(
            (key) =>
              JSON.stringify(entry.before[key]) !==
              JSON.stringify(entry.after[key]),
          )
          .map((key) => [key, entry[direction][key]]),
      ) as Partial<UnitEditSnapshot>;
      const restored = { ...current, ...patch };
      const baseline =
        current.librarySave?.draftFingerprint ?? cleanFingerprint;
      unit.setState({
        ...patch,
        lastModifiedAt: Date.now(),
        isModified: isUnitDraftModified(
          () => getUnitDraftFingerprint(restored),
          baseline,
        ),
      });
    } finally {
      depth--;
      publish();
    }
  };
  const history = createStore<IUnitEditHistoryState>(() => ({
    canUndo: false,
    canRedo: false,
    undoLabel: null,
    redoLabel: null,
    undo: () => move(past, future, 'before'),
    redo: () => move(future, past, 'after'),
  }));
  unit.subscribe((state) => {
    if (depth === 0 && !state.isModified)
      cleanFingerprint = getUnitDraftFingerprint(state);
  });
  return {
    store: history,
    run: <T>(label: string, operation: () => T): T => {
      if (depth > 0) return operation();
      const before = copySnapshot(unit.getState());
      const beforeFingerprint = getUnitEditFingerprint(unit.getState());
      const wasModified = unit.getState().isModified;
      depth++;
      try {
        return operation();
      } finally {
        try {
          const afterFingerprint = getUnitEditFingerprint(unit.getState());
          if (beforeFingerprint !== afterFingerprint) {
            past.push({ label, before, after: copySnapshot(unit.getState()) });
            if (past.length > MAX_ENTRIES) past.shift();
            future.length = 0;
            const isModified = changed();
            if (unit.getState().isModified !== isModified)
              unit.setState({ isModified });
          } else if (unit.getState().isModified !== wasModified) {
            unit.setState({ isModified: wasModified });
          }
        } finally {
          depth--;
          publish();
        }
      }
    },
  };
}

function controller(store: StoreApi<UnitStore>): IHistoryController {
  let result = histories.get(store);
  if (!result) {
    result = createHistory(store);
    histories.set(store, result);
  }
  return result;
}

export function getUnitEditHistory(
  store: StoreApi<UnitStore>,
): StoreApi<IUnitEditHistoryState> {
  return controller(store).store;
}

export function runUnitEditTransaction<T>(
  store: StoreApi<UnitStore>,
  label: string,
  operation: () => T,
): T {
  return controller(store).run(label, operation);
}

const labels: Partial<Record<keyof UnitActions, string>> = {
  autoAllocateArmor: 'Auto-allocate armor',
  maximizeArmor: 'Maximize armor budget',
  clearAllArmor: 'Clear armor',
  setLocationArmor: 'Change armor allocation',
  addEquipment: 'Add equipment',
  addEquipmentAtLocation: 'Add and place equipment',
  removeEquipment: 'Remove equipment',
  updateEquipmentLocation: 'Place equipment',
  bulkUpdateEquipmentLocations: 'Place equipment',
  clearEquipmentLocation: 'Unassign equipment',
  clearAllEquipment: 'Clear equipment',
  resetChassis: 'Reset chassis',
  updateFluff: 'Edit description',
  setCrewSeat: 'Assign crew seat',
  clearCrewSeat: 'Clear crew seat',
  linkAmmo: 'Link ammunition',
};

export function wrapUnitEditActions(
  actions: UnitActions,
  getStore: () => StoreApi<UnitStore>,
): UnitActions {
  // Preserve the original signatures and return values, including equipment IDs.
  return Object.fromEntries(
    Object.entries(actions).map(([name, action]) => {
      if (name === 'markModified') return [name, action];
      const label =
        labels[name as keyof UnitActions] ??
        name.replace(/^set/, 'Change').replace(/([a-z])([A-Z])/g, '$1 $2');
      return [
        name,
        (...args: unknown[]) =>
          runUnitEditTransaction(getStore(), label, () =>
            Reflect.apply(action, undefined, args),
          ),
      ];
    }),
  ) as UnitActions;
}
