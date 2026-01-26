# UI Migration Guide - Backend Types Integration

## Current Status
- ✅ Imports updated in campaigns/index.tsx
- ⏳ Component body needs migration (47 TypeScript errors)
- ⏳ 4 more UI pages need complete implementation

## Step-by-Step Migration for campaigns/index.tsx

### Step 1: Remove Status Helper Functions ✅ NEXT
Delete or comment out `getStatusColor` and `getStatusLabel` functions (lines 24-59).
Our backend ICampaign doesn't have a status field yet.

### Step 2: Simplify CampaignCard Component
Replace lines 65-148 with simpler version:
```tsx
function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  return (
    <Card onClick={onClick} className="cursor-pointer hover:border-accent/50">
      <h3 className="font-semibold text-lg mb-2">{campaign.name}</h3>
      <p className="text-sm text-text-theme-secondary mb-3">
        Faction: {campaign.factionId}
      </p>
      <p className="text-sm text-text-theme-secondary mb-3">
        Date: {campaign.currentDate.toLocaleDateString()}
      </p>
      <div className="flex gap-4 text-sm">
        <span>{campaign.personnel.size} Personnel</span>
        <span>{campaign.forces.size} Forces</span>
        <span>{campaign.missions.size} Missions</span>
      </div>
    </Card>
  );
}
```

### Step 3: Update Main Component Store Usage
Replace lines 156-165:
```tsx
const store = useCampaignStore();
const campaigns = Array.from(store.campaigns?.values() || []);
```

### Step 4: Remove Search/Filter (Simplify for MVP)
Remove:
- searchQuery state and setSearchQuery
- statusFilter state and setStatusFilter  
- getFilteredCampaigns call
- Filter UI (lines 252-291)

Just show all campaigns.

### Step 5: Update Campaign Grid
Replace lines 326-337:
```tsx
{campaigns.map((campaign) => (
  <CampaignCard
    key={campaign.id}
    campaign={campaign}
    onClick={() => handleCampaignClick(campaign)}
  />
))}
```

### Step 6: Fix handleCampaignClick
Update to use store.setCurrentCampaignId:
```tsx
const handleCampaignClick = useCallback((campaign: ICampaign) => {
  store.setCurrentCampaignId(campaign.id);
  router.push(`/gameplay/campaigns/${campaign.id}`);
}, [router, store]);
```

## Remaining UI Pages

### 7.2: Personnel Page
Create `src/pages/gameplay/campaigns/[id]/personnel.tsx`:
- List personnel from `campaign.personnel` Map
- Show: name, role, skills, status
- Add/remove personnel buttons

### 7.3: Forces Page  
Create `src/pages/gameplay/campaigns/[id]/forces.tsx`:
- Tree view of forces from `campaign.forces` Map
- Show hierarchy using parentForceId
- Add/remove/reorganize forces

### 7.4: Mission Page
Create `src/pages/gameplay/campaigns/[id]/missions.tsx`:
- List missions from `campaign.missions` Map
- Show: name, type, status, payment
- Accept/complete mission actions

### 7.5: Dashboard
Create `src/pages/gameplay/campaigns/[id]/index.tsx`:
- Campaign overview
- Current date with "Advance Day" button
- Summary stats (personnel count, force count, etc.)
- Recent activity

## Estimated Effort
- campaigns/index.tsx completion: 2-3 hours
- Personnel page: 2-3 hours
- Forces page: 3-4 hours (tree view complexity)
- Mission page: 2-3 hours
- Dashboard: 2-3 hours
- **Total: 11-16 hours**

## Testing Strategy
1. TypeScript compilation (npm run typecheck)
2. Build success (npm run build)
3. Visual QA with Playwright
4. Create test campaign data
5. Verify all CRUD operations

