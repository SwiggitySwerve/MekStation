import type { Decorator } from "@storybook/react";

import React, { ReactNode, useEffect } from "react";

import { useCustomizerSettingsStore } from "../../src/stores/useCustomizerSettingsStore";
import {
  useNavigationStore,
  PanelId,
} from "../../src/stores/useNavigationStore";

interface ZustandProviderProps {
  children: ReactNode;
  navigationState?: {
    currentPanel?: PanelId;
    canGoBack?: boolean;
    canGoForward?: boolean;
  };
  appSettings?: {
    armorDiagramMode?: "schematic" | "silhouette";
  };
}

export function ZustandProvider({
  children,
  navigationState,
  appSettings,
}: ZustandProviderProps): React.ReactElement {
  useEffect(() => {
    if (navigationState?.currentPanel) {
      useNavigationStore.setState({
        currentPanel: navigationState.currentPanel,
        canGoBack: navigationState.canGoBack ?? false,
        canGoForward: navigationState.canGoForward ?? false,
      });
    }
  }, [navigationState]);

  useEffect(() => {
    if (appSettings?.armorDiagramMode) {
      useCustomizerSettingsStore.setState({
        armorDiagramMode: appSettings.armorDiagramMode,
      });
    }
  }, [appSettings]);

  return <>{children}</>;
}

export const ZustandDecorator: Decorator = (Story, context) => {
  const { zustand } = context.parameters || {};

  useEffect(() => {
    return () => {
      useNavigationStore.getState().resetNavigation();
    };
  }, []);

  return (
    <ZustandProvider
      navigationState={zustand?.navigation}
      appSettings={zustand?.appSettings}
    >
      <Story />
    </ZustandProvider>
  );
};
