/** @spec openspec/changes/establish-all-unit-data-parity/specs/unit-services/spec.md */
import {
  readBlkProtoEquipmentEntry,
  readBlkProtoEquipmentName,
} from '../BlkProtoEquipmentEntry';

describe('ProtoMek source equipment syntax', () => {
  it.each([
    ['0', 0],
    ['-0', 0],
    ['+7', 7],
    ['2147483647', 2147483647],
    ['\u0667', 7],
    ['\uff17', 7],
  ])('retains explicit shots %s', (text, shots) => {
    const rawEntry = `CLSRM2 Ammo (${text})`;
    expect(readBlkProtoEquipmentEntry(rawEntry)).toEqual({
      rawEntry,
      lookupName: 'CLSRM2 Ammo',
      shots,
      rearPrefix: false,
      errors: [],
    });
  });

  it.each([
    ['0', 0],
    ['0.5', 0.5],
    ['1.25', 1.25],
    ['1e1F', 10],
    ['2.5D', 2.5],
  ])('retains declared size %s', (text, size) => {
    const rawEntry = `Communications Equipment:SIZE:${text}`;
    expect(readBlkProtoEquipmentEntry(rawEntry)).toEqual({
      rawEntry,
      lookupName: 'Communications Equipment',
      size,
      rearPrefix: false,
      errors: [],
    });
  });

  it('preserves combined suffixes, Java trimming and original text', () => {
    const rawEntry = '\u001c(R) CLSRM2 Ammo (7):SIZE:2\u001f';
    expect(readBlkProtoEquipmentEntry(rawEntry)).toEqual({
      rawEntry,
      lookupName: 'CLSRM2 Ammo',
      shots: 7,
      size: 2,
      rearPrefix: true,
      errors: [],
    });
  });

  it('distinguishes an absent qualifier from an explicit zero', () => {
    const plain = readBlkProtoEquipmentEntry('CLERSmallLaser');
    expect(plain.lookupName).toBe('CLERSmallLaser');
    expect(plain.shots).toBeUndefined();
    expect(plain.size).toBeUndefined();
    expect(plain.rearPrefix).toBe(false);
    expect(readBlkProtoEquipmentEntry('CLSRM2 Ammo (0)').shots).toBe(0);
    expect(readBlkProtoEquipmentEntry('CommsGear:SIZE:0').size).toBe(0);
  });

  it('records this entry prefix without claiming a native rear-facing mount', () => {
    expect(readBlkProtoEquipmentEntry('(R) CLERSmallLaser').rearPrefix).toBe(
      true,
    );
    expect(readBlkProtoEquipmentEntry('CLERSmallLaser').rearPrefix).toBe(false);
    expect(readBlkProtoEquipmentEntry('(r) CLERSmallLaser').lookupName).toBe(
      '(r) CLERSmallLaser',
    );
  });

  it.each([
    'CLSRM2 Ammo (-1)',
    'CLSRM2 Ammo (2147483648)',
    'CLSRM2 Ammo (1.5)',
    'CLSRM2 Ammo (\ud835\udfd5)',
    'CommsGear:SIZE:NaN',
    'CommsGear:SIZE:Infinity',
    'CommsGear:SIZE:0x1p0',
    'CommsGear:SIZE:bad',
  ])('retains diagnostics and raw text for %s', (rawEntry) => {
    const result = readBlkProtoEquipmentEntry(rawEntry);
    expect(result.rawEntry).toBe(rawEntry);
    expect(result.lookupName).toBeUndefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(rawEntry);
    const errors: string[] = [];
    expect(readBlkProtoEquipmentName(rawEntry, errors)).toBeUndefined();
    expect(errors).toEqual(result.errors);
  });

  it('retains valid partial syntax before a later diagnostic', () => {
    expect(
      readBlkProtoEquipmentEntry('(R) CLSRM2 Ammo (-1):SIZE:2'),
    ).toMatchObject({
      size: 2,
      rearPrefix: true,
      errors: [
        'Invalid ProtoMek equipment shot count: (R) CLSRM2 Ammo (-1):SIZE:2',
      ],
    });
  });

  it('keeps comments ignored and unknown lookup text unresolved', () => {
    expect(readBlkProtoEquipmentEntry(' # comment')).toEqual({
      rawEntry: ' # comment',
      errors: [],
    });
    expect(readBlkProtoEquipmentEntry('Custom Unresolved (7)')).toMatchObject({
      lookupName: 'Custom Unresolved',
      shots: 7,
      errors: [],
    });
  });
});
