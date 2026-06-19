/**
 * Infantry Build Tab Component
 *
 * Configuration of infantry platoon settings, weapons, armor, and field guns.
 * Binds to InfantryMotive, IPlatoonComposition, weapon table, and field gun catalog.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import React from 'react';

import {
  useInfantryFieldGunControls,
  useInfantryIdentityControls,
  useInfantryPlatoonControls,
  useInfantryProtectionControls,
  useInfantryWeaponControls,
} from './InfantryBuildTab.logic';
import {
  InfantryIdentitySection,
  InfantryPlatoonConfigurationSection,
  InfantryWeaponsSection,
} from './InfantryBuildTab.sections';
import { InfantryFieldGunsSection } from './InfantryFieldGunsSection';
import { InfantryPlatoonCounter } from './InfantryPlatoonCounter';
import { InfantryProtectionSection } from './InfantryProtectionSection';
import { InfantryStatusBar } from './InfantryStatusBar';

interface InfantryBuildTabProps {
  readOnly?: boolean;
}

export function InfantryBuildTab({
  readOnly = false,
}: InfantryBuildTabProps): React.ReactElement {
  const identityControls = useInfantryIdentityControls(readOnly);
  const platoonControls = useInfantryPlatoonControls(readOnly);
  const weaponControls = useInfantryWeaponControls(
    readOnly,
    platoonControls.platoonStrength,
    platoonControls.allowHeavyPrimary,
  );
  const protectionControls = useInfantryProtectionControls(
    platoonControls.infantryMotive,
  );
  const fieldGunControls = useInfantryFieldGunControls(
    readOnly,
    platoonControls.infantryMotive,
  );

  return (
    <div className="space-y-6">
      <InfantryIdentitySection
        readOnly={readOnly}
        controls={identityControls}
      />
      <InfantryPlatoonConfigurationSection
        readOnly={readOnly}
        controls={platoonControls}
      />
      <InfantryWeaponsSection readOnly={readOnly} controls={weaponControls} />

      <InfantryProtectionSection
        readOnly={readOnly}
        armorKit={protectionControls.armorKit}
        armorKitOptions={protectionControls.armorKitOptions}
        specialization={protectionControls.specialization}
        specializationOptions={protectionControls.specializationOptions}
        hasAntiMechTraining={protectionControls.hasAntiMechTraining}
        showSneakSuitError={protectionControls.showSneakSuitError}
        setArmorKit={protectionControls.setArmorKit}
        setSpecialization={protectionControls.setSpecialization}
        setAntiMechTraining={protectionControls.setAntiMechTraining}
      />

      <InfantryFieldGunsSection
        readOnly={readOnly}
        canUseFieldGuns={fieldGunControls.canUseFieldGuns}
        fieldGuns={fieldGunControls.fieldGuns}
        addedFieldGunIds={fieldGunControls.addedFieldGunIds}
        catalog={fieldGunControls.catalog}
        onAddFieldGun={fieldGunControls.handleAddFieldGun}
        onRemoveFieldGun={fieldGunControls.handleRemoveFieldGun}
        onFieldGunAmmo={fieldGunControls.handleFieldGunAmmo}
      />

      <InfantryStatusBar
        platoonStrength={platoonControls.platoonStrength}
        groundMP={platoonControls.groundMP}
        jumpMP={platoonControls.jumpMP}
        fieldGuns={fieldGunControls.fieldGuns}
        armorKit={protectionControls.armorKit}
      />
      <InfantryPlatoonCounter />
    </div>
  );
}

export default InfantryBuildTab;
