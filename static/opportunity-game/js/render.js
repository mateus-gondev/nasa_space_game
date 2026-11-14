import { $, S, g, W, H, mx, PAL } from './state.js';

const canvas = $('#cu');
const ctx = canvas.getContext('2d');
canvas.width = 160;
canvas.height = 90;

let currentCutscene = null;
let cutsceneStartTime = 0;

const fillRect = (x, y, width, height, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, Math.max(0, width | 0), Math.max(0, height | 0));
};

const drawText = (text, x, y, color, size = 6) => {
  ctx.fillStyle = color;
  ctx.font = size + 'px ui-monospace,monospace';
  ctx.fillText(text, x, y);
};

const drawPerson = (x, y, color) => {
  fillRect(x, y - 9, 4, 4, color);
  fillRect(x - 1, y - 5, 6, 6, color);
  fillRect(x, y + 1, 1, 3, color);
  fillRect(x + 3, y + 1, 1, 3, color);
};

const drawRoverView = (x, y, color = '#8a98a0') => {
  fillRect(x - 10, y - 9, 20, 6, color);
  fillRect(x - 14, y - 12, 28, 2, '#2b4b7a');
  fillRect(x + 6, y - 20, 1, 8, color);
  fillRect(x + 4, y - 22, 5, 2, '#222');
  fillRect(x - 9, y - 3, 4, 3, '#111');
  fillRect(x - 1, y - 3, 4, 3, '#111');
  fillRect(x + 7, y - 3, 4, 3, '#111');
};

