import React from 'react';

import { VaultIdentitySection } from '@/components/vault/VaultIdentitySection';

import { SettingsSection, SettingsSectionProps } from './SettingsShared';

export function VaultSettings({
  isExpanded,
  onToggle,
  onRef,
}: SettingsSectionProps): React.ReactElement {
  return (
    <SettingsSection
      id="vault"
      title="Vault & Sharing"
      description="Manage your vault identity for sharing content"
      isExpanded={isExpanded}
      onToggle={onToggle}
      onRef={onRef}
    >
      <VaultIdentitySection />
    </SettingsSection>
  );
}
