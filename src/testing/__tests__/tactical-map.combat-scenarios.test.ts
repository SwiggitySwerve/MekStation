import { applyInteractiveSessionAttack } from '@/engine/InteractiveSession.actions';
import {
  GameEventType,
  type IAttackDeclaredPayload,
  type IAttackInvalidPayload,
  type IIndirectFireNarcOverridePayload,
} from '@/types/gameplay';

import {
  tacticalMapOutOfArcCombatProjection,
  tacticalMapOutOfArcCommitInput,
} from '../tactical-map.arc-scenarios';
import {
  tacticalMapC3RangeBenefitCombatProjection,
  tacticalMapC3RangeBenefitCommitInput,
} from '../tactical-map.c3-scenario';
import {
  tacticalMapAirborneAerospaceMinimumRangeCombatProjection,
  tacticalMapAirborneAerospaceMinimumRangeCommitInput,
  tacticalMapBlockedLosCombatProjection,
  tacticalMapBlockedLosCommitInput,
  tacticalMapMediumRangeCombatProjection,
  tacticalMapMediumRangeCommitInput,
  tacticalMapMinimumRangeCombatProjection,
  tacticalMapMinimumRangeCommitInput,
  tacticalMapOutOfRangeCombatProjection,
  tacticalMapOutOfRangeCommitInput,
} from '../tactical-map.combat-scenarios';
import {
  tacticalMapElevationCoverCombatProjection,
  tacticalMapElevationCoverCommitInput,
  tacticalMapElevationCoverTargetId,
  tacticalMapElevationLosCombatProjection,
  tacticalMapElevationLosCommitInput,
  tacticalMapElevationLosTargetId,
  tacticalMapWoodsLosCombatProjection,
  tacticalMapWoodsLosCommitInput,
  tacticalMapWoodsLosTargetId,
} from '../tactical-map.elevation-los-scenario';
import {
  tacticalMapHeatCombatCommitInput,
  tacticalMapHeatCombatProjection,
} from '../tactical-map.heat-combat-scenario';
import {
  tacticalMapImmobileCombatCommitInput,
  tacticalMapImmobileCombatProjection,
} from '../tactical-map.immobile-combat-scenario';
import {
  tacticalMapForwardObserverIndirectFireCombatProjection,
  tacticalMapForwardObserverIndirectFireCommitInput,
  tacticalMapINarcBeaconIndirectFireCombatProjection,
  tacticalMapINarcBeaconIndirectFireCommitInput,
  tacticalMapIndirectFireCombatProjection,
  tacticalMapIndirectFireCommitInput,
  tacticalMapNarcBeaconIndirectFireCombatProjection,
  tacticalMapNarcBeaconIndirectFireCommitInput,
} from '../tactical-map.indirect-fire-scenario';
import {
  tacticalMapJumpCombatCommitInput,
  tacticalMapJumpCombatProjection,
  tacticalMapMovementCombatCommitInput,
  tacticalMapMovementCombatProjection,
  tacticalMapWalkCombatCommitInput,
  tacticalMapWalkCombatProjection,
} from '../tactical-map.movement-combat-scenario';
import {
  tacticalMapProneCombatCommitInput,
  tacticalMapProneCombatProjection,
} from '../tactical-map.prone-combat-scenario';
import {
  tacticalMapSameHexCombatProjection,
  tacticalMapSameHexCommitInput,
} from '../tactical-map.same-hex-scenarios';
import {
  tacticalMapStackedLosCombatProjection,
  tacticalMapStackedLosCommitInput,
  tacticalMapStackedLosTargetId,
} from '../tactical-map.stacked-los-scenario';
import {
  tacticalMapTargetTerrainModifierCombatProjection,
  tacticalMapTargetTerrainModifierCommitInput,
} from '../tactical-map.target-terrain-scenarios';
import {
  tacticalMapFogLosCombatProjection,
  tacticalMapFogLosCommitInput,
  tacticalMapFogLosTargetId,
  tacticalMapFogLosTokens,
  tacticalMapFogLosVisibleTokens,
  tacticalMapMixedVisibilityCombatProjection,
  tacticalMapMixedVisibilityCommitInput,
} from '../tactical-map.visibility-scenarios';

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

  it('keeps C3 range benefit aligned between browser projection and committed attack', () => {
    expect(tacticalMapC3RangeBenefitCombatProjection).toMatchObject({
      hex: { q: 1, r: 2 },
      distance: 4,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      c3BenefitApplied: true,
      c3SpotterId: 'c3-spotter',
      c3SpotterRange: 1,
    });
    expect(tacticalMapC3RangeBenefitCombatProjection.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'C3 Network',
          value: 0,
          source: 'equipment',
        }),
      ]),
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapC3RangeBenefitCommitInput(),
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
      tacticalMapC3RangeBenefitCombatProjection.weaponIdsAvailable,
    );
    expect(payload.range).toBe(
      tacticalMapC3RangeBenefitCombatProjection.rangeBracket,
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapC3RangeBenefitCombatProjection.toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'C3 Network',
          value: 0,
          source: 'equipment',
        }),
      ]),
    );
  });

  it('keeps LOS-spotter indirect fire aligned between browser projection and committed attack', () => {
    expect(tacticalMapIndirectFireCombatProjection).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      losState: 'blocked',
      rangeBracket: 'medium',
      attackable: true,
      weaponIdsAvailable: ['minimum-lrm'],
      indirectFireAvailable: true,
      indirectFireSpotterId: 'indirect-spotter',
      indirectFireBasis: 'los',
      indirectFireToHitPenalty: 1,
      indirectFireReason: 'Indirect fire via spotter indirect-spotter (+1)',
    });
    expect(tacticalMapIndirectFireCombatProjection.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Indirect fire',
          value: 1,
          source: 'other',
        }),
      ]),
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapIndirectFireCommitInput(),
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
      tacticalMapIndirectFireCombatProjection.weaponIdsAvailable,
    );
    expect(payload.range).toBe(
      tacticalMapIndirectFireCombatProjection.rangeBracket,
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapIndirectFireCombatProjection.toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Indirect fire',
          value: 1,
          source: 'other',
        }),
      ]),
    );
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: GameEventType.IndirectFireSpotterSelected,
          payload: expect.objectContaining({
            attackerId: 'attacker',
            targetHex: { q: 3, r: 0 },
            weaponId: 'minimum-lrm',
            spotterId: 'indirect-spotter',
            basis: 'los',
            toHitPenalty: 1,
          }),
        }),
      ]),
    );
  });

  it('keeps Forward Observer indirect-fire cancellation aligned between browser projection and committed attack', () => {
    expect(
      tacticalMapForwardObserverIndirectFireCombatProjection,
    ).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      losState: 'blocked',
      rangeBracket: 'medium',
      attackable: true,
      weaponIdsAvailable: ['minimum-lrm'],
      indirectFireAvailable: true,
      indirectFireSpotterId: 'indirect-spotter',
      indirectFireBasis: 'los',
      indirectFireToHitPenalty: 1,
      indirectFireForwardObserver: true,
      indirectFirePenaltyCancelled: 1,
      indirectFireReason:
        'Indirect fire via spotter indirect-spotter (+1); Forward Observer cancels walked spotter penalty',
    });
    expect(
      tacticalMapForwardObserverIndirectFireCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Indirect fire',
          value: 1,
          source: 'other',
        }),
      ]),
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapForwardObserverIndirectFireCommitInput(),
    );

    expect(
      result.events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);
    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IAttackDeclaredPayload;
    expect(payload.toHitNumber).toBe(
      tacticalMapForwardObserverIndirectFireCombatProjection.toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Indirect fire',
          value: 1,
          source: 'other',
        }),
      ]),
    );
    expect(result.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: GameEventType.IndirectFireSpotterSelected,
          payload: expect.objectContaining({
            attackerId: 'attacker',
            targetHex: { q: 3, r: 0 },
            weaponId: 'minimum-lrm',
            spotterId: 'indirect-spotter',
            basis: 'los',
            toHitPenalty: 1,
          }),
        }),
        expect.objectContaining({
          type: GameEventType.IndirectFireForwardObserver,
          payload: expect.objectContaining({
            attackerId: 'attacker',
            targetHex: { q: 3, r: 0 },
            weaponId: 'minimum-lrm',
            spotterId: 'indirect-spotter',
            basis: 'los',
            toHitPenalty: 1,
            penaltyCancelled: 1,
          }),
        }),
      ]),
    );
  });

  it('keeps NARC beacon indirect fire aligned between browser projection and committed attack', () => {
    expect(tacticalMapNarcBeaconIndirectFireCombatProjection).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      losState: 'blocked',
      rangeBracket: 'medium',
      attackable: true,
      weaponIdsAvailable: ['minimum-lrm'],
      indirectFireAvailable: true,
      indirectFireSpotterId: null,
      indirectFireBasis: 'narc',
      indirectFireToHitPenalty: 1,
      indirectFireReason: 'Indirect fire via NARC beacon (+1)',
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapNarcBeaconIndirectFireCommitInput(),
    );

    expect(
      result.events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);
    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IAttackDeclaredPayload;
    expect(payload.toHitNumber).toBe(
      tacticalMapNarcBeaconIndirectFireCombatProjection.toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Indirect fire',
          value: 1,
          source: 'other',
        }),
      ]),
    );
    expect(
      result.events.some(
        (event) => event.type === GameEventType.IndirectFireSpotterSelected,
      ),
    ).toBe(false);
    const override = result.events.find(
      (event) => event.type === GameEventType.IndirectFireNarcOverride,
    );
    expect(override).toBeDefined();
    expect(override!.payload as IIndirectFireNarcOverridePayload).toMatchObject(
      {
        attackerId: 'attacker',
        targetHex: { q: 3, r: 0 },
        weaponId: 'minimum-lrm',
        spotterId: null,
        basis: 'narc',
        toHitPenalty:
          tacticalMapNarcBeaconIndirectFireCombatProjection.indirectFireToHitPenalty,
      },
    );
  });

  it('keeps iNarc beacon indirect fire aligned between browser projection and committed attack', () => {
    expect(tacticalMapINarcBeaconIndirectFireCombatProjection).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      losState: 'blocked',
      rangeBracket: 'medium',
      attackable: true,
      weaponIdsAvailable: ['minimum-lrm'],
      indirectFireAvailable: true,
      indirectFireSpotterId: null,
      indirectFireBasis: 'inarc',
      indirectFireToHitPenalty: 1,
      indirectFireReason: 'Indirect fire via INARC beacon (+1)',
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapINarcBeaconIndirectFireCommitInput(),
    );

    expect(
      result.events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);
    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IAttackDeclaredPayload;
    expect(payload.toHitNumber).toBe(
      tacticalMapINarcBeaconIndirectFireCombatProjection.toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Indirect fire',
          value: 1,
          source: 'other',
        }),
      ]),
    );
    expect(
      result.events.some(
        (event) => event.type === GameEventType.IndirectFireSpotterSelected,
      ),
    ).toBe(false);
    const override = result.events.find(
      (event) => event.type === GameEventType.IndirectFireNarcOverride,
    );
    expect(override).toBeDefined();
    expect(override!.payload as IIndirectFireNarcOverridePayload).toMatchObject(
      {
        attackerId: 'attacker',
        targetHex: { q: 3, r: 0 },
        weaponId: 'minimum-lrm',
        spotterId: null,
        basis: 'inarc',
        toHitPenalty:
          tacticalMapINarcBeaconIndirectFireCombatProjection.indirectFireToHitPenalty,
      },
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

  it('keeps target-hex terrain modifiers aligned between browser projection and commit', () => {
    expect(tacticalMapTargetTerrainModifierCombatProjection).toMatchObject({
      hex: { q: 0, r: 1 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      targetCoverModifier: 0,
      targetPartialCover: false,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 5,
    });
    expect(
      tacticalMapTargetTerrainModifierCombatProjection.toHitModifiers,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Terrain',
          value: 1,
          source: 'terrain',
          description: 'Target in light woods: +1',
        }),
      ]),
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapTargetTerrainModifierCommitInput(),
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
      tacticalMapTargetTerrainModifierCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Terrain',
          value: 1,
          source: 'terrain',
          description: 'Target in light woods: +1',
        }),
      ]),
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapTargetTerrainModifierCombatProjection.toHitNumber,
    );
  });

  it('keeps prone attacker and target modifiers aligned between browser projection and commit', () => {
    expect(tacticalMapProneCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 7,
    });
    expect(tacticalMapProneCombatProjection.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Attacker Prone',
          value: 2,
          source: 'other',
        }),
        expect.objectContaining({
          name: 'Target Prone',
          value: 1,
          source: 'other',
        }),
      ]),
    );
    expect(tacticalMapProneCombatProjection.toHitReason).toContain(
      'Attacker Prone +2',
    );
    expect(tacticalMapProneCombatProjection.toHitReason).toContain(
      'Target Prone +1',
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapProneCombatCommitInput(),
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
      tacticalMapProneCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Attacker Prone',
          value: 2,
          source: 'other',
        }),
        expect.objectContaining({
          name: 'Target Prone',
          value: 1,
          source: 'other',
        }),
      ]),
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapProneCombatProjection.toHitNumber,
    );
  });

  it('keeps shutdown target immobile modifiers aligned between browser projection and commit', () => {
    expect(tacticalMapImmobileCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 0,
    });
    expect(tacticalMapImmobileCombatProjection.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Immobile',
          value: -4,
          source: 'other',
        }),
      ]),
    );
    expect(tacticalMapImmobileCombatProjection.toHitReason).toContain(
      'Target Immobile -4',
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapImmobileCombatCommitInput(),
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
      tacticalMapImmobileCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Target Immobile',
          value: -4,
          source: 'other',
        }),
      ]),
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapImmobileCombatProjection.toHitNumber,
    );
  });

  it('keeps hot attacker to-hit modifiers aligned between browser projection and commit', () => {
    expect(tacticalMapHeatCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 6,
    });
    expect(tacticalMapHeatCombatProjection.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Heat',
          value: 2,
          source: 'heat',
          description: 'Heat 13: +2',
        }),
      ]),
    );
    expect(tacticalMapHeatCombatProjection.toHitReason).toContain('Heat +2');

    const result = applyInteractiveSessionAttack(
      tacticalMapHeatCombatCommitInput(),
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
      tacticalMapHeatCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Heat',
          value: 2,
          source: 'heat',
          description: 'Heat 13: +2',
        }),
      ]),
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapHeatCombatProjection.toHitNumber,
    );
  });

  it('keeps attacker and target movement to-hit modifiers aligned between browser projection and commit', () => {
    expect(tacticalMapMovementCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 8,
    });
    expect(tacticalMapMovementCombatProjection.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Attacker Movement',
          value: 2,
          source: 'attacker_movement',
          description: 'Attacker run: +2',
        }),
        expect.objectContaining({
          name: 'Target Movement (TMM)',
          value: 2,
          source: 'target_movement',
          description: 'Target moved 5 hexes: +2',
        }),
      ]),
    );
    expect(tacticalMapMovementCombatProjection.toHitReason).toContain(
      'Attacker Movement +2',
    );
    expect(tacticalMapMovementCombatProjection.toHitReason).toContain(
      'Target Movement (TMM) +2',
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapMovementCombatCommitInput(),
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
      tacticalMapMovementCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      tacticalMapMovementCombatProjection.toHitModifiers,
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapMovementCombatProjection.toHitNumber,
    );
  });

  it('keeps walked attacker and target movement to-hit modifiers aligned between browser projection and commit', () => {
    expect(tacticalMapWalkCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 6,
    });
    expect(tacticalMapWalkCombatProjection.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Attacker Movement',
          value: 1,
          source: 'attacker_movement',
          description: 'Attacker walk: +1',
        }),
        expect.objectContaining({
          name: 'Target Movement (TMM)',
          value: 1,
          source: 'target_movement',
          description: 'Target moved 3 hexes: +1',
        }),
      ]),
    );
    expect(tacticalMapWalkCombatProjection.toHitReason).toContain(
      'Attacker Movement +1',
    );
    expect(tacticalMapWalkCombatProjection.toHitReason).toContain(
      'Target Movement (TMM) +1',
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapWalkCombatCommitInput(),
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
      tacticalMapWalkCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      tacticalMapWalkCombatProjection.toHitModifiers,
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapWalkCombatProjection.toHitNumber,
    );
  });

  it('keeps jumped attacker and target movement to-hit modifiers aligned between browser projection and commit', () => {
    expect(tacticalMapJumpCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      attackable: true,
      weaponIdsAvailable: ['medium-laser'],
      toHitNumber: 11,
    });
    expect(tacticalMapJumpCombatProjection.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Attacker Movement',
          value: 3,
          source: 'attacker_movement',
          description: 'Attacker jump: +3',
        }),
        expect.objectContaining({
          name: 'Target Movement (TMM)',
          value: 4,
          source: 'target_movement',
          description: 'Target moved 7 hexes (jumped): +4',
        }),
      ]),
    );
    expect(tacticalMapJumpCombatProjection.toHitReason).toContain(
      'Attacker Movement +3',
    );
    expect(tacticalMapJumpCombatProjection.toHitReason).toContain(
      'Target Movement (TMM) +4',
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapJumpCombatCommitInput(),
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
      tacticalMapJumpCombatProjection.weaponIdsAvailable,
    );
    expect(payload.modifiers).toEqual(
      tacticalMapJumpCombatProjection.toHitModifiers,
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapJumpCombatProjection.toHitNumber,
    );
  });

  it('keeps LOS-blocked browser projection aligned with attack commit validation', () => {
    expect(tacticalMapBlockedLosCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 3,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'blocked',
      attackable: false,
      targetUnitIds: ['blocked-target'],
      validTargetUnitIds: [],
      weaponIdsAvailable: [
        'medium-laser',
        'small-laser',
        'minimum-lrm',
        'extreme-lrm',
      ],
      attackInvalidReason: 'NoLineOfSight',
      attackInvalidDetails: 'Blocked by building at (1, 0)',
      blockedReason: 'Blocked by building at (1, 0)',
      lineOfSightBlockerReason: 'Blocked by building at (1, 0)',
      lineOfSightBlocker: {
        hex: { q: 1, r: 0 },
        kind: 'terrain',
        terrain: 'building',
        reason: 'Blocked by building at (1, 0)',
      },
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapBlockedLosCommitInput(),
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
      targetId: 'blocked-target',
      weaponId: 'medium-laser',
      reason: tacticalMapBlockedLosCombatProjection.attackInvalidReason,
      details: tacticalMapBlockedLosCombatProjection.attackInvalidDetails,
    });
  });

  it('keeps elevation LOS browser projection aligned with attack commit validation', () => {
    expect(tacticalMapElevationLosCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'blocked',
      attackable: false,
      targetUnitIds: [tacticalMapElevationLosTargetId],
      validTargetUnitIds: [],
      weaponIdsAvailable: ['medium-laser'],
      attackInvalidReason: 'NoLineOfSight',
      attackInvalidDetails: 'Blocked by elevation +2 at (1, 0)',
      blockedReason: 'Blocked by elevation +2 at (1, 0)',
      lineOfSightBlockerReason: 'Blocked by elevation +2 at (1, 0)',
      lineOfSightBlocker: {
        hex: { q: 1, r: 0 },
        kind: 'elevation',
        reason: 'Blocked by elevation +2 at (1, 0)',
      },
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapElevationLosCommitInput(),
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
      targetId: tacticalMapElevationLosTargetId,
      weaponId: 'medium-laser',
      reason: tacticalMapElevationLosCombatProjection.attackInvalidReason,
      details: tacticalMapElevationLosCombatProjection.attackInvalidDetails,
    });
  });

  it('keeps cumulative woods LOS browser projection aligned with attack commit validation', () => {
    expect(tacticalMapWoodsLosCombatProjection).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'blocked',
      attackable: false,
      targetUnitIds: [tacticalMapWoodsLosTargetId],
      validTargetUnitIds: [],
      weaponIdsAvailable: ['medium-laser'],
      attackInvalidReason: 'NoLineOfSight',
      attackInvalidDetails: 'Blocked by heavy woods at (2, 0)',
      blockedReason: 'Blocked by heavy woods at (2, 0)',
      lineOfSightBlockerReason: 'Blocked by heavy woods at (2, 0)',
      lineOfSightBlocker: {
        hex: { q: 2, r: 0 },
        kind: 'terrain',
        terrain: 'heavy_woods',
        reason: 'Blocked by heavy woods at (2, 0)',
      },
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapWoodsLosCommitInput(),
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
      targetId: tacticalMapWoodsLosTargetId,
      weaponId: 'medium-laser',
      reason: tacticalMapWoodsLosCombatProjection.attackInvalidReason,
      details: tacticalMapWoodsLosCombatProjection.attackInvalidDetails,
    });
  });

  it('keeps stacked smoke and woods LOS projection aligned with attack commit validation', () => {
    expect(tacticalMapStackedLosCombatProjection).toMatchObject({
      hex: { q: 2, r: 0 },
      distance: 2,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'blocked',
      attackable: false,
      targetUnitIds: [tacticalMapStackedLosTargetId],
      validTargetUnitIds: [],
      weaponIdsAvailable: ['medium-laser'],
      attackInvalidReason: 'NoLineOfSight',
      attackInvalidDetails: 'Blocked by heavy woods and smoke at (1, 0)',
      blockedReason: 'Blocked by heavy woods and smoke at (1, 0)',
      lineOfSightBlockerReason: 'Blocked by heavy woods and smoke at (1, 0)',
      lineOfSightBlocker: {
        hex: { q: 1, r: 0 },
        kind: 'terrain',
        terrain: 'smoke',
        reason: 'Blocked by heavy woods and smoke at (1, 0)',
      },
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapStackedLosCommitInput(),
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
      targetId: tacticalMapStackedLosTargetId,
      weaponId: 'medium-laser',
      reason: tacticalMapStackedLosCombatProjection.attackInvalidReason,
      details: tacticalMapStackedLosCombatProjection.attackInvalidDetails,
    });
  });

  it('keeps elevation partial-cover browser projection aligned with committed attacks', () => {
    expect(tacticalMapElevationCoverCombatProjection).toMatchObject({
      hex: { q: 2, r: -1 },
      distance: 2,
      rangeBracket: 'short',
      inRange: true,
      inArc: true,
      losState: 'clear',
      attackable: true,
      targetUnitIds: [tacticalMapElevationCoverTargetId],
      validTargetUnitIds: [tacticalMapElevationCoverTargetId],
      weaponIdsAvailable: ['medium-laser'],
      targetPartialCover: true,
      targetCoverModifier: 1,
      targetCoverReason:
        'Target behind elevation +1 partial cover at (1, -1) (+1)',
    });
    expect(tacticalMapElevationCoverCombatProjection.toHitModifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Partial Cover',
          value: 1,
          source: 'terrain',
        }),
      ]),
    );

    const result = applyInteractiveSessionAttack(
      tacticalMapElevationCoverCommitInput(),
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
    expect(payload.targetId).toBe(tacticalMapElevationCoverTargetId);
    expect(payload.toHitNumber).toBe(
      tacticalMapElevationCoverCombatProjection.toHitNumber,
    );
    expect(payload.modifiers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Partial Cover',
          value: 1,
          source: 'terrain',
        }),
      ]),
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

  it('keeps mixed same-hex visibility attackable through the visible target', () => {
    expect(tacticalMapMixedVisibilityCombatProjection).toMatchObject({
      hex: { q: 1, r: 2 },
      distance: 4,
      rangeBracket: 'medium',
      attackable: true,
      targetVisibilityState: 'mixed',
      targetUnitIds: [
        'medium-target',
        'same-hex-hidden-contact',
        'same-hex-last-known-contact',
      ],
      visibleTargetUnitIds: ['medium-target'],
      obscuredTargetUnitIds: [
        'same-hex-hidden-contact',
        'same-hex-last-known-contact',
      ],
      validTargetUnitIds: ['medium-target'],
      weaponIdsAvailable: ['medium-laser', 'extreme-lrm'],
    });
    expect(
      tacticalMapMixedVisibilityCombatProjection.attackInvalidReason,
    ).toBeUndefined();
    expect(
      tacticalMapMixedVisibilityCombatProjection.visibilityBlockedReason,
    ).toBeUndefined();

    const result = applyInteractiveSessionAttack(
      tacticalMapMixedVisibilityCommitInput(),
    );

    expect(
      result.events.some((event) => event.type === GameEventType.AttackInvalid),
    ).toBe(false);
    const declared = result.events.find(
      (event) => event.type === GameEventType.AttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IAttackDeclaredPayload;
    expect(payload.targetId).toBe('medium-target');
    expect(payload.weapons).toEqual(
      tacticalMapMixedVisibilityCombatProjection.weaponIdsAvailable,
    );
    expect(payload.range).toBe(
      tacticalMapMixedVisibilityCombatProjection.rangeBracket,
    );
    expect(payload.toHitNumber).toBe(
      tacticalMapMixedVisibilityCombatProjection.toHitNumber,
    );
  });

  it('keeps grid-derived fog LOS visibility aligned with attack commit validation', () => {
    const visibleTarget = tacticalMapFogLosVisibleTokens.find(
      (token) => token.unitId === tacticalMapFogLosTargetId,
    );
    expect(visibleTarget).toMatchObject({
      isValidTarget: true,
      isActiveTarget: true,
    });
    expect(visibleTarget?.fogStatus).toBeUndefined();

    const blockedTarget = tacticalMapFogLosTokens.find(
      (token) => token.unitId === tacticalMapFogLosTargetId,
    );
    expect(blockedTarget).toMatchObject({
      fogStatus: 'lastKnown',
      isValidTarget: false,
      isActiveTarget: false,
      lastKnownPosition: { q: 3, r: 0 },
    });

    expect(tacticalMapFogLosCombatProjection).toMatchObject({
      hex: { q: 3, r: 0 },
      distance: 3,
      rangeBracket: 'short',
      losState: 'blocked',
      attackable: false,
      targetVisibilityState: 'lastKnown',
      targetUnitIds: [tacticalMapFogLosTargetId],
      visibleTargetUnitIds: [],
      obscuredTargetUnitIds: [tacticalMapFogLosTargetId],
      validTargetUnitIds: [],
      attackInvalidReason: 'TargetNotVisible',
      attackInvalidDetails: 'Last known contact is not currently visible',
      visibilityBlockedReason: 'Last known contact is not currently visible',
      lineOfSightBlockerReason: 'Blocked by light woods at (2, 0)',
      lineOfSightBlocker: {
        hex: { q: 2, r: 0 },
        kind: 'terrain',
        terrain: 'light_woods',
        reason: 'Blocked by light woods at (2, 0)',
      },
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapFogLosCommitInput(),
    );

    const invalid = result.events.find(
      (event) => event.type === GameEventType.AttackInvalid,
    );
    expect(invalid).toBeDefined();
    const payload = invalid!.payload as IAttackInvalidPayload;
    expect(payload.targetId).toBe(tacticalMapFogLosTargetId);
    expect(payload.reason).toBe('TargetNotVisible');
    expect(payload.details).toBe(
      `Target ${tacticalMapFogLosTargetId} is not currently visible to player`,
    );
  });

  it('keeps selected-weapon out-of-arc browser projection aligned with attack commit validation', () => {
    expect(tacticalMapOutOfArcCombatProjection).toMatchObject({
      hex: { q: 0, r: 1 },
      distance: 1,
      rangeBracket: 'short',
      firingArc: 'rear',
      inRange: true,
      inArc: false,
      attackable: false,
      targetUnitIds: ['rear-arc-target'],
      validTargetUnitIds: [],
      weaponIdsInRange: ['front-arc-laser'],
      weaponIdsInArc: [],
      weaponIdsAvailable: [],
      attackInvalidReason: 'OutOfArc',
      attackInvalidDetails: 'No selected weapons can fire into the rear arc',
      blockedReason: 'No weapons cover rear arc',
      weaponRangeOptions: [
        {
          weaponId: 'front-arc-laser',
          rangeBracket: 'short',
          inRange: true,
          inArc: false,
          available: false,
          blockedReason: 'out of rear arc',
        },
      ],
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapOutOfArcCommitInput(),
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
      targetId: 'rear-arc-target',
      weaponId: 'front-arc-laser',
      reason: tacticalMapOutOfArcCombatProjection.attackInvalidReason,
      details: tacticalMapOutOfArcCombatProjection.attackInvalidDetails,
    });
  });

  it('keeps same-hex weapon-attack browser projection aligned with attack commit validation', () => {
    expect(tacticalMapSameHexCombatProjection).toMatchObject({
      hex: { q: 0, r: 0 },
      distance: 0,
      rangeBracket: 'short',
      attackable: false,
      targetUnitIds: ['same-hex-target'],
      validTargetUnitIds: [],
      weaponIdsAvailable: [],
      attackInvalidReason: 'SameHex',
      attackInvalidDetails: 'Attacker and target occupy the same hex',
      blockedReason: 'Attacker and target occupy the same hex',
      weaponRangeOptions: [
        {
          weaponId: 'medium-laser',
          rangeBracket: 'short',
          available: false,
        },
      ],
    });

    const result = applyInteractiveSessionAttack(
      tacticalMapSameHexCommitInput(),
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
      targetId: 'same-hex-target',
      weaponId: 'medium-laser',
      reason: tacticalMapSameHexCombatProjection.attackInvalidReason,
      details: tacticalMapSameHexCombatProjection.attackInvalidDetails,
    });
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
