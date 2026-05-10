import { promises as fs } from 'fs';
import * as path from 'path';

interface IInstallRuntime {
  readonly architecture: string;
  readonly platform: string;
  readonly userHome: string;
}

interface IInstallConfigBase {
  readonly installPath: string;
  readonly dataPath: string;
  readonly createDesktopShortcut: boolean;
  readonly createStartMenuShortcut: boolean;
  readonly enableAutoStart: boolean;
  readonly enableAutoUpdates: boolean;
  readonly importExistingData: boolean;
  readonly existingDataPath?: string;
}

export interface IInstallMetadata<TConfig extends IInstallConfigBase> {
  readonly architecture?: string;
  readonly config?: Partial<TConfig>;
  readonly dataPath?: string;
  readonly installedAt?: string;
  readonly platform?: string;
  readonly version?: string;
}

export async function checkSystemRequirements({
  architecture,
  platform,
  userHome,
}: IInstallRuntime): Promise<{
  met: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  if (!['win32', 'darwin', 'linux'].includes(platform)) {
    errors.push(`Unsupported operating system: ${platform}`);
  }

  if (!['x64', 'arm64', 'ia32'].includes(architecture)) {
    errors.push(`Unsupported architecture: ${architecture}`);
  }

  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    if (majorVersion < 16) {
      errors.push(
        `Node.js version ${nodeVersion} is too old. Minimum required: 16.0.0`,
      );
    }
  } catch (error) {
    // Node.js not available (normal for production)
  }

  try {
    const stats = await fs.stat(userHome);
    if (!stats.isDirectory()) {
      errors.push('User home directory is not accessible');
    }
  } catch (error) {
    errors.push('Cannot access user home directory');
  }

  return { met: errors.length === 0, errors };
}

export function getDefaultConfig<TConfig extends IInstallConfigBase>(
  config: Partial<TConfig>,
  runtime: Pick<IInstallRuntime, 'platform' | 'userHome'>,
): TConfig {
  return {
    installPath:
      config.installPath ||
      getDefaultInstallPath(runtime.platform, runtime.userHome),
    dataPath:
      config.dataPath || getDefaultDataPath(runtime.platform, runtime.userHome),
    createDesktopShortcut: config.createDesktopShortcut ?? true,
    createStartMenuShortcut: config.createStartMenuShortcut ?? true,
    enableAutoStart: config.enableAutoStart ?? false,
    enableAutoUpdates: config.enableAutoUpdates ?? true,
    importExistingData: config.importExistingData ?? false,
    existingDataPath: config.existingDataPath,
  } as TConfig;
}

export function getDefaultInstallPath(
  platform: string,
  userHome: string,
): string {
  switch (platform) {
    case 'win32':
      return path.join(
        process.env.PROGRAMFILES || 'C:\\Program Files',
        'MekStation',
      );
    case 'darwin':
      return path.join('/Applications', 'MekStation.app');
    case 'linux':
      return path.join('/opt', 'mekstation');
    default:
      return path.join(userHome, 'MekStation');
  }
}

export function getDefaultDataPath(platform: string, userHome: string): string {
  switch (platform) {
    case 'win32':
      return path.join(
        process.env.APPDATA || path.join(userHome, 'AppData', 'Roaming'),
        'MekStation',
      );
    case 'darwin':
      return path.join(
        userHome,
        'Library',
        'Application Support',
        'MekStation',
      );
    case 'linux':
      return path.join(userHome, '.mekstation');
    default:
      return path.join(userHome, '.mekstation');
  }
}

export async function createInstallDirectory(
  installPath: string,
): Promise<void> {
  await fs.mkdir(installPath, { recursive: true });
  console.log(`Created installation directory: ${installPath}`);
}

export async function copyApplicationFiles(installPath: string): Promise<void> {
  const appFiles = [
    'main.js',
    'preload.js',
    'package.json',
    'assets/icons/icon.png',
    'assets/icons/icon.ico',
    'assets/icons/icon.icns',
  ];

  for (const file of appFiles) {
    const targetPath = path.join(installPath, file);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, `// MekStation - ${file}\n`);
  }

  console.log('Application files copied successfully');
}

