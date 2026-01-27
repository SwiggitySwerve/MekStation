import { Card } from '@/components/ui';
import {
  CampaignType,
  CAMPAIGN_TYPE_DISPLAY,
  CAMPAIGN_TYPE_DESCRIPTIONS,
} from '@/types/campaign/CampaignType';

const TYPE_ICONS: Record<CampaignType, string> = {
  [CampaignType.MERCENARY]: '\u2694\uFE0F',
  [CampaignType.HOUSE_COMMAND]: '\uD83C\uDFF0',
  [CampaignType.CLAN]: '\uD83D\uDC3A',
  [CampaignType.PIRATE]: '\u2620\uFE0F',
  [CampaignType.COMSTAR]: '\u2B50',
};

interface CampaignTypeCardProps {
  type: CampaignType;
  selected: boolean;
  onSelect: () => void;
}

export function CampaignTypeCard({
  type,
  selected,
  onSelect,
}: CampaignTypeCardProps): React.ReactElement {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected
          ? 'border-accent ring-2 ring-accent/30 bg-accent/5'
          : 'hover:border-accent/50 hover:bg-surface-raised/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" role="img" aria-label={CAMPAIGN_TYPE_DISPLAY[type]}>
          {TYPE_ICONS[type]}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-theme-primary text-lg">
            {CAMPAIGN_TYPE_DISPLAY[type]}
          </h3>
          <p className="text-sm text-text-theme-secondary mt-1">
            {CAMPAIGN_TYPE_DESCRIPTIONS[type]}
          </p>
        </div>
      </div>
    </Card>
  );
}
