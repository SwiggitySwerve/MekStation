/**
 * The Structure tab's movement controls against MegaMekLab 62bf193:
 *   - a glider's jump spinner is fixed at 0 (`MovementView.java:265-268`); an ultraheavy's
 *     is not locked, and the pinned Sprite Ultraheavy units jump 3 to 5;
 *   - the walk spinner has the motive's minimum and no weight-class cap;
 *   - the Myomer Booster is enabled for every weight and disabled only for a glider
 *     (`PMChassisView.java:230-231`), so the "(Light / Medium only)" label has no pin;
 *   - the motive combo is Biped, Quad, Glider (`PMChassisView.java:75-77,135-139`), with
 *     no "Light Only" qualifier on the glider.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import {
  createProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

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

const input = (label: RegExp) =>
  screen.getByText(label).closest('div')!.querySelector('input')!;

describe('Sprite Ultraheavy (jump 5 at walk 3)', () => {
  it('has a live jump control showing its jump and its Extended Jump Jet limit', () => {
    renderTab(open('Sprite Ultraheavy ProtoMech 3.json'));
    const jump = input(/^Jump MP/);
    expect(jump).not.toBeDisabled();
    expect(jump).toHaveValue(5);
    expect(jump).toHaveAttribute('max', '5');
    expect(screen.queryByText(/Ultraheavy: 0/)).toBeNull();
  });

  it('edits its jump through the store', () => {
    const store = open('Sprite Ultraheavy ProtoMech 3.json');
    renderTab(store);
    fireEvent.change(input(/^Jump MP/), { target: { value: '3' } });
    expect(store.getState().jumpMP).toBe(3);
  });

  it('locks jump at 0 when it becomes a Glider', () => {
    const store = open('Sprite Ultraheavy ProtoMech 3.json');
    renderTab(store);
    fireEvent.click(screen.getByRole('radio', { name: /^Glider/ }));
    expect(store.getState().chassisType).toBe(ProtoChassis.GLIDER);
    expect(input(/^Jump MP/)).toBeDisabled();
    expect(input(/^Jump MP/)).toHaveValue(0);
  });
});

describe('walk control', () => {
  it('shows no weight-class cap and has the motive minimum', () => {
    renderTab(open('Siren.json'));
    expect(screen.queryByText(/cap:/)).toBeNull();
    expect(input(/^Walk MP/)).toHaveValue(10);
    expect(input(/^Walk MP/)).toHaveAttribute('min', '1');
  });

  it('has a glider minimum of 3', () => {
    renderTab(open('Svartalfa.json'));
    expect(input(/^Walk MP/)).toHaveAttribute('min', '3');
  });
});

describe('Myomer Booster', () => {
  it('has no weight-class label', () => {
    renderTab(open('Gorgon 6.json'));
    expect(screen.queryByText(/Light \/ Medium only/)).toBeNull();
    const booster = screen.getByRole('checkbox', { name: /Myomer Booster/ });
    expect(booster).toBeChecked();
    expect(booster).not.toBeDisabled();
  });

  it('is disabled for a glider and keeps its stored value', () => {
    const store = open('Svartalfa.json');
    store.getState().setMyomerBooster(true);
    renderTab(store);
    const booster = screen.getByRole('checkbox', { name: /Myomer Booster/ });
    expect(booster).toBeDisabled();
    expect(booster).toBeChecked();
    expect(store.getState().hasMyomerBooster).toBe(true);
  });
});

describe('chassis labels', () => {
  it('names the glider without a weight qualifier', () => {
    renderTab(open('Centaur.json'));
    expect(screen.getByRole('radio', { name: 'Glider' })).toBeInTheDocument();
    expect(screen.queryByText(/Light Only/)).toBeNull();
  });
});
