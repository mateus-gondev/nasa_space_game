import {
  Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry,
  IcosahedronGeometry, PlaneGeometry, LatheGeometry, ExtrudeGeometry, Shape,
  Vector2, Vector3, InstancedMesh,
} from 'three';
import { createSignMaterial, createPanelMaterial } from './materials.mjs';

const TAU = Math.PI * 2, Y = new Vector3(0, 1, 0);
const group = (parent, name, position = [0, 0, 0]) => {
  const g = new Group(); g.name = name; g.position.set(...position); parent.add(g); return g;
};

/** Geometry and graphic caches belong to the environment and are disposed with it. */
export function createPropKit(materials, { quality = 'balanced' } = {}) {
  const segments = quality === 'low' ? 10 : quality === 'high' ? 32 : 20;
  const geometry = {
    box: new BoxGeometry(1, 1, 1), cylinder: new CylinderGeometry(.5, .5, 1, segments),
    sphere: new SphereGeometry(.5, segments, Math.max(8, segments / 2)),
    rock: new IcosahedronGeometry(.5, quality === 'high' ? 2 : 1),
    torus: new TorusGeometry(.465, .035, quality === 'low' ? 5 : 8, segments),
    ring: new TorusGeometry(.493, .007, 6, segments * 2),
    plane: new PlaneGeometry(1, 1),
  };
  function piece(parent, kind, mat, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], options = {}) {
    const m = new Mesh(geometry[kind], materials[mat] || mat);
    m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rot);
    m.castShadow = options.castShadow !== false; m.receiveShadow = options.receiveShadow !== false;
    m.name = options.name || kind; parent.add(m); return m;
  }
  const k = { geometry, materials, quality, segments, piece };
  for (const kind of ['box', 'cylinder', 'sphere', 'torus', 'ring', 'rock']) k[kind] = (p, m, pos, scale, rot, o) => piece(p, kind, m, pos, scale, rot, o);
  k.rounded = (p, mat, pos, size, rot = [0, 0, 0]) => {
    if (quality === 'low') return k.box(p, mat, pos, size, rot);
    const [w, h, d] = size, r = Math.min(.035, w / 8, h / 8, d / 8), key = `bevel:${size.join(',')}`;
    if (!geometry[key]) {
      const s = new Shape(), x = w / 2 - r, y = h / 2 - r;
      s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.closePath();
      geometry[key] = new ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: quality === 'high' ? 3 : 1, steps: 1 });
      geometry[key].translate(0, 0, -d / 2 + r);
    }
    return piece(p, key, mat, pos, [1, 1, 1], rot);
  };
  k.link = (p, mat, from, to, diameter = .06) => {
    const a = new Vector3(...from), b = new Vector3(...to), v = b.clone().sub(a);
    const m = k.cylinder(p, mat, a.clone().add(b).multiplyScalar(.5).toArray(), [diameter, v.length(), diameter]);
    m.quaternion.setFromUnitVectors(Y, v.normalize()); return m;
  };
  k.surface = kind => materials[`graphic:${kind}`] ||= createPanelMaterial(kind);
  k.label = (p, text, pos, w = .6, h = .12, rot = [0, 0, 0]) => {
    materials[`label:${text}`] ||= createSignMaterial(text);
    return piece(p, 'plane', materials[`label:${text}`], pos, [w, h, 1], rot, { castShadow: false, name: 'identification' });
  };
  k.face = (p, kind, pos, w, h, rot = [0, 0, 0]) => piece(p, 'plane', k.surface(kind), pos, [w, h, 1], rot, { castShadow: false, name: `${kind}-face` });
  k.bolts = (p, w, d, y) => {
    if (quality === 'low') return;
    for (const x of [-w / 2 + .06, w / 2 - .06]) for (const z of [-d / 2 + .06, d / 2 - .06]) k.cylinder(p, 'steel', [x, y, z], [.025, .012, .025]);
  };
  k.vents = (p, x, y, z, w, count = 4) => {
    for (let i = 0; i < (quality === 'low' ? 2 : count); i++) k.box(p, 'dark', [x, y + i * .045, z], [w, .013, .018]);
  };
  k.dispose = () => Object.values(geometry).forEach(g => g.dispose());
  return k;
}

