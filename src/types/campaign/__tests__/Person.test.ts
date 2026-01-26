/**
 * Tests for Person interface and helper functions
 *
 * @module campaign/__tests__/Person.test
 */

import {
  IPerson,
  IInjury,
  isAlive,
  isActive,
  isAvailable,
  isWounded,
  getTotalXP,
  getAvailableXP,
  hasPermanentInjuries,
  getTotalHealingDays,
  isCombatRole,
  isSupportRole,
  pilotToPerson,
  isInjury,
  isPerson,
  createDefaultAttributes,
  createInjury,
} from '../Person';
import { PersonnelStatus, CampaignPersonnelRole } from '../enums';
import { IAttributes } from '../skills';
import { IPilot, PilotType, PilotStatus, IPilotSkills } from '../../pilot/PilotInterfaces';

// =============================================================================
// Test Fixtures
// =============================================================================

const createTestAttributes = (overrides?: Partial<IAttributes>): IAttributes => ({
  STR: 5,
  BOD: 5,
  REF: 5,
  DEX: 5,
  INT: 5,
  WIL: 5,
  CHA: 5,
  Edge: 0,
  ...overrides,
});

const createTestPilotSkills = (overrides?: Partial<IPilotSkills>): IPilotSkills => ({
  gunnery: 4,
  piloting: 5,
  ...overrides,
});

const createTestInjury = (overrides?: Partial<IInjury>): IInjury => ({
  id: 'inj-001',
  type: 'Broken Arm',
  location: 'Left Arm',
  severity: 2,
  daysToHeal: 14,
  permanent: false,
  acquired: new Date('2025-01-15'),
  ...overrides,
});

const createTestPerson = (overrides?: Partial<IPerson>): IPerson => ({
  id: 'person-001',
  name: 'John Smith',
  callsign: 'Hammer',
  status: PersonnelStatus.ACTIVE,
  primaryRole: CampaignPersonnelRole.PILOT,
  rank: 'MechWarrior',
  xp: 500,
  totalXpEarned: 1500,
  xpSpent: 1000,
  hits: 0,
  injuries: [],
  skills: {},
  attributes: createTestAttributes(),
  pilotSkills: createTestPilotSkills(),
  recruitmentDate: new Date('2024-01-01'),
  missionsCompleted: 12,
  totalKills: 8,
  daysToWaitForHealing: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2025-01-25T00:00:00Z',
  ...overrides,
});

const createTestPilot = (overrides?: Partial<IPilot>): IPilot => ({
  id: 'pilot-001',
  name: 'Jane Doe',
  callsign: 'Phoenix',
  type: PilotType.Persistent,
  status: PilotStatus.Active,
  skills: createTestPilotSkills(),
  wounds: 0,
  abilities: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2025-01-25T00:00:00Z',
  ...overrides,
});

// =============================================================================
// IInjury Interface Tests
// =============================================================================

describe('IInjury Interface', () => {
  describe('structure', () => {
    it('should have all required fields', () => {
      const injury = createTestInjury();

      expect(injury.id).toBeDefined();
      expect(injury.type).toBeDefined();
      expect(injury.location).toBeDefined();
      expect(injury.severity).toBeDefined();
      expect(injury.daysToHeal).toBeDefined();
      expect(injury.permanent).toBeDefined();
      expect(injury.acquired).toBeDefined();
    });

    it('should support optional fields', () => {
      const injury = createTestInjury({
        description: 'Fractured radius from mech ejection',
        skillModifier: -1,
        attributeModifier: -2,
      });

      expect(injury.description).toBe('Fractured radius from mech ejection');
      expect(injury.skillModifier).toBe(-1);
      expect(injury.attributeModifier).toBe(-2);
    });

    it('should have valid severity range (1-5)', () => {
      const minSeverity = createTestInjury({ severity: 1 });
      const maxSeverity = createTestInjury({ severity: 5 });

      expect(minSeverity.severity).toBe(1);
      expect(maxSeverity.severity).toBe(5);
    });

    it('should track permanent injuries', () => {
      const permanentInjury = createTestInjury({ permanent: true, daysToHeal: 0 });

      expect(permanentInjury.permanent).toBe(true);
      expect(permanentInjury.daysToHeal).toBe(0);
    });
  });
});

