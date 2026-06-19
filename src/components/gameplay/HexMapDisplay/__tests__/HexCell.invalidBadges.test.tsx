import { render } from '@testing-library/react';

import type {
  ICombatRangeHex,
  IHexCoordinate,
  IMovementRangeHex,
} from '@/types/gameplay';
import type { ITacticalMapProjectionSourceReference } from '@/utils/gameplay/tacticalMapProjection';

import { CoverLevel, MovementType, RangeBracket } from '@/types/gameplay';

import {
  CombatInvalidBadge,
  MovementInvalidBadge,
} from '../HexCell.invalidBadges';

const HEX: IHexCoordinate = { q: 1, r: 2 };

function movementInfo(
  overrides: Partial<IMovementRangeHex> = {},
): IMovementRangeHex {
  return {
    hex: HEX,
    mpCost: 0,
    reachable: false,
    movementType: MovementType.Walk,
    ...overrides,
  };
}

function combatInfo(overrides: Partial<ICombatRangeHex> = {}): ICombatRangeHex {
  return {
    hex: HEX,
    distance: 1,
    rangeBracket: RangeBracket.Short,
    inRange: true,
    inArc: true,
    losState: 'clear',
    targetCoverLevel: CoverLevel.None,
    targetPartialCover: false,
    targetCoverModifier: 0,
    firingArc: 'front',
    hasTarget: true,
    targetVisibilityState: 'visible',
    visibleTargetUnitIds: ['target-1'],
    obscuredTargetUnitIds: [],
    attackable: false,
    weaponIdsInRange: [],
    weaponIdsInArc: [],
    weaponIdsAvailable: [],
    weaponRangeOptions: [],
    availableWeaponImpacts: [],
    availableWeaponHeat: 0,
    availableWeaponDamage: 0,
    targetUnitIds: ['target-1'],
    validTargetUnitIds: [],
    ...overrides,
  };
}

function movementBadgeLabel(overrides: Partial<IMovementRangeHex>): string {
  const { getByTestId, unmount } = render(
    <svg>
      <MovementInvalidBadge
        x={10}
        y={20}
        hex={HEX}
        movementInfo={movementInfo(overrides)}
      />
    </svg>,
  );
  const label =
    getByTestId('hex-movement-invalid-badge-1-2').querySelector('text')
      ?.textContent ?? '';
  unmount();
  return label;
}

function combatBadgeLabel(overrides: Partial<ICombatRangeHex>): string {
  const { getByTestId, unmount } = render(
    <svg>
      <CombatInvalidBadge
        x={10}
        y={20}
        hex={HEX}
        combatInfo={combatInfo(overrides)}
      />
    </svg>,
  );
  const label =
    getByTestId('hex-combat-invalid-badge-1-2').querySelector('text')
      ?.textContent ?? '';
  unmount();
  return label;
}

