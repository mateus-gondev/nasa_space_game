const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadEngine() {
  let now = 0, nextId = 0;
  const frames = new Map();
  const renders = [];
  const elements = [];
  const renderer = { disposed: 0, lost: 0 };
  const observers = [];
  const listeners = new Map();
  function element() {
    const el = {
      children: [], events: [], textContent: '',
      style: { setProperty() {} },
      classList: { toggle(name, enabled) { this[name] = enabled; } },
      appendChild(child) { this.children.push(child); child.parent = this; },
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); },
      dispatchEvent(event) { this.events.push(event.type); },
    };
    elements.push(el);
    return el;
  }
  const context = vm.createContext({
    document: { body: element(), head: element(), createElement: element, getElementById: id => elements.find(el => el.id === id) },
    window: {
      devicePixelRatio: 3,
      addEventListener: (name, fn) => listeners.set(name, fn),
      removeEventListener: name => listeners.delete(name),
    },
    ResizeObserver: class {
      constructor(fn) { this.callback = fn; observers.push(this); }
      observe(target) { this.target = target; }
      disconnect() { this.disconnected = true; }
    },
    performance: { now: () => now },
    requestAnimationFrame: fn => { frames.set(++nextId, fn); return nextId; },
    cancelAnimationFrame: id => frames.delete(id),
    CustomEvent: class { constructor(type) { this.type = type; } },
    WebGLRenderer: class {
      constructor(options) { renderer.options = options; renderer.instance = this; }
      setPixelRatio(value) { renderer.pixelRatio = value; }
      setSize(width, height) { renderer.size = [width, height]; }
      render(scene, camera) { renders.push([scene, camera]); }
      dispose() { renderer.disposed++; }
      forceContextLoss() { renderer.lost++; }
    },
  });
  // Substitute only browser imports; execute the actual engine/HUD/audio code.
  for (const name of ['audio.js', 'hud.js', 'index.js']) {
    const source = fs.readFileSync(path.join(__dirname, '../static/assets/Animations/engine', name), 'utf8');
    vm.runInContext(source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, ''), context);
  }
  const times = [];
  let cleanups = 0;
  const createScene = () => ({ scene: {}, camera: {}, update: t => times.push(t), dispose: () => cleanups++ });
  return {
    create: options => context.createAnimation({ createScene, duration: 0.3, ...options }),
    advance(ms) {
      now += ms;
      const pending = [...frames.values()]; frames.clear();
      pending.forEach(fn => fn(now));
    },
    frames, times, renders, renderer, context, observers, listeners,
    get cleanups() { return cleanups; },
  };
}

test('player pauses, resumes, completes once and restarts without duplicate frames', () => {
  const env = loadEngine();
  let completions = 0;
  const animation = env.create({ autoplay: false, onComplete: () => completions++ });
  assert.equal(env.frames.size, 0);
  assert.deepEqual(env.times, [0]);
  animation.play(); animation.play();
  assert.equal(env.frames.size, 1);
  env.advance(100);
  const pausedTime = animation.time;
  animation.pause(); env.advance(1000);
  assert.equal(animation.time, pausedTime);
  animation.play(); env.advance(100); env.advance(100); env.advance(100);
  assert.equal(completions, 1);
  assert.equal(animation.time, animation.duration);
  assert.equal(animation.playing, false);
  assert.deepEqual(animation.root.events, ['animation:complete']);
  animation.play(); env.advance(100);
  assert.equal(completions, 1);
  animation.restart(); animation.restart();
  assert.equal(animation.time, 0);
  assert.equal(env.frames.size, 1);
  env.advance(100); env.advance(100); env.advance(100); env.advance(100);
  assert.equal(completions, 2);
  animation.dispose(); animation.dispose(); animation.play(); animation.restart();
  assert.equal(env.cleanups, 1);
  assert.equal(env.renderer.disposed, 1);
  assert.equal(env.renderer.lost, 1);
  assert.equal(env.frames.size, 0);
  assert.equal(env.context.document.body.children.length, 0);
});

