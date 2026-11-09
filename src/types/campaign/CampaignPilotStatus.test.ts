import { CampaignPilotStatus } from './CampaignPilotStatus';

it('pins the persisted terminal departure status strings', () => {
  expect(CampaignPilotStatus.Retired).toBe('retired');
  expect(CampaignPilotStatus.Deserted).toBe('deserted');
});
