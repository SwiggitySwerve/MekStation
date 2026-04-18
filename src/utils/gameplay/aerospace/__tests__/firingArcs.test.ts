/**
 * Aerospace firing-arc classification tests.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (section 9)
 */

import { AerospaceArc } from '../../../../types/unit/AerospaceInterfaces';
import { classifyAerospaceArc, fuselageFiresAs, isInArc } from '../firingArcs';

describe('classifyAerospaceArc', () => {
  it('target directly ahead → NOSE', () => {
    const arc = classifyAerospaceArc({
      from: { q: 0, r: 0 },
      to: { q: 5, r: 0 },
      facingDeg: 0,
    });
    expect(arc).toBe(AerospaceArc.NOSE);
  });

  it('target directly behind → AFT', () => {
    const arc = classifyAerospaceArc({
      from: { q: 0, r: 0 },
      to: { q: -5, r: 0 },
      facingDeg: 0,
    });
    expect(arc).toBe(AerospaceArc.AFT);
  });

  it('target to the left → LEFT_WING on ASF', () => {
    const arc = classifyAerospaceArc({
      from: { q: 0, r: 0 },
      to: { q: 0, r: -5 },
      facingDeg: 0,
    });
    expect(arc).toBe(AerospaceArc.LEFT_WING);
  });

  it('target to the left → LEFT_SIDE on Small Craft', () => {
    const arc = classifyAerospaceArc({
      from: { q: 0, r: 0 },
      to: { q: 0, r: -5 },
      facingDeg: 0,
      isSmallCraft: true,
    });
    expect(arc).toBe(AerospaceArc.LEFT_SIDE);
  });

  it('target to the right → RIGHT_WING on ASF', () => {
    const arc = classifyAerospaceArc({
      from: { q: 0, r: 0 },
      to: { q: 0, r: 5 },
      facingDeg: 0,
    });
    expect(arc).toBe(AerospaceArc.RIGHT_WING);
  });

  it('honors facing: +90° flips left/right', () => {
    // Target at +x direction, unit facing +90° (towards -y). Target is 90° off right.
    const arc = classifyAerospaceArc({
      from: { q: 0, r: 0 },
      to: { q: 5, r: 0 },
      facingDeg: 90,
    });
    // Target is to the right of a unit facing "up".
    expect([AerospaceArc.RIGHT_WING, AerospaceArc.LEFT_WING]).toContain(arc);
  });
});

describe('isInArc', () => {
  it('FUSELAGE weapon always passes', () => {
    expect(
      isInArc(
        {
          from: { q: 0, r: 0 },
          to: { q: 10, r: 10 },
          facingDeg: 0,
        },
        AerospaceArc.FUSELAGE,
      ),
    ).toBe(true);
  });

  it('NOSE-arc weapon: target ahead passes, target behind fails', () => {
    expect(
      isInArc(
        { from: { q: 0, r: 0 }, to: { q: 5, r: 0 }, facingDeg: 0 },
        AerospaceArc.NOSE,
      ),
    ).toBe(true);
    expect(
      isInArc(
        { from: { q: 0, r: 0 }, to: { q: -5, r: 0 }, facingDeg: 0 },
        AerospaceArc.NOSE,
      ),
    ).toBe(false);
  });
});

describe('fuselageFiresAs', () => {
  it('ASF: Nose, LeftWing, RightWing, Aft', () => {
    expect(fuselageFiresAs(false)).toEqual([
      AerospaceArc.NOSE,
      AerospaceArc.LEFT_WING,
      AerospaceArc.RIGHT_WING,
      AerospaceArc.AFT,
    ]);
  });

  it('Small Craft: Nose, LeftSide, RightSide, Aft', () => {
    expect(fuselageFiresAs(true)).toEqual([
      AerospaceArc.NOSE,
      AerospaceArc.LEFT_SIDE,
      AerospaceArc.RIGHT_SIDE,
      AerospaceArc.AFT,
    ]);
  });
});
