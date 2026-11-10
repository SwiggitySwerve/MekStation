import {
  CURRENT_LIFECYCLE_RULES_WRITER,
  LIFECYCLE_RULES_READER_MAX,
  LIFECYCLE_RULES_REQUEST_HEADER,
  MAX_SUPPORTED_LIFECYCLE_RULES_VERSION,
  SHIPPED_LIFECYCLE_READER,
  contractInertReason,
  isContractInert,
  parseLifecycleReaderHeader,
  readLifecycleReaderHeader,
  requiredLifecycleReaderVersion,
} from '../ContractLifecycleRules';

describe('contract lifecycle reader floor (S1b)', () => {
  it('keeps the reader below the processors that exist (answer 1)', () => {
    // Raised to 2 only by the slice that completes S2-S4; S7 cannot raise the
    // writer above it.
    expect(LIFECYCLE_RULES_READER_MAX).toBe(1);
    expect(SHIPPED_LIFECYCLE_READER).toBe(1);
    expect(CURRENT_LIFECYCLE_RULES_WRITER).toBeLessThanOrEqual(
      LIFECYCLE_RULES_READER_MAX,
    );
    expect(LIFECYCLE_RULES_READER_MAX).toBeLessThanOrEqual(
      MAX_SUPPORTED_LIFECYCLE_RULES_VERSION,
    );
    expect(LIFECYCLE_RULES_REQUEST_HEADER).toBe('X-MekStation-Lifecycle-Rules');
  });

  it.each([
    [undefined, 1, false],
    [null, 1, false],
    ['1', 1, true],
    ['2', 2, true],
    ['999999', 999999, true],
    // Malformed, repeated or out of range is the least capable reading.
    ['', 1, false],
    ['0', 1, false],
    ['01', 1, false],
    ['-1', 1, false],
    ['1.5', 1, false],
    ['2 ', 1, false],
    ['abc', 1, false],
    ['1000000', 1, false],
    ['2, 2', 1, false],
    [['2', '2'], 1, false],
  ])('reads header %p as level %p (declared %p)', (raw, level, declared) => {
    expect(parseLifecycleReaderHeader(raw)).toBe(level);
    expect(readLifecycleReaderHeader(raw)).toEqual({ level, declared });
  });

  it.each([
    [undefined, 1],
    [1, 1],
    [2, 2],
    [17, 17],
    [0, null],
    [-1, null],
    [1.5, null],
    [null, null],
    ['2', null],
    [Number.NaN, null],
    [Number.MAX_SAFE_INTEGER + 2, null],
  ])('requires reader level for stored version %p', (version, required) => {
    expect(requiredLifecycleReaderVersion(version)).toBe(required);
  });

  it('judges a contract inert against the reader, never the validator', () => {
    // 2 is valid for the validator (MAX_SUPPORTED) but no processor exists yet.
    expect(MAX_SUPPORTED_LIFECYCLE_RULES_VERSION).toBe(2);
    expect(isContractInert({ lifecycleRulesVersion: 2 })).toBe(true);
    expect(contractInertReason({ lifecycleRulesVersion: 2 })).toBe(
      'newer-rules',
    );
    expect(isContractInert({ lifecycleRulesVersion: 3 })).toBe(true);
    for (const legacy of [undefined, 1]) {
      expect(isContractInert({ lifecycleRulesVersion: legacy })).toBe(false);
      expect(contractInertReason({ lifecycleRulesVersion: legacy })).toBeNull();
    }
    expect(isContractInert({})).toBe(false);
    for (const bad of [0, -1, 1.5, null, '2']) {
      expect(isContractInert({ lifecycleRulesVersion: bad })).toBe(true);
      expect(contractInertReason({ lifecycleRulesVersion: bad })).toBe(
        'unreadable',
      );
    }
  });
});
