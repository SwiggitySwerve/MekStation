/**
 * The one decoder for a stored rules level. The unit index and saved records
 * carry the contract tag ("STANDARD"); the enum's own value is "Standard".
 */
import {
  ALL_RULES_LEVELS,
  matchesRulesLevelFilter,
  parseRulesLevel,
  RULES_LEVEL_TAGS,
  RulesLevel,
} from '@/types/enums/RulesLevel';

describe('parseRulesLevel', () => {
  it.each(ALL_RULES_LEVELS)(
    'decodes %s from its tag and its value',
    (level) => {
      expect(parseRulesLevel(RULES_LEVEL_TAGS[level])).toBe(level);
      expect(parseRulesLevel(level)).toBe(level);
    },
  );

  it.each([
    ['standard', RulesLevel.STANDARD],
    ['  ADVANCED ', RulesLevel.ADVANCED],
    ['Experimental', RulesLevel.EXPERIMENTAL],
  ])('tolerates case and whitespace: %j', (value, expected) => {
    expect(parseRulesLevel(value)).toBe(expected);
  });

  it.each([undefined, null, '', '  ', 'Bogus', '2'])(
    'returns undefined for %j',
    (value) => {
      expect(parseRulesLevel(value)).toBeUndefined();
    },
  );
});

describe('matchesRulesLevelFilter', () => {
  it('matches every unit, even one with no level, when no filter is chosen', () => {
    expect(matchesRulesLevelFilter('STANDARD', '')).toBe(true);
    expect(matchesRulesLevelFilter(undefined, '')).toBe(true);
  });

  it('matches a tag filter against a tag or a display-spelled value', () => {
    expect(matchesRulesLevelFilter('STANDARD', 'STANDARD')).toBe(true);
    expect(matchesRulesLevelFilter('Standard', 'STANDARD')).toBe(true);
    expect(matchesRulesLevelFilter('STANDARD', 'Standard')).toBe(true);
  });

  it('does not match a different level, a missing level or an unknown filter', () => {
    expect(matchesRulesLevelFilter('ADVANCED', 'STANDARD')).toBe(false);
    expect(matchesRulesLevelFilter(undefined, 'STANDARD')).toBe(false);
    expect(matchesRulesLevelFilter('STANDARD', 'Bogus')).toBe(false);
  });
});
