/**
 * Aerospace structural integrity default and FixedWingSupport recognition.
 *
 * Real fighter, conventional-fighter and FixedWingSupport sources carry no
 * structural_integrity tag. MegaMek derives SI when it loads them, and
 * MekStation must too, or every one fails its own "at least 1 SI" check.
 *
 * Pinned MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587:
 * - Aero.java:804-808 autoSetSI: max(floor(weight / 10), walk MP)
 * - FixedWingSupport.java:135-138 autoSetSI: SI = walk MP
 * - BLKConvFighterFile.java:153, AeroSpaceFighter.java:127 call autoSetSI
 * - BLKSmallCraftFile.java:125-128 reads the explicit structural_integrity tag
 */

import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { createAerospaceHandler } from '../../units/handlers/AerospaceUnitHandler';
import { createConventionalFighterHandler } from '../../units/handlers/ConventionalFighterUnitHandler';
import { getBlkParserService } from '../BlkParserService';

interface IBlkFixture {
  readonly unitType: string;
  readonly name: string;
  readonly tonnage: number;
  readonly safeThrust: number;
  readonly structuralIntegrity?: number;
  readonly armor?: readonly number[];
  readonly extraTags?: string;
}

/** Minimal BLK text with the tags the three fighter loaders require. */
function blk(f: IBlkFixture): string {
  const si =
    f.structuralIntegrity === undefined
      ? ''
      : `<structural_integrity>\n${f.structuralIntegrity}\n</structural_integrity>\n`;
  return `<UnitType>
${f.unitType}
</UnitType>
<Name>
${f.name}
</Name>
<Model>
</Model>
<year>
3025
</year>
<type>
IS Level 2
</type>
<SafeThrust>
${f.safeThrust}
</SafeThrust>
<fuel>
200
</fuel>
<engine_type>
0
</engine_type>
<armor>
${(f.armor ?? [10, 8, 8, 6]).join('\n')}
</armor>
<tonnage>
${f.tonnage}
</tonnage>
${si}${f.extraTags ?? ''}`;
}

describe('BLK aerospace structural integrity default', () => {
  const parser = getBlkParserService();

  function si(fixture: IBlkFixture): number {
    const dispatched = parser.parseByUnitType(blk(fixture));
    if (!dispatched.success || dispatched.result.kind !== 'aerospace') {
      throw new Error(`not aerospace: ${JSON.stringify(dispatched)}`);
    }
    return dispatched.result.data.structuralIntegrity;
  }

  describe('extractAerospace', () => {
    it.each([
      // Firebird FR-1: 45 t, thrust 5. floor(45 / 10) = 4 < 5.
      ['Aero', 'Firebird', 45, 5, 5],
      // Sabre SB-27b: 25 t, thrust 11. Thrust wins.
      ['AeroSpaceFighter', 'Sabre', 25, 11, 11],
      // 100 t, thrust 3. Weight wins.
      ['AeroSpaceFighter', 'Heavy', 100, 3, 10],
      // Boeing Jump Bomber: 20 t, thrust 9.
      ['ConvFighter', 'Boeing Jump Bomber', 20, 9, 9],
    ])(
      '%s %s (%d t, thrust %d) defaults SI to %d',
      (unitType, name, tonnage, safeThrust, expected) => {
        expect(si({ unitType, name, tonnage, safeThrust })).toBe(expected);
      },
    );

    it('uses the walk MP, not the tonnage rule, for FixedWingSupport', () => {
      // Mosquito Radar Plane IX: 75 t, thrust 4. max(7, 4) would be wrong.
      expect(
        si({
          unitType: 'FixedWingSupport',
          name: 'Mosquito Radar Plane IX',
          tonnage: 75,
          safeThrust: 4,
        }),
      ).toBe(4);
    });

    it('keeps an explicit structural_integrity tag', () => {
      expect(
        si({
          unitType: 'Aero',
          name: 'Tagged',
          tonnage: 45,
          safeThrust: 5,
          structuralIntegrity: 9,
        }),
      ).toBe(9);
    });

    it('does not derive SI for small craft, which carry an explicit tag', () => {
      expect(
        si({
          unitType: 'SmallCraft',
          name: 'Tagged Craft',
          tonnage: 100,
          safeThrust: 3,
          structuralIntegrity: 6,
        }),
      ).toBe(6);
    });
  });

  describe('FixedWingSupport recognition', () => {
    const fws = blk({
      unitType: 'FixedWingSupport',
      name: 'Mosquito Radar Plane IX',
      tonnage: 75,
      safeThrust: 4,
    });

    it('parses as a conventional fighter', () => {
      const result = parser.parse(fws);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.document.unitType).toBe('FixedWingSupport');
      expect(result.data.document.mappedUnitType).toBe(
        UnitType.CONVENTIONAL_FIGHTER,
      );
    });

    it('dispatches to the aerospace extractor', () => {
      const dispatched = parser.parseByUnitType(fws);
      expect(dispatched.success).toBe(true);
      if (!dispatched.success) return;
      expect(dispatched.result.kind).toBe('aerospace');
    });
  });

  describe('handlers', () => {
    function parseDoc(text: string) {
      const parsed = parser.parse(text);
      if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
      return parsed.data.document;
    }

    it('aerospace handler: an SI-less Firebird is valid', () => {
      const handler = createAerospaceHandler();
      const result = handler.parse(
        parseDoc(
          blk({
            unitType: 'Aero',
            name: 'Firebird',
            tonnage: 45,
            safeThrust: 5,
          }),
        ),
      );
      expect(result.success).toBe(true);
      const unit = result.data!.unit;
      expect(unit.structuralIntegrity).toBe(5);
      const validation = handler.validate(unit);
      expect(validation.errors.filter((e) => /SI/.test(e))).toEqual([]);
    });

    it('conventional fighter handler: an SI-less Boeing Jump Bomber is valid', () => {
      const handler = createConventionalFighterHandler();
      const result = handler.parse(
        parseDoc(
          blk({
            unitType: 'ConvFighter',
            name: 'Boeing Jump Bomber',
            tonnage: 20,
            safeThrust: 9,
          }),
        ),
      );
      expect(result.success).toBe(true);
      const unit = result.data!.unit;
      expect(unit.structuralIntegrity).toBe(9);
      const validation = handler.validate(unit);
      expect(validation.errors.filter((e) => /SI/.test(e))).toEqual([]);
    });

    it('conventional fighter handler accepts FixedWingSupport with SI = walk MP', () => {
      const handler = createConventionalFighterHandler();
      const document = parseDoc(
        blk({
          unitType: 'FixedWingSupport',
          name: 'Mosquito Radar Plane IX',
          tonnage: 75,
          safeThrust: 4,
        }),
      );
      expect(handler.canHandle(document)).toBe(true);
      const result = handler.parse(document);
      expect(result.success).toBe(true);
      const unit = result.data!.unit;
      expect(unit.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
      expect(unit.structuralIntegrity).toBe(4);
    });
  });
});
