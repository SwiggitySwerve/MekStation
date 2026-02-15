import { useCallback, useState } from 'react';

interface UseCampaignWizardNavigationOptions {
  stepCount: number;
  campaignName: string;
}

interface UseCampaignWizardNavigationResult {
  currentStep: number;
  localError: string | null;
  setLocalError: (value: string | null) => void;
  handleNext: () => void;
  handleBack: () => void;
}

export function useCampaignWizardNavigation({
  stepCount,
  campaignName,
}: UseCampaignWizardNavigationOptions): UseCampaignWizardNavigationResult {
  const [currentStep, setCurrentStep] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleNext = useCallback(() => {
    setLocalError(null);

    if (currentStep === 0 && !campaignName.trim()) {
      setLocalError('Campaign name is required');
      return;
    }

    setCurrentStep((previous) => Math.min(previous + 1, stepCount - 1));
  }, [campaignName, currentStep, stepCount]);

  const handleBack = useCallback(() => {
    setCurrentStep((previous) => Math.max(previous - 1, 0));
  }, []);

  return {
    currentStep,
    localError,
    setLocalError,
    handleNext,
    handleBack,
  };
}
