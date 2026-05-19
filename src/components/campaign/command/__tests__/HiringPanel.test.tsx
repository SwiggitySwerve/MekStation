/**
 * Hiring Panel — render tests
 *
 * Covers tasks.md 2.5 and the spec scenarios "Hiring page lists market
 * candidates" and "Hiring page empty state".
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SAMPLE_CANDIDATES } from '../__fixtures__/commandFixtures';
import { HiringPanel } from '../HiringPanel';

describe('HiringPanel', () => {
  it('renders a card for every market candidate', () => {
    render(<HiringPanel candidates={SAMPLE_CANDIDATES} onHire={() => {}} />);
    for (const offer of SAMPLE_CANDIDATES) {
      expect(
        screen.getByTestId(`candidate-card-${offer.id}`),
      ).toBeInTheDocument();
    }
  });

  it('shows skills, salary, and the experience trait for each candidate', () => {
    render(<HiringPanel candidates={SAMPLE_CANDIDATES} onHire={() => {}} />);
    const offer = SAMPLE_CANDIDATES[0];
    expect(
      screen.getByTestId(`candidate-skills-${offer.id}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`candidate-salary-${offer.id}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`candidate-traits-${offer.id}`),
    ).toBeInTheDocument();
  });

  it('hire calls onHire with the offer id', () => {
    const onHire = jest.fn();
    render(<HiringPanel candidates={SAMPLE_CANDIDATES} onHire={onHire} />);
    fireEvent.click(
      screen.getByTestId(`candidate-hire-${SAMPLE_CANDIDATES[0].id}`),
    );
    expect(onHire).toHaveBeenCalledWith(SAMPLE_CANDIDATES[0].id);
  });

  it('shows an empty state when the market has no candidates', () => {
    render(<HiringPanel candidates={[]} onHire={() => {}} />);
    expect(screen.getByTestId('command-empty')).toBeInTheDocument();
  });

  it('disables the hire button for a candidate being hired', () => {
    render(
      <HiringPanel
        candidates={SAMPLE_CANDIDATES}
        onHire={() => {}}
        hiringOfferId={SAMPLE_CANDIDATES[0].id}
      />,
    );
    expect(
      screen.getByTestId(`candidate-hire-${SAMPLE_CANDIDATES[0].id}`),
    ).toBeDisabled();
  });
});
