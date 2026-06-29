import Head from 'next/head';
import Link from 'next/link';

import { Card, PageLayout } from '@/components/ui';

export default function NotFoundPage(): React.ReactElement {
  return (
    <>
      <Head>
        <title>Page Not Found | MekStation</title>
      </Head>

      <PageLayout
        title="Page Not Found"
        subtitle="This route does not exist or has moved."
        backLink="/"
        backLabel="Return Home"
      >
        <Card
          variant="dark"
          className="mx-auto max-w-2xl"
          data-testid="global-not-found-recovery"
        >
          <p className="text-text-theme-secondary mb-6">
            Use the dashboard to get back to your unit library, campaign work,
            combat tools, or replay history without losing your place in the
            app.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="bg-accent-hover hover:bg-accent text-text-theme-primary inline-flex min-h-[44px] items-center justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/gameplay"
              className="bg-surface-raised hover:bg-border-theme border-border-theme inline-flex min-h-[44px] items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium text-slate-300 transition-colors"
            >
              Open Gameplay
            </Link>
            <Link
              href="/replay-library"
              className="bg-surface-raised hover:bg-border-theme border-border-theme inline-flex min-h-[44px] items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium text-slate-300 transition-colors"
            >
              Open Replay Library
            </Link>
          </div>
        </Card>
      </PageLayout>
    </>
  );
}
