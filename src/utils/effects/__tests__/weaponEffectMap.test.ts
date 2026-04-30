import {
  ATTACK_EFFECT_COLORS,
  resolvePhysicalAttackEffect,
  resolveWeaponEffect,
  WEAPON_EFFECT_FALLBACK_CASES,
  type AttackWeaponEffectPayload,
  type PhysicalAttackEffectPayload,
} from '../weaponEffectMap';

function attackPayload(
  overrides: Partial<AttackWeaponEffectPayload>,
): AttackWeaponEffectPayload {
  return {
    attackerId: 'attacker',
    targetId: 'target',
    weaponId: 'weapon',
    roll: 8,
    toHitNumber: 7,
    hit: true,
    ...overrides,
  };
}

function physicalPayload(
  overrides: Partial<PhysicalAttackEffectPayload>,
): PhysicalAttackEffectPayload {
  return {
    attackerId: 'attacker',
    targetId: 'target',
    attackType: 'punch',
    roll: 8,
    toHitNumber: 7,
    hit: true,
    ...overrides,
  };
}

describe('weaponEffectMap', () => {
  it('prefers visual metadata carried on the event payload', () => {
    const effect = resolveWeaponEffect(
      attackPayload({
        weaponId: 'ambiguous-weapon',
        visualCategory: 'laser',
        visualSubtype: 'er-large-laser',
        projectileCount: 3,
        projectileStaggerMs: 15,
      }),
    );

    expect(effect).toMatchObject({
      category: 'laser',
      primitive: 'laser',
      visualSubtype: 'er-large-laser',
      color: ATTACK_EFFECT_COLORS.laserErRedOrange,
      projectileCount: 3,
      staggerMs: 15,
      metadataSource: {
        category: 'event',
        color: 'event',
        projectiles: 'event',
        stagger: 'event',
      },
    });
  });

  it.each(WEAPON_EFFECT_FALLBACK_CASES)(
    'derives fallback metadata for $weaponName',
    (testCase) => {
      const effect = resolveWeaponEffect(
        attackPayload({ weaponName: testCase.weaponName }),
      );

      expect(effect.category).toBe(testCase.expectedCategory);
      expect(effect.color).toBe(testCase.expectedColor);
      expect(effect.projectileCount).toBe(
        'expectedProjectiles' in testCase ? testCase.expectedProjectiles : 1,
      );
      expect(effect.staggerMs).toBe(
        'expectedStaggerMs' in testCase ? testCase.expectedStaggerMs : 0,
      );
    },
  );

  it('maps physical variants to ring and arc metadata', () => {
    expect(
      resolvePhysicalAttackEffect(physicalPayload({ attackType: 'kick' })),
    ).toMatchObject({
      category: 'physical',
      primitive: 'shockwave',
      ringStrokeWidth: 4,
      showArc: false,
      impactColor: ATTACK_EFFECT_COLORS.physicalImpactRed,
    });

    expect(
      resolvePhysicalAttackEffect(physicalPayload({ attackType: 'hatchet' })),
    ).toMatchObject({
      ringStrokeWidth: 3,
      showArc: true,
      originShockwave: false,
    });

    expect(
      resolvePhysicalAttackEffect(physicalPayload({ attackType: 'charge' })),
    ).toMatchObject({
      ringStrokeWidth: 5,
      originShockwave: true,
    });
  });
});
