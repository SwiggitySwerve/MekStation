import Link from 'next/link';
import { useRouter } from 'next/router';
/**
 * Pilot Creation Page
 * Simple page wrapper for the PilotCreationWizard component.
 */
import { useState, useCallback } from 'react';

import { PilotCreationWizard } from '@/components/pilots';
import { PageLayout, Card, Button } from '@/components/ui';

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
  const handleCreated = useCallback(
    (pilotId: string | null) => {
      if (pilotId) {
        // Navigate to the new pilot's detail page
        router.push(`/gameplay/pilots/${pilotId}`);
      } else {
        // If no ID (statblock pilot), go back to roster
        router.push('/gameplay/pilots');
      }
    },
    [router],
  );

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
        <Card variant="dark" className="py-12 text-center">
          <div className="bg-accent/10 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <svg
              className="text-accent h-10 w-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>

          <h2 className="text-text-theme-primary mb-2 text-xl font-bold">
            Create a New Pilot
          </h2>
          <p className="text-text-theme-secondary mx-auto mb-6 max-w-md">
            Use the wizard to create a new MechWarrior with customized skills,
            or generate one from templates.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button variant="primary" onClick={handleReopenWizard}>
              Open Creation Wizard
            </Button>
            <Link href="/gameplay/pilots">
              <Button variant="secondary">Return to Roster</Button>
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