test('smooth responsive scenes retain animated preview, telemetry, reset and clean resize subscriptions', () => {
  const env = loadEngine();
  const container = env.context.document.body;
  container.clientWidth = 800;
  container.clientHeight = 600;
  let resets = 0, projections = 0;
  const sizes = [], updates = [];
  const camera = { updateProjectionMatrix() { projections++; } };
  const animation = env.create({
    autoplay: false, responsive: true, pixelated: false, animateWhenPaused: true,
    configureRenderer(renderer) { renderer.configured = true; },
    createScene: () => ({
      scene: {}, camera,
      update(time, state) { return { time, elapsed: state.elapsed }; },
      resize(w, h) { sizes.push([w, h]); }, reset() { resets++; }, dispose() {},
    }),
    onUpdate: state => updates.push(state),
  });
  assert.deepEqual(env.renderer.size, [800, 600]);
  assert.equal(env.renderer.pixelRatio, 1.6);
  assert.equal(env.renderer.options.antialias, true);
  assert.equal(env.renderer.options.alpha, true);
  assert.equal(env.renderer.instance.configured, true);
  assert.equal(camera.aspect, 800 / 600);
  env.advance(100);
  assert.equal(animation.time, 0, 'preview does not start the launch');
  assert.ok(updates.at(-1).data.elapsed > 0);
  animation.play(); animation.play(); env.advance(100);
  assert.ok(animation.time > 0);
  animation.reset();
  assert.equal(resets, 1);
  assert.equal(animation.time, 0);
  assert.equal(animation.playing, false);
  assert.equal(animation.completed, false);
  assert.equal(env.frames.size, 1, 'reset retains exactly one preview frame');
  container.clientWidth = 400;
  env.observers[0].callback();
  assert.deepEqual(sizes.at(-1), [400, 600]);
  assert.equal(projections, 2);
  animation.dispose();
  assert.equal(env.observers[0].disconnected, true);
  assert.equal(env.listeners.size, 0);
  assert.equal(env.frames.size, 0);
});

test('scene cleanup disposes shared materials, texture maps and shadow resources once', () => {
  const context = vm.createContext({});
  const source = fs.readFileSync(path.join(__dirname, '../static/assets/Animations/engine/resources.js'), 'utf8');
  vm.runInContext(source.replace(/^export /gm, ''), context);
  const counts = {};
  const resource = name => ({ dispose() { counts[name] = (counts[name] || 0) + 1; } });
  const geometry = resource('geometry'), texture = { ...resource('texture'), isTexture: true };
  const material = { ...resource('material'), map: texture };
  const shadow = resource('shadow');
  context.disposeScene({ traverse(fn) {
    fn({ geometry, material }); fn({ geometry, material: [material], shadow });
  } }, [geometry, texture]);
  assert.deepEqual(counts, { geometry: 1, texture: 1, material: 1, shadow: 1 });
});

test('drag rotation handles pointer capture, reset and listener cleanup', () => {
  const context = vm.createContext({});
  const source = fs.readFileSync(path.join(__dirname, '../static/assets/Animations/engine/controls.js'), 'utf8');
  vm.runInContext(source.replace(/^export /gm, ''), context);
  const handlers = new Map();
  let captured = null;
  const element = {
    classList: { add() {}, remove() {} },
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: name => handlers.delete(name),
    setPointerCapture: id => captured = id,
    hasPointerCapture: id => captured === id,
    releasePointerCapture: () => captured = null,
  };
  const controls = context.createDragRotation(element);
  handlers.get('pointerdown')({ pointerId: 1, clientX: 20, button: 0 });
  handlers.get('pointermove')({ pointerId: 2, clientX: 500 });
  assert.equal(controls.angle, 0.1);
  handlers.get('pointermove')({ pointerId: 1, clientX: 120 });
  assert.ok(Math.abs(controls.angle - 1) < 0.00001);
  handlers.get('pointerup')({ pointerId: 2 });
  assert.equal(captured, 1, 'a second pointer cannot end the active drag');
  controls.reset();
  assert.equal(controls.angle, 0.1);
  assert.equal(captured, null);
  controls.dispose();
  assert.equal(handlers.size, 0);
});

