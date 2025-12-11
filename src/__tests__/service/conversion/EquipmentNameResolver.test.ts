/**
 * Equipment Name Resolver Tests
 * 
 * Tests for resolving MegaMekLab equipment names to internal IDs.
 * 
 * @spec openspec/specs/equipment-database/spec.md
 */

// Enums used in mock data but not directly in test assertions

// Mock the EquipmentLoaderService with comprehensive equipment data
jest.mock('@/services/equipment/EquipmentLoaderService', () => {
  const mockWeapons = [
    // Standard Lasers
    { id: 'small-laser', name: 'Small Laser', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 0.5, criticalSlots: 1, costCBills: 11250, battleValue: 9, introductionYear: 2300, damage: 3, heat: 1 },
    { id: 'medium-laser', name: 'Medium Laser', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 1, criticalSlots: 1, costCBills: 40000, battleValue: 46, introductionYear: 2300, damage: 5, heat: 3 },
    { id: 'large-laser', name: 'Large Laser', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 5, criticalSlots: 2, costCBills: 100000, battleValue: 124, introductionYear: 2316, damage: 8, heat: 8 },
    // ER Lasers (IS)
    { id: 'er-small-laser', name: 'ER Small Laser', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 0.5, criticalSlots: 1, costCBills: 11250, battleValue: 17, introductionYear: 3058, damage: 3, heat: 2 },
    { id: 'er-medium-laser', name: 'ER Medium Laser', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 1, criticalSlots: 1, costCBills: 80000, battleValue: 62, introductionYear: 3058, damage: 5, heat: 5 },
    { id: 'er-large-laser', name: 'ER Large Laser', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 5, criticalSlots: 2, costCBills: 200000, battleValue: 163, introductionYear: 3037, damage: 8, heat: 12 },
    // ER Lasers (Clan)
    { id: 'clan-er-small-laser', name: 'Clan ER Small Laser', category: 'Energy', techBase: 'Clan', rulesLevel: 'Standard', weight: 0.5, criticalSlots: 1, costCBills: 11250, battleValue: 31, introductionYear: 2825, damage: 5, heat: 2 },
    { id: 'clan-er-medium-laser', name: 'Clan ER Medium Laser', category: 'Energy', techBase: 'Clan', rulesLevel: 'Standard', weight: 1, criticalSlots: 1, costCBills: 80000, battleValue: 108, introductionYear: 2824, damage: 7, heat: 5 },
    { id: 'clan-er-large-laser', name: 'Clan ER Large Laser', category: 'Energy', techBase: 'Clan', rulesLevel: 'Standard', weight: 4, criticalSlots: 1, costCBills: 200000, battleValue: 248, introductionYear: 2820, damage: 10, heat: 12 },
    // Pulse Lasers (IS)
    { id: 'small-pulse-laser', name: 'Small Pulse Laser', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 1, criticalSlots: 1, costCBills: 16000, battleValue: 12, introductionYear: 2609, damage: 3, heat: 2 },
    { id: 'medium-pulse-laser', name: 'Medium Pulse Laser', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 2, criticalSlots: 1, costCBills: 60000, battleValue: 48, introductionYear: 2609, damage: 6, heat: 4 },
    { id: 'large-pulse-laser', name: 'Large Pulse Laser', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 7, criticalSlots: 2, costCBills: 175000, battleValue: 119, introductionYear: 2609, damage: 9, heat: 10 },
    // Pulse Lasers (Clan)
    { id: 'clan-small-pulse-laser', name: 'Clan Small Pulse Laser', category: 'Energy', techBase: 'Clan', rulesLevel: 'Standard', weight: 1, criticalSlots: 1, costCBills: 16000, battleValue: 24, introductionYear: 2825, damage: 3, heat: 2 },
    { id: 'clan-medium-pulse-laser', name: 'Clan Medium Pulse Laser', category: 'Energy', techBase: 'Clan', rulesLevel: 'Standard', weight: 2, criticalSlots: 1, costCBills: 60000, battleValue: 111, introductionYear: 2825, damage: 7, heat: 4 },
    { id: 'clan-large-pulse-laser', name: 'Clan Large Pulse Laser', category: 'Energy', techBase: 'Clan', rulesLevel: 'Standard', weight: 6, criticalSlots: 2, costCBills: 175000, battleValue: 265, introductionYear: 2825, damage: 10, heat: 10 },
    // PPCs
    { id: 'ppc', name: 'PPC', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 7, criticalSlots: 3, costCBills: 200000, battleValue: 176, introductionYear: 2460, damage: 10, heat: 10 },
    { id: 'er-ppc', name: 'ER PPC', category: 'Energy', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 7, criticalSlots: 3, costCBills: 300000, battleValue: 229, introductionYear: 2751, damage: 10, heat: 15 },
    { id: 'clan-er-ppc', name: 'Clan ER PPC', category: 'Energy', techBase: 'Clan', rulesLevel: 'Standard', weight: 6, criticalSlots: 2, costCBills: 300000, battleValue: 412, introductionYear: 2823, damage: 15, heat: 15 },
    // Autocannons
    { id: 'ac-2', name: 'Autocannon/2', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 6, criticalSlots: 1, costCBills: 75000, battleValue: 37, introductionYear: 2300, damage: 2, heat: 1 },
    { id: 'ac-5', name: 'Autocannon/5', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 8, criticalSlots: 4, costCBills: 125000, battleValue: 70, introductionYear: 2250, damage: 5, heat: 1 },
    { id: 'ac-10', name: 'Autocannon/10', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 12, criticalSlots: 7, costCBills: 200000, battleValue: 123, introductionYear: 2460, damage: 10, heat: 3 },
    { id: 'ac-20', name: 'Autocannon/20', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 14, criticalSlots: 10, costCBills: 300000, battleValue: 178, introductionYear: 2490, damage: 20, heat: 7 },
    // Ultra ACs (IS)
    { id: 'uac-2', name: 'Ultra AC/2', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 7, criticalSlots: 3, costCBills: 120000, battleValue: 56, introductionYear: 3057, damage: 2, heat: 1 },
    { id: 'uac-5', name: 'Ultra AC/5', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 9, criticalSlots: 5, costCBills: 200000, battleValue: 112, introductionYear: 3035, damage: 5, heat: 1 },
    { id: 'uac-10', name: 'Ultra AC/10', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 13, criticalSlots: 7, costCBills: 320000, battleValue: 210, introductionYear: 3057, damage: 10, heat: 4 },
    { id: 'uac-20', name: 'Ultra AC/20', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 15, criticalSlots: 10, costCBills: 480000, battleValue: 281, introductionYear: 3060, damage: 20, heat: 8 },
    // Ultra ACs (Clan)
    { id: 'clan-uac-2', name: 'Clan Ultra AC/2', category: 'Ballistic', techBase: 'Clan', rulesLevel: 'Standard', weight: 5, criticalSlots: 2, costCBills: 120000, battleValue: 62, introductionYear: 2827, damage: 2, heat: 1 },
    { id: 'clan-uac-5', name: 'Clan Ultra AC/5', category: 'Ballistic', techBase: 'Clan', rulesLevel: 'Standard', weight: 7, criticalSlots: 3, costCBills: 200000, battleValue: 122, introductionYear: 2825, damage: 5, heat: 1 },
    { id: 'clan-uac-10', name: 'Clan Ultra AC/10', category: 'Ballistic', techBase: 'Clan', rulesLevel: 'Standard', weight: 10, criticalSlots: 4, costCBills: 320000, battleValue: 234, introductionYear: 2825, damage: 10, heat: 3 },
    { id: 'clan-uac-20', name: 'Clan Ultra AC/20', category: 'Ballistic', techBase: 'Clan', rulesLevel: 'Standard', weight: 12, criticalSlots: 8, costCBills: 480000, battleValue: 335, introductionYear: 2825, damage: 20, heat: 7 },
    // LB-X ACs
    { id: 'lb-10x-ac', name: 'LB 10-X AC', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 11, criticalSlots: 6, costCBills: 400000, battleValue: 148, introductionYear: 3035, damage: 10, heat: 2 },
    { id: 'clan-lb-10x-ac', name: 'Clan LB 10-X AC', category: 'Ballistic', techBase: 'Clan', rulesLevel: 'Standard', weight: 10, criticalSlots: 5, costCBills: 400000, battleValue: 148, introductionYear: 2825, damage: 10, heat: 2 },
    // Gauss Rifles
    { id: 'gauss-rifle', name: 'Gauss Rifle', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 15, criticalSlots: 7, costCBills: 300000, battleValue: 320, introductionYear: 2590, damage: 15, heat: 1 },
    { id: 'clan-gauss-rifle', name: 'Clan Gauss Rifle', category: 'Ballistic', techBase: 'Clan', rulesLevel: 'Standard', weight: 12, criticalSlots: 6, costCBills: 300000, battleValue: 320, introductionYear: 2825, damage: 15, heat: 1 },
    // Machine Guns
    { id: 'machine-gun', name: 'Machine Gun', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 0.5, criticalSlots: 1, costCBills: 5000, battleValue: 5, introductionYear: 2025, damage: 2, heat: 0 },
    { id: 'light-machine-gun', name: 'Light Machine Gun', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 0.25, criticalSlots: 1, costCBills: 5000, battleValue: 5, introductionYear: 3068, damage: 1, heat: 0 },
    { id: 'heavy-machine-gun', name: 'Heavy Machine Gun', category: 'Ballistic', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 1, criticalSlots: 1, costCBills: 7500, battleValue: 6, introductionYear: 3068, damage: 3, heat: 0 },
    // LRMs
    { id: 'lrm-5', name: 'LRM 5', category: 'Missile', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 2, criticalSlots: 1, costCBills: 30000, battleValue: 45, introductionYear: 2295, damage: 1, heat: 2 },
    { id: 'lrm-10', name: 'LRM 10', category: 'Missile', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 5, criticalSlots: 2, costCBills: 100000, battleValue: 90, introductionYear: 2315, damage: 1, heat: 4 },
    { id: 'lrm-15', name: 'LRM 15', category: 'Missile', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 7, criticalSlots: 3, costCBills: 175000, battleValue: 136, introductionYear: 2315, damage: 1, heat: 5 },
    { id: 'lrm-20', name: 'LRM 20', category: 'Missile', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 10, criticalSlots: 5, costCBills: 250000, battleValue: 181, introductionYear: 2380, damage: 1, heat: 6 },
    // SRMs
    { id: 'srm-2', name: 'SRM 2', category: 'Missile', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 1, criticalSlots: 1, costCBills: 10000, battleValue: 21, introductionYear: 2370, damage: 2, heat: 2 },
    { id: 'srm-4', name: 'SRM 4', category: 'Missile', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 2, criticalSlots: 1, costCBills: 60000, battleValue: 39, introductionYear: 2370, damage: 2, heat: 3 },
    { id: 'srm-6', name: 'SRM 6', category: 'Missile', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 3, criticalSlots: 2, costCBills: 80000, battleValue: 59, introductionYear: 2370, damage: 2, heat: 4 },
    // Streak SRMs
    { id: 'streak-srm-2', name: 'Streak SRM 2', category: 'Missile', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 1.5, criticalSlots: 1, costCBills: 15000, battleValue: 30, introductionYear: 2647, damage: 2, heat: 2 },
    { id: 'clan-streak-srm-4', name: 'Clan Streak SRM 4', category: 'Missile', techBase: 'Clan', rulesLevel: 'Standard', weight: 2, criticalSlots: 1, costCBills: 60000, battleValue: 79, introductionYear: 2826, damage: 2, heat: 3 },
  ];
  
  const mockAmmunition = [
    { id: 'ac-10-ammo', name: 'AC/10 Ammo', category: 'Autocannon', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 1, criticalSlots: 1, costPerTon: 6000, battleValue: 15, introductionYear: 2460, shotsPerTon: 10 },
    { id: 'lrm-10-ammo', name: 'LRM 10 Ammo', category: 'LRM', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 1, criticalSlots: 1, costPerTon: 30000, battleValue: 11, introductionYear: 2315, shotsPerTon: 12 },
  ];
  
  const mockElectronics = [
    { id: 'guardian-ecm', name: 'Guardian ECM', category: 'ECM', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 1.5, criticalSlots: 2, costCBills: 200000, battleValue: 61, introductionYear: 3045 },
    { id: 'beagle-active-probe', name: 'Beagle Active Probe', category: 'Probe', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 1.5, criticalSlots: 2, costCBills: 200000, battleValue: 10, introductionYear: 3045 },
    { id: 'targeting-computer-is', name: 'Targeting Computer', category: 'Targeting', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 0, criticalSlots: 0, costCBills: 0, battleValue: 0, introductionYear: 3062 },
    { id: 'targeting-computer-clan', name: 'Clan Targeting Computer', category: 'Targeting', techBase: 'Clan', rulesLevel: 'Standard', weight: 0, criticalSlots: 0, costCBills: 0, battleValue: 0, introductionYear: 2860 },
    { id: 'tag', name: 'TAG', category: 'Targeting', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 1, criticalSlots: 1, costCBills: 50000, battleValue: 0, introductionYear: 2600 },
    { id: 'light-tag', name: 'Light TAG', category: 'Targeting', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 0.5, criticalSlots: 1, costCBills: 40000, battleValue: 0, introductionYear: 3058 },
    { id: 'c3-master', name: 'C3 Master', category: 'C3', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 5, criticalSlots: 5, costCBills: 1500000, battleValue: 0, introductionYear: 3050 },
    { id: 'c3-slave', name: 'C3 Slave', category: 'C3', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 1, criticalSlots: 1, costCBills: 250000, battleValue: 0, introductionYear: 3050 },
  ];
  
  const mockMiscEquipment = [
    { id: 'ams', name: 'Anti-Missile System', category: 'Defensive', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 0.5, criticalSlots: 1, costCBills: 100000, battleValue: 32, introductionYear: 3040 },
    { id: 'clan-ams', name: 'Clan Anti-Missile System', category: 'Defensive', techBase: 'Clan', rulesLevel: 'Standard', weight: 0.5, criticalSlots: 1, costCBills: 100000, battleValue: 32, introductionYear: 2831 },
    { id: 'heat-sink-single', name: 'Heat Sink', category: 'Heat Sink', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 1, criticalSlots: 1, costCBills: 2000, battleValue: 0, introductionYear: 2022 },
    { id: 'heat-sink-double-is', name: 'Double Heat Sink', category: 'Heat Sink', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 1, criticalSlots: 3, costCBills: 6000, battleValue: 0, introductionYear: 2567 },
    { id: 'heat-sink-double-clan', name: 'Clan Double Heat Sink', category: 'Heat Sink', techBase: 'Clan', rulesLevel: 'Standard', weight: 1, criticalSlots: 2, costCBills: 6000, battleValue: 0, introductionYear: 2825 },
    { id: 'jump-jet', name: 'Jump Jet', category: 'Jump Jet', techBase: 'Inner Sphere', rulesLevel: 'Introductory', weight: 1, criticalSlots: 1, costCBills: 200, battleValue: 0, introductionYear: 2471 },
    { id: 'case', name: 'CASE', category: 'Defensive', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 0.5, criticalSlots: 1, costCBills: 50000, battleValue: 0, introductionYear: 3036 },
    { id: 'masc-is', name: 'MASC', category: 'Movement Enhancement', techBase: 'Inner Sphere', rulesLevel: 'Standard', weight: 0, criticalSlots: 0, costCBills: 0, battleValue: 0, introductionYear: 2740 },
    { id: 'masc-clan', name: 'Clan MASC', category: 'Movement Enhancement', techBase: 'Clan', rulesLevel: 'Standard', weight: 0, criticalSlots: 0, costCBills: 0, battleValue: 0, introductionYear: 2827 },
  ];
  
  return {
    getEquipmentLoader: jest.fn(() => ({
      getIsLoaded: jest.fn(() => true),
      getAllWeapons: jest.fn(() => mockWeapons),
      getAllAmmunition: jest.fn(() => mockAmmunition),
      getAllElectronics: jest.fn(() => mockElectronics),
      getAllMiscEquipment: jest.fn(() => mockMiscEquipment),
    })),
  };
});

