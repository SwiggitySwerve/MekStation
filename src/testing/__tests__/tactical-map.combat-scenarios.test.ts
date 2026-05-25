import { applyInteractiveSessionAttack } from '@/engine/InteractiveSession.actions';
import {
  GameEventType,
  type IAttackDeclaredPayload,
  type IAttackInvalidPayload,
} from '@/types/gameplay';

import {
  tacticalMapAirborneAerospaceMinimumRangeCombatProjection,
  tacticalMapAirborneAerospaceMinimumRangeCommitInput,
  tacticalMapMediumRangeCombatProjection,
  tacticalMapMediumRangeCommitInput,
  tacticalMapMinimumRangeCombatProjection,
  tacticalMapMinimumRangeCommitInput,
  tacticalMapOutOfRangeCombatProjection,
  tacticalMapOutOfRangeCommitInput,
} from '../tactical-map.combat-scenarios';

describe('tactical map combat scenarios', () => {
  it('keeps the mixed legal browser projection aligned with committed attack declaration', () => {
    expect(tacticalMapMediumRangeCombatProjection).toMatchObject({
      hex: { q: 1, r: 2 },
      distance: 4,
      rangeBracket: 'medium',
      attackable: true,
      weaponIdsAvailable: ['medium-laser', 'extreme-lrm'],
      weaponRangeOptions: [
        {
          weaponId: 'medium-laser',
          rangeBracket: 'medium',
          available: true,
        },
        {
          weaponId: 'small-laser',
          rangeBracket: 'out_of_range',
          available: false,
          blockedReason: 'out of range',
        },
        {
          weaponId: 'minimum-lrm',
          rangeBracket: 'out_of_range',
          available: false,
          blockedReason: 'out of range',
        },
        {
          weaponId: 'extreme-lrm',
          rangeBracket: 'extreme',
          available: true,
        },
      ],
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapMediumRangeCommitInput(),
    );

    expect(
      result.events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);
    expect(
      result.events.some((event) => event.type === GameEventType.AttackLocked),
    ).toBe(true);

    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IAttackDeclaredPayload;
    expect(payload.weapons).toEqual(
      tacticalMapMediumRangeCombatProjection.weaponIdsAvailable,
    );
    expect(payload.range).toBe(
      tacticalMapMediumRangeCombatProjection.rangeBracket,
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapMediumRangeCombatProjection.toHitNumber,
    );
  });

  it('keeps the minimum-range browser projection aligned with committed to-hit modifiers', () => {
    expect(tacticalMapMinimumRangeCombatProjection).toMatchObject({
      hex: { q: 0, r: 0 },
      distance: 1,
      rangeBracket: 'short',
      attackable: true,
      minimumRangePenalty: 2,
      minimumRangeWeaponIds: ['minimum-lrm'],
      minimumRangeReason: 'Minimum range penalty +2 (minimum-lrm)',
    });
    expect(tacticalMapMinimumRangeCombatProjection.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Minimum Range',
          value: 2,
          source: 'range',
        }),
      ]),
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapMinimumRangeCommitInput(),
    );

    expect(
      result.events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);
    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IAttackDeclaredPayload;
    const minimumRangeModifier = payload.modifiers.find(
      (modifier) => modifier.name === 'Minimum Range',
    );
    expect(minimumRangeModifier).toMatchObject({
      value: tacticalMapMinimumRangeCombatProjection.minimumRangePenalty,
      source: 'range',
    });
    expect(payload.toHitNumber).toBe(
      tacticalMapMinimumRangeCombatProjection.toHitNumber,
    );
  });

  it('keeps airborne aerospace targets exempt from ground-only minimum range', () => {
    expect(
      tacticalMapAirborneAerospaceMinimumRangeCombatProjection,
    ).toMatchObject({
      hex: { q: 0, r: 0 },
      distance: 1,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['minimum-lrm'],
    });
    expect(
      tacticalMapAirborneAerospaceMinimumRangeCombatProjection.minimumRangePenalty,
    ).toBeUndefined();
    expect(
      tacticalMapAirborneAerospaceMinimumRangeCombatProjection.minimumRangeReason,
    ).toBeUndefined();
    expect(
      tacticalMapAirborneAerospaceMinimumRangeCombatProjection.toHitModifiers,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Minimum Range',
        }),
      ]),
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapAirborneAerospaceMinimumRangeCommitInput(),
    );

    expect(
      result.events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);
    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IAttackDeclaredPayload;
    expect(payload.weapons).toEqual(
      tacticalMapAirborneAerospaceMinimumRangeCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Minimum Range',
        }),
      ]),
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapAirborneAerospaceMinimumRangeCombatProjection.toHitNumber,
    );
  });

  it('keeps the all-selected-weapons-out-of-range browser projection aligned with attack commit validation', () => {
    expect(tacticalMapOutOfRangeCombatProjection).toMatchObject({
      hex: { q: 1, r: 2 },
      distance: 4,
      rangeBracket: 'out_of_range',
      inRange: false,
      attackable: false,
      weaponIdsInRange: [],
      weaponIdsAvailable: [],
      attackInvalidReason: 'OutOfRange',
      attackInvalidDetails:
        "Target at 4 hexes is outside the selected weapons' range",
      blockedReason: 'Out of weapon range',
      weaponRangeOptions: [
        {
          weaponId: 'small-laser',
          rangeBracket: 'out_of_range',
          available: false,
          blockedReason: 'out of range',
        },
        {
          weaponId: 'minimum-lrm',
          rangeBracket: 'out_of_range',
          available: false,
          blockedReason: 'out of range',
        },
      ],
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapOutOfRangeCommitInput(),
    );

    expect(
      result.events.some(
        (event) => event.type === GameEventType.AttackDeclared,
      ),
    ).toBe(false);
    expect(
      result.events.some((event) => event.type === GameEventType.AttackLocked),
    ).toBe(false);

    const invalid = result.events.find(
      (event) => event.type === GameEventType.AttackInvalid,
    );
    expect(invalid).toBeDefined();
    expect(invalid!.payload as IAttackInvalidPayload).toMatchObject({
      attackerId: 'attacker',
      targetId: 'medium-target',
      weaponId: 'small-laser',
      reason: tacticalMapOutOfRangeCombatProjection.attackInvalidReason,
      details: tacticalMapOutOfRangeCombatProjection.attackInvalidDetails,
    });
  });
});
