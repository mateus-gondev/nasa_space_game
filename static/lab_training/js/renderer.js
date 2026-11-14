/* Renderer: desenha o cenário, objetos, personagem e efeitos de atmosfera. */
window.MapRenderer = class MapRenderer {
  constructor(canvas, config, map) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.config = config;
    this.map = map;
    this.tile = config.grid.tileSize;
    this.logicalWidth = map.width * this.tile;
    this.logicalHeight = map.height * this.tile;
    this.renderScale = config.rendering.pixelated ? config.rendering.renderScale || .5 : 1;
    this.assets = new Map();
    this.time = 0;
    canvas.width = Math.round(this.logicalWidth * this.renderScale);
    canvas.height = Math.round(this.logicalHeight * this.renderScale);
    this.ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
    this.ctx.imageSmoothingEnabled = !config.rendering.pixelated;
    this.staticCanvas = document.createElement("canvas");
    this.staticCanvas.width = canvas.width;
    this.staticCanvas.height = canvas.height;
    this.staticContext = this.staticCanvas.getContext("2d");
    this.staticContext.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
    this.staticContext.imageSmoothingEnabled = !config.rendering.pixelated;
    this.randomMarks = this.createAtmosphereMarks();
    this.drawStaticMap();
  }

  createAtmosphereMarks() {
    let seed = 7;
    const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    return Array.from({ length: 65 }, () => ({
      x: random() * this.logicalWidth,
      y: random() * this.logicalHeight,
      radius: 14 + random() * 42,
      alpha: .04 + random() * .12
    }));
  }

  async loadAssets() {
    const assets = Object.entries(this.config.assets.props || {});
    await Promise.all(assets.map(([name, source]) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { this.assets.set(name, image); resolve(); };
      image.onerror = () => reject(new Error(`Não foi possível carregar o asset: ${source}`));
      image.src = source;
    })));
  }

  setAsset(name, image) {
    this.assets.set(name.toLowerCase(), image);
    this.drawStaticMap();
  }

  drawStaticMap() {
    const ctx = this.staticContext;
    const previous = this.ctx;
    this.ctx = ctx;
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        if (this.map.grid[y][x] === 1) this.drawWall(x, y);
        else this.drawFloor(x, y);
      }
    }
    this.drawDoorsBase();
    this.drawFloorMarkings();
    this.drawRoomLabels();
    this.ctx = previous;
  }

  drawFloor(x, y) {
    const ctx = this.ctx;
    const tile = this.tile;
    const px = x * tile, py = y * tile;
    const floorType = this.map.floorMap[y][x] || 0;
    const custom = this.assets.get(`floor${floorType}`);
    if (custom) { ctx.drawImage(custom, px, py, tile, tile); return; }
    const fills = this.config.colors.floors;
    const lines = this.config.colors.floorLines;
    ctx.fillStyle = fills[floorType];
    ctx.fillRect(px, py, tile, tile);
    ctx.strokeStyle = lines[floorType];
    ctx.lineWidth = 1;
    ctx.strokeRect(px + .5, py + .5, tile - 1, tile - 1);
    if (this.config.rendering.showFloorDetails && floorType === 2) {
      ctx.beginPath();
      for (let i = 8; i < tile; i += 8) {
        ctx.moveTo(px + i, py); ctx.lineTo(px, py + i);
        ctx.moveTo(px + tile, py + i); ctx.lineTo(px + i, py + tile);
      }
      ctx.stroke();
    }
    if (floorType === 0 || floorType === 1) {
      ctx.fillStyle = lines[floorType];
      [[4,4],[tile-4,4],[4,tile-4],[tile-4,tile-4]].forEach(([dx,dy]) => {
        ctx.beginPath(); ctx.arc(px + dx, py + dy, 1.4, 0, Math.PI * 2); ctx.fill();
      });
    }
    if (floorType === 3) {
      ctx.strokeStyle = "rgba(77,208,255,.12)";
      ctx.strokeRect(px + 6.5, py + 6.5, tile - 13, tile - 13);
    }
  }

  drawWall(x, y) {
    const ctx = this.ctx, tile = this.tile;
    const px = x * tile, py = y * tile;
    const below = this.map.grid[y + 1] && [2, 3].includes(this.map.grid[y + 1][x]);
    if (!below) {
      ctx.fillStyle = this.config.colors.wallTop; ctx.fillRect(px, py, tile, tile);
      ctx.strokeStyle = "#8b96a1"; ctx.strokeRect(px + .5, py + .5, tile - 1, tile - 1);
      ctx.fillStyle = "#d4dbe2"; ctx.fillRect(px + 4, py + 4, tile - 8, tile - 8);
      return;
    }
    ctx.fillStyle = this.config.colors.wallSide; ctx.fillRect(px, py, tile, tile);
    ctx.fillStyle = this.config.colors.wallTop; ctx.fillRect(px, py, tile, 11);
    ctx.fillStyle = "#8b96a1"; ctx.fillRect(px, py + 11, tile, 2);
    ctx.strokeStyle = this.config.colors.wallLine;
    ctx.beginPath(); ctx.moveTo(px + .5, py + 13); ctx.lineTo(px + .5, py + tile);
    ctx.moveTo(px + tile / 2, py + 13); ctx.lineTo(px + tile / 2, py + tile); ctx.stroke();
    ctx.fillStyle = "#2b343d"; ctx.fillRect(px + 6, py + tile - 9, tile - 12, 4);
  }

  drawDoorsBase() {
    const ctx = this.ctx, tile = this.tile;
    this.map.doors.forEach(door => {
      ctx.fillStyle = "#222a31";
      if (door.vertical) {
        ctx.fillRect(door.x * tile, door.y * tile, tile, 4);
        ctx.fillRect(door.x * tile, door.y * tile + tile - 4, tile, 4);
      } else {
        ctx.fillRect(door.x * tile, door.y * tile, 4, tile);
        ctx.fillRect(door.x * tile + tile - 4, door.y * tile, 4, tile);
      }
    });
  }

  drawFloorMarkings() {
    const ctx = this.ctx, tile = this.tile;
    ctx.lineWidth = 6; ctx.strokeStyle = "#14171a";
    ctx.strokeRect(3.4 * tile, 12.4 * tile, 5.2 * tile, 3.7 * tile);
    ctx.strokeStyle = "#f5c518"; ctx.setLineDash([10, 10]);
    ctx.strokeRect(3.4 * tile, 12.4 * tile, 5.2 * tile, 3.7 * tile); ctx.setLineDash([]);
  }

  drawRoomLabels() {
    if (!this.config.rendering.showRoomLabels) return;
    const ctx = this.ctx, tile = this.tile;
    ctx.font = "bold 9px monospace"; ctx.textAlign = "left";
    this.map.roomLabels.forEach(({ text, x, y }) => {
      const width = ctx.measureText(text).width + 12;
      ctx.fillStyle = "#10161d"; ctx.beginPath(); ctx.roundRect(x * tile, y * tile + 16, width, 15, 3); ctx.fill();
      ctx.fillStyle = "#7fe3ff"; ctx.fillText(text, x * tile + 6, y * tile + 27);
    });
  }

  drawRoundedRect(x, y, w, h, fill, stroke = "#3a4654", radius = 4) {
    const ctx = this.ctx;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  drawProp(prop, time, mood) {
    const ctx = this.ctx, tile = this.tile;
    const x = prop.x * tile, y = prop.y * tile, w = prop.w * tile, h = prop.h * tile;
    const image = this.assets.get(prop.type);
    ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(x + 3, y + 6, w, h);
    if (image) { ctx.drawImage(image, x, y, w, h); return; }
    const accent = mood.accent;
    const drawAsset = (name, px, py, size = 22, frame = 0) => {
      const sprite = this.assets.get(name);
      if (!sprite) return;
      const frames = Math.max(1, Math.floor(sprite.width / 16));
      ctx.drawImage(sprite, (frame % frames) * 16, 0, 16, 16, px, py, size, size);
    };
    switch (prop.type) {
      case "screen":
        this.drawRoundedRect(x, y + 2, w, h - 4, "#0d1319");
        this.drawRoundedRect(x + 4, y + 6, w - 8, h - 12, "#06223d", null, 2);
        ctx.globalAlpha = .8; ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= w - 76; i += 4) { const yy = y + h / 2 + Math.sin((i + time * 70) / 14) * 7; i ? ctx.lineTo(x + 56 + i, yy) : ctx.moveTo(x + 56 + i, yy); }
        ctx.stroke(); ctx.globalAlpha = 1; break;
      case "console":
        this.drawRoundedRect(x, y + 8, w, h - 8, "#56677a", "#37444f", 5);
        for (let k = 0; k < prop.w; k++) {
          this.drawRoundedRect(x + 8 + k * tile, y + 2, 24, 15, "#10161d", null, 2);
          ctx.fillStyle = k % 2 ? accent : "#9bff9b"; ctx.fillRect(x + 11 + k * tile, y + 5, 18, 2);
          ctx.fillRect(x + 11 + k * tile, y + 10, 10, 2);
        } break;
      case "rover":
        for (const sx of [x + 1, x + w - 17]) for (let k = 0; k < 3; k++) this.drawRoundedRect(sx, y + 8 + k * (h - 34) / 2, 16, 24, "#1b1f24", "#555", 4);
        this.drawRoundedRect(x + 16, y + 12, w - 32, h - 30, "#cfd5db", "#8a949e", 7);
        this.drawRoundedRect(x + 23, y + 19, w - 46, h - 44, "#17306b", null, 2);
        drawAsset("rockShards", x + w / 2 - 14, y + h / 2 - 12, 28, 2);
        ctx.fillStyle = "#8a949e"; ctx.fillRect(x + w - 38, y + 2, 5, 22);
        this.drawRoundedRect(x + w - 46, y, 22, 9, "#2b343d", null, 3); break;
      case "crate":
        this.drawRoundedRect(x + 2, y + 3, w - 4, h - 6, "#5f7385", "#37444f");
        ctx.fillStyle = "#4a5b6b"; ctx.fillRect(x + 8, y + 3, 5, h - 6); ctx.fillRect(x + w - 13, y + 3, 5, h - 6);
        const packs = Math.max(1, Math.floor(prop.w / .9));
        for (let i = 0; i < packs; i++) drawAsset("energyPack", x + 9 + i * (w - 40) / Math.max(1, packs - 1), y + h / 2 - 11, 22);
        break;
      case "spec":
        this.drawRoundedRect(x + 4, y + 8, w - 8, h - 12, "#8c96a2", "#5a6470", 8);
        const gradient = ctx.createRadialGradient(x + w / 2 - 4, y + h / 2 - 4, 2, x + w / 2, y + h / 2, w * .3);
        gradient.addColorStop(0, "#eef3f8"); gradient.addColorStop(1, "#66717d");
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w * .28, 0, Math.PI * 2); ctx.fill();
        drawAsset("diamond", x + w / 2 - 9, y + h / 2 - 9, 18);
        ctx.fillStyle = "#ff5252"; ctx.fillRect(x + w - 15, y + 13, 5, 5);
        ctx.fillStyle = "#1a2128"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.fillText(prop.label || "SPEC", x + w / 2, y + h - 7); break;
      case "telescope":
        ctx.strokeStyle = "#59636e"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w / 2, y + h / 2); ctx.lineTo(x + 8, y + h - 4); ctx.moveTo(x + w / 2, y + h / 2); ctx.lineTo(x + w - 8, y + h - 4); ctx.stroke();
        this.drawRoundedRect(x + 12, y + 4, w - 24, 20, "#cfd6dd", "#68727d", 5);
        [-1, 1].forEach(k => { ctx.fillStyle = "#0b1118"; ctx.beginPath(); ctx.arc(x + w / 2 + k * 14, y + 14, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = accent; ctx.fillRect(x + w / 2 + k * 14 - 3, y + 11, 3, 3); }); break;
      case "dish":
        ctx.fillStyle = "#aab6c0"; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2 - 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#6c7783"; for (const scale of [1, .66, .33]) { ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, (Math.min(w, h) / 2 - 3) * scale, 0, Math.PI * 2); ctx.stroke(); } break;
      case "bench":
        this.drawRoundedRect(x, y + 4, w, h - 4, "#d8dfe6", "#9aa6b2");
        ctx.fillStyle = "#7f8b97"; ctx.fillRect(x + 2, y + h - 8, w - 4, 6);
        drawAsset("glassShards", x + 12, y + 4, 18, 0);
        drawAsset("rockShards", x + tile + 12, y + 4, 18, 3);
        drawAsset("diamond", x + tile * 2 + 12, y + 4, 18);
        break;
      case "solar":
        this.drawRoundedRect(x, y, w, h, "#10265a", "#9aa6b2", 3); ctx.strokeStyle = "#3b6fd1";
        for (let i = 1; i < w / 20; i++) { ctx.beginPath(); ctx.moveTo(x + i * 20, y); ctx.lineTo(x + i * 20, y + h); ctx.stroke(); }
        for (let j = 1; j < h / 20; j++) { ctx.beginPath(); ctx.moveTo(x, y + j * 20); ctx.lineTo(x + w, y + j * 20); ctx.stroke(); } break;
      case "rtg":
        this.drawRoundedRect(x + 5, y + 5, w - 10, h - 10, "#8a8f98", "#4d535c", 12);
        for (let i = 16; i < w - 10; i += 9) { ctx.strokeStyle = "#5d636c"; ctx.beginPath(); ctx.moveTo(x + i, y + 8); ctx.lineTo(x + i, y + h - 26); ctx.stroke(); }
        ctx.fillStyle = "#f5c518"; for (let i = 0; i < w - 20; i += 10) ctx.fillRect(x + 10 + i, y + h - 22, 8, 8); break;
      case "rack":
        for (let k = 0; k < prop.w; k++) {
          this.drawRoundedRect(x + 2 + k * tile, y + 2, tile - 4, h - 4, "#1d242c", "#3a4654", 3);
          for (let j = 0; j < 3; j++) { ctx.fillStyle = "#10161d"; ctx.fillRect(x + 6 + k * tile, y + 7 + j * 9, tile - 12, 6); ctx.fillStyle = Math.sin(time * 3 + k * 2 + j) > 0 ? "#9bff9b" : accent; ctx.fillRect(x + 8 + k * tile, y + 9 + j * 9, 3, 2); }
        } break;
      case "tank":
        const radius = Math.min(w, h) / 2 - 3;
        const tankGradient = ctx.createRadialGradient(x + w / 2 - 8, y + h / 2 - 8, 3, x + w / 2, y + h / 2, radius);
        tankGradient.addColorStop(0, "#e6ecf2"); tankGradient.addColorStop(1, "#6c7783");
        ctx.fillStyle = tankGradient; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0b3d91"; ctx.fillRect(x + w / 2 - radius, y + h / 2 - 4, radius * 2, 8); break;
      case "cart":
        this.drawRoundedRect(x + 2, y + 6, w - 4, h - 10, "#b33a3a", "#6e2020");
        ctx.fillStyle = "#d0d6dc"; ctx.fillRect(x + 8, y + 10, 4, 18); ctx.fillRect(x + 16, y + 12, 16, 3);
        drawAsset("energyPack", x + w / 2, y + 3, 20);
        break;
      case "shelf":
        this.drawRoundedRect(x, y, w, h, "#39424c", "#222a31", 3);
        if (prop.w > prop.h) {
          drawAsset("energyPack", x + 4, y + 3, 18);
          drawAsset("rockShards", x + w - 22, y + 3, 18, 4);
        } else {
          drawAsset("energyPack", x + 4, y + 4, 18);
          drawAsset("rockShards", x + 4, y + h - 22, 18, 4);
        }
        break;
      case "micro":
        this.drawRoundedRect(x + 6, y + 26, 28, 9, "#6d7782", null, 3); this.drawRoundedRect(x + 22, y + 6, 7, 24, "#9aa6b2", null, 2); break;
      case "globe":
        const globe = ctx.createRadialGradient(x + 15, y + 14, 2, x + 20, y + 19, 14); globe.addColorStop(0, "#f09468"); globe.addColorStop(1, "#7a2f1c");
        ctx.fillStyle = globe; ctx.beginPath(); ctx.arc(x + 20, y + 19, 12, 0, Math.PI * 2); ctx.fill(); break;
      default:
        this.drawRoundedRect(x + 3, y + 3, w - 6, h - 6, "#66717d", "#39434d");
    }
  }

  drawPlayer(player, time) {

    const ctx = this.ctx, tile = this.tile;
    const x = player.x * tile, y = player.y * tile + (player.moving ? Math.sin(time * 12) * 1.2 : 0);
    const frame = player.animator.getFrame();
    if (!frame.image) return;
    const size = player.config.spriteSize || tile * .85;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(0,0,0,.32)";
    ctx.beginPath();
    ctx.ellipse(0, size * .25, size * .3, size * .13, 0, 0, Math.PI * 2);
    ctx.fill();
    if (Math.cos(player.angle) < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = !this.config.rendering.pixelated;
    ctx.drawImage(
      frame.image,
      frame.index * frame.frameWidth, 0, frame.frameWidth, frame.frameHeight,
      -size / 2, -size / 2, size, size
    );
    ctx.restore();
  }

  drawLights(time, mood) {
    const ctx = this.ctx, tile = this.tile;
    this.map.lights.forEach(([x, y]) => {
      let alpha = mood.lightOpacity;
      if (mood.flicker > 0 && Math.sin(time * 7 + x * 3 + y) > 1 - mood.flicker) alpha *= .12;
      const px = x * tile + 8, py = y * tile + tile - 9;
      const gradient = ctx.createRadialGradient(px + 12, py + 2, 2, px + 12, py + 2, 34);
      gradient.addColorStop(0, mood.lightColor); gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = alpha * .28; ctx.fillStyle = gradient; ctx.fillRect(px - 24, py - 30, 72, 72);
      ctx.globalAlpha = alpha; ctx.fillStyle = mood.lightColor; ctx.fillRect(px, py, 24, 4); ctx.globalAlpha = 1;
    });
  }

  drawDoors(time, mood) {
    const ctx = this.ctx, tile = this.tile;
    this.map.doors.forEach(door => {
      const px = door.x * tile, py = door.y * tile;
      const openness = door.openness;
      ctx.fillStyle = mood.accent;
      if (door.vertical) {
        const height = (tile / 2 - 4) * (1 - .9 * openness);
        ctx.fillRect(px + 8, py + 4, tile - 16, height);
        ctx.fillRect(px + 8, py + tile - 4 - height, tile - 16, height);
      } else {
        const width = (tile / 2 - 4) * (1 - .9 * openness);
        ctx.fillRect(px + 4, py + 8, width, tile - 16);
        ctx.fillRect(px + tile - 4 - width, py + 8, width, tile - 16);
      }
    });
  }

  drawAtmosphere(time, mood, player) {
    const ctx = this.ctx, width = this.logicalWidth, height = this.logicalHeight;
    if (mood.tint) { ctx.fillStyle = mood.tint; ctx.fillRect(0, 0, width, height); }
    if (mood.grime > 0) {
      this.randomMarks.forEach(mark => {
        const gradient = ctx.createRadialGradient(mark.x, mark.y, 0, mark.x, mark.y, mark.radius);
        gradient.addColorStop(0, `rgba(50,35,15,${mark.alpha * mood.grime})`); gradient.addColorStop(1, "rgba(50,35,15,0)");
        ctx.fillStyle = gradient; ctx.fillRect(mark.x - mark.radius, mark.y - mark.radius, mark.radius * 2, mark.radius * 2);
      });
    }
    if (mood.vignette > 0) {
      const px = player.x * this.tile, py = player.y * this.tile;
      const radius = 175 + Math.sin(time * 2) * 8;
      const gradient = ctx.createRadialGradient(px, py, 18, px, py, radius);
      gradient.addColorStop(0, "rgba(0,10,5,0)"); gradient.addColorStop(1, `rgba(0,0,0,${mood.vignette})`);
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    }
  }

  render({ time, player, mood, nearObject, doors }) {
    this.time = time;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
    ctx.drawImage(this.staticCanvas, 0, 0, this.logicalWidth, this.logicalHeight);
    this.drawLights(time, mood);
    this.drawDoors(time, mood);
    let playerDrawn = false;
    const playerDepth = player.y + .3;
    this.map.props.forEach(prop => {
      if (!playerDrawn && prop.y + prop.h > playerDepth) { this.drawPlayer(player, time); playerDrawn = true; }
      this.drawProp(prop, time, mood);
    });
    window.player = player;
    window.context = this;
    if (!playerDrawn) this.drawPlayer(player, time);
    if (nearObject) {
      ctx.strokeStyle = mood.accent; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -time * 20;
      ctx.strokeRect(nearObject.x * this.tile - 3, nearObject.y * this.tile - 3, nearObject.w * this.tile + 6, nearObject.h * this.tile + 6);
      ctx.setLineDash([]);
    }
    this.drawAtmosphere(time, mood, player);
  }
};
