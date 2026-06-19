import React from 'react';

import { Card } from '@/components/ui';

interface CampaignListCardProps {
  readonly testId: string;
  readonly left: React.ReactNode;
  readonly right: React.ReactNode;
  readonly align?: 'center' | 'start';
}

export function CampaignListCard({
  testId,
  left,
  right,
  align = 'center',
}: CampaignListCardProps): React.ReactElement {
  const rowClass =
    align === 'start'
      ? 'flex items-start justify-between gap-4'
      : 'flex items-center justify-between gap-4';

  return (
    <Card className="p-4" data-testid={testId}>
      <div className={rowClass}>
        <div className="min-w-0">{left}</div>
        {right}
      </div>
    </Card>
  );
}
