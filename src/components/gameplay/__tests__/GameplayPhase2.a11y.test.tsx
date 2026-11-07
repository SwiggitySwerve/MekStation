import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import React from 'react';

import { ScenarioGenerator } from '@/components/gameplay/ScenarioGenerator';
import { ScenarioObjectiveType } from '@/types/scenario';

describe('Gameplay Phase 2 a11y', () => {
  it('has no axe violations for the scenario generator panel', async () => {
    const { container } = render(
      <ScenarioGenerator
        playerBV={6450}
        playerUnitCount={4}
        defaultScenarioType={ScenarioObjectiveType.Breakthrough}
        onGenerate={() => undefined}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
