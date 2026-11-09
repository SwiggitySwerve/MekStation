import { validatePreviewFreshness } from '../GmCascadePreviewFreshness';

describe('legacy time preview freshness', () => {
  const correction = {
    baseUpdatedAt: '2026-06-22T00:00:00.000Z',
    baseCurrentDate: '3025-02-02T00:00:00.000Z',
  };
  const preview = { domainPayload: { correction } };

  it('accepts an unchanged version and either Date or string dates', () => {
    for (const currentDate of [
      correction.baseCurrentDate,
      new Date(correction.baseCurrentDate),
    ]) {
      expect(
        validatePreviewFreshness(preview, {
          updatedAt: correction.baseUpdatedAt,
          currentDate,
        }),
      ).toBeUndefined();
    }
  });

  it('preserves version-first rejection and exact reasons', () => {
    expect(
      validatePreviewFreshness(preview, {
        updatedAt: 'changed',
        currentDate: '3025-02-03',
      }),
    ).toBe('Cannot approve GM cascade preview from a stale campaign version.');
    expect(
      validatePreviewFreshness(preview, {
        updatedAt: correction.baseUpdatedAt,
        currentDate: '3025-02-03',
      }),
    ).toBe('Cannot approve GM cascade preview from a stale campaign date.');
  });

  it.each([undefined, null, {}, { correction: null }, { correction: {} }])(
    'preserves acceptance without legacy correction fields: %p',
    (domainPayload) => {
      expect(validatePreviewFreshness({ domainPayload }, {})).toBeUndefined();
    },
  );

  it.each([{}, { updatedAt: 42, currentDate: 'invalid' }, null])(
    'preserves acceptance when current fields cannot be read: %p',
    (state) => {
      expect(validatePreviewFreshness(preview, state)).toBeUndefined();
    },
  );
});
