import React, { memo, useCallback } from 'react';
import { Card } from '@/components/ui';
import type { ICampaignOptions, MaintenanceFrequency } from '@/types/campaign/Campaign';

interface MaintenanceSettingsPanelProps {
  options: ICampaignOptions;
  onOptionsChange: (options: ICampaignOptions) => void;
}

const FREQUENCY_OPTIONS: { value: MaintenanceFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'never', label: 'Never' },
];

export const MaintenanceSettingsPanel = memo(function MaintenanceSettingsPanel({
  options,
  onOptionsChange,
}: MaintenanceSettingsPanelProps) {
  const updateOption = useCallback(
    <K extends keyof ICampaignOptions>(key: K, value: ICampaignOptions[K]) => {
      onOptionsChange({ ...options, [key]: value });
    },
    [options, onOptionsChange],
  );

  const maintenanceDisabled = !options.payForMaintenance;

  return (
    <Card className="p-4" data-testid="maintenance-settings-panel">
      <h3 className="text-base font-semibold text-text-theme-primary mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Maintenance Settings
      </h3>

      <div className="divide-y divide-border-theme-subtle">
        <label
          htmlFor="maintenance-enabled"
          className={`flex items-center justify-between py-2 cursor-pointer`}
        >
          <span className="text-sm text-text-theme-primary">Enable Maintenance System</span>
          <input
            id="maintenance-enabled"
            type="checkbox"
            checked={options.payForMaintenance}
            onChange={(e) => updateOption('payForMaintenance', e.target.checked)}
            className="w-4 h-4 rounded border-border-theme-subtle text-accent focus:ring-accent focus:ring-offset-0"
          />
        </label>

        <div className={`flex items-center justify-between py-2 ${maintenanceDisabled ? 'opacity-50' : ''}`}>
          <label htmlFor="maintenance-frequency" className="text-sm text-text-theme-primary">
            Check Frequency
          </label>
          <select
            id="maintenance-frequency"
            value={options.maintenanceCheckFrequency}
            onChange={(e) => updateOption('maintenanceCheckFrequency', e.target.value as MaintenanceFrequency)}
            disabled={maintenanceDisabled}
            className="px-2 py-1 text-sm rounded bg-surface-deep border border-border-theme-subtle text-text-theme-primary focus:border-accent focus:outline-none"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={`flex items-center justify-between py-2 ${maintenanceDisabled ? 'opacity-50' : ''}`}>
          <label htmlFor="maintenance-cycle-days" className="text-sm text-text-theme-primary">
            Maintenance Cycle (days)
          </label>
          <input
            id="maintenance-cycle-days"
            type="number"
            value={options.maintenanceCycleDays}
            onChange={(e) => updateOption('maintenanceCycleDays', Number(e.target.value))}
            min={1}
            max={365}
            disabled={maintenanceDisabled}
            className="w-20 px-2 py-1 text-sm text-right rounded bg-surface-deep border border-border-theme-subtle text-text-theme-primary focus:border-accent focus:outline-none"
          />
        </div>

        <div className={`flex items-center justify-between py-2 ${maintenanceDisabled ? 'opacity-50' : ''}`}>
          <label htmlFor="maintenance-cost-multiplier" className="text-sm text-text-theme-primary">
            Cost Multiplier
          </label>
          <input
            id="maintenance-cost-multiplier"
            type="number"
            value={options.maintenanceCostMultiplier}
            onChange={(e) => updateOption('maintenanceCostMultiplier', Number(e.target.value))}
            min={0}
            max={10}
            step={0.1}
            disabled={maintenanceDisabled}
            className="w-20 px-2 py-1 text-sm text-right rounded bg-surface-deep border border-border-theme-subtle text-text-theme-primary focus:border-accent focus:outline-none"
          />
        </div>
      </div>
    </Card>
  );
});
