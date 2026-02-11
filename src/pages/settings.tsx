/**
 * Settings Page
 *
 * App configuration and preferences.
 *
 * Appearance settings use a draft/preview system:
 * - Changes are applied immediately for live preview
 * - Changes are NOT persisted until the user clicks "Save"
 * - Navigating away without saving reverts to previous values
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState, useRef, useCallback } from 'react';

import {
  AppearanceSettings,
  CustomizerSettings,
  VaultSettings,
  P2PSyncSettings,
  UIBehaviorSettings,
  AccessibilitySettings,
  AuditSettings,
  ResetSettings,
  QuickNavigation,
  isValidSectionId,
  type SectionId,
} from '@/components/settings';
import { PageLayout } from '@/components/ui';
import { useAppSettingsStore } from '@/stores/useAppSettingsStore';

export default function SettingsPage(): React.ReactElement {
  const router = useRouter();

  const [_hasMounted, setHasMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('appearance');

  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    appearance: null,
    customizer: null,
    vault: null,
    'p2p-sync': null,
    'ui-behavior': null,
    accessibility: null,
    audit: null,
    reset: null,
  });

  useEffect(() => {
    setHasMounted(true);

    const handleHashChange = (shouldScroll = true) => {
      const hash = window.location.hash.replace('#', '');
      if (hash && isValidSectionId(hash)) {
        setActiveSection(hash);
        if (shouldScroll) {
          setTimeout(() => {
            const element = sectionRefs.current[hash];
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }
      }
    };

    const hash = window.location.hash.replace('#', '');
    if (hash && isValidSectionId(hash)) {
      setActiveSection(hash);
      setTimeout(() => {
        const element = sectionRefs.current[hash];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }

    const onHashChange = () => handleHashChange(true);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateToSection = useCallback((sectionId: SectionId) => {
    window.history.pushState(null, '', `#${sectionId}`);
    setActiveSection(sectionId);

    setTimeout(() => {
      const element = sectionRefs.current[sectionId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }, []);

  const toggleSection = useCallback(
    (sectionId: SectionId) => {
      if (activeSection === sectionId) {
        navigateToSection(sectionId);
      } else {
        navigateToSection(sectionId);
      }
    },
    [activeSection, navigateToSection],
  );

  const revertAppearance = useAppSettingsStore((s) => s.revertAppearance);
  const revertCustomizer = useAppSettingsStore((s) => s.revertCustomizer);

  useEffect(() => {
    const handleRouteChange = () => {
      revertAppearance();
      revertCustomizer();
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events, revertAppearance, revertCustomizer]);

  const createSectionRef = (id: SectionId) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <>
      <Head>
        <title>Settings | MekStation</title>
      </Head>

      <PageLayout
        title="Settings"
        subtitle="Customize your MekStation experience"
        maxWidth="narrow"
      >
        <QuickNavigation
          activeSection={activeSection}
          onNavigate={navigateToSection}
        />

        <div className="space-y-4 pb-8">
          <AppearanceSettings
            isExpanded={activeSection === 'appearance'}
            onToggle={() => toggleSection('appearance')}
            onRef={createSectionRef('appearance')}
          />

          <CustomizerSettings
            isExpanded={activeSection === 'customizer'}
            onToggle={() => toggleSection('customizer')}
            onRef={createSectionRef('customizer')}
          />

          <VaultSettings
            isExpanded={activeSection === 'vault'}
            onToggle={() => toggleSection('vault')}
            onRef={createSectionRef('vault')}
          />

          <P2PSyncSettings
            isExpanded={activeSection === 'p2p-sync'}
            onToggle={() => toggleSection('p2p-sync')}
            onRef={createSectionRef('p2p-sync')}
          />

          <UIBehaviorSettings
            isExpanded={activeSection === 'ui-behavior'}
            onToggle={() => toggleSection('ui-behavior')}
            onRef={createSectionRef('ui-behavior')}
          />

          <AccessibilitySettings
            isExpanded={activeSection === 'accessibility'}
            onToggle={() => toggleSection('accessibility')}
            onRef={createSectionRef('accessibility')}
          />

          <AuditSettings
            isExpanded={activeSection === 'audit'}
            onToggle={() => toggleSection('audit')}
            onRef={createSectionRef('audit')}
          />

          <ResetSettings
            isExpanded={activeSection === 'reset'}
            onToggle={() => toggleSection('reset')}
            onRef={createSectionRef('reset')}
          />
        </div>
      </PageLayout>
    </>
  );
}
