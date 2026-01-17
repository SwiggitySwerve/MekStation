/**
 * Compendium Hub Page
 * Main entry point for equipment catalog, construction rules, and game mechanics.
 */
import React, { useState } from 'react';
import {
  Card,
  CategoryCard,
} from '@/components/ui';
import type { AccentColor } from '@/components/ui';
import { CompendiumLayout } from '@/components/compendium';

interface RuleSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: AccentColor;
}

const ruleSections: RuleSection[] = [
  {
    id: 'structure',
    title: 'Internal Structure',
    description: 'Structure types and weight calculations',
    icon: <StructureIcon />,
    accentColor: 'amber',
  },
  {
    id: 'engine',
    title: 'Engine',
    description: 'Engine types and rating calculations',
    icon: <LightningIcon />,
    accentColor: 'amber',
  },
  {
    id: 'armor',
    title: 'Armor',
    description: 'Armor types and maximum allocations',
    icon: <ShieldIcon />,
    accentColor: 'rose',
  },
  {
    id: 'heatsinks',
    title: 'Heat Sinks',
    description: 'Heat management and dissipation',
    icon: <FlameIcon />,
    accentColor: 'rose',
  },
  {
    id: 'gyro',
    title: 'Gyro',
    description: 'Gyro types and stability',
    icon: <GyroIcon />,
    accentColor: 'amber',
  },
  {
    id: 'movement',
    title: 'Movement',
    description: 'Movement points and jump jets',
    icon: <RocketIcon />,
    accentColor: 'emerald',
  },
  {
    id: 'criticals',
    title: 'Critical Slots',
    description: 'Critical slot allocation by location',
    icon: <ListIcon />,
    accentColor: 'cyan',
  },
];

export default function CompendiumPage(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sections based on search
  const filteredSections = ruleSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Header actions with search
  const headerActions = (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-theme-secondary" />
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9 pr-4 py-2 bg-surface-base/50 border border-border-theme-subtle rounded-lg text-sm text-text-theme-primary placeholder-text-theme-secondary focus:outline-none focus:border-accent transition-colors w-48"
      />
    </div>
  );

  return (
    <CompendiumLayout
      title="COMPENDIUM"
      subtitle="Equipment catalog, construction rules, and game mechanics"
      breadcrumbs={[]}
      headerActions={headerActions}
    >
      {/* Units Section */}
      <section className="mb-8">
        <h2 className="text-category-label text-text-theme-secondary mb-4">UNITS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CategoryCard
            icon={<MechIcon />}
            title="Unit Database"
            subtitle="Browse BattleMechs, vehicles, aerospace, and more"
            href="/compendium/units"
            accentColor="emerald"
          />
        </div>
      </section>

      {/* Equipment Section */}
      <section className="mb-8">
        <h2 className="text-category-label text-text-theme-secondary mb-4">EQUIPMENT</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CategoryCard
            icon={<EquipmentIcon />}
            title="Equipment Catalog"
            subtitle="Browse weapons, electronics, and mech components"
            href="/compendium/equipment"
            accentColor="cyan"
          />
        </div>
      </section>

      {/* Rules Section */}
      <section className="mb-8">
        <h2 className="text-category-label text-text-theme-secondary mb-4">CONSTRUCTION RULES</h2>
        <nav aria-label="Construction rules sections">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSections.map((section) => (
              <CategoryCard
                key={section.id}
                icon={section.icon}
                title={section.title}
                subtitle={section.description}
                href={`/compendium/rules/${section.id}`}
                accentColor={section.accentColor}
              />
            ))}
          </div>
        </nav>

        {/* Empty state when search yields no results */}
        {filteredSections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-theme-secondary">No sections match your search.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-accent hover:text-accent/80 transition-colors"
            >
              Clear search
            </button>
          </div>
        )}
      </section>

      {/* Quick Reference Stats */}
      <Card variant="dark" className="mt-8">
        <h3 className="text-category-label text-text-theme-secondary mb-4">Quick Reference</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-surface-raised/30 rounded-lg p-3">
            <div className="text-text-theme-secondary">Total Critical Slots</div>
            <div className="text-2xl font-bold text-text-theme-primary mt-1">78</div>
          </div>
          <div className="bg-surface-raised/30 rounded-lg p-3">
            <div className="text-text-theme-secondary">Min Heat Sinks</div>
            <div className="text-2xl font-bold text-text-theme-primary mt-1">10</div>
          </div>
          <div className="bg-surface-raised/30 rounded-lg p-3">
            <div className="text-text-theme-secondary">Max Head Armor</div>
            <div className="text-2xl font-bold text-text-theme-primary mt-1">9</div>
          </div>
          <div className="bg-surface-raised/30 rounded-lg p-3">
            <div className="text-text-theme-secondary">Structure Weight</div>
            <div className="text-2xl font-bold text-text-theme-primary mt-1">10%</div>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <footer className="mt-16 text-center">
        <p className="text-text-theme-muted text-sm">
          Rules reference based on BattleTech TechManual.
          <br />
          For complete rules, consult the official rulebooks.
        </p>
      </footer>
    </CompendiumLayout>
  );
}

// Icon Components
function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function EquipmentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function StructureIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    </svg>
  );
}

function GyroIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function MechIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5l-4.5 4.5-3.3-3.3-3.3 3.3-4.5-4.5m0 0l-2.25 2.25M19.8 14.5l2.25 2.25" />
    </svg>
  );
}
