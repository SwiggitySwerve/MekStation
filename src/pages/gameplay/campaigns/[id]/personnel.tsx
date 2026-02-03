/**
 * Campaign Personnel Page
 * Manage personnel roster for the campaign.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  PageLayout,
  Card,
  EmptyState,
  Badge,
} from '@/components/ui';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus, STATUS_SEVERITY } from '@/types/campaign/enums';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { getBaseSalary } from '@/lib/campaign/personnel/roleSalaries';
import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import {
  getRolesByCategory,
  ALL_CAMPAIGN_PERSONNEL_ROLES,
} from '@/types/campaign/enums/CampaignPersonnelRole';

// =============================================================================
// Personnel Card Component
// =============================================================================

interface PersonnelCardProps {
  person: IPerson;
  onStatusChange?: (personId: string, newStatus: PersonnelStatus) => void;
  onRoleChange?: (personId: string, newRole: CampaignPersonnelRole) => void;
}

function PersonnelCard({ person, onStatusChange, onRoleChange }: PersonnelCardProps): React.ReactElement {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const getStatusColor = (status: PersonnelStatus): string => {
    const severity = STATUS_SEVERITY[status];
    switch (severity) {
      case 'positive':
        return 'bg-green-500/20 text-green-400';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'negative':
        return 'bg-red-500/20 text-red-400';
      case 'neutral':
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getMonthlySalary = (role: CampaignPersonnelRole): number => {
    return getBaseSalary(role);
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
         <div>
           <h3 className="font-semibold text-text-theme-primary text-lg">
             {person.name}
           </h3>
           <p className="text-sm text-text-theme-secondary">
             {person.rank}
           </p>
         </div>
         <div className="relative">
           <button
             onClick={() => setShowStatusMenu(!showStatusMenu)}
             className={`${getStatusColor(person.status)} px-3 py-1 rounded-full text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity`}
           >
             {person.status}
           </button>
           {showStatusMenu && (
             <div className="absolute right-0 mt-2 w-48 bg-surface-raised border border-border-theme rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
               {Object.values(PersonnelStatus).map((status) => (
                 <button
                   key={status}
                   onClick={() => {
                     onStatusChange?.(person.id, status);
                     setShowStatusMenu(false);
                   }}
                   className={`w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors ${
                     person.status === status ? 'bg-surface-hover font-semibold' : ''
                   }`}
                 >
                   {status}
                 </button>
               ))}
             </div>
           )}
         </div>
       </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
         <div className="relative">
           <p className="text-text-theme-secondary">Primary Role</p>
           <button
             onClick={() => setShowRoleMenu(!showRoleMenu)}
             className="text-text-theme-primary hover:text-text-theme-accent cursor-pointer transition-colors"
           >
             {person.primaryRole}
           </button>
           {showRoleMenu && (
             <div className="absolute left-0 mt-2 w-56 bg-surface-raised border border-border-theme rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
               {(['combat', 'support', 'civilian'] as const).map((category) => (
                 <div key={category}>
                   <div className="px-4 py-2 font-semibold text-text-theme-secondary text-xs uppercase bg-surface-hover sticky top-0">
                     {category}
                   </div>
                   {getRolesByCategory(category).map((role) => (
                     <button
                       key={role}
                       onClick={() => {
                         onRoleChange?.(person.id, role);
                         setShowRoleMenu(false);
                       }}
                       className={`w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors ${
                         person.primaryRole === role ? 'bg-surface-hover font-semibold' : ''
                       }`}
                     >
                       {role}
                     </button>
                   ))}
                 </div>
               ))}
             </div>
           )}
         </div>
         {person.secondaryRole && (
           <div>
             <p className="text-text-theme-secondary">Secondary Role</p>
             <p className="text-text-theme-primary">{person.secondaryRole}</p>
           </div>
         )}
         <div>
           <p className="text-text-theme-secondary">Hits</p>
           <p className="text-text-theme-primary">{person.hits}/6</p>
         </div>
         <div>
           <p className="text-text-theme-secondary">XP</p>
           <p className="text-text-theme-primary">{person.xp}</p>
         </div>
         <div>
           <p className="text-text-theme-secondary">Monthly Salary</p>
           <p className="text-text-theme-primary font-mono">
             {getMonthlySalary(person.primaryRole as CampaignPersonnelRole).toLocaleString()} C-bills
           </p>
         </div>
       </div>

      {person.unitId && (
        <div className="mt-3 pt-3 border-t border-border-theme">
          <p className="text-xs text-text-theme-secondary">Assigned to Unit</p>
          <p className="text-sm text-text-theme-primary font-mono">{person.unitId}</p>
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function PersonnelPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const [isClient, setIsClient] = useState(false);

  // Breadcrumbs
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Campaigns', href: '/gameplay/campaigns' },
    { label: campaign?.name || 'Campaign', href: `/gameplay/campaigns/${id}` },
    { label: 'Personnel' },
  ];

  // Hydration fix
  useState(() => {
    setIsClient(true);
  });

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <PageLayout
        title="Personnel"
        subtitle="Loading personnel..."
        maxWidth="wide"
      >
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-48">
                <div className="h-full" />
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  // Handle campaign not found
  if (!campaign) {
    return (
      <PageLayout
        title="Personnel"
        subtitle="Campaign not found"
        maxWidth="wide"
      >
        <EmptyState
          icon={
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-raised/50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-theme-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          }
          title="Campaign not found"
          message="Return to campaigns list to select a campaign."
        />
      </PageLayout>
    );
  }

  // Convert Map to array
  const personnel = Array.from(campaign.personnel.values());

  return (
    <PageLayout
      title="Personnel"
      subtitle={`${campaign.name} - ${personnel.length} personnel`}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      {/* Navigation Tabs */}
      <CampaignNavigation campaignId={campaign.id} currentPage="personnel" />

      {personnel.length === 0 ? (
        <EmptyState
          icon={
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-raised/50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-theme-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          }
          title="No personnel"
          message="This campaign has no personnel assigned yet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personnel.map((person) => (
            <PersonnelCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
