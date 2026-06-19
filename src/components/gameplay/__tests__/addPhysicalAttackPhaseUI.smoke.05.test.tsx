import * as H from './addPhysicalAttackPhaseUI.smoke.test-helpers';

const {
  ActuatorType,
  EMPTY_DAMAGE,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  PhysicalAttackForecastModal,
  PhysicalAttackTypePicker,
  React,
  buildAttackInput,
  fireEvent,
  render,
  screen,
  usePhysicalAttackPlanStore,
  withActuator,
} = H;

type IComponentDamageState = H.IComponentDamageState;
type IGameSession = H.IGameSession;
type IINarcPodState = H.IINarcPodState;
type IPhysicalAttackDeclaredPayload = H.IPhysicalAttackDeclaredPayload;
type IPhysicalAttackInput = H.IPhysicalAttackInput;
type InteractiveSession = H.InteractiveSession;
type PhysicalAttackType = H.PhysicalAttackType;
describe('PhysicalAttackIntentArrow', () => {
  // Inline require so the module isn't hoisted above the jest.mock calls
  // earlier in the file (Zustand + catalog mocks).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {
    PhysicalAttackIntentArrow,
  } = require('@/components/gameplay/overlays/PhysicalAttackIntentArrow');

  it('renders the charge variant arrow', () => {
    render(
      <svg>
        <PhysicalAttackIntentArrow
          from={{ q: 0, r: 0 }}
          to={{ q: 1, r: 0 }}
          variant="charge"
          side={GameSide.Player}
        />
      </svg>,
    );
    expect(screen.getByTestId('intent-arrow-charge')).toBeInTheDocument();
  });

  it('renders the DFA variant arrow (dashed arc)', () => {
    render(
      <svg>
        <PhysicalAttackIntentArrow
          from={{ q: 0, r: 0 }}
          to={{ q: 1, r: 0 }}
          variant="dfa"
          side={GameSide.Player}
        />
      </svg>,
    );
    expect(screen.getByTestId('intent-arrow-dfa')).toBeInTheDocument();
  });

  it('renders the push ghost-hex with invalid marker when flagged', () => {
    render(
      <svg>
        <PhysicalAttackIntentArrow
          from={{ q: 0, r: 0 }}
          to={{ q: 1, r: 0 }}
          variant="push"
          pushDestination={{ q: 2, r: 0 }}
          pushDestinationValid={false}
        />
      </svg>,
    );
    expect(screen.getByTestId('intent-arrow-push')).toBeInTheDocument();
    expect(screen.getByTestId('intent-arrow-push-invalid')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Task 10.6: Accessibility — simulated-deuteranopia distinguishes variants
  // -------------------------------------------------------------------------
  //
  // We can't run a real color-transform in jsdom, but the spec (task 9.1 +
  // scenario "DFA intent arrow is dashed arc") requires each variant to
  // carry a SHAPE signal in addition to hue — so a deuteranopia user who
  // loses the red/green channel still distinguishes charge (solid line)
  // from DFA (dashed arc) from push (dashed polygon + optional "X"
  // overlay). The deuteranopia guarantee reduces to: the three SVG
  // subtrees use structurally different shape primitives + dash patterns.
  //
  // This snapshot locks in those structural differences. If a future
  // refactor collapses them into a single shape with only color-based
  // differentiation, the snapshot diffs will catch it immediately.
  describe('deuteranopia: shape carries the variant signal', () => {
    it('charge renders a solid <line> with no strokeDasharray', () => {
      const { container } = render(
        <svg data-testid="charge-svg">
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="charge"
            side={GameSide.Player}
          />
        </svg>,
      );
      const line = container.querySelector('line');
      expect(line).not.toBeNull();
      // Charge MUST be solid — no dash pattern.
      expect(line?.getAttribute('stroke-dasharray')).toBeNull();
      // And MUST NOT render an arc <path> (would collide with DFA).
      expect(container.querySelector('path[stroke-dasharray]')).toBeNull();
      expect(container.firstChild).toMatchSnapshot('charge-shape');
    });

    it('DFA renders a dashed <path> arc — distinguishable by shape', () => {
      const { container } = render(
        <svg data-testid="dfa-svg">
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="dfa"
            side={GameSide.Player}
          />
        </svg>,
      );
      const arc = container.querySelector('path[stroke-dasharray]');
      expect(arc).not.toBeNull();
      // Dash pattern MUST be present — this is the shape-carried signal
      // that survives a red/green channel loss.
      expect(arc?.getAttribute('stroke-dasharray')).toMatch(/\d+,\d+/);
      // Path must contain a quadratic control ("Q") — the arc lift.
      expect(arc?.getAttribute('d')).toMatch(/Q/);
      expect(container.firstChild).toMatchSnapshot('dfa-shape');
    });

    it('push renders a dashed polygon (not a line/arc)', () => {
      const { container } = render(
        <svg data-testid="push-svg">
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="push"
            pushDestination={{ q: 2, r: 0 }}
            pushDestinationValid={true}
          />
        </svg>,
      );
      const polygon = container.querySelector('polygon');
      expect(polygon).not.toBeNull();
      expect(polygon?.getAttribute('stroke-dasharray')).toMatch(/\d+,\d+/);
      // Must NOT also render a line / arc (would confuse with the other
      // two variants under deuteranopia).
      expect(container.querySelector('line')).toBeNull();
      expect(container.querySelector('path[stroke-dasharray]')).toBeNull();
      expect(container.firstChild).toMatchSnapshot('push-shape');
    });

    it('three variants render structurally distinct SVG subtrees', () => {
      // End-to-end sanity: render all three, extract their shape
      // fingerprints, and assert each is unique. Covers the spec
      // scenario "DFA intent arrow is dashed arc — distinguishable
      // from charge under simulated deuteranopia" end-to-end.
      const { container: chargeC } = render(
        <svg>
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="charge"
            side={GameSide.Player}
          />
        </svg>,
      );
      const { container: dfaC } = render(
        <svg>
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="dfa"
            side={GameSide.Player}
          />
        </svg>,
      );
      const { container: pushC } = render(
        <svg>
          <PhysicalAttackIntentArrow
            from={{ q: 0, r: 0 }}
            to={{ q: 1, r: 0 }}
            variant="push"
            pushDestination={{ q: 2, r: 0 }}
          />
        </svg>,
      );

      function shapeFingerprint(c: HTMLElement): string {
        // Canonical shape signature: primitive tag + dash pattern. Hue
        // is intentionally excluded so the fingerprint survives the
        // deuteranopia channel loss.
        const parts: string[] = [];
        c.querySelectorAll('line,path,polygon').forEach((el) => {
          parts.push(
            `${el.tagName.toLowerCase()}:${el.getAttribute('stroke-dasharray') ?? 'solid'}`,
          );
        });
        return parts.join('|');
      }

      const chargeFp = shapeFingerprint(chargeC);
      const dfaFp = shapeFingerprint(dfaC);
      const pushFp = shapeFingerprint(pushC);

      expect(chargeFp).not.toBe(dfaFp);
      expect(dfaFp).not.toBe(pushFp);
      expect(chargeFp).not.toBe(pushFp);
    });
  });
});
