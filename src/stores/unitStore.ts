/**
 * Unit Store - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

import { EditableUnit, createEmptyUnit } from '../types/editor';

interface UnitStoreState {
  currentUnit: EditableUnit | null;
  isDirty: boolean;
  history: EditableUnit[];
}

const state: UnitStoreState = {
  currentUnit: null,
  isDirty: false,
  history: [],
};

export function getUnitStore(): UnitStoreState {
  return state;
}

export function setCurrentUnit(unit: EditableUnit | null): void {
  state.currentUnit = unit;
  state.isDirty = false;
}

export function updateUnit(updates: Partial<EditableUnit>): void {
  if (state.currentUnit) {
    Object.assign(state.currentUnit, updates);
    state.isDirty = true;
  }
}

export function createNewUnit(tonnage: number = 50): void {
  state.currentUnit = createEmptyUnit(tonnage);
  state.isDirty = true;
}

export function clearUnit(): void {
  state.currentUnit = null;
  state.isDirty = false;
}


