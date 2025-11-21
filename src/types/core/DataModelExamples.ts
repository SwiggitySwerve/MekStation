/**
 * Data Model Examples
 * 
 * This file provides concrete examples of how the core data models are used
 * to represent different unit types, tech mixes, and equipment allocations.
 * 
 * Usage:
 * These examples serve as a reference for implementing Factories, Tests, and UI components.
 */

import { 
    TechBase, 
    RulesLevel, 
    UnitType, 
    ComponentCategory,
    EquipmentCategory
} from './BaseTypes';

import { 
    ICompleteUnitConfiguration, 
    IEquipmentInstance,
    IStructureConfiguration,
    IArmorConfiguration
} from './UnitInterfaces';

import { 
    BATTLEMECH_STRUCTURE, 
    VEHICLE_STRUCTURE, 
    IComponentDefinition,
    ComponentType
} from './ComponentStructure';

import { IUnitTechStatus } from './TechStatus';

// =============================================================================
// EXAMPLE 1: STANDARD BATTLEMECH (INNER SPHERE)
// =============================================================================

/**
 * Represents a standard Inner Sphere BattleMech (e.g., WHM-6R Warhammer)
 * Uses the standard BattleMech structure definition.
 */
export const EXAMPLE_IS_MECH_CONFIG: Partial<ICompleteUnitConfiguration> = {
    id: 'uuid-whm-6r',
    name: 'Warhammer',
    chassis: 'Warhammer',
    model: 'WHM-6R',
    unitType: UnitType.BATTLEMECH,
    
    // Technology Status: Pure Inner Sphere
    techBase: TechBase.INNER_SPHERE,
    techStatus: {
        overall: TechBase.INNER_SPHERE,
        chassis: TechBase.INNER_SPHERE,
        components: {
            'engine': TechBase.INNER_SPHERE,
            'gyro': TechBase.INNER_SPHERE,
            'structure': TechBase.INNER_SPHERE
        },
        equipment: {
            'ppc-rt': TechBase.INNER_SPHERE,
            'ppc-lt': TechBase.INNER_SPHERE
        },
        hasClanTech: false,
        hasInnerSphereTech: true
    },

    rulesLevel: RulesLevel.INTRODUCTORY,
    era: 'Succession Wars',
    tonnage: 70,

    // Structural Configuration
    // Note: The keys in currentPoints/maxPoints match BATTLEMECH_STRUCTURE IDs
    structure: {
        definition: {
            type: 'Standard',
            techBase: TechBase.INNER_SPHERE,
            category: ComponentCategory.STRUCTURE,
            techLevel: RulesLevel.INTRODUCTORY,
            rulesLevel: RulesLevel.INTRODUCTORY,
            introductionYear: 2400,
            costMultiplier: 1
        } as any,
        currentPoints: {
            'head': 3,
            'centerTorso': 22,
            'leftTorso': 15,
            'rightTorso': 15,
            'leftArm': 11,
            'rightArm': 11,
            'leftLeg': 15,
            'rightLeg': 15
        },
        maxPoints: {
            'head': 3,
            'centerTorso': 22,
            'leftTorso': 15,
            'rightTorso': 15,
            'leftArm': 11,
            'rightArm': 11,
            'leftLeg': 15,
            'rightLeg': 15
        }
    },

    // Equipment Allocation
    // Note: 'location' matches the ID from BATTLEMECH_STRUCTURE
    equipment: [
        {
            id: 'inst-ppc-1',
            equipmentId: 'weap-ppc-is',
            location: 'rightArm', // Matches ComponentDefinition.id
            slotIndex: 0,
            quantity: 1,
            status: { operational: true, damaged: false, destroyed: false, criticalHits: 0 },
            equipment: {
                name: 'PPC',
                category: EquipmentCategory.WEAPON,
                techBase: TechBase.INNER_SPHERE,
                // ... other equipment stats
            } as any
        },
        {
            id: 'inst-ppc-2',
            equipmentId: 'weap-ppc-is',
            location: 'leftArm',
            slotIndex: 0,
            quantity: 1,
            status: { operational: true, damaged: false, destroyed: false, criticalHits: 0 },
            equipment: {
                name: 'PPC',
                category: EquipmentCategory.WEAPON,
                techBase: TechBase.INNER_SPHERE
            } as any
        }
    ]
};

