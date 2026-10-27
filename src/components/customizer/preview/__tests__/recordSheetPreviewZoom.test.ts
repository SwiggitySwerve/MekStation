import {
  computeFitPageZoom,
  computeZoomForMode,
  computeFitWidthZoom,
  RECORD_SHEET_PREVIEW_MAX_FIT_WIDTH,
  RECORD_SHEET_PREVIEW_VIEWPORT_PADDING,
} from '../recordSheetPreviewZoom';

const LETTER = { width: 612, height: 792 };

describe('computeFitWidthZoom', () => {
  it('fills the viewer width minus padding on ordinary viewers', () => {
    expect(computeFitWidthZoom(800, LETTER.width)).toBeCloseTo(
      (800 - RECORD_SHEET_PREVIEW_VIEWPORT_PADDING) / LETTER.width,
      3,
    );
  });

  it('caps the drawn sheet width on very wide viewers', () => {
    const zoom = computeFitWidthZoom(2400, LETTER.width);
    expect(zoom).toBeCloseTo(
      RECORD_SHEET_PREVIEW_MAX_FIT_WIDTH / LETTER.width,
      3,
    );
    expect((zoom ?? 0) * LETTER.width).toBeLessThanOrEqual(
      RECORD_SHEET_PREVIEW_MAX_FIT_WIDTH,
    );
  });

  it('returns null until the viewer has a measurable size', () => {
    expect(computeFitWidthZoom(0, LETTER.width)).toBeNull();
  });
});

describe('computeZoomForMode', () => {
  it('draws the sheet at actual size in 100% mode whatever the viewer', () => {
    expect(computeZoomForMode('actual', 390, 600, 612, 792)).toBe(1);
    expect(computeZoomForMode('actual', 2400, 1400, 612, 792)).toBe(1);
  });

  it('leaves manual zoom to the caller', () => {
    expect(computeZoomForMode('manual', 800, 900, 612, 792)).toBeNull();
  });

  it('caps fit width so the drawn sheet is at most 920px wide', () => {
    expect(RECORD_SHEET_PREVIEW_MAX_FIT_WIDTH).toBe(920);
  });
});

describe('computeFitPageZoom', () => {
  it('is limited by viewer height when the viewer is short', () => {
    const zoom = computeFitPageZoom(1200, 620, LETTER.width, LETTER.height);
    expect(zoom).toBeCloseTo(
      (620 - RECORD_SHEET_PREVIEW_VIEWPORT_PADDING) / LETTER.height,
      3,
    );
  });

  it('applies the same width cap as fit-width', () => {
    const zoom = computeFitPageZoom(2400, 4000, LETTER.width, LETTER.height);
    expect(zoom).toBeCloseTo(
      RECORD_SHEET_PREVIEW_MAX_FIT_WIDTH / LETTER.width,
      3,
    );
  });
});
