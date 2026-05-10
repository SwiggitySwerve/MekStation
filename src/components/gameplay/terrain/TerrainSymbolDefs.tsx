/**
 * Terrain Symbol Defs
 *
 * Inlines every terrain asset as an SVG `<symbol>` so each asset loads
 * once per page and is referenced by every hex via `<use href="#...">`.
 *
 * @spec openspec/changes/add-terrain-rendering/specs/terrain-rendering/spec.md
 *
 * Why symbols: per the change's perf budget (task 9.1/9.2), we want the
 * terrain layer paint time to stay <= 16ms on a 30x30 map. A 900-hex
 * map with inline per-hex SVG chunks would thrash the renderer;
 * `<use>` collapses each hex to a single GPU-compositable reference.
 *
 * Each symbol's viewBox matches the 200x200 viewBox of the source SVG
 * file in `public/sprites/terrain/<key>.svg`. The two must stay in
 * sync — the file-on-disk exists for external consumers (storybook,
 * docs, future exports) per spec "SHALL live under
 * public/sprites/terrain/" while the inline symbol handles runtime
 * rendering.
 *
 * Shape signatures (spec "Accessibility Shape Signatures"):
 * - Woods: triangular canopies (light = sparse, heavy = dense)
 * - Buildings: rectangular outline
 * - Water: wave pattern (shallow = sparse, deep = dense)
 * - Rough: dotted pattern
 * - Pavement: gridded pattern
 * - Rubble: angular debris chunks
 * - Clear: grass-wash cross-hatch
 */

import React from 'react';

import {
  TERRAIN_VISUAL_KEYS,
  symbolIdFor,
} from '@/utils/terrain/terrainVisualMap';

import { renderSymbolBody } from './TerrainSymbolBodies';

/**
 * Emits one `<symbol>` per known visual key into a parent SVG tree.
 *
 * Consumers render this once inside the hex map `<svg>`; downstream
 * hexes reference symbols via `<use href="#terrain-<key>">`.
 */
export function TerrainSymbolDefs(): React.ReactElement {
  return (
    <>
      {TERRAIN_VISUAL_KEYS.map((key) => {
        const body = renderSymbolBody[key];
        return (
          <symbol
            key={key}
            id={symbolIdFor(key)}
            viewBox="0 0 200 200"
            data-testid={`terrain-symbol-${key}`}
          >
            {body ? body() : null}
          </symbol>
        );
      })}
    </>
  );
}
