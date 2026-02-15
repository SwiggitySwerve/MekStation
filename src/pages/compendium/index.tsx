import Link from 'next/link';
import React, { useState } from 'react';

import { CompendiumLayout } from '@/components/compendium';
import { RULE_SECTIONS } from '@/components/compendium/compendium.constants';
import {
  SearchIcon,
  EquipmentIcon,
  MechIcon,
  ArrowIcon,
  ChartIcon,
  BookIcon,
} from '@/components/compendium/CompendiumIcons';

export default function CompendiumPage(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = RULE_SECTIONS.filter((section) =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Header actions with search
  const headerActions = (
    <div className="relative">
      <SearchIcon className="text-text-theme-secondary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="bg-surface-base/50 border-border-theme-subtle text-text-theme-primary placeholder-text-theme-secondary focus:border-accent w-48 rounded-lg border py-2 pr-4 pl-9 text-sm transition-colors focus:outline-none"
        data-testid="compendium-search"
      />
    </div>
  );

  return (
    <CompendiumLayout
      title="COMPENDIUM"
      subtitle="Canonical reference for units, equipment, and construction rules"
      breadcrumbs={[]}
      headerActions={headerActions}
      data-testid="compendium-hub"
    >
      {/* Hero Feature Cards - Primary Navigation */}
      <section className="mb-12" data-testid="compendium-units-section">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Units Card - Featured */}
          <Link href="/compendium/units" className="group">
            <div className="via-surface-base/60 to-surface-base/40 relative h-48 overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/80 p-6 transition-all duration-300 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-500/10">
              {/* Decorative grid */}
              <div className="absolute inset-0 opacity-10">
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(16, 185, 129, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.3) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />
              </div>
              {/* Gradient glow */}
              <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl transition-colors group-hover:bg-emerald-500/30" />

              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 p-3 text-emerald-400">
                    <MechIcon />
                  </div>
                  <ArrowIcon className="h-5 w-5 text-emerald-500/50 transition-all group-hover:translate-x-1 group-hover:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-text-theme-primary text-xl font-bold transition-colors group-hover:text-emerald-300">
                    Unit Database
                  </h3>
                  <p className="text-text-theme-secondary mt-1 text-sm">
                    Browse BattleMechs, vehicles, aerospace, and more
                  </p>
                </div>
              </div>
            </div>
          </Link>

          {/* Equipment Card - Featured */}
          <Link
            href="/compendium/equipment"
            className="group"
            data-testid="compendium-equipment-section"
          >
            <div className="via-surface-base/60 to-surface-base/40 relative h-48 overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/80 p-6 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10">
              {/* Decorative grid */}
              <div className="absolute inset-0 opacity-10">
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />
              </div>
              {/* Gradient glow */}
              <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl transition-colors group-hover:bg-cyan-500/30" />

              <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/20 p-3 text-cyan-400">
                    <EquipmentIcon />
                  </div>
                  <ArrowIcon className="h-5 w-5 text-cyan-500/50 transition-all group-hover:translate-x-1 group-hover:text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-text-theme-primary text-xl font-bold transition-colors group-hover:text-cyan-300">
                    Equipment Catalog
                  </h3>
                  <p className="text-text-theme-secondary mt-1 text-sm">
                    Browse weapons, electronics, and mech components
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Split Layout: Quick Reference + Construction Rules */}
      <section className="mb-12 grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Quick Reference Panel - Prominent sidebar */}
        <div
          className="order-2 xl:order-1 xl:col-span-2"
          data-testid="compendium-quick-reference"
        >
          <div className="sticky top-6">
            <div className="via-surface-base/40 to-surface-base/30 relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-950/50 p-6">
              {/* Corner accent */}
              <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/10 blur-2xl" />

              <div className="relative z-10">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
                    <ChartIcon />
                  </div>
                  <h3 className="text-sm font-semibold tracking-wider text-amber-400 uppercase">
                    Quick Reference
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="bg-surface-deep/50 border-border-theme-subtle/30 flex items-center justify-between rounded-xl border px-4 py-3">
                    <span className="text-text-theme-secondary text-sm">
                      Total Critical Slots
                    </span>
                    <span className="text-2xl font-bold text-amber-400 tabular-nums">
                      78
                    </span>
                  </div>
                  <div className="bg-surface-deep/50 border-border-theme-subtle/30 flex items-center justify-between rounded-xl border px-4 py-3">
                    <span className="text-text-theme-secondary text-sm">
                      Min Heat Sinks
                    </span>
                    <span className="text-2xl font-bold text-rose-400 tabular-nums">
                      10
                    </span>
                  </div>
                  <div className="bg-surface-deep/50 border-border-theme-subtle/30 flex items-center justify-between rounded-xl border px-4 py-3">
                    <span className="text-text-theme-secondary text-sm">
                      Max Head Armor
                    </span>
                    <span className="text-2xl font-bold text-cyan-400 tabular-nums">
                      9
                    </span>
                  </div>
                  <div className="bg-surface-deep/50 border-border-theme-subtle/30 flex items-center justify-between rounded-xl border px-4 py-3">
                    <span className="text-text-theme-secondary text-sm">
                      Structure Weight
                    </span>
                    <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                      10%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Construction Rules - Compact inline navigation */}
        <div
          className="order-1 xl:order-2 xl:col-span-3"
          data-testid="compendium-rules-section"
        >
          <div className="bg-surface-base/30 border-border-theme-subtle/50 rounded-2xl border p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-rose-500/20 p-2 text-rose-400">
                  <BookIcon />
                </div>
                <h3 className="text-text-theme-secondary text-sm font-semibold tracking-wider uppercase">
                  Construction Rules
                </h3>
              </div>
              <Link
                href="/compendium/rules"
                className="text-text-theme-muted hover:text-accent flex items-center gap-1 text-xs transition-colors"
              >
                View all
                <ArrowIcon className="h-3 w-3" />
              </Link>
            </div>

            <nav aria-label="Construction rules sections">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filteredSections.map((section) => (
                  <Link
                    key={section.id}
                    href={`/compendium/rules#${section.id}`}
                    className="group bg-surface-deep/40 hover:bg-surface-base/60 border-border-theme-subtle/30 hover:border-border-theme flex items-center gap-3 rounded-xl border px-4 py-3 transition-all"
                    data-testid={`rule-category-${section.id}`}
                  >
                    <span className="text-text-theme-muted flex-shrink-0 transition-colors group-hover:text-amber-400">
                      {section.icon}
                    </span>
                    <span className="text-text-theme-secondary group-hover:text-text-theme-primary text-sm transition-colors">
                      {section.title}
                    </span>
                  </Link>
                ))}
              </div>
            </nav>

            {/* Empty state when search yields no results */}
            {filteredSections.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-text-theme-secondary text-sm">
                  No sections match your search.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-accent hover:text-accent/80 mt-3 text-sm transition-colors"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-border-theme-subtle/30 border-t pt-8">
        <p className="text-text-theme-muted text-center text-xs">
          Rules reference based on BattleTech TechManual. For complete rules,
          consult the official rulebooks.
        </p>
      </footer>
    </CompendiumLayout>
  );
}
