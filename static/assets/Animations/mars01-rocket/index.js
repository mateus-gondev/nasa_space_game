import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three';
import { createAnimation } from '../engine/index.js';
import { createRocketScene } from './scene.js';

export function createRocketIntro({ onComplete, ...options } = {}) {
  return createAnimation({
    createScene: createRocketScene, duration: 5.8, fps: 60,
    pixelated: false, responsive: true, autoplay: false, animateWhenPaused: true,
    configureRenderer(renderer) {
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFSoftShadowMap;
    },
    ...options,
    onComplete(api) {
      api.root.dispatchEvent(new CustomEvent('rocket-intro:complete', { bubbles: true }));
      onComplete?.(api);
    },
  });
}
