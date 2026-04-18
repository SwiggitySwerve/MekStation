/**
 * Fly-over / strafe resolution tests.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/movement-system/spec.md (Fly-Over)
 */

import { AerospaceArc } from '../../../../types/unit/AerospaceInterfaces';
import { AerospaceEventType } from '../events';
import { resolveFlyOver, STRAFE_PER_HEX_TO_HIT_PENALTY } from '../flyOver';

describe('resolveFlyOver', () => {
  const path = [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 2, r: 0 },
    { q: 3, r: 0 },
  ];

  it('emits AEROSPACE_FLY_OVER event for declared strafes on path', () => {
    const r = resolveFlyOver({
      unitId: 'asf-1',
      path,
      strafes: [
        {
          hex: { q: 1, r: 0 },
          targetUnitId: 'mech-a',
          damage: 5,
          arc: AerospaceArc.NOSE,
        },
        {
          hex: { q: 2, r: 0 },
          targetUnitId: 'mech-b',
          damage: 3,
          arc: AerospaceArc.NOSE,
        },
      ],
      bombs: [],
      hasBombBay: false,
    });
    expect(r.event.type).toBe(AerospaceEventType.AEROSPACE_FLY_OVER);
    expect(r.event.strafedHexes.length).toBe(2);
    expect(r.toHitPenalty).toBe(2 * STRAFE_PER_HEX_TO_HIT_PENALTY);
  });

  it('filters strafes that are off-path', () => {
    const r = resolveFlyOver({
      unitId: 'asf-1',
      path,
      strafes: [
        {
          hex: { q: 10, r: 10 },
          targetUnitId: 'mech-a',
          damage: 5,
          arc: AerospaceArc.NOSE,
        },
      ],
      bombs: [],
      hasBombBay: false,
    });
    expect(r.event.strafedHexes.length).toBe(0);
    expect(r.toHitPenalty).toBe(0);
  });

  it('rejects bombs when no bomb bay equipped', () => {
    const r = resolveFlyOver({
      unitId: 'asf-1',
      path,
      strafes: [],
      bombs: [{ hex: { q: 1, r: 0 }, damage: 10 }],
      hasBombBay: false,
    });
    expect(r.rejectedBombs.length).toBe(1);
    expect(r.event.bombsDropped.length).toBe(0);
  });

  it('rejects bombs dropped off-path', () => {
    const r = resolveFlyOver({
      unitId: 'asf-1',
      path,
      strafes: [],
      bombs: [{ hex: { q: 99, r: 0 }, damage: 10 }],
      hasBombBay: true,
    });
    expect(r.rejectedBombs.length).toBe(1);
    expect(r.event.bombsDropped.length).toBe(0);
  });

  it('accepts bombs on-path when bomb bay is equipped', () => {
    const r = resolveFlyOver({
      unitId: 'asf-1',
      path,
      strafes: [],
      bombs: [{ hex: { q: 2, r: 0 }, damage: 10 }],
      hasBombBay: true,
    });
    expect(r.rejectedBombs.length).toBe(0);
    expect(r.event.bombsDropped.length).toBe(1);
    expect(r.event.bombsDropped[0]).toEqual({ q: 2, r: 0 });
  });
});
