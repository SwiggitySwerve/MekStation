/**
 * Canvas rendering utilities for SVG record sheets
 * Handles high-DPI rendering for preview and PDF export
 */

/**
 * Render SVG to canvas with high-DPI support for sharp text (preview use)
 * @param svgString Serialized SVG string
 * @param canvas Target canvas element
 * @param dpiMultiplier Resolution multiplier (e.g., 3 for 216 DPI PDF, 4 for preview)
 */
export async function renderToCanvasHighDPI(
  svgString: string,
  canvas: HTMLCanvasElement,
  dpiMultiplier: number
): Promise<void> {
  const img = new Image();

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const baseWidth = 612;
      const baseHeight = 792;

      // Set canvas internal resolution based on DPI multiplier
      canvas.width = baseWidth * dpiMultiplier;
      canvas.height = baseHeight * dpiMultiplier;

      // Scale context to match DPI multiplier
      ctx.scale(dpiMultiplier, dpiMultiplier);

      // Enable high-quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, baseWidth, baseHeight);

      // Calculate scale to fit SVG (576x756) into canvas (612x792)
      const scale = Math.min(baseWidth / 576, baseHeight / 756);
      const offsetX = (baseWidth - 576 * scale) / 2;
      const offsetY = (baseHeight - 756 * scale) / 2;

      ctx.drawImage(img, offsetX, offsetY, 576 * scale, 756 * scale);

      resolve();
    };

    img.onerror = () => reject(new Error('Failed to load SVG image'));

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    img.src = URL.createObjectURL(svgBlob);
  });
}
