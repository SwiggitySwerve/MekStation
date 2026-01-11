/**
 * MekStation - Home Dashboard
 * Central navigation hub with quick access to all sections and system stats.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SystemStats {
  unitCount: number;
  equipmentCount: number;
  loading: boolean;
  error: string | null;
}

interface NavigationCard {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}

const navigationCards: NavigationCard[] = [
  {
    href: '/units',
    title: 'Unit Database',
    description: 'Browse canonical BattleMechs, vehicles, and more',
    accent: 'from-amber-600 to-orange-700',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859" />
      </svg>
    ),
  },
  {
    href: '/equipment',
    title: 'Equipment Catalog',
    description: 'Explore weapons, electronics, and miscellaneous gear',
    accent: 'from-cyan-600 to-blue-700',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    href: '/customizer',
    title: 'Unit Customizer',
    description: 'Build and modify your own custom BattleMech variants',
    accent: 'from-emerald-600 to-teal-700',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/compare',
    title: 'Unit Comparison',
    description: 'Compare multiple units side-by-side',
    accent: 'from-violet-600 to-purple-700',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    href: '/compendium',
    title: 'Rules Compendium',
    description: 'Reference construction rules and game mechanics',
    accent: 'from-rose-600 to-red-700',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
];

export default function HomePage(): React.ReactElement {
  const [stats, setStats] = useState<SystemStats>({
    unitCount: 0,
    equipmentCount: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const [unitsRes, equipmentRes] = await Promise.all([
          fetch('/api/catalog'),
          fetch('/api/equipment/catalog'),
        ]);

        const unitsData = await unitsRes.json() as { count?: number };
        const equipmentData = await equipmentRes.json() as { count?: number };

        setStats({
          unitCount: unitsData.count || 0,
          equipmentCount: equipmentData.count || 0,
          loading: false,
          error: null,
        });
      } catch {
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load stats',
        }));
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-deep via-surface-base to-surface-deep">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background grid pattern - uses accent color */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: 'linear-gradient(var(--accent-primary) 1px, transparent 1px), linear-gradient(90deg, var(--accent-primary) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative px-6 py-16 sm:px-12 lg:px-20">
          <div className="max-w-7xl mx-auto">
            {/* Title Section */}
            <div className="text-center mb-16">
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-4">
                <span className="text-accent">
                  MekStation
                </span>
              </h1>
              <p className="text-text-theme-secondary text-lg max-w-2xl mx-auto">
                Your comprehensive toolkit for browsing, building, and customizing BattleMech units.
                Built with TechManual-accurate construction rules.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-lg mx-auto mb-16">
              <div className="bg-surface-base/50 backdrop-blur border border-border-theme-subtle rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-accent mb-1">
                  {stats.loading ? (
                    <span className="inline-block w-16 h-8 bg-surface-raised rounded animate-pulse" />
                  ) : (
                    stats.unitCount.toLocaleString()
                  )}
                </div>
                <div className="text-text-theme-secondary text-sm uppercase tracking-wide">Canonical Units</div>
              </div>
              <div className="bg-surface-base/50 backdrop-blur border border-border-theme-subtle rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-accent mb-1">
                  {stats.loading ? (
                    <span className="inline-block w-16 h-8 bg-surface-raised rounded animate-pulse" />
                  ) : (
                    stats.equipmentCount.toLocaleString()
                  )}
                </div>
                <div className="text-text-theme-secondary text-sm uppercase tracking-wide">Equipment Items</div>
              </div>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {navigationCards.map((card) => (
                <Link key={card.href} href={card.href}>
                  <div className="group relative bg-surface-base/40 backdrop-blur border border-border-theme-subtle/50 rounded-2xl p-6 h-full transition-all duration-300 hover:border-border-theme hover:bg-surface-base/60 hover:shadow-xl hover:shadow-accent/10 cursor-pointer">
                    {/* Gradient accent bar */}
                    <div className={`absolute top-0 left-6 right-6 h-1 bg-gradient-to-r ${card.accent} rounded-b-full opacity-60 group-hover:opacity-100 transition-opacity`} />

                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${card.accent} text-white shadow-lg`}>
                        {card.icon}
                      </div>
                      <div className="flex-1 pt-1">
                        <h3 className="text-lg font-semibold text-text-theme-primary group-hover:text-accent transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-text-theme-secondary text-sm mt-1 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <div className="absolute bottom-4 right-4 text-text-theme-muted group-hover:text-accent transition-all group-hover:translate-x-1">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Footer info */}
            <div className="text-center mt-16 text-text-theme-muted text-sm">
              <p>
                Powered by OpenSpec-driven development
                <span className="mx-2">•</span>
                <span className="text-text-theme-muted">v0.1.0</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
