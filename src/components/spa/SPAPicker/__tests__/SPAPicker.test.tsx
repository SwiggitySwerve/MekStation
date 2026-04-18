/**
 * SPAPicker — RTL tests covering tab/search/source/exclude/affordability
 * filters and the designation flow.
 *
 * These tests pin the public API contract (props in / events out). The
 * filter pipeline is tested through observable DOM output rather than
 * by reaching into internal state — Wave 2a refactors are expected to
 * keep these tests green.
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';

import { getAllSPAs } from '@/lib/spa';

import { SPAPicker } from '../SPAPicker';

const allSpas = getAllSPAs();

describe('SPAPicker', () => {
  it('renders every catalog entry by default', () => {
    render(<SPAPicker onSelect={jest.fn()} />);

    // 91 SPAs in the catalog → 91 list rows.
    const items = screen.getAllByTestId(/^spa-item-/);
    expect(items).toHaveLength(allSpas.length);
    expect(allSpas.length).toBe(91);
  });

  it('filters to a single category when a tab is clicked', () => {
    render(<SPAPicker onSelect={jest.fn()} />);

    // Gunnery has 13 entries in the canonical catalog.
    const gunneryTab = screen.getByRole('tab', { name: /Gunnery/i });
    fireEvent.click(gunneryTab);

    const items = screen.getAllByTestId(/^spa-item-/);
    expect(items.length).toBe(
      allSpas.filter((s) => s.category === 'gunnery').length,
    );
  });

  it('filters by case-insensitive substring search', () => {
    render(<SPAPicker onSelect={jest.fn()} />);

    const search = screen.getByLabelText(/search/i);
    fireEvent.change(search, { target: { value: 'weapon spec' } });

    expect(screen.getByText('Weapon Specialist')).toBeInTheDocument();
    // Only matches that contain "weapon spec" (case-insensitive) appear.
    const items = screen.getAllByTestId(/^spa-item-/);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(allSpas.length);
  });

  it('hides rows whose source is not in active source chips', () => {
    render(<SPAPicker onSelect={jest.fn()} />);

    const camOpsChip = screen.getByRole('button', {
      name: /toggle source filter: CamOps/i,
    });
    fireEvent.click(camOpsChip);
    expect(camOpsChip).toHaveAttribute('aria-pressed', 'true');

    const items = screen.getAllByTestId(/^spa-item-/);
    expect(items.length).toBe(
      allSpas.filter((s) => s.source === 'CamOps').length,
    );
  });

  it('disables rows whose id appears in excludedIds', () => {
    const owned = allSpas[0];
    render(<SPAPicker onSelect={jest.fn()} excludedIds={[owned.id]} />);

    const ownedRow = screen.getByTestId(`spa-item-${owned.id}`);
    const ownedBtn = within(ownedRow).getByRole('button', {
      name: /Already owned/i,
    });
    expect(ownedBtn).toBeDisabled();
  });

  it('hides unaffordable SPAs in purchase mode when availableXP is set', () => {
    // Pick the most expensive purchasable SPA, then set availableXP just below it.
    const purchasable = allSpas.filter((s) => s.xpCost !== null && !s.isFlaw);
    const expensive = purchasable.reduce((a, b) =>
      (a.xpCost ?? 0) >= (b.xpCost ?? 0) ? a : b,
    );
    const xp = (expensive.xpCost ?? 0) - 1;

    render(<SPAPicker onSelect={jest.fn()} mode="purchase" availableXP={xp} />);

    expect(screen.queryByTestId(`spa-item-${expensive.id}`)).toBeNull();
  });

  it('emits onSelect immediately for SPAs that do not require designation', () => {
    const onSelect = jest.fn();
    const noDesignation = allSpas.find((s) => !s.requiresDesignation);
    expect(noDesignation).toBeDefined();

    render(<SPAPicker onSelect={onSelect} />);

    const row = screen.getByTestId(`spa-item-${noDesignation!.id}`);
    fireEvent.click(within(row).getByRole('button', { name: /Select/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    // SPAItem -> picker forwarder calls (spa, undefined) for no-designation SPAs.
    expect(onSelect).toHaveBeenCalledWith(noDesignation, undefined);
  });

  it('opens the designation prompt then emits the chosen designation on Confirm', () => {
    const onSelect = jest.fn();
    // Weapon Specialist requires a weapon_type designation.
    const wpnSpec = allSpas.find((s) => s.id === 'weapon_specialist');
    expect(wpnSpec).toBeDefined();

    render(<SPAPicker onSelect={onSelect} />);

    const row = screen.getByTestId(`spa-item-${wpnSpec!.id}`);
    fireEvent.click(within(row).getByRole('button', { name: /^Select$/i }));

    // The Select should NOT have emitted yet — designation prompt is open.
    expect(onSelect).not.toHaveBeenCalled();

    // Two elements use "designation" text (the <label> and the aria-labelled
    // wrapper). Disambiguate by scoping to the role=group.
    const group = within(row).getByRole('group', {
      name: /Choose designation/i,
    });
    const select = within(group).getByRole('combobox') as HTMLSelectElement;
    // Wave 2b — values are canonical slugs ("ppc"), not the display label.
    fireEvent.change(select, { target: { value: 'ppc' } });
    fireEvent.click(within(row).getByRole('button', { name: /Confirm/i }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    // Wave 2b — typed weapon_type variant with slug + label fields.
    expect(onSelect).toHaveBeenCalledWith(wpnSpec, {
      kind: 'weapon_type',
      weaponTypeId: 'ppc',
      displayLabel: 'PPC',
    });
  });

  it('Cancel in the designation prompt restores the picker without selecting', () => {
    const onSelect = jest.fn();
    const wpnSpec = allSpas.find((s) => s.id === 'weapon_specialist');
    render(<SPAPicker onSelect={onSelect} />);

    const row = screen.getByTestId(`spa-item-${wpnSpec!.id}`);
    fireEvent.click(within(row).getByRole('button', { name: /^Select$/i }));
    fireEvent.click(within(row).getByRole('button', { name: /Cancel/i }));

    expect(onSelect).not.toHaveBeenCalled();
    // Select button is back.
    expect(
      within(row).getByRole('button', { name: /^Select$/i }),
    ).toBeInTheDocument();
  });

  it('shows the empty state when no rows match the filters', () => {
    render(<SPAPicker onSelect={jest.fn()} />);
    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: 'xyz-no-such-thing-zzz' },
    });

    expect(
      screen.getByText(/No abilities match these filters/i),
    ).toBeInTheDocument();
  });

  it('Esc clears search before cancelling', () => {
    const onCancel = jest.fn();
    render(<SPAPicker onSelect={jest.fn()} onCancel={onCancel} />);

    const search = screen.getByLabelText(/search/i);
    fireEvent.change(search, { target: { value: 'gunnery' } });
    // First Esc clears search.
    fireEvent.keyDown(screen.getByTestId('spa-picker'), { key: 'Escape' });
    expect((search as HTMLInputElement).value).toBe('');
    expect(onCancel).not.toHaveBeenCalled();

    // Second Esc cancels.
    fireEvent.keyDown(screen.getByTestId('spa-picker'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('respects allowedSources whitelist for chip rendering', () => {
    render(
      <SPAPicker onSelect={jest.fn()} allowedSources={['CamOps', 'MaxTech']} />,
    );

    expect(
      screen.getByRole('button', { name: /toggle source filter: CamOps/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /toggle source filter: ManeiDomini/i,
      }),
    ).toBeNull();
  });
});
