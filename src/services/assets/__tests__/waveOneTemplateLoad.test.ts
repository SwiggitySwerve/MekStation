/**
 * Wave-1 Non-Mech Template Load Proof
 *
 * Phase-0 infra gate (task 0.3): proves that the Wave-1 non-mech
 * canonical record-sheet templates registered in
 * `config/mm-data-assets.json` resolve through `MmDataAssetService`'s
 * three-source fallback chain (local → jsDelivr CDN → GitHub raw)
 * BEFORE any renderer code exists.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/mm-data-asset-integration/spec.md
 *   (Requirement: Non-Mech Wave-1 Template Registration)
 */

// Mock fetch before importing the service.
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { getMmDataAssetService } from '../MmDataAssetService';
import { AssetLoadError } from '../MmDataAssetService';

/** The 10 Wave-1 non-mech templates registered in Phase 0. */
const WAVE_1_TEMPLATES = [
  'vehicle_noturret_standard.svg',
  'vehicle_turret_standard.svg',
  'vehicle_dualturret_standard.svg',
  'vtol_noturret_standard.svg',
  'vtol_turret_standard.svg',
  'fighter_aerospace_default.svg',
  'fighter_conventional_default.svg',
  'protomek_biped.svg',
  'protomek_quad.svg',
  'protomek_glider.svg',
] as const;

describe('Wave-1 non-mech template load proof', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getMmDataAssetService().clearCache();
    mockFetch.mockReset();
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 404 }),
    );
  });

  it('resolves a vehicle template from the local bundled path', async () => {
    const svg = '<svg id="rs_template"><g id="armorPips"/></svg>';
    mockFetch.mockImplementation((url: string) => {
      if (url === '/record-sheets/templates_us/vehicle_turret_standard.svg') {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(svg),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await getMmDataAssetService().loadSVG(
      '/record-sheets/templates_us/vehicle_turret_standard.svg',
    );

    expect(result).toBe(svg);
    expect(result.length).toBeGreaterThan(0);
    // First source attempted is the local bundled path.
    expect(mockFetch).toHaveBeenCalledWith(
      '/record-sheets/templates_us/vehicle_turret_standard.svg',
    );
  });

  it('falls back to the jsDelivr CDN when the local asset is missing', async () => {
    const svg = '<svg id="rs_template">from cdn</svg>';
    // Local 404, CDN succeeds — simulates a missing local file.
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('cdn.jsdelivr.net')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(svg),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await getMmDataAssetService().loadSVG(
      '/record-sheets/templates_us/vehicle_turret_standard.svg',
    );

    expect(result).toBe(svg);
  });

  it('falls back to GitHub raw when local and CDN both fail', async () => {
    const svg = '<svg id="rs_template">from github</svg>';
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('raw.githubusercontent.com')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(svg),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const result = await getMmDataAssetService().loadSVG(
      '/record-sheets/templates_us/vehicle_turret_standard.svg',
    );

    expect(result).toBe(svg);
  });

  it('throws AssetLoadError when all three sources fail', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    await expect(
      getMmDataAssetService().loadSVG(
        '/record-sheets/templates_us/vehicle_turret_standard.svg',
      ),
    ).rejects.toThrow(AssetLoadError);
  });

  it.each(WAVE_1_TEMPLATES)(
    'resolves Wave-1 template %s through the fallback chain',
    async (template) => {
      const svg = `<svg id="rs_template" data-template="${template}"/>`;
      const usPath = `/record-sheets/templates_us/${template}`;
      mockFetch.mockImplementation((url: string) => {
        if (url === usPath) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(svg),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const result = await getMmDataAssetService().loadSVG(usPath);
      expect(result).toBe(svg);
    },
  );
});
