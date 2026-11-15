/* Renderer: desenha o cenário, objetos, personagem e efeitos de atmosfera. */
window.MapRenderer = class MapRenderer {
  constructor(canvas, config, map) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.config = config;
    this.map = map;
    this.tile = config.grid.tileSize;
    this.assets = new Map();
    this.time = 0;
    this.worldW = map.width * this.tile;
    this.worldH = map.height * this.tile;
    canvas.width = config.camera.viewTiles.w * this.tile;
    canvas.height = config.camera.viewTiles.h * this.tile;
    this.camera = null;
    this.cam = { x: 0, y: 0 };
    this.randomMarks = this.createAtmosphereMarks();
    this.staticCanvas = document.createElement("canvas");
    this.staticCanvas.width = this.worldW;
    this.staticCanvas.height = this.worldH;
    this.staticContext = this.staticCanvas.getContext("2d");
    this.drawStaticMap();
  }

  createAtmosphereMarks() {
    let seed = 7;
    const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    return Array.from({ length: Math.round(this.worldW * this.worldH / 806400 * 65) }, () => ({
      x: random() * this.worldW,
      y: random() * this.worldH,
      radius: 14 + random() * 42,
      alpha: .04 + random() * .12
    }));
  }

  setAsset(name, image) {
    this.assets.set(name.toLowerCase(), image);
    this.drawStaticMap();
  }

  drawStaticMap() {
    const ctx = this.staticContext;
    const previous = this.ctx;
    this.ctx = ctx;
    ctx.clearRect(0,0,this.worldW,this.worldH);
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const cell = this.map.grid[y][x];
        if (cell === 1) this.drawWall(x, y);
        else if (cell === 0) this.drawVoid(x, y);
        else this.drawFloor(x, y);
      }
    }
    if (this.map.features) this.drawMarsTopography();
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
    if(this.map.worldId){ this.drawMarsFloor(x,y,floorType); return; }
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

  // Terrenos marcianos pixel-art: ruído determinístico, sem repetição de sprites.
  drawMarsFloor(x,y,type){
    const c=this.ctx,T=this.tile,px=x*T,py=y*T;
    const palette=this.map.palette,base=palette[type]||palette[0];
    c.fillStyle=base;c.fillRect(px,py,T,T);
    const seed=this.map.seed||1;
    let n=((Math.imul(x+seed,374761393)^Math.imul(y+seed,668265263))>>>0);
    const next=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};
    const slope=type===5?'#f2b783':type===4?'#3b2222':'#4c2a24';
    const soft=type===5?'#db9662':'#d6915e';
    for(let k=0;k<5;k++){
      const a=Math.floor(next()*(T-3)),b=Math.floor(next()*(T-3)),sz=next()>.72?3:2;
      c.fillStyle=next()>.52?slope:soft;
      c.globalAlpha=.10+next()*.23;c.fillRect(px+a,py+b,sz,sz);
    }
    c.globalAlpha=1;
    if(type===3||type===5){
      c.fillStyle='rgba(255,209,145,.095)';
      c.fillRect(px+3,py+5,T-7,1);
      if((x+y)%3===0)c.fillRect(px+8,py+19,T-12,1);
    }
    if(type===4){c.fillStyle='rgba(26,12,20,.10)';c.fillRect(px,py+T-4,T,4);}
    if((x*13+y*17+seed)%19===0){c.fillStyle='rgba(255,205,148,.32)';c.fillRect(px+4,py+T-7,3,2);}
  }

  drawMarsTopography(){
    const c=this.ctx,T=this.tile,features=this.map.features;
    c.save();
    for(const [x,y,r] of features.craters){
      const cx=x*T,cy=y*T,rad=r*T;
      c.fillStyle='rgba(22,10,11,.15)';c.beginPath();c.ellipse(cx+rad*.06,cy+rad*.08,rad*.70,rad*.68,-.15,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(255,195,132,.38)';c.lineWidth=Math.max(7,rad*.13);
      c.beginPath();c.ellipse(cx-rad*.04,cy-rad*.05,rad*.89,rad*.83,-.17,Math.PI*1.01,Math.PI*1.95);c.stroke();
      c.strokeStyle='rgba(49,19,18,.47)';c.lineWidth=Math.max(4,rad*.09);
      c.beginPath();c.ellipse(cx+rad*.04,cy+rad*.03,rad*.86,rad*.83,-.18,0,Math.PI*.98);c.stroke();
      c.strokeStyle='rgba(255,210,154,.15)';c.lineWidth=2;
      for(let k=0;k<3;k++){c.beginPath();c.ellipse(cx,cy,rad*(.72+k*.085),rad*(.70+k*.076),.11,Math.PI*.05,Math.PI*1.12);c.stroke();}
    }
    for(const [x,y,rx,ry] of features.ridges){
      c.beginPath();c.ellipse(x*T,y*T,rx*T*.63,ry*T*.63,-.15,0,Math.PI*2);
      c.strokeStyle='rgba(54,23,25,.22)';c.lineWidth=7;c.stroke();
      c.beginPath();c.ellipse(x*T-3,y*T-5,rx*T*.63,ry*T*.63,-.15,Math.PI*1.05,Math.PI*1.91);
      c.strokeStyle='rgba(247,178,125,.17)';c.lineWidth=5;c.stroke();
    }
    c.restore();
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

  drawVoid(x, y) {
    const ctx = this.ctx, t = this.tile, px = x * t, py = y * t;
    ctx.fillStyle = this.map.worldId ? "#48271f" : "#070a0f"; ctx.fillRect(px, py, t, t);
    const h = (x * 73856093 ^ y * 19349663) >>> 0;
    if (h % 5 === 0) { ctx.fillStyle = `rgba(190,215,255,${.15 + (h % 7) / 20})`; ctx.fillRect(px + (h % 31) + 3, py + ((h >> 5) % 31) + 3, 2, 2); }
  }

  drawFloorMarkings() {
    const ctx = this.ctx, tile = this.tile;
    const path = pts => { ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a * tile, b * tile) : ctx.moveTo(a * tile, b * tile)); };
    this.map.floorDecals.forEach(d => {
      ctx.save();
      if (d.k === "nasa") { ctx.globalAlpha = .85; this.drawNasaMark(d.x * tile, d.y * tile, d.r * tile); }
      else if (d.k === "rect") { ctx.fillStyle = d.c; ctx.fillRect(d.x * tile, d.y * tile, d.w * tile, d.h * tile); }
      else if (d.k === "hazard") {
        ctx.lineWidth = 6; ctx.strokeStyle = "#14171a"; ctx.strokeRect(d.x * tile, d.y * tile, d.w * tile, d.h * tile);
        ctx.strokeStyle = "#f5c518"; ctx.setLineDash([10, 10]); ctx.strokeRect(d.x * tile, d.y * tile, d.w * tile, d.h * tile);
      } else if (d.k === "lane") { ctx.strokeStyle = d.c; ctx.lineWidth = d.w; ctx.setLineDash(d.dash || []); path(d.pts); ctx.stroke(); }
      else if (d.k === "cable") { ctx.lineJoin = "round"; ctx.strokeStyle = "#14171a"; ctx.lineWidth = 6; path(d.pts); ctx.stroke(); ctx.strokeStyle = d.c; ctx.lineWidth = 2.5; path(d.pts); ctx.stroke(); }
      else if (d.k === "text") { ctx.fillStyle = d.c; ctx.font = "bold 11px monospace"; ctx.textAlign = "center"; ctx.fillText(d.s, d.x * tile, d.y * tile); }
      ctx.restore();
    });
    this.map.decals.forEach(([x, y]) => this.drawNasaMark(x * tile, y * tile, 13));
  }

  drawNasaMark(x, y, radius) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#0b3d91"; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    [[-.62,-.5],[.5,-.7],[-.15,-.82],[.72,.05],[-.8,.12],[.25,-.35],[-.45,.4],[.1,.75]].forEach(([a,b]) => {
      ctx.beginPath(); ctx.arc(a * radius, b * radius, Math.max(.6, radius * .045), 0, Math.PI * 2); ctx.fill();
    });
    ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(1, radius * .06);
    ctx.beginPath(); ctx.ellipse(0, 0, radius * .85, radius * .3, -.45, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#fc3d21"; ctx.lineWidth = radius * .16; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-.8 * radius, .5 * radius); ctx.quadraticCurveTo(-.05 * radius, -.25 * radius, .8 * radius, -.45 * radius); ctx.stroke();
    if (radius >= 10) { ctx.fillStyle = "#fff"; ctx.font = `bold ${radius * .4}px Arial`; ctx.textAlign = "center"; ctx.fillText("NASA", 0, radius * .66); }
    ctx.restore();
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
    if (prop.solid !== false) { ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(x + 3, y + 6, w, h); }
    if (image) { ctx.drawImage(image, x, y, w, h); return; }
    const accent = mood.accent;
    switch (prop.type) {
      case "screen":
        this.drawRoundedRect(x, y + 2, w, h - 4, "#0d1319");
        this.drawRoundedRect(x + 4, y + 6, w - 8, h - 12, "#06223d", null, 2);
        this.drawNasaMark(x + 24, y + h / 2, 13);
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
        this.drawNasaMark(x + w / 2, y + h / 2 - 2, 15);
        ctx.fillStyle = "#8a949e"; ctx.fillRect(x + w - 38, y + 2, 5, 22);
        this.drawRoundedRect(x + w - 46, y, 22, 9, "#2b343d", null, 3); break;
      case "crate":
        this.drawRoundedRect(x + 2, y + 3, w - 4, h - 6, "#5f7385", "#37444f");
        ctx.fillStyle = "#4a5b6b"; ctx.fillRect(x + 8, y + 3, 5, h - 6); ctx.fillRect(x + w - 13, y + 3, 5, h - 6);
        this.drawNasaMark(x + w / 2, y + h / 2, Math.min(h * .3, 12)); break;
      case "spec":
        this.drawRoundedRect(x + 4, y + 8, w - 8, h - 12, "#8c96a2", "#5a6470", 8);
        const gradient = ctx.createRadialGradient(x + w / 2 - 4, y + h / 2 - 4, 2, x + w / 2, y + h / 2, w * .3);
        gradient.addColorStop(0, "#eef3f8"); gradient.addColorStop(1, "#66717d");
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w * .28, 0, Math.PI * 2); ctx.fill();
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
        ["#6fd3ff", "#9bff9b", "#ffc66f"].forEach((color, i) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + 14 + i * tile, y + 16, 6, 0, Math.PI * 2); ctx.fill(); }); break;
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
        ctx.fillStyle = "#d0d6dc"; ctx.fillRect(x + 8, y + 10, 4, 18); ctx.fillRect(x + 16, y + 12, 16, 3); break;
      case "shelf":
        this.drawRoundedRect(x, y, w, h, "#39424c", "#222a31", 3);
        ["#c9a050", "#6a8caf", "#b0585a", "#7aa37a"].forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(x + 5 + i * 17, y + 6, Math.max(5, Math.min(15, w - 10)), Math.max(5, h - 14)); }); break;
      case "micro":
        this.drawRoundedRect(x + 6, y + 26, 28, 9, "#6d7782", null, 3); this.drawRoundedRect(x + 22, y + 6, 7, 24, "#9aa6b2", null, 2); break;
      case "globe":
        const globe = ctx.createRadialGradient(x + 15, y + 14, 2, x + 20, y + 19, 14); globe.addColorStop(0, "#f09468"); globe.addColorStop(1, "#7a2f1c");
        ctx.fillStyle = globe; ctx.beginPath(); ctx.arc(x + 20, y + 19, 12, 0, Math.PI * 2); ctx.fill(); break;
      default:
        if (!this.drawExtra(prop, x, y, w, h, time, mood)) this.drawRoundedRect(x + 3, y + 3, w - 6, h - 6, "#66717d", "#39434d");
    }
  }

  drawExtra(p, x, y, w, h, t, mood) {
    const c = this.ctx, T = this.tile, cx = x + w / 2, cy = y + h / 2, tau = Math.PI * 2;
    const glow = mood.lightOpacity > .5 ? 1 : .35, R = (a, b, cw, ch, f, s, r = 3) => this.drawRoundedRect(a, b, cw, ch, f, s || null, r);
    const dot = (a, b, r, f) => { c.fillStyle = f; c.beginPath(); c.arc(a, b, r, 0, tau); c.fill(); };
    switch (p.type) {
      case "rock": case "boulder": case "basalt": case "debris": {
        const count=p.type==='debris'?5:p.type==='boulder'?2:3;
        for(let i=0;i<count;i++){
          const ox=(i-count/2)*w*.20,oy=(i%2?1:-1)*h*.13;
          const rr=(p.type==='boulder'?.34:.24)*Math.min(w,h)*(1-(i%3)*.14);
          const rr2=Math.max(3,rr);
          c.fillStyle='rgba(32,13,14,.25)';c.beginPath();c.ellipse(cx+ox+3,cy+oy+rr2*.35,rr2*1.14,rr2*.74,-.2,0,tau);c.fill();
          c.fillStyle=p.type==='basalt'?'#3a3031':p.type==='boulder'?'#9c6654':'#9d5745';
          c.beginPath();c.moveTo(cx+ox-rr2,cy+oy+rr2*.2);c.lineTo(cx+ox-rr2*.7,cy+oy-rr2*.65);c.lineTo(cx+ox+rr2*.35,cy+oy-rr2);c.lineTo(cx+ox+rr2,cy+oy-rr2*.1);c.lineTo(cx+ox+rr2*.64,cy+oy+rr2*.67);c.closePath();c.fill();
          c.fillStyle='rgba(249,194,140,.3)';c.beginPath();c.moveTo(cx+ox-rr2*.7,cy+oy-rr2*.55);c.lineTo(cx+ox+rr2*.27,cy+oy-rr2*.8);c.lineTo(cx+ox-rr2*.12,cy+oy-.03*rr2);c.closePath();c.fill();
        }return true;}
      case "lander": {
        R(x+6,y+8,w-12,h-16,'#4d535b','#b7b8a7',4);
        c.fillStyle='#e9cda1';c.beginPath();c.moveTo(cx,y+8);c.lineTo(x+w-14,cy);c.lineTo(cx,y+h-10);c.lineTo(x+13,cy);c.closePath();c.fill();
        c.fillStyle='#aeb9c0';c.fillRect(cx-15,cy-12,30,24);
        c.fillStyle='#2e536b';c.fillRect(cx-9,cy-8,18,16);
        c.strokeStyle='#d3b08b';c.lineWidth=3;
        for(let a=0;a<4;a++){let ang=a*Math.PI/2;c.beginPath();c.moveTo(cx+Math.cos(ang)*22,cy+Math.sin(ang)*16);c.lineTo(cx+Math.cos(ang)*(Math.min(w,h)*.40),cy+Math.sin(ang)*(Math.min(w,h)*.4));c.stroke();}
        c.fillStyle='#f6d6a1';c.fillRect(cx-16,cy+15,32,3);
        return true;}
      case "antenna": case "relay": {
        R(x+5,y+8,w-10,h-16,'#464f55','#a0a7a4',4);
        c.strokeStyle='#d0b8a1';c.lineWidth=3;c.beginPath();c.moveTo(cx,cy+18);c.lineTo(cx,cy-7);c.stroke();
        c.fillStyle='#bfc3b8';c.beginPath();c.arc(cx,cy-9,Math.min(w,h)*.32,0,tau);c.fill();
        c.fillStyle='#62686b';c.beginPath();c.arc(cx,cy-9,Math.min(w,h)*.22,0,tau);c.fill();
        c.strokeStyle='#e8bd88';c.lineWidth=2;c.beginPath();c.moveTo(cx,cy-9);c.lineTo(cx+16,cy-22);c.stroke();
        dot(cx+16,cy-22,3,p.type==='relay'?'#7de6ff':'#ffc780');return true;}
      case "sample": case "cache": case "archive": {
        const main=p.type==='sample'?'#a37d63':p.type==='cache'?'#7b8b8e':'#656b79';
        R(x+5,y+8,w-10,h-16,main,'#e5be88',5);
        if(p.type==='sample'){
          for(let i=0;i<6;i++)dot(cx+(i%3-1)*12,cy+(Math.floor(i/3)-.5)*13,4,i%2?'#593a34':'#f0ba81');
        } else {
          c.fillStyle=p.type==='archive'?'#65c9df':'#f1b775';c.fillRect(cx-17,cy-13,34,5);c.fillRect(cx-12,cy-4,24,3);c.fillRect(cx-12,cy+4,20,3);
        }return true;}
      case "sensor": case "beacon": {
        R(cx-14,cy-15,28,31,'#596b71','#bcc4ba',4);
        R(cx-7,cy-26,14,15,'#283c42','#d3bbb3',3);
        dot(cx,cy-20,4,p.completed?'#84f5c4':'#f7b46d');
        c.strokeStyle='#d3bfa8';c.lineWidth=2;c.beginPath();c.moveTo(cx-10,cy+10);c.lineTo(cx-17,cy+23);c.moveTo(cx+10,cy+10);c.lineTo(cx+17,cy+23);c.stroke();return true;}
      case "desk":
        R(x + 2, y + 4, w - 4, h - 8, "#7d6b55", "#4f4234", 4); R(x + 10, y + 10, 26, 17, "#10161d");
        c.globalAlpha = glow; c.fillStyle = mood.accent; c.fillRect(x + 14, y + 14, 18, 2); c.fillRect(x + 14, y + 19, 11, 2); c.globalAlpha = 1;
        c.fillStyle = "#f0f0ea"; c.fillRect(x + w - 30, y + 12, 16, 11); dot(x + w - 12, y + h - 14, 4, "#c0503c"); return true;
      case "chair": { const r = Math.min(w, h) * .36; dot(cx, cy, r, "#252d37"); c.strokeStyle = "#4a5666"; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy - 3, r, 3.4, 6); c.stroke(); return true; }
      case "plant":
        dot(cx, cy, Math.min(w, h) * .22, "#6b4a35");
        for (let i = 0; i < 7; i++) { const a = i * .9 + Math.sin(t * 1.2 + i) * .05; c.fillStyle = i % 2 ? "#3f8f4a" : "#2f7a3d"; c.beginPath(); c.ellipse(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10, 11, 4.5, a, 0, tau); c.fill(); }
        return true;
      case "locker": {
        const v = h > w, n = Math.max(1, Math.round((v ? h : w) / (T * .8)));
        R(x + 1, y + 1, w - 2, h - 2, "#58687a", "#2c3742");
        for (let i = 0; i < n; i++) {
          const a = v ? x + 3 : x + 3 + i * (w - 6) / n, b = v ? y + 3 + i * (h - 6) / n : y + 3;
          const cw = v ? w - 6 : (w - 6) / n - 2, ch = v ? (h - 6) / n - 2 : h - 6;
          R(a, b, cw, ch, "#7a8b9d", "#3a4654", 2); c.fillStyle = "#222b34";
          for (let k = 0; k < 3; k++) c.fillRect(a + 4, b + 4 + k * 3, Math.max(6, cw - 8), 1.4);
          c.fillStyle = "#d8dee4"; c.fillRect(a + cw - 6, b + ch / 2 - 3, 2, 6);
        } return true; }
      case "holotable": {
        R(x + 2, y + 4, w - 4, h - 8, "#1d2a38", "#3c5468", 10);
        c.strokeStyle = mood.accent; c.globalAlpha = .7 * glow + .2; c.lineWidth = 2; c.beginPath(); c.ellipse(cx, cy, w * .36, h * .34, 0, 0, tau); c.stroke();
        const r = Math.min(w, h) * .22, g = c.createRadialGradient(cx - r * .3, cy - r * .9, 2, cx, cy - r * .6, r);
        g.addColorStop(0, "#f2a070"); g.addColorStop(1, "#7a2f1c"); c.globalAlpha = .9; c.fillStyle = g; c.beginPath(); c.arc(cx, cy - r * .6, r, 0, tau); c.fill();
        c.strokeStyle = "#ffd9bf"; c.lineWidth = 1; c.beginPath(); c.ellipse(cx, cy - r * .6, r * 1.5, r * .4, t * .8, 0, tau); c.stroke(); c.globalAlpha = 1; return true; }
      case "whiteboard":
        R(x + 1, y + 3, w - 2, h - 6, "#eef2f5", "#8a96a3"); c.strokeStyle = "#2f6fd6"; c.lineWidth = 2; c.beginPath();
        for (let i = 0; i <= 8; i++) { const a = x + 10 + i * (w - 20) / 8, b = cy + (i % 2 ? -5 : 5); i ? c.lineTo(a, b) : c.moveTo(a, b); } c.stroke();
        c.fillStyle = "#fc3d21"; for (let i = 0; i < 4; i++) c.fillRect(x + 12 + i * (w - 30) / 4, y + 7, 14, 3);
        c.fillStyle = "#f5c518"; c.fillRect(x + w - 16, y + h - 12, 8, 6); return true;
      case "rockcase":
        R(x + 2, y + 4, w - 4, h - 8, "#243241", "#8fb4c9", 4); c.globalAlpha = .25; c.fillStyle = "#bfe9ff"; c.fillRect(x + 5, y + 7, w - 10, h - 14); c.globalAlpha = 1;
        for (let i = 0; i < w / 9; i++) dot(x + 10 + i * 9, cy + Math.sin(i * 2.3) * 6, 3 + (i % 3), i % 3 ? "#8a7b72" : "#5f6b78"); return true;
      case "pallet":
        R(x + 2, y + 2, w - 4, h - 4, "#b08a58", "#6e5530", 2); c.strokeStyle = "#6e5530"; c.lineWidth = 1;
        for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x + 2, y + 2 + i * (h - 4) / 4); c.lineTo(x + w - 2, y + 2 + i * (h - 4) / 4); c.stroke(); }
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) R(x + 6 + i * (w - 12) / 2, y + 6 + j * (h - 12) / 2, (w - 12) / 2 - 3, (h - 12) / 2 - 3, (i + j) % 2 ? "#8d9aa8" : "#6f8397", "#37444f", 2);
        this.drawNasaMark(cx, cy, 6); return true;
      case "battery": {
        R(x + 2, y + 3, w - 4, h - 6, "#202830", "#3a4654", 4); const n = Math.round(w / T * 2), cw = (w - 14) / n;
        for (let i = 0; i < n; i++) { c.fillStyle = "#10161d"; c.fillRect(x + 7 + i * cw, y + 8, cw - 3, h - 16); c.globalAlpha = glow; c.fillStyle = Math.sin(t * 2 + i) > -.3 ? "#9bff9b" : "#f5c518"; c.fillRect(x + 9 + i * cw, y + h - 14, 6, 3); c.globalAlpha = 1; }
        return true; }
      case "transformer":
        R(x + 3, y + 4, w - 6, h - 8, "#56624a", "#2f3828", 5); c.strokeStyle = "#3a4430"; c.lineWidth = 2;
        for (let i = 10; i < w - 8; i += 8) { c.beginPath(); c.moveTo(x + i, y + 9); c.lineTo(x + i, y + h - 24); c.stroke(); }
        c.fillStyle = "#f5c518"; c.beginPath(); c.moveTo(cx, y + h - 24); c.lineTo(cx + 10, y + h - 8); c.lineTo(cx - 10, y + h - 8); c.closePath(); c.fill(); c.fillStyle = "#14171a"; c.fillRect(cx - 1, y + h - 20, 2, 7); return true;
      case "roboarm": {
        R(x + 4, y + 4, w - 8, h - 8, "#2a343e", "#4a5666", 8);
        const a1 = -.8 + Math.sin(t * .7) * .5, a2 = .9 + Math.sin(t * .9 + 1) * .5, bx = x + w * .3, by = y + h * .7;
        const jx = bx + Math.cos(a1) * w * .38, jy = by + Math.sin(a1) * h * .38, ex = jx + Math.cos(a1 + a2) * w * .3, ey = jy + Math.sin(a1 + a2) * h * .3;
        c.lineCap = "round"; c.strokeStyle = "#d5dbe1"; c.lineWidth = 7; c.beginPath(); c.moveTo(bx, by); c.lineTo(jx, jy); c.stroke();
        c.lineWidth = 5; c.beginPath(); c.moveTo(jx, jy); c.lineTo(ex, ey); c.stroke(); dot(bx, by, 5, "#f5c518"); dot(jx, jy, 5, "#f5c518"); dot(ex, ey, 4, mood.accent); return true; }
      case "wheelrack":
        R(x + 2, y + 6, w - 4, h - 12, "#39424c", "#222a31");
        for (let i = 0; i < Math.max(1, Math.round(w / T)); i++) {
          const a = x + T / 2 + i * T; dot(a, cy, 12, "#15191e"); c.strokeStyle = "#6b7683"; c.lineWidth = 1.5; c.beginPath(); c.arc(a, cy, 7, 0, tau);
          for (let k = 0; k < 6; k++) { c.moveTo(a, cy); c.lineTo(a + Math.cos(k * 1.047) * 7, cy + Math.sin(k * 1.047) * 7); } c.stroke();
        } return true;
      case "coffee":
        R(x + 7, y + 6, w - 14, h - 12, "#3a3f46", "#1c2026"); c.fillStyle = "#f4f4f0"; c.fillRect(cx - 4, cy + 2, 8, 7); dot(x + w - 12, y + 11, 2, Math.sin(t * 3) > 0 ? "#ff5252" : "#7a2a2a"); return true;
      case "cabinet": {
        R(x + 3, y + 2, w - 6, h - 4, "#8795a3", "#4b5865"); const v = h > w, n = Math.max(2, Math.round((v ? h : w) / (T * .5)));
        for (let i = 0; i < n; i++) {
          const a = v ? x + 5 : x + 5 + i * (w - 10) / n, b = v ? y + 4 + i * (h - 8) / n : y + 5, cw = v ? w - 10 : (w - 10) / n - 2, ch = v ? (h - 8) / n - 2 : h - 10;
          c.strokeStyle = "#4b5865"; c.lineWidth = 1; c.strokeRect(a, b, cw, ch); c.fillStyle = "#2b343d"; c.fillRect(a + cw / 2 - 5, b + ch / 2 - 1, 10, 3);
        } return true; }
      default: return false;
    }
  }

  drawPlayer(player, time) {
    if(this.map.worldId){this.drawMarsRover(player,time);return;}
    const ctx = this.ctx, tile = this.tile;
    const x = player.x * tile, y = player.y * tile + (player.moving ? Math.sin(time * 12) * 1.2 : 0);
    ctx.save(); ctx.translate(x, y); ctx.rotate(player.angle);
    ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(0, 10, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    this.drawRoundedRect(-16, -7, 9, 14, "#b9c2cc", "#7d8894", 3);
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fillStyle = "#f4f6f8"; ctx.fill(); ctx.strokeStyle = "#8e9aa6"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#0b3d91"; ctx.beginPath(); ctx.arc(-3, -7, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3, 0, 7, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, 0, 3.4, 5, 0, 0, Math.PI * 2); ctx.fillStyle = "#ff9d2e"; ctx.fill();
    ctx.restore();
  }

  drawMarsRover(player,time){
    const c=this.ctx,T=this.tile,x=player.x*T,y=player.y*T+(player.moving?Math.sin(time*13)*.7:0);
    c.save();c.translate(x,y);c.rotate(player.angle);
    c.fillStyle='rgba(31,15,14,.5)';c.beginPath();c.ellipse(2,6,18,12,0,0,Math.PI*2);c.fill();
    for(const sx of [-11,10])for(const sy of [-10,0,10]){
      c.fillStyle='#272d34';c.fillRect(sx-5,sy-4,10,8);
      c.fillStyle='#9ba3a7';c.fillRect(sx-3,sy-3,6,2);
    }
    c.fillStyle='#b6aa9c';c.fillRect(-12,-11,24,22);
    c.fillStyle='#a8cbd7';c.fillRect(-9,-8,18,16);
    c.fillStyle='#26577a';
    for(let i=0;i<3;i++)c.fillRect(-7+i*5,-7,3,14);
    c.fillStyle='#e3c9a3';c.fillRect(-15,-4,4,9);c.fillRect(11,-4,4,9);
    c.strokeStyle='#d9d5bc';c.lineWidth=2;c.beginPath();c.moveTo(3,-6);c.lineTo(15,-15);c.stroke();
    c.fillStyle='#e0ecdc';c.fillRect(12,-18,10,6);
    c.fillStyle='#62cde3';c.fillRect(17,-17,4,3);
    c.restore();
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
    const ctx = this.ctx, cam = this.cam, vw = this.canvas.width, vh = this.canvas.height;
    if (mood.tint) { ctx.fillStyle = mood.tint; ctx.fillRect(cam.x, cam.y, vw, vh); }
    if (mood.grime > 0) {
      this.randomMarks.forEach(mark => {
        if (mark.x < cam.x - mark.radius || mark.x > cam.x + vw + mark.radius || mark.y < cam.y - mark.radius || mark.y > cam.y + vh + mark.radius) return;
        const gradient = ctx.createRadialGradient(mark.x, mark.y, 0, mark.x, mark.y, mark.radius);
        gradient.addColorStop(0, `rgba(50,35,15,${mark.alpha * mood.grime})`); gradient.addColorStop(1, "rgba(50,35,15,0)");
        ctx.fillStyle = gradient; ctx.fillRect(mark.x - mark.radius, mark.y - mark.radius, mark.radius * 2, mark.radius * 2);
      });
    }
    if(this.map.worldId && (this.map.weather==='storm'||this.map.weather==='dust'||mood===this.config.atmosphere.presets.storm)){
      const storm=this.map.weather==='storm'||mood===this.config.atmosphere.presets.storm;
      ctx.save();ctx.strokeStyle=storm?'rgba(241,177,117,.19)':'rgba(253,202,132,.13)';ctx.lineWidth=storm?2:1;
      const count=storm?100:45;
      for(let i=0;i<count;i++){
        const wx=(i*139.2+Math.floor(time*(storm?75:32)))%(vw+80),wy=(i*74.9+Math.sin(time*.6+i)*16)%(vh+35);
        const px=cam.x+wx-40,py=cam.y+wy;
        ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-(storm?20:10),py+2);ctx.stroke();
      }ctx.restore();
    }
    if (mood.vignette > 0) {
      const px = player.x * this.tile, py = player.y * this.tile, radius = 175 + Math.sin(time * 2) * 8;
      const gradient = ctx.createRadialGradient(px, py, 18, px, py, radius);
      gradient.addColorStop(0, "rgba(0,10,5,0)"); gradient.addColorStop(1, `rgba(0,0,0,${mood.vignette})`);
      ctx.fillStyle = gradient; ctx.fillRect(cam.x, cam.y, vw, vh);
    }
  }

  render({ time, player, mood, nearObject, doors }) {
    const dt = Math.min(.1, time - (this.time || time)); this.time = time;
    const ctx = this.ctx, T = this.tile, vw = this.canvas.width, vh = this.canvas.height;
    const tx = Math.max(0, Math.min(this.worldW - vw, player.x * T - vw / 2)), ty = Math.max(0, Math.min(this.worldH - vh, player.y * T - vh / 2));
    if (!this.camera) this.camera = { x: tx, y: ty };
    const k = 1 - Math.exp(-dt * (this.config.camera.smooth || 8));
    this.camera.x += (tx - this.camera.x) * k; this.camera.y += (ty - this.camera.y) * k;
    const cam = this.cam = { x: Math.round(this.camera.x), y: Math.round(this.camera.y) };
    ctx.clearRect(0, 0, vw, vh);
    ctx.drawImage(this.staticCanvas, cam.x, cam.y, vw, vh, 0, 0, vw, vh);
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    this.drawLights(time, mood);
    this.drawDoors(time, mood);
    let playerDrawn = false;
    const playerDepth = player.y + .3;
    this.map.props.forEach(prop => {
      if (!playerDrawn && prop.y + prop.h > playerDepth) { this.drawPlayer(player, time); playerDrawn = true; }
      if ((prop.x + prop.w) * T < cam.x - 20 || prop.x * T > cam.x + vw + 20 || (prop.y + prop.h) * T < cam.y - 20 || prop.y * T > cam.y + vh + 20) return;
      this.drawProp(prop, time, mood);
    });
    if (!playerDrawn) this.drawPlayer(player, time);
    this.map.props.forEach(prop=>{
      if(!prop.important || !prop.action || prop.decoration) return;
      const xx=(prop.x+prop.w/2)*T, yy=(prop.y-.12)*T;
      if(xx<cam.x-25||xx>cam.x+vw+25||yy<cam.y-25||yy>cam.y+vh+25)return;
      const r=3+Math.sin(time*2+prop.x)*1.1;
      ctx.fillStyle=prop.completed?'#7ddba8':'#ffe0a2';ctx.beginPath();ctx.arc(xx,yy-4+Math.sin(time*2+prop.y)*2,r,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=1;ctx.stroke();
    });
    if (nearObject) {
      ctx.strokeStyle = mood.accent; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -time * 20;
      ctx.strokeRect(nearObject.x * T - 3, nearObject.y * T - 3, nearObject.w * T + 6, nearObject.h * T + 6);
      ctx.setLineDash([]);
    }
    this.drawAtmosphere(time, mood, player);
    ctx.restore();
  }
};
