/**
 * Tech Status Interfaces
 * 
 * Defines the technology status of a unit, derived from its components
 * and equipment. Handles the "Mixed Tech" logic where a unit is the sum
 * of its parts.
 */

import { TechBase, EntityId } from './BaseTypes';

/**
 * Detailed tech breakdown of a unit
 */
export interface IUnitTechStatus {
    /**
     * The overall calculated tech base of the unit.
     * - Inner Sphere: All components and equipment are IS.
     * - Clan: All components and equipment are Clan.
     * - Mixed: Contains a mix of IS and Clan tech.
     */
    readonly overall: TechBase;

    /**
     * The base chassis technology.
     * Usually defined by the internal structure or the "primary" intention.
     */
    readonly chassis: TechBase;

    /**
     * Breakdown of tech bases for components (e.g. Engines, Gyros).
     * Key is the component ID (e.g., 'engine', 'gyro').
     */
    readonly components: Record<string, TechBase>;

    /**
     * Breakdown of tech bases for equipment.
     * Key is the equipment ID.
     */
    readonly equipment: Record<EntityId, TechBase>;
    
    /**
     * Does the unit contain any Clan tech?
     */
    readonly hasClanTech: boolean;

    /**
     * Does the unit contain any Inner Sphere tech?
     */
    readonly hasInnerSphereTech: boolean;
}

/**
 * Interface for an entity that contributes to the unit's tech status
 */
export interface ITechContributor {
    readonly id: string;
    readonly name: string;
    readonly techBase: TechBase;
}
