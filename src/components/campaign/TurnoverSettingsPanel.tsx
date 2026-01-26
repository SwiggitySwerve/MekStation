import React, { memo, useCallback } from 'react';
import { Card } from '@/components/ui';
import type { ICampaignOptions, TurnoverFrequency } from '@/types/campaign/Campaign';

interface TurnoverSettingsPanelProps {
  options: ICampaignOptions;
  onOptionsChange: (options: ICampaignOptions) => void;
}

const FREQUENCY_OPTIONS: { value: TurnoverFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'never', label: 'Never' },
];

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id: string;
}

const ToggleRow = memo(function ToggleRow({ label, checked, onChange, disabled, id }: ToggleRowProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center justify-between py-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <span className="text-sm text-text-theme-primary">{label}</span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-border-theme-subtle text-accent focus:ring-accent focus:ring-offset-0"
      />
    </label>
  );
});

interface NumberInputRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id: string;
}

const NumberInputRow = memo(function NumberInputRow({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  id,
}: NumberInputRowProps) {
  return (
    <div className={`flex items-center justify-between py-2 ${disabled ? 'opacity-50' : ''}`}>
      <label htmlFor={id} className="text-sm text-text-theme-primary">
        {label}
      </label>
      <input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-20 px-2 py-1 text-sm text-right rounded bg-surface-deep border border-border-theme-subtle text-text-theme-primary focus:border-accent focus:outline-none"
      />
    </div>
  );
});

export const TurnoverSettingsPanel = memo(function TurnoverSettingsPanel({
  options,
  onOptionsChange,
}: TurnoverSettingsPanelProps) {
  const updateOption = useCallback(
    <K extends keyof ICampaignOptions>(key: K, value: ICampaignOptions[K]) => {
      onOptionsChange({ ...options, [key]: value });
    },
    [options, onOptionsChange],
  );

  const turnoverDisabled = !options.useTurnover;

  return (
    <Card className="p-4" data-testid="turnover-settings-panel">
      <h3 className="text-base font-semibold text-text-theme-primary mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Turnover Settings
      </h3>

      <div className="divide-y divide-border-theme-subtle">
        <ToggleRow
          id="turnover-enabled"
          label="Enable Turnover System"
          checked={options.useTurnover}
          onChange={(checked) => updateOption('useTurnover', checked)}
        />

        <div className={`flex items-center justify-between py-2 ${turnoverDisabled ? 'opacity-50' : ''}`}>
          <label htmlFor="turnover-frequency" className="text-sm text-text-theme-primary">
            Check Frequency
          </label>
          <select
            id="turnover-frequency"
            value={options.turnoverCheckFrequency}
            onChange={(e) => updateOption('turnoverCheckFrequency', e.target.value as TurnoverFrequency)}
            disabled={turnoverDisabled}
            className="px-2 py-1 text-sm rounded bg-surface-deep border border-border-theme-subtle text-text-theme-primary focus:border-accent focus:outline-none"
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <NumberInputRow
          id="turnover-target"
          label="Base Target Number"
          value={options.turnoverFixedTargetNumber}
          onChange={(v) => updateOption('turnoverFixedTargetNumber', v)}
          min={1}
          max={12}
          disabled={turnoverDisabled}
        />

        <NumberInputRow
          id="turnover-payout"
          label="Payout Multiplier (× salary)"
          value={options.turnoverPayoutMultiplier}
          onChange={(v) => updateOption('turnoverPayoutMultiplier', v)}
          min={0}
          max={24}
          disabled={turnoverDisabled}
        />

        <ToggleRow
          id="turnover-commander-immune"
          label="Commander Immune"
          checked={options.turnoverCommanderImmune}
          onChange={(checked) => updateOption('turnoverCommanderImmune', checked)}
          disabled={turnoverDisabled}
        />

        <ToggleRow
          id="turnover-skill-modifiers"
          label="Use Skill Modifiers"
          checked={options.turnoverUseSkillModifiers}
          onChange={(checked) => updateOption('turnoverUseSkillModifiers', checked)}
          disabled={turnoverDisabled}
        />

        <ToggleRow
          id="turnover-age-modifiers"
          label="Use Age Modifiers"
          checked={options.turnoverUseAgeModifiers}
          onChange={(checked) => updateOption('turnoverUseAgeModifiers', checked)}
          disabled={turnoverDisabled}
        />

        <ToggleRow
          id="turnover-mission-modifiers"
          label="Use Mission Status Modifiers"
          checked={options.turnoverUseMissionStatusModifiers}
          onChange={(checked) => updateOption('turnoverUseMissionStatusModifiers', checked)}
          disabled={turnoverDisabled}
        />
      </div>
    </Card>
  );
});
