import { render, screen } from '@testing-library/react';
import React from 'react';

import OnboardingPage from '@/pages/onboarding';

describe('OnboardingPage glossary', () => {
  it('defines the core first-run BattleTech terms', () => {
    render(<OnboardingPage />);

    for (const term of [
      'Battle Value',
      'gunnery',
      'piloting',
      'heat',
      'piloting-skill-roll',
      'PSR',
    ]) {
      expect(screen.getAllByText(new RegExp(term, 'i')).length).toBeGreaterThan(
        0,
      );
    }
  });
});
