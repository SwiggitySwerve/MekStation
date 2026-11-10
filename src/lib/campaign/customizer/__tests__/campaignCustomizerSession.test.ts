import { DEFAULT_UNIT_CONFIGURATION } from '@/lib/campaign/refit/unitConfiguration';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { RulesLevel } from '@/types/enums/RulesLevel';

import {
  buildCampaignEditorUnitState,
  extractMechBuildConfigFromUnitState,
} from '../campaignCustomizerSession';

describe('campaignCustomizerSession', () => {
  it('retains stored configuration and donor sections when reopening a refit', () => {
    const currentConfiguration = {
      ...DEFAULT_UNIT_CONFIGURATION,
      configuration: MechConfiguration.TRIPOD,
      frankenStructure: {
        type: 'STANDARD',
        typeByLocation: { LEFT_ARM: 'ENDO_STEEL' },
      },
    };
    const state = buildCampaignEditorUnitState({
      editorUnitId: 'tripod-refit',
      unit: {
        unitId: 'tripod',
        unitName: 'Tripod',
        chassisVariant: 'Test',
        readiness: 'Ready',
      },
      currentConfiguration,
      rulesLevel: RulesLevel.EXPERIMENTAL,
    });
    expect(state.configuration).toBe(currentConfiguration.configuration);
    expect(state.frankenStructure).toEqual(
      currentConfiguration.frankenStructure,
    );
    expect(extractMechBuildConfigFromUnitState(state)).toEqual(
      currentConfiguration,
    );
  });

  it('creates a separate editor unit from canonical campaign roster identity', () => {
    const editorUnitId = '11111111-1111-4111-8111-111111111111';
    const state = buildCampaignEditorUnitState({
      editorUnitId,
      unit: {
        unitId: 'campaign-unit-atlas',
        unitName: 'Atlas',
        chassisVariant: 'AS7-D',
        readiness: 'Ready',
      },
      currentConfiguration: {
        ...DEFAULT_UNIT_CONFIGURATION,
        tonnage: 100,
        engineRating: 300,
        totalArmorPoints: 250,
      },
      rulesLevel: RulesLevel.ADVANCED,
    });

    expect(state.id).toBe(editorUnitId);
    expect(state.id).not.toBe('campaign-unit-atlas');
    expect(state.name).toBe('Atlas');
    expect(state.model).toBe('AS7-D');
    expect(state.tonnage).toBe(100);
    expect(state.engineRating).toBe(300);
    expect(state.rulesLevel).toBe(RulesLevel.ADVANCED);
    expect(state.isModified).toBe(false);
  });

  it('extracts a refit target config from the editor state without campaign ids', () => {
    const state = buildCampaignEditorUnitState({
      editorUnitId: '11111111-1111-4111-8111-111111111111',
      unit: {
        unitId: 'campaign-unit-atlas',
        unitName: 'Atlas',
        chassisVariant: 'AS7-D',
        readiness: 'Ready',
      },
      currentConfiguration: DEFAULT_UNIT_CONFIGURATION,
      rulesLevel: RulesLevel.STANDARD,
    });

    const config = extractMechBuildConfigFromUnitState({
      ...state,
      engineRating: 275,
      jumpMP: 3,
    });

    expect(config).toMatchObject({
      tonnage: DEFAULT_UNIT_CONFIGURATION.tonnage,
      engineRating: 275,
      jumpMP: 3,
      engineType: DEFAULT_UNIT_CONFIGURATION.engineType,
    });
  });
});
