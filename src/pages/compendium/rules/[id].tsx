/**
 * Rule Section Detail Page - Redirect
 * Redirects to the combined construction rules page with anchor.
 */
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

// Valid rule section IDs for validation
const validSectionIds = ['structure', 'engine', 'armor', 'heatsinks', 'gyro', 'movement', 'criticals'];

export default function RuleSectionRedirect(): React.ReactElement | null {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (typeof id === 'string') {
      // Validate section ID and redirect to combined page with anchor
      if (validSectionIds.includes(id)) {
        router.replace(`/compendium/rules#${id}`);
      } else {
        // Invalid section - redirect to rules index
        router.replace('/compendium/rules');
      }
    }
  }, [id, router]);

  // Show nothing while redirecting
  return null;
}
