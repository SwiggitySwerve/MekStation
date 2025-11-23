import { WeightOps } from '../WeightOps';
import { StructureType, EngineType, GyroType, HeatSinkType, JumpJetType, ArmorType } from '../../types/SystemComponents';

describe('WeightOps', () => {
    describe('calculateStructureWeight', () => {
        it('calculates standard structure weight (10%)', () => {
            expect(WeightOps.calculateStructureWeight(100, StructureType.STANDARD)).toBe(10);
            expect(WeightOps.calculateStructureWeight(20, StructureType.STANDARD)).toBe(2);
        });

        it('calculates endo steel weight (5%)', () => {
            expect(WeightOps.calculateStructureWeight(100, StructureType.ENDO_STEEL)).toBe(5);
        });

        it('calculates reinforced weight (20%)', () => {
            expect(WeightOps.calculateStructureWeight(100, StructureType.REINFORCED)).toBe(20);
        });

        it('calculates industrial weight (20%)', () => {
            expect(WeightOps.calculateStructureWeight(100, StructureType.INDUSTRIAL)).toBe(20);
        });
    });

    describe('calculateEngineWeight', () => {
        it('calculates standard engine weight', () => {
            expect(WeightOps.calculateEngineWeight(EngineType.STANDARD, 300)).toBe(12); // 300 / 25 = 12
        });

        it('calculates XL engine weight', () => {
            expect(WeightOps.calculateEngineWeight(EngineType.XL, 300)).toBe(6); // 12 * 0.5 = 6
        });

        it('calculates Light engine weight', () => {
            expect(WeightOps.calculateEngineWeight(EngineType.LIGHT, 300)).toBe(9); // 12 * 0.75 = 9
        });
    });

    describe('calculateGyroWeight', () => {
        it('calculates standard gyro weight', () => {
            expect(WeightOps.calculateGyroWeight(GyroType.STANDARD, 300)).toBe(3); // 300 / 100 = 3
        });

        it('calculates XL gyro weight', () => {
            expect(WeightOps.calculateGyroWeight(GyroType.XL, 300)).toBe(1.5); // 3 * 0.5 = 1.5
        });

        it('calculates Compact gyro weight', () => {
            expect(WeightOps.calculateGyroWeight(GyroType.COMPACT, 300)).toBe(4.5); // 3 * 1.5 = 4.5
        });
    });

    describe('calculateHeatSinkWeight', () => {
        it('calculates standard heat sink weight', () => {
            expect(WeightOps.calculateHeatSinkWeight(HeatSinkType.SINGLE, 10)).toBe(10);
            expect(WeightOps.calculateHeatSinkWeight(HeatSinkType.DOUBLE, 10)).toBe(10);
        });

        it('calculates compact heat sink weight', () => {
            expect(WeightOps.calculateHeatSinkWeight(HeatSinkType.COMPACT, 10)).toBe(5); // 10 * 0.5 = 5
        });

        it('calculates laser heat sink weight', () => {
            expect(WeightOps.calculateHeatSinkWeight(HeatSinkType.LASER, 10)).toBe(15); // 10 * 1.5 = 15
        });
    });

    describe('calculateJumpJetWeight', () => {
        it('calculates standard jump jet weight for medium mech (55t)', () => {
            // 55 tons -> 0.5 tons/MP
            // 5 MP -> 2.5 tons
            expect(WeightOps.calculateJumpJetWeight(55, 5, JumpJetType.STANDARD)).toBe(2.5);
        });

        it('calculates standard jump jet weight for heavy mech (75t)', () => {
            // 75 tons -> 1.0 tons/MP
            // 4 MP -> 4.0 tons
            expect(WeightOps.calculateJumpJetWeight(75, 4, JumpJetType.STANDARD)).toBe(4.0);
        });

        it('calculates standard jump jet weight for assault mech (100t)', () => {
            // 100 tons -> 2.0 tons/MP
            // 3 MP -> 6.0 tons
            expect(WeightOps.calculateJumpJetWeight(100, 3, JumpJetType.STANDARD)).toBe(6.0);
        });

        it('calculates improved jump jet weight', () => {
            // 55 tons -> 0.5 * 2 = 1.0 tons/MP
            // 5 MP -> 5.0 tons
            expect(WeightOps.calculateJumpJetWeight(55, 5, JumpJetType.IMPROVED)).toBe(5.0);
        });
    });

    describe('calculateArmorWeightFromPoints', () => {
        it('calculates standard armor weight', () => {
            // 16 points per ton
            expect(WeightOps.calculateArmorWeightFromPoints(160, ArmorType.STANDARD)).toBe(10);
        });

        it('calculates ferro-fibrous armor weight', () => {
            // ~35.84 or 35.2 points per ton depending on rules version used in constants
            // Legacy constant is 17.92 points per ton? Wait.
            // BattleTechConstructionRules.ts says: 'Ferro-Fibrous': 17.92
            // WeightOps.ts had: return 35.84; // Using 35.84 (1.12 * 32) or legacy 35.2?
            // Wait, points per ton for Standard is 16.
            // Ferro is 1.12 * Standard = 17.92.
            // WeightOps.ts had `return 35.2` in `getArmorPointsPerTon`.
            // But `BattleTechConstructionRules.ts` has `17.92`.
            // 35.2 is roughly 2 * 17.6?
            // Let's check the math.
            // Standard: 16 pts/ton.
            // Ferro (IS): 1.12 * 16 = 17.92 pts/ton.
            // If WeightOps returned 35.2, that's huge.
            // Ah, maybe WeightOps was calculating something else?
            // `getArmorPointsPerTon` in WeightOps (original):
            // case ArmorType.FERRO_FIBROUS: ... return 35.2;
            // That seems wrong if it's points per ton. 35 points per ton is way too efficient.
            // Unless it's for something else?
            // But `calculateArmorWeightFromPoints` does `points / pointsPerTon`.
            // So higher pointsPerTon means lighter armor.
            // If Ferro is 35.2, it's twice as light as Standard (16).
            // Real Ferro is ~12% lighter (17.92 vs 16).
            // So 35.2 is definitely wrong for standard Ferro.
            // Maybe it was for Heavy Ferro?
            // Heavy Ferro is 1.2 * 16 = 19.2.
            // Light Ferro is 1.05 * 16 = 16.8.
            // I suspect `WeightOps` had a bug or I misread it.
            // Let's trust `BattleTechConstructionRules.ts` which has 17.92.

            // 179.2 points / 17.92 = 10 tons
            expect(WeightOps.calculateArmorWeightFromPoints(179.2, ArmorType.FERRO_FIBROUS)).toBeCloseTo(10);
        });
    });
});
