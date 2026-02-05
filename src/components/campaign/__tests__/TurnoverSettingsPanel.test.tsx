import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import type { ICampaignOptions } from '@/types/campaign/Campaign';

import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';

import { TurnoverSettingsPanel } from '../TurnoverSettingsPanel';

describe('TurnoverSettingsPanel', () => {
  const defaultOptions = createDefaultCampaignOptions();
  let onOptionsChange: jest.Mock;

  beforeEach(() => {
    onOptionsChange = jest.fn();
  });

  it('should render the settings panel', () => {
    render(
      <TurnoverSettingsPanel
        options={defaultOptions}
        onOptionsChange={onOptionsChange}
      />,
    );
    expect(screen.getByTestId('turnover-settings-panel')).toBeInTheDocument();
    expect(screen.getByText('Turnover Settings')).toBeInTheDocument();
  });

  it('should display enable toggle checked by default', () => {
    render(
      <TurnoverSettingsPanel
        options={defaultOptions}
        onOptionsChange={onOptionsChange}
      />,
    );
    const toggle = screen.getByLabelText(
      'Enable Turnover System',
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it('should call onOptionsChange when toggling turnover', () => {
    render(
      <TurnoverSettingsPanel
        options={defaultOptions}
        onOptionsChange={onOptionsChange}
      />,
    );
    const toggle = screen.getByLabelText('Enable Turnover System');
    fireEvent.click(toggle);
    expect(onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ useTurnover: false }),
    );
  });

  it('should display frequency dropdown with monthly selected', () => {
    render(
      <TurnoverSettingsPanel
        options={defaultOptions}
        onOptionsChange={onOptionsChange}
      />,
    );
    const select = screen.getByLabelText(
      'Check Frequency',
    ) as HTMLSelectElement;
    expect(select.value).toBe('monthly');
  });

  it('should call onOptionsChange when changing frequency', () => {
    render(
      <TurnoverSettingsPanel
        options={defaultOptions}
        onOptionsChange={onOptionsChange}
      />,
    );
    const select = screen.getByLabelText('Check Frequency');
    fireEvent.change(select, { target: { value: 'weekly' } });
    expect(onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ turnoverCheckFrequency: 'weekly' }),
    );
  });

  it('should display base target number input', () => {
    render(
      <TurnoverSettingsPanel
        options={defaultOptions}
        onOptionsChange={onOptionsChange}
      />,
    );
    const input = screen.getByLabelText(
      'Base Target Number',
    ) as HTMLInputElement;
    expect(input.value).toBe('3');
  });

  it('should call onOptionsChange when changing target number', () => {
    render(
      <TurnoverSettingsPanel
        options={defaultOptions}
        onOptionsChange={onOptionsChange}
      />,
    );
    const input = screen.getByLabelText('Base Target Number');
    fireEvent.change(input, { target: { value: '5' } });
    expect(onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ turnoverFixedTargetNumber: 5 }),
    );
  });

  it('should display commander immunity toggle', () => {
    render(
      <TurnoverSettingsPanel
        options={defaultOptions}
        onOptionsChange={onOptionsChange}
      />,
    );
    const toggle = screen.getByLabelText(
      'Commander Immune',
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it('should display modifier toggles', () => {
    render(
      <TurnoverSettingsPanel
        options={defaultOptions}
        onOptionsChange={onOptionsChange}
      />,
    );
    expect(screen.getByLabelText('Use Skill Modifiers')).toBeInTheDocument();
    expect(screen.getByLabelText('Use Age Modifiers')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Use Mission Status Modifiers'),
    ).toBeInTheDocument();
  });

  it('should disable controls when turnover is disabled', () => {
    const disabledOptions: ICampaignOptions = {
      ...defaultOptions,
      useTurnover: false,
    };
    render(
      <TurnoverSettingsPanel
        options={disabledOptions}
        onOptionsChange={onOptionsChange}
      />,
    );

    const frequency = screen.getByLabelText(
      'Check Frequency',
    ) as HTMLSelectElement;
    expect(frequency.disabled).toBe(true);

    const targetNumber = screen.getByLabelText(
      'Base Target Number',
    ) as HTMLInputElement;
    expect(targetNumber.disabled).toBe(true);

    const commanderImmune = screen.getByLabelText(
      'Commander Immune',
    ) as HTMLInputElement;
    expect(commanderImmune.disabled).toBe(true);
  });

  it('should display payout multiplier input', () => {
    render(
      <TurnoverSettingsPanel
        options={defaultOptions}
        onOptionsChange={onOptionsChange}
      />,
    );
    const input = screen.getByLabelText(
      /Payout Multiplier/,
    ) as HTMLInputElement;
    expect(input.value).toBe('12');
  });
});