const SC = {
  lab: (t) => {
    fillRect(0, 0, 160, 90, '#05070a');
    fillRect(0, 68, 160, 22, '#0b1520');
    fillRect(108, 8, 44, 44, '#10283c');

    for (let i = 0; i < 5; i++) {
      fillRect(108, 12 + i * 9, 44, 3, '#3e7c8c66');
      fillRect(60 + i * 10, 70 + i, 18, 1, '#3e7c8c33');
    }

    fillRect(24, 56, 86, 3, '#1b3a4b');
    fillRect(28, 59, 3, 10, '#1b3a4b');
    fillRect(103, 59, 3, 10, '#1b3a4b');
    drawRoverView(66, 56);
    fillRect(30 + (t * 14 % 70), 34, 1, 22, '#e0a43f');
    if (Math.sin(t * 3) > .6) fillRect(72, 35, 2, 2, '#cfd8dc');
    fillRect(6, 24, 22, 16, '#031a12');

    for (let i = 0; i < 4; i++) {
      fillRect(8, 27 + i * 3, 6 + Math.abs(Math.sin(t * 2 + i)) * 12, 1, '#7fe0a8');
    }

    drawPerson(14 + Math.abs((t * 9 % 60) - 30), 76, '#02040a');
    drawPerson(130, 76, '#02040a');
    fillRect(129, 66, 1, 10, '#3e7c8c');
    drawText('JPL · SALA LIMPA', 6, 16, '#e0a43f');
  },

  launch: (t) => {
    fillRect(0, 0, 160, 90, '#03060c');

    for (let i = 0; i < 30; i++) {
      fillRect(hs(i) * 160, hs(i + 50) * 70, 1, 1, '#cfd8dc88');
    }

    fillRect(0, 80, 160, 10, '#0b1520');
    fillRect(60, 40, 2, 40, '#1b3a4b');
    fillRect(64, 56, 2, 2, '#e0a43f');

    const launchOffset = t - 3.2;
    const rocketY = launchOffset < 0 ? 56 : 56 - launchOffset * launchOffset * 9;

    if (launchOffset < 0) {
      drawText(String(3 - Math.floor(t) || 1), 74, 30, '#e0a43f', 18);
    }

    fillRect(77, rocketY, 6, 24, '#cfd8dc');
    fillRect(78, rocketY - 4, 4, 4, '#cfd8dc');
    fillRect(74, rocketY + 18, 3, 6, '#8a98a0');
    fillRect(83, rocketY + 18, 3, 6, '#8a98a0');

    if (launchOffset > 0) {
      fillRect(78, rocketY + 24, 4, 6 + Math.random() * 6, '#e0a43f');
      fillRect(79, rocketY + 24, 2, 4 + Math.random() * 4, '#fff');

      for (let i = 0; i < 8; i++) {
        fillRect(70 + i * 2 + Math.random() * 3, 78 - Math.min(10, launchOffset * 3) - i % 3, 3 + launchOffset, 2, '#8a98a099');
      }
    }
  },

  earth: (t) => {
    fillRect(0, 0, 160, 90, '#04080d');
    fillRect(36, 6, 88, 38, '#0a1a24');

    const n = Math.min(34, t * 5 | 0);
    for (let r = 0; r < n; r++) {
      fillRect(40, 8 + r, 80, 1, r < 17 ? '#a4572e' : r < 19 ? '#3a1a0c' : '#5e2e18');
    }

    for (let r = 0; r < n; r += 3) {
      fillRect(40 + hs(r) * 60, 8 + r, 10, 1, '#6e3720');
    }

    if (n < 34) {
      fillRect(40, 8 + n, 80, 1, '#7fe0a8');
    }

    drawText('MER-B  SOL 001', 42, 16, '#e0a43f', 5);
    fillRect(0, 66, 160, 24, '#0a121a');

    [20, 50, 110, 138].forEach((x, i) => {
      fillRect(x - 8, 56, 16, 8, '#0b2230');
      fillRect(x - 6, 58, 12, 1, Math.sin(t * 3 + i) > 0 ? '#7fe0a8' : '#1b3a4b');
      drawPerson(x - 1, 74, '#020407');
    });

    if (n >= 34 && ((t * 2) | 0) % 2) {
      fillRect(118, 40, 2, 2, '#7fe0a8');
    }
  },

  water: (t) => {
    fillRect(0, 0, 160, 90, '#05080d');
    const colors = ['#2a1d18', '#4a3226', '#3a281f'];

    for (let y = 34; y < 90; y += 6) {
      fillRect(0, y, 160, 6, colors[(y / 6 | 0) % 3]);
    }

    for (let i = 0; i < 14; i++) {
      fillRect(hs(i) * 150, 38 + hs(i + 9) * 46, 3, 3, '#7d8b96');
    }

    const waterY = 64 - (Math.sin(t * .7) + 1) * 14;
    fillRect(0, waterY, 160, 90 - waterY, '#1d5a8a88');

    for (let x = 0; x < 160; x += 2) {
      fillRect(x, waterY + Math.sin(x * .2 + t * 3) * 2, 2, 1, '#7fd0ff');
    }

    drawText('HIPÓTESE: ÁGUA LÍQUIDA', 6, 16, '#e0a43f');
    drawText('reconstrução artística', 6, 24, '#3e7c8c', 5);
  },

  dune: (t) => {
    fillRect(0, 0, 160, 90, '#0a0806');
    fillRect(0, 0, 160, 40, '#1a0f0a');
    fillRect(100, 18, 10, 10, '#b8803a');

    for (let x = 0; x < 160; x += 2) {
      const y = 64 + Math.sin(x * .06) * 5;
      fillRect(x, y, 2, 90 - y, '#5e3419');
    }

    fillRect(54, 50, 34, 6, '#8a98a0');
    fillRect(50, 46, 42, 2, '#2b4b7a');
    fillRect(80, 38, 1, 10, '#8a98a0');

    [58, 70, 82].forEach((x) => {
      fillRect(x - 4, 56, 9, 9, '#111');

      for (let k = 0; k < 4; k++) {
        const angle = t * 9 + k * 1.57;
        fillRect(x + Math.cos(angle) * 3, 60 + Math.sin(angle) * 3, 2, 2, '#555');
      }
    });

    for (let i = 0; i < 14; i++) {
      const f = (t * 30 + i * 9) % 24;
      fillRect(54 - f, 66 - f * .5 - (i % 4), 2, 1, '#b8803a');
    }

    fillRect(112, 10, 44, 18, '#031a12');
    drawText('SLIP ' + ((70 + Math.sin(t * 4) * 12) | 0) + '%', 116, 22, '#7fe0a8', 7);
    drawText('PURGATORY DUNE', 6, 16, '#e0a43f');
  },

  spirit: (t) => {
    fillRect(0, 0, 160, 90, '#04070b');
    fillRect(18, 10, 124, 50, '#08141c');

    if (t < 7 && Math.sin(t * 9) > -.2 - t * .1) {
      drawRoverView(50, 44, '#7d8b96');
    }

    drawText('MER-A', 38, 56, '#e0a43f', 5);
    drawRoverView(112, 44);
    drawText('MER-B', 100, 56, '#e0a43f', 5);

    const glow = Math.max(0, 7 - t);
    for (let x = 22; x < 138; x += 2) {
      fillRect(x, 26 + Math.sin(x * .3 + t * 5) * glow, 2, 1, glow > 0 ? '#7fe0a8' : '#c24');
    }

    fillRect(40, 70, 80, 20, '#0a121a');
    fillRect(74, 64, 22, 2, '#e0a43f55');
    drawPerson(84, 76, '#020407');
  },

  storm: (t) => {
    const dark = Math.min(.85, t / 12);
    fillRect(0, 0, 160, 50, '#2a140a');
    fillRect(0, 50, 160, 40, '#4a2412');
    fillRect(0, 40, 160, 10, '#6b3a1c');
    fillRect(104, 24, 14, 14, '#ffd89a');

    ctx.globalAlpha = dark;
    fillRect(0, 0, 160, 90, '#1a0d07');
    ctx.globalAlpha = 1;

    for (let i = 0; i < 70; i++) {
      fillRect((i * 37 + t * (40 + i % 5 * 14)) % 160, (i * 23) % 90, 3, 1, '#c98a5a');
    }

    drawRoverView(80, 74, '#9aa5ab');
    fillRect(120, 12, 32, 4, '#1b3a4b');
    fillRect(120, 12, 32 * (1 - dark), 4, '#7fe0a8');
    drawText('ENERGIA', 122, 24, '#e0a43f', 5);

    if (dark > .5) {
      drawText('CRÍTICO', 122, 32, '#c24', 5);
    }
  },

  dish: (t) => {
    fillRect(0, 0, 160, 90, '#03050a');

    for (let i = 0; i < 40; i++) {
      fillRect(hs(i + 3) * 160, hs(i + 7) * 60, 1, 1, hs(i) > .5 && Math.sin(t * 2 + i) > 0 ? '#fff' : '#cfd8dc88');
    }

    fillRect(0, 74, 160, 16, '#060b10');
    fillRect(70, 60, 6, 16, '#14232e');

    ctx.save();
    ctx.translate(73, 58);
    ctx.rotate(-.9 + Math.sin(t * .4) * .15);
    ctx.fillStyle = '#8a98a0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 5, 0, 0, 6.3);
    ctx.fill();
    fillRect(-1, -14, 2, 14, '#8a98a0');
    ctx.restore();

    for (let i = 0; i < 4; i++) {
      const radius = (t * 18 + i * 12) % 48;
      ctx.strokeStyle = `rgba(224,164,63,${1 - radius / 48})`;
      ctx.beginPath();
      ctx.arc(80, 50, radius, -1.2, -.2);
      ctx.stroke();
    }

    drawText('DEEP SPACE NETWORK', 6, 16, '#e0a43f');
    drawText(((t * 2) | 0) % 2 ? 'AGUARDANDO RESPOSTA_' : 'AGUARDANDO RESPOSTA', 6, 80, '#7fe0a8');
  },
};

