/**
 * Row 4.1-b retires the Glider placeholder tab: MegaMekLab 62bf193 has no such
 * tab, and glider is the motive in PMChassisView. The Structure tab already
 * carries the glider choice and its wing control; this pins that it stays.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/multi-unit-tabs/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { createDefaultProtoMechState } from '@/stores/protoMechState';
import {
  createProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { ProtoMechStructureTab } from '../ProtoMechStructureTab';

function renderGlider() {
  const store = createProtoMechStore(
    createDefaultProtoMechState({
      tonnage: 3,
      chassisType: ProtoChassis.GLIDER,
    }),
  );
  render(
    <ProtoMechStoreContext.Provider value={store}>
      <ProtoMechStructureTab />
    </ProtoMechStoreContext.Provider>,
  );
  return store;
}

it('offers the glider wings control on a glider chassis, through the store', () => {
  const store = renderGlider();
  const wings = screen.getByRole('checkbox', { name: /Gliding Wings/ });
  fireEvent.click(wings);
  expect(store.getState().glidingWings).toBe(true);
});
