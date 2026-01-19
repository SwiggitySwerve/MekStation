/**
 * Encounter Interfaces Tests
 *
 * Tests for encounter types, validation, and type guards.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

import {
  IEncounter,
  IVictoryCondition,
  IForceReference,
  EncounterStatus,
  VictoryConditionType,
  PilotSkillTemplate,
  ScenarioTemplateType,
  TerrainPreset,
  SCENARIO_TEMPLATES,
  validateEncounter,
  isEncounter,
  isVictoryCondition,
} from '../EncounterInterfaces';

// =============================================================================
// Test Fixtures
// =============================================================================

function createTestEncounter(overrides: Partial<IEncounter> = {}): IEncounter {
  return {
    id: 'encounter-test-1',
    name: 'Test Encounter',
    status: EncounterStatus.Draft,
    mapConfig: {
      radius: 6,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    optionalRules: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createTestForceRef(overrides: Partial<IForceReference> = {}): IForceReference {
  return {
    forceId: 'force-1',
    forceName: 'Alpha Lance',
    totalBV: 5000,
    unitCount: 4,
    ...overrides,
  };
}

// =============================================================================
// Enum Tests
// =============================================================================

describe('EncounterStatus', () => {
  it('has correct values', () => {
    expect(EncounterStatus.Draft).toBe('draft');
    expect(EncounterStatus.Ready).toBe('ready');
    expect(EncounterStatus.Launched).toBe('launched');
    expect(EncounterStatus.Completed).toBe('completed');
  });
});

describe('VictoryConditionType', () => {
  it('has correct values', () => {
    expect(VictoryConditionType.DestroyAll).toBe('destroy_all');
    expect(VictoryConditionType.Cripple).toBe('cripple');
    expect(VictoryConditionType.Retreat).toBe('retreat');
    expect(VictoryConditionType.TurnLimit).toBe('turn_limit');
    expect(VictoryConditionType.Custom).toBe('custom');
  });
});

describe('PilotSkillTemplate', () => {
  it('has correct values', () => {
    expect(PilotSkillTemplate.Green).toBe('green');
    expect(PilotSkillTemplate.Regular).toBe('regular');
    expect(PilotSkillTemplate.Veteran).toBe('veteran');
    expect(PilotSkillTemplate.Elite).toBe('elite');
    expect(PilotSkillTemplate.Mixed).toBe('mixed');
  });
});

describe('ScenarioTemplateType', () => {
  it('has correct values', () => {
    expect(ScenarioTemplateType.Duel).toBe('duel');
    expect(ScenarioTemplateType.Skirmish).toBe('skirmish');
    expect(ScenarioTemplateType.Battle).toBe('battle');
    expect(ScenarioTemplateType.Custom).toBe('custom');
  });
});

describe('TerrainPreset', () => {
  it('has correct values', () => {
    expect(TerrainPreset.Clear).toBe('clear');
    expect(TerrainPreset.LightWoods).toBe('light_woods');
    expect(TerrainPreset.HeavyWoods).toBe('heavy_woods');
    expect(TerrainPreset.Urban).toBe('urban');
    expect(TerrainPreset.Rough).toBe('rough');
  });
});

// =============================================================================
// SCENARIO_TEMPLATES Tests
// =============================================================================

describe('SCENARIO_TEMPLATES', () => {
  it('has all expected templates', () => {
    expect(SCENARIO_TEMPLATES).toHaveLength(4);
    const types = SCENARIO_TEMPLATES.map((t) => t.type);
    expect(types).toContain(ScenarioTemplateType.Duel);
    expect(types).toContain(ScenarioTemplateType.Skirmish);
    expect(types).toContain(ScenarioTemplateType.Battle);
    expect(types).toContain(ScenarioTemplateType.Custom);
  });

  it('Duel template has correct defaults', () => {
    const duel = SCENARIO_TEMPLATES.find((t) => t.type === ScenarioTemplateType.Duel);
    expect(duel).toBeDefined();
    expect(duel!.name).toBe('Duel');
    expect(duel!.suggestedUnitCount).toBe(1);
    expect(duel!.defaultMapConfig.radius).toBe(5);
    expect(duel!.defaultVictoryConditions).toHaveLength(1);
    expect(duel!.defaultVictoryConditions[0].type).toBe(VictoryConditionType.DestroyAll);
  });

  it('Skirmish template has correct defaults', () => {
    const skirmish = SCENARIO_TEMPLATES.find((t) => t.type === ScenarioTemplateType.Skirmish);
    expect(skirmish).toBeDefined();
    expect(skirmish!.name).toBe('Skirmish');
    expect(skirmish!.suggestedUnitCount).toBe(4);
    expect(skirmish!.defaultMapConfig.radius).toBe(8);
    expect(skirmish!.defaultVictoryConditions).toHaveLength(2);
  });

  it('Battle template has correct defaults', () => {
    const battle = SCENARIO_TEMPLATES.find((t) => t.type === ScenarioTemplateType.Battle);
    expect(battle).toBeDefined();
    expect(battle!.name).toBe('Battle');
    expect(battle!.suggestedUnitCount).toBe(12);
    expect(battle!.defaultMapConfig.radius).toBe(12);
  });

  it('all templates have valid map configurations', () => {
    for (const template of SCENARIO_TEMPLATES) {
      expect(template.defaultMapConfig.radius).toBeGreaterThan(0);
      expect(template.defaultMapConfig.terrain).toBeDefined();
      expect(['north', 'south', 'east', 'west']).toContain(
        template.defaultMapConfig.playerDeploymentZone
      );
      expect(['north', 'south', 'east', 'west']).toContain(
        template.defaultMapConfig.opponentDeploymentZone
      );
    }
  });
});

// =============================================================================
// validateEncounter Tests
// =============================================================================

describe('validateEncounter', () => {
  it('returns invalid for encounter without name', () => {
    const encounter = createTestEncounter({ name: '' });
    const result = validateEncounter(encounter);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Encounter name is required');
  });

  it('returns invalid for encounter without player force', () => {
    const encounter = createTestEncounter({ playerForce: undefined });
    const result = validateEncounter(encounter);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Player force must be selected');
  });

  it('returns invalid for encounter without opponent', () => {
    const encounter = createTestEncounter({
      playerForce: createTestForceRef(),
      opponentForce: undefined,
      opForConfig: undefined,
    });
    const result = validateEncounter(encounter);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Opponent force or OpFor configuration is required');
  });

  it('returns invalid for encounter without victory conditions', () => {
    const encounter = createTestEncounter({
      playerForce: createTestForceRef(),
      opponentForce: createTestForceRef(),
      victoryConditions: [],
    });
    const result = validateEncounter(encounter);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one victory condition is required');
  });

  it('returns invalid for turn limit condition without turn limit value', () => {
    const encounter = createTestEncounter({
      playerForce: createTestForceRef(),
      opponentForce: createTestForceRef(),
      victoryConditions: [{ type: VictoryConditionType.TurnLimit }],
    });
    const result = validateEncounter(encounter);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Turn limit victory condition requires a positive turn limit'
    );
  });

  it('returns valid for complete encounter with explicit opponent', () => {
    const encounter = createTestEncounter({
      playerForce: createTestForceRef(),
      opponentForce: createTestForceRef(),
      victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    });
    const result = validateEncounter(encounter);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid for complete encounter with OpFor config', () => {
    const encounter = createTestEncounter({
      playerForce: createTestForceRef(),
      opForConfig: {
        targetBVPercent: 100,
        pilotSkillTemplate: PilotSkillTemplate.Regular,
      },
      victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    });
    const result = validateEncounter(encounter);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('warns when BV difference is significant', () => {
    const encounter = createTestEncounter({
      playerForce: createTestForceRef({ totalBV: 10000 }),
      opponentForce: createTestForceRef({ totalBV: 5000 }),
      victoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    });
    const result = validateEncounter(encounter);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('unbalanced'))).toBe(true);
  });
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('isEncounter', () => {
  it('returns true for valid encounter', () => {
    const encounter = createTestEncounter();
    expect(isEncounter(encounter)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isEncounter(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isEncounter(undefined)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isEncounter('string')).toBe(false);
    expect(isEncounter(123)).toBe(false);
    expect(isEncounter(true)).toBe(false);
  });

  it('returns false for object missing required fields', () => {
    expect(isEncounter({})).toBe(false);
    expect(isEncounter({ id: 'test' })).toBe(false);
    expect(isEncounter({ id: 'test', name: 'Test' })).toBe(false);
  });
});

describe('isVictoryCondition', () => {
  it('returns true for valid victory condition', () => {
    const vc: IVictoryCondition = { type: VictoryConditionType.DestroyAll };
    expect(isVictoryCondition(vc)).toBe(true);
  });

  it('returns true for victory condition with optional fields', () => {
    const vc: IVictoryCondition = {
      type: VictoryConditionType.TurnLimit,
      turnLimit: 15,
    };
    expect(isVictoryCondition(vc)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isVictoryCondition(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isVictoryCondition(undefined)).toBe(false);
  });

  it('returns false for object missing type', () => {
    expect(isVictoryCondition({})).toBe(false);
    expect(isVictoryCondition({ turnLimit: 15 })).toBe(false);
  });
});
