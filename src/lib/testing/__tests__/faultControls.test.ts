/**
 * Scoped, test-only fault controls (umbrella task 20.2).
 *
 * A fault-injection switch is a remote kill switch wearing a helpful
 * name, so each row here is one way it could leak: outside a test build,
 * into another run, into another session, into a second occurrence, or
 * into a production deploy's configuration.
 *
 * The environment is injected rather than assigned onto `process.env`,
 * so exercising the production path cannot disturb any other test
 * sharing this worker.
 */

import {
  armFaultControl,
  assertNoFaultControlsConfigured,
  consumeFaultControl,
  FAULT_CONTROL_ENV_VAR,
  FaultControlError,
  isFaultControlArmed,
  resetFaultControls,
} from '../faultControls';

const SCOPE = {
  seam: 'store.commit',
  runId: 'run-a',
  sessionId: 'session-1',
};

const TEST_ENV = { NODE_ENV: 'test' } as NodeJS.ProcessEnv;
const PROD_ENV = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;

beforeEach(() => {
  resetFaultControls();
});

afterEach(() => {
  resetFaultControls();
});

describe('fault control arming', () => {
  it('fires exactly once for the scope that armed it', () => {
    armFaultControl(SCOPE, TEST_ENV);

    expect(consumeFaultControl(SCOPE, TEST_ENV)).toBe(true);
    // One-shot. An armed-until-disarmed switch outlives the test that
    // armed it and then fails the next one for no visible reason.
    expect(consumeFaultControl(SCOPE, TEST_ENV)).toBe(false);
  });

  it('refuses to arm outside a test build, rather than no-opping', () => {
    // A silent no-op would let a fault test "pass" on a production build
    // having proven nothing at all.
    expect(() => armFaultControl(SCOPE, PROD_ENV)).toThrow(FaultControlError);
    expect(isFaultControlArmed(SCOPE)).toBe(false);
  });

  it('never fires outside a test build even if something armed it', () => {
    armFaultControl(SCOPE, TEST_ENV);

    expect(consumeFaultControl(SCOPE, PROD_ENV)).toBe(false);
    // Still armed, so the refusal is the ENV check rather than an
    // accidental consumption on the production path.
    expect(isFaultControlArmed(SCOPE)).toBe(true);
  });

  it.each([
    ['seam', { ...SCOPE, seam: '' }],
    ['runId', { ...SCOPE, runId: '' }],
    ['sessionId', { ...SCOPE, sessionId: '   ' }],
  ])('refuses a control missing its %s scope', (_field, scope) => {
    // A partially-scoped control looks armed, and its blast radius is
    // whatever the missing field would have narrowed.
    expect(() => armFaultControl(scope, TEST_ENV)).toThrow(/MISSING_SCOPE/);
  });
});

describe('fault control scoping', () => {
  it('does not fire for a different run', () => {
    armFaultControl(SCOPE, TEST_ENV);

    // Parallel Playwright runs share a process. One run arming a seam
    // must not trip another run that happens to reach it.
    expect(consumeFaultControl({ ...SCOPE, runId: 'run-b' }, TEST_ENV)).toBe(
      false,
    );
    expect(isFaultControlArmed(SCOPE)).toBe(true);
  });

  it('does not fire for a different session in the same run', () => {
    armFaultControl(SCOPE, TEST_ENV);

    // The control session is what proves a failure was CONTAINED rather
    // than global; a fault leaking into it destroys that proof.
    expect(
      consumeFaultControl({ ...SCOPE, sessionId: 'session-2' }, TEST_ENV),
    ).toBe(false);
    expect(isFaultControlArmed(SCOPE)).toBe(true);
  });

  it('does not fire for a different seam', () => {
    armFaultControl(SCOPE, TEST_ENV);

    expect(
      consumeFaultControl({ ...SCOPE, seam: 'outbox.insert' }, TEST_ENV),
    ).toBe(false);
    expect(isFaultControlArmed(SCOPE)).toBe(true);
  });

  it('keeps two armed seams independent', () => {
    armFaultControl(SCOPE, TEST_ENV);
    armFaultControl({ ...SCOPE, seam: 'outbox.insert' }, TEST_ENV);

    expect(consumeFaultControl(SCOPE, TEST_ENV)).toBe(true);
    // Consuming one must not disarm the other, or a two-fault test would
    // silently become a one-fault test.
    expect(isFaultControlArmed({ ...SCOPE, seam: 'outbox.insert' })).toBe(true);
  });
});

describe('production startup guard', () => {
  it('refuses to boot a production process carrying fault configuration', () => {
    // Not "boots and ignores it" - a process that ignores such config is
    // one refactor away from honouring it. Refusing to boot cannot rot.
    expect(() =>
      assertNoFaultControlsConfigured({
        NODE_ENV: 'production',
        [FAULT_CONTROL_ENV_VAR]: 'store.commit',
      } as NodeJS.ProcessEnv),
    ).toThrow(/FAULT_CONTROLS_IN_PRODUCTION/);
  });

  it('refuses a development process too, not only production', () => {
    // The guard is "not a test build", not "is production" - a dev
    // server carrying fault config is the same hazard.
    expect(() =>
      assertNoFaultControlsConfigured({
        NODE_ENV: 'development',
        [FAULT_CONTROL_ENV_VAR]: 'store.commit',
      } as NodeJS.ProcessEnv),
    ).toThrow(/FAULT_CONTROLS_IN_PRODUCTION/);
  });

  it('allows a test build to carry fault configuration', () => {
    expect(() =>
      assertNoFaultControlsConfigured({
        NODE_ENV: 'test',
        [FAULT_CONTROL_ENV_VAR]: 'store.commit',
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it.each([undefined, '', '   '])(
    'allows a production process with no fault configuration (%j)',
    (value) => {
      // The control: without this the guard could satisfy every row
      // above by refusing to boot unconditionally.
      expect(() =>
        assertNoFaultControlsConfigured({
          NODE_ENV: 'production',
          ...(value === undefined ? {} : { [FAULT_CONTROL_ENV_VAR]: value }),
        } as NodeJS.ProcessEnv),
      ).not.toThrow();
    },
  );
});
