import {
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HotkeyHelpOverlay } from '@/components/gameplay/help/HotkeyHelpOverlay';
import { TacticalActionDock } from '@/components/gameplay/TacticalActionDock';
import { Button } from '@/components/ui/Button';
import { DialogTemplate } from '@/components/ui/DialogTemplate';
import { GamePhase } from '@/types/gameplay';

import type { CameraControls } from '../useCameraControls';

import { useGameplayHotkeys } from '../useGameplayHotkeys';

function makeCamera(): CameraControls {
  return {
    zoom: 1,
    pan: { x: 0, y: 0 },
    panBy: jest.fn(),
    panByHex: jest.fn(),
    zoomTo: jest.fn(),
    zoomIn: jest.fn(),
    zoomOut: jest.fn(),
    centerOn: jest.fn(),
    prefersReducedMotion: false,
  };
}

function renderHotkeys(
  overrides: Partial<Parameters<typeof useGameplayHotkeys>[0]> = {},
) {
  const camera = makeCamera();
  const callbacks = {
    onToggleMinimap: jest.fn(),
    onToggleArcs: jest.fn(),
    onToggleLOS: jest.fn(),
    onToggleHelp: jest.fn(),
    onEscape: jest.fn(),
  };

  renderHook(() =>
    useGameplayHotkeys({
      camera,
      selectedUnitHex: { q: 2, r: -1 },
      modalOpen: false,
      ...callbacks,
      ...overrides,
    }),
  );

  return { camera, callbacks };
}

