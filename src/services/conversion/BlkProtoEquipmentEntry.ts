import type { IBlkProtoEquipmentSyntax } from '@/types/formats/BlkProtoEquipmentSource';

import { trimBlkWhitespace } from './BlkParserService.helpers';

// Decimal zeroes from the pinned Java 21 Character.digit(char, 10) table.
// Integer.parseInt reads UTF-16 chars, so supplementary digits are not admitted.
const JAVA_DECIMAL_ZEROES = [
  0x30, 0x660, 0x6f0, 0x7c0, 0x966, 0x9e6, 0xa66, 0xae6, 0xb66, 0xbe6, 0xc66,
  0xce6, 0xd66, 0xde6, 0xe50, 0xed0, 0xf20, 0x1040, 0x1090, 0x17e0, 0x1810,
  0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620,
  0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0, 0xff10,
];

function normalizeShotDigits(shots: string): string {
  return shots.replace(/[\u0080-\uffff]/g, (character) => {
    const code = character.charCodeAt(0);
    const zero = JAVA_DECIMAL_ZEROES.find(
      (start) => code >= start && code < start + 10,
    );
    return zero === undefined ? character : String(code - zero);
  });
}

export function readBlkProtoEquipmentEntry(
  raw: string,
): IBlkProtoEquipmentSyntax {
  let syntax: IBlkProtoEquipmentSyntax = { rawEntry: raw, errors: [] };
  let name = trimBlkWhitespace(raw);
  if (name.startsWith('#')) return syntax;
  const sizeIndex = name.toUpperCase().indexOf(':SIZE:');
  if (sizeIndex > 0) {
    const size = trimBlkWhitespace(name.slice(sizeIndex + 6));
    const decimal = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?[df]?$/i;
    const value = Number(size.replace(/[df]$/i, ''));
    if (!decimal.test(size) || !Number.isFinite(value)) {
      return {
        ...syntax,
        errors: [`Invalid ProtoMek equipment size: ${raw}`],
      };
    }
    syntax = { ...syntax, size: value };
    name = name.slice(0, sizeIndex);
  }
  syntax = { ...syntax, rearPrefix: name.startsWith('(R) ') };
  if (syntax.rearPrefix) name = name.slice(4);
  const shotsIndex = name.lastIndexOf(' (');
  if (shotsIndex > 0) {
    const shots = normalizeShotDigits(name.slice(shotsIndex + 2, -1));
    const count = Number(shots);
    if (
      !/^[+-]?\d+$/.test(shots) ||
      !Number.isInteger(count) ||
      count < 0 ||
      count > 2147483647
    ) {
      return {
        ...syntax,
        errors: [`Invalid ProtoMek equipment shot count: ${raw}`],
      };
    }
    syntax = { ...syntax, shots: count === 0 ? 0 : count };
    name = name.slice(0, shotsIndex);
  }
  return { ...syntax, lookupName: name };
}

/** Compatibility view used by native booster interpretation and export checks. */
export function readBlkProtoEquipmentName(
  raw: string,
  errors: string[],
): string | undefined {
  const syntax = readBlkProtoEquipmentEntry(raw);
  errors.push(...syntax.errors);
  return syntax.lookupName;
}
