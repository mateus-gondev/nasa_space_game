import { Group, Mesh, IcosahedronGeometry, MeshBasicMaterial } from 'three';
import { disposeScene } from './resources.js';

/** Deterministic exhaust/dust; no allocation or randomness during update. */
export function createExhaustParticles({ count = 38, color = 0xf8aa5a, opacity = 0.56, spread = 4, fall = 2 } = {}) {
  if (!Number.isInteger(count) || count <= 0) throw new RangeError('count must be a positive integer');
  const group = new Group();
  const geometries = Array.from({ length: Math.min(count, 4) }, (_, i) => new IcosahedronGeometry(0.055 + i * 0.016, 0));
  for (let i = 0; i < count; i++) {
    group.add(new Mesh(geometries[i % 4], new MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })));
  }
  group.visible = false;
  return {
    group,
    update(time, height = 0) {
      group.visible = true;
      group.position.y = height;
      group.children.forEach((particle, i) => {
        const progress = (time * (0.8 + (i % 7) * 0.21) + i / count) % 1;
        const angle = i * 2.4 + time * 0.9;
        particle.position.set(Math.cos(angle) * (1 + progress * spread), -progress * fall, Math.sin(angle) * (1 + progress * spread));
        particle.material.opacity = (1 - progress) * opacity;
        particle.scale.setScalar(0.6 + progress * 2);
      });
    },
    reset() { group.visible = false; },
    dispose() { disposeScene(group); group.removeFromParent(); },
  };
}
