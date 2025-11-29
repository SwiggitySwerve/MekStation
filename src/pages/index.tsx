/**
 * BattleTech Editor - Landing Page
 * Temporary stub while core specs are being implemented
 */

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-6 text-amber-400">
          BattleTech Editor
        </h1>
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-amber-600/30">
          <h2 className="text-xl font-semibold mb-4 text-amber-300">
            🔧 Under Construction
          </h2>
          <p className="text-gray-300 mb-4">
            Core systems are being rebuilt using spec-driven development.
            The editor UI will be available once the foundation is complete.
          </p>
          <div className="text-sm text-gray-400 space-y-1">
            <p>✓ Phase 1: Foundation Types - In Progress</p>
            <p>○ Phase 2: Construction Systems - Pending</p>
            <p>○ Phase 3: Equipment Data - Pending</p>
            <p>○ Phase 4: Validation Rules - Pending</p>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          See <code className="text-amber-400">openspec/changes/</code> for implementation specs
        </p>
      </div>
    </div>
  );
}
