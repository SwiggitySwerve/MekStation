import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MaintenanceSettingsPanel } from '../MaintenanceSettingsPanel';
import { createDefaultCampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignOptions } from '@/types/campaign/Campaign';

describe('MaintenanceSettingsPanel', () => {
  const defaultOptions = createDefaultCampaignOptions();
  let onOptionsChange: jest.Mock;

  beforeEach(() => {
    onOptionsChange = jest.fn();
  });

  it('should render the settings panel', () => {
    render(<MaintenanceSettingsPanel options={defaultOptions} onOptionsChange={onOptionsChange} />);
    expect(screen.getByTestId('maintenance-settings-panel')).toBeInTheDocument();
    expect(screen.getByText('Maintenance Settings')).toBeInTheDocument();
  });

  it('should display enable toggle checked by default', () => {
    render(<MaintenanceSettingsPanel options={defaultOptions} onOptionsChange={onOptionsChange} />);
    const toggle = screen.getByLabelText('Enable Maintenance System') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it('should call onOptionsChange when toggling maintenance', () => {
    render(<MaintenanceSettingsPanel options={defaultOptions} onOptionsChange={onOptionsChange} />);
    const toggle = screen.getByLabelText('Enable Maintenance System');
    fireEvent.click(toggle);
    expect(onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ payForMaintenance: false }),
    );
  });

  it('should display frequency dropdown with weekly selected', () => {
    render(<MaintenanceSettingsPanel options={defaultOptions} onOptionsChange={onOptionsChange} />);
    const select = screen.getByLabelText('Check Frequency') as HTMLSelectElement;
    expect(select.value).toBe('weekly');
  });

  it('should call onOptionsChange when changing frequency', () => {
    render(<MaintenanceSettingsPanel options={defaultOptions} onOptionsChange={onOptionsChange} />);
    const select = screen.getByLabelText('Check Frequency');
    fireEvent.change(select, { target: { value: 'monthly' } });
    expect(onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ maintenanceCheckFrequency: 'monthly' }),
    );
  });

  it('should display maintenance cycle days input', () => {
    render(<MaintenanceSettingsPanel options={defaultOptions} onOptionsChange={onOptionsChange} />);
    const input = screen.getByLabelText('Maintenance Cycle (days)') as HTMLInputElement;
    expect(input.value).toBe(String(defaultOptions.maintenanceCycleDays));
  });

  it('should call onOptionsChange when changing cycle days', () => {
    render(<MaintenanceSettingsPanel options={defaultOptions} onOptionsChange={onOptionsChange} />);
    const input = screen.getByLabelText('Maintenance Cycle (days)');
    fireEvent.change(input, { target: { value: '14' } });
    expect(onOptionsChange).toHaveBeenCalledWith(
      expect.objectContaining({ maintenanceCycleDays: 14 }),
    );
  });

  it('should display cost multiplier input', () => {
    render(<MaintenanceSettingsPanel options={defaultOptions} onOptionsChange={onOptionsChange} />);
    const input = screen.getByLabelText('Cost Multiplier') as HTMLInputElement;
    expect(input.value).toBe(String(defaultOptions.maintenanceCostMultiplier));
  });

  it('should disable controls when maintenance is disabled', () => {
    const disabledOptions: ICampaignOptions = { ...defaultOptions, payForMaintenance: false };
    render(<MaintenanceSettingsPanel options={disabledOptions} onOptionsChange={onOptionsChange} />);

    const frequency = screen.getByLabelText('Check Frequency') as HTMLSelectElement;
    expect(frequency.disabled).toBe(true);

    const cycleDays = screen.getByLabelText('Maintenance Cycle (days)') as HTMLInputElement;
    expect(cycleDays.disabled).toBe(true);

    const costMultiplier = screen.getByLabelText('Cost Multiplier') as HTMLInputElement;
    expect(costMultiplier.disabled).toBe(true);
  });
});
