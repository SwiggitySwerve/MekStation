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
