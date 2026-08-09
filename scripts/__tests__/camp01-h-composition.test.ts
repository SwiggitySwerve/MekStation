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

  it('rejects source-command H source set drift', () => {
    expectFailure(
      { action: 'bindings', mutation: 'source-command' },
      'H source set drift',
    );
  });

  it('rejects composed source-reconciliation H source set drift', () => {
    expectFailure(
      { action: 'mutate', mutation: 'source-reconciliation' },
      'H source set drift',
    );
  });

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

describe('CAMP-01H authority repair loop', () => {
  it.each([
    'authority-source-witness-digest',
    'authority-fact-saved-design',
    'authority-fact-campaign',
    'authority-fact-post-battle',
  ])('rejects %s H authority drift', (mutation) => {
    expectFailure({ action: 'mutate', mutation }, 'H authority drift');
  });

  it.each([
    'before-save',
    'readiness',
    'session',
    'command',
    'terminal',
    'post-battle',
  ] as const)('sources the %s partial observation repair', (stage) => {
    expect(
      invokeHComposition({ action: 'repair', phase: 'observation', stage }),
    ).toMatchObject({
      ok: true,
      commandCount: 6,
      value: {
        stage,
        mode: 'reviewed-head',
        phase: 'observation',
        sourceBound: true,
        disposition: 'repair-required',
        factState: 'unavailable',
        reportStatus: 'failed',
      },
    });
  });

  it.each([
    'before-save',
    'readiness',
    'session',
    'command',
    'terminal',
    'post-battle',
  ] as const)('passes the fresh complete %s final', (stage) => {
    expect(
      invokeHComposition({ action: 'repair', phase: 'final', stage }),
    ).toMatchObject({
      ok: true,
      commandCount: 12,
      value: {
        stage,
        mode: 'exact-main',
        phase: 'final',
        sourceBound: true,
        disposition: 'verified-repair',
        factState: 'complete',
        reportStatus: 'passed',
      },
    });
  });

  it.each([
    [0, 'fact version drift'],
    [1, 'fact source drift'],
    [2, 'fact boolean drift'],
  ])(
    'rejects unavailable facts from final witness %i',
    (witnessIndex, message) => {
      expectFailure(
        {
          action: 'mutate',
          mutation: 'unavailable-final-' + witnessIndex,
        },
        message,
      );
    },
  );

  it('requires every final authority evidence list', () => {
    expectFailure(
      { action: 'mutate', mutation: 'final-evidence-empty' },
      'final authority evidence missing',
    );
  });

  it.each([
    [
      'observation repair fingerprint',
      'observation-stage-before-save-repair-fingerprint',
    ],
    [
      'observation repair first id',
      'observation-stage-before-save-repair-first-id',
    ],
    [
      'final repair observation',
      'final-stage-before-save-repair-observation-missing',
    ],
    ['observation repair cause', 'observation-stage-before-save-repair-cause'],
  ])('rejects %s H repair source drift', (_name, mutation) => {
    expectFailure({ action: 'mutate', mutation }, 'H repair source drift');
  });

  it.each([
    [
      'backlog rank',
      'observation-stage-before-save-backlog-rank',
      'H reconciliation drift',
    ],
    [
      'ranked finding ids',
      'observation-stage-before-save-ranked-findings',
      'H reconciliation drift',
    ],
    [
      'critical-major dispositions',
      'observation-stage-before-save-critical-dispositions',
      'H disposition reconciliation drift',
    ],
  ])('rejects %s reconciliation drift', (_name, mutation, message) => {
    expectFailure({ action: 'mutate', mutation }, message);
  });

  it.each([
    ['category', 'observation-stage-before-save-finding-category'],
    ['severity', 'observation-stage-before-save-finding-severity'],
    ['backlog rank floor', 'observation-stage-before-save-finding-rank'],
    ['dimension value', 'observation-stage-before-save-finding-dimension'],
    ['cause fingerprint', 'observation-stage-before-save-finding-cause'],
  ])('rejects finding identity drift for %s', (_name, mutation) => {
    expectFailure({ action: 'mutate', mutation }, 'finding identity drift');
  });
});
