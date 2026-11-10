/**
 * ProtoMech jump MP shown in the editor. Pinned MegaMek 48fcb2f64
 * ProtoMek.getJumpMP (ProtoMek.java:452-492) returns the stored jump MP plus the
 * Partial Wing bonus (+2 in a standard atmosphere, ProtoMek.java:470-487); a glider
 * has no bonus of its own. MML 62bf193 MovementView.java:456-465 shows the same
 * "+2 (Partial wing)" for a ProtoMech.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import {
  effectiveJumpMP,
  hasProtoPartialWing,
  protoChassisCanJump,
} from '../movementCaps';

describe('protoChassisCanJump', () => {
  // A glider is WiGE and MML pins its jump spinner at 0 (MovementView.java:265-268).
  // Nothing locks an ultraheavy: the pinned Sprite Ultraheavy units jump 3 to 5.
  it.each([
    [ProtoChassis.BIPED, true],
    [ProtoChassis.QUAD, true],
    [ProtoChassis.GLIDER, false],
    [ProtoChassis.ULTRAHEAVY, true],
  ])('%s: %s', (chassis, canJump) => {
    expect(protoChassisCanJump(chassis)).toBe(canJump);
  });
});

describe('effectiveJumpMP', () => {
  it('adds nothing for a unit without a Partial Wing', () => {
    expect(effectiveJumpMP(0, false)).toBe(0);
    expect(effectiveJumpMP(5, false)).toBe(5);
  });

  it('adds 2 for a mounted Partial Wing (standard atmosphere)', () => {
    expect(effectiveJumpMP(5, true)).toBe(7);
    expect(effectiveJumpMP(0, true)).toBe(2);
  });
});

describe('hasProtoPartialWing', () => {
  it.each(['ProtoMechPartialWing', 'protomech-partial-wing', 'Partial Wing'])(
    'finds %s',
    (equipmentId) => {
      expect(hasProtoPartialWing([{ equipmentId }])).toBe(true);
    },
  );

  it('does not find other mounts', () => {
    expect(
      hasProtoPartialWing([
        { equipmentId: 'ProtoMechJumpJet' },
        { equipmentId: 'CLERMicroLaser' },
      ]),
    ).toBe(false);
    expect(hasProtoPartialWing([])).toBe(false);
  });
});
