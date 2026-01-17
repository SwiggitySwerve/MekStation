/**
 * Pilot Creation Page
 * Simple page wrapper for the PilotCreationWizard component.
 */
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { PageLayout, Card, Button } from '@/components/ui';
import { PilotCreationWizard } from '@/components/pilots';

// =============================================================================
// Main Page Component
// =============================================================================

export default function CreatePilotPage(): React.ReactElement {
  const router = useRouter();
  const [isWizardOpen, setIsWizardOpen] = useState(true);

  // Handle wizard close (back to roster)
  const handleClose = useCallback(() => {
    setIsWizardOpen(false);
    router.push('/gameplay/pilots');
  }, [router]);

  // Handle successful pilot creation
  const handleCreated = useCallback((pilotId: string | null) => {
    if (pilotId) {
      // Navigate to the new pilot's detail page
      router.push(`/gameplay/pilots/${pilotId}`);
    } else {
      // If no ID (statblock pilot), go back to roster
      router.push('/gameplay/pilots');
    }
  }, [router]);

  // Handle reopen wizard
  const handleReopenWizard = useCallback(() => {
    setIsWizardOpen(true);
  }, []);

  return (
    <PageLayout
      title="Create Pilot"
      subtitle="Add a new MechWarrior to your roster"
      backLink="/gameplay/pilots"
      backLabel="Back to Roster"
    >
      {/* Info Card shown when wizard is closed */}
      {!isWizardOpen && (
        <Card variant="dark" className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold text-text-theme-primary mb-2">
            Create a New Pilot
          </h2>
          <p className="text-text-theme-secondary mb-6 max-w-md mx-auto">
            Use the wizard to create a new MechWarrior with customized skills, 
            or generate one from templates.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button variant="primary" onClick={handleReopenWizard}>
              Open Creation Wizard
            </Button>
            <Link href="/gameplay/pilots">
              <Button variant="secondary">
                Return to Roster
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Creation Wizard Modal */}
      <PilotCreationWizard
        isOpen={isWizardOpen}
        onClose={handleClose}
        onCreated={handleCreated}
      />
    </PageLayout>
  );
}
