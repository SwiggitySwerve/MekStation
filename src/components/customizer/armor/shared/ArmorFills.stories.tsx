import type { Meta, StoryObj } from "@storybook/react";

import React from "react";

import {
  FRONT_ARMOR_COLOR,
  GradientDefs,
  REAR_ARMOR_COLOR,
  SELECTED_COLOR,
  TankFillClipPath,
  darkenColor,
  getArmorGradientId,
  getArmorStatusColor,
  getMegaMekStatusColor,
  lightenColor,
} from "./ArmorFills";

/**
 * ArmorFills exports SVG gradient definitions, helper colour utilities, and
 * tank-style clip paths used by the armor diagrams. These stories surface the
 * visual fragments so designers can review palette and gradient changes
 * without spinning up a full mech configurator.
 */
const meta: Meta = {
  title: "Customizer/Armor/ArmorFills",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "SVG fill primitives for armor diagrams: gradient defs, tank-style clip paths, and palette helpers.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const GRADIENT_IDS: Array<{ id: string; label: string }> = [
  { id: "armor-gradient-healthy", label: "Healthy" },
  { id: "armor-gradient-moderate", label: "Moderate" },
  { id: "armor-gradient-low", label: "Low" },
  { id: "armor-gradient-critical", label: "Critical" },
  { id: "armor-gradient-selected", label: "Selected" },
  { id: "armor-gradient-front", label: "Front" },
  { id: "armor-gradient-rear", label: "Rear" },
];

export const GradientGallery: Story = {
  render: () => (
    <svg viewBox="0 0 560 200" style={{ width: 560, height: 200 }}>
      <GradientDefs />
      {GRADIENT_IDS.map(({ id, label }, index) => {
        const x = 10 + index * 78;
        return (
          <g key={id}>
            <rect
              x={x}
              y={20}
              width={64}
              height={120}
              fill={`url(#${id})`}
              stroke="#1e293b"
              strokeWidth={1}
            />
            <text
              x={x + 32}
              y={160}
              textAnchor="middle"
              fontSize={11}
              fill="#f8fafc"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  ),
};

const STATUS_RATIOS: Array<{ label: string; current: number; max: number }> = [
  { label: "Full (100%)", current: 30, max: 30 },
  { label: "Healthy (80%)", current: 24, max: 30 },
  { label: "Moderate (55%)", current: 17, max: 30 },
  { label: "Low (30%)", current: 9, max: 30 },
  { label: "Critical (10%)", current: 3, max: 30 },
  { label: "Destroyed (0%)", current: 0, max: 30 },
];

export const StatusColorScale: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <div className="text-text-theme-primary text-sm font-semibold">
        getArmorStatusColor
      </div>
      <div className="flex gap-2">
        {STATUS_RATIOS.map(({ label, current, max }) => (
          <div
            key={label}
            className="flex flex-col items-center"
            style={{ width: 88 }}
          >
            <div
              style={{
                background: getArmorStatusColor(current, max),
                width: 64,
                height: 80,
                borderRadius: 4,
                border: "1px solid #1e293b",
              }}
            />
            <span className="text-text-theme-secondary mt-1 text-center text-xs">
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="text-text-theme-primary mt-4 text-sm font-semibold">
        getMegaMekStatusColor (beige record-sheet palette)
      </div>
      <div className="flex gap-2">
        {STATUS_RATIOS.map(({ label, current, max }) => (
          <div
            key={`mm-${label}`}
            className="flex flex-col items-center"
            style={{ width: 88 }}
          >
            <div
              style={{
                background: getMegaMekStatusColor(current, max),
                width: 64,
                height: 80,
                borderRadius: 4,
                border: "1px solid #1e293b",
              }}
            />
            <span className="text-text-theme-secondary mt-1 text-center text-xs">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),
};

const FILL_PERCENTS = [0, 25, 50, 75, 100];

export const TankFillProgression: Story = {
  render: () => (
    <svg viewBox="0 0 420 180" style={{ width: 420, height: 180 }}>
      <GradientDefs />
      {FILL_PERCENTS.map((percent, idx) => {
        const x = 20 + idx * 80;
        const y = 20;
        const width = 64;
        const height = 120;
        const clipId = `tank-fill-${percent}`;
        return (
          <g key={percent}>
            <TankFillClipPath
              id={clipId}
              fillPercent={percent}
              x={x}
              y={y}
              width={width}
              height={height}
            />
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              fill="#1e293b"
              stroke="#475569"
              strokeWidth={1}
            />
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              fill={getArmorGradientId(percent, 100, false)}
              clipPath={`url(#${clipId})`}
            />
            <text
              x={x + width / 2}
              y={160}
              textAnchor="middle"
              fontSize={11}
              fill="#f8fafc"
            >
              {percent}%
            </text>
          </g>
        );
      })}
    </svg>
  ),
};

const FACING_PALETTE: Array<{ label: string; color: string }> = [
  { label: "FRONT", color: FRONT_ARMOR_COLOR },
  { label: "REAR", color: REAR_ARMOR_COLOR },
  { label: "SELECTED", color: SELECTED_COLOR },
];

export const FacingPalette: Story = {
  render: () => (
    <div className="flex gap-3">
      {FACING_PALETTE.map(({ label, color }) => (
        <div
          key={label}
          className="flex flex-col items-center"
          style={{ width: 96 }}
        >
          <div
            style={{
              background: color,
              width: 80,
              height: 80,
              borderRadius: 4,
            }}
          />
          <span className="text-text-theme-primary mt-2 text-xs font-semibold">
            {label}
          </span>
          <code className="text-text-theme-secondary text-xs">{color}</code>
        </div>
      ))}
    </div>
  ),
};

const LIGHTEN_AMOUNTS = [0, 0.1, 0.2, 0.3, 0.4];
const DARKEN_AMOUNTS = [0, 0.1, 0.2, 0.3, 0.4];

export const ColorTransforms: Story = {
  render: () => {
    const baseColor = FRONT_ARMOR_COLOR;
    return (
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-text-theme-primary text-sm font-semibold">
            lightenColor (base: {baseColor})
          </div>
          <div className="mt-2 flex gap-2">
            {LIGHTEN_AMOUNTS.map((amount) => {
              const transformed = lightenColor(baseColor, amount);
              return (
                <div
                  key={`l-${amount}`}
                  className="flex flex-col items-center"
                  style={{ width: 80 }}
                >
                  <div
                    style={{
                      background: transformed,
                      width: 64,
                      height: 64,
                      borderRadius: 4,
                      border: "1px solid #1e293b",
                    }}
                  />
                  <span className="text-text-theme-secondary mt-1 text-xs">
                    +{Math.round(amount * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="text-text-theme-primary text-sm font-semibold">
            darkenColor (base: {baseColor})
          </div>
          <div className="mt-2 flex gap-2">
            {DARKEN_AMOUNTS.map((amount) => {
              const transformed = darkenColor(baseColor, amount);
              return (
                <div
                  key={`d-${amount}`}
                  className="flex flex-col items-center"
                  style={{ width: 80 }}
                >
                  <div
                    style={{
                      background: transformed,
                      width: 64,
                      height: 64,
                      borderRadius: 4,
                      border: "1px solid #1e293b",
                    }}
                  />
                  <span className="text-text-theme-secondary mt-1 text-xs">
                    -{Math.round(amount * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
};
