import type { ComponentType } from 'react';

export interface MusicEntry {
  id: string;
  title: string | ((t: (key: string) => string) => string);
  description?: string | ((t: (key: string) => string) => string);
  icon: string;
  component: ComponentType<any>;
}

class MusicManager {
  private static instance: MusicManager;
  private registry: Map<string, MusicEntry> = new Map();

  static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  register(song: MusicEntry): void {
    if (this.registry.has(song.id)) {
      console.warn(`[MusicManager] Lab "${song.id}" is already registered.`);
    }
    this.registry.set(song.id, song);
  }

  getAll(): MusicEntry[] {
    return Array.from(this.registry.values());
  }

  get(id: string): MusicEntry | undefined {
    return this.registry.get(id);
  }
}

export default MusicManager.getInstance();