import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { IInjury } from '@/types/campaign/Person';

import { MedicalSystem } from '../medicalTypes';
/* oxlint-disable @typescript-eslint/no-unsafe-assignment */
import { performSurgery, installProsthetic } from '../surgery';

function createMockRosterEntry(id: string, name: string): ICampaignRosterEntry {
  return {
    pilotId: id,
    pilotName: name,
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    hireDate: new Date(0),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    injuries: [],
  };
}

const createMockInjury = (id: string, permanent: boolean = true): IInjury => ({
  id,
  type: 'Broken Arm',
  location: 'Left Arm',
  severity: 2,
  daysToHeal: 14,
  permanent,
  acquired: new Date('2025-01-15'),
  description: 'Fractured radius from mech ejection',
  skillModifier: -2,
  attributeModifier: 0,
});

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
function createMockOptions(): any {
  return {
    healingRateMultiplier: 1.0,
    salaryMultiplier: 1.0,
    retirementAge: 65,
    healingWaitingPeriod: 7,
    medicalSystem: MedicalSystem.STANDARD,
    maxPatientsPerDoctor: 5,
    doctorsUseAdministration: false,
    xpPerMission: 100,
    xpPerKill: 10,
    xpCostMultiplier: 1.0,
    trackTimeInService: true,
    useEdge: true,
    startingFunds: 100000,
    maintenanceCostMultiplier: 1.0,
    repairCostMultiplier: 1.0,
    acquisitionCostMultiplier: 1.0,
    ammoExpenditure: 'half',
    salaryMultiplierByRank: {},
    useRoleBasedSalaries: false,
    useRandomSalaries: false,
    minimumSalary: 1000,
    salaryRandomRange: 0.1,
    useContractNegotiation: false,
    useStrategyResources: false,
    useAtBPilotQualities: false,
    useAtBMechanicalWarriors: false,
    useAtBLandAirMechs: false,
    useAtBVehicles: false,
    useAtBProtoMechs: false,
    useAtBBattleArmor: false,
    useAtBClanPilotQualities: false,
    useAtBClanMechanicalWarriors: false,
    useAtBClanLandAirMechs: false,
    useAtBClanVehicles: false,
    useAtBClanProtoMechs: false,
    useAtBClanBattleArmor: false,
    useAtBInfantry: false,
    useAtBSuperHeavyMechs: false,
    useAtBAerospaceUnits: false,
    useAtBDropships: false,
    useAtBJumpships: false,
    useAtBWarships: false,
    useAtBSpaceStations: false,
    useAtBSmallCraft: false,
    useAtBFightingVehicles: false,
    useAtBMilitaryAerospace: false,
    useAtBCivilianAerospace: false,
    useAtBMilitaryVTOL: false,
    useAtBCivilianVTOL: false,
    useAtBMilitaryGround: false,
    useAtBCivilianGround: false,
    useAtBMilitaryNaval: false,
    useAtBCivilianNaval: false,
    useAtBMilitaryInfantry: false,
    useAtBCivilianInfantry: false,
    useAtBMilitaryBattleArmor: false,
    useAtBCivilianBattleArmor: false,
    useAtBMilitaryProtoMechs: false,
    useAtBCivilianProtoMechs: false,
    useAtBMilitaryLargeAerospace: false,
    useAtBCivilianLargeAerospace: false,
    useAtBMilitarySmallCraft: false,
    useAtBCivilianSmallCraft: false,
    useAtBMilitaryFightingVehicles: false,
    useAtBCivilianFightingVehicles: false,
    useAtBMilitaryMilitaryAerospace: false,
    useAtBCivilianMilitaryAerospace: false,
    useAtBMilitaryVTOLAerospace: false,
    useAtBCivilianVTOLAerospace: false,
    useAtBMilitaryNavalAerospace: false,
    useAtBCivilianNavalAerospace: false,
    useAtBMilitaryInfantryAerospace: false,
    useAtBCivilianInfantryAerospace: false,
    useAtBMilitaryBattleArmorAerospace: false,
    useAtBCivilianBattleArmorAerospace: false,
    useAtBMilitaryProtoMechsAerospace: false,
    useAtBCivilianProtoMechsAerospace: false,
    useAtBMilitaryLargeAerospaceAerospace: false,
    useAtBCivilianLargeAerospaceAerospace: false,
    useAtBMilitarySmallCraftAerospace: false,
    useAtBCivilianSmallCraftAerospace: false,
    useAtBMilitaryFightingVehiclesAerospace: false,
    useAtBCivilianFightingVehiclesAerospace: false,
  };
}

