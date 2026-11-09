/**
 * ProtoMech movement construction rules against the pinned Java verifier.
 *
 * `fixtures/movement-java-verdicts.json` is the output of the original
 * `TestProtoMek.correctMovement` (MegaMek 48fcb2f64, TestProtoMek.java:443-470) run by
 * `fixtures/ProtoMekMovementProbe.java` over synthetic variants text-edited from the
 * pinned Hydra 2. Every variant must get Java's verdict and Java's message.
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import {
  PROTO_EXTENDED_JUMP_JET_ID,
  getProtoMovementErrors,
  isProtoExtendedJumpJet,
  isProtoUmu,
  protoMaxJumpMP,
  summarizeProtoJumpEquipment,
} from '../movementRules';
import fixture from './fixtures/movement-java-verdicts.json';

interface Variant {
  name: string;
  motion: string;
  walk: number;
  jump: number;
  umu: number;
  improvedJets: boolean;
  javaMaxJumpMP: number;
  correctMovement: boolean;
  message: string;
}

const VARIANTS = fixture.variants as Variant[];

describe('pinned provenance', () => {
  it('records the pins and the probe hash', () => {
    expect(fixture.meta.pins.megamek).toBe(
      '48fcb2f64a1b3f2d575707ce5653dad64927b587',
    );
    expect(fixture.meta.megamekJarSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fixture.meta.probeSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(VARIANTS).toHaveLength(fixture.meta.variants);
  });
});

describe('getProtoMovementErrors agrees with TestProtoMek.correctMovement', () => {
  it.each(VARIANTS.map((v) => [v.name, v] as const))('%s', (_name, v) => {
    const errors = getProtoMovementErrors({
      walk: v.walk,
      jump: v.jump,
      umu: v.umu,
      quad: v.motion === 'Quad',
      glider: v.motion === 'WiGE',
      improvedJumpJets: v.improvedJets,
    });
    expect(errors).toEqual(v.correctMovement ? [] : [v.message]);
  });

  it('computes the same maximum jump as TestProtoMek.maxJumpMP', () => {
    for (const v of VARIANTS) {
      expect(protoMaxJumpMP(v.walk, v.improvedJets)).toBe(v.javaMaxJumpMP);
    }
  });
});

describe('maximum jump (TestProtoMek.java:84-92)', () => {
  it('is the walk MP, or 1.5 times it rounded up with an improved jump jet', () => {
    expect(protoMaxJumpMP(4, false)).toBe(4);
    expect(protoMaxJumpMP(4, true)).toBe(6);
    expect(protoMaxJumpMP(5, true)).toBe(8);
    expect(protoMaxJumpMP(1, true)).toBe(2);
  });

  it('caps jump and UMU independently, both by the improved-jet maximum', () => {
    const base = { walk: 4, quad: false, glider: false };
    expect(
      getProtoMovementErrors({
        ...base,
        jump: 5,
        umu: 5,
        improvedJumpJets: false,
      }),
    ).toEqual(['Exceeds maximum jump MP.', 'Exceeds maximum UMU MP.']);
    expect(
      getProtoMovementErrors({
        ...base,
        jump: 6,
        umu: 6,
        improvedJumpJets: true,
      }),
    ).toEqual([]);
  });
});

describe('minimum running MP', () => {
  const idle = { jump: 0, umu: 0, improvedJumpJets: false };

  it('requires a glider to flank at 4 (TestProtoMek.java:447-449)', () => {
    const glider = { ...idle, quad: false, glider: true };
    expect(getProtoMovementErrors({ ...glider, walk: 2 })).toEqual([
      'Glider ProtoMeks have a minimum flanking MP of 4.',
    ]);
    expect(getProtoMovementErrors({ ...glider, walk: 3 })).toEqual([]);
  });

  it('requires a quad to run at 3 (TestProtoMek.java:450-451)', () => {
    const quad = { ...idle, quad: true, glider: false };
    expect(getProtoMovementErrors({ ...quad, walk: 1 })).toEqual([
      'Quad ProtoMeks have a minimum running MP of 3.',
    ]);
    expect(getProtoMovementErrors({ ...quad, walk: 2 })).toEqual([]);
  });

  it('has no weight-class cap on walk or jump, and no glider weight rule', () => {
    expect(
      getProtoMovementErrors({
        walk: 10,
        jump: 10,
        umu: 0,
        quad: false,
        glider: false,
        improvedJumpJets: false,
      }),
    ).toEqual([]);
  });
});

describe('jump equipment recognition', () => {
  // MiscType.java:2054-2060: the Extended Jump Jet System carries S_IMPROVED, the
  // flag TestProtoMek.maxJumpMP reads. The catalog has no entry or flag for it, so
  // this predicate is the single place that names it.
  it('names the Extended Jump Jet System by its pinned internal name', () => {
    expect(PROTO_EXTENDED_JUMP_JET_ID).toBe('ExtendedJumpJetSystem');
    expect(isProtoExtendedJumpJet('ExtendedJumpJetSystem')).toBe(true);
    expect(isProtoExtendedJumpJet('Extended Jump Jet System')).toBe(true);
    expect(isProtoExtendedJumpJet('ProtoMechJumpJet')).toBe(false);
    expect(isProtoExtendedJumpJet('CLERMicroLaser')).toBe(false);
  });

  it('counts UMU mounts by the pinned internal name (MiscType.java:2079)', () => {
    expect(isProtoUmu('ProtoMechUMU')).toBe(true);
    expect(isProtoUmu('ProtoMechJumpJet')).toBe(false);
  });

  it('summarizes a loadout', () => {
    expect(
      summarizeProtoJumpEquipment([
        { equipmentId: 'ProtoMechUMU' },
        { equipmentId: 'ProtoMechUMU' },
        { equipmentId: 'ExtendedJumpJetSystem' },
        { equipmentId: 'ProtoMechJumpJet' },
      ]),
    ).toEqual({ improvedJumpJets: true, umu: 2 });
    expect(summarizeProtoJumpEquipment([])).toEqual({
      improvedJumpJets: false,
      umu: 0,
    });
  });
});
