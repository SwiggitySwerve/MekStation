import { Card, Badge } from '@/components/ui';
import { CampaignPreset, IPresetDefinition } from '@/types/campaign/CampaignPreset';

const PRESET_FEATURES: Record<CampaignPreset, readonly string[]> = {
  [CampaignPreset.CASUAL]: ['No Turnover', 'No Taxes', 'Fast Healing', 'No Maintenance'],
  [CampaignPreset.STANDARD]: ['Turnover', 'Salaries', 'Faction Standing', 'Random Events'],
  [CampaignPreset.FULL]: ['All Systems', 'Taxes', 'Acquisition', 'Food & Housing'],
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
          ? 'border-accent ring-2 ring-accent/30 bg-accent/5'
          : 'hover:border-accent/50 hover:bg-surface-raised/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl" role="img" aria-label={preset.name}>
          {preset.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-theme-primary text-lg">{preset.name}</h3>
          <p className="text-sm text-text-theme-secondary mt-1">{preset.description}</p>
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