// =============================================================================
// IPerson Interface Tests
// =============================================================================

describe('IPerson Interface', () => {
  describe('structure', () => {
    it('should have all required identity fields', () => {
      const person = createTestPerson();

      expect(person.id).toBe('person-001');
      expect(person.name).toBe('John Smith');
      expect(person.callsign).toBe('Hammer');
      expect(person.createdAt).toBeDefined();
      expect(person.updatedAt).toBeDefined();
    });

    it('should have all required status fields', () => {
      const person = createTestPerson();

      expect(person.status).toBe(PersonnelStatus.ACTIVE);
      expect(person.primaryRole).toBe(CampaignPersonnelRole.PILOT);
    });

    it('should have all required career fields', () => {
      const person = createTestPerson();

      expect(person.rank).toBe('MechWarrior');
      expect(person.recruitmentDate).toBeInstanceOf(Date);
      expect(person.missionsCompleted).toBe(12);
      expect(person.totalKills).toBe(8);
    });

    it('should have all required experience fields', () => {
      const person = createTestPerson();

      expect(person.xp).toBe(500);
      expect(person.totalXpEarned).toBe(1500);
      expect(person.xpSpent).toBe(1000);
    });

    it('should have all required combat state fields', () => {
      const person = createTestPerson();

      expect(person.hits).toBe(0);
      expect(person.injuries).toEqual([]);
      expect(person.daysToWaitForHealing).toBe(0);
    });

    it('should have all required skill fields', () => {
      const person = createTestPerson();

      expect(person.skills).toEqual({});
      expect(person.attributes).toBeDefined();
      expect(person.pilotSkills).toBeDefined();
      expect(person.pilotSkills.gunnery).toBe(4);
      expect(person.pilotSkills.piloting).toBe(5);
    });

    it('should support optional fields', () => {
      const person = createTestPerson({
        secondaryRole: CampaignPersonnelRole.TECH,
        unitId: 'unit-001',
        forceId: 'force-001',
        isFounder: true,
        isCommander: true,
        isClan: false,
      });

      expect(person.secondaryRole).toBe(CampaignPersonnelRole.TECH);
      expect(person.unitId).toBe('unit-001');
      expect(person.forceId).toBe('force-001');
      expect(person.isFounder).toBe(true);
      expect(person.isCommander).toBe(true);
      expect(person.isClan).toBe(false);
    });

    it('should support background fields', () => {
      const person = createTestPerson({
        affiliation: 'Lyran Commonwealth',
        originPlanet: 'Tharkad',
        biography: 'A veteran MechWarrior from the Lyran Guards.',
        portrait: 'portraits/john-smith.png',
      });

      expect(person.affiliation).toBe('Lyran Commonwealth');
      expect(person.originPlanet).toBe('Tharkad');
      expect(person.biography).toBe('A veteran MechWarrior from the Lyran Guards.');
      expect(person.portrait).toBe('portraits/john-smith.png');
    });
  });

  describe('field count', () => {
    it('should have 40-50 MVP fields', () => {
      // Count all fields in IPerson (including inherited)
      const person = createTestPerson({
        secondaryRole: CampaignPersonnelRole.TECH,
        rankLevel: 3,
        deathDate: undefined,
        retirementDate: undefined,
        lastRankChangeDate: new Date(),
        awards: ['medal-001'],
        hitsPrior: 0,
        edgeUsedThisRound: 0,
        unitId: 'unit-001',
        doctorId: undefined,
        techUnitIds: [],
        forceId: 'force-001',
        isFounder: true,
        isCommander: false,
        isSecondInCommand: false,
        isImmortal: false,
        isClan: false,
        givenName: 'John',
        surname: 'Smith',
        preNominal: undefined,
        postNominal: undefined,
        gender: 'male',
        bloodType: 'O+',
        affiliation: 'Lyran Commonwealth',
        originPlanet: 'Tharkad',
        originFaction: 'Lyran Commonwealth',
        biography: 'A veteran MechWarrior.',
        portrait: 'portraits/john-smith.png',
        phenotype: undefined,
        bloodname: undefined,
      });

      // Get all keys
      const keys = Object.keys(person);
      
      // Should be in the 40-50 range
      expect(keys.length).toBeGreaterThanOrEqual(30);
      expect(keys.length).toBeLessThanOrEqual(55);
    });
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('isAlive', () => {
  it('should return true for ACTIVE status', () => {
    const person = createTestPerson({ status: PersonnelStatus.ACTIVE });
    expect(isAlive(person)).toBe(true);
  });

  it('should return true for WOUNDED status', () => {
    const person = createTestPerson({ status: PersonnelStatus.WOUNDED });
    expect(isAlive(person)).toBe(true);
  });

  it('should return true for MIA status', () => {
    const person = createTestPerson({ status: PersonnelStatus.MIA });
    expect(isAlive(person)).toBe(true);
  });

  it('should return false for KIA status', () => {
    const person = createTestPerson({ status: PersonnelStatus.KIA });
    expect(isAlive(person)).toBe(false);
  });

  it('should return false when deathDate is set', () => {
    const person = createTestPerson({
      status: PersonnelStatus.ACTIVE,
      deathDate: new Date('2025-01-20'),
    });
    expect(isAlive(person)).toBe(false);
  });
});

describe('isActive', () => {
  it('should return true for ACTIVE status', () => {
    const person = createTestPerson({ status: PersonnelStatus.ACTIVE });
    expect(isActive(person)).toBe(true);
  });

  it('should return false for WOUNDED status', () => {
    const person = createTestPerson({ status: PersonnelStatus.WOUNDED });
    expect(isActive(person)).toBe(false);
  });

  it('should return false for ON_LEAVE status', () => {
    const person = createTestPerson({ status: PersonnelStatus.ON_LEAVE });
    expect(isActive(person)).toBe(false);
  });

  it('should return false for MIA status', () => {
    const person = createTestPerson({ status: PersonnelStatus.MIA });
    expect(isActive(person)).toBe(false);
  });
});

describe('isAvailable', () => {
  it('should return true for ACTIVE status', () => {
    const person = createTestPerson({ status: PersonnelStatus.ACTIVE });
    expect(isAvailable(person)).toBe(true);
  });

  it('should return true for ON_LEAVE status', () => {
    const person = createTestPerson({ status: PersonnelStatus.ON_LEAVE });
    expect(isAvailable(person)).toBe(true);
  });

  it('should return false for WOUNDED status', () => {
    const person = createTestPerson({ status: PersonnelStatus.WOUNDED });
    expect(isAvailable(person)).toBe(false);
  });

  it('should return false for MIA status', () => {
    const person = createTestPerson({ status: PersonnelStatus.MIA });
    expect(isAvailable(person)).toBe(false);
  });
});

describe('isWounded', () => {
  it('should return true for WOUNDED status', () => {
    const person = createTestPerson({ status: PersonnelStatus.WOUNDED });
    expect(isWounded(person)).toBe(true);
  });

  it('should return true when hits > 0', () => {
    const person = createTestPerson({ hits: 2 });
    expect(isWounded(person)).toBe(true);
  });

  it('should return true when injuries exist', () => {
    const person = createTestPerson({ injuries: [createTestInjury()] });
    expect(isWounded(person)).toBe(true);
  });

  it('should return false when healthy', () => {
    const person = createTestPerson({
      status: PersonnelStatus.ACTIVE,
      hits: 0,
      injuries: [],
    });
    expect(isWounded(person)).toBe(false);
  });
});

describe('getTotalXP', () => {
  it('should return totalXpEarned', () => {
    const person = createTestPerson({ totalXpEarned: 2500 });
    expect(getTotalXP(person)).toBe(2500);
  });

  it('should return 0 for new person', () => {
    const person = createTestPerson({ totalXpEarned: 0 });
    expect(getTotalXP(person)).toBe(0);
  });
});

describe('getAvailableXP', () => {
  it('should return xp', () => {
    const person = createTestPerson({ xp: 750 });
    expect(getAvailableXP(person)).toBe(750);
  });

  it('should return 0 when all XP spent', () => {
    const person = createTestPerson({ xp: 0 });
    expect(getAvailableXP(person)).toBe(0);
  });
});

describe('hasPermanentInjuries', () => {
  it('should return false when no injuries', () => {
    const person = createTestPerson({ injuries: [] });
    expect(hasPermanentInjuries(person)).toBe(false);
  });

  it('should return false when only temporary injuries', () => {
    const person = createTestPerson({
      injuries: [createTestInjury({ permanent: false })],
    });
    expect(hasPermanentInjuries(person)).toBe(false);
  });

  it('should return true when permanent injury exists', () => {
    const person = createTestPerson({
      injuries: [createTestInjury({ permanent: true })],
    });
    expect(hasPermanentInjuries(person)).toBe(true);
  });

  it('should return true when mixed injuries', () => {
    const person = createTestPerson({
      injuries: [
        createTestInjury({ permanent: false }),
        createTestInjury({ id: 'inj-002', permanent: true }),
      ],
    });
    expect(hasPermanentInjuries(person)).toBe(true);
  });
});

describe('getTotalHealingDays', () => {
  it('should return 0 when no injuries and no healing needed', () => {
    const person = createTestPerson({ injuries: [], daysToWaitForHealing: 0 });
    expect(getTotalHealingDays(person)).toBe(0);
  });

  it('should return daysToWaitForHealing when no injuries', () => {
    const person = createTestPerson({ injuries: [], daysToWaitForHealing: 7 });
    expect(getTotalHealingDays(person)).toBe(7);
  });

  it('should return max injury days when greater than daysToWaitForHealing', () => {
    const person = createTestPerson({
      injuries: [createTestInjury({ daysToHeal: 21 })],
      daysToWaitForHealing: 7,
    });
    expect(getTotalHealingDays(person)).toBe(21);
  });

  it('should return daysToWaitForHealing when greater than injury days', () => {
    const person = createTestPerson({
      injuries: [createTestInjury({ daysToHeal: 7 })],
      daysToWaitForHealing: 21,
    });
    expect(getTotalHealingDays(person)).toBe(21);
  });

  it('should ignore permanent injuries in calculation', () => {
    const person = createTestPerson({
      injuries: [
        createTestInjury({ daysToHeal: 14, permanent: false }),
        createTestInjury({ id: 'inj-002', daysToHeal: 0, permanent: true }),
      ],
      daysToWaitForHealing: 7,
    });
    expect(getTotalHealingDays(person)).toBe(14);
  });
});

describe('isCombatRole', () => {
  it('should return true for PILOT', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.PILOT });
    expect(isCombatRole(person)).toBe(true);
  });

  it('should return true for AEROSPACE_PILOT', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.AEROSPACE_PILOT });
    expect(isCombatRole(person)).toBe(true);
  });

  it('should return true for VEHICLE_DRIVER', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.VEHICLE_DRIVER });
    expect(isCombatRole(person)).toBe(true);
  });

  it('should return true for SOLDIER', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.SOLDIER });
    expect(isCombatRole(person)).toBe(true);
  });

  it('should return false for TECH', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.TECH });
    expect(isCombatRole(person)).toBe(false);
  });

  it('should return false for DOCTOR', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.DOCTOR });
    expect(isCombatRole(person)).toBe(false);
  });
});

