import {
  CanvasTexture, MeshStandardMaterial, MeshBasicMaterial,
  RepeatWrapping, SRGBColorSpace, DoubleSide
} from 'three';

const PALETTE = Object.freeze({
  concrete: '#9faeb7', white: '#c5d4da', metal: '#7c929c', dark: '#293a48',
  trim: '#526c7c', steel: '#a5b6c0', hazard: '#d99b38', blue: '#3cbad3',
  screen: '#42dcf4', rubber: '#18252e', glass: '#6b9fad', red: '#ba5b4e',
  green: '#709783', clay: '#957565', stone: '#9e8472'
});

function paintTile(ctx, kind, size) {
  ctx.fillStyle = kind === 'lab' ? '#c1d0d5' : kind === 'grate' ? '#60737d' : kind === 'mars' ? '#aa826b' : '#83939b';
  ctx.fillRect(0, 0, size, size);
  let seed = 271828;
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  // Physically small surface variation; no external texture downloads.
  for (let i = 0; i < 1500; i++) {
    const x = random() * size, y = random() * size;
    const a = kind === 'lab' ? 0.03 : 0.035 + random() * 0.075;
    ctx.fillStyle = random() > 0.5 ? `rgba(245,249,245,${a})` : `rgba(12,30,37,${a})`;
    ctx.fillRect(x, y, 1 + random() * 2, 1 + random() * 2);
  }
  if (kind === 'lab' || kind === 'concrete') {
    ctx.strokeStyle = kind === 'lab' ? 'rgba(56,75,86,.34)' : 'rgba(38,54,64,.28)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.strokeStyle = 'rgba(255,255,255,.21)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(7, 7, size - 14, size - 14);
    for (const x of [14, size - 14]) for (const y of [14, size - 14]) {
      ctx.fillStyle = 'rgba(36,51,61,.45)'; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI*2); ctx.fill();
    }
  }
  if (kind === 'grate') {
    ctx.strokeStyle = '#24343c'; ctx.lineWidth = 5;
    for (let i = 0; i < size; i += 20) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,size); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(202,226,234,.5)'; ctx.lineWidth = 2;
    for (let i = 2; i < size; i += 20) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,size); ctx.stroke(); }
  }
  if (kind === 'mars') {
    for (let i=0;i<180;i++) {
      const x = random()*size, y = random()*size;
      ctx.fillStyle = random()>.5?'rgba(68,49,42,.17)':'rgba(235,184,129,.19)';
      ctx.beginPath();ctx.ellipse(x,y,1+random()*6,1+random()*3,random()*6.28,0,6.28);ctx.fill();
    }
  }
}

export function makePattern(kind='lab', size=256) {
  if (typeof document === 'undefined') throw new Error('Procedural textures require a browser Canvas API');
  const canvas = document.createElement('canvas'); canvas.width=size; canvas.height=size;
  paintTile(canvas.getContext('2d'),kind,size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy=4;
  return texture;
}

export function createEnvironmentMaterials({ quality='balanced' }={}) {
  const textured = quality !== 'low';
  const textures = textured ? {
    lab:makePattern('lab'), concrete:makePattern('concrete'), grate:makePattern('grate'), mars:makePattern('mars')
  } : {};
  const std = (color, metalness=0.1, roughness=0.75, extra={}) =>
    new MeshStandardMaterial({color,metalness,roughness,...extra});
  const materials = {
    floorLab:std('#ffffff',0.15,0.7,{map:textures.lab||null}),
    floorConcrete:std('#e6eff1',0.05,0.89,{map:textures.concrete||null}),
    floorGrate:std('#d2e1e5',0.7,0.5,{map:textures.grate||null}),
    floorMars:std('#ffffff',0,1,{map:textures.mars||null}),
    wall:std('#93a7b1',0.2,0.64), wallPanel:std('#b8c9ce',0.26,0.48),
    dark:std(PALETTE.dark,0.42,0.6), trim:std(PALETTE.trim,0.65,0.37),
    metal:std(PALETTE.metal,0.72,0.3), steel:std(PALETTE.steel,0.74,0.32),
    rubber:std(PALETTE.rubber,0.13,0.91),
    hazard:std(PALETTE.hazard,0.35,0.48), red:std(PALETTE.red,0.33,0.57),
    green:std(PALETTE.green,0.14,0.83),
    screen:std(PALETTE.screen,0.2,0.26,{emissive:'#168ba0',emissiveIntensity:1.3}),
    glass:std(PALETTE.glass,0.14,0.15,{transparent:true,opacity:0.74,depthWrite:false,side:DoubleSide}),
    lamp:std('#d9f6fd',0,0.34,{emissive:'#a8f4ff',emissiveIntensity:2.2}),
    rock:std(PALETTE.stone,0,0.99),soil:std(PALETTE.clay,0,0.98),
    black:new MeshBasicMaterial({color:'#08131b'}),
    detail:std('#cbdce1',0.36,0.53),
  };
  return {materials,textures,dispose(){
    for(const value of Object.values(materials))value.dispose();
    for(const value of Object.values(textures))value.dispose();
  }};
}

/** Lightweight signs on geometry, no fonts/assets fetched. Caller owns returned material/texture. */
export function createSignMaterial(text, { color='#ddf7fb', background='#172e3b' }={}) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=background;ctx.fillRect(0,0,512,128);
  ctx.strokeStyle='#567e8c';ctx.lineWidth=5;ctx.strokeRect(6,6,500,116);
  ctx.fillStyle=color;ctx.font='bold 51px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  const name=String(text||'INSTRUMENT').toUpperCase().slice(0,18);
  ctx.fillText(name,256,68,465);
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
  return new MeshBasicMaterial({map,transparent:false,side:DoubleSide});
}
