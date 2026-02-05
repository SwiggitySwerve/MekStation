import Link from 'next/link';
/**
 * Compendium Hub Page
 * Main entry point for equipment catalog, construction rules, and game mechanics.
 */
import React, { useState } from 'react';

import { CompendiumLayout } from '@/components/compendium';

interface RuleSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const ruleSections: RuleSection[] = [
  { id: 'structure', title: 'Structure', icon: <StructureIcon /> },
  { id: 'engine', title: 'Engine', icon: <LightningIcon /> },
  { id: 'armor', title: 'Armor', icon: <ShieldIcon /> },
  { id: 'heatsinks', title: 'Heat Sinks', icon: <FlameIcon /> },
  { id: 'gyro', title: 'Gyro', icon: <GyroIcon /> },
  { id: 'movement', title: 'Movement', icon: <RocketIcon /> },
  { id: 'criticals', title: 'Criticals', icon: <ListIcon /> },
];

export default function CompendiumPage(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sections based on search
  const filteredSections = ruleSections.filter((section) =>
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

      {/* Footer */}
      <footer className="border-border-theme-subtle/30 border-t pt-8">
        <p className="text-text-theme-muted text-center text-xs">
          Rules reference based on BattleTech TechManual. For complete rules,
          consult the official rulebooks.
        </p>
      </footer>
    </CompendiumLayout>
  );
}

// Icon Components
function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function EquipmentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
      />
    </svg>
  );
}

function StructureIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
      />
    </svg>
  );
}

function GyroIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    </svg>
  );
}

function MechIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l-4.5 4.5-3.3-3.3-3.3 3.3-4.5-4.5m0 0l-2.25 2.25M19.8 14.5l2.25 2.25"
      />
    </svg>
  );
}

function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}