function csd(t) {
  ctx.clearRect(0, 0, 160, 90);
  SC[currentCutscene]((t - cutsceneStartTime) / 1000);

  for (let i = 0; i < 30; i++) {
    fillRect(Math.random() * 160, Math.random() * 90, 1, 1, '#ffffff18');
  }

  fillRect(0, 0, 160, 6, '#000');
  fillRect(0, 84, 160, 6, '#000');
}

export function setCutscene(name) {
  currentCutscene = name;
  cutsceneStartTime = performance.now();
}

export function clearCutscene() {
  currentCutscene = null;
}

function rover(x, y, scale, angle) {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.scale(scale, scale);

  g.fillStyle = '#1c1816';
  [-20, 0, 20].forEach((wheelX) => {
    g.beginPath();
    g.arc(wheelX, -6, 6, 0, 7);
    g.fill();
  });

  g.fillStyle = '#c8ccd0';
  g.fillRect(-24, -24, 48, 14);
  g.fillStyle = '#8e9499';
  g.fillRect(-24, -14, 48, 3);

  g.fillStyle = '#24385c';
  g.fillRect(-34, -28, 68, 4);
  g.fillStyle = '#4a6aa0';
  g.fillRect(-34, -28, 68, 1.5);

  g.fillStyle = '#b0b4b8';
  g.fillRect(14, -44, 3, 18);
  g.fillStyle = '#222';
  g.fillRect(10, -48, 12, 6);
  g.fillStyle = '#6fa';
  g.fillRect(19, -46, 2, 2);

  g.restore();
}

