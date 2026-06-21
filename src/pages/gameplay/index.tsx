import Link from 'next/link';

import { getGameplayNavItems } from '@/components/common/gameplayNavItems';
import { PageLayout, Card } from '@/components/ui';

export default function GameplayHubPage(): React.ReactElement {
  const gameplayItems = getGameplayNavItems();

  return (
    <PageLayout
      title="Gameplay"
      subtitle="Start battles, manage forces, and continue campaign operations."
      maxWidth="wide"
    >
      <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
        {gameplayItems.map((item) => (
          <Link key={item.href} href={item.href} className="block h-full">
            <Card className="hover:border-accent/50 h-full transition-colors">
              <div className="mb-3 flex items-center gap-3">
                <div className="text-accent flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                  {item.icon}
                </div>
                <h2 className="text-text-theme-primary text-lg font-semibold">
                  {item.label}
                </h2>
              </div>
              <p className="text-text-theme-secondary text-sm leading-relaxed">
                {item.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