describe('performSurgery', () => {
  it('should reject surgery on non-permanent injuries', () => {
    const patient = createMockRosterEntry('patient-1', 'John Doe');
    const injury = createMockInjury('inj-1', false);
    const surgeon = createMockRosterEntry('surgeon-1', 'Dr. Smith');
    const options = createMockOptions();
    const random = () => 0.5;

    expect(() => {
      performSurgery(patient, injury, surgeon, null, options, random);
    }).toThrow('Injury must be permanent to perform surgery');
  });

  it('should remove permanent flag on success (margin >= 3)', () => {
    const patient = createMockRosterEntry('patient-1', 'John Doe');
    const injury = createMockInjury('inj-1', true);
    const surgeon = createMockRosterEntry('surgeon-1', 'Dr. Smith');
    const options = createMockOptions();

    const random = () => 0.99;

    const result = performSurgery(
      patient,
      injury,
      surgeon,
      null,
      options,
      random,
    );

    expect(result.permanentRemoved).toBe(true);
    expect(result.outcome).toBe('permanent_healed');
    expect(result.margin).toBeGreaterThanOrEqual(3);
  });

  it('should install prosthetic on partial success (margin 0-2)', () => {
    const patient = createMockRosterEntry('patient-1', 'John Doe');
    const injury = createMockInjury('inj-1', true);
    const surgeon = createMockRosterEntry('surgeon-1', 'Dr. Smith');
    const options = createMockOptions();

    let callCount = 0;
    const random = () => {
      callCount++;
      if (callCount === 1) return 0.83;
      return 0.83;
    };

    const result = performSurgery(
      patient,
      injury,
      surgeon,
      null,
      options,
      random,
    );

    expect(result.permanentRemoved).toBe(false);
    expect(result.prostheticInstalled).toBe(true);
    expect(result.outcome).toBe('healed');
    expect(result.margin).toBeGreaterThanOrEqual(0);
    expect(result.margin).toBeLessThan(3);
  });

  it('should leave injury unchanged on failure (margin < 0)', () => {
    const patient = createMockRosterEntry('patient-1', 'John Doe');
    const injury = createMockInjury('inj-1', true);
    const surgeon = createMockRosterEntry('surgeon-1', 'Dr. Smith');
    const options = createMockOptions();

    let callCount = 0;
    const random = () => {
      callCount++;
      if (callCount === 1) return 0.33;
      return 0.66;
    };

    const result = performSurgery(
      patient,
      injury,
      surgeon,
      null,
      options,
      random,
    );

    expect(result.permanentRemoved).toBe(false);
    expect(result.prostheticInstalled).toBe(false);
    expect(result.outcome).toBe('no_change');
    expect(result.margin).toBeLessThan(0);
  });

  it('should return ISurgeryResult with all required fields', () => {
    const patient = createMockRosterEntry('patient-1', 'John Doe');
    const injury = createMockInjury('inj-1', true);
    const surgeon = createMockRosterEntry('surgeon-1', 'Dr. Smith');
    const options = createMockOptions();
    const random = () => 0.5;

    const result = performSurgery(
      patient,
      injury,
      surgeon,
      null,
      options,
      random,
    );

    expect(result).toHaveProperty('patientId');
    expect(result).toHaveProperty('doctorId');
    expect(result).toHaveProperty('system');
    expect(result).toHaveProperty('roll');
    expect(result).toHaveProperty('targetNumber');
    expect(result).toHaveProperty('margin');
    expect(result).toHaveProperty('outcome');
    expect(result).toHaveProperty('injuryId');
    expect(result).toHaveProperty('healingDaysReduced');
    expect(result).toHaveProperty('modifiers');
    expect(result).toHaveProperty('permanentRemoved');
    expect(result).toHaveProperty('prostheticInstalled');
  });

  it('should use pilotId for patientId and doctorId in result', () => {
    const patient = createMockRosterEntry('patient-1', 'John Doe');
    const injury = createMockInjury('inj-1', true);
    const surgeon = createMockRosterEntry('surgeon-1', 'Dr. Smith');
    const options = createMockOptions();
    const random = () => 0.5;

    const result = performSurgery(
      patient,
      injury,
      surgeon,
      null,
      options,
      random,
    );

    expect(result.patientId).toBe(patient.pilotId);
    expect(result.doctorId).toBe(surgeon.pilotId);
  });

  it('should include surgery modifier in modifiers list', () => {
    const patient = createMockRosterEntry('patient-1', 'John Doe');
    const injury = createMockInjury('inj-1', true);
    const surgeon = createMockRosterEntry('surgeon-1', 'Dr. Smith');
    const options = createMockOptions();
    const random = () => 0.5;

    const result = performSurgery(
      patient,
      injury,
      surgeon,
      null,
      options,
      random,
    );

    const surgeryModifier = result.modifiers.find(
      (m: { name: string; value: number }) => m.name === 'Surgery Difficulty',
    );
    expect(surgeryModifier).toBeDefined();
    expect(surgeryModifier?.value).toBe(2);
  });
});

describe('installProsthetic', () => {
  it('should add prosthetic flag to injury', () => {
    const injury = createMockInjury('inj-1', true);

    const result = installProsthetic(injury, 'Left Arm');

    expect(result.hasProsthetic).toBe(true);
  });

  it('should preserve injury properties when installing prosthetic', () => {
    const injury = createMockInjury('inj-1', true);

    const result = installProsthetic(injury, 'Left Arm');

    expect(result.id).toBe(injury.id);
    expect(result.type).toBe(injury.type);
    expect(result.location).toBe(injury.location);
    expect(result.severity).toBe(injury.severity);
    expect(result.permanent).toBe(injury.permanent);
  });

  it('should set prosthetic location', () => {
    const injury = createMockInjury('inj-1', true);

    const result = installProsthetic(injury, 'Right Leg');

    expect(result.prostheticLocation).toBe('Right Leg');
  });

  it('should handle multiple prosthetic installations', () => {
    const injury1 = createMockInjury('inj-1', true);
    const injury2 = createMockInjury('inj-2', true);

    const result1 = installProsthetic(injury1, 'Left Arm');
    const result2 = installProsthetic(injury2, 'Right Leg');

    expect(result1.hasProsthetic).toBe(true);
    expect(result2.hasProsthetic).toBe(true);
    expect(result1.prostheticLocation).toBe('Left Arm');
    expect(result2.prostheticLocation).toBe('Right Leg');
  });
});
