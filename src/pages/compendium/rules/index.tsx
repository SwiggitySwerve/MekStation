/**
 * Construction Rules Page
 * Combined view of all construction rules with anchor navigation.
 */
import React, { useEffect, useState } from 'react';
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
const ruleSections: RuleSection[] = [
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
  {
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
];

// Accent color styles
const accentColorStyles: Record<AccentColor, { bg: string; text: string; border: string; navBg: string; navActive: string }> = {
  amber: { 
    bg: 'bg-amber-500/20', 
    text: 'text-amber-400', 
    border: 'border-amber-500/30',
    navBg: 'hover:bg-amber-500/10',
    navActive: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
  cyan: { 
    bg: 'bg-cyan-500/20', 
    text: 'text-cyan-400', 
    border: 'border-cyan-500/30',
    navBg: 'hover:bg-cyan-500/10',
    navActive: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  },
  emerald: { 
    bg: 'bg-emerald-500/20', 
    text: 'text-emerald-400', 
    border: 'border-emerald-500/30',
    navBg: 'hover:bg-emerald-500/10',
    navActive: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  rose: { 
    bg: 'bg-rose-500/20', 
    text: 'text-rose-400', 
    border: 'border-rose-500/30',
    navBg: 'hover:bg-rose-500/10',
    navActive: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  },
  violet: { 
    bg: 'bg-violet-500/20', 
    text: 'text-violet-400', 
    border: 'border-violet-500/30',
    navBg: 'hover:bg-violet-500/10',
    navActive: 'bg-violet-500/20 text-violet-400 border-violet-500/40',
  },
};

export default function ConstructionRulesPage(): React.ReactElement {
  const [activeSection, setActiveSection] = useState<string>('structure');

  // Handle initial hash on mount and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && ruleSections.find(s => s.id === hash)) {
        setActiveSection(hash);
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Intersection observer to update active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    );

    ruleSections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL hash without triggering scroll
      window.history.pushState(null, '', `#${sectionId}`);
      setActiveSection(sectionId);
    }
  };

  return (
    <CompendiumLayout
      title="CONSTRUCTION RULES"
      subtitle="Complete reference for BattleMech construction"
      breadcrumbs={[{ label: 'Construction Rules' }]}
    >
      {/* Sticky Anchor Navigation */}
      <nav 
        className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6 bg-surface-deep/95 backdrop-blur-sm border-b border-border-theme-subtle"
        aria-label="Section navigation"
      >
        <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-border-theme scrollbar-track-transparent pb-1">
          {ruleSections.map((section) => {
            const styles = accentColorStyles[section.accentColor];
            const isActive = activeSection === section.id;
            
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium
                  border transition-all duration-200
                  ${isActive 
                    ? styles.navActive 
                    : `border-border-theme-subtle text-text-theme-secondary ${styles.navBg}`
                  }
                `}
                aria-current={isActive ? 'true' : undefined}
              >
                {section.title}
              </button>
            );
          })}
        </div>
      </nav>

      {/* All Sections */}
      <div className="space-y-12">
        {ruleSections.map((section) => {
          const styles = accentColorStyles[section.accentColor];
          
          return (
            <section 
              key={section.id} 
              id={section.id}
              className="scroll-mt-24"
            >
              {/* Section Header */}
              <div className="mb-4">
                <h2 className={`text-xl font-bold ${styles.text}`}>
                  {section.title}
                </h2>
                <p className="text-text-theme-secondary text-sm mt-1">
                  {section.description}
                </p>
              </div>

              {/* Rule Items */}
              <div className="bg-surface-base/30 border border-border-theme-subtle rounded-xl overflow-hidden">
                <div className="divide-y divide-border-theme-subtle/50">
                  {section.items.map((item, index) => (
                    <article 
                      key={index} 
                      className="px-6 py-5 hover:bg-surface-base/30 transition-colors"
                    >
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
            </section>
          );
        })}
      </div>

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
