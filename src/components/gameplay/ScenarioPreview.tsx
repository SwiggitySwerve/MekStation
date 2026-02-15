import React from 'react';

import type { IGeneratedScenario } from '@/types/scenario';

import { Card, Button } from '@/components/ui';

interface ScenarioPreviewProps {
  scenario: IGeneratedScenario;
  onAccept: () => void;
  onRegenerate: () => void;
}

export function ScenarioPreview({
  scenario,
  onAccept,
  onRegenerate,
}: ScenarioPreviewProps): React.ReactElement {
  const { template, mapPreset, opFor, modifiers, turnLimit } = scenario;

  return (
    <Card data-testid="scenario-preview">
      <h3 className="text-text-theme-primary mb-4 text-lg font-medium">
        Generated Scenario Preview
      </h3>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h4 className="text-text-theme-secondary mb-2 text-sm font-medium">
            Scenario
          </h4>
          <div className="bg-surface-raised border-border-theme-subtle rounded-lg border p-3">
            <div className="text-text-theme-primary font-medium">
              {template.name}
            </div>
            <div className="text-text-theme-muted mt-1 text-sm">
              {template.description}
            </div>
            {turnLimit > 0 && (
              <div className="text-accent mt-2 text-sm">
                Turn Limit: {turnLimit}
              </div>
            )}
          </div>

          <h4 className="text-text-theme-secondary mt-4 mb-2 text-sm font-medium">
            Victory Conditions
          </h4>
          <ul className="space-y-1">
            {template.victoryConditions.map((vc, i) => (
              <li
                key={i}
                className="text-text-theme-primary flex items-start gap-2 text-sm"
              >
                <span className="text-accent">•</span>
                {vc.name}
                {vc.primary && (
                  <span className="text-accent text-xs">(Primary)</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-text-theme-secondary mb-2 text-sm font-medium">
            Map
          </h4>
          <div className="bg-surface-raised border-border-theme-subtle rounded-lg border p-3">
            <div className="text-text-theme-primary font-medium">
              {mapPreset.name}
            </div>
            <div className="text-text-theme-muted mt-1 text-sm">
              Biome: {mapPreset.biome} | Radius: {mapPreset.radius} hexes
            </div>
          </div>

          {modifiers.length > 0 && (
            <>
              <h4 className="text-text-theme-secondary mt-4 mb-2 text-sm font-medium">
                Battle Modifiers
              </h4>
              <ul className="space-y-1">
                {modifiers.map((mod) => (
                  <li key={mod.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={
                        mod.effect === 'positive'
                          ? 'text-green-400'
                          : mod.effect === 'negative'
                            ? 'text-red-400'
                            : 'text-yellow-400'
                      }
                    >
                      •
                    </span>
                    <span className="text-text-theme-primary">{mod.name}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-text-theme-secondary mb-2 text-sm font-medium">
          Generated Opposition Force
        </h4>
        <div className="bg-surface-raised border-border-theme-subtle rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-text-theme-primary font-medium">
                {opFor.units.length} units
              </span>
              <span className="text-text-theme-muted mx-2">|</span>
              <span className="text-text-theme-primary">
                {opFor.totalBV.toLocaleString()} BV
              </span>
              <span className="text-text-theme-muted ml-2 text-sm">
                (Target: {opFor.targetBV.toLocaleString()})
              </span>
            </div>
            <div className="text-text-theme-muted text-sm">
              {opFor.metadata.lanceCount} lance
              {opFor.metadata.lanceCount !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {opFor.units.slice(0, 8).map((unit, i) => (
              <div key={i} className="text-text-theme-muted text-xs">
                <span className="text-text-theme-primary">
                  {unit.designation}
                </span>
                <span className="block">
                  {unit.pilot.gunnery}/{unit.pilot.piloting} - {unit.bv} BV
                </span>
              </div>
            ))}
            {opFor.units.length > 8 && (
              <div className="text-text-theme-muted text-xs">
                +{opFor.units.length - 8} more...
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={onRegenerate}
          data-testid="regenerate-btn"
        >
          Regenerate
        </Button>
        <Button
          variant="primary"
          onClick={onAccept}
          data-testid="accept-scenario-btn"
        >
          Use This Scenario
        </Button>
      </div>
    </Card>
  );
}
