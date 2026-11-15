const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

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
  for (const id of ['gravity', 'camera', 'microscope', 'temperature', 'drill', 'ship']) {
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