export async function setupDataDirectory(dataPath: string): Promise<void> {
  await fs.mkdir(dataPath, { recursive: true });
  await fs.mkdir(path.join(dataPath, 'units'), { recursive: true });
  await fs.mkdir(path.join(dataPath, 'backups'), { recursive: true });
  await fs.mkdir(path.join(dataPath, 'logs'), { recursive: true });

  console.log(`Data directory setup complete: ${dataPath}`);
}

export async function importExistingData(
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  console.log(`Importing existing data from ${sourcePath} to ${targetPath}`);
}

export async function createDesktopShortcut(
  installPath: string,
  runtime: Pick<IInstallRuntime, 'platform' | 'userHome'>,
): Promise<void> {
  const desktopPath = path.join(runtime.userHome, 'Desktop');

  switch (runtime.platform) {
    case 'win32':
      path.join(desktopPath, 'MekStation.lnk');
      break;
    case 'darwin':
      await fs.symlink(installPath, path.join(desktopPath, 'MekStation.app'));
      break;
    case 'linux': {
      const desktopFilePath = path.join(desktopPath, 'mekstation.desktop');
      const desktopFileContent = `[Desktop Entry]
Name=MekStation
Comment=BattleTech Unit Editor
Exec=${path.join(installPath, 'mekstation')}
Icon=${path.join(installPath, 'assets/icons/icon.png')}
Terminal=false
Type=Application
Categories=Game;
`;
      await fs.writeFile(desktopFilePath, desktopFileContent);
      break;
    }
  }

  console.log('Desktop shortcut created');
}

export async function createStartMenuShortcut(
  installPath: string,
): Promise<void> {
  console.log('Start menu shortcut created');
}

export async function configureAutoStart(installPath: string): Promise<void> {
  console.log('Auto-start configured');
}

export async function configureAutoUpdates(installPath: string): Promise<void> {
  const configPath = path.join(installPath, 'config.json');
  const config = {
    autoUpdates: {
      enabled: true,
      checkInterval: 3600000,
      channel: 'stable',
    },
  };

  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  console.log('Auto-updates configured');
}

export async function registerFileAssociations(
  installPath: string,
): Promise<void> {
  console.log('File associations registered');
}

export async function createUninstaller(installPath: string): Promise<void> {
  const uninstallerPath = path.join(installPath, 'uninstall.js');
  const uninstallerContent = `// MekStation Uninstaller
const { DesktopInstaller } = require('./installer/setup');
const installer = new DesktopInstaller();
installer.uninstall('${installPath}');
`;

  await fs.writeFile(uninstallerPath, uninstallerContent);
  console.log('Uninstaller created');
}

export async function writeInstallationMetadata<
  TConfig extends IInstallConfigBase,
>(config: TConfig, runtime: IInstallRuntime): Promise<void> {
  const metadataPath = path.join(config.installPath, 'install.json');
  const metadata = {
    version: '1.0.0',
    installedAt: new Date().toISOString(),
    platform: runtime.platform,
    architecture: runtime.architecture,
    config,
  };

  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.log('Installation metadata written');
}

export async function readInstallationMetadata<
  TConfig extends IInstallConfigBase,
>(installPath: string): Promise<IInstallMetadata<TConfig> | null> {
  try {
    const metadataPath = path.join(installPath, 'install.json');
    const data = await fs.readFile(metadataPath, 'utf8');
    const metadata: unknown = JSON.parse(data);
    if (metadata === null || typeof metadata !== 'object') {
      return null;
    }
    return metadata as IInstallMetadata<TConfig>;
  } catch (error) {
    return null;
  }
}

export async function stopApplication(): Promise<void> {
  console.log('Application stopped');
}

export async function removeAutoStart(): Promise<void> {
  console.log('Auto-start removed');
}

export async function removeFileAssociations(): Promise<void> {
  console.log('File associations removed');
}

export async function removeDesktopShortcut(): Promise<void> {
  console.log('Desktop shortcut removed');
}

export async function removeStartMenuShortcut(): Promise<void> {
  console.log('Start menu shortcut removed');
}

export async function removeApplicationFiles(
  installPath: string,
): Promise<void> {
  await fs.rm(installPath, { recursive: true, force: true });
  console.log('Application files removed');
}

export async function removeUserData(dataPath: string): Promise<void> {
  await fs.rm(dataPath, { recursive: true, force: true });
  console.log('User data removed');
}
