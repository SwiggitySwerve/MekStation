/**
 * Campaign Navigation Tabs
 * Shared navigation component for campaign detail pages.
 */
import Link from 'next/link';

interface CampaignNavigationProps {
  campaignId: string;
  currentPage: 'dashboard' | 'personnel' | 'forces' | 'missions';
}

export function CampaignNavigation({ campaignId, currentPage }: CampaignNavigationProps): React.ReactElement {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', href: `/gameplay/campaigns/${campaignId}` },
    { id: 'personnel', label: 'Personnel', href: `/gameplay/campaigns/${campaignId}/personnel` },
    { id: 'forces', label: 'Forces', href: `/gameplay/campaigns/${campaignId}/forces` },
    { id: 'missions', label: 'Missions', href: `/gameplay/campaigns/${campaignId}/missions` },
  ] as const;

  return (
    <div className="border-b border-border-theme mb-6">
      <nav className="flex gap-1" role="navigation" aria-label="Campaign sections">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`px-4 py-3 font-medium transition-colors ${
              currentPage === tab.id
                ? 'text-accent border-b-2 border-accent'
                : 'text-text-theme-secondary hover:text-text-theme-primary'
            }`}
            aria-current={currentPage === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
