/**
 * Rule Section Detail Page
 * Displays detailed construction rules for a specific topic.
 */
import { useRouter } from 'next/router';
import { CompendiumLayout } from '@/components/compendium';
import type { AccentColor } from '@/components/ui';

interface RuleItem {
  title: string;
  content: string;
  formula?: string;
}

interface RuleSection {
  id: string;
  title: string;
  description: string;
  accentColor: AccentColor;
  items: RuleItem[];
}

// Rule section data
const ruleSections: Record<string, RuleSection> = {
  structure: {
    id: 'structure',
    title: 'Internal Structure',
    description: 'Structure types and weight calculations',
    accentColor: 'amber',
    items: [
      {
        title: 'Standard Structure',
        content: 'The default internal structure type. Weight equals 10% of total tonnage.',
        formula: 'Weight = Tonnage × 0.10',
      },
      {
        title: 'Endo Steel',
        content: 'Lighter structure using advanced materials. Weight equals 5% of total tonnage. Requires 14 critical slots (IS) or 7 slots (Clan).',
        formula: 'Weight = Tonnage × 0.05',
      },
      {
        title: 'Composite Structure',
        content: 'Lighter but fragile structure. Weight equals 5% of total tonnage. Takes double internal damage from crits.',
        formula: 'Weight = Tonnage × 0.05',
      },
      {
        title: 'Reinforced Structure',
        content: 'Heavier but more durable. Weight equals 20% of total tonnage. Takes half internal damage.',
        formula: 'Weight = Tonnage × 0.20',
      },
    ],
  },
  engine: {
    id: 'engine',
    title: 'Engine',
    description: 'Engine types and rating calculations',
    accentColor: 'amber',
    items: [
      {
        title: 'Engine Rating',
        content: 'Determines movement capability. Walking MP × Tonnage = Engine Rating.',
        formula: 'Rating = Walk MP × Tonnage',
      },
      {
        title: 'Fusion Engine (Standard)',
        content: 'The baseline engine. Uses the standard weight table and occupies 6 critical slots in center torso.',
      },
      {
        title: 'XL Engine',
        content: 'Half the weight of standard. Also occupies 3 slots in each side torso. Destruction of side torso destroys mech.',
      },
      {
        title: 'Light Engine',
        content: '75% the weight of standard. Occupies 2 slots in each side torso. More survivable than XL.',
      },
      {
        title: 'Compact Engine',
        content: '150% the weight of standard but only uses 3 center torso slots instead of 6.',
      },
    ],
  },
  armor: {
    id: 'armor',
    title: 'Armor',
    description: 'Armor types and maximum allocations',
    accentColor: 'rose',
    items: [
      {
        title: 'Maximum Armor Formula',
        content: 'Maximum armor points per location equals 2× the internal structure points. Head maximum is always 9.',
        formula: 'Max = Structure × 2 (Head = 9)',
      },
      {
        title: 'Standard Armor',
        content: '16 points per ton. No critical slots required.',
        formula: 'Weight = Points ÷ 16',
      },
      {
        title: 'Ferro-Fibrous Armor',
        content: 'IS: 17.92 points/ton (14 slots). Clan: 19.2 points/ton (7 slots).',
      },
      {
        title: 'Light Ferro-Fibrous',
        content: '16.96 points per ton. Requires 7 critical slots. Inner Sphere only.',
      },
      {
        title: 'Heavy Ferro-Fibrous',
        content: '24.32 points per ton. Requires 21 critical slots. Inner Sphere only.',
      },
    ],
  },
  heatsinks: {
    id: 'heatsinks',
    title: 'Heat Sinks',
    description: 'Heat management and dissipation',
    accentColor: 'rose',
    items: [
      {
        title: 'Minimum Heat Sinks',
        content: 'All mechs require at least 10 heat sinks.',
      },
      {
        title: 'Engine Integral Heat Sinks',
        content: 'First (Engine Rating ÷ 25) heat sinks are included in the engine, no additional weight or slots.',
        formula: 'Free HS = Rating ÷ 25',
      },
      {
        title: 'Single Heat Sinks',
        content: 'Dissipate 1 heat per turn. 1 ton and 1 critical slot each.',
      },
      {
        title: 'Double Heat Sinks',
        content: 'Dissipate 2 heat per turn. 1 ton each. IS: 3 slots, Clan: 2 slots (1 if engine integral).',
      },
    ],
  },
  gyro: {
    id: 'gyro',
    title: 'Gyro',
    description: 'Gyro types and stability',
    accentColor: 'amber',
    items: [
      {
        title: 'Standard Gyro',
        content: 'Weight = ceiling(Engine Rating ÷ 100). Occupies 4 critical slots in center torso.',
        formula: 'Weight = ⌈Rating ÷ 100⌉',
      },
      {
        title: 'Compact Gyro',
        content: '150% the weight of standard but only occupies 2 critical slots.',
      },
      {
        title: 'Heavy-Duty Gyro',
        content: '200% the weight of standard. Survives 2 critical hits before destruction.',
      },
      {
        title: 'XL Gyro',
        content: '50% the weight of standard but occupies 6 critical slots.',
      },
    ],
  },
  movement: {
    id: 'movement',
    title: 'Movement',
    description: 'Movement points and jump jets',
    accentColor: 'emerald',
    items: [
      {
        title: 'Running MP',
        content: 'Running MP = Walking MP × 1.5 (round up)',
        formula: 'Run MP = ⌈Walk MP × 1.5⌉',
      },
      {
        title: 'Standard Jump Jets',
        content: 'Light mechs: 0.5t each. Medium mechs: 1t each. Heavy mechs: 1t each. Assault mechs: 2t each.',
      },
      {
        title: 'Improved Jump Jets',
        content: 'Double the weight of standard jump jets but can jump farther (2× max jump MP).',
      },
      {
        title: 'MASC',
        content: 'Allows running at 2× walking speed for 1 turn. Weight = Rating ÷ 20 (IS) or Rating ÷ 25 (Clan).',
      },
    ],
  },
  criticals: {
    id: 'criticals',
    title: 'Critical Slots',
    description: 'Critical slot allocation by location',
    accentColor: 'cyan',
    items: [
      {
        title: 'Head',
        content: '6 critical slots. Contains: Life Support, Sensors, Cockpit (2 slots each).',
      },
      {
        title: 'Center Torso',
        content: '12 critical slots. Contains: Engine (6 slots), Gyro (4 slots). 2 slots free.',
      },
      {
        title: 'Side Torsos',
        content: '12 critical slots each. Left and Right. May contain engine components for XL/Light engines.',
      },
      {
        title: 'Arms',
        content: '12 critical slots each. Contains: Shoulder, Upper Arm Actuator. Optional: Lower Arm, Hand.',
      },
      {
        title: 'Legs',
        content: '6 critical slots each. Contains: Hip, Upper Leg, Lower Leg, Foot actuators.',
      },
    ],
  },
};

