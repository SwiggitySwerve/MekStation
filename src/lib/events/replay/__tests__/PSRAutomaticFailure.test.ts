import { GameEventType } from '@/types/gameplay';

import { createReplayBaselineDomainRegistry } from '../ReplayBaselineDomainRegistry';
import { assertReplayInputProvenance } from '../ReplayInputProvenanceManifest';

const details = {
  unitId: 'mek',
  roll: 0,
  modifiers: 0,
  passed: false,
  reason: 'Gyro hit',
};

describe('PSR resolved automatic failure contract', () => {
  const registry = createReplayBaselineDomainRegistry();

  it.each([
    { ...details, targetNumber: 5 },
    { ...details, automaticFailure: true },
  ])('accepts the explicit resolution without rewriting it: %j', (payload) => {
    expect(
      registry.upcast(GameEventType.PSRResolved, 1, payload).payload,
    ).toEqual(payload);
    expect(() =>
      assertReplayInputProvenance(GameEventType.PSRResolved, payload),
    ).not.toThrow();
  });

  it.each([
    details,
    { ...details, targetNumber: null },
    { ...details, targetNumber: Infinity },
    { ...details, targetNumber: NaN },
    { ...details, automaticFailure: false },
    { ...details, automaticFailure: true, targetNumber: 5 },
    { ...details, automaticFailure: true, targetNumber: null },
    { ...details, automaticFailure: true, passed: true },
    { ...details, automaticFailure: true, extra: 'unknown' },
  ])('rejects ambiguous or non-finite resolutions: %j', (payload) => {
    expect(() =>
      registry.upcast(GameEventType.PSRResolved, 1, payload),
    ).toThrow();
  });

  it('requires the finite target when automatic failure is absent', () => {
    expect(() =>
      assertReplayInputProvenance(GameEventType.PSRResolved, details),
    ).toThrow('targetNumber');
  });
});
