import { act, cleanup, render, screen } from '@testing-library/react';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

import { CampaignNavigation } from '../CampaignNavigation';
import { CampaignSaveIndicator } from '../CampaignSaveIndicator';

const campaign = buildPopulatedCampaign();

describe('CampaignSaveIndicator in shared campaign navigation', () => {
  beforeEach(() => {
    useCampaignPersistenceStore.getState().reset();
    useCampaignPersistenceStore.setState({ campaignId: campaign.id });
  });

  afterEach(() => {
    cleanup();
    useCampaignPersistenceStore.getState().reset();
  });

  it.each([
    [{ saveState: 'idle', dirty: true }, 'Unsaved changes'],
    [{ saveState: 'saved', dirty: true }, 'Unsaved changes'],
    [
      { saveState: 'idle', dirty: true, recoveredPendingWrite: true },
      'Recovered unsaved changes',
    ],
    [
      { saveState: 'error', dirty: true, errorMessage: 'offline' },
      'Save failed',
    ],
    [{ saveState: 'saving', dirty: true }, 'Saving…'],
    [{ saveState: 'conflict', dirty: true }, 'Conflict'],
  ] as const)(
    'shows %s as %s with an accessible dashboard link',
    (patch, label) => {
      useCampaignPersistenceStore.setState({ ...patch });
      render(<CampaignSaveIndicator campaignId={campaign.id} />);
      const region = screen.getByRole('status', {
        name: 'Campaign save status',
      });
      expect(region).toHaveAttribute('aria-live', 'polite');
      expect(region).toHaveAttribute('aria-atomic', 'true');
      expect(region).toHaveTextContent(label);
      expect(
        screen.getByRole('link', {
          name: new RegExp(`Campaign save: ${label}`),
        }),
      ).toHaveAttribute(
        'href',
        `/gameplay/campaigns/${campaign.id}#campaign-save-status`,
      );
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    },
  );

  it.each(['saved', 'idle'] as const)(
    'stays quiet when clean and %s',
    (saveState) => {
      useCampaignPersistenceStore.setState(
        saveState === 'saved'
          ? { saveState: 'saved', dirty: false }
          : { saveState: 'idle', dirty: false },
      );
      render(<CampaignSaveIndicator campaignId={campaign.id} />);
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    },
  );

  it('does not show another campaign’s persistence status', () => {
    useCampaignPersistenceStore.setState({
      campaignId: 'another',
      dirty: true,
    });
    render(<CampaignSaveIndicator campaignId={campaign.id} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('renders the conflict and unsent edits in missions navigation, updating as the user edits', () => {
    useCampaignPersistenceStore.setState({
      saveState: 'conflict',
      dirty: true,
      conflictServerRecord: buildSerializedCampaign(campaign, 'device', 9),
      saveConflict: {
        reason: 'local-edits-predate-server',
        recoveryAction: 'resync-to-active-head',
        conflictingFields: [],
        currentVersion: 9,
        localBaseVersion: 7,
      },
    });
    render(
      <CampaignNavigation campaignId={campaign.id} currentPage="missions" />,
    );
    expect(screen.getByRole('link', { name: 'Missions' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Conflict');
    expect(screen.getByRole('status')).toHaveTextContent('Changes unsent');
    act(() => useCampaignPersistenceStore.getState().markDirty());
    expect(
      screen.getByRole('link', {
        name: /Campaign save: Conflict.*local and unsent/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(useCampaignPersistenceStore.getState()).toMatchObject({
      saveState: 'conflict',
      dirty: true,
    });
  });

  it('announces a new pending state after a clean render', () => {
    useCampaignPersistenceStore.setState({ saveState: 'saved', dirty: false });
    render(<CampaignSaveIndicator campaignId={campaign.id} />);
    const region = screen.getByRole('status');
    act(() =>
      useCampaignPersistenceStore.setState({ saveState: 'idle', dirty: true }),
    );
    expect(region).toHaveTextContent('Unsaved changes');
  });
});