const gy = (x) => H * .74 + 10 * Math.sin(x * .008) + 5 * Math.sin(x * .031);
const hs = (i) => {
  const random = Math.sin(i * 12.9898) * 43758.5453;
  return random - Math.floor(random);
};

function draw(t) {
  const mode = S.mode;
  const isEnd = mode === 'end';

  let scale = 1;
  let cameraX = S.x - W * .4;

  if (isEnd) {
    const k = Math.min(1, (t - S.t0) / 9500);
    scale = 1.8 - 1.74 * k * k;
    cameraX = -W * .5;
  }

  const palette = PAL[S.pal];
  const dust = S.dust;

  const gradient = g.createLinearGradient(0, 0, 0, H * .75);
  gradient.addColorStop(0, mx(palette[0], '#140a07', dust * .9));
  gradient.addColorStop(1, mx(palette[1], '#140a07', dust * .9));

  g.fillStyle = gradient;
  g.fillRect(0, 0, W, H);

  g.globalAlpha = (1 - dust) ** 2;
  g.fillStyle = '#ffeccd';
  g.beginPath();
  g.arc(W * .78, isEnd ? H * .69 : H * .5, isEnd ? 36 : 24, 0, 7);
  g.fill();
  g.globalAlpha = 1;

  g.fillStyle = mx('#7a4430', '#140a07', dust * .85);
  g.beginPath();
  g.moveTo(0, H);

  for (let x = 0; x <= W + 10; x += 10) {
    g.lineTo(x, H * .66 - 24 * Math.sin((x + cameraX * .2) * .004) - 12 * Math.sin((x + cameraX * .2) * .013));
  }

  g.lineTo(W, H);
  g.fill();

  g.fillStyle = mx('#8a4a2c', '#140a07', dust * .85);
  g.beginPath();
  g.moveTo(0, H);

  for (let x = 0; x <= W + 8; x += 8) {
    g.lineTo(x, gy(x + cameraX));
  }

  g.lineTo(W, H);
  g.fill();

  for (let i = Math.floor(cameraX / 120) - 1; i <= (cameraX + W) / 120 + 1; i++) {
    const noise = hs(i);

    if (noise > .45) {
      const x = i * 120 + noise * 90;
      const size = 5 + noise * 14;

      g.fillStyle = mx('#5a2f1d', '#140a07', dust * .85);
      g.beginPath();
      g.ellipse(x - cameraX, gy(x), size * 1.4, size * .7, 0, Math.PI, 0);
      g.fill();
    }
  }

  if (S.obj) {
    S.obj.forEach((o, i) => {
      if (i < S.oi) return;

      const sx = o.x - cameraX;
      const y = gy(o.x);

      g.fillStyle = '#c7824f';
      g.beginPath();
      g.ellipse(sx, y, 26, 16, 0, Math.PI, 0);
      g.fill();

      if (i === S.oi) {
        g.fillStyle = '#ffd9b8';
        const bob = Math.sin(t * .005) * 5;
        g.beginPath();
        g.moveTo(sx, y - 50 + bob);
        g.lineTo(sx - 8, y - 62 + bob);
        g.lineTo(sx + 8, y - 62 + bob);
        g.fill();
      }
    });
  }

  if (mode !== 'black' && mode !== 'term') {
    const roverX = isEnd ? W * .5 : S.x - cameraX;
    const roverY = gy(isEnd ? cameraX + roverX : S.x) + S.sink;
    const angle = Math.atan2(gy(S.x + 20) - gy(S.x - 20), 40) * .8;
    rover(roverX, roverY + (isEnd ? 0 : 0), isEnd ? scale : 1.4, isEnd ? 0 : angle);
  }

  if (dust > .05) {
    g.fillStyle = `rgba(222,160,120,${.25 * dust})`;

    for (let i = 0; i < dust * 140; i++) {
      const x = (i * 97 + t * .25 * (1 + i % 3)) % W;
      const y = (i * 53) % H;
      g.fillRect(x, y, 14 + i % 20, 1);
    }
  }

  if (S.vis) {
    g.fillStyle = 'rgba(60,130,200,.45)';
    g.fillRect(0, H * .68, W, H);
    g.fillStyle = 'rgba(120,180,255,.18)';
    g.fillRect(0, 0, W, H * .68);
  }
}

export function startLoop(update) {
  let last = 0;

  function loop(t) {
    const dt = Math.min(50, t - last);
    last = t;

    update(dt);
    draw(t);

    if (currentCutscene) {
      csd(t);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
