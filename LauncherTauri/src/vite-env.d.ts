/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface MinecraftLaunchOptions {
  username: string
  javaPath?: string
}

interface MinecraftProgress {
  stage: string
  progress: number
  current?: string
  message?: string
}

interface MinecraftLaunchResult {
  success: boolean
  error?: string
  process?: any
}

interface Window {
  electron?: {
    minimize: () => void
    maximize: () => void
    close: () => void
    openExternal: (url: string) => void
    getAppPath: () => Promise<string>
    selectFolder: () => Promise<string | null>
    
    // Auto-update methods
    getAppVersion: () => Promise<string>
    checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>
    downloadUpdate: () => Promise<{ success: boolean; error?: string }>
    installUpdate: () => Promise<{ success: boolean }>
    
    // Minecraft Launcher
    launchMinecraft: (options: MinecraftLaunchOptions) => Promise<MinecraftLaunchResult>
    getMinecraftDir: () => Promise<string>
    getModsDir: () => Promise<string>
    openModsFolder: () => Promise<{ success: boolean; path: string }>
    
    // Client Installer
    checkClientInstalled: () => Promise<{ installed: boolean }>
    checkModInstalled: () => Promise<{ installed: boolean }>
    installClient: () => Promise<{ success: boolean; error?: string }>
    launchClient: (options: MinecraftLaunchOptions) => Promise<MinecraftLaunchResult>
    
    ipcRenderer: {
      on: (channel: string, listener: (...args: any[]) => void) => void
      removeListener: (channel: string, listener: (...args: any[]) => void) => void
      send: (channel: string, ...args: any[]) => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}
