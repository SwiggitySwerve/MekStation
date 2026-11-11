/**
 * Read-point hooks for the one owner of `projectEditableMech`'s input
 * (`buildEditableMechProjectionInput`). Every editor read point that needs the projection input gets
 * it here, from the unit's state; none lists the fields by hand.
 *
 * - `useEditableMechProjectionInput` reads the active unit store (record sheet read points).
 * - `useStableEditableMechProjectionInput` takes a props-style state (the status-bar stats hook,
 *   whose public parameters are the unit state's fields) and keeps the result referentially stable.
 *
 * Both return a stable object while no projection field changes, so memos keyed on it recompute
 * only when the BV inputs change.
 */
import { useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { shallow } from 'zustand/shallow';

import {
  buildEditableMechProjectionInput,
  type IEditableMechProjectionInput,
} from '@/services/construction/editableMechProjection';
import { useUnitStore, type UnitStore } from '@/stores/useUnitStore';

/** The owner's pick over the unit store's state, with the store's own field types. */
export type UnitStoreProjectionInput = ReturnType<
  typeof buildEditableMechProjectionInput<UnitStore>
>;

export function useEditableMechProjectionInput(): UnitStoreProjectionInput {
  return useUnitStore(useShallow(buildEditableMechProjectionInput<UnitStore>));
}

export function useStableEditableMechProjectionInput<
  S extends IEditableMechProjectionInput,
>(source: S): ReturnType<typeof buildEditableMechProjectionInput<S>> {
  const next = buildEditableMechProjectionInput(source);
  const previous = useRef(next);
  if (!shallow(previous.current, next)) previous.current = next;
  return previous.current;
}
