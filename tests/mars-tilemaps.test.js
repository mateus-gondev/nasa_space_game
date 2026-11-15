const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

async function load() {
  const context = vm.createContext({
    window: {},
    fetch: async () => ({ok: true, json: async () => JSON.parse(read('static/assets/marte_tilemap/scene_manifest.json'))}),
    MapRenderer: class { constructor(canvas) { this.canvas = canvas; } },
    MapControls: class { getMovement() { return {x: 0, y: 0}; } }
  });
  for (const file of ['config', 'map-data', 'tilemap-data', 'engine']) {
    vm.runInContext(read('static/opportunity-mars-five-worlds/js/' + file + '.js'), context);
  }
  await context.window.MARS_TILEMAP_READY;
  return context.window;
}

test('landing area uses the supplied ship map, with clear spawns and accessible passages', async () => {
  const {MARS_WORLDS: worlds, MAP_ENGINE_CONFIG: config, MapEngine} = await load();
  assert.equal(worlds.list[0].id, 'mapa_01_pouso');
  assert.match(read('static/lab_training/js/app.js'), /mars-test\/\?world=mapa_01_pouso/);
  for (const map of worlds.list.slice(0, 3)) {
    assert.ok(fs.existsSync(path.join(root, 'static', map.tilemapImage)));
    const engine = new MapEngine({canvas: {}, map, config});
    assert.equal(engine.collides(...map.spawn), false, map.id + ' spawn');
    const queue = [[Math.floor(map.spawn[0]) + .5, Math.floor(map.spawn[1]) + .5]], seen = new Set();
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i], key = x + ',' + y;
      if (seen.has(key) || engine.collides(x, y)) continue;
      seen.add(key);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!seen.has((x + dx) + ',' + (y + dy))) queue.push([x + dx, y + dy]);
      }
    }
    for (const exit of map.transitions) {
      assert.ok([...seen].some(key => {
        const [x, y] = key.split(',').map(Number);
        return x >= exit.x && x <= exit.x + exit.w && y >= exit.y && y <= exit.y + exit.h;
      }), map.id + ': reachable ' + exit.target);
    }
  }
});

test('walking through each authored passage enters the correct side without bouncing back', async () => {
  const {MARS_WORLDS: worlds, MAP_ENGINE_CONFIG: config, MapEngine} = await load();
  for (const map of worlds.list.slice(0, 3)) for (const exit of map.transitions) {
    let changes = 0;
    const engine = new MapEngine({canvas: {}, config, map, onTravel(id, spawn) {
      changes++;
      engine.setMap(worlds.byId[id]);
      Object.assign(engine.player, {x: spawn[0], y: spawn[1]});
    }});
    engine.player.x = exit.x === 0 ? .5 : exit.x;
    engine.player.y = exit.y + exit.h / 2;
    assert.equal(engine.collides(engine.player.x, engine.player.y), false);
    engine.update(.016);
    assert.equal(engine.map.id, exit.target);
    assert.equal(engine.player.x, exit.destinationSpawn[0]);
    assert.equal(engine.player.y, exit.destinationSpawn[1]);
    assert.equal(engine.collides(engine.player.x, engine.player.y), false);
    engine.update(.016);
    assert.equal(changes, 1);
  }
});
