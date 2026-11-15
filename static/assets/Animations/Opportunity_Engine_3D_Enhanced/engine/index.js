import { WebGLRenderer } from 'three';
import { createAudio } from './audio.js';
import { createHud, injectStyle } from './hud.js';
import { configureQualityRenderer, getRenderProfile } from './quality.js';

/** A scene factory returns { scene, camera, update(seconds), dispose() }. */
export function createAnimation({
  createScene, duration, container = document.body,
  width = 192, height = Math.round(width * 9 / 16), fps = 15,
  autoplay = true, loop = false, sound = false,
  hud = [], captions = [], beeps = [], showHud = true, fontFamily,
  pixelated = true, responsive = false, maxPixelRatio = 1.6,
  rendererOptions = {}, configureRenderer, animateWhenPaused = false,
  renderQuality = null,
  onComplete, onUpdate,
} = {}) {
  for (const [name, value] of Object.entries({ duration, width, height, fps, maxPixelRatio })) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive and finite`);
  }
  if (typeof createScene !== 'function') throw new TypeError('createScene must be a function');
  if (renderQuality !== null && !['low','balanced','high'].includes(renderQuality)) {
    throw new RangeError('renderQuality must be low, balanced, high, or null');
  }
  const smoothCanvas = !pixelated || renderQuality !== null;
  const effectivePixelRatio = () => smoothCanvas
    ? Math.min(window.devicePixelRatio || 1, maxPixelRatio, renderQuality ? getRenderProfile(renderQuality).maxPixelRatio : Infinity)
    : 1;

  injectStyle();
  const root = document.createElement('div');
  root.className = 'animation-root';
  root.classList.toggle('animation-smooth', smoothCanvas);
  root.classList.toggle('animation-responsive', responsive);
  root.style.aspectRatio = `${width} / ${height}`;
  root.style.width = `min(100%, ${100 * width / height}vh)`;
  if (fontFamily) root.style.setProperty('--animation-font', fontFamily);
  const canvas = document.createElement('canvas');
  canvas.className = 'animation-canvas';
  root.appendChild(canvas);

  let renderer, world, hudUi, audio, resizeObserver;
  let time = 0, elapsed = 0, last = -1, raf = 0, previous = 0;
  let running = false, done = false, disposed = false;

  const draw = (seconds) => {
    const data = world.update(seconds, { elapsed, playing: running, completed: done });
    renderer.render(world.scene, world.camera);
    hudUi.update(seconds);
    audio.update(seconds);
    onUpdate?.({ time: seconds, duration, playing: running, completed: done, data }, api);
  };

  const schedule = () => {
    if (!raf && !disposed && (running || animateWhenPaused)) raf = requestAnimationFrame(tick);
  };

  const tick = (now) => {
    raf = 0;
    if (disposed || (!running && !animateWhenPaused)) return;
    const delta = Math.max(0, Math.min((now - previous) / 1000, 0.1));
    elapsed += delta;
    if (running) time += delta;
    previous = now;
    if (running && time >= duration) {
      if (!loop) {
        time = duration;
        api.pause();
        done = true;
        draw(time);
        root.dispatchEvent(new CustomEvent('animation:complete', { bubbles: true }));
        onComplete?.(api);
        schedule();
        return;
      }
      time %= duration;
      last = -1;
      audio.reset();
    }
    const step = Math.floor((animateWhenPaused ? elapsed : time) * fps);
    if (step !== last) {
      last = step;
      draw(animateWhenPaused ? time : Math.floor(time * fps) / fps);
    }
    schedule();
  };

  const api = {
    root,
    get time() { return time; },
    get duration() { return duration; },
    get playing() { return running; },
    get completed() { return done; },
    play() {
      if (running || disposed || done) return;
      running = true;
      previous = performance.now();
      schedule();
    },
    pause() {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
      schedule();
    },
    reset() {
      if (disposed) return;
      api.pause();
      time = 0;
      elapsed = 0;
      done = false;
      world.reset?.();
      audio.reset();
      draw(0);
      last = 0;
    },
    restart() {
      if (disposed) return;
      api.reset();
      api.play();
    },
    setSound(on) { if (!disposed) audio.setEnabled(on); },
    dispose() {
      if (disposed) return;
      disposed = true;
      api.pause();
      resizeObserver?.disconnect();
      window.removeEventListener?.('resize', resize);
      // Always release the WebGL context, even if a scene's cleanup fails.
      try {
        audio?.dispose();
        hudUi?.dispose();
        world?.dispose();
      } finally {
        renderer?.dispose();
        renderer?.forceContextLoss();
        root.remove();
      }
    },
  };

  const resize = () => {
    if (disposed) return;
    const w = Math.max(1, container.clientWidth || width);
    const h = Math.max(1, container.clientHeight || height);
    renderer.setPixelRatio(effectivePixelRatio());
    renderer.setSize(w, h, false);
    world.camera.aspect = w / h;
    world.camera.updateProjectionMatrix();
    world.resize?.(w, h);
    draw(time);
  };

  try {
    renderer = new WebGLRenderer({ antialias: smoothCanvas, alpha: smoothCanvas, stencil: false, powerPreference: smoothCanvas ? 'high-performance' : 'low-power', ...rendererOptions, canvas });
    if (renderQuality) configureQualityRenderer(renderQuality)(renderer);
    configureRenderer?.(renderer);
    renderer.setPixelRatio(effectivePixelRatio());
    renderer.setSize(width, height, false);
    world = createScene({ width, height, element: root });
    hudUi = createHud(root, { hud, captions, enabled: showHud });
    audio = createAudio(beeps);
    audio.setEnabled(sound);
    container.appendChild(root);
    if (responsive) {
      resize();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      window.addEventListener('resize', resize);
    } else draw(0);
    last = 0;
    previous = performance.now();
    if (autoplay) api.play();
    else schedule();
    return api;
  } catch (error) {
    api.dispose();
    throw error;
  }
}
