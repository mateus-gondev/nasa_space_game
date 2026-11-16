/**
 * CameraPOVController — mecânica isolada de câmera FPS/lente para Three.js.
 * Não importa Three.js, não cria cenas, não adiciona modelos e não depende de UI.
 * Requisitos: PerspectiveCamera do Three.js + elemento de interação (canvas).
 *
 * API pública:
 *   enable({ pointerLock: true })  // chame a partir de clique do usuário
 *   disable()
 *   update(deltaSeconds)          // no seu loop de renderização
 *   setZoom(value)
 *   reset({ zoom: false })
 *   getState()
 *   dispose()
 */
export class CameraPOVController {
  constructor({
    camera,
    element,
    sensitivity = 0.0025,
    smoothness = 16,
    baseFov = 70,
    minZoom = 1,
    maxZoom = 4,
    minPitch = -80,
    maxPitch = 80,
    minYaw = null,
    maxYaw = null,
    onChange = null,
    onActiveChange = null,
  }) {
    if (!camera || !camera.isPerspectiveCamera) {
      throw new TypeError('CameraPOVController: camera deve ser THREE.PerspectiveCamera.');
    }
    if (!element || !element.addEventListener) {
      throw new TypeError('CameraPOVController: element deve ser um elemento DOM, como renderer.domElement.');
    }

    const rad = (degrees) => (degrees * Math.PI) / 180;
    this.camera = camera;
    this.element = element;
    this.sensitivity = sensitivity;
    this.smoothness = smoothness;
    this.baseFov = baseFov;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.minPitch = rad(minPitch);
    this.maxPitch = rad(maxPitch);
    this.minYaw = minYaw === null ? -Infinity : rad(minYaw);
    this.maxYaw = maxYaw === null ? Infinity : rad(maxYaw);
    this.onChange = onChange;
    this.onActiveChange = onActiveChange;

    this.active = false;
    this.pointerLocked = false;
    this.initialYaw = this.yaw = this.targetYaw = camera.rotation.y;
    this.initialPitch = this.pitch = this.targetPitch = camera.rotation.x;
    this.zoom = this.targetZoom = 1;
    this.drag = null;
    this._originalTouchAction = element.style.touchAction;
    this.element.style.touchAction = 'none';
    this.camera.rotation.order = 'YXZ';
    this.camera.fov = baseFov;
    this.camera.updateProjectionMatrix();

    this._handlers = {
      mouseMove: (e) => {
        if (this.active && this.pointerLocked) this.look(e.movementX, e.movementY);
      },
      pointerDown: (e) => {
        if (!this.active || (e.pointerType === 'mouse' && e.button !== 0)) return;
        this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
        if (!this.pointerLocked) {
          try { this.element.setPointerCapture(e.pointerId); } catch (_) { /* opcional */ }
        }
      },
      pointerMove: (e) => {
        if (!this.active || this.pointerLocked || !this.drag || this.drag.id !== e.pointerId) return;
        this.look(e.clientX - this.drag.x, e.clientY - this.drag.y);
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
      },
      pointerUp: (e) => {
        if (this.drag && (e.pointerId === undefined || e.pointerId === this.drag.id)) this.drag = null;
      },
      wheel: (e) => {
        if (!this.active) return;
        e.preventDefault();
        this.setZoom(this.targetZoom + (e.deltaY < 0 ? 0.2 : -0.2));
      },
      keyDown: (e) => {
        if (!this.active) return;
        const focused = document.activeElement;
        if (focused && ['INPUT', 'TEXTAREA', 'SELECT'].includes(focused.tagName)) return;
        switch (e.code) {
          case 'Escape': this.disable(); break;
          case 'KeyR': this.reset(); break;
          case 'ArrowLeft': this.look(-25, 0); e.preventDefault(); break;
          case 'ArrowRight': this.look(25, 0); e.preventDefault(); break;
          case 'ArrowUp': this.look(0, -25); e.preventDefault(); break;
          case 'ArrowDown': this.look(0, 25); e.preventDefault(); break;
          default: break;
        }
      },
      lockChange: () => {
        this.pointerLocked = document.pointerLockElement === this.element;
        if (!this.pointerLocked) this.drag = null;
        this._emitActiveChange();
      },
    };

    document.addEventListener('mousemove', this._handlers.mouseMove);
    document.addEventListener('keydown', this._handlers.keyDown);
    document.addEventListener('pointerlockchange', this._handlers.lockChange);
    element.addEventListener('pointerdown', this._handlers.pointerDown);
    element.addEventListener('pointermove', this._handlers.pointerMove);
    element.addEventListener('pointerup', this._handlers.pointerUp);
    element.addEventListener('pointercancel', this._handlers.pointerUp);
    element.addEventListener('lostpointercapture', this._handlers.pointerUp);
    element.addEventListener('wheel', this._handlers.wheel, { passive: false });
  }