describe('HexCell invalid badges', () => {
  it('formats movement invalid labels from ordered detail resolvers', () => {
    expect(
      movementBadgeLabel({
        movementInvalidDetails: 'Deep water blocks ground movement',
        movementInvalidReason: 'DestinationOccupied',
      }),
    ).toBe('WTR');
    expect(
      movementBadgeLabel({
        altitudeControlRequired: true,
        movementInvalidDetails: 'Bridge clearance blocks the path',
      }),
    ).toBe('ALT');
    expect(
      movementBadgeLabel({
        movementInvalidDetails: 'Bridge clearance blocks the path',
      }),
    ).toBe('BRDG');
    expect(
      movementBadgeLabel({
        movementInvalidDetails: 'No legal path costs can be generated',
      }),
    ).toBe('NO MP');
    expect(
      movementBadgeLabel({
        movementInvalidDetails: 'Aerospace flight path is unavailable',
      }),
    ).toBe('AERO');
  });

  it('formats movement invalid labels from reason codes and fallback state', () => {
    const movementReasonLabels: readonly [
      NonNullable<IMovementRangeHex['movementInvalidReason']>,
      string,
    ][] = [
      ['DestinationOccupied', 'OCC'],
      ['DestinationOutOfBounds', 'OOB'],
      ['InsufficientMP', 'NO MP'],
      ['UnitImmobile', 'NO MOVE'],
      ['InvalidPath', 'BAD PATH'],
      ['JumpUnavailable', 'NO JUMP'],
      ['NoLegalPath', 'NO PATH'],
      ['NoMovementCapability', 'NO MOVE'],
      ['TerrainBlocked', 'TERR'],
      ['InvalidDestination', 'BAD'],
    ];

    for (const [movementInvalidReason, label] of movementReasonLabels) {
      expect(movementBadgeLabel({ movementInvalidReason })).toBe(label);
    }

    expect(
      movementBadgeLabel({ movementInvalidReason: 'UnitAlreadyMoved' }),
    ).toBe('NO');
    expect(
      movementBadgeLabel({
        movementInvalidReason: 'UnitAlreadyMoved',
        blockedReason: 'Unit already moved this turn',
      }),
    ).toBe('BLK');
  });

  it('formats combat invalid labels from LOS detail resolvers before reason codes', () => {
    expect(
      combatBadgeLabel({
        attackInvalidReason: 'NoLineOfSight',
        attackInvalidDetails: 'TAG beacon is unavailable due to ECM',
      }),
    ).toBe('TAG');
    expect(
      combatBadgeLabel({
        attackInvalidReason: 'NoLineOfSight',
        lineOfSightBlockerReason: 'Elevation blocks the line',
      }),
    ).toBe('ELEV');
    expect(
      combatBadgeLabel({
        attackInvalidReason: 'NoLineOfSight',
        lineOfSightBlockerReason: 'Heavy woods block line of sight',
      }),
    ).toBe('WOOD');
    expect(
      combatBadgeLabel({
        attackInvalidReason: 'NoLineOfSight',
        lineOfSightBlockerReason: 'Smoke blocks line of sight',
      }),
    ).toBe('SMK');
  });

  it('formats combat invalid labels from reason codes and fallback state', () => {
    const attackReasonLabels: readonly [
      NonNullable<ICombatRangeHex['attackInvalidReason']>,
      string,
    ][] = [
      ['NoLineOfSight', 'LOS'],
      ['OutOfAmmo', 'AMMO'],
      ['OutOfArc', 'ARC'],
      ['OutOfRange', 'OUT'],
      ['SameHex', 'SAME'],
      ['TargetNotVisible', 'HIDDEN'],
      ['InvalidTarget', 'INVALID'],
    ];

    for (const [attackInvalidReason, label] of attackReasonLabels) {
      expect(combatBadgeLabel({ attackInvalidReason })).toBe(label);
    }

    expect(combatBadgeLabel({ attackInvalidReason: 'UnknownWeapon' })).toBe(
      'NO',
    );
    expect(
      combatBadgeLabel({
        attackInvalidReason: 'UnknownWeapon',
        blockedReason: 'Unknown weapon',
      }),
    ).toBe('BLOCK');
  });

  it('keeps invalid badge accessibility text and source reference metadata', () => {
    const sourceReferences: readonly ITacticalMapProjectionSourceReference[] = [
      {
        channel: 'movement',
        kind: 'megamek',
        label: 'MovePath.java',
        detail: 'water',
        ruleReferences: ['TW p.50'],
      },
      {
        channel: 'combat',
        kind: 'mekstation',
        label: 'combatProjection.ts',
        ruleReferences: ['TW p.99'],
      },
    ];

    const { getByTestId } = render(
      <svg>
        <MovementInvalidBadge
          x={10}
          y={20}
          hex={HEX}
          movementInfo={movementInfo({
            movementInvalidDetails: 'Deep water blocks ground movement',
            movementInvalidReason: 'TerrainBlocked',
          })}
          projectionExplanation="Movement projection"
          sourceReferences={sourceReferences}
        />
      </svg>,
    );

    const badge = getByTestId('hex-movement-invalid-badge-1-2');
    expect(badge).toHaveAttribute(
      'aria-label',
      'Deep water blocks ground movement',
    );
    expect(badge).toHaveAttribute(
      'data-invalid-badge-reason',
      'Deep water blocks ground movement',
    );
    expect(badge).toHaveAttribute('data-invalid-badge-code', 'TerrainBlocked');
    expect(badge).toHaveAttribute(
      'data-tactical-projection-channel',
      'movement',
    );
    expect(badge).toHaveAttribute(
      'data-invalid-badge-source-refs',
      'movement:megamek:MovePath.java:water',
    );
    expect(badge).toHaveAttribute(
      'data-invalid-badge-rule-refs',
      'movement:megamek:TW p.50',
    );
    expect(badge).toHaveAttribute(
      'data-invalid-badge-projection-explanation',
      'Movement projection',
    );
  });
});
