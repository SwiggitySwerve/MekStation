import { TechBase } from '@/types/enums/TechBase';

import {
  createDefaultAerospaceState,
  type AerospaceState,
} from '../aerospaceState';
import { hydrateOrCreateAerospace } from '../aerospaceStoreRegistry';
import {
  getEditorDraftFingerprint,
  getEditorLibraryFingerprint,
} from '../unitSaveStateAdapters';
import fixture from './fixtures/non-mech-drafts-574f6f06f.json';
import {
  clearNonMechSaveCases,
  nonMechSaveCases,
} from './nonMechSaveState.test-support';

beforeEach(clearNonMechSaveCases);
afterEach(clearNonMechSaveCases);

it.each(nonMechSaveCases)(
  'loads and rewrites the literal old $family draft unchanged without a receipt',
  ({ family, hydrate }) => {
    const sample = fixture.cases.find((entry) => entry.family === family);
    if (!sample) throw new Error(`Missing old ${family} fixture`);
    const envelope = JSON.parse(sample.rawDraft) as {
      state: { isModified: boolean };
    };
    expect(envelope.state).not.toHaveProperty('librarySave');
    localStorage.setItem(sample.storageKey, sample.rawDraft);
    const store = hydrate();
    expect(store.getState()).not.toHaveProperty('librarySave');
    expect(store.getState().isModified).toBe(envelope.state.isModified);
    const rewrite: (patch: { isModified: boolean }) => void = store.setState;
    rewrite({ isModified: store.getState().isModified });
    expect(JSON.parse(localStorage.getItem(sample.storageKey) ?? '{}')).toEqual(
      envelope,
    );
  },
);

// Captured from U3's owner and its existing literal draft before adding the field.
// Keep these old bytes frozen; the source fixture must never be regenerated.
const OLD_AEROSPACE_DRAFT_FINGERPRINT =
  '{"aerospaceEngineType":"Fusion","aerospaceSubType":"AerospaceFighter","armorAllocation":{"Aft":0,"Left Wing":0,"Nose":0,"Right Wing":0},"armorTonnage":0,"armorType":"Standard","bombCapacity":0,"chassis":"Legacy","cockpitType":"Standard","crew":null,"doubleHeatSinks":false,"engineRating":250,"engineType":"Standard Fusion","equipment":[],"fuelTons":5,"hasBombBay":false,"hasEjectionSeat":true,"hasReinforcedCockpit":false,"heatSinks":10,"isOmni":false,"model":"aerospace","motionType":"Aerodyne","mulId":"-1","name":"Legacy aerospace","rulesLevel":"Standard","safeThrust":5,"structuralIntegrity":5,"techBase":"Inner Sphere","tonnage":50,"unitType":"Aerospace","year":3071}';

it('keeps an absent native armor type out of the literal old aerospace draft and fingerprint', () => {
  const sample = fixture.cases.find((entry) => entry.family === 'aerospace');
  if (!sample) throw new Error('Missing old aerospace fixture');
  const envelope = JSON.parse(sample.rawDraft) as { state: AerospaceState };
  const state = envelope.state;
  expect(state).not.toHaveProperty('smallCraftArmorType');
  expect(getEditorDraftFingerprint({ store: 'aerospace', state })).toBe(
    OLD_AEROSPACE_DRAFT_FINGERPRINT,
  );
  expect(
    getEditorDraftFingerprint({
      store: 'aerospace',
      state: { ...state, smallCraftArmorType: undefined },
    }),
  ).toBe(OLD_AEROSPACE_DRAFT_FINGERPRINT);
  localStorage.setItem(sample.storageKey, sample.rawDraft);
  const store = hydrateOrCreateAerospace(state.id, {
    id: state.id,
    name: state.name,
    tonnage: state.tonnage,
    techBase: state.techBase,
  });
  expect(store.getState().smallCraftArmorType).toBeUndefined();
  store.setState({ smallCraftArmorType: undefined });
  expect(localStorage.getItem(sample.storageKey)).toBe(sample.rawDraft);
  expect(
    getEditorDraftFingerprint({ store: 'aerospace', state: store.getState() }),
  ).toBe(OLD_AEROSPACE_DRAFT_FINGERPRINT);
});

it('includes meaningful native small-craft armor identity edits in both save fingerprints', () => {
  const state = createDefaultAerospaceState({
    id: '70000000-0000-4000-8000-000000000006',
    name: 'Native armor identity',
    tonnage: 200,
    techBase: TechBase.INNER_SPHERE,
    isSmallCraft: true,
  });
  const before = {
    store: 'aerospace' as const,
    state: { ...state, smallCraftArmorType: 'AEROSPACE' },
  };
  const after = {
    ...before,
    state: { ...before.state, smallCraftArmorType: 'PRIMITIVE_AERO' },
  };
  expect(getEditorDraftFingerprint(after)).not.toBe(
    getEditorDraftFingerprint(before),
  );
  expect(getEditorLibraryFingerprint(after)).not.toBe(
    getEditorLibraryFingerprint(before),
  );
});
