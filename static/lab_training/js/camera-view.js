import * as THREE from '/vendor/three/three.module.js';
import { CameraPOVController } from '/assets/Animations/CameraPOV_arquivos/CameraPOVController.js';

// Um tile do mapa equivale a um metro. X/Y do mapa viram X/Z no Three.js.
export function createLabScene(map, config, mood) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0d1822');
  scene.fog = new THREE.Fog(scene.background, 22, 65);
  scene.add(new THREE.HemisphereLight('#d6efff', '#34303a', 2 * mood.lightOpacity + .4));
  const light = new THREE.DirectionalLight(mood.lightColor, 2);
  light.position.set(12, 25, 8);
  scene.add(light);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = new Map();
  const material = color => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .75 }));
    return materials.get(color);
  };
  const box = (parent, x, y, z, w, h, d, color) => {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  };
  const walls = [];
  const floors = config.colors.floors.map(() => []);
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const tile = map.grid[y][x];
    if (tile === 1) walls.push([x + .5, 1.6, y + .5]);
    if (tile >= 2) floors[map.floorMap[y][x] || 0].push([x + .5, -.06, y + .5]);
  }
  const matrix = new THREE.Matrix4();
  function instances(positions, size, color) {
    if (!positions.length) return;
    const mesh = new THREE.InstancedMesh(geometry, material(color), positions.length);
    positions.forEach(([x, y, z], index) => {
      matrix.makeScale(...size).setPosition(x, y, z);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }
  instances(walls, [.99, 3.2, .99], config.colors.wallSide);
  floors.forEach((tiles, i) => instances(tiles, [.98, .1, .98], config.colors.floors[i]));

  // Portas permanecem abertas nesta vista fixa, como passagens do mapa.
  for (const door of map.doors) {
    box(scene, door.x + .5, 2.9, door.y + .5, 1, .12, 1, mood.accent);
  }
  for (const prop of map.props) {
    const group = new THREE.Group();
    group.position.set(prop.x + prop.w / 2, 0, prop.y + prop.h / 2);
    group.userData.prop = prop;
    group.name = prop.name || prop.type;
    scene.add(group);
    const w = prop.w * .9, d = prop.h * .9;
    const color = prop.trainingId ? '#c18b50' : '#617b8c';
    const tall = ['cabinet', 'locker', 'rack', 'shelf', 'tank', 'battery'].includes(prop.type);
    const flat = ['pallet', 'solar', 'launchEntrance'].includes(prop.type);
    const height = tall ? 2.2 : flat ? .3 : 1;
    box(group, 0, height / 2, 0, w, height, d, color);
    box(group, 0, height + .04, 0, w, .08, d, '#b4c7d0');
    if (prop.trainingId === 'camera') {
      // Terreno simulado para a etapa fotográfica.
      box(group, 0, 1.12, 0, w * .85, .1, d * .9, '#b46e46');
      box(group, 0, 1.42, 0, w * .5, .5, d * .4, '#784831');
      box(group, 0, 1.05, 0, w * 1.05, .06, d * 1.05, '#ffca70');
    } else if (['console', 'desk', 'screen', 'whiteboard', 'spec', 'micro'].includes(prop.type)) {
      box(group, 0, 1.5, 0, w * .8, .65, .16, '#162c40');
      box(group, 0, 1.5, -.09, w * .7, .5, .02, mood.accent);
      box(group, 0, 1.5, .09, w * .7, .5, .02, mood.accent);
    } else if (prop.type === 'plant') {
      box(group, 0, 1.35, 0, w * .8, .8, d * .8, '#3c8660');
    } else if (['telescope', 'dish', 'rover', 'roboarm'].includes(prop.type)) {
      box(group, 0, 1.7, 0, .15, 1.4, .15, '#ccd6df');
      box(group, 0, 2.2, 0, w * .7, .5, d * .6, '#dce9ee');
    }
  }
  return scene;
}

export class LabCameraView {
  constructor({ container, map, config, onChange }) {
    this.container = container;
    this.map = map;
    this.config = config;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-label', 'Ambiente 3D ao redor do astronauta. Arraste ou use as setas para olhar.');
    container.prepend(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(70, 1, .05, 100);
    this.controller = new CameraPOVController({
      camera: this.camera, element: this.renderer.domElement, onChange,
    });
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(container);
    this.active = false;
  }

  open(player, mood, target) {
    this.releaseScene();
    this.scene = createLabScene(this.map, this.config, mood);
    this.camera.position.set(player.x, 1.6, player.y);
    let yaw = -player.angle - Math.PI / 2;
    let pitch = 0;
    if (target) {
      const dx = target.x + target.w / 2 - player.x;
      const dz = target.y + target.h / 2 - player.y;
      yaw = Math.atan2(-dx, -dz);
      pitch = Math.atan2(-.2, Math.hypot(dx, dz));
    }
    this.controller.initialYaw = this.controller.yaw = this.controller.targetYaw = yaw;
    this.controller.initialPitch = this.controller.pitch = this.controller.targetPitch = pitch;
    this.controller.zoom = this.controller.targetZoom = 1;
    this.controller.enable({ pointerLock: false });
    this.controller.update(0);
    this.active = true;
    this.resize();
    this.renderer.domElement.focus();
    let previous = performance.now();
    this.renderer.setAnimationLoop(now => {
      this.controller.update((now - previous) / 1000);
      previous = now;
      this.renderer.render(this.scene, this.camera);
    });
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  capture() {
    if (!this.active) return null;
    // Raycast inclui paredes e outros objetos: não fotografa alvos através deles.
    this.renderer.render(this.scene, this.camera);
    this.raycaster.setFromCamera(this.center, this.camera);
    const hit = this.raycaster.intersectObjects(this.scene.children, true)[0];
    let object = hit?.object;
    while (object && !object.userData.prop) object = object.parent;
    const preview = document.createElement('canvas');
    preview.width = Math.max(1, Math.round(640 * Math.min(1, this.camera.aspect)));
    preview.height = Math.max(1, Math.round(preview.width / this.camera.aspect));
    const ctx = preview.getContext('2d');
    ctx.drawImage(this.renderer.domElement, 0, 0, preview.width, preview.height);
    return { prop: object?.userData.prop || null, image: preview.toDataURL('image/png') };
  }

  close() {
    this.active = false;
    this.renderer.setAnimationLoop(null);
    this.controller.disable();
    this.releaseScene();
  }

  releaseScene() {
    if (!this.scene) return;
    const geometries = new Set(), materials = new Set();
    this.scene.traverse(object => {
      if (object.isInstancedMesh) object.dispose();
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) materials.add(object.material);
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    this.scene.clear();
    this.scene = null;
  }

  dispose() {
    this.close();
    this.observer.disconnect();
    this.controller.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