  enable({ pointerLock = true } = {}) {
    this.active = true;
    this._emitActiveChange();
    // Deve ser invocado diretamente no evento de clique para permitir Pointer Lock.
    if (pointerLock && this.element.requestPointerLock && !this.pointerLocked) {
      try {
        const pending = this.element.requestPointerLock();
        if (pending && typeof pending.catch === 'function') pending.catch(() => {});
      } catch (_) { /* arrastar ainda funciona como fallback */ }
    }
  }

  disable() {
    this.active = false;
    this.drag = null;
    if (document.pointerLockElement === this.element && document.exitPointerLock) {
      document.exitPointerLock();
    }
    this._emitActiveChange();
  }

  look(deltaX, deltaY) {
    if (!this.active) return;
    this.targetYaw = this._clamp(this.targetYaw - deltaX * this.sensitivity, this.minYaw, this.maxYaw);
    this.targetPitch = this._clamp(this.targetPitch - deltaY * this.sensitivity, this.minPitch, this.maxPitch);
  }

  setZoom(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    this.targetZoom = this._clamp(parsed, this.minZoom, this.maxZoom);
  }

  reset({ zoom = false } = {}) {
    this.targetYaw = this._clamp(this.initialYaw, this.minYaw, this.maxYaw);
    this.targetPitch = this._clamp(this.initialPitch, this.minPitch, this.maxPitch);
    if (zoom) this.targetZoom = 1;
  }

  update(deltaSeconds) {
    const dt = this._clamp(Number(deltaSeconds) || 0, 0, 0.1);
    const factor = 1 - Math.exp(-this.smoothness * dt);
    this.yaw += (this.targetYaw - this.yaw) * factor;
    this.pitch += (this.targetPitch - this.pitch) * factor;
    this.zoom += (this.targetZoom - this.zoom) * factor;

    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    const fov = this.baseFov / this.zoom;
    if (Math.abs(this.camera.fov - fov) > 0.0001) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.onChange?.(this.getState());
  }

  getState() {
    const deg = (radians) => (radians * 180) / Math.PI;
    return {
      active: this.active,
      pointerLocked: this.pointerLocked,
      yaw: deg(this.yaw),
      pitch: deg(this.pitch),
      zoom: this.zoom,
      targetZoom: this.targetZoom,
      fov: this.camera.fov,
    };
  }

  _emitActiveChange() { this.onActiveChange?.(this.getState()); }
  _clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  dispose() {
    this.disable();
    document.removeEventListener('mousemove', this._handlers.mouseMove);
    document.removeEventListener('keydown', this._handlers.keyDown);
    document.removeEventListener('pointerlockchange', this._handlers.lockChange);
    this.element.removeEventListener('pointerdown', this._handlers.pointerDown);
    this.element.removeEventListener('pointermove', this._handlers.pointerMove);
    this.element.removeEventListener('pointerup', this._handlers.pointerUp);
    this.element.removeEventListener('pointercancel', this._handlers.pointerUp);
    this.element.removeEventListener('lostpointercapture', this._handlers.pointerUp);
    this.element.removeEventListener('wheel', this._handlers.wheel);
    this.element.style.touchAction = this._originalTouchAction;
  }
}
