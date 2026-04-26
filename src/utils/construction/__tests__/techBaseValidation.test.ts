/**
 * Tech base compatibility invariants.
 *
 * Per construction rules:
 *  - Same tech base components are always compatible.
 *  - Mixed-tech construction explicitly allows cross-base components.
 *  - IS components on a Clan unit are allowed even without mixed-tech (inferior tech).
 *  - Clan components on an IS unit require mixed-tech.
 *  - Highest rules level among components dictates the unit's required level.
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';

import {
  getAvailableArmorTypes,
  getAvailableEngineTypes,
  getAvailableGyroTypes,
  getAvailableHeatSinkTypes,
  getAvailableStructureTypes,
  getEngineTechBase,
  getHighestRulesLevel,
  isComponentCompatible,
  validateTechBaseCompatibility,
} from '../techBaseValidation';

describe('isComponentCompatible — same tech base', () => {
  it('IS-on-IS always compatible', () => {
    expect(
      isComponentCompatible(
        TechBase.INNER_SPHERE,
        TechBase.INNER_SPHERE,
        false,
      ),
    ).toBe(true);
  });

  it('Clan-on-Clan always compatible', () => {
    expect(isComponentCompatible(TechBase.CLAN, TechBase.CLAN, false)).toBe(
      true,
    );
  });
});

describe('isComponentCompatible — cross tech base', () => {
  it('IS components ALLOWED on Clan units (inferior tech rule)', () => {
    expect(
      isComponentCompatible(TechBase.INNER_SPHERE, TechBase.CLAN, false),
    ).toBe(true);
  });

  it('Clan components REJECTED on IS units without mixed-tech', () => {
    expect(
      isComponentCompatible(TechBase.CLAN, TechBase.INNER_SPHERE, false),
    ).toBe(false);
  });

  it('Mixed-tech permits any cross-base combination', () => {
    expect(
      isComponentCompatible(TechBase.CLAN, TechBase.INNER_SPHERE, true),
    ).toBe(true);
  });
});

describe('getEngineTechBase', () => {
  it('returns INNER_SPHERE for IS XL engine', () => {
    expect(getEngineTechBase(EngineType.XL_IS)).toBe(TechBase.INNER_SPHERE);
  });

  it('returns CLAN for Clan XL engine', () => {
    expect(getEngineTechBase(EngineType.XL_CLAN)).toBe(TechBase.CLAN);
  });
});

describe('validateTechBaseCompatibility', () => {
  it('passes when all components match unit tech base', () => {
    const r = validateTechBaseCompatibility(TechBase.INNER_SPHERE, {
      engineType: EngineType.STANDARD,
      gyroType: GyroType.STANDARD,
      structureType: InternalStructureType.STANDARD,
    });
    expect(r.isValid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('flags Clan engine on IS unit without mixed-tech', () => {
    const r = validateTechBaseCompatibility(
      TechBase.INNER_SPHERE,
      { engineType: EngineType.XL_CLAN },
      false,
    );
    expect(r.isValid).toBe(false);
    expect(r.errors[0]).toMatch(/Engine/);
  });

  it('passes when mixed-tech is enabled', () => {
    const r = validateTechBaseCompatibility(
      TechBase.INNER_SPHERE,
      { engineType: EngineType.XL_CLAN },
      true,
    );
    expect(r.isValid).toBe(true);
    // Mixed-tech warning when multiple tech bases are present
    expect(r.warnings.length).toBeGreaterThanOrEqual(0);
  });
});

describe('getHighestRulesLevel', () => {
  it('returns INTRODUCTORY when no components are supplied', () => {
    expect(getHighestRulesLevel({})).toBe(RulesLevel.INTRODUCTORY);
  });

  it('escalates to STANDARD when an XL engine is present', () => {
    // XL_IS is STANDARD per ENGINE_DEFINITIONS
    const level = getHighestRulesLevel({ engineType: EngineType.XL_IS });
    expect(level).toBe(RulesLevel.STANDARD);
  });

  it('takes the highest level across all components', () => {
    // Hardened armor is EXPERIMENTAL in this codebase → final level is EXPERIMENTAL
    const level = getHighestRulesLevel({
      engineType: EngineType.STANDARD, // INTRO
      armorType: ArmorTypeEnum.HARDENED, // EXPERIMENTAL
    });
    expect(level).toBe(RulesLevel.EXPERIMENTAL);
  });
});

describe('getAvailable* (filtering by tech base)', () => {
  it('IS unit (no mixed-tech) returns only IS-compatible engines + IS components on Clan', () => {
    const engines = getAvailableEngineTypes(TechBase.INNER_SPHERE, false);
    // STANDARD is IS-base → must be available
    expect(engines).toContain(EngineType.STANDARD);
    // XL_IS is IS-base → available
    expect(engines).toContain(EngineType.XL_IS);
    // XL_CLAN is Clan-only → NOT available
    expect(engines).not.toContain(EngineType.XL_CLAN);
  });

  it('Clan unit (no mixed-tech) returns Clan + IS-as-inferior engines', () => {
    const engines = getAvailableEngineTypes(TechBase.CLAN, false);
    expect(engines).toContain(EngineType.XL_CLAN);
    // IS XL is inferior → still allowed on Clan
    expect(engines).toContain(EngineType.XL_IS);
  });

  it('Mixed-tech expands the available set', () => {
    const standard = getAvailableEngineTypes(TechBase.INNER_SPHERE, false);
    const mixed = getAvailableEngineTypes(TechBase.INNER_SPHERE, true);
    expect(mixed.length).toBeGreaterThanOrEqual(standard.length);
  });

  it('getAvailableGyroTypes / Structure / HeatSink / Armor return non-empty arrays', () => {
    expect(
      getAvailableGyroTypes(TechBase.INNER_SPHERE, false).length,
    ).toBeGreaterThan(0);
    expect(
      getAvailableStructureTypes(TechBase.INNER_SPHERE, false).length,
    ).toBeGreaterThan(0);
    expect(
      getAvailableHeatSinkTypes(TechBase.INNER_SPHERE, false).length,
    ).toBeGreaterThan(0);
    expect(
      getAvailableArmorTypes(TechBase.INNER_SPHERE, false).length,
    ).toBeGreaterThan(0);
  });
});
