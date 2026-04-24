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

/**
 * Shared clip polygon for all terrain symbols — matches the flat-top
 * hex shape at the 200x200 viewBox used by the source assets.
 */
const HEX_CLIP_POLYGON = '200,100 150,186.6 50,186.6 0,100 50,13.4 150,13.4';

interface SymbolBodyProps {
  /** The inner SVG children; all drawn inside the hex clip. */
  readonly children: React.ReactNode;
  /** `data-shape` attribute for spec a11y compliance. */
  readonly shape: string;
  /** ARIA label fallback for screen readers. */
  readonly label: string;
}

/**
 * Wraps a symbol's body with the shared hex clip + viewBox metadata
 * so individual symbols only have to declare their art.
 */
function SymbolBody({
  children,
  shape,
  label,
}: SymbolBodyProps): React.ReactElement {
  const clipId = React.useMemo(
    () => `terrain-clip-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <polygon points={HEX_CLIP_POLYGON} />
        </clipPath>
      </defs>
      <g
        clipPath={`url(#${clipId})`}
        data-shape={shape}
        aria-label={label}
        role="img"
      >
        {children}
      </g>
    </>
  );
}

/**
 * Per-key symbol body. Each function returns the body of one symbol,
 * mirroring the contents of the matching SVG file on disk. Kept inline
 * (not imported from disk) because SVG import loaders are unreliable
 * across Jest / Next / Storybook, and symbols need to live in the same
 * SVG tree as their consumers.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const renderSymbolBody: Record<string, () => React.ReactElement> = {
  clear: () => (
    <SymbolBody shape="grass-wash" label="Clear terrain">
      <rect x="0" y="0" width="200" height="200" fill="#e6f4d8" />
      <g
        stroke="#a6c482"
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.55}
      >
        <line x1="20" y1="60" x2="26" y2="52" />
        <line x1="60" y1="90" x2="66" y2="82" />
        <line x1="110" y1="70" x2="116" y2="62" />
        <line x1="150" y1="110" x2="156" y2="102" />
        <line x1="40" y1="140" x2="46" y2="132" />
        <line x1="90" y1="160" x2="96" y2="152" />
        <line x1="140" y1="150" x2="146" y2="142" />
        <line x1="170" y1="50" x2="176" y2="42" />
        <line x1="80" y1="40" x2="86" y2="32" />
        <line x1="120" y1="130" x2="126" y2="122" />
      </g>
    </SymbolBody>
  ),
  'light-woods': () => (
    <SymbolBody shape="triangular-canopy" label="Light woods terrain">
      <rect x="0" y="0" width="200" height="200" fill="#d8e9c4" />
      <g
        fill="#4a7a2f"
        stroke="#2f5019"
        strokeWidth={1.5}
        strokeLinejoin="round"
      >
        <polygon points="60,90 45,120 75,120" />
        <polygon points="130,70 115,100 145,100" />
        <polygon points="90,140 75,170 105,170" />
        <polygon points="150,130 135,160 165,160" />
      </g>
      <g fill="#2f5019">
        <rect x="58" y="118" width="4" height="6" />
        <rect x="128" y="98" width="4" height="6" />
        <rect x="88" y="168" width="4" height="6" />
        <rect x="148" y="158" width="4" height="6" />
      </g>
    </SymbolBody>
  ),
  'heavy-woods': () => (
    <SymbolBody shape="triangular-canopy-dense" label="Heavy woods terrain">
      <rect x="0" y="0" width="200" height="200" fill="#b8d4a0" />
      <g
        fill="#2f5019"
        stroke="#1e3510"
        strokeWidth={1.5}
        strokeLinejoin="round"
      >
        <polygon points="45,70 30,105 60,105" />
        <polygon points="90,55 75,90 105,90" />
        <polygon points="140,80 125,115 155,115" />
        <polygon points="70,130 55,165 85,165" />
        <polygon points="120,135 105,170 135,170" />
        <polygon points="160,140 145,175 175,175" />
      </g>
      <g
        fill="#4a7a2f"
        stroke="#2f5019"
        strokeWidth={1.2}
        strokeLinejoin="round"
      >
        <polygon points="60,90 48,115 72,115" />
        <polygon points="110,100 98,125 122,125" />
        <polygon points="150,60 138,85 162,85" />
      </g>
    </SymbolBody>
  ),
  'light-building': () => (
    <SymbolBody shape="rectangular-outline" label="Light building terrain">
      <rect x="0" y="0" width="200" height="200" fill="#d4d4d4" />
      <rect
        x="70"
        y="70"
        width="60"
        height="60"
        fill="#b5b0a8"
        stroke="#5a564f"
        strokeWidth={2}
      />
      <rect x="78" y="82" width="12" height="14" fill="#5a564f" />
      <rect x="110" y="82" width="12" height="14" fill="#5a564f" />
      <rect x="78" y="106" width="12" height="14" fill="#5a564f" />
      <rect x="110" y="106" width="12" height="14" fill="#5a564f" />
      <line
        x1="70"
        y1="100"
        x2="130"
        y2="100"
        stroke="#5a564f"
        strokeWidth={1}
      />
    </SymbolBody>
  ),
  'medium-building': () => (
    <SymbolBody shape="rectangular-outline" label="Medium building terrain">
      <rect x="0" y="0" width="200" height="200" fill="#c4c4c4" />
      <rect
        x="60"
        y="50"
        width="80"
        height="100"
        fill="#8f8a83"
        stroke="#3a362f"
        strokeWidth={2.5}
      />
      <rect x="70" y="62" width="14" height="14" fill="#3a362f" />
      <rect x="96" y="62" width="14" height="14" fill="#3a362f" />
      <rect x="122" y="62" width="14" height="14" fill="#3a362f" />
      <rect x="70" y="86" width="14" height="14" fill="#3a362f" />
      <rect x="96" y="86" width="14" height="14" fill="#3a362f" />
      <rect x="122" y="86" width="14" height="14" fill="#3a362f" />
      <rect x="70" y="110" width="14" height="14" fill="#3a362f" />
      <rect x="96" y="110" width="14" height="14" fill="#3a362f" />
      <rect x="122" y="110" width="14" height="14" fill="#3a362f" />
      <line x1="60" y1="80" x2="140" y2="80" stroke="#3a362f" strokeWidth={1} />
      <line
        x1="60"
        y1="104"
        x2="140"
        y2="104"
        stroke="#3a362f"
        strokeWidth={1}
      />
      <line
        x1="60"
        y1="128"
        x2="140"
        y2="128"
        stroke="#3a362f"
        strokeWidth={1}
      />
    </SymbolBody>
  ),
  'heavy-building': () => (
    <SymbolBody shape="rectangular-outline" label="Heavy building terrain">
      <rect x="0" y="0" width="200" height="200" fill="#b5b5b5" />
      <rect
        x="40"
        y="40"
        width="120"
        height="120"
        fill="#6f6a62"
        stroke="#27231d"
        strokeWidth={3}
      />
      <line
        x1="80"
        y1="40"
        x2="80"
        y2="160"
        stroke="#27231d"
        strokeWidth={1.5}
      />
      <line
        x1="120"
        y1="40"
        x2="120"
        y2="160"
        stroke="#27231d"
        strokeWidth={1.5}
      />
      <line
        x1="40"
        y1="80"
        x2="160"
        y2="80"
        stroke="#27231d"
        strokeWidth={1.5}
      />
      <line
        x1="40"
        y1="120"
        x2="160"
        y2="120"
        stroke="#27231d"
        strokeWidth={1.5}
      />
      <rect x="52" y="52" width="14" height="18" fill="#27231d" />
      <rect x="92" y="52" width="16" height="18" fill="#27231d" />
      <rect x="132" y="52" width="14" height="18" fill="#27231d" />
      <rect x="52" y="92" width="14" height="18" fill="#27231d" />
      <rect x="92" y="92" width="16" height="18" fill="#27231d" />
      <rect x="132" y="92" width="14" height="18" fill="#27231d" />
      <rect x="52" y="132" width="14" height="18" fill="#27231d" />
      <rect x="92" y="132" width="16" height="18" fill="#27231d" />
      <rect x="132" y="132" width="14" height="18" fill="#27231d" />
    </SymbolBody>
  ),
  'hardened-building': () => (
    <SymbolBody shape="rectangular-outline" label="Hardened building terrain">
      <rect x="0" y="0" width="200" height="200" fill="#a6a6a6" />
      <rect
        x="40"
        y="40"
        width="120"
        height="120"
        fill="#4a453d"
        stroke="#17140f"
        strokeWidth={4}
      />
      <polygon points="40,40 60,40 60,60 40,60" fill="#17140f" />
      <polygon points="160,40 140,40 140,60 160,60" fill="#17140f" />
      <polygon points="40,160 60,160 60,140 40,140" fill="#17140f" />
      <polygon points="160,160 140,160 140,140 160,140" fill="#17140f" />
      <g stroke="#17140f" strokeWidth={1.5}>
        <line x1="60" y1="60" x2="140" y2="140" />
        <line x1="140" y1="60" x2="60" y2="140" />
      </g>
      <rect
        x="90"
        y="90"
        width="20"
        height="20"
        fill="#d4a73f"
        stroke="#17140f"
        strokeWidth={2}
      />
    </SymbolBody>
  ),
  'shallow-water': () => (
    <SymbolBody shape="wave-pattern" label="Shallow water terrain">
      <rect x="0" y="0" width="200" height="200" fill="#bce3f5" />
      <g stroke="#5ba8d2" strokeWidth={1.5} fill="none" strokeLinecap="round">
        <path d="M20,60 Q30,54 40,60 T60,60" />
        <path d="M80,60 Q90,54 100,60 T120,60" />
        <path d="M140,60 Q150,54 160,60 T180,60" />
        <path d="M40,100 Q50,94 60,100 T80,100" />
        <path d="M100,100 Q110,94 120,100 T140,100" />
        <path d="M160,100 Q170,94 180,100" />
        <path d="M20,140 Q30,134 40,140 T60,140" />
        <path d="M80,140 Q90,134 100,140 T120,140" />
        <path d="M140,140 Q150,134 160,140 T180,140" />
      </g>
    </SymbolBody>
  ),
  'deep-water': () => (
    <SymbolBody shape="wave-pattern" label="Deep water terrain">
      <rect x="0" y="0" width="200" height="200" fill="#2a5a8a" />
      <g
        stroke="#c5dceb"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        opacity={0.8}
      >
        <path d="M10,40 Q25,32 40,40 T70,40 T100,40" />
        <path d="M110,40 Q125,32 140,40 T170,40 T200,40" />
        <path d="M10,70 Q25,62 40,70 T70,70 T100,70" />
        <path d="M110,70 Q125,62 140,70 T170,70" />
        <path d="M10,100 Q25,92 40,100 T70,100 T100,100 T130,100" />
        <path d="M140,100 Q155,92 170,100 T200,100" />
        <path d="M10,130 Q25,122 40,130 T70,130 T100,130" />
        <path d="M110,130 Q125,122 140,130 T170,130 T200,130" />
        <path d="M10,160 Q25,152 40,160 T70,160 T100,160" />
        <path d="M110,160 Q125,152 140,160 T170,160" />
      </g>
    </SymbolBody>
  ),
  rough: () => (
    <SymbolBody shape="dotted-pattern" label="Rough terrain">
      <rect x="0" y="0" width="200" height="200" fill="#cdbfa6" />
      <g fill="#6f5a3f">
        <circle cx="30" cy="50" r={3} />
        <circle cx="60" cy="40" r={2} />
        <circle cx="90" cy="60" r={4} />
        <circle cx="130" cy="50" r={2.5} />
        <circle cx="170" cy="45" r={3} />
        <circle cx="40" cy="90" r={2} />
        <circle cx="80" cy="95" r={3} />
        <circle cx="110" cy="100" r={2.5} />
        <circle cx="150" cy="90" r={3.5} />
        <circle cx="180" cy="105" r={2} />
        <circle cx="25" cy="130" r={3} />
        <circle cx="65" cy="140" r={2} />
        <circle cx="100" cy="135" r={3.5} />
        <circle cx="140" cy="145" r={2.5} />
        <circle cx="175" cy="140" r={3} />
        <circle cx="35" cy="170" r={2.5} />
        <circle cx="75" cy="175" r={3} />
        <circle cx="115" cy="170" r={2} />
        <circle cx="155" cy="175" r={3.5} />
      </g>
      <g fill="#a68d6f">
        <polygon points="50,70 56,75 52,80 46,75" />
        <polygon points="120,80 126,85 122,92 116,85" />
        <polygon points="70,120 76,125 72,130 66,125" />
        <polygon points="160,120 166,125 162,132 156,125" />
        <polygon points="95,150 101,155 97,160 91,155" />
      </g>
    </SymbolBody>
  ),
  rubble: () => (
    <SymbolBody shape="debris-chunks" label="Rubble terrain">
      <rect x="0" y="0" width="200" height="200" fill="#9c938a" />
      <g fill="#5a524a" stroke="#2d2720" strokeWidth={1.2}>
        <polygon points="30,50 50,45 55,65 40,75 25,60" />
        <polygon points="80,40 100,38 105,55 90,60 75,50" />
        <polygon points="140,55 160,50 165,70 145,80" />
        <polygon points="50,110 70,108 75,130 55,135 45,120" />
        <polygon points="120,120 140,115 145,140 125,145 115,130" />
        <polygon points="160,130 180,130 175,155 155,155 150,140" />
        <polygon points="30,155 50,150 55,175 35,180" />
        <polygon points="90,165 110,162 115,182 95,185" />
      </g>
      <g fill="#7a7066" stroke="#3a332c" strokeWidth={1}>
        <rect
          x="40"
          y="90"
          width="30"
          height="8"
          transform="rotate(15 55 94)"
        />
        <rect
          x="105"
          y="85"
          width="25"
          height="6"
          transform="rotate(-10 117 88)"
        />
        <rect
          x="130"
          y="155"
          width="20"
          height="5"
          transform="rotate(25 140 158)"
        />
        <rect
          x="60"
          y="135"
          width="18"
          height="4"
          transform="rotate(-20 69 137)"
        />
      </g>
    </SymbolBody>
  ),
  pavement: () => (
    <SymbolBody shape="gridded-pattern" label="Pavement terrain">
      <rect x="0" y="0" width="200" height="200" fill="#bfbcb7" />
      <g stroke="#6a665e" strokeWidth={1.5}>
        <line x1="0" y1="50" x2="200" y2="50" />
        <line x1="0" y1="100" x2="200" y2="100" />
        <line x1="0" y1="150" x2="200" y2="150" />
        <line x1="50" y1="0" x2="50" y2="200" />
        <line x1="100" y1="0" x2="100" y2="200" />
        <line x1="150" y1="0" x2="150" y2="200" />
      </g>
      <g stroke="#8a867f" strokeWidth={0.6} strokeDasharray="3 3" opacity={0.6}>
        <line x1="0" y1="75" x2="200" y2="75" />
        <line x1="0" y1="125" x2="200" y2="125" />
        <line x1="25" y1="0" x2="25" y2="200" />
        <line x1="75" y1="0" x2="75" y2="200" />
        <line x1="125" y1="0" x2="125" y2="200" />
        <line x1="175" y1="0" x2="175" y2="200" />
      </g>
    </SymbolBody>
  ),
};

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
