/**
 * Row 4.1-b retires the Glider placeholder tab, and 4.1-b2 removes the invented
 * "Gliding Wings" control. MegaMekLab 62bf193 `PMChassisView` offers, for a ProtoMech:
 * the tonnage spinner, the motive combo (biped, quad, glider; `:75-77,135-139`), the
 * Main Gun checkbox and the enhancements Myomer Booster, Partial Wing, Magnetic Clamps
 * and the interface cockpit (`:150-170`). A glider is the motive choice; there is no
 * wing control for it, and Partial Wing is equipment that MML disables for a glider
 * (`PMChassisView.java:230-234`). A glider's jump spinner is fixed at 0
 * (`MovementView.java:265-268`). This pins what the Structure tab offers instead.
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

function renderTab(chassisType: ProtoChassis, tonnage: number) {
  const store = createProtoMechStore(
    createDefaultProtoMechState({ tonnage, chassisType }),
  );
  render(
    <ProtoMechStoreContext.Provider value={store}>
      <ProtoMechStructureTab />
    </ProtoMechStoreContext.Provider>,
  );
  return store;
}

it('offers Glider as a chassis choice, through the store (the PMChassisView motive combo)', () => {
  const store = renderTab(ProtoChassis.BIPED, 3);
  fireEvent.click(screen.getByRole('radio', { name: /^Glider/ }));
  expect(store.getState().chassisType).toBe(ProtoChassis.GLIDER);
});

it.each([
  [ProtoChassis.GLIDER, 3],
  [ProtoChassis.BIPED, 5],
] as const)(
  'offers no gliding-wings control on a %s unit',
  (chassis, tonnage) => {
    renderTab(chassis, tonnage);
    expect(screen.queryByRole('checkbox', { name: /wing/i })).toBeNull();
    expect(screen.queryByText(/glider wings/i)).toBeNull();
  },
);

it("fixes a glider's jump control at 0 (MovementView.java:265-268)", () => {
  renderTab(ProtoChassis.GLIDER, 3);
  const jump = screen
    .getByText(/^Jump MP/)
    .closest('div')!
    .querySelector('input')!;
  expect(jump).toBeDisabled();
  expect(jump).toHaveAttribute('max', '0');
});
