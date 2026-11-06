/** Deterministic transport for plain computed rows, including invalid numeric results. */
import type { IComputedRow } from './unit-bv-parity';

const PREFIX = '\0';
const HOLE = Symbol('array hole');

export function encodeComputedRows(rows: readonly IComputedRow[]): Buffer {
  return Buffer.from(
    JSON.stringify(rows, function (this: unknown, key: string, value: unknown) {
      if (value === undefined)
        return (
          PREFIX +
          (Array.isArray(this) && !Object.hasOwn(this, key) ? 'h' : 'u')
        );
      if (typeof value === 'number') {
        if (Number.isNaN(value)) return PREFIX + 'n';
        if (value === Infinity) return PREFIX + '+';
        if (value === -Infinity) return PREFIX + '-';
        if (Object.is(value, -0)) return PREFIX + 'z';
      }
      if (typeof value === 'string' && value.startsWith(PREFIX))
        return PREFIX + value;
      if (['bigint', 'function', 'symbol'].includes(typeof value))
        throw new Error('Unsupported computed value');
      return value;
    }),
    'utf8',
  );
}

export function decodeComputedRows(bytes: Buffer): unknown {
  const decode = (value: unknown): unknown => {
    if (typeof value === 'string' && value.startsWith(PREFIX)) {
      if (value.startsWith(PREFIX + PREFIX)) return value.slice(1);
      switch (value) {
        case PREFIX + 'u':
          return undefined;
        case PREFIX + 'n':
          return NaN;
        case PREFIX + '+':
          return Infinity;
        case PREFIX + '-':
          return -Infinity;
        case PREFIX + 'z':
          return -0;
        case PREFIX + 'h':
          return HOLE;
        default:
          throw new Error('Invalid computed value tag');
      }
    }
    if (Array.isArray(value)) {
      value.forEach((entry: unknown, index: number) => {
        const decoded = decode(entry);
        if (decoded === HOLE) delete value[index];
        else value[index] = decoded;
      });
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, entry] of Object.entries(value)) {
        const decoded = decode(entry);
        if (decoded === HOLE) throw new Error('Invalid computed object hole');
        (value as Record<string, unknown>)[key] = decoded;
      }
    }
    return value;
  };
  return decode(JSON.parse(bytes.toString('utf8')) as unknown);
}
