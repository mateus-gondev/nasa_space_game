/* Engine: estado do jogo, colisões, interação, atualização e ciclo de animação. */
window.MapEngine = class MapEngine {
  constructor({ canvas, config, map, onStateChange = () => {}, onInspect = () => {} }) {
    this.config = config;
    this.map = map;
    this.renderer = new MapRenderer(canvas, config, map);
    this.onStateChange = onStateChange;
    this.onInspect = onInspect;
    this.player = { x: config.player.startX, y: config.player.startY, angle: 0, moving: false };
    this.moodKey = config.atmosphere.default;
    this.nearObject = null;
    this.inspectedObject = null;
    this.paused = false;
    this.running = false;
    this.lastFrame = 0;
    this.elapsed = 0;
    this.controls = new MapControls(this);
    this.frame = timestamp => this.loop(timestamp);
  }

  get mood() { return this.config.atmosphere.presets[this.moodKey]; }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrame = 0;
    requestAnimationFrame(this.frame);
  }

  stop() { this.running = false; }

  loop(timestamp) {
    if (!this.running) return;
    const delta = this.lastFrame ? Math.min(.05, (timestamp - this.lastFrame) / 1000) : 0;
    this.lastFrame = timestamp;
    if (!this.paused) {
      this.elapsed += delta;
      this.update(delta);
      this.renderer.render({ time: this.elapsed, player: this.player, mood: this.mood, nearObject: this.nearObject, doors: this.map.doors });
    }
    requestAnimationFrame(this.frame);
  }

  update(delta) {
    const movement = this.controls.getMovement();
    this.player.moving = Boolean(movement.x || movement.y);
    if (this.player.moving) {
      const length = Math.hypot(movement.x, movement.y);
      const velocity = this.config.player.speed * delta;
      const dx = movement.x / length * velocity;
      const dy = movement.y / length * velocity;
      this.player.angle = Math.atan2(dy, dx);
      if (!this.collides(this.player.x + dx, this.player.y)) this.player.x += dx;
      if (!this.collides(this.player.x, this.player.y + dy)) this.player.y += dy;
    }

    this.map.doors.forEach(door => {
      const distance = Math.hypot(this.player.x - door.x - .5, this.player.y - door.y - .5);
      const target = distance < 1.6 ? 1 : 0;
      door.openness += (target - door.openness) * Math.min(1, delta * 10);
    });

    const previous = this.nearObject;
    this.nearObject = this.findNearbyObject();
    if (previous !== this.nearObject) this.onStateChange(this.getState());
  }

  collides(x, y) {
    const radius = this.config.player.collisionRadius;
    for (const [dx, dy] of [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]]) {
      const row = this.map.grid[Math.floor(y + dy)];
      if (!row || row[Math.floor(x + dx)] === 1 || row[Math.floor(x + dx)] === undefined) return true;
    }
    return this.map.props.some(prop => prop.solid !== false &&
      x + radius > prop.x + .06 && x - radius < prop.x + prop.w - .06 &&
      y + radius > prop.y + .06 && y - radius < prop.y + prop.h - .06);
  }

  findNearbyObject() {
    let closest = null;
    let closestDistance = this.config.interaction.distance;
    this.map.props.forEach(prop => {
      if (!prop.name) return;
      const dx = Math.max(prop.x - this.player.x, 0, this.player.x - prop.x - prop.w);
      const dy = Math.max(prop.y - this.player.y, 0, this.player.y - prop.y - prop.h);
      const distance = Math.hypot(dx, dy);
      if (distance < closestDistance) { closestDistance = distance; closest = prop; }
    });
    return closest;
  }

  inspectNearby() {
    if (this.inspectedObject) { this.closeInspection(); return; }
    if (!this.nearObject) return;
    this.inspectedObject = this.nearObject;
    this.onInspect(this.inspectedObject);
    this.onStateChange(this.getState());
  }

  inspectObjectAt(x, y) {
    const target = [...this.map.props].reverse().find(prop =>
      x >= prop.x && x <= prop.x + prop.w && y >= prop.y && y <= prop.y + prop.h
    );
    if (target) {
      this.inspectedObject = target;
      this.onInspect(target);
      this.onStateChange(this.getState());
    }
  }

  closeInspection() {
    if (!this.inspectedObject) return;
    this.inspectedObject = null;
    this.onInspect(null);
    this.onStateChange(this.getState());
  }

  setAtmosphere(name) {
    if (!this.config.atmosphere.presets[name]) throw new Error(`Atmosfera desconhecida: ${name}`);
    this.moodKey = name;
    this.onStateChange(this.getState());
  }

  goToRoom(name) {
    const destination = this.map.destinations.find(room => room.name === name);
    if (!destination) throw new Error(`Sala não encontrada: ${name}`);
    this.player.x = destination.x;
    this.player.y = destination.y;
    this.player.moving = false;
    this.closeInspection();
    this.onStateChange(this.getState());
  }

  setPaused(value = !this.paused) {
    this.paused = Boolean(value);
    this.onStateChange(this.getState());
  }

  reset() {
    this.player.x = this.config.player.startX;
    this.player.y = this.config.player.startY;
    this.player.angle = 0;
    this.player.moving = false;
    this.moodKey = this.config.atmosphere.default;
    this.paused = false;
    this.closeInspection();
    this.onStateChange(this.getState());
  }

  loadAsset(name, image) { this.renderer.setAsset(name, image); }

  getRoomName() {
    const x = this.player.x, y = this.player.y;
    if (y < 8 && x < 11) return "Mission Control";
    if (y < 8 && x >= 11) return "Instrument Lab";
    if (y >= 11 && x < 12) return "Rover Bay";
    if (y >= 11 && x < 19) return "Storage";
    if (y >= 11) return "Power";
    return "Transit";
  }

  getState() {
    return {
      room: this.getRoomName(), mood: this.mood.label,
      position: `${this.player.x.toFixed(1)} / ${this.player.y.toFixed(1)}`,
      target: this.nearObject ? this.nearObject.name : "Nenhum objeto",
      paused: this.paused, atmosphere: this.moodKey
    };
  }
};