function legs(g, k, w, d, height = .85, mat = 'steel') {
  for (const x of [-w / 2 + .1, w / 2 - .1]) for (const z of [-d / 2 + .1, d / 2 - .1]) {
    k.box(g, mat, [x, height / 2, z], [.065, height, .065]); k.cylinder(g, 'rubber', [x, .025, z], [.1, .05, .1]);
  }
}
function monitor(g, k, x, y, z, w = .62, h = .43) {
  k.rounded(g, 'rubber', [x, y, z], [w, h, .085]); k.face(g, 'telemetry', [x, y, z + .044], w - .055, h - .055);
  k.box(g, 'steel', [x, y - h / 2 - .09, z], [.055, .18, .055]);
  k.rounded(g, 'dark', [x, y - h / 2 - .18, z + .035], [.28, .025, .18]);
}
function keyboard(g, k, x, y, z, w = .48) {
  k.rounded(g, 'dark', [x, y, z], [w, .035, .18]);
  if (k.quality !== 'low') for (let row = 0; row < 3; row++) k.box(g, 'drawer', [x, y + .02, z - .05 + row * .045], [w - .05, .006, .018]);
}
function screen(g, k, { w, d, prop }) {
  const height = Math.min(1.75, .65 + w * .1), z = -d * .25;
  k.rounded(g, 'rubber', [0, 1.7, z], [w * .96, height, .16]); k.face(g, 'telemetry', [0, 1.7, z + .083], w * .96 - .12, height - .12);
  for (const x of [-w * .33, w * .33]) {
    k.box(g, 'strap', [x, .7, z], [.09, 1.4, .1]); k.rounded(g, 'dark', [x, .05, z + .06], [Math.min(.6, w * .3), .1, Math.min(.65, d * .7)]);
  }
  k.label(g, prop.label || 'OPPORTUNITY / MISSION CONTROL', [0, 1.7 - height / 2 + .03, z + .09], Math.min(2.5, w * .75), .06);
}
function consoleDesk(g, k, { w, d }) {
  k.rounded(g, 'console', [0, .47, 0], [w * .96, .88, d * .88]); k.rounded(g, 'body', [0, .94, 0], [w * .99, .09, d * .96]);
  const n = Math.max(1, Math.round(w));
  for (let i = 0; i < n; i++) {
    const x = (i + .5) * w / n - w / 2;
    monitor(g, k, x, 1.29, -d * .21, Math.min(.7, w / n * .8)); keyboard(g, k, x, 1.005, d * .23, Math.min(.5, w / n * .6));
    k.box(g, i % 2 ? 'ledGreen' : 'screen', [x, .76, d * .443], [.07, .025, .012]); k.vents(g, x, .22, d * .443, w / n * .6);
  }
}
function workbench(g, k, { w, d, prop }) {
  legs(g, k, w * .94, d * .9); k.box(g, 'strap', [0, .65, 0], [w * .9, .07, d * .6]);
  k.rounded(g, 'bench', [0, .9, 0], [w * .98, .12, d * .95]); k.box(g, 'drawer', [0, .8, d * .44], [w * .94, .12, .045]);
  const n = Math.max(3, Math.min(8, Math.round(w)));
  for (let i = 0; i < n; i++) {
    const x = -w * .4 + i * w * .8 / Math.max(1, n - 1);
    k.cylinder(g, ['sampleBlue', 'sampleGreen', 'sampleAmber'][i % 3], [x, 1.025, -d * .08], [.14, .14, .14]); k.cylinder(g, 'steel', [x, 1.105, -d * .08], [.11, .025, .11]);
  }
  if (prop.trainingId === 'drill') {
    k.rounded(g, 'soil', [0, 1.01, d * .17], [w * .65, .08, d * .35]); k.rock(g, 'rock', [.15, 1.08, d * .17], [.2, .12, .16]);
  }
  k.bolts(g, w * .95, d * .9, .965);
}
function mug(g, k, x, y, z, size = 1) {
  if (!k.geometry.mug) k.geometry.mug = new LatheGeometry([new Vector2(0, .015), new Vector2(.11, .015), new Vector2(.13, .23), new Vector2(.108, .23), new Vector2(.093, .04), new Vector2(0, .04)], k.segments);
  k.piece(g, 'mug', 'paper', [x, y, z], [size, size, size]); k.torus(g, 'paper', [x + .14 * size, y + .13 * size, z], [.16 * size, .18 * size, .12 * size]);
  k.cylinder(g, 'pot', [x, y + .205 * size, z], [.205 * size, .008, .205 * size]);
}
function desk(g, k, { w, d }) {
  legs(g, k, w * .92, d * .88, .8, 'dark'); k.rounded(g, 'wood', [0, .86, 0], [w * .97, .13, d * .94]);
  k.rounded(g, 'wood', [-w * .32, .43, 0], [w * .22, .72, d * .75]);
  for (let i = 0; i < 3; i++) {
    k.box(g, 'palletWood', [-w * .32, .23 + i * .2, d * .38], [w * .2, .16, .025]); k.box(g, 'dark', [-w * .32, .25 + i * .2, d * .4], [.16, .025, .03]);
  }
  monitor(g, k, -w * .24, 1.22, -d * .18, Math.min(.82, w * .35)); keyboard(g, k, -w * .24, .95, d * .12);
  k.box(g, 'paper', [w * .26, .94, -d * .2], [Math.min(.46, w * .2), .012, Math.min(.32, d * .25)], [0, .12, 0]);
  k.box(g, 'navy', [w * .25, .95, -d * .2], [.16, .004, .012], [0, .12, 0]); mug(g, k, w * .32, .93, d * .25, .7);
}
function chair(g, k, { w, d }) {
  const s = Math.min(w, d) * .88; k.cylinder(g, 'steel', [0, .3, 0], [.07, .5, .07]);
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5, x = Math.sin(a) * s * .36, z = Math.cos(a) * s * .36;
    k.link(g, 'strap', [0, .12, 0], [x, .07, z], .04); k.sphere(g, 'rubber', [x, .045, z], [.095, .09, .07]);
  }
  k.rounded(g, 'rubber', [0, .58, 0], [s * .72, .15, s * .7]); k.link(g, 'strap', [0, .45, -s * .3], [0, 1.1, -s * .37], .06);
  k.rounded(g, 'dark', [0, .99, -s * .31], [s * .7, .58, .1], [-.1, 0, 0]);
  for (const side of [-1, 1]) {
    k.link(g, 'strap', [side * s * .33, .54, 0], [side * s * .4, .81, 0], .035); k.rounded(g, 'rubber', [side * s * .4, .83, .02], [.08, .055, s * .48]);
  }
}
function cabinet(g, k, { w, d }) {
  const vertical = d > w, body = group(g, 'filing-cabinets'); if (vertical) body.rotation.y = Math.PI / 2;
  const length = vertical ? d : w, depth = (vertical ? w : d) * .88, n = Math.max(1, Math.round(length));
  for (let i = 0; i < n; i++) {
    const x = (i + .5) * length / n - length / 2, cw = length / n * .92;
    k.rounded(body, 'drawer', [x, .75, 0], [cw, 1.5, depth]);
    for (let j = 0; j < 4; j++) {
      const y = .23 + j * .35;
      k.rounded(body, 'body', [x, y, depth / 2 + .005], [cw - .075, .3, .025]); k.box(body, 'dark', [x, y - .02, depth / 2 + .035], [Math.min(.23, cw * .4), .035, .04]);
      k.box(body, 'paper', [x, y + .08, depth / 2 + .024], [.13, .04, .005]);
    }
  }
}
function locker(g, k, { w, d }) {
  const body = group(g, 'locker-bank'), vertical = d > w; if (vertical) body.rotation.y = Math.PI / 2;
  const length = vertical ? d : w, depth = (vertical ? w : d) * .87, n = Math.max(1, Math.round(length / .8));
  for (let i = 0; i < n; i++) {
    const cw = length / n * .96, x = -length / 2 + (i + .5) * length / n;
    k.rounded(body, 'console', [x, 1.05, 0], [cw, 2.1, depth]); k.rounded(body, 'locker', [x, 1.09, depth / 2 + .005], [cw - .07, 1.91, .025]);
    k.vents(body, x, 1.65, depth / 2 + .025, cw * .7, 3); k.box(body, 'body', [x + cw * .29, 1, depth / 2 + .04], [.025, .16, .035]);
    k.label(body, String(i + 1).padStart(2, '0'), [x, 1.92, depth / 2 + .03], .15, .06);
  }
}
function rack(g, k, { w, d }) {
  const n = Math.max(1, Math.round(w));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + .5) * w / n, cw = w / n * .94, depth = d * .9;
    k.rounded(g, 'dark', [x, 1.05, 0], [cw, 2.1, depth]);
    for (const side of [-1, 1]) k.box(g, 'strap', [x + side * cw * .45, 1.07, depth / 2], [.04, 1.96, .045]);
    for (let j = 0; j < 5; j++) {
      const y = .28 + j * .35;
      k.rounded(g, 'rubber', [x, y, depth / 2 + .01], [cw * .82, .28, .04]); k.box(g, 'fin', [x + cw * .15, y, depth / 2 + .035], [cw * .4, .11, .012]);
      k.box(g, j % 2 ? 'ledGreen' : 'screen', [x - cw * .29, y, depth / 2 + .04], [.035, .025, .015]); if (k.quality !== 'low') k.vents(g, x, y - .07, depth / 2 + .04, cw * .3, 3);
    }
  }
}
function shelf(g, k, { w, d }) {
  const n = Math.max(1, Math.round(w / 1.5)), depth = d * .9;
  for (let i = 0; i <= n; i++) for (const z of [-depth * .45, depth * .45]) k.box(g, 'shelf', [-w * .47 + i * w * .94 / n, 1.1, z], [.06, 2.2, .06]);
  for (let row = 0; row < 3; row++) {
    const y = .14 + row * .69; k.rounded(g, 'shelf', [0, y, 0], [w * .97, .065, depth]);
    for (let col = 0; col < n * 3; col++) {
      const cell = w * .91 / (n * 3), x = -w * .455 + (col + .5) * cell, ch = .26 + (col % 3) * .1;
      k.rounded(g, ['cartonGold', 'cartonBlue', 'cartonRed', 'cartonGreen'][(col + row) % 4], [x, y + .04 + ch / 2, 0], [cell * .83, ch, depth * .72]);
      k.box(g, 'paper', [x, y + ch * .5, depth * .365], [cell * .4, .055, .006]);
    }
  }
}
function tank(g, k, { w, d, prop }) {
  const diameter = Math.min(w, d) * .85, height = Math.min(2.1, 1.4 + diameter * .3);
  k.cylinder(g, 'steel', [0, height / 2 + .12, 0], [diameter, height, diameter]); k.sphere(g, 'body', [0, height + .08, 0], [diameter, .26, diameter]);
  k.cylinder(g, 'navy', [0, height * .5, 0], [diameter * 1.013, .17, diameter * 1.013]);
  for (const y of [.18, height - .02]) k.torus(g, 'strap', [0, y, 0], [diameter * 1.02, diameter * 1.02, diameter * 1.02], [Math.PI / 2, 0, 0]);
  k.cylinder(g, 'dark', [0, .09, 0], [diameter * .83, .18, diameter * .83]); k.cylinder(g, 'amber', [0, height + .25, 0], [.11, .19, .11]);
  k.torus(g, 'cartRed', [0, height + .36, 0], [.23, .23, .23], [Math.PI / 2, 0, 0]);
  k.label(g, /reagente/i.test(prop.name || '') ? 'REAGENTES' : 'NITROGÊNIO', [0, height * .5, diameter / 2 + .012], diameter * .6, .1);
}
function crate(g, k, { w, d }) {
  const h = Math.min(1.1, .65 + Math.min(w, d) * .18);
  k.rounded(g, 'crate', [0, h / 2, 0], [w * .91, h, d * .88]); k.rounded(g, 'strap', [0, h - .04, 0], [w * .94, .09, d * .91]);
  for (const side of [-1, 1]) {
    const x = side * w * .33; k.box(g, 'strap', [x, h / 2, 0], [.055, h + .015, d * .905]); k.box(g, 'steel', [x, h * .65, d * .458], [.085, .12, .018]);
  }
  k.box(g, 'dark', [0, h * .55, d * .45], [w * .26, .065, .035]); k.label(g, 'CARGO', [0, h * .8, d * .449], Math.min(.45, w * .6), .1); k.bolts(g, w * .9, d * .85, h + .008);
}
function pallet(g, k, { w, d }) {
  for (const x of [-w * .35, 0, w * .35]) k.box(g, 'wood', [x, .08, 0], [.13, .16, d * .94]);
  for (let i = 0; i < 5; i++) k.box(g, 'palletWood', [0, .2, -d * .42 + i * d * .21], [w * .96, .07, d * .16]);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) crate(group(g, 'packed-case', [(i - .5) * w * .44, .24, (j - .5) * d * .44]), k, { w: w * .42, d: d * .42 });
}
function solar(g, k, { w, d }) {
  const panel = group(g, 'solar-array', [0, .62, 0]); panel.rotation.x = -.15;
  k.rounded(panel, 'steel', [0, 0, 0], [w * .96, .08, d * .94]); k.face(panel, 'solar', [0, .042, 0], w * .94, d * .91, [-Math.PI / 2, 0, 0]);
  for (const x of [-w * .32, w * .32]) {
    k.link(g, 'strap', [x, .05, d * .32], [x, .72, -d * .32], .06); k.link(g, 'steel', [x, .05, -d * .32], [x, .52, d * .32], .06); k.box(g, 'dark', [x, .025, 0], [.22, .05, d * .87]);
  }
}
function wheel(g, k, name, position, diameter, thickness) {
  const node = group(g, name, position);
  k.cylinder(node, 'rubber', [0, 0, 0], [diameter, thickness, diameter], [0, 0, Math.PI / 2]);
  for (const side of [-1, 1]) {
    k.cylinder(node, 'fin', [side * thickness * .51, 0, 0], [diameter * .71, .035, diameter * .71], [0, 0, Math.PI / 2]);
    k.cylinder(node, 'steel', [side * thickness * .54, 0, 0], [diameter * .21, .06, diameter * .21], [0, 0, Math.PI / 2]);
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; k.link(node, 'body', [side * thickness * .54, 0, 0], [side * thickness * .54, Math.sin(a) * diameter * .31, Math.cos(a) * diameter * .31], .025); }
  }
  if (k.quality !== 'low') {
    const n = k.quality === 'high' ? 24 : 14;
    for (let i = 0; i < n; i++) { const a = i * TAU / n; k.box(node, 'strap', [0, Math.sin(a) * diameter * .493, Math.cos(a) * diameter * .493], [thickness * 1.02, .022, .045], [-a, 0, 0]); }
  }
}
function telescope(g, k, { w, d }) {
  const s = Math.min(w, d), height = 1.65;
  for (const a of [0, TAU / 3, TAU * 2 / 3]) k.link(g, 'strap', [Math.sin(a) * w * .36, .04, Math.cos(a) * d * .36], [0, .98, 0], .055);
  k.cylinder(g, 'steel', [0, 1.13, 0], [.09, .7, .09]); k.rounded(g, 'body', [0, height, 0], [w * .8, .33, d * .24]);
  for (const side of [-1, 1]) {
    const x = side * w * .21;
    k.cylinder(g, 'strap', [x, height, d * .14], [s * .23, .11, s * .23], [Math.PI / 2, 0, 0]); k.cylinder(g, 'black', [x, height, d * .2], [s * .17, .02, s * .17], [Math.PI / 2, 0, 0]);
    k.sphere(g, 'glass', [x, height, d * .213], [s * .13, s * .13, .025]); k.box(g, 'screen', [x - s * .025, height + s * .03, d * .23], [s * .025, s * .025, .008]);
  }
  k.label(g, 'PANCAM', [0, height + .19, d * .12], Math.min(.5, w * .6), .08);
}
function rover(g, k, { w, d }) {
  const diameter = Math.min(.95, d * .24), wheelY = diameter / 2;
  k.rounded(g, 'body', [0, .98, 0], [w * .66, .45, d * .68]); k.box(g, 'dark', [0, .71, 0], [w * .59, .19, d * .57]);
  k.rounded(g, 'body', [0, 1.24, 0], [w * .77, .12, d * .75]); k.face(g, 'solar', [0, 1.305, 0], w * .71, d * .68, [-Math.PI / 2, 0, 0]);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      const z = (row - 1) * d * .33, x = side * w * .41;
      wheel(g, k, `wheel-${side < 0 ? 'left' : 'right'}-${row}`, [x, wheelY, z], diameter, w * .105); k.link(g, 'steel', [side * w * .22, .9, 0], [x, wheelY, z], .08);
    }
    k.link(g, 'strap', [side * w * .34, .77, -d * .28], [side * w * .34, .77, d * .28], .065);
  }
  const mast = group(g, 'pancam-mast', [w * .2, 1.28, -d * .27]); k.cylinder(mast, 'steel', [0, .48, 0], [.085, .96, .085]); k.rounded(mast, 'body', [0, 1.04, 0], [.57, .24, .22]);
  for (const x of [-.16, .16]) {
    k.cylinder(mast, 'dark', [x, 1.04, -.145], [.15, .1, .15], [Math.PI / 2, 0, 0]); k.cylinder(mast, 'glass', [x, 1.04, -.2], [.105, .015, .105], [Math.PI / 2, 0, 0]);
  }
  k.cylinder(g, 'steel', [-w * .22, 1.47, d * .19], [.38, .17, .38]); k.cylinder(g, 'paper', [-w * .22, 1.62, d * .19], [.55, .035, .55]);
  k.link(g, 'body', [-w * .2, .9, -d * .3], [-w * .29, .6, -d * .42], .09); k.link(g, 'body', [-w * .29, .6, -d * .42], [.05, .58, -d * .43], .07);
  k.cylinder(g, 'instrument', [.05, .58, -d * .43], [.17, .16, .17], [Math.PI / 2, 0, 0]);
}
function dish(g, k, { w, d }) {
  const diameter = Math.min(w, d) * .79;
  if (!k.geometry.dish) {
    const pts = []; for (let i = 0; i <= 20; i++) { const r = i / 40; pts.push(new Vector2(r, .64 * r * r)); }
    for (let i = 20; i >= 0; i--) { const r = i / 40; pts.push(new Vector2(r, .64 * r * r - .014)); }
    k.geometry.dish = new LatheGeometry(pts, k.segments * 2);
  }
  k.rounded(g, 'strap', [0, .09, 0], [w * .61, .18, d * .61]); k.cylinder(g, 'steel', [0, .73, 0], [.22, 1.32, .22]);
  const bowl = group(g, 'parabolic-reflector', [0, 1.4, 0]); bowl.rotation.x = .43; k.piece(bowl, 'dish', 'body', [0, 0, 0], [diameter, diameter, diameter]);
  for (const ratio of [1, .66, .33]) k.ring(bowl, 'steel', [0, .16 * diameter * ratio * ratio, 0], [diameter * ratio, diameter * ratio, diameter * ratio], [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 3; i++) { const a = i * TAU / 3; k.link(bowl, 'strap', [Math.sin(a) * diameter * .44, diameter * .13, Math.cos(a) * diameter * .44], [0, diameter * .48, 0], .025); }
  k.cylinder(bowl, 'instrument', [0, diameter * .46, 0], [.15, .18, .15]);
}
function microscope(g, k, { w, d }) {
  const s = Math.min(w, d) * .9;
  k.rounded(g, 'instrument', [0, .075, .04], [s * .8, .15, s * .78]); k.link(g, 'body', [s * .22, .13, -s * .22], [s * .22, 1.15, -s * .2], .14); k.link(g, 'body', [s * .22, 1.15, -s * .2], [-s * .13, 1.25, 0], .16);
  k.rounded(g, 'dark', [-s * .08, .66, .03], [s * .63, .055, s * .52]); k.box(g, 'glass', [-s * .08, .693, .04], [s * .39, .012, s * .17]);
  for (const side of [-1, 1]) k.box(g, 'steel', [side * s * .22, .705, .05], [.025, .02, s * .24]);
  k.cylinder(g, 'instrument', [-s * .14, .98, .02], [.15, .4, .15]); k.cylinder(g, 'dark', [-s * .14, .77, .02], [.09, .08, .09]); k.link(g, 'dark', [-s * .13, 1.21, 0], [-s * .2, 1.43, -s * .18], .12);
  k.cylinder(g, 'rubber', [s * .35, .87, -s * .19], [.19, .075, .19], [0, 0, Math.PI / 2]); k.cylinder(g, 'lamp', [-s * .08, .18, .03], [.15, .025, .15]);
}
function spectrometer(g, k, { w, d, prop }) {
  const diameter = Math.min(w, d) * .57;
  k.rounded(g, 'instrument', [0, .28, 0], [w * .87, .56, d * .84]); k.cylinder(g, 'steel', [0, .64, 0], [diameter, .23, diameter]); k.cylinder(g, 'body', [0, .77, 0], [diameter * .83, .06, diameter * .83]);
  k.torus(g, 'strap', [0, .81, 0], [diameter * .78, diameter * .78, diameter * .78], [Math.PI / 2, 0, 0]); k.cylinder(g, prop.label === 'RAT' ? 'fin' : 'glass', [0, .812, 0], [diameter * .42, .025, diameter * .42]);
  k.box(g, 'ledRed', [w * .3, .575, -d * .23], [.07, .025, .07]); k.label(g, prop.label || 'SPEC', [0, .29, d * .426], Math.min(.7, w * .6), .15);
  if (prop.label === 'RAT') for (let i = 0; i < 8; i++) { const a = i * TAU / 8; k.box(g, 'steel', [Math.sin(a) * diameter * .21, .837, Math.cos(a) * diameter * .21], [.035, .04, .07], [0, a, 0]); }
  k.bolts(g, w * .83, d * .8, .567);
}
function specimen(g, k, { w, d }) {
  k.rounded(g, 'dark', [0, .38, 0], [w * .89, .76, d * .89]); k.rounded(g, 'steel', [0, .8, 0], [w * .96, .09, d * .95]); k.rounded(g, 'soil', [0, .86, 0], [w * .79, .06, d * .76]);
  for (let i = 0; i < 5; i++) k.rock(g, i % 2 ? 'rock' : 'wood', [Math.sin(i * 2.4) * w * .22, .99, Math.cos(i * 2.3) * d * .2], [.26 + i * .025, .22 + i * .02, .24 + i * .025], [i * .3, i * .5, .1]);
  k.torus(g, 'amber', [0, .94, 0], [w * .79, d * .71, w * .79], [Math.PI / 2, 0, 0]); k.label(g, 'ALVO FOTOGRÁFICO', [0, .43, d * .452], w * .74, .13);
}
function globe(g, k, { w, d }) {
  const diameter = Math.min(w, d) * .65;
  k.cylinder(g, 'strap', [0, .055, 0], [diameter * .75, .11, diameter * .75]); k.cylinder(g, 'steel', [0, .3, 0], [.055, .5, .055]);
  const ball = group(g, 'mars-globe', [0, .61 + diameter / 2, 0]); ball.rotation.z = -.25;
  k.sphere(ball, k.surface('mars'), [0, 0, 0], [diameter, diameter, diameter]); k.ring(ball, 'steel', [0, 0, 0], [diameter * 1.14, diameter * 1.14, diameter * 1.14], [0, Math.PI / 2, 0]);
}
function holotable(g, k, { w, d }) {
  k.rounded(g, 'dark', [0, .5, 0], [w * .92, 1, d * .9]); k.rounded(g, 'dark', [0, 1.035, 0], [w * .95, .11, d * .93]);
  const diameter = Math.min(w, d) * .5, sphereY = 1.3 + diameter * .4;
  k.ring(g, 'screen', [0, 1.097, 0], [w * .76, d * .7, w * .76], [Math.PI / 2, 0, 0]); k.ring(g, 'lamp', [0, 1.102, 0], [w * .55, d * .5, w * .55], [Math.PI / 2, 0, 0]);
  const planet = k.sphere(g, k.surface('mars'), [0, sphereY, 0], [diameter, diameter, diameter]); planet.material = k.materials['graphic:holoMars'] ||= k.surface('mars').clone();
  planet.material.transparent = true; planet.material.opacity = .78; planet.material.emissive.set('#d37845'); planet.material.emissiveIntensity = .5;
  k.ring(g, 'paper', [0, sphereY, 0], [diameter * 1.5, diameter * 1.5, diameter * 1.5], [1.17, .25, .18]);
  for (const x of [-w * .36, w * .36]) k.cylinder(g, 'screen', [x, 1.11, 0], [.12, .035, .12]); k.label(g, 'MERIDIANI PLANUM', [0, .6, d * .455], Math.min(1.6, w * .6), .14);
}
function whiteboard(g, k, { w, d }) {
  const z = -d * .22, height = 1.12;
  k.rounded(g, 'steel', [0, 1.65, z], [w * .97, height + .08, .1]); k.face(g, 'board', [0, 1.65, z + .052], w * .95, height); k.box(g, 'strap', [0, 1.04, z + .08], [w * .97, .04, .15]);
  for (const x of [-w * .32, w * .32]) { k.box(g, 'steel', [x, .52, z], [.045, 1.04, .06]); k.box(g, 'dark', [x, .025, 0], [.35, .05, d * .7]); }
  for (let i = 0; i < 3; i++) k.box(g, ['navy', 'cartRed', 'dark'][i], [-w * .3 + i * .15, 1.07, z + .11], [.09, .02, .025]);
}
function rockcase(g, k, { w, d }) {
  k.rounded(g, 'dark', [0, .4, 0], [w * .95, .8, d * .94]); k.box(g, 'soil', [0, .815, 0], [w * .88, .025, d * .82]);
  const n = Math.max(5, Math.round(w * 3));
  for (let i = 0; i < n; i++) { const size = .11 + (i % 3) * .035; k.rock(g, i % 3 ? 'rock' : 'strap', [-w * .4 + (i + .5) * w * .8 / n, .86, Math.sin(i * 2.3) * d * .2], [size * 1.4, size, size * 1.2], [.1, i, .2]); }
  for (const x of [-w * .46, w * .46]) for (const z of [-d * .44, d * .44]) k.box(g, 'steel', [x, 1.005, z], [.035, .41, .035]);
  k.box(g, 'displayGlass', [0, 1.005, 0], [w * .93, .41, d * .9]);
  for (const x of [-w * .47, w * .47]) k.box(g, 'steel', [x, 1.22, 0], [.035, .035, d * .94]);
  for (const z of [-d * .45, d * .45]) k.box(g, 'steel', [0, 1.22, z], [w * .96, .035, .035]);
}
function rtg(g, k, { w, d }) {
  const length = w * .86, diameter = Math.min(d * .69, .95);
  k.cylinder(g, 'instrument', [0, .62, 0], [diameter * .7, length, diameter * .7], [0, 0, Math.PI / 2]);
  const n = k.quality === 'low' ? 8 : k.quality === 'high' ? 18 : 13;
  for (let i = 0; i < n; i++) k.cylinder(g, 'fin', [-length / 2 + (i + .5) * length / n, .62, 0], [diameter, .025, diameter], [0, 0, Math.PI / 2]);
  for (const x of [-length * .4, length * .4]) { k.cylinder(g, 'steel', [x, .62, 0], [diameter * .83, .09, diameter * .83], [0, 0, Math.PI / 2]); k.box(g, 'strap', [x, .16, 0], [.15, .3, d * .74]); }
  k.box(g, 'amber', [0, .45, diameter * .5], [length * .53, .17, .025]); k.label(g, 'RTG', [0, .46, diameter * .52], .3, .11);
}
function battery(g, k, { w, d }) {
  k.rounded(g, 'dark', [0, .11, 0], [w * .96, .22, d * .93]); const n = Math.max(2, Math.round(w * 2)), cell = w * .9 / n;
  for (let i = 0; i < n; i++) {
    const x = -w * .45 + (i + .5) * cell;
    k.rounded(g, 'rubber', [x, .61, 0], [cell * .9, .94, d * .82]); k.box(g, 'strap', [x, 1.1, 0], [cell * .94, .065, d * .85]); k.box(g, i % 3 ? 'ledGreen' : 'amber', [x, .31, d * .419], [.06, .035, .014]);
    for (const side of [-1, 1]) k.cylinder(g, side < 0 ? 'cartRed' : 'steel', [x, 1.17, side * d * .25], [.055, .1, .055]);
  }
  k.box(g, 'cartRed', [0, 1.21, -d * .25], [w * .85, .025, .035]); k.box(g, 'dark', [0, 1.21, d * .25], [w * .85, .025, .035]);
}
function transformer(g, k, { w, d }) {
  k.rounded(g, 'olive', [0, .67, 0], [w * .87, 1.34, d * .85]); const n = Math.max(6, Math.round(w * 6));
  for (let i = 0; i < n; i++) k.box(g, 'fin', [-w * .4 + i * w * .8 / (n - 1), .78, d * .44], [.025, .86, .08]);
  for (const x of [-w * .22, w * .22]) {
    k.cylinder(g, 'paper', [x, 1.47, 0], [.12, .26, .12]); for (let j = 0; j < 3; j++) k.torus(g, 'body', [x, 1.39 + j * .075, 0], [.18, .18, .18], [Math.PI / 2, 0, 0]);
  }
  k.label(g, 'HIGH VOLTAGE', [0, .31, d * .446], Math.min(1, w * .7), .18);
}
function cart(g, k, { w, d }) {
  const width = w * .85, depth = d * .82;
  k.rounded(g, 'cartRed', [0, .57, 0], [width, .85, depth]); k.rounded(g, 'steel', [0, 1.02, 0], [width * 1.03, .065, depth * 1.04]);
  for (let row = 0; row < 4; row++) {
    k.box(g, 'cartRed', [0, .32 + row * .18, depth / 2 + .01], [width * .91, .15, .03]); k.box(g, 'steel', [0, .37 + row * .18, depth / 2 + .033], [width * .75, .025, .04]);
  }
  for (const x of [-width * .37, width * .37]) for (const z of [-depth * .34, depth * .34]) k.cylinder(g, 'rubber', [x, .1, z], [.18, .07, .18], [0, 0, Math.PI / 2]);
  const x = -width * .52; for (const z of [-depth * .3, depth * .3]) k.link(g, 'steel', [x, .76, z], [x, 1.16, z], .035);
  k.link(g, 'steel', [x, 1.16, -depth * .3], [x, 1.16, depth * .3], .035); k.link(g, 'steel', [-width * .3, 1.07, 0], [0, 1.07, 0], .035); k.torus(g, 'steel', [0, 1.07, 0], [.12, .12, .12], [Math.PI / 2, 0, 0]);
}
function wheelrack(g, k, { w, d }) {
  k.rounded(g, 'shelf', [0, .08, 0], [w * .97, .16, d * .9]); for (const z of [-d * .38, d * .38]) k.box(g, 'strap', [0, .23, z], [w * .94, .06, .045]);
  const n = Math.max(1, Math.round(w));
  for (let i = 0; i < n; i++) { const node = group(g, `spare-wheel-${i}`, [-w * .43 + (i + .5) * w * .86 / n, .5, 0]); node.rotation.y = Math.PI / 2; wheel(node, k, 'wheel', [0, 0, 0], Math.min(d * .77, w / n * .78), .22); }
}
function roboarm(g, k, { w, d }) {
  const s = Math.min(w, d); k.rounded(g, 'dark', [0, .1, 0], [w * .9, .2, d * .88]);
  const points = [[-s * .27, .25, s * .24], [-s * .23, 1.35, s * .08], [s * .18, 1.85, -s * .08], [s * .31, 1.15, -s * .22]];
  for (let i = 0; i < points.length - 1; i++) {
    k.link(g, 'body', points[i], points[i + 1], i === 0 ? .18 : .13);
    k.link(g, 'dark', points[i].map((v, a) => v + (a === 2 ? .09 : 0)), points[i + 1].map((v, a) => v + (a === 2 ? .09 : 0)), .035);
  }
  points.forEach((p, i) => k.cylinder(g, i === 3 ? 'screen' : 'amber', p, [i === 3 ? .18 : .28, .24, i === 3 ? .18 : .28], [Math.PI / 2, 0, 0]));
  const tip = points.at(-1); for (const side of [-1, 1]) k.link(g, 'steel', tip, [tip[0] + side * .11, tip[1] - .22, tip[2]], .035);
}
function plant(g, k, { w, d }) {
  const s = Math.min(w, d); k.cylinder(g, 'pot', [0, .23, 0], [s * .47, .46, s * .47]); k.torus(g, 'wood', [0, .46, 0], [s * .49, s * .49, s * .49], [Math.PI / 2, 0, 0]); k.cylinder(g, 'soil', [0, .465, 0], [s * .42, .015, s * .42]);
  for (let i = 0; i < 7; i++) {
    const a = i * .9, x = Math.cos(a) * s * .27, z = Math.sin(a) * s * .27;
    k.link(g, 'leaf', [0, .47, 0], [x, .85 + (i % 3) * .09, z], .018); const leaf = k.sphere(g, i % 2 ? 'leafLight' : 'leaf', [x, .86 + (i % 3) * .09, z], [s * .15, .12, s * .44]);
    leaf.rotation.set(.3, -a + Math.PI / 2, .35); leaf.castShadow = k.quality !== 'low';
  }
}
function coffee(g, k, { w, d }) {
  const width = w * .66, depth = d * .7;
  k.rounded(g, 'dark', [0, .65, 0], [width, 1.3, depth]); k.rounded(g, 'instrument', [0, .83, depth / 2 + .01], [width * .85, .72, .055]); k.box(g, 'black', [0, .5, depth / 2 + .045], [width * .66, .49, .025]);
  k.box(g, 'steel', [0, .32, depth / 2 + .09], [width * .76, .035, .2]); k.cylinder(g, 'steel', [0, .78, depth / 2 + .09], [.05, .12, .05]); mug(g, k, 0, .35, depth / 2 + .09, .5);
  k.box(g, 'ledRed', [width * .29, 1.12, depth / 2 + .047], [.04, .04, .015]); k.label(g, 'COFFEE', [0, 1.02, depth / 2 + .045], width * .6, .07);
}
function mast(g, k, { w, d }) {
  k.rounded(g, 'dark', [0, .07, 0], [w * .6, .14, d * .6]); k.cylinder(g, 'steel', [0, 1.2, 0], [.08, 2.2, .08]); k.cylinder(g, 'amber', [0, 2.14, 0], [.14, .15, .14]);
  for (const y of [1.6, 1.9]) k.box(g, 'body', [0, y, 0], [w * .6, .035, .035]);
}
function launchEntrance(g, k, { w, d }) {
  // The door is already in MAP_DATA.grid: this marker must not obstruct its passage.
  k.box(g, 'navy', [0, .015, 0], [w * .94, .025, d * .88]);
  for (let i = 0; i < 4; i++) k.box(g, 'screen', [0, .031, -d * .3 + i * d * .2], [w * .3, .008, .035]);
}

const MODELS = {
  screen, console: consoleDesk, rover, crate, spec: spectrometer, telescope, dish,
  bench: workbench, solar, rtg, rack, tank, cart, shelf, micro: microscope, globe,
  desk, chair, plant, locker, holotable, whiteboard, rockcase, pallet, battery,
  transformer, roboarm, wheelrack, coffee, cabinet, launchEntrance,
};
const ALIASES = { monitor: 'console', computer: 'console', instrument: 'spec', 'solar-panel': 'solar', mast: 'mast', sample: 'specimen', 'camera-target': 'specimen' };
const EXTRA_MODELS = { mast, specimen };

/** Batch repeated screws, fins, cells and slots while preserving the parent raycast metadata. */
function batchParts(parent) {
  for (const child of [...parent.children]) if (child.isGroup) batchParts(child);
  const batches = new Map();
  for (const child of parent.children) {
    if (!child.isMesh || child.isInstancedMesh) continue;
    const key = `${child.geometry.uuid}:${child.material.uuid}:${child.castShadow}:${child.receiveShadow}`;
    if (!batches.has(key)) batches.set(key, []); batches.get(key).push(child);
  }
  for (const pieces of batches.values()) {
    if (pieces.length < 4) continue;
    const first = pieces[0], mesh = new InstancedMesh(first.geometry, first.material, pieces.length);
    mesh.name = `${first.name}-batch`; mesh.castShadow = first.castShadow; mesh.receiveShadow = first.receiveShadow;
    pieces.forEach((piece, i) => { piece.updateMatrix(); mesh.setMatrixAt(i, piece.matrix); parent.remove(piece); });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); parent.add(mesh);
  }
}

/** Dedicated models for every real map type. No anisotropic scaling or 3-tile clamp. */
export function createEnvironmentProp(prop, kit) {
  const g = new Group(); g.name = `map-prop:${String(prop.type || 'equipment')}`; g.userData.prop = prop;
  const type = String(prop.type || prop.kind || 'instrument');
  const modelType = prop.trainingId === 'camera' || prop.trainingId === 'photo' ? 'specimen' : ALIASES[type] || type;
  const model = MODELS[modelType] || EXTRA_MODELS[modelType] || spectrometer;
  const w = Math.max(.1, Number(prop.w) || 1), d = Math.max(.1, Number(prop.h) || 1);
  g.userData.modelType = modelType; model(g, kit, { w, d, prop }); batchParts(g);
  g.position.set((Number(prop.x) || 0) + w / 2, 0, (Number(prop.y) || 0) + d / 2);
  if (Number.isFinite(prop.angle)) g.rotation.y = -prop.angle;
  return g;
}
