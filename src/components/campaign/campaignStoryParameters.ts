const darkCampaignBackground = {
  default: 'dark',
  values: [{ name: 'dark', value: '#0f172a' }],
} as const;

export const paddedDarkCampaignStoryParameters = {
  layout: 'padded',
  backgrounds: darkCampaignBackground,
} as const;

export const centeredDarkCampaignStoryParameters = {
  layout: 'centered',
  backgrounds: darkCampaignBackground,
} as const;
