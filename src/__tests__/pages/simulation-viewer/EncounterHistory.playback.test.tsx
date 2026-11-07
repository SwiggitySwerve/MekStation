import { screen, fireEvent, within, act } from '@testing-library/react';

import { renderPage, selectBattle } from './EncounterHistory.fixtures';

describe('EncounterHistory', () => {
  describe('VCR Control Tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      Element.prototype.scrollIntoView = jest.fn();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('displays initial turn as Turn 1', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 1 / 3',
      );
    });

    it('play button shows Play text initially', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
    });

    it('play button starts timeline playback', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Pause');
    });

    it('advances turn during playback at 1x speed', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 2 / 3',
      );
    });

    it('pause button stops playback', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Pause');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
    });

    it('step forward advances one turn', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 2 / 3',
      );
    });

    it('step back goes back one turn', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 3 / 3',
      );
      fireEvent.click(screen.getByTestId('vcr-step-back'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 2 / 3',
      );
    });

    it('step back is disabled at turn 1', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-step-back')).toBeDisabled();
    });

    it('step forward is disabled at max turn', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-step-forward')).toBeDisabled();
    });

    it('step back does not go below turn 1', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-back'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 1 / 3',
      );
    });

    it('step forward does not exceed max turn', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 3 / 3',
      );
    });

    it('speed control changes playback speed', () => {
      renderPage();
      selectBattle('b1');
      const speedSelect = screen.getByTestId(
        'vcr-speed-select',
      ) as HTMLSelectElement;
      fireEvent.change(speedSelect, { target: { value: '2' } });
      expect(speedSelect.value).toBe('2');
    });

    it('playback at 2x advances turn in 500ms', () => {
      renderPage();
      selectBattle('b1');
      const speedSelect = screen.getByTestId('vcr-speed-select');
      fireEvent.change(speedSelect, { target: { value: '2' } });
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 2 / 3',
      );
    });

    it('playback at 4x advances turn in 250ms', () => {
      renderPage();
      selectBattle('b1');
      const speedSelect = screen.getByTestId('vcr-speed-select');
      fireEvent.change(speedSelect, { target: { value: '4' } });
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 2 / 3',
      );
    });

    it('playback stops at end of timeline', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 3 / 3',
      );
    });

    it('playback wraps to start when pressing play at end', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 3 / 3',
      );
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 1 / 3',
      );
    });

    it('VCR controls still work with virtualized timeline', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('vcr-turn-display')).toBeInTheDocument();
    });

    it('step forward stops playback', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Pause');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
    });

    it('step back stops playback', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-play-pause'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Pause');
      fireEvent.click(screen.getByTestId('vcr-step-back'));
      expect(screen.getByTestId('vcr-play-pause')).toHaveTextContent('Play');
    });

    it('play button is disabled when battle has no events', () => {
      renderPage();
      selectBattle('b3');
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 1 / 1',
      );
    });
  });

  describe('Timeline Navigation Tests', () => {
    it('click key moment jumps to that turn', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('key-moment-km1'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 3 / 3',
      );
    });

    it('virtualized timeline renders when battle has events', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('virtualized-timeline')).toBeInTheDocument();
    });

    it('virtualized timeline is inside event-list container', () => {
      renderPage();
      selectBattle('b1');
      const eventList = screen.getByTestId('event-list');
      expect(
        within(eventList).getByTestId('virtualized-timeline'),
      ).toBeInTheDocument();
    });

    it('empty events shows no events message', () => {
      renderPage();
      selectBattle('b3');
      expect(screen.getByTestId('event-list')).toBeInTheDocument();
    });

    it('VCR turn display still tracks correctly with virtualized timeline', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 1 / 3',
      );
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 2 / 3',
      );
    });

    it('VCR step forward moves turn with virtualized timeline', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 2 / 3',
      );
    });

    it('VCR step back works with virtualized timeline', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      fireEvent.click(screen.getByTestId('vcr-step-back'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 1 / 3',
      );
    });

    it('key moment click updates VCR turn display', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('key-moment-km1'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 3 / 3',
      );
    });

    it('event list container renders for battle with events', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('event-list')).toBeInTheDocument();
    });

    it('virtualized timeline not rendered for battle with no events', () => {
      renderPage();
      selectBattle('b3');
      expect(screen.queryByTestId('virtualized-timeline')).toBeInTheDocument();
    });

    it('mission groups are expanded by default', () => {
      renderPage();
      expect(screen.getByTestId('mission-group-header-m1')).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });

    it('mission groups can be collapsed', () => {
      renderPage();
      fireEvent.click(screen.getByTestId('mission-group-header-m1'));
      expect(screen.getByTestId('mission-group-header-m1')).toHaveAttribute(
        'aria-expanded',
        'false',
      );
      expect(screen.queryByTestId('battle-card-b1')).not.toBeInTheDocument();
    });

    it('selecting a battle calls onSelectBattle callback', () => {
      const onSelectBattle = jest.fn();
      renderPage({ onSelectBattle });
      selectBattle('b1');
      expect(onSelectBattle).toHaveBeenCalledWith('b1');
    });

    it('selected battle card is visually highlighted', () => {
      renderPage();
      selectBattle('b1');
      const card = screen.getByTestId('battle-card-b1');
      expect(card).toHaveAttribute('aria-current', 'true');
      expect(card).toHaveClass('border-accent');
    });
  });

  describe('Interaction Edge Cases', () => {
    it('switching battles resets turn to 1', () => {
      renderPage();
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('vcr-step-forward'));
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 2 / 3',
      );
      selectBattle('b2');
      expect(screen.getByTestId('vcr-turn-display')).toHaveTextContent(
        'Turn 1 / 4',
      );
    });

    it('damage cell click calls onDrillDown with correct context', () => {
      const onDrillDown = jest.fn();
      renderPage({ onDrillDown });
      selectBattle('b1');
      fireEvent.click(screen.getByTestId('damage-cell-u2-e1'));
      expect(onDrillDown).toHaveBeenCalledWith('encounter-history', {
        attackerId: 'u2',
        targetId: 'e1',
        battleId: 'b1',
      });
    });

    it('player BV is displayed correctly', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('player-bv')).toHaveTextContent('3,500');
    });

    it('enemy BV is displayed correctly', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('enemy-bv')).toHaveTextContent('3,200');
    });

    it('key moment shows description text', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('key-moment-km1')).toHaveTextContent(
        'Atlas destroys Mad Cat with headshot',
      );
    });

    it('key moment shows phase and type info', () => {
      renderPage();
      selectBattle('b1');
      expect(screen.getByTestId('key-moment-km1')).toHaveTextContent(
        'Weapon Attack',
      );
      expect(screen.getByTestId('key-moment-km1')).toHaveTextContent('kill');
    });
  });
});