// =============================================================================
// EXAMPLE 2: MIXED TECH OMNIMECH (AVATAR)
// =============================================================================

/**
 * Represents a Mixed Tech Mech (IS Chassis with Clan Weapons)
 * This demonstrates how TechStatus handles the mix.
 */
export const EXAMPLE_MIXED_MECH_CONFIG: Partial<ICompleteUnitConfiguration> = {
    id: 'uuid-avatar-custom',
    name: 'Avatar',
    model: 'AV1-OR (Mixed)',
    unitType: UnitType.BATTLEMECH,

    // Technology Status: Mixed
    techBase: TechBase.MIXED,
    techStatus: {
        overall: TechBase.MIXED,
        chassis: TechBase.INNER_SPHERE, // The base chassis is IS
        components: {
            'engine': TechBase.INNER_SPHERE, // XL Engine (IS)
            'structure': TechBase.INNER_SPHERE // Standard Structure
        },
        equipment: {
            'cl-erpbc': TechBase.CLAN, // Clan ER PPC
            'is-ml': TechBase.INNER_SPHERE // IS Medium Laser
        },
        hasClanTech: true,
        hasInnerSphereTech: true
    },

    rulesLevel: RulesLevel.ADVANCED,
    tonnage: 70,

    // Engine: IS XL Engine
    engine: {
        definition: {
            type: 'XL',
            techBase: TechBase.INNER_SPHERE, // Explicitly IS tech
            category: ComponentCategory.ENGINE
        } as any,
        rating: 280,
        tonnage: 8 // calculated
    },

    // Equipment: Mixing Tech Bases
    equipment: [
        {
            id: 'inst-cl-erppc',
            equipmentId: 'weap-erppc-clan',
            location: 'rightArm',
            slotIndex: 0,
            quantity: 1,
            status: { operational: true, damaged: false, destroyed: false, criticalHits: 0 },
            equipment: {
                name: 'ER PPC (Clan)',
                techBase: TechBase.CLAN, // Clan Weapon
                category: EquipmentCategory.WEAPON
            } as any
        },
        {
            id: 'inst-is-ml',
            equipmentId: 'weap-ml-is',
            location: 'centerTorso',
            slotIndex: 0,
            quantity: 1,
            status: { operational: true, damaged: false, destroyed: false, criticalHits: 0 },
            equipment: {
                name: 'Medium Laser',
                techBase: TechBase.INNER_SPHERE, // IS Weapon
                category: EquipmentCategory.WEAPON
            } as any
        }
    ]
};

// =============================================================================
// EXAMPLE 3: COMBAT VEHICLE (TANK)
// =============================================================================

/**
 * Represents a Combat Vehicle (e.g., Manticore Heavy Tank)
 * Uses VEHICLE_STRUCTURE instead of BATTLEMECH_STRUCTURE.
 */
