import { calculateVictoryProbability, distributeDamage, determineCasualties, resolveScenario } from '../acar';
import { PersonnelStatus } from '@/types/campaign/enums';

describe('calculateVictoryProbability', () => {
  it('should return 0.5 when both BVs are equal', () => {
    const result = calculateVictoryProbability(3000, 3000);
    expect(result).toBe(0.5);
  });

  it('should return 2/3 for a 2:1 ratio (player advantage)', () => {
    const result = calculateVictoryProbability(4000, 2000);
    expect(result).toBeCloseTo(2 / 3, 5);
  });

  it('should return 3/4 for a 3:1 ratio (player advantage)', () => {
    const result = calculateVictoryProbability(6000, 2000);
    expect(result).toBeCloseTo(3 / 4, 5);
  });

  it('should return 0.5 when both BVs are zero (edge case)', () => {
    const result = calculateVictoryProbability(0, 0);
    expect(result).toBe(0.5);
  });

  it('should return 0 when player BV is zero and opponent has BV', () => {
    const result = calculateVictoryProbability(0, 5000);
    expect(result).toBe(0);
  });

  it('should return 1 when opponent BV is zero and player has BV', () => {
    const result = calculateVictoryProbability(5000, 0);
    expect(result).toBe(1);
  });

  it('should handle very large numbers correctly', () => {
    const result = calculateVictoryProbability(1000000, 1000000);
    expect(result).toBe(0.5);
  });

  it('should handle decimal values correctly', () => {
    const result = calculateVictoryProbability(1500.5, 1500.5);
    expect(result).toBe(0.5);
  });
});

