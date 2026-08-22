import type { ComponentType } from 'react';

export interface GameEntry {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  component: ComponentType<any>;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

class GameManager {
  private static instance: GameManager;
  private registry: Map<string, GameEntry> = new Map();

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  register(game: GameEntry): void {
    if (this.registry.has(game.id)) {
      console.warn(`[GameManager] Game "${game.id}" is already registered.`);
    }
    this.registry.set(game.id, game);
  }

  getAll(): GameEntry[] {
    return Array.from(this.registry.values());
  }

  get(id: string): GameEntry | undefined {
    return this.registry.get(id);
  }
}

export default GameManager.getInstance();