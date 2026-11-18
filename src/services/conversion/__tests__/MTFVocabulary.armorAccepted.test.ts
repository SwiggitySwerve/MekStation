/**
 * Pins the armor names the TypeScript MTF vocabulary accepts and writes today.
 * The fixture was generated from the code BEFORE armor identity moved into the
 * shared vocabulary file, and this test passes unchanged before and after that
 * move. The Python half of the same fixture is
 * scripts/__tests__/test_armor_accepted_names.py. The two languages accept
 * different sets (the fixture shows exactly where); this test keeps each as it is.
 */
import fixture from '@/types/formats/__tests__/fixtures/armor-accepted-names.json';

import {
  formatArmorType,
  getMTFArmorIdentities,
  mapArmorType,
} from '../MTFVocabulary';

function resolve(candidate: string): string {
  const result = mapArmorType(candidate);
  return result.startsWith('UNSUPPORTED_ARMOR:') ? 'UNSUPPORTED' : result;
}

describe('TypeScript MTF armor names (pinned before the identity fold)', () => {
  it('accepts exactly the pinned candidates and resolves each to the pinned tag', () => {
    const entries = Object.entries(fixture.ts);
    expect(entries).toHaveLength(fixture.candidates.length);
    const mismatches = entries
      .map(([candidate, expected]) => [candidate, expected, resolve(candidate)])
      .filter(([, expected, actual]) => expected !== actual);
    expect(mismatches).toEqual([]);
  });

  it('writes the pinned name, or refuses, for every tag, alias and junk input', () => {
    const mismatches = Object.entries(fixture.tsExport)
      .map(([tag, expected]) => {
        let actual: string;
        try {
          actual = formatArmorType(tag);
        } catch {
          actual = 'THROWS';
        }
        return [tag, expected, actual];
      })
      .filter(([, expected, actual]) => expected !== actual);
    expect(mismatches).toEqual([]);
  });

  it('lists the pinned identities in the pinned order', () => {
    expect([...getMTFArmorIdentities()]).toEqual(fixture.tsIdentities);
  });
});
