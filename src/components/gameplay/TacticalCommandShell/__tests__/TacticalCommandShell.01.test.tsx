import * as H from './TacticalCommandShell.test-helpers';

const {
  ShellSlot,
  TacticalCommandShell,
  act,
  render,
  renderHook,
  useShellSlotRegistryContext,
  useTacticalShell,
} = H;
describe('TacticalCommandShell', () => {
  it('provides registry + viewerPlayerId + shellMode via context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TacticalCommandShell viewerPlayerId="player-1" shellMode="combat">
        {children}
      </TacticalCommandShell>
    );

    const { result } = renderHook(() => useTacticalShell(), { wrapper });

    expect(result.current.viewerPlayerId).toBe('player-1');
    expect(result.current.shellMode).toBe('combat');
    expect(result.current.registry).toBeDefined();
    expect(typeof result.current.registry.register).toBe('function');
    expect(typeof result.current.registry.subscribe).toBe('function');
  });

  it('defaults shellMode to "combat" when not specified', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TacticalCommandShell viewerPlayerId="player-1">
        {children}
      </TacticalCommandShell>
    );

    const { result } = renderHook(() => useTacticalShell(), { wrapper });
    expect(result.current.shellMode).toBe('combat');
  });

  it('throws when useTacticalShell is called outside the shell', () => {
    // Suppress React error boundary noise for this expected throw.
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => renderHook(() => useTacticalShell())).toThrow(
      /must be called inside a <TacticalCommandShell>/,
    );

    consoleErrorSpy.mockRestore();
  });

  it('throws when useShellSlotRegistryContext is called outside the shell', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => renderHook(() => useShellSlotRegistryContext())).toThrow(
      /must be called inside a <TacticalCommandShell>/,
    );

    consoleErrorSpy.mockRestore();
  });

  it('renders no chrome of its own (children render directly)', () => {
    // The shell is a logical provider — it has no visible DOM. Children
    // render as if they were at the same level as <TacticalCommandShell>.
    const { container } = render(
      <TacticalCommandShell viewerPlayerId="player-1">
        <div data-testid="child" className="child-class">
          hello
        </div>
      </TacticalCommandShell>,
    );

    // The root rendered element is the child div itself — no wrapper.
    const child = container.querySelector('[data-testid="child"]');
    expect(child).not.toBeNull();
    expect(child?.parentElement).toBe(container);
    expect(child?.textContent).toBe('hello');
  });
});
