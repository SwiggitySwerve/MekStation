import { DEFAULT_UNIT_CONFIGURATION } from '@/lib/campaign/refit/unitConfiguration';
import { RulesLevel } from '@/types/enums/RulesLevel';

import {
  buildCampaignEditorUnitState,
  extractMechBuildConfigFromUnitState,
} from '../campaignCustomizerSession';

describe('campaignCustomizerSession', () => {
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