export const EXAMPLE_VEHICLE_CONFIG: Partial<ICompleteUnitConfiguration> = {
    id: 'uuid-manticore',
    name: 'Manticore',
    model: 'Heavy Tank',
    unitType: UnitType.COMBAT_VEHICLE, // Explicit Unit Type
    
    techBase: TechBase.INNER_SPHERE,
    
    // Structural Configuration for Vehicle
    structure: {
        definition: {
            type: 'Standard',
            techBase: TechBase.INNER_SPHERE
        } as any,
        // Note: Keys match VEHICLE_STRUCTURE IDs ('front', 'left', 'right', 'rear', 'turret')
        currentPoints: {
            'front': 42,
            'left': 33,
            'right': 33,
            'rear': 26,
            'turret': 42
        },
        maxPoints: {
            'front': 42,
            'left': 33,
            'right': 33,
            'rear': 26,
            'turret': 42
        }
    },

    // Vehicle Armor Allocation
    armor: {
        definition: {
            type: 'Standard',
            techBase: TechBase.INNER_SPHERE
        } as any,
        tonnage: 11,
        // Armor follows the same location IDs
        allocation: {
            'front': 42,
            'left': 33,
            'right': 33,
            'rear': 26,
            'turret': 42
        }
    },

    // Equipment located in Vehicle-specific locations
    equipment: [
        {
            id: 'inst-ppc-turret',
            equipmentId: 'weap-ppc-is',
            location: 'turret', // Located in Turret
            slotIndex: 0, // Slot index matters less for vehicles but is tracked
            quantity: 1,
            status: { operational: true, damaged: false, destroyed: false, criticalHits: 0 },
            equipment: {
                name: 'PPC',
                category: EquipmentCategory.WEAPON
            } as any
        },
        {
            id: 'inst-lrm-turret',
            equipmentId: 'weap-lrm10',
            location: 'turret',
            slotIndex: 1,
            quantity: 1,
            status: { operational: true, damaged: false, destroyed: false, criticalHits: 0 },
            equipment: {
                name: 'LRM-10',
                category: EquipmentCategory.WEAPON
            } as any
        },
        {
            id: 'inst-srm-front',
            equipmentId: 'weap-srm6',
            location: 'front', // Fixed forward firing
            slotIndex: 0,
            quantity: 1,
            status: { operational: true, damaged: false, destroyed: false, criticalHits: 0 },
            equipment: {
                name: 'SRM-6',
                category: EquipmentCategory.WEAPON
            } as any
        }
    ]
};

// =============================================================================
// EXAMPLE 4: AEROSPACE FIGHTER (CUSTOM STRUCTURE)
// =============================================================================

/**
 * Definition of Aerospace Fighter Structure
 * Demonstrates how to define a new unit type structure dynamically.
 */
export const AEROSPACE_STRUCTURE: IComponentDefinition[] = [
    { id: 'nose', name: 'Nose', type: ComponentType.NOSE, shortName: 'N', defaultSlots: 0, required: true },
    { id: 'leftWing', name: 'Left Wing', type: ComponentType.WING, shortName: 'LW', defaultSlots: 0, required: true },
    { id: 'rightWing', name: 'Right Wing', type: ComponentType.WING, shortName: 'RW', defaultSlots: 0, required: true },
    { id: 'fuselage', name: 'Fuselage', type: ComponentType.FUSELAGE, shortName: 'F', defaultSlots: 0, required: true }, // Rear/Engine area
    { id: 'aft', name: 'Aft', type: ComponentType.AFT, shortName: 'A', defaultSlots: 0, required: true }
];

export const EXAMPLE_AEROSPACE_CONFIG: Partial<ICompleteUnitConfiguration> = {
    id: 'uuid-corsair',
    name: 'Corsair',
    unitType: UnitType.AEROSPACE,
    
    // Using Aerospace locations
    equipment: [
        {
            id: 'inst-laser-nose',
            equipmentId: 'weap-ll',
            location: 'nose', // Matches AEROSPACE_STRUCTURE id
            slotIndex: 0,
            quantity: 2,
            status: { operational: true, damaged: false, destroyed: false, criticalHits: 0 },
            equipment: { name: 'Large Laser' } as any
        },
        {
            id: 'inst-ml-lw',
            equipmentId: 'weap-ml',
            location: 'leftWing',
            slotIndex: 0,
            quantity: 2,
            status: { operational: true, damaged: false, destroyed: false, criticalHits: 0 },
            equipment: { name: 'Medium Laser' } as any
        }
    ]
};
