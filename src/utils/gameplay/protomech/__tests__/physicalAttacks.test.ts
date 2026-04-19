/**
 * ProtoMech physical attack tests.
 *
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §6
 */

import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import {
  protoKickDamage,
  protoPunchDamage,
  rejectMainGunMelee,
  resolveProtoPhysicalAttack,
} from '../physicalAttacks';

describe('protoKickDamage', () => {
  it('floor(tonnage/2)', () => {
    expect(protoKickDamage(2)).toBe(1);
    expect(protoKickDamage(5)).toBe(2);
    expect(protoKickDamage(9)).toBe(4);
    expect(protoKickDamage(15)).toBe(7);
  });
  it('0 for non-positive tonnage', () => {
    expect(protoKickDamage(0)).toBe(0);
    expect(protoKickDamage(-3)).toBe(0);
  });
});

describe('protoPunchDamage', () => {
  it('floor(tonnage/5)', () => {
    expect(protoPunchDamage(2)).toBe(0);
    expect(protoPunchDamage(5)).toBe(1);
    expect(protoPunchDamage(9)).toBe(1);
    expect(protoPunchDamage(15)).toBe(3);
  });
  it('0 for non-positive tonnage', () => {
    expect(protoPunchDamage(0)).toBe(0);
    expect(protoPunchDamage(-1)).toBe(0);
  });
});

describe('resolveProtoPhysicalAttack', () => {
  it('Biped punch legal', () => {
    const r = resolveProtoPhysicalAttack({
      kind: 'punch',
      chassisType: ProtoChassis.BIPED,
      tonnage: 10,
    });
    expect(r.legal).toBe(true);
    expect(r.damage).toBe(2);
    expect(r.rejection).toBeUndefined();
  });

  it('Biped kick legal', () => {
    const r = resolveProtoPhysicalAttack({
      kind: 'kick',
      chassisType: ProtoChassis.BIPED,
      tonnage: 9,
    });
    expect(r.legal).toBe(true);
    expect(r.damage).toBe(4);
  });

  it('Quad punch REJECTED (quad_cannot_punch)', () => {
    const r = resolveProtoPhysicalAttack({
      kind: 'punch',
      chassisType: ProtoChassis.QUAD,
      tonnage: 9,
    });
    expect(r.legal).toBe(false);
    expect(r.damage).toBe(0);
    expect(r.rejection).toBe('quad_cannot_punch');
  });

  it('Quad kick legal', () => {
    const r = resolveProtoPhysicalAttack({
      kind: 'kick',
      chassisType: ProtoChassis.QUAD,
      tonnage: 9,
    });
    expect(r.legal).toBe(true);
    expect(r.damage).toBe(4);
  });

  it('Ultraheavy kick = floor(15/2) = 7', () => {
    const r = resolveProtoPhysicalAttack({
      kind: 'kick',
      chassisType: ProtoChassis.ULTRAHEAVY,
      tonnage: 15,
    });
    expect(r.damage).toBe(7);
  });

  it('Glider punch legal (arms present)', () => {
    const r = resolveProtoPhysicalAttack({
      kind: 'punch',
      chassisType: ProtoChassis.GLIDER,
      tonnage: 7,
    });
    expect(r.legal).toBe(true);
    expect(r.damage).toBe(1);
  });
});

describe('rejectMainGunMelee', () => {
  it("returns illegal outcome with 'no_main_gun_melee' rejection", () => {
    const r = rejectMainGunMelee();
    expect(r.legal).toBe(false);
    expect(r.damage).toBe(0);
    expect(r.rejection).toBe('no_main_gun_melee');
  });
});
