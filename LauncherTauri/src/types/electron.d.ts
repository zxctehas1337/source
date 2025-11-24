export interface MinecraftLaunchOptions {
  username: string
  javaPath?: string
}

export interface MinecraftProgress {
  stage: string
  progress: number
  current?: string
}

export interface MinecraftLaunchResult {
  success: boolean
  error?: string
  process?: any
}

declare global {
  interface Window {
    electron: {
      minimize: () => void
      maximize: () => void
      close: () => void
      openExternal: (url: string) => void
      getAppPath: () => Promise<string>
      selectFolder: () => Promise<string | null>

      // Автообновление
      getAppVersion: () => Promise<string>
      checkForUpdates: () => Promise<any>
      downloadUpdate: () => Promise<any>
      installUpdate: () => Promise<any>

      // Minecraft Launcher
      launchMinecraft: (options: MinecraftLaunchOptions) => Promise<MinecraftLaunchResult>
      getMinecraftDir: () => Promise<string>
      getModsDir: () => Promise<string>
      openModsFolder: () => Promise<{ success: boolean; path: string }>

      // Client Installer
      checkClientInstalled: () => Promise<{ installed: boolean }>
      checkModInstalled: () => Promise<{ installed: boolean; version: string | null }>
      checkClientUpdate: (userId?: number) => Promise<{ success: boolean; data?: any; error?: string }>
      installClient: (userId?: number) => Promise<MinecraftLaunchResult>
      launchClient: (options: MinecraftLaunchOptions) => Promise<MinecraftLaunchResult>

      ipcRenderer: {
        on: (channel: string, listener: (...args: any[]) => void) => void
        removeListener: (channel: string, listener: (...args: any[]) => void) => void
        send: (channel: string, ...args: any[]) => void
        invoke: (channel: string, ...args: any[]) => Promise<any>
      }
    }
  }
}

export { }
