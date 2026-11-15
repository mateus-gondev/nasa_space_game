// Funções puras: dado o tempo t (s), devolvem a pose. Sem alocação por frame.
import { T } from './config.js';

export const T_FLASH = T.seat; // instante em que o capacete assenta na cabeça (flash branco)
export const FLASH_LEN = 0.15;
export const OPEN_LEN = 1.3;   // abertura do visor após o flash

const TAU = Math.PI * 2;
const HALF = Math.PI / 2;

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, u) => a + (b - a) * u;
export const easeInOut = (u) => {
  u = clamp01(u);
  return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
};
const seg = (t, a, b) => easeInOut((t - a) / (b - a));

/**
 * Preenche `o` com a pose do conjunto mãos+capacete antes do assentamento:
 *  x,y,z  posição; rx,ry  rotação do capacete (rad);
 *  flip   0..1 — interpolação (slerp) de "abertura para a câmera" até "posição de uso";
 *  arm    inclinação das mangas.
 */
export function sampleHelmet(t, o) {
  o.rx = 0; o.ry = 0; o.flip = 0; o.arm = 0.5;
  // balanço leve das mãos, contínuo (entra após pegar e some ao descer)
  const env = clamp01(t - 1.0) * (1 - clamp01((t - T.flipEnd) / (T.seat - T.flipEnd)));
  o.x = Math.sin(t * 4) * 0.012 * env;

  if (t < T.pick) {                       // 1) pega e levanta
    const u = seg(t, 0, T.pick);
    o.y = lerp(0.55, 1.15, u); o.z = 0.5;
  } else if (t < T.spin) {                // 2) gira 360° nas mãos
    const u = seg(t, T.pick, T.spin);
    o.ry = TAU * u;
    o.y = lerp(1.15, 1.3, u); o.z = lerp(0.5, 1.2, u);
  } else if (t < T.tip) {                 // 3) inclina: abertura vira para o rosto
    const u = seg(t, T.spin, T.tip);
    o.rx = -HALF * u;
    o.y = lerp(1.3, 1.05, u); o.z = lerp(1.2, 1.75, u);
  } else if (t < T.flipStart) {           // 4) olha por dentro
    o.rx = -HALF; o.y = 1.05; o.z = 1.75;
  } else if (t < T.flipEnd) {             // 5) vira (abertura para baixo) e ergue acima da cabeça
    const u = seg(t, T.flipStart, T.flipEnd);
    o.rx = -HALF; o.flip = u;
    o.y = lerp(1.05, 2.0, u); o.z = lerp(1.75, 2.2, u); o.arm = lerp(0.5, 0.95, u);
  } else {                                // 6) desce sobre a cabeça
    const u = seg(t, T.flipEnd, T.seat);
    o.rx = -HALF; o.flip = 1; o.arm = 0.95;
    o.y = lerp(2.0, 1.5, u); o.z = lerp(2.2, 3.0, u);
  }
}
