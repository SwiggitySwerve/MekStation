import { renderHook } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';

import { useProtoMechMovementControls } from '@/components/customizer/protomech/ProtoMechStructureTab.logic';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import {
  createProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';

import { computeRunMP } from '../index';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
describe('ProtoMech running policy consolidation', () => {
  it.each([
    [0, 1],
    [1, 2],
    [3, 4],
    [4, 5],
    [5, 6],
  ])('preserves the existing helper at walk %s', (walk, run) => {
    expect(computeRunMP(walk)).toBe(run);
  });

  it('retains distinct existing policies before numerical correction', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 2 }),
    );
    store.getState().setCruiseMP(5);
    expect(store.getState().flankMP).toBe(7);
    store.getState().setWalkMP(5);
    expect(store.getState().flankMP).toBe(6);
    store.getState().setMyomerBooster(true);
    expect(store.getState().flankMP).toBe(7);
    expect(store.getState().walkMP).toBe(5);
    expect(store.getState().engineRating).toBe(16);
  });

  it('retains the real movement-control projection with an explicit booster', () => {
    const store = createProtoMechStore({
      ...createDefaultProtoMechState({ tonnage: 2 }),
      walkMP: 5,
      cruiseMP: 5,
      hasMyomerBooster: true,
    });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(ProtoMechStoreContext.Provider, { value: store }, children);
    const { result } = renderHook(() => useProtoMechMovementControls(false), {
      wrapper,
    });
    expect(result.current.effectiveWalk).toBe(6);
    expect(result.current.runMP).toBe(7);
  });
});
