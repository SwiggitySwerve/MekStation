/**
 * MekStation - Desktop Installation Setup
 *
 * This script provides automated installation and configuration
 * for the MekStation desktop application.
 */

import { spawn } from 'child_process';
import * as os from 'os';

import {
  checkSystemRequirements,
  configureAutoStart,
  configureAutoUpdates,
  copyApplicationFiles,
  createDesktopShortcut,
  createInstallDirectory,
  createStartMenuShortcut,
  createUninstaller,
  getDefaultConfig,
  importExistingData,
  readInstallationMetadata,
  registerFileAssociations,
  removeApplicationFiles,
  removeAutoStart,
  removeDesktopShortcut,
  removeFileAssociations,
  removeStartMenuShortcut,
  removeUserData,
  setupDataDirectory,
  stopApplication,
  writeInstallationMetadata,
} from './setup.helpers';

/**
 * Installation configuration
 */
interface IInstallConfig {
  readonly installPath: string;
  readonly dataPath: string;
  readonly createDesktopShortcut: boolean;
  readonly createStartMenuShortcut: boolean;
  readonly enableAutoStart: boolean;
  readonly enableAutoUpdates: boolean;
  readonly importExistingData: boolean;
  readonly existingDataPath?: string;
}

/**
 * Installation result
 */
interface IInstallResult {
  readonly success: boolean;
  readonly message: string;
  readonly errors: string[];
  readonly warnings: string[];
  readonly installPath?: string;
}

/**
 * Desktop installer class
 */
export class DesktopInstaller {
  private readonly platform: string;
  private readonly architecture: string;
  private readonly userHome: string;
  private readonly tempDir: string;

  constructor() {
    this.platform = process.platform;
    this.architecture = process.arch;
    this.userHome = os.homedir();
    this.tempDir = os.tmpdir();
  }

  /**
   * Install the MekStation desktop application
   */
  async install(config: Partial<IInstallConfig> = {}): Promise<IInstallResult> {
    const installConfig = getDefaultConfig<IInstallConfig>(config, {
      platform: this.platform,
      userHome: this.userHome,
    });
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('Starting MekStation installation...');

      const requirements = await checkSystemRequirements({
        architecture: this.architecture,
        platform: this.platform,
        userHome: this.userHome,
      });
      if (!requirements.met) {
        return {
          success: false,
          message: 'System requirements not met',
          errors: requirements.errors,
          warnings,
        };
      }

      await createInstallDirectory(installConfig.installPath);
      await copyApplicationFiles(installConfig.installPath);
      await setupDataDirectory(installConfig.dataPath);

      if (installConfig.importExistingData && installConfig.existingDataPath) {
        try {
          await importExistingData(
            installConfig.existingDataPath,
            installConfig.dataPath,
          );
        } catch (error) {
          warnings.push(`Failed to import existing data: ${error}`);
        }
      }

      if (installConfig.createDesktopShortcut) {
        try {
          await createDesktopShortcut(installConfig.installPath, {
            platform: this.platform,
            userHome: this.userHome,
          });
        } catch (error) {
          warnings.push(`Failed to create desktop shortcut: ${error}`);
        }
      }

      if (installConfig.createStartMenuShortcut) {
        try {
          await createStartMenuShortcut(installConfig.installPath);
        } catch (error) {
          warnings.push(`Failed to create start menu shortcut: ${error}`);
        }
      }

      if (installConfig.enableAutoStart) {
        try {
          await configureAutoStart(installConfig.installPath);
        } catch (error) {
          warnings.push(`Failed to configure auto-start: ${error}`);
        }
      }

      if (installConfig.enableAutoUpdates) {
        try {
          await configureAutoUpdates(installConfig.installPath);
        } catch (error) {
          warnings.push(`Failed to configure auto-updates: ${error}`);
        }
      }

      try {
        await registerFileAssociations(installConfig.installPath);
      } catch (error) {
        warnings.push(`Failed to register file associations: ${error}`);
      }

      await createUninstaller(installConfig.installPath);
      await writeInstallationMetadata(installConfig, {
        architecture: this.architecture,
        platform: this.platform,
        userHome: this.userHome,
      });

      console.log('MekStation installation completed successfully!');

      return {
        success: true,
        message: 'Installation completed successfully',
        errors,
        warnings,
        installPath: installConfig.installPath,
      };
    } catch (error) {
      console.error('Installation failed:', error);

      return {
        success: false,
        message: `Installation failed: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings,
      };
    }
  }

  /**
   * Uninstall the MekStation desktop application
   */
  async uninstall(
    installPath: string,
    removeUserDataFlag: boolean = false,
  ): Promise<IInstallResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log('Starting MekStation uninstallation...');

      const metadata =
        await readInstallationMetadata<IInstallConfig>(installPath);

      await stopApplication();

      try {
        await removeAutoStart();
      } catch (error) {
        warnings.push(`Failed to remove auto-start: ${error}`);
      }

      try {
        await removeFileAssociations();
      } catch (error) {
        warnings.push(`Failed to remove file associations: ${error}`);
      }

      try {
        await removeDesktopShortcut();
        await removeStartMenuShortcut();
      } catch (error) {
        warnings.push(`Failed to remove shortcuts: ${error}`);
      }

      await removeApplicationFiles(installPath);

      const userDataPath = metadata?.dataPath ?? metadata?.config?.dataPath;
      if (removeUserDataFlag && userDataPath) {
        try {
          await removeUserData(userDataPath);
        } catch (error) {
          warnings.push(`Failed to remove user data: ${error}`);
        }
      }

      console.log('MekStation uninstallation completed successfully!');

      return {
        success: true,
        message: 'Uninstallation completed successfully',
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Uninstallation failed:', error);

      return {
        success: false,
        message: `Uninstallation failed: ${error}`,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings,
      };
    }
  }
}

/**
 * Command line interface
 */
if (require.main === module) {
  const installer = new DesktopInstaller();
  const action = process.argv[2];

  switch (action) {
    case 'install':
      installer.install().then((result) => {
        console.log(result.message);
        process.exit(result.success ? 0 : 1);
      });
      break;
    case 'uninstall': {
      const installPath = process.argv[3];
      if (!installPath) {
        console.error('Install path required for uninstall');
        process.exit(1);
      }
      installer.uninstall(installPath).then((result) => {
        console.log(result.message);
        process.exit(result.success ? 0 : 1);
      });
      break;
    }
    default:
      console.log('Usage: node setup.js [install|uninstall] [install-path]');
      process.exit(1);
  }
}

export type { IInstallConfig, IInstallResult };
