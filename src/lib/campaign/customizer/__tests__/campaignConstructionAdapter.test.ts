import { DEFAULT_UNIT_CONFIGURATION } from '@/lib/campaign/refit/unitConfiguration';
import { createDefaultUnitState } from '@/stores/unitState';
import { TechBase } from '@/types/enums';
import { projectMechBuildConfig } from '@/utils/validation/mechValidationProjection';

import { extractMechBuildConfigFromUnitState } from '../campaignCustomizerSession';

jest.mock('@/utils/validation/mechValidationProjection', () => ({
  projectMechBuildConfig: jest.fn(),
}));

test('campaign extraction delegates to the shared owner without a local projection', () => {
  const state = createDefaultUnitState({
    name: 'Delegate',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  const marker = { ...DEFAULT_UNIT_CONFIGURATION, tonnage: 35 };
  const owner = jest.mocked(projectMechBuildConfig);
  owner.mockReturnValue(marker);
  expect(extractMechBuildConfigFromUnitState(state)).toBe(marker);
  expect(owner).toHaveBeenCalledWith(state);
});
