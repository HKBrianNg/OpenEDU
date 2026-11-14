/// <reference types="vite/client" />

import type { IpcRenderer } from 'electron';

declare global {
  interface Window {
    ipcRenderer: IpcRenderer;
  }
}

export {};