const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const controllerSource = read('static/assets/Animations/CameraPOV_arquivos/CameraPOVController.js');
const dataModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');

test('POV controller smooths look/zoom, clamps limits, resets heading and removes its listeners', () => {
  const listeners = new Map();
  function target(prefix) {
    return {
      style: { touchAction: 'pan-y' },
      addEventListener: (name, fn) => listeners.set(prefix + name, fn),
      removeEventListener: (name, fn) => {
        assert.equal(listeners.get(prefix + name), fn);
        listeners.delete(prefix + name);
      },
      setPointerCapture() {},
    };
  }
  const document = { ...target('doc:'), activeElement: null, pointerLockElement: null };
  const context = vm.createContext({ document });
  vm.runInContext(controllerSource.replace('export class', 'this.CameraPOVController = class'), context);
  const element = target('canvas:');
  const camera = {
    isPerspectiveCamera: true, fov: 70,
    rotation: { x: .1, y: .4, set(x, y) { this.x = x; this.y = y; } },
    updateProjectionMatrix() {},
  };
  const controller = new context.CameraPOVController({ camera, element, maxYaw: 60, minYaw: -60 });
  controller.enable({ pointerLock: false });
  listeners.get('canvas:pointerdown')({ pointerType: 'touch', pointerId: 1, clientX: 20, clientY: 20 });
  listeners.get('canvas:pointermove')({ pointerId: 1, clientX: 40, clientY: 30 });
  assert(Math.abs(controller.targetYaw - .35) < 1e-10);
  assert(Math.abs(controller.targetPitch - .075) < 1e-10);
  controller.look(1e6, -1e6);
  assert.equal(controller.targetYaw, -Math.PI / 3);
  assert.equal(controller.targetPitch, 80 * Math.PI / 180);
  controller.setZoom(99);
  controller.update(.1);
  assert(controller.zoom > 1 && controller.zoom < 4);
  for (let i = 0; i < 30; i++) controller.update(.1);
  assert(Math.abs(camera.fov - 17.5) < .001);
  controller.reset({ zoom: true });
  assert.equal(controller.targetYaw, .4);
  assert.equal(controller.targetPitch, .1);
  assert.equal(controller.targetZoom, 1);
  controller.disable();
  controller.look(200, 200);
  assert.equal(controller.targetYaw, .4);
  controller.dispose();
  assert.equal(listeners.size, 0);
  assert.equal(element.style.touchAction, 'pan-y');
});

test('enhanced 3D scene uses the training map, preserves photographic targets and disposes shared resources once', async t => {
  // Textures use Canvas in the browser. Geometry/raycast tests need only its drawing API.
  const originalDocument = global.document;
  global.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }) }) };
  t.after(() => { global.document = originalDocument; });
  const threeURL = pathToFileURL(require.resolve('three').replace(/three\.cjs$/, 'three.module.js')).href;
  const THREE = await import(threeURL);
  const source = read('static/lab_training/js/camera-view.js')
    .replace('/vendor/three/three.module.js', threeURL)
    .replace('/assets/Animations/CameraPOV_arquivos/CameraPOVController.js', dataModule(controllerSource))
    .replace(/\/assets\/Animations\/Opportunity_Engine_3D_Enhanced\/engine\/(environment|quality)\.js/g,
      (_, name) => pathToFileURL(path.join(root, 'static/assets/Animations/Opportunity_Engine_3D_Enhanced/engine', name + '.js')).href);
  const { createLabScene, LabCameraView } = await import(dataModule(source));
  const context = vm.createContext({ window: {} });
  for (const file of [
    'static/lab_training/js/config.js',
    'static/opportunity-map-engine-v2/opportunity-map-engine/js/map-data.js',
    'static/lab_training/js/map-data-training.js',
  ]) vm.runInContext(read(file), context);
  const { MAP_DATA: map, MAP_ENGINE_CONFIG: config } = context.window;
  const scene = createLabScene(map, config, config.atmosphere.presets.clean);
  assert.equal(scene.userData.environment.quality, 'balanced');
  assert.equal(scene.userData.environment.propCount, map.props.length);
  assert(scene.children.some(object => object.isDirectionalLight && object.castShadow));
  const target = map.props.find(prop => prop.trainingId === 'camera');
  const model = scene.children.find(object => object.userData.prop === target);
  assert.equal(model.position.x, target.x + target.w / 2);
  assert.equal(model.position.z, target.y + target.h / 2);
  const instances = scene.children.filter(object => object.isInstancedMesh);
  assert.equal(instances.reduce((total, mesh) => total + mesh.count, 0), map.grid.flat().filter(tile => tile >= 1).length + map.grid.flat().filter(tile => tile === 3).length);
  assert(instances.some(mesh => mesh.material.color.getHexString() === config.colors.floors[4].slice(1)), 'numeric floor types retain the project palette');
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, .05, 100);
  const raycaster = new THREE.Raycaster();
  function aim(x, z) {
    camera.position.set(x, 1.6, z);
    camera.lookAt(model.position.x, 1, model.position.z);
    camera.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    let object = raycaster.intersectObjects(scene.children, true)[0]?.object;
    while (object && !object.userData.prop) object = object.parent;
    return object?.userData.prop;
  }
  assert.equal(aim(target.x + .5, target.y + target.h + .5), target, 'nearby terrain can be photographed');
  assert.notEqual(aim(32.5, 7.5), target, 'wall occludes the terrain in the adjacent room');
  const resources = new Set();
  scene.traverse(object => {
    if (object.isInstancedMesh) resources.add(object);
    if (object.geometry) resources.add(object.geometry);
    if (object.material) {
      resources.add(object.material);
      for (const value of Object.values(object.material)) if (value?.isTexture) resources.add(value);
    }
  });
  assert([...resources].some(resource => resource.isCanvasTexture));
  const counts = new Map();
  resources.forEach(resource => resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1)));
  const view = { scene };
  LabCameraView.prototype.releaseScene.call(view);
  scene.userData.disposeEnvironment();
  assert.equal(view.scene, null);
  for (const resource of resources) assert.equal(counts.get(resource), 1, `${resource.type} disposed exactly once`);

  const lowScene = createLabScene(map, config, config.atmosphere.presets.clean, { quality: 'low' });
  assert.equal(lowScene.fog, null);
  assert(lowScene.children.every(object => !object.isDirectionalLight || !object.castShadow));
  lowScene.userData.disposeEnvironment();

  const { configureQualityRenderer, getRenderProfile } = await import(pathToFileURL(path.join(root, 'static/assets/Animations/Opportunity_Engine_3D_Enhanced/engine/quality.js')).href);
  const renderer = { shadowMap: {} };
  configureQualityRenderer('high')(renderer);
  assert.equal(renderer.shadowMap.enabled, true);
  assert.equal(renderer.toneMapping, THREE.ACESFilmicToneMapping);
  assert.equal(renderer.outputColorSpace, THREE.SRGBColorSpace);
  assert.equal(getRenderProfile('high').maxPixelRatio, 1.85);
  configureQualityRenderer('low')(renderer);
  assert.equal(renderer.shadowMap.enabled, false);
});
