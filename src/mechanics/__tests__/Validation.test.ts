import { MechValidator } from '../Validation';
import { IMechLabState, DEFAULT_MECH_STATE } from '../../features/mech-lab/store/MechLabState';
import { TechBase, RulesLevel } from '../../types/TechBase';
import { EngineType, GyroType, CockpitType, StructureType, ArmorType, HeatSinkType } from '../../types/SystemComponents';

describe('MechValidator', () => {
    let state: IMechLabState;

    beforeEach(() => {
        state = { ...DEFAULT_MECH_STATE };
    });

    it('validates a valid standard mech', () => {
        state.currentWeight = 20;
        state.tonnage = 20;
        state.walkingMP = 5;
        const result = MechValidator.validate(state);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('detects overweight mechs', () => {
        state.currentWeight = 25;
        state.tonnage = 20;
        const result = MechValidator.validate(state);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Unit is overweight by 5.00 tons.');
    });

    it('detects invalid engine rating for standard rules', () => {
        state.rulesLevel = RulesLevel.STANDARD;
        state.tonnage = 100;
        state.walkingMP = 5; // Rating 500
        const result = MechValidator.validate(state);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Engine Rating 500 exceeds maximum of 400 for Standard rules.');
    });

    it('detects invalid engine type for Clan', () => {
        state.techBase = TechBase.CLAN;
        state.engineType = EngineType.LIGHT;
        const result = MechValidator.validate(state);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Clan Mechs cannot use Light Engines.');
    });

    it('detects mixed tech violation', () => {
        state.techBase = TechBase.INNER_SPHERE;
        state.structureType = StructureType.ENDO_STEEL_CLAN;
        const result = MechValidator.validate(state);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Inner Sphere Mechs cannot use Clan Endo Steel.');
    });
});