describe('useGameplayHotkeys', () => {
  it('leaves Escape and Tab ownership with the real tactical dialog', async () => {
    const { camera, callbacks } = renderHotkeys();
    const onAction = jest.fn();
    render(
      <TacticalActionDock
        ctx={{
          activeUnitId: 'unit-a',
          selectedUnitId: 'unit-a',
          targetUnitId: null,
          hoveredHex: null,
          phase: GamePhase.WeaponAttack,
          canAct: true,
        }}
        shellMode="combat"
        onAction={onAction}
      />,
    );
    const user = userEvent.setup();
    const trigger = screen.getByTestId('command-btn-heat-end.end-phase');
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'End Phase?' });
    const close = within(dialog).getByRole('button', { name: 'Close dialog' });
    const confirm = within(dialog).getByRole('button', {
      name: 'Confirm End Phase',
    });
    confirm.focus();

    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirm);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
    expect(onAction).not.toHaveBeenCalled();
    expect(callbacks.onEscape).not.toHaveBeenCalled();
    expect(callbacks.onToggleHelp).not.toHaveBeenCalled();
    expect(camera.centerOn).not.toHaveBeenCalled();
  });

  it('suppresses camera and overlay/help shortcuts while a real app dialog is rendered', async () => {
    const { camera, callbacks } = renderHotkeys();
    render(
      <DialogTemplate isOpen title="End Phase?" onClose={jest.fn()}>
        Continue to the next phase?
      </DialogTemplate>,
    );
    screen.getByRole('button', { name: 'Close dialog' }).focus();

    await userEvent.setup().keyboard('wAMl?{ArrowUp}+-');
    // The modal guard also owns events whose target is the window, rather than a
    // dialog child (for example a document-level shortcut activation).
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: '?' });

    expect(camera.panByHex).not.toHaveBeenCalled();
    expect(camera.zoomIn).not.toHaveBeenCalled();
    expect(camera.zoomOut).not.toHaveBeenCalled();
    expect(camera.centerOn).not.toHaveBeenCalled();
    for (const callback of Object.values(callbacks))
      expect(callback).not.toHaveBeenCalled();
  });

  it('restores ordinary shortcuts after the real app dialog closes', () => {
    const { camera, callbacks } = renderHotkeys();
    const { rerender } = render(
      <DialogTemplate isOpen title="End Phase?" onClose={jest.fn()}>
        Continue to the next phase?
      </DialogTemplate>,
    );
    fireEvent.keyDown(window, { key: 'w' });
    expect(camera.panByHex).not.toHaveBeenCalled();

    rerender(
      <DialogTemplate isOpen={false} title="End Phase?" onClose={jest.fn()}>
        Continue to the next phase?
      </DialogTemplate>,
    );
    fireEvent.keyDown(window, { key: 'w' });
    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: '?' });

    expect(camera.panByHex).toHaveBeenCalledTimes(1);
    expect(camera.panByHex).toHaveBeenCalledWith('up');
    expect(camera.centerOn).toHaveBeenCalledTimes(1);
    expect(callbacks.onToggleHelp).toHaveBeenCalledTimes(1);
  });

  it('preserves Escape/help exceptions and button Space on the actual shortcuts help overlay', async () => {
    const { camera, callbacks } = renderHotkeys({ modalOpen: true });
    const onClose = jest.fn();
    render(<HotkeyHelpOverlay open onClose={onClose} />);
    screen.getByRole('button', { name: 'Close shortcuts help' }).focus();

    await userEvent.setup().keyboard('?{Escape} ');

    expect(callbacks.onToggleHelp).toHaveBeenCalledTimes(1);
    expect(callbacks.onEscape).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(camera.centerOn).not.toHaveBeenCalled();
  });
  it.each(['Confirm End Phase', 'Cancel'])(
    'Space activates %s in the actual tactical dialog',
    async (label) => {
      const { camera, callbacks } = renderHotkeys();
      const onAction = jest.fn();
      render(
        <TacticalActionDock
          ctx={{
            activeUnitId: 'unit-a',
            selectedUnitId: 'unit-a',
            targetUnitId: null,
            hoveredHex: null,
            phase: GamePhase.WeaponAttack,
            canAct: true,
          }}
          shellMode="combat"
          onAction={onAction}
        />,
      );
      const user = userEvent.setup();
      await user.click(screen.getByTestId('command-btn-heat-end.end-phase'));
      screen.getByRole('button', { name: label }).focus();

      await user.keyboard(' ');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(camera.centerOn).not.toHaveBeenCalled();
      expect(callbacks.onEscape).not.toHaveBeenCalled();
      expect(callbacks.onToggleHelp).not.toHaveBeenCalled();
      expect(onAction).toHaveBeenCalledTimes(label === 'Cancel' ? 0 : 1);
      if (label !== 'Cancel')
        expect(onAction).toHaveBeenCalledWith('lock', { endPhase: true });
    },
  );
  it('permits Space to activate a focused real dialog button without recentering', async () => {
    const { camera } = renderHotkeys();
    const confirm = jest.fn();
    render(
      <DialogTemplate
        isOpen
        title="End Phase?"
        onClose={jest.fn()}
        footer={<Button onClick={confirm}>Confirm End Phase</Button>}
      >
        Continue to the next phase?
      </DialogTemplate>,
    );
    screen.getByRole('button', { name: 'Confirm End Phase' }).focus();

    await userEvent.setup().keyboard(' ');

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(camera.centerOn).not.toHaveBeenCalled();
  });
  it('keeps lowercase a as pan-left and uppercase A as firing-arcs toggle', () => {
    const { camera, callbacks } = renderHotkeys();

    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'A' });

    expect(camera.panByHex).toHaveBeenCalledWith('left');
    expect(camera.panByHex).toHaveBeenCalledTimes(1);
    expect(callbacks.onToggleArcs).toHaveBeenCalledTimes(1);
  });

  it('suppresses gameplay keys while modalOpen but still handles Escape and help', () => {
    const { camera, callbacks } = renderHotkeys({ modalOpen: true });

    fireEvent.keyDown(window, { key: 'm' });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: '?' });

    expect(callbacks.onToggleMinimap).not.toHaveBeenCalled();
    expect(camera.panByHex).not.toHaveBeenCalled();
    expect(callbacks.onEscape).toHaveBeenCalledTimes(1);
    expect(callbacks.onToggleHelp).toHaveBeenCalledTimes(1);
  });

  it('does not steal keystrokes from form controls', () => {
    const { camera, callbacks } = renderHotkeys();
    const input = document.createElement('input');
    document.body.appendChild(input);

    fireEvent.keyDown(input, { key: 'A' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    expect(callbacks.onToggleArcs).not.toHaveBeenCalled();
    expect(camera.panByHex).not.toHaveBeenCalled();

    input.remove();
  });

  it('recenters on Space only when a selected unit hex exists', () => {
    const { camera } = renderHotkeys({ selectedUnitHex: { q: 3, r: 4 } });

    fireEvent.keyDown(window, { key: ' ' });

    expect(camera.centerOn).toHaveBeenCalledWith({ q: 3, r: 4 });
  });
});
