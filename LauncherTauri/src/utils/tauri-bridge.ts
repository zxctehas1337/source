import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-shell';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { appDataDir } from '@tauri-apps/api/path';
import { listen } from '@tauri-apps/api/event';

console.log('Initializing Tauri Bridge...');

const electronAPI = {
    minimize: () => getCurrentWindow().minimize(),
    maximize: () => getCurrentWindow().toggleMaximize(),
    close: () => getCurrentWindow().close(),
    openExternal: (url: string) => open(url),
    getAppPath: () => appDataDir(),
    selectFolder: async () => {
        const selected = await openDialog({ directory: true });
        return selected;
    },

    // Auto-updater
    getAppVersion: async () => "1.0.0",
    checkForUpdates: async () => null,
    downloadUpdate: async () => { },
    installUpdate: async () => { },

    // Minecraft Launcher
    launchMinecraft: (options: any) => invoke('launch_minecraft', { options }),
    getLaunchDir: () => invoke('get_launch_dir'),
    openLaunchFolder: async () => {
        await invoke('open_launch_folder');
        return { success: true, path: '' };
    },

    // Client Installer
    checkClientInstalled: async () => {
        const result: any = await invoke('check_mods_installed');
        return { installed: result.installed };
    },
    checkModInstalled: async () => {
        const result: any = await invoke('check_mods_installed');
        return { installed: result.installed, version: result.version };
    },
    checkClientUpdate: async (userId?: number) => {
        const result: any = await invoke('check_client_updates', { userId: userId || null });
        return result;
    },
    installClient: async (userId?: number) => {
        const result: any = await invoke('install_mods', { userId: userId || null });
        return result;
    },
    launchClient: (options: any) => invoke('launch_minecraft', { options }),
    getClientDirs: () => invoke('get_client_dirs'),

    ipcRenderer: {
        on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
            console.log(`Listening for event: ${channel}`);
            listen(channel, (event) => {
                // console.log(`Received event ${channel}:`, event);
                listener({ sender: {} }, event.payload);
            });
        },
        removeListener: (_channel: string, _listener: any) => {
            console.warn('removeListener not fully implemented in bridge');
        },
        send: (channel: string, ...args: any[]) => {
            console.log(`Sending IPC message: ${channel}`, args);
        },
        invoke: (channel: string, ...args: any[]) => {
            console.log(`Invoking IPC channel: ${channel}`, args);

            // Map Electron IPC channels to Tauri commands
            if (channel === 'start-oauth-server') {
                return invoke('start_oauth_server', ...args);
            }
            if (channel === 'stop-oauth-server') {
                return invoke('stop_oauth_server', ...args);
            }

            return invoke(channel, ...args);
        }
    }
};

// @ts-ignore
window.electron = electronAPI;

export default electronAPI;
