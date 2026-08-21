// src/utils/GameManager.ts
import Phaser from 'phaser';

class GameManager {
  private static instance: GameManager;
  public game: Phaser.Game | null = null;

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  init(parent: HTMLElement, width = 780, height = 560) {
    if (this.game) return; // 已初始化
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width,
      height,
      parent,
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [], // 初始无场景，后续动态添加
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      banner: false,
    };
    this.game = new Phaser.Game(config);
  }

  registerScene(key: string, sceneClass: typeof Phaser.Scene) {
    if (!this.game) throw new Error('Game not initialized');
    if (!this.game.scene.getScene(key)) {
      this.game.scene.add(key, sceneClass, false);
    }
  }

  startScene(key: string, data?: any) {
    if (!this.game) throw new Error('Game not initialized');
    this.game.scene.start(key, data);
  }

  destroy() {
    this.game?.destroy(true);
    this.game = null;
  }
}

export default GameManager.getInstance();