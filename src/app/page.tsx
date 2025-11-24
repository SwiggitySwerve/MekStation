import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">BattleTech Unit Customizer</h1>
      <p className="text-slate-400 text-sm">Jump into the Mech Customizer experience.</p>
      <Link
        href="/customizer"
        className="px-4 py-2 bg-blue-600 rounded text-white text-sm font-semibold hover:bg-blue-500 transition-colors"
      >
        Open Customizer
      </Link>
    </main>
  );
}
