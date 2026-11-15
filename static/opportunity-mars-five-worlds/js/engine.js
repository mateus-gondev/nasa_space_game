/* Engine: estado do jogo, colisões, interação, atualização e ciclo de animação. */
window.MapEngine = class MapEngine {
  constructor({ canvas, config, map, onStateChange = () => {}, onInspect = () => {}, onTravel = () => {} }) {
    this.config = config;
    this.map = map;
    this.renderer = new MapRenderer(canvas, config, map);
    this.onStateChange = onStateChange;
    this.onInspect = onInspect;
    this.onTravel = onTravel;
    this.player = { x: config.player.startX, y: config.player.startY, angle: 0, moving: false };
    this.moodKey = map.weather || config.atmosphere.default;
    this.nearObject = null;
    this.inspectedObject = null;
    this.paused = false;
    this.running = false;
    this.lastFrame = 0;
    this.elapsed = 0;
    this.energy = 100;
    this.odometer = 0;
    this.collected = 0;
    this.savedAssets = new Map();
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
      const x0=this.player.x,y0=this.player.y;
      if (!this.collides(this.player.x + dx, this.player.y)) this.player.x += dx;
      if (!this.collides(this.player.x, this.player.y + dy)) this.player.y += dy;
      const moved=Math.hypot(this.player.x-x0,this.player.y-y0);
      this.odometer+=moved;
      this.energy=Math.max(3, this.energy-(this.map.weather==='storm'?.45:.14)*moved);
      if(moved>0 && this.map.weather==='storm')this.energy=Math.max(3,this.energy-delta*.4);
    }

    this.map.doors.forEach(door => {
      const distance = Math.hypot(this.player.x - door.x - .5, this.player.y - door.y - .5);
      const target = distance < 1.6 ? 1 : 0;
      door.openness += (target - door.openness) * Math.min(1, delta * 10);
    });

    const previous = this.nearObject;
    this.nearObject = this.findNearbyObject();
    if (previous !== this.nearObject) this.onStateChange(this.getState());
    const transition=this.map.transitions?.find(t=>this.player.x>=t.x&&this.player.x<=t.x+t.w&&this.player.y>=t.y&&this.player.y<=t.y+t.h);
    if(transition)this.onTravel(transition.target,transition.destinationSpawn);
  }

  collides(x, y) {
    const radius = this.config.player.collisionRadius;
    for (const [dx, dy] of [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]]) {
      const row = this.map.grid[Math.floor(y + dy)];
      if (!row || row[Math.floor(x + dx)] <= 1 || row[Math.floor(x + dx)] === undefined) return true;
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
    const target = [...this.map.props].reverse().find(prop => prop.name &&
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
    this.player.x = this.map.spawn?.[0] ?? this.config.player.startX;
    this.player.y = this.map.spawn?.[1] ?? this.config.player.startY;
    this.player.angle = 0;
    this.player.moving = false;
    this.moodKey = this.map.weather || this.config.atmosphere.default;
    this.energy = 100;
    this.paused = false;
    this.closeInspection();
    this.onStateChange(this.getState());
  }

  loadAsset(name, image) { this.savedAssets.set(name,image); this.renderer.setAsset(name, image); }

  setMap(map){
    if(!map)throw new Error('Mapa inexistente');
    this.closeInspection();
    this.map=map;
    this.player.x=map.spawn[0];this.player.y=map.spawn[1];this.player.angle=0;this.player.moving=false;
    const previous=this.renderer;
    this.renderer=new MapRenderer(previous.canvas,this.config,map);
    for(const [name,img] of this.savedAssets)this.renderer.setAsset(name,img);
    if(previous.staticCanvas){previous.staticCanvas.width=0;previous.staticCanvas.height=0;}
    this.nearObject=null;
    this.moodKey=map.weather;
    this.onStateChange(this.getState());
  }

  distanceTo(prop){
    if(!prop)return Infinity;
    const dx=Math.max(prop.x-this.player.x,0,this.player.x-prop.x-prop.w);
    const dy=Math.max(prop.y-this.player.y,0,this.player.y-prop.y-prop.h);
    return Math.hypot(dx,dy);
  }

  canAct(prop){return this.distanceTo(prop)<=this.config.interaction.distance;}

  restoreEnergy(amount){this.energy=Math.min(100,Math.max(0,this.energy+amount));this.onStateChange(this.getState());}

  getRoomName() {
    const tx = Math.floor(this.player.x), ty = Math.floor(this.player.y);
    const room = this.map.rooms.find(r => tx >= r.x1 && tx <= r.x2 && ty >= r.y1 && ty <= r.y2);
    return room ? room.name : "Transit";
  }

  getState() {
    return {
      room: this.getRoomName(), world: this.map.name, mood: this.mood.label,
      energy: Math.round(this.energy), odometer: this.odometer,
      position: `${this.player.x.toFixed(1)} / ${this.player.y.toFixed(1)}`,
      target: this.nearObject ? this.nearObject.name : "Nenhum objeto",
      paused: this.paused, atmosphere: this.moodKey
    };
  }
};
