/**
 * Infantry cover + terrain modifier tests.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/tasks.md §10 (Cover and Terrain Modifiers)
 */

import {
  InfantryCoverType,
  infantryCoverModifier,
  sumInfantryCoverModifiers,
} from '../cover';

describe('infantryCoverModifier', () => {
  it('NONE = 0', () => {
    expect(infantryCoverModifier(InfantryCoverType.NONE)).toBe(0);
  });

  it('WOODS_LIGHT = 1', () => {
    expect(infantryCoverModifier(InfantryCoverType.WOODS_LIGHT)).toBe(1);
  });

  it('WOODS_HEAVY = 1', () => {
    expect(infantryCoverModifier(InfantryCoverType.WOODS_HEAVY)).toBe(1);
  });

  it('BUILDING_LIGHT = 2', () => {
    expect(infantryCoverModifier(InfantryCoverType.BUILDING_LIGHT)).toBe(2);
  });

  it('BUILDING_HEAVY = 3', () => {
    expect(infantryCoverModifier(InfantryCoverType.BUILDING_HEAVY)).toBe(3);
  });

  it('BUILDING_HARDENED = 4', () => {
    expect(infantryCoverModifier(InfantryCoverType.BUILDING_HARDENED)).toBe(4);
  });

  it('HULL_DOWN = 1', () => {
    expect(infantryCoverModifier(InfantryCoverType.HULL_DOWN)).toBe(1);
  });
});

describe('sumInfantryCoverModifiers', () => {
  it('empty list = 0', () => {
    expect(sumInfantryCoverModifiers([])).toBe(0);
  });

  it('single cover returns its modifier', () => {
    expect(sumInfantryCoverModifiers([InfantryCoverType.BUILDING_HEAVY])).toBe(
      3,
    );
  });

  it('stacks woods + hull-down = 2', () => {
    expect(
      sumInfantryCoverModifiers([
        InfantryCoverType.WOODS_LIGHT,
        InfantryCoverType.HULL_DOWN,
      ]),
    ).toBe(2);
  });

  it('stacks hardened building + hull-down = 5', () => {
    expect(
      sumInfantryCoverModifiers([
        InfantryCoverType.BUILDING_HARDENED,
        InfantryCoverType.HULL_DOWN,
      ]),
    ).toBe(5);
  });

  it('NONE entries contribute 0', () => {
    expect(
      sumInfantryCoverModifiers([
        InfantryCoverType.NONE,
        InfantryCoverType.WOODS_LIGHT,
        InfantryCoverType.NONE,
      ]),
    ).toBe(1);
  });
});
