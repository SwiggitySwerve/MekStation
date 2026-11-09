/**
 * Jump MP in the ProtoMech Structure tab, driven through real stores built by the
 * production mapper from the pinned corpus.
 *
 * Pinned MegaMek 48fcb2f64: a glider is WiGE and ProtoMek.getJumpMP gives it no
 * bonus (ProtoMek.java:452-492); only a mounted Partial Wing adds jump (+2 in a
 * standard atmosphere, :470-487). MML 62bf193 MovementView.java:265-268 pins the
 * jump spinner of a glider at 0 and :456-465 shows "+2 (Partial wing)".
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import {
  createProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { Era } from '@/types/temporal/Era';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { serializeCustomSmallUnitState } from '@/utils/serialization/CustomUnitSerializer.smallUnits';

import { ProtoMechStructureTab } from '../ProtoMechStructureTab';

type Store = ReturnType<typeof createProtoMechStore>;

function unit(file: string): Store {
  const definition = JSON.parse(
    fs
      .readFileSync(
        path.join(process.cwd(), 'public/data/units/protomechs', file),
        'utf8',
      )
      .replace(/^﻿/, ''),
  );
  return createProtoMechStore(mapProtoMechDefinitionToState(definition));
}

function renderTab(store: Store, readOnly = false): void {
  render(
    <ProtoMechStoreContext.Provider value={store}>
      <ProtoMechStructureTab readOnly={readOnly} />
    </ProtoMechStoreContext.Provider>,
  );
}

const jumpInput = () =>
  screen
    .getByText(/^Jump MP/)
    .closest('div')!
    .querySelector('input')!;

describe('glider jump (no bonus of its own)', () => {
  it('shows no effective jump and no gliding wings control on a glider', () => {
    const store = unit('Svartalfa.json');
    expect(store.getState().chassisType).toBe(ProtoChassis.GLIDER);
    expect(store.getState().jumpMP).toBe(0);
    renderTab(store);
    expect(screen.queryByText(/Effective Jump/)).toBeNull();
    expect(screen.queryByText(/glider wings/i)).toBeNull();
    expect(
      screen.queryByRole('checkbox', { name: /Gliding Wings/ }),
    ).toBeNull();
  });

  it('pins the jump spinner at 0 for a glider (MovementView.java:265-268)', () => {
    renderTab(unit('Svartalfa.json'));
    expect(jumpInput()).toBeDisabled();
    expect(jumpInput()).toHaveAttribute('max', '0');
    expect(screen.getByText(/Jump MP/)).toHaveTextContent(/Glider/);
  });

  it('does not add 2 to a glider that stores jump MP', () => {
    const store = unit('Svartalfa.json');
    act(() => store.getState().setJumpMP(4));
    renderTab(store);
    expect(screen.queryByText(/Effective Jump/)).toBeNull();
    expect(jumpInput()).toHaveValue(4);
  });

  it('clears jump MP when a biped becomes a glider, as the spinner pin does', () => {
    const store = unit('Centaur.json');
    act(() => store.getState().setJumpMP(3));
    act(() => store.getState().setChassisType(ProtoChassis.GLIDER));
    expect(store.getState().jumpMP).toBe(0);
  });

  it('keeps jump editable on a biped', () => {
    const store = unit('Centaur.json');
    renderTab(store);
    expect(jumpInput()).not.toBeDisabled();
    fireEvent.change(jumpInput(), { target: { value: '2' } });
    expect(store.getState().jumpMP).toBe(2);
  });
});

describe('Partial Wing jump', () => {
  it('shows the stored jump plus 2 when a Partial Wing is mounted', () => {
    const store = unit('Hippogriff.json');
    expect(store.getState().jumpMP).toBe(5);
    renderTab(store);
    expect(screen.getByText(/Effective Jump/).parentElement).toHaveTextContent(
      /Effective Jump:\s*7/,
    );
    expect(screen.getByText(/Partial Wing/)).toBeInTheDocument();
  });

  it('drops the bonus when the Partial Wing is removed from the store', () => {
    const store = unit('Hippogriff.json');
    renderTab(store);
    const wing = store
      .getState()
      .equipment.find((m) => /partialwing/i.test(m.equipmentId));
    expect(wing).toBeDefined();
    act(() => store.getState().removeEquipment(wing!.id));
    expect(screen.queryByText(/Effective Jump/)).toBeNull();
    expect(store.getState().jumpMP).toBe(5);
  });

  it('keeps the wing and the stored jump through save and reopen', () => {
    const store = unit('Hippogriff.json');
    const saved = serializeCustomSmallUnitState(store.getState(), {
      id: 'flow-hippogriff',
      chassis: 'Flow Hippogriff',
      variant: 'Wing',
      era: Era.CLAN_INVASION,
    });
    const reopened = mapProtoMechDefinitionToState(
      JSON.parse(JSON.stringify(saved)),
    );
    expect(reopened.jumpMP).toBe(5);
    expect(
      reopened.equipment.some((m) => /partialwing/i.test(m.equipmentId)),
    ).toBe(true);
  });
});

describe('Gliding Wings stays an inert legacy field', () => {
  it('is kept in state and still toggles through the store, with no control', () => {
    const store = unit('Svartalfa.json');
    renderTab(store);
    expect(screen.queryByText(/Gliding Wings/)).toBeNull();
    act(() => store.getState().setGlidingWings(true));
    expect(store.getState().glidingWings).toBe(true);
  });
});
