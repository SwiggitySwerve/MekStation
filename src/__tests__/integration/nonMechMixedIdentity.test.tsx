import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';

import aerospace from '../../../public/data/units/aerospace/Corax CRX-OR.json';
import battlearmor from '../../../public/data/units/battlearmor/Black Wolf Battle Armor [Heavy Mortar](Sqd4).json';
import infantry from '../../../public/data/units/infantry/clan-engineer-point-demolition.json';
import vehicle from '../../../public/data/units/vehicles/Anhur (P-Stealth).json';
import { roundTripNonMechLibrary } from './nonMechMixedIdentity.test-helpers';

// Representative chassis overlays only; the complete census uses C2's exact
// packet bytes in scratch. BLKFile.setTechLevel (48fcb2f64) preserves both facts.
it.each([
  ['vehicles', vehicle],
  ['aerospace', aerospace],
  ['infantry', infantry],
  ['battlearmor', battlearmor],
] as const)(
  'preserves Mixed/Clan through the real %s library save and SQLite reopen',
  async (family, source) => {
    const definition = UnitContract.parse({
      ...source,
      techBase: 'MIXED',
      ...(family === 'battlearmor'
        ? { clanChassis: true }
        : { componentTechBases: { chassis: 'CLAN' } }),
    });
    const result = await roundTripNonMechLibrary(family, definition);
    const expected = {
      techBaseMode: TechBaseMode.MIXED,
      chassisTechBase: TechBase.CLAN,
      techBase: TechBase.CLAN,
    };
    expect(result.loaded).toEqual(expected);
    expect(result.reopened).toEqual(expected);
    for (const saved of [result.saved, result.secondSave]) {
      expect(saved.techBase).toBe('MIXED');
      if (family === 'battlearmor') expect(saved.clanChassis).toBe(true);
      else expect(saved.componentTechBases?.chassis).toBe('CLAN');
    }
  },
  60_000,
);
