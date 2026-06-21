import { hexDistance, pixelToHex } from '@/constants/hexMap';
import { hexDistance as canonicalHexDistance } from '@/utils/gameplay/hexMath';

describe('hex map coordinate helpers', () => {
  it('cube-rounds pixel picking near hex boundaries', () => {
    const result = pixelToHex(36, 62.353829072479584);

    expect(result).toEqual({ q: 1, r: 0 });
  });

  it('keeps the four-number distance shim equivalent to canonical axial math', () => {
    const corpus = [
      [
        { q: 0, r: 0 },
        { q: 3, r: -2 },
      ],
      [
        { q: -4, r: 3 },
        { q: 2, r: -1 },
      ],
      [
        { q: 5, r: 5 },
        { q: -2, r: 1 },
      ],
    ] as const;

    for (const [a, b] of corpus) {
      expect(hexDistance(a.q, a.r, b.q, b.r)).toBe(canonicalHexDistance(a, b));
    }
  });
});
