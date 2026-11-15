import * as THREE from '/vendor/three/three.module.js';
import { CameraPOVController } from '/assets/Animations/CameraPOV_arquivos/CameraPOVController.js';

import { createEnhancedLabScene } from '/assets/Animations/Opportunity_Engine_3D_Enhanced/engine/environment.js';
import { configureQualityRenderer, getRenderProfile, RENDER_PROFILES } from '/assets/Animations/Opportunity_Engine_3D_Enhanced/engine/quality.js';

// Mantém o contrato usado pela câmera e pelos testes da planta real.
export function createLabScene(map, config, mood, { quality = 'balanced' } = {}) {
  return createEnhancedLabScene(map, config, mood, { quality, ceiling: true, outdoors: false });
}

export class LabCameraView {
  constructor({ container, map, config, onChange }) {
    this.container = container;
    this.map = map;
    this.config = config;
    this.quality = Object.hasOwn(RENDER_PROFILES, config.camera?.renderQuality) ? config.camera.renderQuality : 'balanced';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.configureRenderer();
    this.renderer.domElement.tabIndex = 0;
    const label = 'Ambiente 3D ao redor do astronauta. Arraste ou use as setas para olhar.';
    this.renderer.domElement.setAttribute('aria-label', window.GameI18n?.t(label) || label);
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
    this.mood = mood;
    this.scene = createLabScene(this.map, this.config, mood, { quality: this.quality });
    this.camera.position.set(player.x, 1.6, player.y);
    let yaw = -player.angle - Math.PI / 2;
    let pitch = 0;
    if (target) {
      const dx = target.x + target.w / 2 - player.x;
      const dz = target.y + target.h / 2 - player.y;
      yaw = Math.atan2(-dx, -dz);
      pitch = Math.atan2(1 - this.camera.position.y, Math.hypot(dx, dz));
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

  configureRenderer() {
    configureQualityRenderer(this.quality)(this.renderer);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, getRenderProfile(this.quality).maxPixelRatio));
  }

  setQuality(quality) {
    if (!Object.hasOwn(RENDER_PROFILES, quality)) throw new RangeError('Qualidade deve ser low, balanced ou high.');
    if (quality === this.quality) return;
    const scene = this.active ? createLabScene(this.map, this.config, this.mood, { quality }) : null;
    this.releaseScene();
    this.scene = scene;
    this.quality = quality;
    this.configureRenderer();
    this.resize();
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
    this.scene.userData.disposeEnvironment();
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
