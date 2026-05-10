import Link from 'next/link';
import React from 'react';

import { Card, PageLayout } from '@/components/ui';

interface PreBattleLoadingProps {
  backLink: string;
}

export function PreBattleLoading({
  backLink,
}: PreBattleLoadingProps): React.ReactElement {
  return (
    <PageLayout
      title="Loading..."
      backLink={backLink}
      backLabel="Back to Encounter"
    >
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-text-theme-muted">Loading encounter data...</p>
        </div>
      </div>
    </PageLayout>
  );
}

export function PreBattleNotFound(): React.ReactElement {
  return (
    <PageLayout
      title="Encounter Not Found"
      backLink="/gameplay/encounters"
      backLabel="Back to Encounters"
    >
      <Card>
        <p className="text-text-theme-secondary">
          The requested encounter could not be found.
        </p>
        <Link
          href="/gameplay/encounters"
          className="text-accent mt-4 inline-block hover:underline"
        >
          Return to Encounters
        </Link>
      </Card>
    </PageLayout>
  );
}