describe('distributeDamage', () => {
  it('should return empty Map when unitIds array is empty', () => {
    const result = distributeDamage([], 0.8);
    expect(result).toEqual(new Map());
    expect(result.size).toBe(0);
  });

  it('should distribute damage to single unit with severity 0.2', () => {
    const seededRandom = () => 0.5;
    const result = distributeDamage(['unit1'], 0.2, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('unit1')).toBeCloseTo(15, 5); // 0.2 * (0.5 + 0.5 * 0.5) * 100 = 15
  });

  it('should distribute damage to single unit with severity 0.5', () => {
    const seededRandom = () => 0.5;
    const result = distributeDamage(['unit1'], 0.5, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('unit1')).toBeCloseTo(37.5, 5); // 0.5 * (0.5 + 0.5 * 0.5) * 100 = 37.5
  });

  it('should distribute damage to single unit with severity 0.8', () => {
    const seededRandom = () => 0.5;
    const result = distributeDamage(['unit1'], 0.8, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('unit1')).toBeCloseTo(60, 5); // 0.8 * (0.5 + 0.5 * 0.5) * 100 = 60
  });

  it('should cap damage at 100% when severity is 1.0', () => {
    const seededRandom = () => 1.0;
    const result = distributeDamage(['unit1'], 1.0, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('unit1')).toBe(100); // Capped at 100
  });

  it('should distribute different damage to multiple units with same severity', () => {
    let callCount = 0;
    const seededRandom = () => {
      callCount++;
      return callCount === 1 ? 0.0 : 1.0; // First unit gets min, second gets max
    };
    const result = distributeDamage(['unit1', 'unit2'], 0.8, seededRandom);
    expect(result.size).toBe(2);
    expect(result.get('unit1')).toBeCloseTo(40, 5); // 0.8 * (0.5 + 0.0 * 0.5) * 100 = 40
    expect(result.get('unit2')).toBeCloseTo(80, 5); // 0.8 * (0.5 + 1.0 * 0.5) * 100 = 80
  });

  it('should handle three units with varying random values', () => {
    const randomValues = [0.0, 0.5, 1.0];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = distributeDamage(['unit1', 'unit2', 'unit3'], 0.6, seededRandom);
    expect(result.size).toBe(3);
    expect(result.get('unit1')).toBeCloseTo(30, 5); // 0.6 * (0.5 + 0.0 * 0.5) * 100 = 30
    expect(result.get('unit2')).toBeCloseTo(45, 5); // 0.6 * (0.5 + 0.5 * 0.5) * 100 = 45
    expect(result.get('unit3')).toBeCloseTo(60, 5); // 0.6 * (0.5 + 1.0 * 0.5) * 100 = 60
  });

  it('should ensure all damage values are within 0-100 range', () => {
    const seededRandom = () => Math.random();
    const result = distributeDamage(['unit1', 'unit2', 'unit3', 'unit4', 'unit5'], 1.0, seededRandom);
    result.forEach((damage) => {
      expect(damage).toBeGreaterThanOrEqual(0);
      expect(damage).toBeLessThanOrEqual(100);
    });
  });

  it('should use Math.random by default when no random function provided', () => {
    const result = distributeDamage(['unit1', 'unit2'], 0.5);
    expect(result.size).toBe(2);
    expect(result.get('unit1')).toBeDefined();
    expect(result.get('unit2')).toBeDefined();
    const damage1 = result.get('unit1')!;
    const damage2 = result.get('unit2')!;
    expect(damage1).toBeGreaterThanOrEqual(25); // Min: 0.5 * 0.5 * 100
    expect(damage1).toBeLessThanOrEqual(100); // Max: capped at 100
    expect(damage2).toBeGreaterThanOrEqual(25);
    expect(damage2).toBeLessThanOrEqual(100);
  });

  it('should return Map with correct unitId keys', () => {
    const seededRandom = () => 0.5;
    const unitIds = ['mech1', 'vehicle2', 'turret3'];
    const result = distributeDamage(unitIds, 0.7, seededRandom);
    expect(result.has('mech1')).toBe(true);
    expect(result.has('vehicle2')).toBe(true);
    expect(result.has('turret3')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('should handle severity 0 resulting in 0 damage', () => {
    const seededRandom = () => 1.0;
    const result = distributeDamage(['unit1'], 0, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('unit1')).toBe(0); // 0 * (0.5 + 1.0 * 0.5) * 100 = 0
  });
});

describe('determineCasualties', () => {
  it('should return empty Map when personnelIds array is empty', () => {
    const result = determineCasualties([], 0.5);
    expect(result).toEqual(new Map());
    expect(result.size).toBe(0);
  });

  it('should return empty Map when battleIntensity is 0', () => {
    const seededRandom = () => 0.5;
    const result = determineCasualties(['pilot1', 'pilot2', 'pilot3'], 0, seededRandom);
    expect(result).toEqual(new Map());
    expect(result.size).toBe(0);
  });

  it('should calculate casualty rate as battleIntensity * 0.1', () => {
    // With battleIntensity 0.5, casualty rate is 5%
    // First person: random 0.03 < 0.05 → casualty, status roll 0.3 → WOUNDED
    // Second person: random 0.08 > 0.05 → no casualty
    const randomValues = [0.03, 0.3, 0.08];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = determineCasualties(['pilot1', 'pilot2'], 0.5, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('pilot1')).toBe(PersonnelStatus.WOUNDED);
    expect(result.has('pilot2')).toBe(false);
  });

  it('should assign WOUNDED status when statusRoll < 0.6', () => {
    // battleIntensity 1.0 → casualty rate 0.1, casualty roll 0.05 < 0.1 → casualty, status roll 0.3 < 0.6 → WOUNDED
    const randomValues = [0.05, 0.3];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = determineCasualties(['pilot1'], 1.0, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('pilot1')).toBe(PersonnelStatus.WOUNDED);
  });

  it('should assign MIA status when statusRoll is 0.6-0.9', () => {
    // battleIntensity 1.0 → casualty rate 0.1, casualty roll 0.05 < 0.1 → casualty, status roll 0.75 (0.6-0.9) → MIA
    const randomValues = [0.05, 0.75];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = determineCasualties(['pilot1'], 1.0, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('pilot1')).toBe(PersonnelStatus.MIA);
  });

  it('should assign KIA status when statusRoll >= 0.9', () => {
    // battleIntensity 1.0 → casualty rate 0.1, casualty roll 0.05 < 0.1 → casualty, status roll 0.95 >= 0.9 → KIA
    const randomValues = [0.05, 0.95];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = determineCasualties(['pilot1'], 1.0, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('pilot1')).toBe(PersonnelStatus.KIA);
  });

  it('should handle multiple personnel with varying outcomes', () => {
    // battleIntensity 1.0 → casualty rate 0.1
    // Person 1: casualty roll 0.08 < 0.1 → casualty, status 0.5 → WOUNDED
    // Person 2: casualty roll 0.15 > 0.1 → no casualty
    // Person 3: casualty roll 0.09 < 0.1 → casualty, status 0.85 → MIA
    // Person 4: casualty roll 0.02 < 0.1 → casualty, status 0.92 → KIA
    const randomValues = [0.08, 0.5, 0.15, 0.09, 0.85, 0.02, 0.92];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = determineCasualties(['pilot1', 'pilot2', 'pilot3', 'pilot4'], 1.0, seededRandom);
    expect(result.size).toBe(3);
    expect(result.get('pilot1')).toBe(PersonnelStatus.WOUNDED);
    expect(result.has('pilot2')).toBe(false);
    expect(result.get('pilot3')).toBe(PersonnelStatus.MIA);
    expect(result.get('pilot4')).toBe(PersonnelStatus.KIA);
  });

  it('should exclude non-casualties from the returned Map', () => {
    // All personnel survive (casualty rolls all > 0.1)
    const randomValues = [0.2, 0.3, 0.4];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = determineCasualties(['pilot1', 'pilot2', 'pilot3'], 0.1, seededRandom);
    expect(result.size).toBe(0);
    expect(result.has('pilot1')).toBe(false);
    expect(result.has('pilot2')).toBe(false);
    expect(result.has('pilot3')).toBe(false);
  });

  it('should be deterministic with seeded random function', () => {
    const randomValues = [0.05, 0.3, 0.08, 0.75, 0.02, 0.95];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result1 = determineCasualties(['p1', 'p2', 'p3'], 0.1, seededRandom);
    
    // Reset index for second call
    index = 0;
    const result2 = determineCasualties(['p1', 'p2', 'p3'], 0.1, seededRandom);
    
    expect(result1.size).toBe(result2.size);
    expect(result1.get('p1')).toBe(result2.get('p1'));
    expect(result1.get('p2')).toBe(result2.get('p2'));
    expect(result1.get('p3')).toBe(result2.get('p3'));
  });

  it('should handle high battleIntensity with many casualties', () => {
    // With battleIntensity 1.0, casualty rate is 10%
    // First 5 people all become casualties with different statuses
    const randomValues = [
      0.05, 0.2,   // pilot1: casualty, WOUNDED
      0.08, 0.7,   // pilot2: casualty, MIA
      0.09, 0.95,  // pilot3: casualty, KIA
      0.02, 0.55,  // pilot4: casualty, WOUNDED
      0.07, 0.88   // pilot5: casualty, MIA
    ];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = determineCasualties(['pilot1', 'pilot2', 'pilot3', 'pilot4', 'pilot5'], 1.0, seededRandom);
    expect(result.size).toBe(5);
    expect(result.get('pilot1')).toBe(PersonnelStatus.WOUNDED);
    expect(result.get('pilot2')).toBe(PersonnelStatus.MIA);
    expect(result.get('pilot3')).toBe(PersonnelStatus.KIA);
    expect(result.get('pilot4')).toBe(PersonnelStatus.WOUNDED);
    expect(result.get('pilot5')).toBe(PersonnelStatus.MIA);
  });

  it('should use Math.random by default when no random function provided', () => {
    const result = determineCasualties(['pilot1', 'pilot2', 'pilot3'], 0.5);
    // With 50% casualty rate, we expect some casualties but can't guarantee exact count
    expect(result).toBeInstanceOf(Map);
    result.forEach((status) => {
      expect([PersonnelStatus.WOUNDED, PersonnelStatus.MIA, PersonnelStatus.KIA]).toContain(status);
    });
  });

   it('should return Map with correct personnelId keys', () => {
     const randomValues = [0.05, 0.3, 0.08, 0.75];
     let index = 0;
     const seededRandom = () => randomValues[index++];
     const personnelIds = ['soldier1', 'soldier2', 'soldier3'];
     const result = determineCasualties(personnelIds, 0.1, seededRandom);
     result.forEach((status, personnelId) => {
       expect(personnelIds).toContain(personnelId);
     });
   });
});

describe('resolveScenario', () => {
  it('should return victory outcome when roll < probability', () => {
    // Equal BVs = 0.5 probability, roll 0.3 < 0.5 = victory
    const randomValues = [0.3]; // outcome roll
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, [], [], seededRandom);
    expect(result.outcome).toBe('victory');
  });

  it('should return defeat outcome when roll > 1 - probability', () => {
    // Equal BVs = 0.5 probability, 1 - 0.5 = 0.5, roll 0.8 > 0.5 = defeat
    const randomValues = [0.8]; // outcome roll
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, [], [], seededRandom);
    expect(result.outcome).toBe('defeat');
  });

  it('should return draw outcome when roll is in middle range', () => {
    // Equal BVs = 0.5 probability, roll 0.5 is not < 0.5 and not > 0.5 = draw
    const randomValues = [0.5]; // outcome roll
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, [], [], seededRandom);
    expect(result.outcome).toBe('draw');
  });

  it('should set severity to 0.3 for victory outcome', () => {
    // Victory with severity 0.3
    const randomValues = [0.3, 0.5]; // outcome roll, damage roll
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1'], [], seededRandom);
    expect(result.outcome).toBe('victory');
    // Verify damage is calculated with severity 0.3
    expect(result.unitDamage.get('unit1')).toBeCloseTo(22.5, 5); // 0.3 * (0.5 + 0.5 * 0.5) * 100
  });

  it('should set severity to 0.8 for defeat outcome', () => {
    // Defeat with severity 0.8
    const randomValues = [0.8, 0.5]; // outcome roll, damage roll
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1'], [], seededRandom);
    expect(result.outcome).toBe('defeat');
    // Verify damage is calculated with severity 0.8
    expect(result.unitDamage.get('unit1')).toBeCloseTo(60, 5); // 0.8 * (0.5 + 0.5 * 0.5) * 100
  });

  it('should set severity to 0.5 for draw outcome', () => {
    // Draw with severity 0.5
    const randomValues = [0.5, 0.5]; // outcome roll, damage roll
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1'], [], seededRandom);
    expect(result.outcome).toBe('draw');
    // Verify damage is calculated with severity 0.5
    expect(result.unitDamage.get('unit1')).toBeCloseTo(37.5, 5); // 0.5 * (0.5 + 0.5 * 0.5) * 100
  });

  it('should set intensity to 0.4 for victory outcome', () => {
    // Victory with intensity 0.4 (casualty rate 4%)
    const randomValues = [0.3, 0.5, 0.03, 0.3]; // outcome, damage, casualty roll, status roll
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1'], ['pilot1'], seededRandom);
    expect(result.outcome).toBe('victory');
    // With intensity 0.4, casualty rate is 4%, roll 0.03 < 0.04 = casualty
    expect(result.personnelCasualties.size).toBe(1);
    expect(result.personnelCasualties.get('pilot1')).toBe(1);
  });

  it('should set intensity to 0.9 for defeat outcome', () => {
    // Defeat with intensity 0.9 (casualty rate 9%)
    const randomValues = [0.8, 0.5, 0.08, 0.3]; // outcome, damage, casualty roll, status roll
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1'], ['pilot1'], seededRandom);
    expect(result.outcome).toBe('defeat');
    // With intensity 0.9, casualty rate is 9%, roll 0.08 < 0.09 = casualty
    expect(result.personnelCasualties.size).toBe(1);
    expect(result.personnelCasualties.get('pilot1')).toBe(1);
  });

  it('should set intensity to 0.6 for draw outcome', () => {
    // Draw with intensity 0.6 (casualty rate 6%)
    const randomValues = [0.5, 0.5, 0.05, 0.3]; // outcome, damage, casualty roll, status roll
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1'], ['pilot1'], seededRandom);
    expect(result.outcome).toBe('draw');
    // With intensity 0.6, casualty rate is 6%, roll 0.05 < 0.06 = casualty
    expect(result.personnelCasualties.size).toBe(1);
    expect(result.personnelCasualties.get('pilot1')).toBe(1);
  });

  it('should return unitDamage as Map', () => {
    const randomValues = [0.3, 0.5];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1', 'unit2'], [], seededRandom);
    expect(result.unitDamage).toBeInstanceOf(Map);
    expect(result.unitDamage.size).toBe(2);
  });

  it('should return personnelCasualties as Map', () => {
    const randomValues = [0.3, 0.5, 0.03, 0.3, 0.08, 0.75];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, [], ['pilot1', 'pilot2'], seededRandom);
    expect(result.personnelCasualties).toBeInstanceOf(Map);
  });

  it('should return empty salvage array', () => {
    const randomValues = [0.3];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, [], [], seededRandom);
    expect(result.salvage).toEqual([]);
    expect(Array.isArray(result.salvage)).toBe(true);
  });

  it('should return ResolveScenarioResult with all required properties', () => {
    const randomValues = [0.3, 0.5, 0.03, 0.3];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1'], ['pilot1'], seededRandom);
    expect(result).toHaveProperty('outcome');
    expect(result).toHaveProperty('unitDamage');
    expect(result).toHaveProperty('personnelCasualties');
    expect(result).toHaveProperty('salvage');
    expect(typeof result.outcome).toBe('string');
    expect(result.unitDamage instanceof Map).toBe(true);
    expect(result.personnelCasualties instanceof Map).toBe(true);
    expect(Array.isArray(result.salvage)).toBe(true);
  });

  it('should handle empty unitIds array', () => {
    const randomValues = [0.3];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, [], [], seededRandom);
    expect(result.unitDamage).toEqual(new Map());
    expect(result.unitDamage.size).toBe(0);
  });

  it('should handle empty personnelIds array', () => {
    const randomValues = [0.3, 0.5];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1'], [], seededRandom);
    expect(result.personnelCasualties).toEqual(new Map());
    expect(result.personnelCasualties.size).toBe(0);
  });

  it('should handle equal BVs (50/50 probability)', () => {
    // With equal BVs, probability is 0.5
    // roll 0.3 < 0.5 = victory
    const randomValues = [0.3];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(5000, 5000, [], [], seededRandom);
    expect(result.outcome).toBe('victory');
  });

  it('should handle player advantage (high probability)', () => {
    // Player BV 6000, Opponent BV 2000 = 0.75 probability
    // roll 0.5 < 0.75 = victory
    const randomValues = [0.5];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(6000, 2000, [], [], seededRandom);
    expect(result.outcome).toBe('victory');
  });

  it('should handle opponent advantage (low probability)', () => {
    // Player BV 2000, Opponent BV 6000 = 0.25 probability
    // roll 0.8 > (1 - 0.25) = 0.75 = defeat
    const randomValues = [0.8];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(2000, 6000, [], [], seededRandom);
    expect(result.outcome).toBe('defeat');
  });

  it('should be deterministic with seeded random function', () => {
    const randomValues = [0.3, 0.5, 0.03, 0.3];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    
    const result1 = resolveScenario(3000, 3000, ['unit1'], ['pilot1'], seededRandom);
    
    // Reset index for second call
    index = 0;
    const result2 = resolveScenario(3000, 3000, ['unit1'], ['pilot1'], seededRandom);
    
    expect(result1.outcome).toBe(result2.outcome);
    expect(result1.unitDamage.get('unit1')).toBe(result2.unitDamage.get('unit1'));
    expect(result1.personnelCasualties.get('pilot1')).toBe(result2.personnelCasualties.get('pilot1'));
  });

  it('should use Math.random by default when no random function provided', () => {
    const result = resolveScenario(3000, 3000, ['unit1', 'unit2'], ['pilot1', 'pilot2']);
    expect(result.outcome).toBeDefined();
    expect(['victory', 'defeat', 'draw']).toContain(result.outcome);
    expect(result.unitDamage.size).toBe(2);
    expect(result.unitDamage.get('unit1')).toBeDefined();
    expect(result.unitDamage.get('unit2')).toBeDefined();
  });

  it('should distribute damage to all units in unitIds', () => {
    const randomValues = [0.3, 0.2, 0.5, 0.8];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['mech1', 'vehicle2', 'turret3'], [], seededRandom);
    expect(result.unitDamage.size).toBe(3);
    expect(result.unitDamage.has('mech1')).toBe(true);
    expect(result.unitDamage.has('vehicle2')).toBe(true);
    expect(result.unitDamage.has('turret3')).toBe(true);
  });

  it('should track casualties for all affected personnel', () => {
    // Victory with intensity 0.4 (4% casualty rate)
    const randomValues = [0.3, 0.5, 0.03, 0.3, 0.02, 0.75, 0.08, 0.5];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1'], ['pilot1', 'pilot2', 'pilot3'], seededRandom);
    expect(result.outcome).toBe('victory');
    // pilot1: 0.03 < 0.04 = casualty
    // pilot2: 0.02 < 0.04 = casualty
    // pilot3: 0.08 > 0.04 = no casualty
    expect(result.personnelCasualties.size).toBe(2);
    expect(result.personnelCasualties.has('pilot1')).toBe(true);
    expect(result.personnelCasualties.has('pilot2')).toBe(true);
    expect(result.personnelCasualties.has('pilot3')).toBe(false);
  });

  it('should return casualty count of 1 for each casualty', () => {
    const randomValues = [0.3, 0.5, 0.03, 0.3];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(3000, 3000, ['unit1'], ['pilot1'], seededRandom);
    expect(result.personnelCasualties.get('pilot1')).toBe(1);
  });

  it('should handle complex scenario with multiple units and personnel', () => {
    // Defeat scenario with multiple units and personnel
    const randomValues = [
      0.8,    // outcome roll: defeat
      0.2, 0.5, 0.8,  // damage rolls for 3 units
      0.08, 0.3,      // pilot1: casualty, WOUNDED
      0.15,           // pilot2: no casualty
      0.07, 0.75      // pilot3: casualty, MIA
    ];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = resolveScenario(2000, 6000, ['unit1', 'unit2', 'unit3'], ['pilot1', 'pilot2', 'pilot3'], seededRandom);
    
    expect(result.outcome).toBe('defeat');
    expect(result.unitDamage.size).toBe(3);
    expect(result.personnelCasualties.size).toBe(2);
    expect(result.personnelCasualties.has('pilot1')).toBe(true);
    expect(result.personnelCasualties.has('pilot2')).toBe(false);
    expect(result.personnelCasualties.has('pilot3')).toBe(true);
  });
});
