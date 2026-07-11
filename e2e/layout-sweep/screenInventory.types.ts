import type { Locator, Page } from '@playwright/test';

import { SWEEP_VIEWPORTS } from '../helpers/layout';

export type SweepViewportLabel = (typeof SWEEP_VIEWPORTS)[number]['label'];

/** All four sweep viewport labels, in SWEEP_VIEWPORTS order. */
export const ALL_SWEEP_VIEWPORT_LABELS: readonly SweepViewportLabel[] =
  SWEEP_VIEWPORTS.map((viewport) => viewport.label);

type AffordanceRole = Parameters<Page['getByRole']>[0];

/** Declarative locator strategy for a layout check target. */
export interface AffordanceDescriptor {
  readonly label: string;
  readonly role?: AffordanceRole;
  readonly name?: string | RegExp;
  readonly testId?: string | RegExp;
  readonly selector?: string;
  readonly text?: string | RegExp;
  readonly within?: string;
}

/** A single check target: a resolvable locator plus viewport applicability. */
export interface CheckTarget {
  readonly label: string;
  readonly resolve: (page: Page) => Locator;
  /** Sweep viewports this target is applicable at. Omit for all four. */
  readonly viewports?: readonly SweepViewportLabel[];
}

/** Resolve an affordance descriptor against a page, optionally pre-scoped. */
function affordanceLocator(
  page: Page,
  descriptor: AffordanceDescriptor,
): Locator {
  const scope: Page | Locator = descriptor.within
    ? page.locator(descriptor.within)
    : page;
  if (descriptor.testId) return scope.getByTestId(descriptor.testId).first();
  if (descriptor.selector) return scope.locator(descriptor.selector).first();
  if (descriptor.role) {
    return scope
      .getByRole(
        descriptor.role,
        descriptor.name ? { name: descriptor.name } : undefined,
      )
      .first();
  }
  if (descriptor.text) return scope.getByText(descriptor.text).first();
  throw new Error(
    `Affordance descriptor "${descriptor.label}" declares no locator strategy`,
  );
}

/** Build a check target from a descriptor, optionally viewport-scoped. */
export function affordance(
  descriptor: AffordanceDescriptor,
  viewports?: readonly SweepViewportLabel[],
): CheckTarget {
  return {
    label: descriptor.label,
    resolve: (page) => affordanceLocator(page, descriptor),
    viewports,
  };
}

export type SweepClass =
  | 'standalone'
  | 'recovery'
  | 'static-catalog'
  | 'pack-seeded'
  | 'excluded';

export type LayoutCheckKind =
  | 'overflow'
  | 'overlap'
  | 'clickable'
  | 'non-blank-render';

/** A documented, visible skip of one check at one viewport. */
export interface QuarantineEntry {
  readonly viewport: SweepViewportLabel;
  readonly check: LayoutCheckKind;
  readonly reason: string;
  readonly followUp: string;
}

/** Build one quarantine record for every canonical viewport. */
export function quarantineAllViewports(
  check: LayoutCheckKind,
  reason: string,
  followUp: string,
): readonly QuarantineEntry[] {
  return ALL_SWEEP_VIEWPORT_LABELS.map((viewport) => ({
    viewport,
    check,
    reason,
    followUp,
  }));
}

interface BaseEntry {
  readonly id: string;
  readonly class: SweepClass;
  readonly label: string;
  /** Manifest or delegated-route pattern this entry classifies. */
  readonly manifestPaths: readonly string[];
}

/** A literal route swept now. */
export interface SweptScreenEntry extends BaseEntry {
  readonly class: 'standalone' | 'recovery' | 'static-catalog';
  readonly goto: string;
  readonly primaryAffordances: readonly CheckTarget[];
  readonly overlapTargets: readonly CheckTarget[];
  readonly canvasLocator?: CheckTarget;
  readonly remountPerViewport?: boolean;
  readonly quarantine?: readonly QuarantineEntry[];
}

/** A route navigated through a scenario pack. */
export interface PackSeededScreenEntry extends BaseEntry {
  readonly class: 'pack-seeded';
  readonly pack: 'navigation' | 'combat';
  readonly navigation: 'direct-goto' | 'in-page-discovery';
  readonly routeTemplate?: string;
  readonly primaryAffordances: readonly CheckTarget[];
  readonly overlapTargets: readonly CheckTarget[];
  readonly canvasLocator?: CheckTarget;
  readonly quarantine?: readonly QuarantineEntry[];
  readonly note?: string;
}

/** A route not covered by the viewport sweep. */
export interface ExcludedScreenEntry extends BaseEntry {
  readonly class: 'excluded';
  readonly reason: string;
  readonly followUp?: string;
}

export type ScreenInventoryEntry =
  | SweptScreenEntry
  | PackSeededScreenEntry
  | ExcludedScreenEntry;
