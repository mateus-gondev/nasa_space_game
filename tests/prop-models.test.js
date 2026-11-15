const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

test('all real map sprites have distinct, finite models with original footprints at every quality', async t => {
  const previousDocument = global.document;
  global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }) }) };
  t.after(() => { global.document = previousDocument; });
  const THREE = await import('three');
  const base = '../static/assets/Animations/Opportunity_Engine_3D_Enhanced/engine/';
  const moduleAt = name => import(pathToFileURL(path.join(__dirname, base, name)).href);
  const { createPropKit, createEnvironmentProp } = await moduleAt('props.js');
  const { createEnvironmentMaterials } = await moduleAt('materials.js');
  const { disposeScene } = await moduleAt('resources.js');
  const context = vm.createContext({ window: {} });
  for (const file of ['static/lab_training/js/config.js', 'static/opportunity-map-engine-v2/opportunity-map-engine/js/map-data.js', 'static/lab_training/js/map-data-training.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  }
  const props = context.window.MAP_DATA.props;
  const types = new Set(props.map(p => p.type));
  assert.equal(types.size, 31);
  const wideTypes = new Set(['screen', 'bench', 'shelf', 'locker', 'whiteboard', 'rack', 'battery']);
  let balancedTriangles = 0, lowTriangles = 0;
  for (const quality of ['low', 'balanced', 'high']) {
    const library = createEnvironmentMaterials({ quality }), kit = createPropKit(library.materials, { quality });
    const scene = new THREE.Scene();
    let triangles = 0, instances = 0;
    for (const prop of props) {
      const model = createEnvironmentProp(prop, kit); scene.add(model);
      assert.equal(model.userData.prop, prop, 'raycasts retain the actual prop reference');
      assert.equal(model.userData.modelType, prop.trainingId === 'camera' ? 'specimen' : prop.type);
      assert.equal(model.position.x, prop.x + prop.w / 2);
      assert.equal(model.position.z, prop.y + prop.h / 2);
      const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3());
      assert([size.x, size.y, size.z].every(n => Number.isFinite(n) && n > 0), `${quality}/${prop.type} has real geometry`);
      assert(bounds.min.y > -.12 && bounds.max.y < 3.15, `${quality}/${prop.type} fits between floor and ceiling: ${bounds.min.y}..${bounds.max.y}`);
      assert(size.x < prop.w + .3 && size.z < prop.h + .3, `${quality}/${prop.type} fits its footprint: ${size.x}x${size.z} vs ${prop.w}x${prop.h}`);
      if (wideTypes.has(prop.type) && prop.w >= 4) assert(size.x > prop.w * .85, `${prop.type} keeps full width instead of being clamped`);
      if (prop.type === 'rover') {
        assert.equal(model.children.filter(n => /^wheel-(left|right)-/.test(n.name)).length, 6);
        assert(model.getObjectByName('pancam-mast'));
      }
      if (prop.type === 'dish') assert(model.getObjectByName('parabolic-reflector'));
      if (prop.type === 'globe') assert(model.getObjectByName('mars-globe'));
      model.traverse(object => {
        if (!object.isMesh) return;
        assert(object.material?.isMaterial, `${prop.type} uses a real material`);
        const vertices = object.geometry.getAttribute('position').array;
        assert(vertices.every(Number.isFinite), `${prop.type} contains no invalid vertices`);
        const count = (object.geometry.index?.count || vertices.length / 3) / 3;
        triangles += count * (object.isInstancedMesh ? object.count : 1);
        if (object.isInstancedMesh) instances++;
      });
    }
    assert(instances > 100, 'repeated details use instances');
    assert(kit.materials['graphic:solar'].map.isCanvasTexture);
    assert(kit.materials.cartRed.color.getHexString() === 'b33a3a');
    if (quality === 'low') lowTriangles = triangles;
    if (quality === 'balanced') balancedTriangles = triangles;
    if (quality === 'high') assert(triangles > balancedTriangles);
    disposeScene(scene, [...Object.values(kit.geometry), ...Object.values(library.materials), ...Object.values(library.textures)]);
  }
  assert(lowTriangles < balancedTriangles, 'low quality reduces geometry while preserving model identities');
});
