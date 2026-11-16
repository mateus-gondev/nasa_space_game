import { createAnimation } from '../engine/index.mjs';
import { createScene } from './scene.mjs';
import { DURATION, FPS, CAPTIONS, HUD, BEEPS } from './config.mjs';

/** Capacete POV: cena e coreografia próprias, reprodução pela engine comum. */
export function createHelmetIntro({ hud = true, onComplete, ...options } = {}) {
  return createAnimation({
    createScene, duration: DURATION, fps: FPS,
    captions: CAPTIONS, beeps: BEEPS, hud: HUD, showHud: hud,
    ...options,
    onComplete(api) {
      api.root.dispatchEvent(new CustomEvent('helmet-intro:complete', { bubbles: true }));
      onComplete?.(api);
    },
  });
}
