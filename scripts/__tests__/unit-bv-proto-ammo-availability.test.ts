import { BlkParserService } from '../../src/services/conversion/BlkParserService';
import { ProtoMechUnitHandler } from '../../src/services/units/handlers/ProtoMechUnitHandler';
import { ProtoLocation } from '../../src/types/unit/ProtoMechInterfaces';
import {
  calculateProtoMechBV,
  protoMechBVTerms,
} from '../../src/utils/construction/protomech';
import sources from '../../src/utils/construction/protomech/__tests__/fixtures/bv-residual-sources.json';
import {
  buildProto,
  mount,
} from '../../src/utils/construction/protomech/__tests__/protoMechBV.test.helpers';
import { resolveProtoAmmoBV } from '../../src/utils/construction/protomech/protoMechAmmo';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
describe('ProtoMech ammo worklist preservation', () => {
  test.each(sources)(
    '$path retains public results and physical source order',
    (source) => {
      const document = new BlkParserService().parse(source.content);
      if (!document.success) throw new Error(document.error.errors.join('; '));
      const handler = new ProtoMechUnitHandler();
      const parsed = handler.parse(document.data.document);
      if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
      const original = JSON.stringify(parsed.data.unit);
      const b = handler.calculateBVBreakdown(parsed.data.unit);
      const terms = protoMechBVTerms(b);
      expect(b.final).toBe(source.javaTotal);
      expect(terms.ammoBV).toBe(b.ammoBV);
      expect(terms.weaponBV).toBe(b.weaponBV);
      expect(terms.offensiveEquipmentBV).toBe(b.offensiveEquipmentBV);
      expect(JSON.stringify(parsed.data.unit)).toBe(original);
    },
  );

  test('ammo before and after a weapon retains quantities and exact-key cap arithmetic', () => {
    const unit = buildProto({
      tonnage: 5,
      runMP: 5,
      equipment: [
        mount('Clan Ammo SRM-2 (10)', ProtoLocation.LEFT_ARM),
        mount('CLSRM2', ProtoLocation.TORSO),
        mount('ProtoMagneticClamp', ProtoLocation.TORSO),
        mount('Clan Ammo SRM-2 (1000)', ProtoLocation.RIGHT_ARM),
      ],
    });
    const original = JSON.stringify(unit);
    const b = calculateProtoMechBV(unit);
    expect(b).toMatchObject({
      weaponBV: 21,
      ammoBV: 21,
      offensiveEquipmentBV: 1,
      offensiveBV: 43,
      final: 43,
    });
    expect(b.weaponMountBV?.map((f) => f.equipmentIndex)).toEqual([1]);
    expect(b.offensiveEquipmentMountBV?.map((f) => f.equipmentIndex)).toEqual([
      2,
    ]);
    expect(JSON.stringify(unit)).toBe(original);
  });

  test('the unchanged native ammo owner supplies physical per-shot values', () => {
    expect(resolveProtoAmmoBV('Clan Ammo SRM-2 (10)', ['CLSRM2'])).toEqual({
      battleValue: 0.6000000000000001,
      weaponType: 'clan-srm-2',
    });
    expect(
      resolveProtoAmmoBV('Clan Ammo SRM-2 (1000)', ['CLSRM2'])?.battleValue,
    ).toBe(60);
    expect(
      resolveProtoAmmoBV('No Native Ammo (10)', ['CLSRM2']),
    ).toBeUndefined();
  });
});
