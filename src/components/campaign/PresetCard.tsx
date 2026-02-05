import { Card, Badge } from '@/components/ui';
import {
  CampaignPreset,
  IPresetDefinition,
} from '@/types/campaign/CampaignPreset';

const PRESET_FEATURES: Record<CampaignPreset, readonly string[]> = {
  [CampaignPreset.CASUAL]: [
    'No Turnover',
    'No Taxes',
    'Fast Healing',
    'No Maintenance',
  ],
  [CampaignPreset.STANDARD]: [
    'Turnover',
    'Salaries',
    'Faction Standing',
    'Random Events',
  ],
  [CampaignPreset.FULL]: [
    'All Systems',
    'Taxes',
    'Acquisition',
    'Food & Housing',
  ],
  [CampaignPreset.CUSTOM]: ['Manual Config', 'Default Values'],
};

interface PresetCardProps {
  preset: IPresetDefinition;
  selected: boolean;
  onSelect: () => void;
}

export function PresetCard({
  preset,
  selected,
  onSelect,
}: PresetCardProps): React.ReactElement {
  const features = PRESET_FEATURES[preset.id] ?? [];

  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected
          ? 'border-accent ring-accent/30 bg-accent/5 ring-2'
          : 'hover:border-accent/50 hover:bg-surface-raised/50'
      }`}
      onClick={onSelect}
    >
      <div className="mb-3 flex items-start gap-3">
        <span className="text-2xl" role="img" aria-label={preset.name}>
          {preset.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-text-theme-primary text-lg font-semibold">
            {preset.name}
          </h3>
          <p className="text-text-theme-secondary mt-1 text-sm">
            {preset.description}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {features.map((feature) => (
          <Badge key={feature} variant="info">
            {feature}
          </Badge>
        ))}
      </div>
    </Card>
  );
}
