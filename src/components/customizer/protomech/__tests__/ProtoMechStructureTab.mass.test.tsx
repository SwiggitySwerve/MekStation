/**
 * Ultraheavy is a mass, not a chassis (4.1-b3d), in the Structure tab and status bar.
 * MegaMekLab 62bf193 offers three motives and one 2 to 15 t tonnage spinner for all
 * (PMChassisView.java:75-79,135-139), and calls a ProtoMech ultraheavy when its tonnage
 * is above TestProtoMek.MAX_STD_TONNAGE (PMChassisView.java:205-207). A tonnage edit that
 * would leave an invalid engine is refused with a reason (PMStructureTab.java:446-456).
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
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { ProtoMechStatusBar } from '../ProtoMechStatusBar';
import { ProtoMechStructureTab } from '../ProtoMechStructureTab';

type Store = ReturnType<typeof createProtoMechStore>;

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

const tonnageSelect = () =>
  screen
    .getByText('Tonnage', { selector: 'label' })
    .closest('div')!
    .querySelector('select')!;

describe('the motive and tonnage controls', () => {
  it('offers Biped, Quad and Glider, and no Ultraheavy chassis', () => {
    renderTab(open('Sprite Ultraheavy ProtoMech 3.json'));
    const labels = screen.getAllByRole('radio').map((radio) => {
      return radio.closest('label')!.textContent;
    });
    expect(labels).toEqual(['Biped', 'Quad', 'Glider']);
  });

  it.each([
    ['Sprite Ultraheavy ProtoMech 3.json', ProtoChassis.BIPED, 15],
    ['Boggart Ultraheavy ProtoMech.json', ProtoChassis.QUAD, 13],
    ['Svartalfa.json', ProtoChassis.GLIDER, 14],
    ['Centaur.json', ProtoChassis.BIPED, 5],
  ])(
    '%s offers the same 2 to 15 t list and shows its own tonnage',
    (file, chassisType, tonnage) => {
      const store = open(file);
      renderTab(store);
      expect(store.getState().chassisType).toBe(chassisType);
      const select = tonnageSelect();
      expect(
        within(select)
          .getAllByRole('option')
          .map((option) => Number((option as HTMLOptionElement).value)),
      ).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
      expect(select).toHaveValue(String(tonnage));
    },
  );

  it('derives the Ultraheavy weight class from the tonnage, for any motive', () => {
    const quad = open('Boggart Ultraheavy ProtoMech.json');
    renderTab(quad);
    expect(
      screen.getByText('Weight Class').nextElementSibling,
    ).toHaveTextContent('Ultraheavy');
  });

  it('keeps a 13 t quad at 13 t when Quad is selected again', () => {
    const store = open('Boggart Ultraheavy ProtoMech.json');
    renderTab(store);
    fireEvent.click(screen.getByRole('radio', { name: 'Quad' }));
    expect(store.getState().tonnage).toBe(13);
  });

  it('lets a 14 t glider be set to 11 t, a tonnage the old glider list did not offer', () => {
    const glider = open('Svartalfa.json');
    renderTab(glider);
    fireEvent.change(tonnageSelect(), { target: { value: '11' } });
    expect(glider.getState().tonnage).toBe(11);
    expect(glider.getState().chassisType).toBe(ProtoChassis.GLIDER);
  });
});

describe('a tonnage edit that would leave an invalid engine', () => {
  it('is refused with the reason shown, and the tonnage and walk stay', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 2 }),
    );
    store.getState().setWalkMP(40);
    renderTab(store);
    fireEvent.change(tonnageSelect(), { target: { value: '15' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      /engine rating would be 900/i,
    );
    expect(store.getState()).toMatchObject({ tonnage: 2, walkMP: 40 });
    expect(tonnageSelect()).toHaveValue('2');
  });

  it('clears the reason after a tonnage edit that is allowed', () => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ tonnage: 2 }),
    );
    store.getState().setWalkMP(40);
    renderTab(store);
    fireEvent.change(tonnageSelect(), { target: { value: '15' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.change(tonnageSelect(), { target: { value: '3' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(store.getState()).toMatchObject({ tonnage: 3, walkMP: 40 });
  });
});

describe('the status bar', () => {
  it('shows the derived ultraheavy suffix for a 13 t quad, and none for a 5 t biped', () => {
    const quad = open('Boggart Ultraheavy ProtoMech.json');
    const { unmount } = render(
      <ProtoMechStoreContext.Provider value={quad}>
        <ProtoMechStatusBar />
      </ProtoMechStoreContext.Provider>,
    );
    expect(screen.getByText('QUAD UHVY')).toBeInTheDocument();
    unmount();
    render(
      <ProtoMechStoreContext.Provider value={open('Centaur.json')}>
        <ProtoMechStatusBar />
      </ProtoMechStoreContext.Provider>,
    );
    expect(screen.getByText('BIPED')).toBeInTheDocument();
    expect(screen.queryByText(/UHVY/)).toBeNull();
  });
});
