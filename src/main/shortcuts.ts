// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
    app, globalShortcut, webContents
} from 'electron';

import {
    ISessions
} from './sessions';

import {
    IService
} from './main';

import {
    AsyncRemote, asyncRemoteMain
} from '../asyncremote';

export
interface IShortcutManager {}

export
namespace IShortcutManager {

    export
    let zoomEvent: AsyncRemote.IEvent<void> = {
        id: 'KeyboardShortcutManager-zoom'
    };
}

/**
 * Interface for keyboard shortcuts recognized by the shortcut manager
 */
interface IKeyboardShortcut {
    accelerator: string;
    command: () => void;
}

class KeyboardShortcutManager implements IShortcutManager {

    /**
     * Create a new shortcut manager
     *
     * @param options - The application windows
     */
    constructor(sessions: ISessions) {
        this._sessions = sessions;

        this._sessions.on('session-ended', () => {
            if (!this._sessions.isAppFocused()) {
                this.disableShortcuts();
            }
        });

        app.on('browser-window-focus', (event: Event, window: Electron.BrowserWindow) => {
            if (!this._active) {
                this.enableShortcuts();
            }
        });

        app.on('browser-window-blur', (event: Event, window: Electron.BrowserWindow) => {
            if (!this._sessions.isAppFocused()) {
                this.disableShortcuts();
            }
        });

        app.on('window-all-closed', () => {
            this.disableShortcuts();
        });
    }

    copy() {
        webContents.getFocusedWebContents().copy();
    }

    paste() {
        webContents.getFocusedWebContents().paste();
    }

    cut() {
        webContents.getFocusedWebContents().cut();
    }

    zoomIn() {
        let contents = webContents.getFocusedWebContents();
        const zoom = contents.getZoomLevel();
        if (zoom >= 3) {
            return;
        }
        contents.setZoomLevel(zoom + 1);

        // Emit zoom event
        asyncRemoteMain.emitRemoteEvent(IShortcutManager.zoomEvent, undefined, contents);
    }

    zoomOut() {
        let contents = webContents.getFocusedWebContents();
        const zoom = contents.getZoomLevel();
        if (zoom <= -7) {
            return;
        }
        contents.setZoomLevel(zoom - 1);

        // Emit zoom event
        asyncRemoteMain.emitRemoteEvent(IShortcutManager.zoomEvent, undefined, contents);
    }

    quit() {
        app.quit();
    }

    /**
     * Enables all shortcuts
     */
    private enableShortcuts() {
        this._active = true;
        this._shortcuts.forEach( ({accelerator, command}) => {
            globalShortcut.register(accelerator, command);
        });
    }

    /**
     * Disables all shortcuts
     */
    private disableShortcuts() {
        this._active = false;
        globalShortcut.unregisterAll();
    }

    /**
     * Whether or not an application window exists and is in focus
     */
    private _active: boolean;

    /**
     * All application windows
     */
    private _sessions: ISessions;

    /**
     * The enabled shortcuts
     */
    private _shortcuts: IKeyboardShortcut[] = [
        {accelerator: 'CmdOrCtrl+c', command: this.copy.bind(this)},
        {accelerator: 'CmdOrCtrl+v', command: this.paste.bind(this)},
        {accelerator: 'CmdOrCtrl+x', command: this.cut.bind(this)},
        {accelerator: 'CmdOrCtrl+=', command: this.zoomIn.bind(this)},
        {accelerator: 'CmdOrCtrl+-', command: this.zoomOut.bind(this)},
        {accelerator: process.platform === 'darwin' ? 'Cmd+q' : (process.platform === 'win32' ? 'Alt+F4' : 'Ctrl+Shift+q'), command: this.quit.bind(this)}
    ];
}

let service: IService = {
    requirements: ['ISessions'],
    provides: 'IKeyboardManager',
    activate: (sessions: ISessions): IShortcutManager => {
        return new KeyboardShortcutManager(sessions);
    },
    autostart: true
};
export default service;
