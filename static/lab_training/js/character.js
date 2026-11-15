window.LabCharacter = class LabCharacter {
  constructor(config, assetConfig) {
    this.config = config;
    this.x = config.startX;
    this.y = config.startY;
    this.angle = 0;
    this.moving = false;
    this.animator = new SpriteAnimator(assetConfig.animations, assetConfig.basePath, config.animationFps);
    this.manualAnimation = false;
  }

  async load() {
    await this.animator.load();
    await new Promise(resolve=>{const image=new Image();image.onload=()=>{this.explorerImage=image;resolve();};image.onerror=()=>{console.warn('Astronauta novo indisponível; usando sprites originais.');resolve();};image.src='/assets/astronaut/explorer-v2.png';});
  }

  updateAnimation(delta) {
    if (!this.manualAnimation) this.animator.play(this.moving ? "run" : "idle");
    this.animator.update(delta);
  }

  playAnimation(name, options = {}) {
    this.manualAnimation = true;
    this.animator.play(name, {
      ...options,
      onComplete: () => {
        this.manualAnimation = false;
        if (options.onComplete) options.onComplete();
      }
    });
  }

  reset() {
    this.x = this.config.startX;
    this.y = this.config.startY;
    this.angle = 0;
    this.moving = false;
    this.manualAnimation = false;
    this.animator.play("idle");
  }
};
