/**
 * MechConfigurationSystem Unit Tests
 *
 * Tests for the mech configuration system including:
 * - Configuration definitions (Biped, Quad, Tripod, LAM, QuadVee)
 * - Location validation and mapping
 * - Actuator definitions
 * - ConfigurationRegistry functionality
 */

import {
  MechLocation,
  MechConfiguration,
  BIPED_LOCATIONS,
  QUAD_LOCATIONS,
  TRIPOD_LOCATIONS,
  BIPED_CONFIGURATION,
  QUAD_CONFIGURATION,
  TRIPOD_CONFIGURATION,
  LAM_CONFIGURATION,
  QUADVEE_CONFIGURATION,
  LAM_EQUIPMENT,
  LAMMode,
  configurationRegistry,
  getLocationsForConfig,
  isValidLocationForConfig,
  getLocationDisplayName,
  getLocationAbbreviation,
  getLocationSlotCount,
  isLegLocation,
  isArmLocation,
  hasRearArmor,
  getActuatorsForLocation,
  isBipedLocation,
  ActuatorType,
} from '@/types/construction/MechConfigurationSystem';

describe('MechConfigurationSystem', () => {
  describe('Location Arrays', () => {
    it('should define all 8 biped locations', () => {
      expect(BIPED_LOCATIONS).toHaveLength(8);
      expect(BIPED_LOCATIONS).toContain(MechLocation.HEAD);
      expect(BIPED_LOCATIONS).toContain(MechLocation.CENTER_TORSO);
      expect(BIPED_LOCATIONS).toContain(MechLocation.LEFT_TORSO);
      expect(BIPED_LOCATIONS).toContain(MechLocation.RIGHT_TORSO);
      expect(BIPED_LOCATIONS).toContain(MechLocation.LEFT_ARM);
      expect(BIPED_LOCATIONS).toContain(MechLocation.RIGHT_ARM);
      expect(BIPED_LOCATIONS).toContain(MechLocation.LEFT_LEG);
      expect(BIPED_LOCATIONS).toContain(MechLocation.RIGHT_LEG);
    });

    it('should define all 8 quad locations', () => {
      expect(QUAD_LOCATIONS).toHaveLength(8);
      expect(QUAD_LOCATIONS).toContain(MechLocation.HEAD);
      expect(QUAD_LOCATIONS).toContain(MechLocation.CENTER_TORSO);
      expect(QUAD_LOCATIONS).toContain(MechLocation.LEFT_TORSO);
      expect(QUAD_LOCATIONS).toContain(MechLocation.RIGHT_TORSO);
      expect(QUAD_LOCATIONS).toContain(MechLocation.FRONT_LEFT_LEG);
      expect(QUAD_LOCATIONS).toContain(MechLocation.FRONT_RIGHT_LEG);
      expect(QUAD_LOCATIONS).toContain(MechLocation.REAR_LEFT_LEG);
      expect(QUAD_LOCATIONS).toContain(MechLocation.REAR_RIGHT_LEG);
    });

    it('should not include arm locations in quad mechs', () => {
      expect(QUAD_LOCATIONS).not.toContain(MechLocation.LEFT_ARM);
      expect(QUAD_LOCATIONS).not.toContain(MechLocation.RIGHT_ARM);
    });

    it('should not include quad legs in biped mechs', () => {
      expect(BIPED_LOCATIONS).not.toContain(MechLocation.FRONT_LEFT_LEG);
      expect(BIPED_LOCATIONS).not.toContain(MechLocation.FRONT_RIGHT_LEG);
      expect(BIPED_LOCATIONS).not.toContain(MechLocation.REAR_LEFT_LEG);
      expect(BIPED_LOCATIONS).not.toContain(MechLocation.REAR_RIGHT_LEG);
    });

    it('should define all 9 tripod locations including center leg', () => {
      expect(TRIPOD_LOCATIONS).toHaveLength(9);
      expect(TRIPOD_LOCATIONS).toContain(MechLocation.CENTER_LEG);
    });
  });

  describe('Configuration Definitions', () => {
    describe('BIPED_CONFIGURATION', () => {
      it('should have correct id and name', () => {
        expect(BIPED_CONFIGURATION.id).toBe(MechConfiguration.BIPED);
        expect(BIPED_CONFIGURATION.displayName).toBe('Biped');
      });

      it('should have 8 locations defined', () => {
        expect(BIPED_CONFIGURATION.locations).toHaveLength(8);
      });

      it('should have torso locations with rear armor', () => {
        const ctDef = BIPED_CONFIGURATION.locations.find(
          (l) => l.id === MechLocation.CENTER_TORSO
        );
        expect(ctDef?.hasRearArmor).toBe(true);
      });

      it('should have arm locations marked as limbs', () => {
        const laDef = BIPED_CONFIGURATION.locations.find(
          (l) => l.id === MechLocation.LEFT_ARM
        );
        expect(laDef?.isLimb).toBe(true);
      });
    });

    describe('QUAD_CONFIGURATION', () => {
      it('should have correct id and name', () => {
        expect(QUAD_CONFIGURATION.id).toBe(MechConfiguration.QUAD);
        expect(QUAD_CONFIGURATION.displayName).toBe('Quad');
      });

      it('should have 8 locations (4 legs, 3 torsos, 1 head)', () => {
        expect(QUAD_CONFIGURATION.locations).toHaveLength(8);
      });

      it('should have all four legs as limbs', () => {
        const legLocations = [
          MechLocation.FRONT_LEFT_LEG,
          MechLocation.FRONT_RIGHT_LEG,
          MechLocation.REAR_LEFT_LEG,
          MechLocation.REAR_RIGHT_LEG,
        ];

        for (const legLoc of legLocations) {
          const legDef = QUAD_CONFIGURATION.locations.find(
            (l) => l.id === legLoc
          );
          expect(legDef?.isLimb).toBe(true);
        }
      });

      it('should not have any arm locations', () => {
        const hasArms = QUAD_CONFIGURATION.locations.some(
          (l) =>
            l.id === MechLocation.LEFT_ARM ||
            l.id === MechLocation.RIGHT_ARM
        );
        expect(hasArms).toBe(false);
      });

      it('should specify QuadArmorDiagram as the diagram component', () => {
        expect(QUAD_CONFIGURATION.diagramComponentName).toBe('QuadArmorDiagram');
      });
    });

    describe('TRIPOD_CONFIGURATION', () => {
      it('should have center leg location', () => {
        const centerLegDef = TRIPOD_CONFIGURATION.locations.find(
          (l) => l.id === MechLocation.CENTER_LEG
        );
        expect(centerLegDef).toBeDefined();
        expect(centerLegDef?.isLimb).toBe(true);
      });
    });

    describe('LAM_CONFIGURATION', () => {
      it('should be defined as LAM configuration', () => {
        expect(LAM_CONFIGURATION.id).toBe(MechConfiguration.LAM);
        expect(LAM_CONFIGURATION.displayName).toBe('Land-Air Mech');
      });

      it('should have 8 biped locations', () => {
        expect(LAM_CONFIGURATION.locations).toHaveLength(8);
        expect(LAM_CONFIGURATION.locations.map(l => l.id)).toContain(MechLocation.HEAD);
        expect(LAM_CONFIGURATION.locations.map(l => l.id)).toContain(MechLocation.LEFT_ARM);
        expect(LAM_CONFIGURATION.locations.map(l => l.id)).toContain(MechLocation.LEFT_LEG);
      });

      it('should have three operating modes', () => {
        expect(LAM_CONFIGURATION.modes).toHaveLength(3);
        expect(LAM_CONFIGURATION.modes?.map(m => m.mode)).toContain(LAMMode.MECH);
        expect(LAM_CONFIGURATION.modes?.map(m => m.mode)).toContain(LAMMode.AIRMECH);
        expect(LAM_CONFIGURATION.modes?.map(m => m.mode)).toContain(LAMMode.FIGHTER);
      });

      it('should have fighter mode armor location mapping', () => {
        const fighterMode = LAM_CONFIGURATION.modes?.find(m => m.mode === LAMMode.FIGHTER);
        expect(fighterMode?.armorLocationMapping).toBeDefined();
        expect(fighterMode?.armorLocationMapping?.[MechLocation.HEAD]).toBe(MechLocation.NOSE);
        expect(fighterMode?.armorLocationMapping?.[MechLocation.CENTER_TORSO]).toBe(MechLocation.FUSELAGE);
        expect(fighterMode?.armorLocationMapping?.[MechLocation.LEFT_TORSO]).toBe(MechLocation.LEFT_WING);
        expect(fighterMode?.armorLocationMapping?.[MechLocation.RIGHT_TORSO]).toBe(MechLocation.RIGHT_WING);
        expect(fighterMode?.armorLocationMapping?.[MechLocation.LEFT_LEG]).toBe(MechLocation.AFT);
        expect(fighterMode?.armorLocationMapping?.[MechLocation.RIGHT_LEG]).toBe(MechLocation.AFT);
      });

      it('should have required equipment for Landing Gear and Avionics', () => {
        expect(LAM_CONFIGURATION.requiredEquipment).toBeDefined();
        expect(LAM_CONFIGURATION.requiredEquipment).toHaveLength(2);

        const landingGear = LAM_CONFIGURATION.requiredEquipment?.find(e => e.equipmentId === 'landing-gear');
        expect(landingGear).toBeDefined();
        expect(landingGear?.locations).toContain(MechLocation.CENTER_TORSO);
        expect(landingGear?.locations).toContain(MechLocation.LEFT_TORSO);
        expect(landingGear?.locations).toContain(MechLocation.RIGHT_TORSO);

        const avionics = LAM_CONFIGURATION.requiredEquipment?.find(e => e.equipmentId === 'avionics');
        expect(avionics).toBeDefined();
        expect(avionics?.locations).toContain(MechLocation.HEAD);
        expect(avionics?.locations).toContain(MechLocation.LEFT_TORSO);
        expect(avionics?.locations).toContain(MechLocation.RIGHT_TORSO);
      });

      it('should have prohibited equipment list', () => {
        expect(LAM_CONFIGURATION.prohibitedEquipment).toBeDefined();
        expect(LAM_CONFIGURATION.prohibitedEquipment).toContain('endo-steel');
        expect(LAM_CONFIGURATION.prohibitedEquipment).toContain('ferro-fibrous');
        expect(LAM_CONFIGURATION.prohibitedEquipment).toContain('stealth-armor');
      });

      it('should specify LAMArmorDiagram as the diagram component', () => {
        expect(LAM_CONFIGURATION.diagramComponentName).toBe('LAMArmorDiagram');
      });
    });

    describe('QUADVEE_CONFIGURATION', () => {
      it('should be defined as QuadVee configuration', () => {
        expect(QUADVEE_CONFIGURATION.id).toBe(MechConfiguration.QUADVEE);
        expect(QUADVEE_CONFIGURATION.displayName).toBe('QuadVee');
      });
    });
  });

  describe('ConfigurationRegistry', () => {
    it('should return configuration by type', () => {
      const bipedConfig = configurationRegistry.getConfiguration(
        MechConfiguration.BIPED
      );
      expect(bipedConfig).toBe(BIPED_CONFIGURATION);

      const quadConfig = configurationRegistry.getConfiguration(
        MechConfiguration.QUAD
      );
      expect(quadConfig).toBe(QUAD_CONFIGURATION);
    });

    it('should return all registered configurations', () => {
      const all = configurationRegistry.getAllConfigurations();
      expect(all).toHaveLength(5);
    });

    it('should return valid locations for configuration', () => {
      const quadLocations = configurationRegistry.getValidLocations(
        MechConfiguration.QUAD
      );
      expect(quadLocations).toHaveLength(8);
      expect(quadLocations).toContain(MechLocation.FRONT_LEFT_LEG);
      expect(quadLocations).not.toContain(MechLocation.LEFT_ARM);
    });

    it('should correctly identify quad configurations', () => {
      expect(
        configurationRegistry.isQuadConfiguration(MechConfiguration.QUAD)
      ).toBe(true);
      expect(
        configurationRegistry.isQuadConfiguration(MechConfiguration.QUADVEE)
      ).toBe(true);
      expect(
        configurationRegistry.isQuadConfiguration(MechConfiguration.BIPED)
      ).toBe(false);
    });

    it('should correctly identify LAM configurations', () => {
      expect(
        configurationRegistry.isLAMConfiguration(MechConfiguration.LAM)
      ).toBe(true);
      expect(
        configurationRegistry.isLAMConfiguration(MechConfiguration.BIPED)
      ).toBe(false);
      expect(
        configurationRegistry.isLAMConfiguration(MechConfiguration.QUAD)
      ).toBe(false);
    });

    it('should correctly identify transforming configurations', () => {
      expect(
        configurationRegistry.isTransformingConfiguration(MechConfiguration.LAM)
      ).toBe(true);
      expect(
        configurationRegistry.isTransformingConfiguration(MechConfiguration.QUADVEE)
      ).toBe(true);
      expect(
        configurationRegistry.isTransformingConfiguration(MechConfiguration.BIPED)
      ).toBe(false);
      expect(
        configurationRegistry.isTransformingConfiguration(MechConfiguration.QUAD)
      ).toBe(false);
    });

    it('should return LAM modes', () => {
      const modes = configurationRegistry.getModes(MechConfiguration.LAM);
      expect(modes).toHaveLength(3);
      expect(modes?.map(m => m.mode)).toEqual([LAMMode.MECH, LAMMode.AIRMECH, LAMMode.FIGHTER]);
    });

    it('should return undefined modes for non-transforming configs', () => {
      const modes = configurationRegistry.getModes(MechConfiguration.BIPED);
      expect(modes).toBeUndefined();
    });

    it('should return fighter armor mapping for LAM', () => {
      const mapping = configurationRegistry.getFighterArmorMapping(MechConfiguration.LAM);
      expect(mapping).toBeDefined();
      expect(mapping?.[MechLocation.HEAD]).toBe(MechLocation.NOSE);
      expect(mapping?.[MechLocation.CENTER_TORSO]).toBe(MechLocation.FUSELAGE);
    });

    it('should return max tonnage for LAM (55 tons)', () => {
      const maxTonnage = configurationRegistry.getMaxTonnage(MechConfiguration.LAM);
      expect(maxTonnage).toBe(55);
    });

    it('should return undefined max tonnage for non-LAM configs', () => {
      expect(configurationRegistry.getMaxTonnage(MechConfiguration.BIPED)).toBeUndefined();
      expect(configurationRegistry.getMaxTonnage(MechConfiguration.QUAD)).toBeUndefined();
    });

    it('should return required equipment for LAM', () => {
      const requiredEquip = configurationRegistry.getRequiredEquipment(MechConfiguration.LAM);
      expect(requiredEquip).toHaveLength(2);
      expect(requiredEquip.some(e => e.equipmentId === 'landing-gear')).toBe(true);
      expect(requiredEquip.some(e => e.equipmentId === 'avionics')).toBe(true);
    });

    it('should return prohibited equipment for LAM', () => {
      const prohibitedEquip = configurationRegistry.getProhibitedEquipment(MechConfiguration.LAM);
      expect(prohibitedEquip).toContain('endo-steel');
      expect(prohibitedEquip).toContain('ferro-fibrous');
    });
  });

  describe('LAM Equipment Constants', () => {
    it('should define Landing Gear equipment', () => {
      expect(LAM_EQUIPMENT.LANDING_GEAR.id).toBe('landing-gear');
      expect(LAM_EQUIPMENT.LANDING_GEAR.name).toBe('Landing Gear');
      expect(LAM_EQUIPMENT.LANDING_GEAR.slots).toBe(1);
      expect(LAM_EQUIPMENT.LANDING_GEAR.locations).toHaveLength(3);
    });

    it('should define Avionics equipment', () => {
      expect(LAM_EQUIPMENT.AVIONICS.id).toBe('avionics');
      expect(LAM_EQUIPMENT.AVIONICS.name).toBe('Avionics');
      expect(LAM_EQUIPMENT.AVIONICS.slots).toBe(1);
      expect(LAM_EQUIPMENT.AVIONICS.locations).toHaveLength(3);
    });
  });

  describe('Helper Functions', () => {
    describe('getLocationsForConfig', () => {
      it('should return biped locations for biped config', () => {
        const locs = getLocationsForConfig(MechConfiguration.BIPED);
        expect(locs).toEqual(BIPED_LOCATIONS);
      });

      it('should return quad locations for quad config', () => {
        const locs = getLocationsForConfig(MechConfiguration.QUAD);
        expect(locs).toEqual(QUAD_LOCATIONS);
      });

      it('should return quad locations for quadvee config', () => {
        const locs = getLocationsForConfig(MechConfiguration.QUADVEE);
        expect(locs).toEqual(QUAD_LOCATIONS);
      });
    });

    describe('isValidLocationForConfig', () => {
      it('should validate biped locations correctly', () => {
        expect(
          isValidLocationForConfig(MechLocation.LEFT_ARM, MechConfiguration.BIPED)
        ).toBe(true);
        expect(
          isValidLocationForConfig(
            MechLocation.FRONT_LEFT_LEG,
            MechConfiguration.BIPED
          )
        ).toBe(false);
      });

      it('should validate quad locations correctly', () => {
        expect(
          isValidLocationForConfig(
            MechLocation.FRONT_LEFT_LEG,
            MechConfiguration.QUAD
          )
        ).toBe(true);
        expect(
          isValidLocationForConfig(MechLocation.LEFT_ARM, MechConfiguration.QUAD)
        ).toBe(false);
      });
    });

    describe('getLocationDisplayName', () => {
      it('should return correct display names', () => {
        expect(getLocationDisplayName(MechLocation.HEAD)).toBe('Head');
        expect(getLocationDisplayName(MechLocation.CENTER_TORSO)).toBe(
          'Center Torso'
        );
        expect(getLocationDisplayName(MechLocation.FRONT_LEFT_LEG)).toBe(
          'Front Left Leg'
        );
      });
    });

    describe('getLocationAbbreviation', () => {
      it('should return correct abbreviations', () => {
        expect(getLocationAbbreviation(MechLocation.HEAD)).toBe('HD');
        expect(getLocationAbbreviation(MechLocation.CENTER_TORSO)).toBe('CT');
        expect(getLocationAbbreviation(MechLocation.FRONT_LEFT_LEG)).toBe('FLL');
        expect(getLocationAbbreviation(MechLocation.REAR_RIGHT_LEG)).toBe('RRL');
      });
    });

    describe('getLocationSlotCount', () => {
      it('should return 6 slots for head in all configs', () => {
        expect(getLocationSlotCount(MechLocation.HEAD, MechConfiguration.BIPED)).toBe(
          6
        );
        expect(getLocationSlotCount(MechLocation.HEAD, MechConfiguration.QUAD)).toBe(
          6
        );
      });

      it('should return 12 slots for torso locations', () => {
        expect(
          getLocationSlotCount(MechLocation.CENTER_TORSO, MechConfiguration.BIPED)
        ).toBe(12);
      });

      it('should return 6 slots for quad legs', () => {
        expect(
          getLocationSlotCount(MechLocation.FRONT_LEFT_LEG, MechConfiguration.QUAD)
        ).toBe(6);
      });
    });

    describe('isLegLocation', () => {
      it('should identify biped legs', () => {
        expect(isLegLocation(MechLocation.LEFT_LEG)).toBe(true);
        expect(isLegLocation(MechLocation.RIGHT_LEG)).toBe(true);
      });

      it('should identify quad legs', () => {
        expect(isLegLocation(MechLocation.FRONT_LEFT_LEG)).toBe(true);
        expect(isLegLocation(MechLocation.FRONT_RIGHT_LEG)).toBe(true);
        expect(isLegLocation(MechLocation.REAR_LEFT_LEG)).toBe(true);
        expect(isLegLocation(MechLocation.REAR_RIGHT_LEG)).toBe(true);
      });

      it('should not identify arms as legs', () => {
        expect(isLegLocation(MechLocation.LEFT_ARM)).toBe(false);
      });
    });

    describe('isArmLocation', () => {
      it('should identify arm locations', () => {
        expect(isArmLocation(MechLocation.LEFT_ARM)).toBe(true);
        expect(isArmLocation(MechLocation.RIGHT_ARM)).toBe(true);
      });

      it('should not identify legs as arms', () => {
        expect(isArmLocation(MechLocation.LEFT_LEG)).toBe(false);
        expect(isArmLocation(MechLocation.FRONT_LEFT_LEG)).toBe(false);
      });
    });

    describe('hasRearArmor', () => {
      it('should return true for torso locations', () => {
        expect(hasRearArmor(MechLocation.CENTER_TORSO)).toBe(true);
        expect(hasRearArmor(MechLocation.LEFT_TORSO)).toBe(true);
        expect(hasRearArmor(MechLocation.RIGHT_TORSO)).toBe(true);
      });

      it('should return false for limbs', () => {
        expect(hasRearArmor(MechLocation.LEFT_ARM)).toBe(false);
        expect(hasRearArmor(MechLocation.LEFT_LEG)).toBe(false);
        expect(hasRearArmor(MechLocation.FRONT_LEFT_LEG)).toBe(false);
      });
    });

    describe('getActuatorsForLocation', () => {
      it('should return arm actuators for biped arms', () => {
        const actuators = getActuatorsForLocation(
          MechLocation.LEFT_ARM,
          MechConfiguration.BIPED
        );
        expect(actuators).toHaveLength(4);
        expect(actuators.map((a) => a.type)).toContain(ActuatorType.SHOULDER);
        expect(actuators.map((a) => a.type)).toContain(ActuatorType.UPPER_ARM);
        expect(actuators.map((a) => a.type)).toContain(ActuatorType.LOWER_ARM);
        expect(actuators.map((a) => a.type)).toContain(ActuatorType.HAND);
      });

      it('should return leg actuators for biped legs', () => {
        const actuators = getActuatorsForLocation(
          MechLocation.LEFT_LEG,
          MechConfiguration.BIPED
        );
        expect(actuators).toHaveLength(4);
        expect(actuators.map((a) => a.type)).toContain(ActuatorType.HIP);
        expect(actuators.map((a) => a.type)).toContain(ActuatorType.UPPER_LEG);
        expect(actuators.map((a) => a.type)).toContain(ActuatorType.LOWER_LEG);
        expect(actuators.map((a) => a.type)).toContain(ActuatorType.FOOT);
      });

      it('should return leg actuators for quad legs', () => {
        const actuators = getActuatorsForLocation(
          MechLocation.FRONT_LEFT_LEG,
          MechConfiguration.QUAD
        );
        expect(actuators).toHaveLength(4);
      });

      it('should return empty array for torso locations', () => {
        const actuators = getActuatorsForLocation(
          MechLocation.CENTER_TORSO,
          MechConfiguration.BIPED
        );
        expect(actuators).toHaveLength(0);
      });

      it('should return empty array for invalid location/config', () => {
        const actuators = getActuatorsForLocation(
          MechLocation.LEFT_ARM,
          MechConfiguration.QUAD
        );
        expect(actuators).toHaveLength(0);
      });
    });

    describe('isBipedLocation', () => {
      it('should return true for biped locations', () => {
        expect(isBipedLocation(MechLocation.LEFT_ARM)).toBe(true);
        expect(isBipedLocation(MechLocation.LEFT_LEG)).toBe(true);
        expect(isBipedLocation(MechLocation.HEAD)).toBe(true);
      });

      it('should return false for quad-only locations', () => {
        expect(isBipedLocation(MechLocation.FRONT_LEFT_LEG)).toBe(false);
        expect(isBipedLocation(MechLocation.CENTER_LEG)).toBe(false);
      });
    });
  });
});
