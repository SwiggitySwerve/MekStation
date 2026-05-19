/**
 * Medical Bay — render tests
 *
 * Covers tasks.md 4.5 and the spec scenarios "Medical Bay lists injured
 * pilots", "Medical Bay exposes no healing controls", "Medical Bay empty
 * state".
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { SAMPLE_MEDICAL_BAY } from '../__fixtures__/bayFixtures';
import { MedicalBay } from '../MedicalBay';

describe('MedicalBay', () => {
  it('renders a row for every injured pilot', () => {
    render(<MedicalBay medicalBay={SAMPLE_MEDICAL_BAY} />);
    for (const item of SAMPLE_MEDICAL_BAY) {
      expect(
        screen.getByTestId(`medical-bay-row-${item.pilotId}`),
      ).toBeInTheDocument();
    }
  });

  it('shows injury level, days-to-recover and status', () => {
    render(<MedicalBay medicalBay={SAMPLE_MEDICAL_BAY} />);
    // pilot-1: serious / 14 days / recovering
    const row = screen.getByTestId('medical-bay-row-pilot-1');
    expect(row).toHaveTextContent('serious');
    expect(row).toHaveTextContent('recovering');
    expect(
      screen.getByTestId('medical-bay-recovery-pilot-1'),
    ).toHaveTextContent('14 days to recover');
    // pilot-2 is ready — cleared for active duty.
    expect(
      screen.getByTestId('medical-bay-recovery-pilot-2'),
    ).toHaveTextContent('Cleared for active duty');
  });

  it('exposes no healing control', () => {
    render(<MedicalBay medicalBay={SAMPLE_MEDICAL_BAY} />);
    // The Medical Bay is read-only — there are no buttons at all.
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows recovery copy indicating healing happens on day advancement', () => {
    render(<MedicalBay medicalBay={SAMPLE_MEDICAL_BAY} />);
    const note = screen.getByTestId('medical-bay-recovery-note');
    expect(note).toHaveTextContent(/advance the day/i);
  });

  it('shows an empty state — not an error — when no pilots are injured', () => {
    render(<MedicalBay medicalBay={[]} />);
    expect(screen.getByTestId('bay-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('bay-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('medical-bay-list')).not.toBeInTheDocument();
  });
});
