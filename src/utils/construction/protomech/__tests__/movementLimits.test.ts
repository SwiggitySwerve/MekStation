/**
 * Editor movement limits, from MegaMekLab 62bf193 `MovementView` for a ProtoMech:
 *   - walk minimum: biped 1, glider ceil(GLIDER_MIN_FLANK_MP / 1.5) = 3, quad
 *     floor(QUAD_MIN_RUN_MP / 1.5) = 2 (MovementView.java:267,270,272);
 *   - no walk maximum except the engine: PMStructureTab.recalculateEngineRating refuses a
 *     walk whose rating is not a valid engine ("exceeds the maximum", :264-276);
 *   - jump maximum TestProtoMek.maxJumpMP (MovementView.java:233), and 0 for a glider,
 *     whose spinner is disabled (MovementView.java:265-268, :354). Nothing locks an
 *     ultraheavy.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import {
  PROTO_MAX_ENGINE_RATING,
  computeProtoEngineRating,
} from '../movementCaps';
import {
  clampProtoMovement,
  protoJumpLimit,
  protoMaxWalkMP,
  protoMinWalkMP,
} from '../movementLimits';

const XJJ = [{ equipmentId: 'ExtendedJumpJetSystem' }];

describe('protoMinWalkMP', () => {
  it.each([
    [ProtoChassis.BIPED, 1],
    [ProtoChassis.ULTRAHEAVY, 1],
    [ProtoChassis.QUAD, 2],
    [ProtoChassis.GLIDER, 3],
  ])('%s: %s', (chassis, min) => {
    expect(protoMinWalkMP(chassis)).toBe(min);
  });

  it('is the smallest walk that still meets the verifier minimum', () => {
    // A glider must run at 4: walk 3 runs ceil(4.5) = 5, walk 2 runs 3. A quad must
    // run at 3: walk 2 runs 3, walk 1 runs 2.
    expect(Math.ceil(2 * 1.5)).toBeLessThan(4);
    expect(
      Math.ceil(protoMinWalkMP(ProtoChassis.GLIDER) * 1.5),
    ).toBeGreaterThanOrEqual(4);
    expect(Math.ceil(1 * 1.5)).toBeLessThan(3);
    expect(
      Math.ceil(protoMinWalkMP(ProtoChassis.QUAD) * 1.5),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('protoMaxWalkMP (the engine bound)', () => {
  it('is the largest walk whose engine rating is still valid (rating <= 500)', () => {
    expect(PROTO_MAX_ENGINE_RATING).toBe(500);
    for (const [tonnage, chassis] of [
      [2, ProtoChassis.BIPED],
      [5, ProtoChassis.BIPED],
      [15, ProtoChassis.BIPED],
      [9, ProtoChassis.QUAD],
      [15, ProtoChassis.QUAD],
      [4, ProtoChassis.GLIDER],
    ] as const) {
      const max = protoMaxWalkMP(tonnage, chassis);
      expect(
        computeProtoEngineRating(tonnage, max, chassis),
      ).toBeLessThanOrEqual(500);
      expect(
        computeProtoEngineRating(tonnage, max + 1, chassis),
      ).toBeGreaterThan(500);
    }
  });

  it('has fixed boundaries', () => {
    // 15 t biped: ceil(1.5 x 22) x 15 = 495; walk 23 would be 35 x 15 = 525.
    expect(protoMaxWalkMP(15, ProtoChassis.BIPED)).toBe(22);
    // A quad or glider's factor is 2 lower: walk 23 is (35 - 2) x 15 = 495; walk 24 is 510.
    expect(protoMaxWalkMP(15, ProtoChassis.QUAD)).toBe(23);
  });

  it('is far above the old weight-class walk caps (8, 6, 4, 3)', () => {
    expect(protoMaxWalkMP(3, ProtoChassis.BIPED)).toBeGreaterThan(8);
    expect(protoMaxWalkMP(9, ProtoChassis.BIPED)).toBeGreaterThan(4);
  });
});

describe('protoJumpLimit', () => {
  it('is the walk MP, or 1.5 times it with an Extended Jump Jet mounted', () => {
    expect(protoJumpLimit(4, ProtoChassis.BIPED, [])).toBe(4);
    expect(protoJumpLimit(4, ProtoChassis.BIPED, XJJ)).toBe(6);
    expect(protoJumpLimit(4, ProtoChassis.QUAD, XJJ)).toBe(6);
  });

  it('is 0 for a glider, whatever it mounts (MovementView.java:265-268)', () => {
    expect(protoJumpLimit(5, ProtoChassis.GLIDER, [])).toBe(0);
    expect(protoJumpLimit(5, ProtoChassis.GLIDER, XJJ)).toBe(0);
  });

  it('does not lock an ultraheavy (pinned Sprite UH jump 3 to 5)', () => {
    expect(protoJumpLimit(3, ProtoChassis.ULTRAHEAVY, [])).toBe(3);
    expect(protoJumpLimit(3, ProtoChassis.ULTRAHEAVY, XJJ)).toBe(5);
  });
});

describe('clampProtoMovement', () => {
  const base = { tonnage: 5, chassis: ProtoChassis.BIPED, equipment: [] };

  it('raises walk to the chassis minimum and caps it at the engine bound', () => {
    expect(
      clampProtoMovement({
        ...base,
        chassis: ProtoChassis.GLIDER,
        walk: 1,
        jump: 0,
      }).walk,
    ).toBe(3);
    expect(
      clampProtoMovement({
        ...base,
        chassis: ProtoChassis.QUAD,
        walk: 1,
        jump: 0,
      }).walk,
    ).toBe(2);
    expect(clampProtoMovement({ ...base, walk: 0, jump: 0 }).walk).toBe(1);
    expect(clampProtoMovement({ ...base, walk: 999, jump: 0 }).walk).toBe(
      protoMaxWalkMP(5, ProtoChassis.BIPED),
    );
  });

  it('lowers jump to the new limit, as MovementView.java:370-371 does', () => {
    expect(clampProtoMovement({ ...base, walk: 2, jump: 5 })).toEqual({
      walk: 2,
      jump: 2,
    });
    expect(
      clampProtoMovement({ ...base, walk: 2, jump: 3, equipment: XJJ }),
    ).toEqual({ walk: 2, jump: 3 });
    expect(
      clampProtoMovement({
        ...base,
        chassis: ProtoChassis.GLIDER,
        walk: 4,
        jump: 3,
      }),
    ).toEqual({
      walk: 4,
      jump: 0,
    });
  });

  it('never raises jump, and floors it at 0', () => {
    expect(clampProtoMovement({ ...base, walk: 6, jump: 1 }).jump).toBe(1);
    expect(clampProtoMovement({ ...base, walk: 6, jump: -2 }).jump).toBe(0);
  });
});
