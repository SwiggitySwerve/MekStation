import { baseInput } from '../../src/utils/construction/battlearmor/__tests__/battleArmorBV.test.helpers';
import {
  battleArmorBVTerms,
  calculateBattleArmorBV,
} from '../../src/utils/construction/battlearmor/battleArmorBV';

test('BA exposes movement factors even on empty pools and the native squad factor', () => {
  const b = calculateBattleArmorBV(
    baseInput({
      armorPointsPerTrooper: 0,
      groundMP: 0,
      jumpMP: 0,
      squadSize: 4,
    }),
  );
  expect(b).toMatchObject({
    squadFactor: 5.2,
    perTrooper: {
      defensive: { defensiveFactor: 1.1 },
      offensive: { speedFactor: 0.44 },
    },
  });
});

test('BA trace carries each modeled trooper without inventing native mount identities', () => {
  const b = calculateBattleArmorBV(baseInput({ squadSize: 4 }));
  const trace = battleArmorBVTerms(b);
  expect(trace).toMatchObject({
    'squad.strength': 4,
    'trooper.4.baseBV': b.perTrooper.total,
    'trooper.4.armorBV': b.perTrooper.defensive.armorBV,
  });
  expect(trace['trooper.5.baseBV']).toBeUndefined();
  expect(trace['weapon.unknown']).toBeUndefined();
});
