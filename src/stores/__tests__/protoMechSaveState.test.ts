import { PROTO_ARMOR_CODES } from '@/utils/construction/protomech/armorType';

import type { ProtoMechState } from '../protoMechState';

import { createDefaultProtoMechState } from '../protoMechState';
import {
  createEditorLibrarySaveReceipt,
  getEditorDraftFingerprint,
  getEditorLibrarySavePatch,
} from '../unitSaveStateAdapters';
import { createProtoMechStore } from '../useProtoMechStore';
import legacy from './fixtures/protomech-draft-absent-armor.json';

it('preserves the literal fingerprint of an old ProtoMech draft without an armor type', () => {
  const { state } = JSON.parse(legacy.rawDraft) as { state: ProtoMechState };
  expect(state).not.toHaveProperty('armorType');
  expect(getEditorDraftFingerprint({ store: 'protomech', state })).toBe(
    legacy.draftFingerprint,
  );
  // The join rule treats an explicitly undefined optional field like absence.
  const same = { ...state };
  Object.defineProperty(same, 'armorType', { value: undefined });
  expect(getEditorDraftFingerprint({ store: 'protomech', state: same })).toBe(
    legacy.draftFingerprint,
  );
  expect(
    getEditorDraftFingerprint({
      store: 'protomech',
      state: { ...state, armorType: PROTO_ARMOR_CODES.STANDARD_PROTOMEK },
    }),
  ).not.toBe(legacy.draftFingerprint);
});

it.each([
  [PROTO_ARMOR_CODES.STANDARD_PROTOMEK, PROTO_ARMOR_CODES.ELECTRIC_DISCHARGE],
  [PROTO_ARMOR_CODES.ELECTRIC_DISCHARGE, PROTO_ARMOR_CODES.STANDARD_PROTOMEK],
])(
  'detects armor edits from %s to %s and a content-based return to the saved armor',
  (from, to) => {
    const store = createProtoMechStore(
      createDefaultProtoMechState({ name: 'Armor test', tonnage: 5 }),
    );
    store.getState().setArmorType(from);
    const saved = { store: 'protomech', state: store.getState() } as const;
    const receipt = createEditorLibrarySaveReceipt(saved, {
      id: 'saved-proto',
      version: 1,
    });
    store.setState(getEditorLibrarySavePatch(saved, receipt));
    store.getState().setArmorType(to);
    const edited = { store: 'protomech', state: store.getState() } as const;
    expect(edited.state.isModified).toBe(true);
    expect(getEditorDraftFingerprint(edited)).not.toBe(
      receipt.draftFingerprint,
    );
    expect(getEditorLibrarySavePatch(edited, receipt).isModified).toBe(true);
    // Isolate the numeric field as well as the action's equipment transition.
    expect(
      getEditorDraftFingerprint({
        ...saved,
        state: { ...saved.state, armorType: to },
      }),
    ).not.toBe(receipt.draftFingerprint);
    store.getState().setArmorType(from);
    expect(
      getEditorLibrarySavePatch(
        { store: 'protomech', state: store.getState() },
        receipt,
      ).isModified,
    ).toBe(false);
  },
);