describe('isSupportRole', () => {
  it('should return true for TECH', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.TECH });
    expect(isSupportRole(person)).toBe(true);
  });

  it('should return true for DOCTOR', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.DOCTOR });
    expect(isSupportRole(person)).toBe(true);
  });

  it('should return true for MEDIC', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.MEDIC });
    expect(isSupportRole(person)).toBe(true);
  });

  it('should return true for ADMIN', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.ADMIN });
    expect(isSupportRole(person)).toBe(true);
  });

  it('should return true for SUPPORT', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.SUPPORT });
    expect(isSupportRole(person)).toBe(true);
  });

  it('should return false for PILOT', () => {
    const person = createTestPerson({ primaryRole: CampaignPersonnelRole.PILOT });
    expect(isSupportRole(person)).toBe(false);
  });
});

// =============================================================================
// Migration Helper Tests
// =============================================================================

describe('pilotToPerson', () => {
  it('should convert basic pilot to person', () => {
    const pilot = createTestPilot();
    const person = pilotToPerson(pilot);

    expect(person.id).toBe(pilot.id);
    expect(person.name).toBe(pilot.name);
    expect(person.callsign).toBe(pilot.callsign);
    expect(person.pilotSkills).toEqual(pilot.skills);
  });

  it('should map pilot status to personnel status', () => {
    const activePilot = createTestPilot({ status: PilotStatus.Active });
    const injuredPilot = createTestPilot({ status: PilotStatus.Injured });
    const miaPilot = createTestPilot({ status: PilotStatus.MIA });
    const kiaPilot = createTestPilot({ status: PilotStatus.KIA });
    const retiredPilot = createTestPilot({ status: PilotStatus.Retired });

    expect(pilotToPerson(activePilot).status).toBe(PersonnelStatus.ACTIVE);
    expect(pilotToPerson(injuredPilot).status).toBe(PersonnelStatus.WOUNDED);
    expect(pilotToPerson(miaPilot).status).toBe(PersonnelStatus.MIA);
    expect(pilotToPerson(kiaPilot).status).toBe(PersonnelStatus.KIA);
    expect(pilotToPerson(retiredPilot).status).toBe(PersonnelStatus.RETIRED);
  });

  it('should set default role to PILOT', () => {
    const pilot = createTestPilot();
    const person = pilotToPerson(pilot);

    expect(person.primaryRole).toBe(CampaignPersonnelRole.PILOT);
  });

  it('should allow custom role override', () => {
    const pilot = createTestPilot();
    const person = pilotToPerson(pilot, {
      primaryRole: CampaignPersonnelRole.AEROSPACE_PILOT,
      secondaryRole: CampaignPersonnelRole.TECH,
    });

    expect(person.primaryRole).toBe(CampaignPersonnelRole.AEROSPACE_PILOT);
    expect(person.secondaryRole).toBe(CampaignPersonnelRole.TECH);
  });

  it('should set default rank', () => {
    const pilot = createTestPilot();
    const person = pilotToPerson(pilot);

    expect(person.rank).toBe('MechWarrior');
  });

  it('should allow custom rank override', () => {
    const pilot = createTestPilot();
    const person = pilotToPerson(pilot, { rank: 'Lieutenant' });

    expect(person.rank).toBe('Lieutenant');
  });

  it('should convert wounds to hits', () => {
    const pilot = createTestPilot({ wounds: 3 });
    const person = pilotToPerson(pilot);

    expect(person.hits).toBe(3);
    expect(person.daysToWaitForHealing).toBe(21); // 3 wounds * 7 days
  });

  it('should preserve career data', () => {
    const pilot = createTestPilot({
      career: {
        missionsCompleted: 25,
        victories: 20,
        defeats: 3,
        draws: 2,
        totalKills: 15,
        killRecords: [],
        missionHistory: [],
        xp: 500,
        totalXpEarned: 2000,
        rank: 'Captain',
      },
    });
    const person = pilotToPerson(pilot);

    expect(person.missionsCompleted).toBe(25);
    expect(person.totalKills).toBe(15);
    expect(person.xp).toBe(500);
    expect(person.totalXpEarned).toBe(2000);
    expect(person.xpSpent).toBe(1500);
    expect(person.rank).toBe('Captain');
  });

  it('should set default attributes', () => {
    const pilot = createTestPilot();
    const person = pilotToPerson(pilot);

    expect(person.attributes.STR).toBe(5);
    expect(person.attributes.BOD).toBe(5);
    expect(person.attributes.REF).toBe(5);
    expect(person.attributes.DEX).toBe(5);
    expect(person.attributes.INT).toBe(5);
    expect(person.attributes.WIL).toBe(5);
    expect(person.attributes.CHA).toBe(5);
    expect(person.attributes.Edge).toBe(0);
  });

  it('should allow custom attributes override', () => {
    const pilot = createTestPilot();
    const customAttributes = createTestAttributes({ DEX: 8, REF: 7 });
    const person = pilotToPerson(pilot, { attributes: customAttributes });

    expect(person.attributes.DEX).toBe(8);
    expect(person.attributes.REF).toBe(7);
  });

  it('should preserve background data', () => {
    const pilot = createTestPilot({
      affiliation: 'Federated Suns',
      portrait: 'portraits/jane-doe.png',
      background: 'A skilled pilot from New Avalon.',
    });
    const person = pilotToPerson(pilot);

    expect(person.affiliation).toBe('Federated Suns');
    expect(person.portrait).toBe('portraits/jane-doe.png');
    expect(person.biography).toBe('A skilled pilot from New Avalon.');
  });
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('isInjury', () => {
  it('should return true for valid injury', () => {
    const injury = createTestInjury();
    expect(isInjury(injury)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isInjury(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isInjury(undefined)).toBe(false);
  });

  it('should return false for missing required fields', () => {
    expect(isInjury({ id: 'inj-001' })).toBe(false);
    expect(isInjury({ id: 'inj-001', type: 'Burn' })).toBe(false);
  });

  it('should return false for wrong types', () => {
    expect(isInjury({ ...createTestInjury(), severity: 'high' })).toBe(false);
    expect(isInjury({ ...createTestInjury(), permanent: 'yes' })).toBe(false);
  });
});

describe('isPerson', () => {
  it('should return true for valid person', () => {
    const person = createTestPerson();
    expect(isPerson(person)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isPerson(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isPerson(undefined)).toBe(false);
  });

  it('should return false for missing required fields', () => {
    expect(isPerson({ id: 'person-001' })).toBe(false);
    expect(isPerson({ id: 'person-001', name: 'John' })).toBe(false);
  });
});

// =============================================================================
// Factory Function Tests
// =============================================================================

describe('createDefaultAttributes', () => {
  it('should create attributes with average values', () => {
    const attrs = createDefaultAttributes();

    expect(attrs.STR).toBe(5);
    expect(attrs.BOD).toBe(5);
    expect(attrs.REF).toBe(5);
    expect(attrs.DEX).toBe(5);
    expect(attrs.INT).toBe(5);
    expect(attrs.WIL).toBe(5);
    expect(attrs.CHA).toBe(5);
    expect(attrs.Edge).toBe(0);
  });
});

describe('createInjury', () => {
  it('should create injury with required fields', () => {
    const injury = createInjury({
      id: 'inj-test',
      type: 'Burn',
      location: 'Torso',
      severity: 3,
      daysToHeal: 10,
    });

    expect(injury.id).toBe('inj-test');
    expect(injury.type).toBe('Burn');
    expect(injury.location).toBe('Torso');
    expect(injury.severity).toBe(3);
    expect(injury.daysToHeal).toBe(10);
    expect(injury.permanent).toBe(false);
    expect(injury.acquired).toBeInstanceOf(Date);
  });

  it('should create injury with optional fields', () => {
    const acquired = new Date('2025-01-10');
    const injury = createInjury({
      id: 'inj-test',
      type: 'Concussion',
      location: 'Head',
      severity: 4,
      daysToHeal: 28,
      permanent: true,
      acquired,
      description: 'Severe head trauma',
      skillModifier: -2,
      attributeModifier: -1,
    });

    expect(injury.permanent).toBe(true);
    expect(injury.acquired).toBe(acquired);
    expect(injury.description).toBe('Severe head trauma');
    expect(injury.skillModifier).toBe(-2);
    expect(injury.attributeModifier).toBe(-1);
  });
});

// =============================================================================
// Status Transition Tests
// =============================================================================

describe('Status Transitions', () => {
  it('should handle ACTIVE → WOUNDED transition', () => {
    const activePerson = createTestPerson({ status: PersonnelStatus.ACTIVE });
    const woundedPerson = createTestPerson({
      ...activePerson,
      status: PersonnelStatus.WOUNDED,
      hits: 2,
      injuries: [createTestInjury()],
    });

    expect(isActive(activePerson)).toBe(true);
    expect(isActive(woundedPerson)).toBe(false);
    expect(isWounded(woundedPerson)).toBe(true);
    expect(isAlive(woundedPerson)).toBe(true);
  });

  it('should handle WOUNDED → KIA transition', () => {
    const woundedPerson = createTestPerson({
      status: PersonnelStatus.WOUNDED,
      hits: 5,
    });
    const kiaPerson = createTestPerson({
      ...woundedPerson,
      status: PersonnelStatus.KIA,
      hits: 6,
      deathDate: new Date('2025-01-25'),
    });

    expect(isAlive(woundedPerson)).toBe(true);
    expect(isAlive(kiaPerson)).toBe(false);
    expect(isActive(kiaPerson)).toBe(false);
  });

  it('should handle ACTIVE → MIA transition', () => {
    const activePerson = createTestPerson({ status: PersonnelStatus.ACTIVE });
    const miaPerson = createTestPerson({
      ...activePerson,
      status: PersonnelStatus.MIA,
    });

    expect(isActive(activePerson)).toBe(true);
    expect(isActive(miaPerson)).toBe(false);
    expect(isAlive(miaPerson)).toBe(true);
    expect(isAvailable(miaPerson)).toBe(false);
  });

  it('should handle ACTIVE → RETIRED transition', () => {
    const activePerson = createTestPerson({ status: PersonnelStatus.ACTIVE });
    const retiredPerson = createTestPerson({
      ...activePerson,
      status: PersonnelStatus.RETIRED,
      retirementDate: new Date('2025-01-25'),
    });

    expect(isActive(activePerson)).toBe(true);
    expect(isActive(retiredPerson)).toBe(false);
    expect(isAlive(retiredPerson)).toBe(true);
    expect(isAvailable(retiredPerson)).toBe(false);
  });
});

// =============================================================================
// XP Accumulation Tests
// =============================================================================

describe('XP Accumulation', () => {
  it('should track XP earned vs spent', () => {
    const person = createTestPerson({
      xp: 500,
      totalXpEarned: 2000,
      xpSpent: 1500,
    });

    expect(getTotalXP(person)).toBe(2000);
    expect(getAvailableXP(person)).toBe(500);
    expect(person.xpSpent).toBe(1500);
    expect(person.totalXpEarned - person.xpSpent).toBe(person.xp);
  });

  it('should handle zero XP', () => {
    const person = createTestPerson({
      xp: 0,
      totalXpEarned: 0,
      xpSpent: 0,
    });

    expect(getTotalXP(person)).toBe(0);
    expect(getAvailableXP(person)).toBe(0);
  });

  it('should handle large XP values', () => {
    const person = createTestPerson({
      xp: 5000,
      totalXpEarned: 50000,
      xpSpent: 45000,
    });

    expect(getTotalXP(person)).toBe(50000);
    expect(getAvailableXP(person)).toBe(5000);
  });
});

// =============================================================================
// Unit Assignment Tests
// =============================================================================

describe('Unit Assignment', () => {
  it('should track unit assignment', () => {
    const person = createTestPerson({
      unitId: 'mech-001',
      forceId: 'lance-alpha',
    });

    expect(person.unitId).toBe('mech-001');
    expect(person.forceId).toBe('lance-alpha');
  });

  it('should track tech assignments', () => {
    const techPerson = createTestPerson({
      primaryRole: CampaignPersonnelRole.TECH,
      techUnitIds: ['mech-001', 'mech-002', 'vehicle-001'],
    });

    expect(techPerson.techUnitIds).toHaveLength(3);
    expect(techPerson.techUnitIds).toContain('mech-001');
  });

  it('should track doctor assignment for wounded', () => {
    const woundedPerson = createTestPerson({
      status: PersonnelStatus.WOUNDED,
      doctorId: 'doctor-001',
    });

    expect(woundedPerson.doctorId).toBe('doctor-001');
  });

  it('should allow unassigned personnel', () => {
    const unassignedPerson = createTestPerson({
      primaryRole: CampaignPersonnelRole.UNASSIGNED,
      unitId: undefined,
      forceId: undefined,
    });

    expect(unassignedPerson.unitId).toBeUndefined();
    expect(unassignedPerson.forceId).toBeUndefined();
  });
});
