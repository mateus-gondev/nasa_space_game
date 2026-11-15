import {
  Scene, PerspectiveCamera, Color, Group, Mesh, Object3D, InstancedMesh, Points,
  BufferGeometry, Float32BufferAttribute,
  SphereGeometry, BoxGeometry, CylinderGeometry, PlaneGeometry, RingGeometry, ShapeGeometry,
  Shape, Path, GridHelper,
  MeshBasicMaterial, PointsMaterial, ShaderMaterial,
  DataTexture, NearestFilter, SRGBColorSpace, BackSide, Quaternion, Euler,
} from 'three';
import { PAL } from './config.js';
import { T_FLASH, FLASH_LEN, OPEN_LEN, easeInOut, sampleHelmet } from './timeline.js';
import { disposeScene } from '../engine/resources.js';

const CAM_Y = 1.45;
const R = 0.35; // raio do capacete

const hs = (a, b) => {
  const n = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

// ---------- shader da máscara do visor (casca escura + vidro com tint/reflexo/vapor) ----------
const VISOR_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const VISOR_FRAG = /* glsl */ `
uniform vec2 uRes;
uniform float uOpen, uTime, uFlash;
varying vec2 vUv;

vec4 over(vec4 s, vec4 d){
  float a = s.a + d.a * (1.0 - s.a);
  vec3 c = (s.rgb * s.a + d.rgb * d.a * (1.0 - s.a)) / max(a, 1e-4);
  return vec4(c, a);
}

void main(){
  float k = uRes.x / 192.0;               // trabalha em "pixels do original" (192x108)
  vec2 fc = gl_FragCoord.xy / k;
  vec2 q = fc - vec2(96.0, 54.0);
  float o = uOpen;
  float din  = o > 0.001 ? length(q / vec2(96.0 * o, 52.0 * o)) : 9.0;
  float dout = o > 0.001 ? length(q / vec2(96.0 * o + 4.0, 52.0 * o + 4.0)) : 9.0;

  vec3 shell = (mod(floor(gl_FragCoord.y), 2.0) < 1.0) ? vec3(0.0902, 0.1059, 0.2) : vec3(0.0627, 0.0784, 0.1686);
  vec4 col;
  if (dout > 1.0) {
    col = vec4(shell, 1.0);
  } else if (din > 1.0) {
    col = vec4(0.9098, 0.9255, 0.9569, 1.0);   // aro branco do visor
  } else {
    float gx = mod(uTime * 14.0, 90.0) - 20.0;  // reflexo diagonal
    float s = gx + fc.y * 0.5;
    float glare = step(s, fc.x) * step(fc.x, s + 8.0);
    float fog = max(0.0, sin(uTime * 1.4 - 1.0)) * 0.1;
    vec4 g = vec4(0.851, 0.643, 0.255, 0.14);   // tint dourado
    g = over(vec4(1.0, 1.0, 1.0, 0.12 * glare), g);
    g = over(vec4(1.0, 1.0, 1.0, fog), g);
    col = g;
  }
  col = mix(col, vec4(1.0), uFlash);
  gl_FragColor = col;
}
`;

export function createScene({ width, height }) {
  const scene = new Scene();
  scene.background = new Color(PAL.void);

  const camera = new PerspectiveCamera(55, width / height, 0.05, 120);
  camera.position.set(0, CAM_Y, 3);
  camera.lookAt(0, CAM_Y, -5);

  // ---------- recursos compartilhados (poucas geometrias e materiais) ----------
  const geo = {
    sphere: new SphereGeometry(1, 24, 16),
    box: new BoxGeometry(1, 1, 1),
    cyl: new CylinderGeometry(1, 1, 1, 16),
    tube: new CylinderGeometry(1, 1, 1, 16, 1, true),                      // colar aberto
    shell: new SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.8), // casca com abertura embaixo
  };
  const mats = new Map();
  const mat = (color, back = false) => {
    const key = color + (back ? 'b' : 'f');
    let m = mats.get(key);
    if (!m) {
      m = new MeshBasicMaterial(back ? { color, side: BackSide } : { color });
      mats.set(key, m);
    }
    return m;
  };
  const extra = []; // geometrias/texturas próprias, para descartar no dispose

  const part = (parent, g, color, pos, scl, back = false) => {
    const m = new Mesh(g, mat(color, back));
    m.position.set(pos[0], pos[1], pos[2]);
    m.scale.set(scl[0], scl[1], scl[2]);
    parent.add(m);
    return m;
  };
  // Contorno por "casco invertido" + preenchimento chapado: look 8-bit sem luzes.
  const solid = (parent, g, fill, line, pos, scl, pad) => {
    part(parent, g, line, pos, [scl[0] + pad, scl[1] + pad, scl[2] + pad], true);
    return part(parent, g, fill, pos, scl);
  };

  // ======================= SALA =======================
  const room = new Group();
  scene.add(room);

  // parede com janela circular (o espaço aparece atrás pelo "buraco")
  const wallShape = new Shape();
  wallShape.moveTo(-16, 0); wallShape.lineTo(16, 0); wallShape.lineTo(16, 9); wallShape.lineTo(-16, 9); wallShape.closePath();
  const hole = new Path();
  hole.absarc(0, 3.4, 2.5, 0, Math.PI * 2, false);
  wallShape.holes.push(hole);
  const wallGeo = new ShapeGeometry(wallShape, 48);
  extra.push(wallGeo);
  const wall = new Mesh(wallGeo, mat(PAL.wall));
  wall.position.z = -8;
  room.add(wall);

  const ringOuter = new RingGeometry(2.5, 2.8, 40);
  const ringInner = new RingGeometry(2.5, 2.62, 40);
  extra.push(ringOuter, ringInner);
  const ro = new Mesh(ringOuter, mat(PAL.rimOuter)); ro.position.set(0, 3.4, -7.97); room.add(ro);
  const ri = new Mesh(ringInner, mat(PAL.rimInner)); ri.position.set(0, 3.4, -7.95); room.add(ri);

  // painéis laterais (instanciados) + friso claro à esquerda de cada um
  const xs = [-9.2, -7.4, -5.6, -3.8, 3.8, 5.6, 7.4, 9.2];
  const panels = new InstancedMesh(geo.box, mat(PAL.panel), xs.length);
  const edges = new InstancedMesh(geo.box, mat(PAL.panelEdge), xs.length);
  const dummy = new Object3D();
  xs.forEach((x, i) => {
    dummy.position.set(x, 3.3, -7.93); dummy.scale.set(1.7, 6.4, 0.12); dummy.updateMatrix();
    panels.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x - 0.82, 3.3, -7.86); dummy.scale.set(0.06, 6.4, 0.02); dummy.updateMatrix();
    edges.setMatrixAt(i, dummy.matrix);
  });
  panels.frustumCulled = false;
  edges.frustumCulled = false;
  room.add(panels, edges);

  // piso + grade + rodapé
  const floor = new Mesh(new PlaneGeometry(40, 40), mat(PAL.floor));
  extra.push(floor.geometry);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -6);
  room.add(floor);
  const grid = new GridHelper(40, 20, PAL.grid, PAL.grid);
  grid.position.set(0, 0.005, -6);
  extra.push(grid.geometry, grid.material);
  room.add(grid);
  part(room, geo.box, PAL.base, [0, 0.09, -7.9], [32, 0.18, 0.1]);

  // console (mesa) com luzes que piscam
  part(room, geo.box, PAL.tableBody, [0, 0.44, -1.8], [3.6, 0.88, 1.3]);
  part(room, geo.box, PAL.tableTop, [0, 0.91, -1.8], [3.64, 0.06, 1.34]);
  const consoleLights = [-1, 0, 1].map((x) => {
    const m = new Mesh(geo.box, new MeshBasicMaterial({ color: PAL.orangeDim }));
    m.position.set(x, 0.97, -1.5);
    m.scale.set(0.12, 0.04, 0.12);
    room.add(m);
    return m;
  });

  // luzes de alerta nos cantos (alternam)
  const warnL = new Mesh(geo.box, new MeshBasicMaterial({ color: PAL.orange }));
  const warnR = new Mesh(geo.box, new MeshBasicMaterial({ color: PAL.orangeDim }));
  warnL.position.set(-9.2, 5.9, -7.8); warnR.position.set(9.2, 5.9, -7.8);
  warnL.scale.set(0.3, 0.3, 0.1); warnR.scale.set(0.3, 0.3, 0.1);
  room.add(warnL, warnR);

  // estrelas (duas camadas que alternam de cor para "cintilar")
  const makeStars = (seed, color) => {
    const n = 110, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (hs(i, seed) - 0.5) * 32;
      p[i * 3 + 1] = 2 + hs(i, seed + 7) * 26;
      p[i * 3 + 2] = -62 - hs(i, seed + 13) * 10;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(p, 3));
    const m = new PointsMaterial({ color, size: 1, sizeAttenuation: false });
    const pts = new Points(g, m);
    pts.frustumCulled = false;
    extra.push(g, m);
    room.add(pts);
    return m;
  };
  const starsA = makeStars(1.3, PAL.starA);
  const starsB = makeStars(5.1, PAL.starB);

  // planeta: textura de blocos (nearest) + halo de atmosfera
  const TW = 256, TH = 128, td = new Uint8Array(TW * TH * 4);
  const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  const landC = rgb(PAL.land), seaC = rgb(PAL.sea);
  for (let y = 0; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      const v = 0.6 * hs(x >> 1, y >> 1) + 0.4 * hs(x >> 3, y >> 3);
      const c = v > 0.58 ? landC : seaC;
      const i = (y * TW + x) * 4;
      td[i] = c[0]; td[i + 1] = c[1]; td[i + 2] = c[2]; td[i + 3] = 255;
    }
  }
  const earthTex = new DataTexture(td, TW, TH);
  earthTex.magFilter = NearestFilter;
  earthTex.minFilter = NearestFilter;
  earthTex.colorSpace = SRGBColorSpace;
  earthTex.needsUpdate = true;
  const earthMat = new MeshBasicMaterial({ map: earthTex });
  const earthGeo = new SphereGeometry(22, 48, 32);
  const atmoGeo = new SphereGeometry(22.7, 48, 32);
  extra.push(earthTex, earthMat, earthGeo, atmoGeo);
  const earth = new Mesh(earthGeo, earthMat);
  earth.position.set(1.2, -13, -30);
  const atmo = new Mesh(atmoGeo, mat(PAL.atmo, true));
  atmo.position.copy(earth.position);
  room.add(earth, atmo);

  // cena estática: congela as matrizes
  room.traverse((o) => { o.matrixAutoUpdate = false; o.updateMatrix(); });

  // ======================= CAPACETE + LUVAS =======================
  const rig = new Group();     // posição: carrega capacete e luvas
  const helmet = new Group();  // orientação: gira livremente dentro das mãos
  rig.add(helmet);
  scene.add(rig);

  // casca aberta embaixo; o casco de contorno escuro vira o "interior" visto por baixo
  solid(helmet, geo.shell, PAL.shell, PAL.interior, [0, 0, 0], [R, R * 0.95, R], 0.03);
  part(helmet, geo.sphere, PAL.white, [-0.22 * R, 0.24 * R, -0.02 * R], [0.8 * R, 0.8 * R * 0.95, 0.8 * R]); // brilho
  // faixa laranja na testa
  const stripe = part(helmet, geo.box, PAL.orange, [0, 0.76 * R * 1.03, 0.67 * R * 1.03], [0.34 * R, 0.07 * R, 0.1 * R]);
  stripe.rotation.x = -0.84;

  // visor: três calotas esféricas sobrepostas (aro, vidro dourado, faixa inferior)
  const patch = (r, a, up, down, hSeg) => {
    const g = new SphereGeometry(r, 20, hSeg, Math.PI / 2 - a, 2 * a, Math.PI / 2 - up, up + down);
    extra.push(g);
    return g;
  };
  const visor = new Group();
  visor.scale.set(R, R * 0.95, R);
  helmet.add(visor);
  part(visor, patch(1.015, 0.9, 0.6, 0.65, 12), PAL.visorRim, [0, 0, 0], [1, 1, 1]);
  part(visor, patch(1.03, 0.8, 0.5, 0.55, 12), PAL.gold, [0, 0, 0], [1, 1, 1]);
  part(visor, new SphereGeometry(1.045, 20, 6, Math.PI / 2 - 0.8, 1.6, Math.PI / 2 + 0.05, 0.5), PAL.goldLow, [0, 0, 0], [1, 1, 1]);
  // reflexo em "L" no canto do visor
  const glint = (w, h, dx, dy) => {
    const az = -0.35 + dx, el = 0.32 + dy;
    const m = part(helmet, geo.box, PAL.cream, [
      Math.sin(az) * Math.cos(el) * 1.07 * R,
      Math.sin(el) * 1.07 * R * 0.95,
      Math.cos(az) * Math.cos(el) * 1.07 * R,
    ], [w * R, h * R, 0.03 * R]);
    m.rotation.set(-el, az, 0, 'YXZ');
  };
  glint(0.17, 0.045, 0, 0);
  glint(0.045, 0.09, -0.12, -0.05);

  // colar do pescoço (tubo aberto) + aro de espuma voltado para baixo
  part(helmet, geo.tube, PAL.steel, [0, -R * 0.9, 0], [R * 0.66, R * 0.2, R * 0.66]);
  part(helmet, geo.tube, PAL.outline, [0, -R * 0.9, 0], [R * 0.69, R * 0.2, R * 0.69], true);
  const foamGeo = new RingGeometry(0.5, 0.66, 20);
  extra.push(foamGeo);
  const foam = new Mesh(foamGeo, mat(PAL.glove));
  foam.scale.setScalar(R);
  foam.position.set(0, -R, 0);
  foam.rotation.x = Math.PI / 2; // normal para baixo
  helmet.add(foam);
  // luzinhas internas (só aparecem olhando pela abertura)
  for (const x of [-0.3, 0, 0.3]) part(helmet, geo.box, x ? PAL.cream : PAL.orange, [x * R, 0.75 * R, 0.1 * R], [0.09 * R, 0.05 * R, 0.09 * R]);
  // conectores laterais
  for (const s of [-1, 1]) solid(helmet, geo.box, PAL.shell, PAL.outline, [s * R * 1.02, -0.05 * R, 0], [0.18 * R, 0.5 * R, 0.3 * R], 0.04);

  // luvas + mangas: seguem a POSIÇÃO do capacete, mas não giram com ele
  const arms = [];
  for (const s of [-1, 1]) {
    const g = new Group();
    g.position.set(s * (R + 0.1), -0.2 * R, 0.1 * R);
    rig.add(g);
    solid(g, geo.box, PAL.glove, PAL.outline, [0, 0, 0], [0.17, 0.19, 0.19], 0.035);
    solid(g, geo.box, PAL.glove, PAL.outline, [-s * 0.05, 0.02, 0.12], [0.06, 0.08, 0.07], 0.03);
    part(g, geo.box, PAL.knuckle, [-0.03, -0.01, 0.1], [0.012, 0.15, 0.01]);
    part(g, geo.box, PAL.knuckle, [0.03, -0.01, 0.1], [0.012, 0.15, 0.01]);
    const arm = new Group();
    arm.rotation.x = 0.5;
    g.add(arm);
    arms.push(arm);
    solid(arm, geo.box, PAL.white, PAL.outline, [0, 0, 1.55], [0.16, 0.16, 3], 0.035);
    part(arm, geo.box, PAL.orange, [0, 0, 0.7], [0.175, 0.175, 0.09]);
  }
  // orientações-chave do "virar de cabeça para baixo": abertura p/ câmera → posição de uso
  const qA = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0));
  const qB = new Quaternion().setFromEuler(new Euler(0, Math.PI, 0));

  // ======================= MÁSCARA DO VISOR (interior) =======================
  const visorU = {
    uRes: { value: { x: width, y: height } },
    uOpen: { value: 0 },
    uTime: { value: 0 },
    uFlash: { value: 0 },
  };
  const visorMat = new ShaderMaterial({
    uniforms: visorU, vertexShader: VISOR_VERT, fragmentShader: VISOR_FRAG,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const visorGeo = new PlaneGeometry(2, 2);
  const visorMesh = new Mesh(visorGeo, visorMat);
  visorMesh.frustumCulled = false;
  visorMesh.renderOrder = 10;
  visorMesh.visible = false;
  scene.add(visorMesh);
  extra.push(visorMat, visorGeo);

  // ======================= UPDATE =======================
  const hp = { x: 0, y: 0, z: 0, rx: 0, ry: 0, flip: 0, arm: 0.5 };
  let lastB3 = -1, lastB2 = -1;

  function update(t) {
    // piscadas (só mexem em cor quando o estado muda)
    const b3 = Math.floor(t * 3) % 2;
    if (b3 !== lastB3) {
      lastB3 = b3;
      starsA.color.setHex(b3 ? PAL.starA : PAL.starB);
      starsB.color.setHex(b3 ? PAL.starB : PAL.starA);
    }
    const b2 = Math.floor(t * 2) % 2;
    if (b2 !== lastB2) {
      lastB2 = b2;
      warnL.material.color.setHex(b2 ? PAL.orange : PAL.orangeDim);
      warnR.material.color.setHex(b2 ? PAL.orangeDim : PAL.orange);
      consoleLights.forEach((m, i) => m.material.color.setHex((i + b2) % 2 ? PAL.orange : PAL.orangeDim));
    }
    earth.rotation.y = t * 0.015;
    earth.updateMatrix(); // matriz manual: o planeta é o único objeto da sala que se move

    if (t < T_FLASH) {
      sampleHelmet(t, hp);
      rig.visible = true;
      visorMesh.visible = false;
      rig.position.set(hp.x, hp.y, hp.z);
      if (hp.flip > 0) helmet.quaternion.slerpQuaternions(qA, qB, hp.flip);
      else helmet.rotation.set(hp.rx, hp.ry, 0);
      arms[0].rotation.x = arms[1].rotation.x = hp.arm;
      camera.position.y = CAM_Y;
    } else {
      rig.visible = false;
      visorMesh.visible = true;
      visorU.uOpen.value = easeInOut((t - T_FLASH) / OPEN_LEN);
      visorU.uTime.value = t;
      visorU.uFlash.value = t < T_FLASH + FLASH_LEN ? 1 : 0;
      camera.position.y = CAM_Y + Math.sin(t * 2) * 0.012; // respiração
    }
  }

  function dispose() {
    disposeScene(scene, [...Object.values(geo), ...mats.values(), ...extra]);
  }

  return { scene, camera, update, dispose };
}
