import { invokeHComposition } from './support/camp01-h-composition.fixture';

function expectFailure(
  request: Parameters<typeof invokeHComposition>[0],
  message: string,
): void {
  expect(invokeHComposition(request)).toMatchObject({
    ok: false,
    error: expect.stringContaining(message),
  });
}

describe('CAMP-01H composed receipt identity binding', () => {
  it('composes a reviewed-head observation through the real writer', () => {
    expect(invokeHComposition({ action: 'observation' })).toMatchObject({
      ok: true,
      commandCount: 6,
      value: {
        mode: 'reviewed-head',
        phase: 'observation',
        artifacts: 21,
        reports: 6,
        witnesses: 3,
        captures: 2,
      },
    });
  });

  it('composes the exact-main final from its reviewed-head receipt', () => {
    expect(invokeHComposition({ action: 'final' })).toMatchObject({
      ok: true,
      commandCount: 12,
      value: {
        mode: 'exact-main',
        phase: 'final',
        artifacts: 21,
        reports: 6,
        witnesses: 3,
        captures: 2,
      },
    });
  });

  it('reopens the exact-main final through the production directory validator', () => {
    expect(invokeHComposition({ action: 'reopen' })).toMatchObject({
      ok: true,
      commandCount: 12,
      value: { phase: 'final', reopened: true },
    });
  });

  it('accepts the exact-main final through the public validator CLI', () => {
    expect(invokeHComposition({ action: 'public-validator' })).toMatchObject({
      ok: true,
      commandCount: 12,
      value: {
        phase: 'final',
        publicStatus: 0,
        publicStdout: 'CAMP01 receipt valid\n',
        publicStderr: '',
      },
    });
  });

  it.each([
    ['final reconciliation', 'phase-final-reconciliation'],
    ['final witness', 'phase-final-witness'],
    ['observation reconciliation', 'phase-observation-reconciliation'],
  ])('rejects %s H phase drift', (_name, mutation) => {
    expectFailure({ action: 'mutate', mutation }, 'H phase drift');
  });

  it.each([0, 1, 2, 3])(
    'rejects report %i witness digest drift',
    (reportIndex) => {
      expectFailure(
        { action: 'mutate', mutation: `report-digest-${reportIndex}` },
        'H report witness drift',
      );
    },
  );

  it.each(['witnessId', 'executionId', 'contextId'])(
    'pins the independently derived H %s identity',
    (role) => {
      expect(invokeHComposition({ action: 'identity', role })).toMatchObject({
        ok: true,
        commandCount: 6,
        value: { matched: true, role },
      });
    },
  );

  it('rejects session identity reuse', () => {
    expectFailure(
      { action: 'mutate', mutation: 'session-identity-reuse' },
      'session identity reuse',
    );
  });

  it('rejects an extra witness report digest', () => {
    expectFailure(
      { action: 'mutate', mutation: 'report-digest-set' },
      'H report digest set drift',
    );
  });

  it('rejects an unknown H reporter before cross-artifact lookup', () => {
    expectFailure(
      { action: 'mutate', mutation: 'unknown-reporter' },
      'reporter identity drift',
    );
  });

  it.each(['inventory-invocation', 'inventory-observation'])(
    'rejects %s H observation inventory drift',
    (mutation) => {
      expectFailure(
        { action: 'bindings', mutation },
        'H observation inventory drift',
      );
    },
  );

  it.each(['source-command', 'source-reconciliation'])(
    'rejects %s H source set drift',
    (mutation) => {
      expectFailure({ action: 'bindings', mutation }, 'H source set drift');
    },
  );

  it.each(['registry-missing', 'registry-source'])(
    'rejects %s H observed identity registry drift',
    (mutation) => {
      expectFailure(
        { action: 'mutate', mutation },
        'H observed identity registry drift',
      );
    },
  );
});
