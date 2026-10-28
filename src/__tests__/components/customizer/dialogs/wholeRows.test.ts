import { wholeRowsHeight } from '@/components/customizer/dialogs/wholeRows';

describe('wholeRowsHeight', () => {
  it('ends the list on the last row that fits whole', () => {
    // Five 66px rows in 300px: four fit (264px), the fifth would be cut.
    expect(wholeRowsHeight([66, 132, 198, 264, 330], 300)).toBe(264);
  });

  it('keeps the full height when the rows end exactly on it', () => {
    expect(wholeRowsHeight([100, 200, 300], 300)).toBe(300);
  });

  it('keeps the full height when the list is shorter than the space', () => {
    expect(wholeRowsHeight([66, 132], 300)).toBe(132);
  });

  it('falls back to the available height when not even one row fits', () => {
    expect(wholeRowsHeight([80], 60)).toBe(60);
    expect(wholeRowsHeight([], 60)).toBe(60);
  });

  it('stops reading rows once one no longer fits', () => {
    const read: number[] = [];
    function* bottoms() {
      for (const bottom of [50, 100, 150, 200]) {
        read.push(bottom);
        yield bottom;
      }
    }
    expect(wholeRowsHeight(bottoms(), 120)).toBe(100);
    expect(read).toEqual([50, 100, 150]);
  });
});
