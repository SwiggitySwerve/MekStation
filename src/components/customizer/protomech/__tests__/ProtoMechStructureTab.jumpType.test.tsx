/**
 * The Structure tab's Jump Type control (4.1-b3c). MegaMekLab 62bf193 lists Jump Jet,
 * Extended Jump Jet System and UMU, shows the type of the mounted jets, keeps the choice at
 * jump 0, and disables the control for a glider (MovementView.java:183-193,216-222,
 * 354-355; TestEntity.java:443-447). UMU editing waits on Battle Value support, so a loaded
 * UMU unit shows UMU read-only with a note.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import {
  createProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { PROTO_JUMP_JET_TYPE } from '@/utils/construction/protomech';

import { ProtoMechStructureTab } from '../ProtoMechStructureTab';

type Store = ReturnType<typeof createProtoMechStore>;

const STD = PROTO_JUMP_JET_TYPE.STANDARD;
const XJJ = PROTO_JUMP_JET_TYPE.EXTENDED;

function open(file: string): Store {
  return createProtoMechStore(
    mapProtoMechDefinitionToState(
      JSON.parse(
        fs
          .readFileSync(
            path.join(process.cwd(), 'public/data/units/protomechs', file),
            'utf8',
          )
          .replace(/^﻿/, ''),
      ),
    ),
  );
}

function renderTab(store: Store): void {
  render(
    <ProtoMechStoreContext.Provider value={store}>
      <ProtoMechStructureTab />
    </ProtoMechStoreContext.Provider>,
  );
}

const type = () => screen.getByLabelText('Jump Type') as HTMLSelectElement;
const jump = () => screen.getByLabelText('Jump MP', { selector: 'input' });
const jets = (store: Store) =>
  store.getState().equipment.filter((m) => /JumpJet/.test(m.equipmentId));

describe('the Jump Type control', () => {
  it('offers Jump Jet and Extended Jump Jet System, and shows the mounted type', () => {
    renderTab(open('Sprite Ultraheavy ProtoMech 3.json'));
    expect(
      within(type())
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Jump Jet', 'Extended Jump Jet System']);
    expect(type()).toHaveValue(XJJ);
    expect(type()).toBeEnabled();
    expect(jump()).toHaveValue(5);
    expect(jump()).toHaveAttribute('max', '5');
  });

  it('shows the standard jet for a unit that does not jump', () => {
    renderTab(open('Centaur.json'));
    expect(type()).toHaveValue(STD);
  });

  it('choosing the standard jet on Sprite UH 3 clamps jump to walk and trims the mounts', () => {
    const store = open('Sprite Ultraheavy ProtoMech 3.json');
    renderTab(store);
    fireEvent.change(type(), { target: { value: STD } });
    expect(store.getState().jumpMP).toBe(3);
    expect(jets(store).map((m) => m.equipmentId)).toEqual([STD, STD, STD]);
    expect(jump()).toHaveValue(3);
    expect(jump()).toHaveAttribute('max', '3');
  });

  it('keeps an Extended choice at jump 0, then raising jump creates Extended jets', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 5 }),
    );
    store.getState().setWalkMP(4);
    renderTab(store);
    fireEvent.change(type(), { target: { value: XJJ } });
    expect(store.getState().jumpMP).toBe(0);
    expect(type()).toHaveValue(XJJ);
    fireEvent.change(jump(), { target: { value: '2' } });
    expect(jets(store).map((m) => m.equipmentId)).toEqual([XJJ, XJJ]);
  });

  it('is disabled for a glider', () => {
    renderTab(open('Svartalfa.json'));
    expect(type()).toBeDisabled();
  });

  it('shows a loaded UMU unit as UMU, read-only, with the reason', () => {
    const store = createProtoMechStore({
      ...createDefaultProtoMechState({ tonnage: 5 }),
      equipment: [
        {
          id: 'umu-1',
          equipmentId: 'ProtoMechUMU',
          name: 'UMU',
          location: ProtoMechLocation.TORSO,
        },
      ],
    });
    renderTab(store);
    expect(type()).toHaveValue(PROTO_JUMP_JET_TYPE.UMU);
    expect(type()).toBeDisabled();
    expect(jump()).toBeDisabled();
    expect(
      screen.getByText(/UMU editing waits on Battle Value support/i),
    ).toBeInTheDocument();
  });
});
