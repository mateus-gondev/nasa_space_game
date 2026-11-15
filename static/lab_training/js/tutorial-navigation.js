/* Percurso por piso transitável, respeitando paredes e equipamentos. */
window.findTrainingRoute = (engine, target) => {
  if (!target) return [];
  const { width, height } = engine.map;
  const startX = Math.floor(engine.player.x), startY = Math.floor(engine.player.y);
  const start = startY * width + startX;
  const previous = new Map([[start, null]]);
  const queue = [start];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const cell = queue[cursor], x = cell % width, y = Math.floor(cell / width);
    const dx = Math.max(target.x - x - .5, 0, x + .5 - target.x - target.w);
    const dy = Math.max(target.y - y - .5, 0, y + .5 - target.y - target.h);
    if (Math.hypot(dx, dy) < engine.config.interaction.distance && !engine.collides(x + .5, y + .5)) {
      const path = [];
      for (let at = cell; at !== null; at = previous.get(at)) path.push({ x: at % width + .5, y: Math.floor(at / width) + .5 });
      return path.reverse();
    }
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const next = ny * width + nx;
      if (previous.has(next) || engine.collides(nx + .5, ny + .5)) continue;
      previous.set(next, cell);
      queue.push(next);
    }
  }
  return [];
};

// Extensão carregada apenas no Lab Training; a engine compartilhada não muda.
window.MapRenderer = class TrainingRenderer extends window.MapRenderer {
  getGuideRoute() {
    const target = this.map.props.find(prop => prop.trainingId === this.tutorial?.targetId);
    const key = `${this.tutorial?.targetId}:${Math.floor(this.engine.player.x)}:${Math.floor(this.engine.player.y)}`;
    if (key !== this.routeKey) {
      this.routeKey = key;
      this.guideRoute = window.findTrainingRoute(this.engine, target);
    }
    return { target, route: this.guideRoute || [] };
  }

  drawProp(prop, time, mood) {
    if (prop.type !== "launchEntrance") return super.drawProp(prop, time, mood);
    const ctx = this.ctx, tile = this.tile;
    const x = prop.x * tile, y = prop.y * tile, w = prop.w * tile;
    ctx.save();
    ctx.fillStyle = "#35c4d833";
    ctx.fillRect(x, y, w, tile);
    ctx.strokeStyle = "#77d8dc";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, w - 6, tile - 6);
    ctx.fillStyle = "#b9f4f5";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(window.GameI18n?.t("ENTRAR") || "ENTRAR", x + w / 2, y + tile / 2 + 4);
    ctx.restore();
  }

  drawPlayer(player, time) {
    this.ctx.save();
    if (this.tutorial?.phase === "gravityWalk" && player.moving) this.ctx.translate(0, -Math.abs(Math.sin(time * 3)) * 12);
    super.drawPlayer(player, time);
    this.ctx.restore();
  }

  render(state) {
    super.render(state);
    if (!this.tutorial || !this.engine) return;
    const { target, route } = this.getGuideRoute();
    const ctx = this.ctx, tile = this.tile;
    ctx.save();
    ctx.translate(-this.cam.x, -this.cam.y);
    if (route.length > 1) {
      ctx.strokeStyle = "#ff4040"; ctx.lineWidth = 3; ctx.setLineDash([5, 9]); ctx.lineDashOffset = -state.time * 18;
      ctx.beginPath();
      route.forEach((point, index) => ctx[index ? "lineTo" : "moveTo"](point.x * tile, point.y * tile));
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (target) {
      const pulse = 5 + Math.sin(state.time * 4) * 3;
      ctx.strokeStyle = "#ffca70"; ctx.fillStyle = "#ffb55222"; ctx.lineWidth = 3;
      ctx.shadowColor = "#ffb552"; ctx.shadowBlur = 14;
      ctx.fillRect(target.x * tile - pulse, target.y * tile - pulse, target.w * tile + pulse * 2, target.h * tile + pulse * 2);
      ctx.strokeRect(target.x * tile - pulse, target.y * tile - pulse, target.w * tile + pulse * 2, target.h * tile + pulse * 2);
      ctx.shadowBlur = 0; ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
      const labelX = (target.x + target.w / 2) * tile;
      const labelY = target.y * tile - 22;
      const source = target.type === "launchEntrance" ? "ENTRE NA SALA" : this.engine.nearObject === target ? "▼ E · INTERAGIR" : "▼ OBJETIVO";
      const label = window.GameI18n?.t(source) || source;
      ctx.fillStyle = "#07121bee"; ctx.fillRect(labelX - 80, labelY - 16, 160, 24);
      ctx.fillStyle = "#ffca70"; ctx.fillText(label, labelX, labelY);
    }
    if (this.tutorial.phase === "gravityWalk") {
      ctx.strokeStyle = "#74dfff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(state.player.x * tile, state.player.y * tile + 16, 26 + Math.sin(state.time * 4) * 5, 9, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
};
