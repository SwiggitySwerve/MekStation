import { CriticalSlots, LOCATIONS } from '../CriticalSlots';
import { EngineType, GyroType, CockpitType } from '../../types/SystemComponents';
import { TechBase } from '../../types/TechBase';

describe('CriticalSlots', () => {
    describe('getTotalSlots', () => {
        it('returns correct slots for Head', () => {
            expect(CriticalSlots.getTotalSlots('HD')).toBe(6);
        });
        it('returns correct slots for CT', () => {
            expect(CriticalSlots.getTotalSlots('CT')).toBe(12);
        });
    });

    describe('getDynamicComponentSlots', () => {
        it('calculates CT slots for Standard Engine/Gyro', () => {
            // Engine (6) + Gyro (4) = 10
            const used = CriticalSlots.getDynamicComponentSlots(
                'CT',
                EngineType.STANDARD,
                GyroType.STANDARD,
                CockpitType.STANDARD,
                TechBase.INNER_SPHERE
            );
            expect(used).toBe(10);
        });

        it('calculates Side Torso slots for IS XL Engine', () => {
            // IS XL = 3 slots
            const used = CriticalSlots.getDynamicComponentSlots(
                'LT',
                EngineType.XL,
                GyroType.STANDARD,
                CockpitType.STANDARD,
                TechBase.INNER_SPHERE
            );
            expect(used).toBe(3);
        });

        it('calculates Side Torso slots for Clan XL Engine', () => {
            // Clan XL = 2 slots
            const used = CriticalSlots.getDynamicComponentSlots(
                'LT',
                EngineType.XL,
                GyroType.STANDARD,
                CockpitType.STANDARD,
                TechBase.CLAN
            );
            expect(used).toBe(2);
        });
    });

    describe('canFit', () => {
        it('returns true if space is available', () => {
            // CT: 12 total. 10 used by engine/gyro. 2 free.
            // Item size 1.
            expect(CriticalSlots.canFit('CT', 1, 0, 10)).toBe(true);
        });

        it('returns false if space is insufficient', () => {
            // CT: 12 total. 10 used. 2 free.
            // Item size 3.
            expect(CriticalSlots.canFit('CT', 3, 0, 10)).toBe(false);
        });
    });
});
