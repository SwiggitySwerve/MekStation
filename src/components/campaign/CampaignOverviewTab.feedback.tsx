import type { ReactElement } from 'react';

import { Card } from '@/components/ui';

export interface CampaignValidationSummary {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface CampaignErrorBannerProps {
  error: string | null;
}

interface CampaignValidationCardProps {
  validation: CampaignValidationSummary | null;
}

interface ValidationListProps {
  items: string[];
  markerClassName: string;
  textClassName: string;
}

function ValidationList({
  items,
  markerClassName,
  textClassName,
}: ValidationListProps): ReactElement {
  return (
    <ul className="space-y-1">
      {items.map((item, index) => (
        <li
          key={index}
          className={`flex items-start gap-2 text-sm ${textClassName}`}
        >
          <span className={`mt-0.5 ${markerClassName}`}>
            {'\u00e2\u20ac\u00a2'}
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function CampaignErrorBanner({
  error,
}: CampaignErrorBannerProps): ReactElement | null {
  if (!error) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
      <p className="text-sm text-red-400">{error}</p>
    </div>
  );
}

export function CampaignValidationCard({
  validation,
}: CampaignValidationCardProps): ReactElement | null {
  if (!validation || (validation.valid && validation.warnings.length === 0)) {
    return null;
  }

  return (
    <Card className="mb-6 border-yellow-600/30 bg-yellow-900/10">
      {validation.errors.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-red-400">
            Configuration Required
          </h3>
          <ValidationList
            items={validation.errors}
            markerClassName="text-red-400"
            textClassName="text-red-300"
          />
        </div>
      )}
      {validation.warnings.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-yellow-400">Warnings</h3>
          <ValidationList
            items={validation.warnings}
            markerClassName="text-yellow-400"
            textClassName="text-yellow-300"
          />
        </div>
      )}
    </Card>
  );
}