// Accent color styles
const accentColorStyles: Record<AccentColor, { bg: string; text: string; border: string }> = {
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
};

export default function RuleSectionPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;

  // Handle loading state
  if (!id || typeof id !== 'string') {
    return (
      <CompendiumLayout
        title="Loading..."
        breadcrumbs={[{ label: 'Rules' }]}
      >
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </CompendiumLayout>
    );
  }

  const section = ruleSections[id];

  // Handle not found
  if (!section) {
    return (
      <CompendiumLayout
        title="Not Found"
        breadcrumbs={[{ label: 'Rules' }]}
      >
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-text-theme-primary mb-2">Rule Section Not Found</h2>
          <p className="text-text-theme-secondary mb-4">The requested rule section does not exist.</p>
          <a
            href="/compendium"
            className="text-accent hover:text-accent/80 transition-colors"
          >
            Return to Compendium
          </a>
        </div>
      </CompendiumLayout>
    );
  }

  const styles = accentColorStyles[section.accentColor];

  return (
    <CompendiumLayout
      title={section.title}
      subtitle={section.description}
      breadcrumbs={[
        { label: 'Rules', href: '/compendium' },
        { label: section.title },
      ]}
    >
      {/* Rule Items */}
      <div className="bg-surface-base/30 border border-border-theme-subtle rounded-xl overflow-hidden">
        <div className="divide-y divide-border-theme-subtle/50">
          {section.items.map((item, index) => (
            <article key={index} className="px-6 py-5 hover:bg-surface-base/30 transition-colors">
              <h3 className={`font-semibold ${styles.text} mb-2`}>
                {item.title}
              </h3>
              <p className="text-text-theme-primary/80 text-sm leading-relaxed">
                {item.content}
              </p>
              {item.formula && (
                <div className="mt-3 inline-block px-3 py-1.5 bg-surface-raised/50 rounded-lg font-mono text-sm text-cyan-400 border border-border-theme/50">
                  {item.formula}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </CompendiumLayout>
  );
}
