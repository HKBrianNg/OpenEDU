import type { IpcRenderer, IpcRendererEvent } from 'electron';

type ExposedIpc = Pick<IpcRenderer, 'on' | 'off' | 'send' | 'invoke'>;

declare global {
  interface Window {
    ipcRenderer: ExposedIpc;
  }
}

export {};
