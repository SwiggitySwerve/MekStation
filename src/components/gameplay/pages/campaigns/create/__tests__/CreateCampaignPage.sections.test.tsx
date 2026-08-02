import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { StepIndicator } from '../CreateCampaignPage.sections';

const STEPS = ['Basic Info', 'Type', 'Preset', 'Roster', 'Review'];

describe('StepIndicator', () => {
  const scrollIntoView = jest.fn();
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    scrollIntoView.mockClear();
  });

  it('keeps the first current step visible in its own horizontal scroller', () => {
    render(<StepIndicator steps={STEPS} currentStep={0} />);

    const stepper = screen.getByTestId('campaign-step-indicator');
    const currentStep = stepper.querySelector('[aria-current="step"]');

    expect(stepper).toHaveClass('overflow-x-auto');
    expect(stepper.firstElementChild).toHaveClass('min-w-max');
    expect(stepper.firstElementChild).toHaveClass('justify-center');
    expect(currentStep).toHaveTextContent('1');
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'center',
    });
  });

  it('recovers a later current step without changing the current-step contract', () => {
    render(<StepIndicator steps={STEPS} currentStep={3} />);

    const currentStep = document.querySelector('[aria-current="step"]');

    expect(currentStep).toHaveTextContent('4');
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'center',
    });
  });
});