test('exhaust reuses geometry, samples deterministically and releases resources', () => {
  let geometries = 0, disposedGeometries = 0, disposedMaterials = 0;
  const vector = () => ({ set(...values) { this.values = values; }, setScalar(value) { this.values = [value, value, value]; } });
  class Group {
    constructor() { this.children = []; this.position = vector(); }
    add(child) { this.children.push(child); }
    traverse(fn) { fn(this); this.children.forEach(fn); }
    removeFromParent() {}
  }
  const context = vm.createContext({
    Group,
    Mesh: class {
      constructor(geometry, material) { this.geometry = geometry; this.material = material; this.position = vector(); this.scale = vector(); }
    },
    IcosahedronGeometry: class {
      constructor() { geometries++; }
      dispose() { disposedGeometries++; }
    },
    MeshBasicMaterial: class {
      constructor(options) { Object.assign(this, options); }
      dispose() { disposedMaterials++; }
    },
  });
  for (const file of ['resources.js', 'particles.js']) {
    const source = fs.readFileSync(path.join(__dirname, '../static/assets/Animations/engine', file), 'utf8');
    vm.runInContext(source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, ''), context);
  }
  assert.throws(() => context.createExhaustParticles({ count: 0 }));
  const dust = context.createExhaustParticles();
  assert.equal(dust.group.children.length, 38);
  assert.equal(geometries, 4);
  assert.equal(dust.group.visible, false);
  dust.update(1.5, 3);
  const positions = dust.group.children.map(particle => [...particle.position.values]);
  dust.update(3);
  dust.update(1.5, 3);
  assert.deepEqual(dust.group.children.map(particle => [...particle.position.values]), positions);
  assert.equal(dust.group.position.y, 3);
  dust.reset();
  assert.equal(dust.group.visible, false);
  dust.dispose();
  assert.equal(disposedGeometries, 4);
  assert.equal(disposedMaterials, 38);
});

test('loop resets HUD and captions, limits rendering by FPS and clamps background gaps', () => {
  const env = loadEngine();
  let completions = 0;
  const animation = env.create({ duration: 0.25, fps: 10, loop: true,
    captions: [[0, 'START'], [0.1, 'END']], hud: [[0.1, 'OK']], onComplete: () => completions++ });
  const caption = animation.root.children[1];
  const hudLine = animation.root.children[2].children[0];
  env.advance(10);
  assert.equal(env.renders.length, 1);
  env.advance(100);
  assert.equal(caption.textContent, 'END');
  assert.equal(hudLine.classList.on, true);
  env.advance(100); env.advance(100);
  assert.ok(animation.time < 0.1);
  assert.equal(caption.textContent, 'START');
  assert.equal(hudLine.classList.on, false);
  assert.equal(completions, 0);
  const before = animation.time;
  env.advance(10000);
  assert.ok(animation.time - before <= 0.101);
  animation.dispose();
});

test('embedded 3D animation effects use the parent game audio channel', () => {
  const env = loadEngine();
  const effects = [];
  env.context.window.AnimationPreferences = { embedded: true, playEffect: (...args) => effects.push(args) };
  const animation = env.create({ sound: true, beeps: [[.1, 440, .08]] });
  env.advance(100); env.advance(100);
  assert.deepEqual(effects, [[440, .08]]);
  animation.dispose();
});

test('invalid options and scene initialization failures do not leak the renderer', () => {
  const env = loadEngine();
  for (const options of [{ duration: 0 }, { fps: NaN }, { width: -1 }, { height: Infinity }, { createScene: null }]) {
    assert.throws(() => env.create(options));
  }
  assert.throws(() => env.create({ createScene() { throw new Error('scene failed'); } }), /scene failed/);
  assert.equal(env.renderer.disposed, 1);
  assert.equal(env.renderer.lost, 1);
  assert.equal(env.frames.size, 0);
});
