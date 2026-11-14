window.SpriteAnimator = class SpriteAnimator {
  constructor(animationConfig, basePath, fpsConfig) {
    this.animationConfig = animationConfig;
    this.basePath = basePath;
    this.fpsConfig = fpsConfig;
    this.sheets = new Map();
    this.current = "idle";
    this.frame = 0;
    this.elapsed = 0;
    this.loop = true;
    this.onComplete = null;
  }

  async load() {
    await Promise.all(Object.entries(this.animationConfig).map(([name, animation]) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const expectedWidth = animation.frameWidth * animation.frames;
          if (image.width !== expectedWidth || image.height !== animation.frameHeight) {
            reject(new Error(`Spritesheet ${animation.file}: esperado ${expectedWidth}x${animation.frameHeight}, recebido ${image.width}x${image.height}.`));
            return;
          }
          this.sheets.set(name, image);
          resolve();
        };
        image.onerror = () => reject(new Error(`Não foi possível carregar ${animation.file}.`));
        image.src = `${this.basePath}${animation.file}`;
      })
    ));
  }

  play(name, { loop, onComplete } = {}) {
    const animation = this.animationConfig[name];
    if (!animation) throw new Error(`Animação desconhecida: ${name}`);
    const shouldLoop = loop ?? animation.loop;
    if (this.current === name && this.loop === shouldLoop) return;
    this.current = name;
    this.frame = 0;
    this.elapsed = 0;
    this.loop = shouldLoop;
    this.onComplete = onComplete || null;
  }

  update(delta) {
    if (!this.sheets.has(this.current)) return;
    this.elapsed += delta;
    const frameDuration = 1 / (this.fpsConfig[this.current] || 8);
    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      const frameCount = this.animationConfig[this.current].frames;
      if (this.frame + 1 < frameCount) {
        this.frame += 1;
      } else if (this.loop) {
        this.frame = 0;
      } else {
        const complete = this.onComplete;
        this.onComplete = null;
        if (complete) complete();
        return;
      }
    }
  }

  getFrame() {
    return {
      image: this.sheets.get(this.current),
      ...this.animationConfig[this.current],
      index: this.frame
    };
  }
};
