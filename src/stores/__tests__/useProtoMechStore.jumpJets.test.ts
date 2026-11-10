/**
 * ProtoMech jump MP is the number of jump-jet mounts (4.1-b3c), through the real store.
 *
 * MegaMekLab 62bf193: the spinner adds and removes the mounts, the Jump Type combo picks
 * their type, a type change removes the other types' mounts, lowering walk or choosing a
 * glider lowers jump and so the mounts (PMStructureTab.jumpChanged :584-624,
 * jumpTypeChanged :627-637; MovementView.java:216-222,265-268,370-373).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import fs from 'node:fs';
import path from 'node:path';

import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { Era } from '@/types/temporal/Era';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  PROTO_JUMP_JET_TYPE,
  computeProtoWeight,
  getProtoMovementErrors,
  readProtoJumpJetType,
  summarizeProtoJumpEquipment,
} from '@/utils/construction/protomech';
import { serializeCustomSmallUnitState } from '@/utils/serialization/CustomUnitSerializer';

import type { ProtoMechState } from '../protoMechState';

import { createDefaultProtoMechState } from '../protoMechState';
import {
  clearAllProtoMechStores,
  hydrateOrCreateProtoMech,
} from '../protoMechStoreRegistry';
import {
  getEditorDraftFingerprint,
  getEditorLibraryFingerprint,
} from '../unitSaveStateAdapters';
import { createProtoMechStore } from '../useProtoMechStore';
import legacy from './fixtures/protomech-jump-no-mounts-legacy.json';

const STD = PROTO_JUMP_JET_TYPE.STANDARD;
const XJJ = PROTO_JUMP_JET_TYPE.EXTENDED;

const DIR = path.join(process.cwd(), 'public/data/units/protomechs');
const definitions = fs
  .readdirSync(DIR)
  .filter((file) => file !== 'index.json')
  .map((file) =>
    JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^﻿/, '')),
  );
const named = definitions.map(
  (d) => [`${d.chassis} ${d.model ?? ''}`.trim(), d] as const,
);
const jumpers = named.filter(([, d]) => d.movement.jumpMP > 0);

const jetMounts = (state: ProtoMechState) =>
  state.equipment.filter((m) =>
    /jumpjet/i.test(m.equipmentId.replace(/[^a-z]/gi, '')),
  );
const open = (file: string) =>
  createProtoMechStore(
    mapProtoMechDefinitionToState(
      JSON.parse(
        fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^﻿/, ''),
      ),
    ),
  );
const fresh = (tonnage = 5) =>
  createProtoMechStore(createDefaultProtoMechState({ tonnage }));
const mass = (state: ProtoMechState) =>
  computeProtoWeight({ ...state, weightPerUnit: state.tonnage }).total;

afterEach(() => clearAllProtoMechStores(true));

describe('the 38 canonical ProtoMechs that jump', () => {
  it('finds 38, 30 with standard jets and 8 with Extended', () => {
    expect(jumpers).toHaveLength(38);
    const types = jumpers.map(([, d]) =>
      readProtoJumpJetType(mapProtoMechDefinitionToState(d).equipment),
    );
    expect(types.filter((t) => t === STD)).toHaveLength(30);
    expect(types.filter((t) => t === XJJ)).toHaveLength(8);
  });

  it.each(jumpers)(
    '%s keeps its mounts when it re-applies its own jump type and count',
    (_name, definition) => {
      const store = createProtoMechStore(
        mapProtoMechDefinitionToState(definition),
      );
      const before = store.getState();
      // No canonical unit has a UMU, so the mounted type is one of the two editable ones.
      const type = readProtoJumpJetType(before.equipment) === XJJ ? XJJ : STD;
      expect(jetMounts(before)).toHaveLength(before.jumpMP);
      store.getState().setJumpJets({ type, count: before.jumpMP });
      store.getState().setJumpMP(before.jumpMP);
      store.getState().setWalkMP(before.walkMP);
      store.getState().setChassisType(before.chassisType);
      const after = store.getState();
      expect(after.equipment).toEqual(before.equipment);
      expect(after.jumpMP).toBe(before.jumpMP);
    },
  );

  it.each(named.filter(([, d]) => d.movement.jumpMP === 0))(
    '%s (no jump) is shown as the standard jet and has no mounts',
    (_name, definition) => {
      const state = mapProtoMechDefinitionToState(definition);
      expect(jetMounts(state)).toHaveLength(0);
      expect(readProtoJumpJetType(state.equipment)).toBe(STD);
    },
  );
});

describe('the jump spinner creates and removes the mounts', () => {
  it('adds one standard jet mount per jump MP, with the jet mass', () => {
    const store = fresh();
    store.getState().setWalkMP(4);
    const before = mass(store.getState());
    store.getState().setJumpMP(3);
    const state = store.getState();
    expect(state.jumpMP).toBe(3);
    expect(jetMounts(state)).toHaveLength(3);
    expect(new Set(state.equipment.map((m) => m.id)).size).toBe(
      state.equipment.length,
    );
    // 5 t standard jets are 0.05 t each (weight.ts propulsionMass).
    expect((mass(state) ?? 0) - (before ?? 0)).toBeCloseTo(0.15, 6);
  });

  it('removes mounts when jump goes down', () => {
    const store = fresh();
    store.getState().setWalkMP(4);
    store.getState().setJumpMP(4);
    store.getState().setJumpMP(1);
    expect(jetMounts(store.getState())).toHaveLength(1);
    store.getState().setJumpMP(0);
    expect(jetMounts(store.getState())).toHaveLength(0);
  });

  it('trims the mounts when walk drops below the jump', () => {
    const store = fresh();
    store.getState().setWalkMP(6);
    store.getState().setJumpMP(6);
    store.getState().setWalkMP(3);
    expect(store.getState().jumpMP).toBe(3);
    expect(jetMounts(store.getState())).toHaveLength(3);
  });

  it('removes every jump mount when the unit becomes a glider', () => {
    const store = fresh(3);
    store.getState().setWalkMP(4);
    store.getState().setJumpMP(3);
    store.getState().setChassisType(ProtoChassis.GLIDER);
    expect(store.getState().jumpMP).toBe(0);
    expect(jetMounts(store.getState())).toHaveLength(0);
  });
});

describe('the jump-jet type', () => {
  it('Extended raises the limit to 1.5 times walk and doubles the jet mass', () => {
    const store = fresh();
    store.getState().setWalkMP(4);
    store.getState().setJumpJets({ type: XJJ, count: 4 });
    expect(jetMounts(store.getState()).map((m) => m.equipmentId)).toEqual([
      XJJ,
      XJJ,
      XJJ,
      XJJ,
    ]);
    const std = fresh();
    std.getState().setWalkMP(4);
    std.getState().setJumpJets({ type: STD, count: 4 });
    // Four Extended jets are 0.1 t each, four standard jets 0.05 t each (5 t).
    expect(
      (mass(store.getState()) ?? 0) - (mass(std.getState()) ?? 0),
    ).toBeCloseTo(0.2, 6);
    store.getState().setJumpMP(99);
    expect(store.getState().jumpMP).toBe(6); // ceil(1.5 x 4)
    expect(jetMounts(store.getState())).toHaveLength(6);
  });

  it('Extended to standard with jump above walk clamps jump to walk and trims', () => {
    const store = fresh();
    store.getState().setWalkMP(3);
    store.getState().setJumpJets({ type: XJJ, count: 3 });
    store.getState().setJumpMP(5);
    expect(store.getState().jumpMP).toBe(5);
    store.getState().setJumpJets({ type: STD, count: 5 });
    expect(store.getState().jumpMP).toBe(3);
    expect(jetMounts(store.getState()).map((m) => m.equipmentId)).toEqual([
      STD,
      STD,
      STD,
    ]);
  });

  it('a type chosen at jump 0 creates no mount and no stored jump', () => {
    const store = fresh();
    store.getState().setJumpJets({ type: XJJ, count: 0 });
    expect(store.getState().jumpMP).toBe(0);
    expect(jetMounts(store.getState())).toHaveLength(0);
  });

  it('a glider cannot take jump jets', () => {
    const store = fresh(3);
    store.getState().setChassisType(ProtoChassis.GLIDER);
    store.getState().setJumpJets({ type: STD, count: 2 });
    expect(store.getState().jumpMP).toBe(0);
    expect(jetMounts(store.getState())).toHaveLength(0);
  });

  it('no reachable walk, type and jump is a movement error for the verifier', () => {
    for (const type of [STD, XJJ]) {
      for (let walk = 1; walk <= 6; walk++) {
        for (let jump = 0; jump <= 10; jump++) {
          const store = fresh();
          store.getState().setWalkMP(walk);
          store.getState().setJumpJets({ type, count: jump });
          const state = store.getState();
          expect(
            getProtoMovementErrors({
              walk: state.walkMP,
              jump: state.jumpMP,
              quad: false,
              glider: false,
              ...summarizeProtoJumpEquipment(state.equipment),
            }),
          ).toEqual([]);
          expect(jetMounts(state)).toHaveLength(state.jumpMP);
        }
      }
    }
  });
});

describe('save and reopen', () => {
  it.each([
    [STD, 3],
    [XJJ, 5],
  ])('keeps a created %s ×%s through save and reopen', (type, count) => {
    const store = fresh();
    store.getState().setWalkMP(4);
    store.getState().setJumpJets({ type, count });
    const saved = serializeCustomSmallUnitState(store.getState(), {
      id: 'jump-jets',
      chassis: 'Jump Jets',
      variant: 'Probe',
      era: Era.CLAN_INVASION,
    });
    const reopened = mapProtoMechDefinitionToState(
      JSON.parse(JSON.stringify(saved)),
    );
    expect(reopened.jumpMP).toBe(count);
    expect(readProtoJumpJetType(reopened.equipment)).toBe(type);
    expect(jetMounts(reopened)).toHaveLength(count);
  });

  it('Sprite Ultraheavy 3 (five Extended jets) round-trips and trims with its walk', () => {
    const store = open('Sprite Ultraheavy ProtoMech 3.json');
    expect(readProtoJumpJetType(store.getState().equipment)).toBe(XJJ);
    expect(jetMounts(store.getState())).toHaveLength(5);
    store.getState().setJumpJets({ type: STD, count: 5 });
    expect(store.getState().jumpMP).toBe(3);
    expect(jetMounts(store.getState())).toHaveLength(3);
  });
});

// An old unit's jump is a number with no mounts; reading or re-applying values must not
// invent mounts, and its stored fingerprints must still match (literals captured from the
// code before this change, never regenerated).
describe('an old unit with a jump value and no jump mounts', () => {
  const saved = (JSON.parse(legacy.rawDraft) as { state: ProtoMechState })
    .state;

  it('hydrates unchanged and keeps its stored fingerprints', () => {
    localStorage.setItem(`megamek-protomech-${saved.id}`, legacy.rawDraft);
    const state = hydrateOrCreateProtoMech(saved.id, {
      tonnage: 5,
    }).getState();
    expect(state.jumpMP).toBe(3);
    expect(jetMounts(state)).toHaveLength(0);
    expect(getEditorDraftFingerprint({ store: 'protomech', state })).toBe(
      legacy.draftFingerprint,
    );
    expect(getEditorLibraryFingerprint({ store: 'protomech', state })).toBe(
      legacy.libraryFingerprint,
    );
  });

  it('reopens from the library record unchanged', () => {
    const state = mapProtoMechDefinitionToState(
      JSON.parse(JSON.stringify(legacy.libraryRecord)),
    );
    expect(state.jumpMP).toBe(3);
    expect(jetMounts(state)).toHaveLength(0);
    expect(getEditorLibraryFingerprint({ store: 'protomech', state })).toBe(
      legacy.libraryFingerprint,
    );
  });

  it('re-applying its own values creates no mounts; a real jump edit does', () => {
    const store = createProtoMechStore(saved);
    store.getState().setWalkMP(saved.walkMP);
    store.getState().setJumpMP(saved.jumpMP);
    expect(jetMounts(store.getState())).toHaveLength(0);
    store.getState().setJumpMP(2);
    expect(jetMounts(store.getState())).toHaveLength(2);
  });
});
