/**
 * Per-change smoke test for add-skirmish-setup-ui.
 *
 * Asserts the MapConfigEditor surfaces radius + terrain controls,
 * exposes the canonical 4 radius options + all TerrainPreset values,
 * and emits change events with partial-config diffs.
 *
 * @spec openspec/changes/add-skirmish-setup-ui/tasks.md § 4-5
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import {
  MAP_RADIUS_OPTIONS,
  MapConfigEditor,
} from '@/components/gameplay/pages/PreBattlePage.sections';
import { TerrainPreset, type IMapConfiguration } from '@/types/encounter';

const baseConfig: IMapConfiguration = {
  radius: 8,
  terrain: TerrainPreset.Clear,
  playerDeploymentZone: 'south',
  opponentDeploymentZone: 'north',
};

describe('add-skirmish-setup-ui — MapConfigEditor smoke test', () => {
  it('renders canonical radius options (5 / 8 / 12 / 17) with hex counts', () => {
    const onChange = jest.fn();
    render(<MapConfigEditor mapConfig={baseConfig} onChange={onChange} />);

    const radiusSelect = screen.getByTestId(
      'map-radius-select',
    ) as HTMLSelectElement;
    expect(radiusSelect).toBeInTheDocument();

    // All 4 canonical radius values are present
    for (const r of MAP_RADIUS_OPTIONS) {
      expect(radiusSelect.querySelector(`option[value="${r}"]`)).not.toBeNull();
    }

    // Default selection matches the input mapConfig.radius
    expect(radiusSelect.value).toBe('8');

    // Hex count is rendered next to the radius (formula: 1 + 3r(r+1))
    // For r=8: 1 + 3*8*9 = 217 hexes
    expect(radiusSelect.textContent).toContain('217');
  });

  it('renders every TerrainPreset value in the terrain selector', () => {
    const onChange = jest.fn();
    render(<MapConfigEditor mapConfig={baseConfig} onChange={onChange} />);

    const terrainSelect = screen.getByTestId(
      'terrain-preset-select',
    ) as HTMLSelectElement;
    for (const preset of Object.values(TerrainPreset)) {
      expect(
        terrainSelect.querySelector(`option[value="${preset}"]`),
      ).not.toBeNull();
    }
    expect(terrainSelect.value).toBe(TerrainPreset.Clear);
  });

  it('emits onChange with { radius } when radius is changed', () => {
    const onChange = jest.fn();
    render(<MapConfigEditor mapConfig={baseConfig} onChange={onChange} />);

    fireEvent.change(screen.getByTestId('map-radius-select'), {
      target: { value: '12' },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ radius: 12 });
  });

  it('emits onChange with { terrain } when terrain preset is changed', () => {
    const onChange = jest.fn();
    render(<MapConfigEditor mapConfig={baseConfig} onChange={onChange} />);

    fireEvent.change(screen.getByTestId('terrain-preset-select'), {
      target: { value: TerrainPreset.Urban },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ terrain: TerrainPreset.Urban });
  });

  it('disables both controls when disabled prop is true', () => {
    const onChange = jest.fn();
    render(
      <MapConfigEditor mapConfig={baseConfig} onChange={onChange} disabled />,
    );
    expect(
      (screen.getByTestId('map-radius-select') as HTMLSelectElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId('terrain-preset-select') as HTMLSelectElement)
        .disabled,
    ).toBe(true);
  });
});