import {
  EquipmentNameResolver,
  equipmentNameResolver,
} from '@/services/conversion/EquipmentNameResolver';

describe('EquipmentNameResolver', () => {
  let resolver: EquipmentNameResolver;

  beforeEach(() => {
    resolver = new EquipmentNameResolver();
  });

  // ============================================================================
  // Initialization
  // ============================================================================
  describe('Initialization', () => {
    it('should initialize lazily', () => {
      // Should not throw before initialization
      const result = resolver.resolve('MediumLaser', 'Medium Laser');
      expect(result).toBeDefined();
    });

    it('should use singleton instance', () => {
      expect(equipmentNameResolver).toBeDefined();
    });
  });

  // ============================================================================
  // resolve() - Direct Type Mapping
  // ============================================================================
  describe('resolve() - Direct Type Mapping', () => {
    it('should resolve standard lasers', () => {
      expect(resolver.resolve('SmallLaser', 'Small Laser').found).toBe(true);
      expect(resolver.resolve('MediumLaser', 'Medium Laser').found).toBe(true);
      expect(resolver.resolve('LargeLaser', 'Large Laser').found).toBe(true);
    });

    it('should resolve ER lasers (IS)', () => {
      expect(resolver.resolve('ISERSmallLaser', 'ER Small Laser').found).toBe(true);
      expect(resolver.resolve('ISERMediumLaser', 'ER Medium Laser').found).toBe(true);
      expect(resolver.resolve('ISERLargeLaser', 'ER Large Laser').found).toBe(true);
    });

    it('should resolve ER lasers (Clan)', () => {
      expect(resolver.resolve('CLERSmallLaser', 'Clan ER Small Laser').found).toBe(true);
      expect(resolver.resolve('CLERMediumLaser', 'Clan ER Medium Laser').found).toBe(true);
      expect(resolver.resolve('CLERLargeLaser', 'Clan ER Large Laser').found).toBe(true);
    });

    it('should resolve pulse lasers (IS)', () => {
      expect(resolver.resolve('SmallPulseLaser', 'Small Pulse Laser').found).toBe(true);
      expect(resolver.resolve('MediumPulseLaser', 'Medium Pulse Laser').found).toBe(true);
      expect(resolver.resolve('LargePulseLaser', 'Large Pulse Laser').found).toBe(true);
    });

    it('should resolve pulse lasers (Clan)', () => {
      expect(resolver.resolve('CLSmallPulseLaser', 'Clan Small Pulse Laser').found).toBe(true);
      expect(resolver.resolve('CLMediumPulseLaser', 'Clan Medium Pulse Laser').found).toBe(true);
      expect(resolver.resolve('CLLargePulseLaser', 'Clan Large Pulse Laser').found).toBe(true);
    });

    it('should resolve PPCs', () => {
      expect(resolver.resolve('PPC', 'PPC').found).toBe(true);
      expect(resolver.resolve('ISERPPC', 'ER PPC').found).toBe(true);
      expect(resolver.resolve('CLERPPC', 'Clan ER PPC').found).toBe(true);
    });

    it('should resolve autocannons', () => {
      expect(resolver.resolve('AC2', 'Autocannon/2').found).toBe(true);
      expect(resolver.resolve('AC5', 'Autocannon/5').found).toBe(true);
      expect(resolver.resolve('AC10', 'Autocannon/10').found).toBe(true);
      expect(resolver.resolve('AC20', 'Autocannon/20').found).toBe(true);
    });

    it('should resolve ultra ACs (IS)', () => {
      expect(resolver.resolve('ISUltraAC5', 'Ultra AC/5').found).toBe(true);
      expect(resolver.resolve('ISUltraAC10', 'Ultra AC/10').found).toBe(true);
    });

    it('should resolve ultra ACs (Clan)', () => {
      expect(resolver.resolve('CLUltraAC5', 'Clan Ultra AC/5').found).toBe(true);
      expect(resolver.resolve('CLUltraAC10', 'Clan Ultra AC/10').found).toBe(true);
    });

    it('should resolve LB-X ACs', () => {
      expect(resolver.resolve('ISLBXAC10', 'LB 10-X AC').found).toBe(true);
      expect(resolver.resolve('CLLBXAC10', 'Clan LB 10-X AC').found).toBe(true);
    });

    it('should resolve gauss rifles', () => {
      expect(resolver.resolve('GaussRifle', 'Gauss Rifle').found).toBe(true);
      expect(resolver.resolve('ISGaussRifle', 'Gauss Rifle').found).toBe(true);
      expect(resolver.resolve('CLGaussRifle', 'Clan Gauss Rifle').found).toBe(true);
    });

    it('should resolve missile weapons', () => {
      expect(resolver.resolve('LRM5', 'LRM 5').found).toBe(true);
      expect(resolver.resolve('LRM10', 'LRM 10').found).toBe(true);
      expect(resolver.resolve('LRM15', 'LRM 15').found).toBe(true);
      expect(resolver.resolve('LRM20', 'LRM 20').found).toBe(true);
      expect(resolver.resolve('SRM2', 'SRM 2').found).toBe(true);
      expect(resolver.resolve('SRM4', 'SRM 4').found).toBe(true);
      expect(resolver.resolve('SRM6', 'SRM 6').found).toBe(true);
    });

    it('should resolve streak SRMs', () => {
      expect(resolver.resolve('ISStreakSRM2', 'Streak SRM 2').found).toBe(true);
      expect(resolver.resolve('CLStreakSRM4', 'Clan Streak SRM 4').found).toBe(true);
    });

    it('should resolve machine guns', () => {
      expect(resolver.resolve('MachineGun', 'Machine Gun').found).toBe(true);
      expect(resolver.resolve('ISLightMachineGun', 'Light Machine Gun').found).toBe(true);
      expect(resolver.resolve('ISHeavyMachineGun', 'Heavy Machine Gun').found).toBe(true);
    });
  });

  // ============================================================================
  // resolve() - Equipment Categories
  // ============================================================================
  describe('resolve() - Equipment Categories', () => {
    it('should resolve AMS', () => {
      expect(resolver.resolve('AMS', 'Anti-Missile System').found).toBe(true);
      expect(resolver.resolve('ISAMS', 'Anti-Missile System').found).toBe(true);
      expect(resolver.resolve('CLAMS', 'Clan Anti-Missile System').found).toBe(true);
    });

    it('should resolve TAG', () => {
      expect(resolver.resolve('TAG', 'TAG').found).toBe(true);
      expect(resolver.resolve('LightTAG', 'Light TAG').found).toBe(true);
    });

    it('should resolve C3 systems', () => {
      expect(resolver.resolve('C3MasterComputer', 'C3 Master').found).toBe(true);
      expect(resolver.resolve('ISC3SlaveUnit', 'C3 Slave').found).toBe(true);
    });

    it('should resolve ECM/BAP', () => {
      expect(resolver.resolve('GuardianECM', 'Guardian ECM').found).toBe(true);
      expect(resolver.resolve('BeagleActiveProbe', 'Beagle Active Probe').found).toBe(true);
    });

    it('should resolve targeting computers', () => {
      expect(resolver.resolve('ISTargetingComputer', 'Targeting Computer').found).toBe(true);
      expect(resolver.resolve('CLTargetingComputer', 'Clan Targeting Computer').found).toBe(true);
    });

    it('should resolve heat sinks', () => {
      expect(resolver.resolve('HeatSink', 'Heat Sink').found).toBe(true);
      expect(resolver.resolve('ISDoubleHeatSink', 'Double Heat Sink').found).toBe(true);
      expect(resolver.resolve('CLDoubleHeatSink', 'Clan Double Heat Sink').found).toBe(true);
    });

    it('should resolve MASC', () => {
      expect(resolver.resolve('ISMASC', 'MASC').found).toBe(true);
      expect(resolver.resolve('CLMASC', 'Clan MASC').found).toBe(true);
    });
  });

  // ============================================================================
  // resolve() - Confidence Levels
  // ============================================================================
  describe('resolve() - Confidence Levels', () => {
    it('should return exact confidence for direct mapping', () => {
      const result = resolver.resolve('MediumLaser', 'Medium Laser');
      if (result.found) {
        expect(result.confidence).toBe('exact');
      }
    });

    it('should return none confidence for unknown equipment', () => {
      const result = resolver.resolve('CompletelyFakeWeapon12345', 'Fake Weapon');
      expect(result.found).toBe(false);
      expect(result.confidence).toBe('none');
    });

    it('should preserve original name and type', () => {
      const result = resolver.resolve('MediumLaser', 'Medium Laser');
      expect(result.originalName).toBe('Medium Laser');
      expect(result.originalType).toBe('MediumLaser');
    });
  });

  // ============================================================================
  // isSystemComponent()
  // ============================================================================
  describe('isSystemComponent()', () => {
    it('should identify system components', () => {
      expect(resolver.isSystemComponent('Life Support')).toBe(true);
      expect(resolver.isSystemComponent('Sensors')).toBe(true);
      expect(resolver.isSystemComponent('Cockpit')).toBe(true);
      expect(resolver.isSystemComponent('Gyro')).toBe(true);
    });

    it('should identify actuators', () => {
      expect(resolver.isSystemComponent('Shoulder')).toBe(true);
      expect(resolver.isSystemComponent('Upper Arm Actuator')).toBe(true);
    });

    it('should not identify weapons as system components', () => {
      expect(resolver.isSystemComponent('Medium Laser')).toBe(false);
    });
  });

  // ============================================================================
  // isHeatSink()
  // ============================================================================
  describe('isHeatSink()', () => {
    it('should identify heat sinks', () => {
      expect(resolver.isHeatSink('Heat Sink')).toBe(true);
      expect(resolver.isHeatSink('Double Heat Sink')).toBe(true);
    });

    it('should not identify non-heat sinks', () => {
      expect(resolver.isHeatSink('Medium Laser')).toBe(false);
    });
  });

  // ============================================================================
  // getMappings()
  // ============================================================================
  describe('getMappings()', () => {
    it('should return all registered mappings', () => {
      const mappings = resolver.getMappings();
      
      expect(mappings).toBeDefined();
      expect(typeof mappings).toBe('object');
      expect(mappings['MediumLaser']).toBe('medium-laser');
    });
  });

  // ============================================================================
  // getById()
  // ============================================================================
  describe('getById()', () => {
    it('should return equipment when the id exists', () => {
      resolver.resolve('MediumLaser', 'Medium Laser');
      const item = resolver.getById('medium-laser');

      expect(item).toBeDefined();
      expect(item?.name).toBe('Medium Laser');
    });

    it('should return undefined for unknown ids', () => {
      resolver.resolve('MediumLaser', 'Medium Laser');
      expect(resolver.getById('non-existent-id')).toBeUndefined();
    });
  });
});
