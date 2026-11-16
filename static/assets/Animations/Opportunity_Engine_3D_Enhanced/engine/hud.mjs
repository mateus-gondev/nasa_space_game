const STYLE_ID = 'animation-style';

// Todas as classes usam o prefixo "animation-" para não colidir com o CSS do projeto hospedeiro.
const CSS = `
.animation-root{--animation-font:'Press Start 2P',monospace;position:relative;width:min(100%,177.78vh);aspect-ratio:16/9;margin:0 auto;overflow:hidden;background:#000;container-type:inline-size;font-family:var(--animation-font)}
.animation-canvas{width:100%;height:100%;display:block;image-rendering:pixelated}
.animation-root::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px)}
.animation-hud{position:absolute;left:12cqw;top:15cqw;color:#9dffb0;font-size:1.5cqw;line-height:2.1;text-shadow:0 0 6px rgba(120,255,160,.7);z-index:2}
.animation-hud div{visibility:hidden}
.animation-hud div.on{visibility:visible}
.animation-cap{position:absolute;left:0;right:0;bottom:1.2cqw;text-align:center;color:#e8ecf4;font-size:1.4cqw;z-index:2;text-shadow:2px 2px 0 #000}
.animation-smooth{background:transparent}
.animation-smooth .animation-canvas{image-rendering:auto}
.animation-smooth::after{display:none}
.animation-responsive{width:100%!important;height:100%;aspect-ratio:auto!important}
`;

export function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** Cria HUD + legenda dentro de `root`. Só toca no DOM quando o conteúdo muda. */
export function createHud(root, { hud = [], captions = [], enabled = true } = {}) {
  const cap = document.createElement('div');
  cap.className = 'animation-cap';
  root.appendChild(cap);

  const box = document.createElement('div');
  box.className = 'animation-hud';
  const lines = hud.map(([, text]) => {
    const d = document.createElement('div');
    d.textContent = text;
    box.appendChild(d);
    return d;
  });
  if (enabled) root.appendChild(box);

  let lastCap = null;
  let lastN = -1;

  return {
    update(t) {
      let c = '';
      for (const [s, txt] of captions) if (t >= s) c = txt;
      if (c !== lastCap) {
        cap.textContent = c;
        lastCap = c;
      }
      let n = 0;
      for (const [s] of hud) if (t >= s) n++;
      if (n !== lastN) {
        lines.forEach((el, i) => el.classList.toggle('on', i < n));
        lastN = n;
      }
    },
    dispose() {
      cap.remove();
      box.remove();
    },
  };
}
