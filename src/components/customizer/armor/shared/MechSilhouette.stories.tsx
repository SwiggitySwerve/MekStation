import type { Meta, StoryObj } from "@storybook/react";

import React from "react";

import { MechLocation } from "@/types/construction";

import {
  BATTLEMECH_SILHOUETTE,
  FIGHTER_LOCATION_LABELS,
  FIGHTER_SILHOUETTE,
  GEOMETRIC_SILHOUETTE,
  getLocationLabel,
  MEGAMEK_SILHOUETTE,
  QUAD_SILHOUETTE,
  REALISTIC_SILHOUETTE,
  type SilhouetteConfig,
  TRIPOD_SILHOUETTE,
} from "./MechSilhouette";

type SilhouetteVariant = "biped" | "quad" | "tripod" | "fighter";

function resolveLocationLabel(
  location: MechLocation,
  variant: SilhouetteVariant,
): string {
  if (variant === "fighter") {
    return FIGHTER_LOCATION_LABELS[location] ?? location;
  }
  return getLocationLabel(location, variant);
}

/**
 * The MechSilhouette module is a facade that re-exports SVG path data and
 * helper utilities for the various silhouette styles consumed by armor
 * diagrams. These stories visualize each exported config so the SVG geometry
 * can be reviewed in isolation without the rest of the armor pipeline.
 */
const meta: Meta = {
  title: "Customizer/Armor/MechSilhouette",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Visual reference for the silhouette path data exported from MechSilhouette. Each story renders the configured viewBox and per-location SVG paths.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

interface SilhouettePreviewProps {
  config: SilhouetteConfig;
  height?: number;
  variant?: SilhouetteVariant;
}

/**
 * Render a SilhouetteConfig as a centered SVG with each location filled and
 * labelled. Used by every story below to keep the rendered output consistent.
 */
function SilhouettePreview({
  config,
  height = 360,
  variant = "biped",
}: SilhouettePreviewProps): React.ReactElement {
  const entries = Object.entries(config.locations) as Array<
    [MechLocation, NonNullable<SilhouetteConfig["locations"][MechLocation]>]
  >;

  return (
    <svg
      viewBox={config.viewBox}
      style={{ height, width: "auto", display: "block" }}
      role="img"
      aria-label="Mech silhouette preview"
    >
      <rect x={0} y={0} width="100%" height="100%" fill="#0f172a" opacity={0} />
      {config.outlinePath && (
        <path
          d={config.outlinePath}
          fill="none"
          stroke="#475569"
          strokeWidth={1}
        />
      )}
      {entries.map(([location, position]) => {
        const label = resolveLocationLabel(location, variant);
        return (
          <g key={location}>
            {position.path ? (
              <path
                d={position.path}
                fill="#3b82f6"
                fillOpacity={0.35}
                stroke="#60a5fa"
                strokeWidth={1.5}
              />
            ) : (
              <rect
                x={position.x}
                y={position.y}
                width={position.width}
                height={position.height}
                fill="#3b82f6"
                fillOpacity={0.35}
                stroke="#60a5fa"
                strokeWidth={1.5}
              />
            )}
            <text
              x={position.x + position.width / 2}
              y={position.y + position.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill="#f8fafc"
              style={{ pointerEvents: "none", fontWeight: 600 }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export const RealisticBiped: Story = {
  render: () => <SilhouettePreview config={REALISTIC_SILHOUETTE} />,
};

export const BattleMechBiped: Story = {
  render: () => <SilhouettePreview config={BATTLEMECH_SILHOUETTE} />,
};

export const MegaMekBiped: Story = {
  render: () => <SilhouettePreview config={MEGAMEK_SILHOUETTE} />,
};

export const GeometricBiped: Story = {
  render: () => <SilhouettePreview config={GEOMETRIC_SILHOUETTE} />,
};

export const Quad: Story = {
  render: () => <SilhouettePreview config={QUAD_SILHOUETTE} variant="quad" />,
};

export const Tripod: Story = {
  render: () => (
    <SilhouettePreview config={TRIPOD_SILHOUETTE} variant="tripod" />
  ),
};

export const Fighter: Story = {
  render: () => (
    <SilhouettePreview config={FIGHTER_SILHOUETTE} variant="fighter" />
  ),
};

export const VariantGallery: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      {(
        [
          {
            label: "Realistic",
            config: REALISTIC_SILHOUETTE,
            variant: "biped",
          },
          {
            label: "BattleMech",
            config: BATTLEMECH_SILHOUETTE,
            variant: "biped",
          },
          { label: "MegaMek", config: MEGAMEK_SILHOUETTE, variant: "biped" },
          {
            label: "Geometric",
            config: GEOMETRIC_SILHOUETTE,
            variant: "biped",
          },
        ] as const
      ).map(({ label, config, variant }) => (
        <div
          key={label}
          className="bg-surface-base border-border-theme flex flex-col items-center gap-2 rounded border p-3"
        >
          <SilhouettePreview config={config} variant={variant} height={220} />
          <span className="text-text-theme-primary text-xs font-medium">
            {label}
          </span>
        </div>
      ))}
    </div>
  ),
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="bg-surface-deep p-6">
        <Story />
      </div>
    ),
  ],
};
