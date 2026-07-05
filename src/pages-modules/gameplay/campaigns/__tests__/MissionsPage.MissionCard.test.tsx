import { render, screen } from '@testing-library/react';

import { MissionCard } from '@/pages/gameplay/campaigns/[id]/missions';
import { MissionStatus } from '@/types/campaign/enums';
import { createContract } from '@/types/campaign/Mission';

function makeContract(status: MissionStatus) {
  return createContract({
    id: `mission-${status}`,
    name: `${status} Contract`,
    employerId: 'davion',
    targetId: 'liao',
    status,
  });
}

describe('MissionCard launch affordance', () => {
  it('renders a launch link for active missions', () => {
    render(
      <MissionCard
        campaignId="campaign-one"
        mission={makeContract(MissionStatus.ACTIVE)}
      />,
    );

    expect(screen.getByRole('link', { name: 'Launch' })).toHaveAttribute(
      'href',
      '/gameplay/campaigns/campaign-one/missions/mission-Active/launch',
    );
  });

  it('hides the launch link for non-launchable missions', () => {
    render(
      <MissionCard
        campaignId="campaign-one"
        mission={makeContract(MissionStatus.SUCCESS)}
      />,
    );

    expect(
      screen.queryByRole('link', { name: 'Launch' }),
    ).not.toBeInTheDocument();
  });
});
