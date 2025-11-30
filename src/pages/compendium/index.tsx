/**
 * Rules Compendium Page
 * Reference for BattleTech construction rules and game mechanics.
 */
import Link from 'next/link';

interface RuleSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items: RuleItem[];
}

interface RuleItem {
  title: string;
  content: string;
  formula?: string;
}

const ruleSections: RuleSection[] = [
  {
    id: 'structure',
    title: 'Internal Structure',
    description: 'Structure types and weight calculations',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      </svg>
    ),
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    ),
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

export default function CompendiumPage() {
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Rules Compendium</h1>
          <p className="text-slate-400">
            Quick reference for BattleTech TechManual construction rules
          </p>
        </div>

        {/* Navigation */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {ruleSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors text-sm"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>

        {/* Rule Sections */}
        <div className="space-y-8">
          {ruleSections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden scroll-mt-6"
            >
              {/* Section Header */}
              <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-600/20 text-rose-400">
                    {section.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                    <p className="text-slate-400 text-sm">{section.description}</p>
                  </div>
                </div>
              </div>

              {/* Section Items */}
              <div className="divide-y divide-slate-700/50">
                {section.items.map((item, index) => (
                  <div key={index} className="px-6 py-4">
                    <h3 className="font-medium text-amber-400 mb-1">{item.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{item.content}</p>
                    {item.formula && (
                      <div className="mt-2 inline-block px-3 py-1 bg-slate-700/50 rounded font-mono text-sm text-cyan-400">
                        {item.formula}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Source Reference */}
        <div className="mt-12 bg-slate-800/30 border border-slate-700 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">
            Rules reference based on BattleTech TechManual.
            <br />
            For complete rules, consult the official rulebooks.
          </p>
        </div>
      </div>
    </div>
  );
}
