const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('tool shortcuts stay available while the research selector blocks movement', () => {
  const context = vm.createContext({
    window: { addEventListener() {} },
    document: { querySelectorAll: () => [], querySelector: () => null },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/opportunity-map-engine-v2/opportunity-map-engine/js/controls.js'), 'utf8'), context);
  const selected = [];
  const interactions = [];
  const controls = new context.window.MapControls({
    onToolSelect: key => selected.push(key),
    interact: source => interactions.push(source)
  });
  const event = key => ({ key, target: { tagName: 'BODY' }, preventDefault() {} });
  controls.onKeyDown(event('e'));
  assert.deepEqual(interactions, ['keyboard']);
  controls.movementEnabled = false;
  controls.onKeyDown(event('3'));
  controls.onKeyDown(event('2'));
  controls.onKeyDown(event('w'));
  assert.deepEqual(selected, [3, 2]);
  assert.equal(controls.keys.size, 0);
  controls.enabled = false;
  controls.onKeyDown(event('4'));
  assert.deepEqual(selected, [3, 2]);
});

test('interaction source reaches the app callback without changing keyboard defaults', () => {
  const { MapEngine } = loadTraining();
  const interactions = [];
  const engine = Object.create(MapEngine.prototype);
  engine.nearObject = { trainingId: 'microscope' };
  engine.onInteract = (...args) => { interactions.push(args); return true; };
  engine.inspectNearby = () => assert.fail('handled interactions should not open inspection');

  engine.interact('mouse');
  engine.interact('gamepad');
  engine.interact();

  assert.deepEqual(interactions, [
    [engine.nearObject, null, 'mouse'],
    [engine.nearObject, null, 'gamepad'],
    [engine.nearObject, null, 'keyboard']
  ]);
});

test('gamepad axes preserve analog intensity and buttons trigger once per press', () => {
  const listeners = {};
  const frames = [];
  let gamepads = [];
  const context = vm.createContext({
    window: {
      navigator: { getGamepads: () => gamepads },
      addEventListener: (type, callback) => { listeners[type] = callback; },
      requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
      cancelAnimationFrame() {},
    },
    document: { querySelectorAll: () => [], querySelector: () => null },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/opportunity-map-engine-v2/opportunity-map-engine/js/controls.js'), 'utf8'), context);
  const actions = [];
  const connectionChanges = [];
  const controls = new context.window.MapControls({
    onGamepadInteract: () => actions.push('cross'),
    onToolPanelToggle: () => actions.push('r1'),
    onToolConfirm: () => actions.push('square'),
    onToolNavigate: direction => actions.push(direction),
  });
  controls.engine.onGamepadChange = connected => connectionChanges.push(connected);
  const pad = {
    index: 0, connected: true, mapping: 'standard', axes: [0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
  };
  gamepads = [pad];
  listeners.gamepadconnected({ gamepad: pad });
  assert.equal(controls.gamepadConnected, true);
  assert.deepEqual(connectionChanges, [true]);
  assert.equal(controls.inputMode, 'gamepad');

  pad.axes[0] = 0.1;
  assert.equal(controls.getMovement().x, 0, 'deadzone prevents drift');
  pad.axes[0] = 0.59;
  assert.ok(Math.abs(controls.getMovement().x - 0.5) < 1e-9, 'stick magnitude is rescaled after the deadzone');
  pad.axes[0] = 0;
  const frame = timestamp => frames.shift()(timestamp);
  frame(0);
  pad.buttons[0].pressed = true;
  frame(16);
  frame(32);
  assert.deepEqual(actions, ['cross'], 'holding X does not repeat the action');
  pad.buttons[0].pressed = false;
  frame(48);
  pad.buttons[0].pressed = true;
  frame(64);
  assert.deepEqual(actions, ['cross', 'cross'], 'a release allows another press');

  pad.buttons[0].pressed = false;
  frame(80);
  pad.buttons[5].pressed = true;
  frame(96);
  pad.buttons[5].pressed = false;
  frame(112);
  pad.buttons[2].pressed = true;
  frame(128);
  assert.deepEqual(actions, ['cross', 'cross', 'r1', 'square']);

  pad.buttons[2].pressed = false;
  pad.axes[1] = -0.8;
  frame(144);
  assert.equal(actions.at(-1), -1, 'left-stick navigation reports the up direction');

  gamepads = [];
  listeners.gamepaddisconnected({ gamepad: pad });
  assert.equal(controls.gamepadConnected, false);
  assert.equal(controls.inputMode, 'keyboard');
  assert.deepEqual(connectionChanges, [true, false]);
});

test('engine scales movement speed by analog intensity while keeping digital input full speed', () => {
  const { MapEngine } = loadTraining();
  const engine = Object.create(MapEngine.prototype);
  engine.config = { player: { speed: 4 } };
  engine.controls = { getMovement: () => ({ x: 0.5, y: 0 }) };
  engine.player = { x: 1, y: 1, moving: false, updateAnimation() {} };
  engine.map = { doors: [] };
  engine.nearObject = null;
  engine.findNearbyObject = () => null;
  engine.collides = () => false;
  engine.onStateChange = () => {};
  engine.getState = () => ({});

  engine.update(0.5);
  assert.equal(engine.player.x, 2, 'half tilt produces half the full-speed displacement');
  engine.controls.getMovement = () => ({ x: 1, y: 0 });
  engine.update(0.5);
  assert.equal(engine.player.x, 4, 'digital input retains full speed');
});

test('gamepad tutorial prompts and button labels are translated', () => {
  const context = vm.createContext({
    window: { dispatchEvent() {} },
    document: { documentElement: {}, querySelectorAll: () => [] },
    CustomEvent: class CustomEvent {},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../static/lab_training/js/i18n.js'), 'utf8'), context);
  context.window.GameI18n.setLanguage('en');
  assert.equal(context.window.GameI18n.t('Pular tutorial'), 'Skip tutorial');
  assert.equal(context.window.GameI18n.t('Botão X (Cross)'), 'X (Cross) button');
  assert.equal(context.window.GameI18n.t('Botão esquerdo do mouse'), 'Left mouse button');
  assert.equal(context.window.GameI18n.t('Botão R1'), 'R1 button');
  assert.equal(context.window.GameI18n.t('Botão Quadrado'), 'Square button');
  assert.equal(
    context.window.GameI18n.t('Use R1 para abrir os slots, navegue até Câmera com o analógico esquerdo e confirme com Quadrado. Na visão 3D, clique em Fotografar.'),
    'Press R1 to open the slots, navigate to Camera with the left stick, and confirm with Square. In the 3D view, click Take Photo.'
  );
});

function loadTraining() {
  const context = vm.createContext({ window: { MapRenderer: class {} } });
  for (const file of [
    'static/lab_training/js/config.js',
    'static/opportunity-map-engine-v2/opportunity-map-engine/js/map-data.js',
    'static/lab_training/js/map-data-training.js',
    'static/lab_training/js/tutorial.js',
    'static/lab_training/js/tutorial-navigation.js',
    'static/opportunity-map-engine-v2/opportunity-map-engine/js/engine.js'
  ]) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  return context.window;
}

test('tutorial equips once, then requires movement, map, gravity, tools and inventory before boarding', () => {
  const { LabTutorial } = loadTraining();
  const tutorial = new LabTutorial();
  const completed = tutorial.completedTools;
  assert.equal(tutorial.interact('ship'), false);
  tutorial.equip();
  tutorial.move(30, 'Atrium');
  assert.equal(tutorial.distance, 0, 'teleports do not count');
  for (let i = 0; i < 4; i++) tutorial.move(1, 'Instrument Lab');
  assert.equal(tutorial.phase, 'map');
  assert.equal(tutorial.targetId, 'gravity');
  tutorial.map(false);
  assert.equal(tutorial.phase, 'map');
  tutorial.map(true); tutorial.map(false);
  assert.equal(tutorial.phase, 'gravity');
  assert.equal(tutorial.interact('camera', 1), false);
  assert.equal(tutorial.interact('gravity'), true);
  for (let i = 0; i < 6; i++) tutorial.move(1, 'Instrument Lab');
  assert.equal(tutorial.phase, 'lab');
  tutorial.move(.1, 'Instrument Lab');
  assert.equal(tutorial.phase, 'lab');
  tutorial.move(.1, 'Atrium');
  for (const [index, id] of ['camera', 'microscope', 'temperature', 'drill'].entries()) {
    assert.equal(tutorial.phase, id);
    assert.equal(tutorial.interact(id, 0), false);
    assert.equal(tutorial.interact('wrong-station', index + 1), false);
    assert.equal(tutorial.interact(id, index + 1), true);
    assert.equal(tutorial.interact(id, index + 1), false, 'no duplicate results');
  }
  assert.equal(tutorial.completedTools.size, 4);
  assert.equal(tutorial.phase, 'inventory');
  tutorial.inventory(false);
  assert.equal(tutorial.phase, 'inventory');
  tutorial.inventory(true); tutorial.inventory(false);
  assert.equal(tutorial.phase, 'communication');
  assert.equal(tutorial.interact('ship'), false, 'report required before boarding');
  assert.equal(tutorial.interact('communication'), true);
  assert.match(tutorial.report, /MER-B/);
  assert.equal(tutorial.phase, 'ship');
  assert.equal(tutorial.finishLaunch(), false, 'entering the room is required');
  assert.equal(tutorial.interact('ship'), true);
  assert.equal(tutorial.phase, 'launch');
  tutorial.leaveLaunchRoom();
  assert.equal(tutorial.phase, 'ship', 'leaving without a flight does not complete training');
  assert.equal(tutorial.interact('ship'), true);
  assert.equal(tutorial.finishLaunch(), true);
  assert.equal(tutorial.phase, 'complete');
  assert.equal(tutorial.finishLaunch(), false, 'completion is not repeated');
  assert.match(tutorial.step.description, /Excelente trabalho, cadete/);
  tutorial.reset();
  assert.equal(tutorial.phase, 'intro');
  assert.equal(completed, tutorial.completedTools, 'UI retains the same progress set after reset');
  assert.equal(completed.size, 0);
});

test('tutorial can be skipped without simulating completion or retaining an objective', () => {
  const { LabTutorial } = loadTraining();
  const tutorial = new LabTutorial();
  tutorial.equip();
  tutorial.move(1, 'Instrument Lab');

  assert.equal(tutorial.skip(), true);
  assert.equal(tutorial.phase, 'skipped');
  assert.equal(tutorial.targetId, null);
  assert.equal(tutorial.step, undefined);
  assert.equal(tutorial.skip(), false);
  assert.equal(tutorial.finishLaunch(), false);
});

test('launch room replaces the flat rocket with walls, a walkable doorway and a reachable interior', () => {
  const { MAP_DATA: map, MAP_ENGINE_CONFIG: config, MapEngine, findTrainingRoute } = loadTraining();
  const engine = { map, config, player: { x: 22, y: 37.5 } };
  engine.collides = MapEngine.prototype.collides.bind(engine);
  assert.equal(map.props.some(prop => prop.type === 'ship'), false);
  assert.equal(map.props.find(prop => prop.trainingId === 'ship').solid, false);
  assert.equal(engine.collides(map.launchRoom.exit.x, map.launchRoom.exit.y), false);
  assert.equal(engine.collides(20.5, 38.5), true, 'north wall');
  assert.equal(engine.collides(21.5, 38.5), false, 'first door tile');
  assert.equal(engine.collides(22.5, 38.5), false, 'second door tile');
  assert.equal(engine.collides(19.5, 41.5), true, 'west wall');
  assert.equal(engine.collides(26.5, 41.5), true, 'east wall');
  assert.equal(engine.collides(22.5, 45.5), true, 'south wall');
  const route = findTrainingRoute(engine, { x: 22, y: 41, w: 1, h: 1 });
  assert.ok(route.length > 0);
  assert.ok(route.some(point => Math.floor(point.y) === 38 && [21, 22].includes(Math.floor(point.x))), 'route enters through the door');
  for (const point of route) assert.equal(engine.collides(point.x, point.y), false);
});

test('every objective has a walkable route from the previous station on the actual map', () => {
  const { MAP_DATA: map, MAP_ENGINE_CONFIG: config, MapEngine, findTrainingRoute } = loadTraining();
  const engine = { map, config, player: { x: config.player.startX, y: config.player.startY } };
  engine.collides = MapEngine.prototype.collides.bind(engine);
  for (const id of ['gravity', 'camera', 'microscope', 'temperature', 'drill', 'communication', 'ship']) {
    const target = map.props.find(prop => prop.trainingId === id);
    const route = findTrainingRoute(engine, target);
    assert(route.length > 0, `reachable station: ${id}`);
    for (let i = 0; i < route.length; i++) {
      assert.equal(engine.collides(route[i].x, route[i].y), false, `clear floor: ${id}`);
      if (i) assert.equal(Math.abs(route[i].x - route[i - 1].x) + Math.abs(route[i].y - route[i - 1].y), 1);
    }
    engine.player = route.at(-1);
    const dx = Math.max(target.x - engine.player.x, 0, engine.player.x - target.x - target.w);
    const dy = Math.max(target.y - engine.player.y, 0, engine.player.y - target.y - target.h);
    assert(Math.hypot(dx, dy) < config.interaction.distance, `interaction range: ${id}`);
  }
  assert.equal(findTrainingRoute(engine, null).length, 0);
});
