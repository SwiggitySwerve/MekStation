/**
 * WeightOps.ts
 * Pure functional implementation of weight calculations for BattleMech components.
 * Ports logic from legacy WeightBalanceService.ts.
 */

import {
    StructureType,
    EngineType,
    GyroType,
    HeatSinkType,
    ArmorType,
    JumpJetType
} from '../types/SystemComponents';
import {
    STRUCTURE_WEIGHT_MULTIPLIER,
    ARMOR_POINTS_PER_TON,
    calculateEngineWeight as rulesCalculateEngineWeight,
    calculateGyroWeight as rulesCalculateGyroWeight,
    calculateStructureWeight as rulesCalculateStructureWeight,
    calculateArmorWeight as rulesCalculateArmorWeight,
    getMaxArmorPoints as rulesGetMaxArmorPoints,
} from '../../src-old/constants/BattleTechConstructionRules';

export const WeightOps = {
    /**
     * Calculates the weight of the internal structure.
     */
    calculateStructureWeight(tonnage: number, type: StructureType): number {
        // Handle Industrial structure which might be missing from legacy rules
        if (type === StructureType.INDUSTRIAL) {
            return tonnage * 0.1 * 2.0;
        }
        return rulesCalculateStructureWeight(tonnage, type);
    },

    /**
     * Calculates the weight of the engine.
     */
    calculateEngineWeight(engineType: EngineType, rating: number): number {
        return rulesCalculateEngineWeight(rating, engineType);
    },

    /**
     * Calculates the weight of the gyro.
     */
    calculateGyroWeight(gyroType: GyroType, engineRating: number): number {
        return rulesCalculateGyroWeight(engineRating, gyroType);
    },

    /**
     * Calculates the weight of the cockpit.
     */
    calculateCockpitWeight(type: string): number {
        switch (type) {
            case 'Small': return 2.0;
            case 'Torso-Mounted': return 4.0;
            case 'Primitive': return 5.0;
            default: return 3.0;
        }
    },

    /**
     * Calculates the weight of heat sinks.
     */
    calculateHeatSinkWeight(type: HeatSinkType, count: number): number {
        switch (type) {
            case HeatSinkType.LASER:
                return count * 1.5;
            case HeatSinkType.COMPACT:
                return count * 0.5;
            case HeatSinkType.DOUBLE:
            case HeatSinkType.SINGLE:
            default:
                return count * 1.0;
        }
    },

    /**
     * Calculates the weight of jump jets.
     * Rules:
     * 10-55 tons: 0.5 tons / MP
     * 60-85 tons: 1.0 tons / MP
     * 90-100 tons: 2.0 tons / MP
     */
    calculateJumpJetWeight(tonnage: number, jumpMP: number, type: JumpJetType): number {
        if (jumpMP <= 0) return 0;

        let weightPerMP = 0.5;
        if (tonnage >= 90) {
            weightPerMP = 2.0;
        } else if (tonnage >= 60) {
            weightPerMP = 1.0;
        }

        const totalWeight = weightPerMP * jumpMP;

        switch (type) {
            case JumpJetType.IMPROVED:
                return totalWeight * 2.0;
            case JumpJetType.MECHANICAL:
                return totalWeight;
            case JumpJetType.STANDARD:
            default:
                return totalWeight;
        }
    },

    /**
     * Calculates the total weight of armor.
     */
    calculateArmorWeightFromPoints(points: number, type: ArmorType): number {
        return rulesCalculateArmorWeight(points, type);
    },

    getArmorPointsPerTon(type: ArmorType): number {
        // @ts-ignore - Accessing legacy constant map with strict enum
        const points = ARMOR_POINTS_PER_TON[type];
        if (points) return points;

        // Fallback for types not in legacy map
        switch (type) {
            case ArmorType.HARDENED: return 8;
            default: return 16;
        }
    },

    /**
     * Helper to get max armor points for a tonnage.
     */
    getMaxArmorPoints(tonnage: number): number {
        return rulesGetMaxArmorPoints(tonnage);
    }
};
