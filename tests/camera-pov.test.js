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

test('3D scene uses the training map and raycasts the visible target without passing through walls', async () => {
  const threeURL = pathToFileURL(require.resolve('three').replace(/three\.cjs$/, 'three.module.js')).href;
  const THREE = await import(threeURL);
  const source = read('static/lab_training/js/camera-view.js')
    .replace('/vendor/three/three.module.js', threeURL)
    .replace('/assets/Animations/CameraPOV_arquivos/CameraPOVController.js', dataModule(controllerSource));
  const { createLabScene } = await import(dataModule(source));
  const context = vm.createContext({ window: {} });
  for (const file of [
    'static/lab_training/js/config.js',
    'static/opportunity-map-engine-v2/opportunity-map-engine/js/map-data.js',
    'static/lab_training/js/map-data-training.js',
  ]) vm.runInContext(read(file), context);
  const { MAP_DATA: map, MAP_ENGINE_CONFIG: config } = context.window;
  const scene = createLabScene(map, config, config.atmosphere.presets.clean);
  const target = map.props.find(prop => prop.trainingId === 'camera');
  const model = scene.children.find(object => object.userData.prop === target);
  assert.equal(model.position.x, target.x + target.w / 2);
  assert.equal(model.position.z, target.y + target.h / 2);
  const instances = scene.children.filter(object => object.isInstancedMesh);
  assert.equal(instances.reduce((total, mesh) => total + mesh.count, 0), map.grid.flat().filter(tile => tile >= 1).length);
  const camera = new THREE.PerspectiveCamera(70, 16 / 9, .05, 100);
  const raycaster = new THREE.Raycaster();
  function aim(x, z) {
    camera.position.set(x, 1.6, z);
    camera.lookAt(model.position.x, 1.4, model.position.z);
    camera.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    let object = raycaster.intersectObjects(scene.children, true)[0]?.object;
    while (object && !object.userData.prop) object = object.parent;
    return object?.userData.prop;
  }
  assert.equal(aim(target.x + .5, target.y + target.h + .5), target, 'nearby terrain can be photographed');
  assert.notEqual(aim(32.5, 7.5), target, 'wall occludes the terrain in the adjacent room');
  const geometries = new Set(), materials = new Set();
  scene.traverse(object => {
    if (object.isInstancedMesh) object.dispose();
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) materials.add(object.material);
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
});
