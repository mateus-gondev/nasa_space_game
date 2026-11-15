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
    // Cores do drawProp/drawExtra do mapa; cada equipamento conserva sua identidade.
    body:std('#cfd5db',.32,.48), console:std('#56677a',.35,.55),
    navy:std('#17306b',.3,.47), panelBlue:std('#10265a',.32,.42),
    drawer:std('#8795a3',.32,.58), locker:std('#7a8b9d',.35,.52),
    crate:std('#5f7385',.35,.65), strap:std('#4a5b6b',.45,.55),
    bench:std('#d8dfe6',.22,.5), instrument:std('#8c96a2',.48,.38),
    cartRed:std('#b33a3a',.3,.5), shelf:std('#39424c',.5,.55),
    olive:std('#56624a',.35,.6), fin:std('#5d636c',.62,.45),
    wood:std('#7d6b55',0,.87), palletWood:std('#b08a58',0,.9),
    pot:std('#6b4a35',0,.88), leaf:std('#2f7a3d',0,.8), leafLight:std('#3f8f4a',0,.76),
    sampleBlue:std('#6fd3ff',.1,.4), sampleGreen:std('#9bff9b',.1,.4), sampleAmber:std('#ffc66f',.1,.4),
    amber:std('#f5c518',.22,.5), paper:std('#f0f0ea',0,.94),
    cartonGold:std('#c9a050',0,.85), cartonBlue:std('#6a8caf',0,.8),
    cartonRed:std('#b0585a',0,.8), cartonGreen:std('#7aa37a',0,.85),
    ledGreen:std('#9bff9b',0,.4,{emissive:'#9bff9b',emissiveIntensity:.65}),
    ledRed:std('#ff5252',0,.4,{emissive:'#ff5252',emissiveIntensity:.5}),
    hologram:std('#ffbb8e',0,.5,{transparent:true,opacity:.7,emissive:'#b45b30',emissiveIntensity:.45,depthWrite:false}),
    beam:std('#4dd0ff',0,1,{transparent:true,opacity:.055,emissive:'#4dd0ff',emissiveIntensity:.7,depthWrite:false,side:DoubleSide}),
    displayGlass:std('#bfe9ff',.05,.1,{transparent:true,opacity:.15,depthWrite:false,side:DoubleSide}),
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
  const name=String(text||'INSTRUMENT').toUpperCase().slice(0,40);
  ctx.fillText(name,256,68,465);
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;
  return new MeshBasicMaterial({map,transparent:false,side:DoubleSide});
}

/** Face graphics reproduce the map's graphs, solar cells and Martian globe. */
export function createPanelMaterial(kind) {
  const canvas=document.createElement('canvas');
  canvas.width=kind==='mars'?1024:768;canvas.height=kind==='mars'?512:384;
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  let seed=5821;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  c.fillStyle=kind==='board'?'#eef2f5':kind==='solar'?'#10265a':kind==='mars'?'#c57349':'#06223d';
  c.fillRect(0,0,w,h);
  if(kind==='mars'){
    for(let i=0;i<650;i++){
      c.fillStyle=['#a25535','#b76440','#e28b5c','#8a4530','#da8052'][i%5];
      c.beginPath();c.ellipse(random()*w,random()*h,3+random()*42,2+random()*14,random()*3,0,Math.PI*2);c.fill();
    }
    c.fillStyle='#e9d8bb';c.fillRect(0,0,w,12);c.fillRect(0,h-10,w,10);
  }else if(kind==='solar'){
    for(let x=8;x<w;x+=64)for(let y=7;y<h;y+=64){
      c.fillStyle='#17346b';c.fillRect(x,y,56,56);
      c.strokeStyle='#3b6fd1';c.lineWidth=2;c.strokeRect(x,y,56,56);
      c.strokeStyle='#9aa6b2';c.lineWidth=.7;
      for(let j=1;j<5;j++){c.beginPath();c.moveTo(x+3,y+j*11);c.lineTo(x+53,y+j*11);c.stroke();}
    }
  }else if(kind==='board'){
    c.strokeStyle='#d2dce3';c.lineWidth=1;
    for(let x=30;x<w;x+=32){c.beginPath();c.moveTo(x,36);c.lineTo(x,h-45);c.stroke();}
    for(let y=36;y<h-30;y+=32){c.beginPath();c.moveTo(30,y);c.lineTo(w-30,y);c.stroke();}
    c.strokeStyle='#2f6fd6';c.lineWidth=5;c.beginPath();
    for(let i=0;i<18;i++){const x=38+i*(w-80)/17,y=190+Math.sin(i*.92)*48; i?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    c.fillStyle='#fc3d21';for(let i=0;i<4;i++)c.fillRect(45+i*160,48,95,8);
    c.fillStyle='#f5c518';c.fillRect(w-100,h-90,65,52);
    c.fillStyle='#1e3a52';c.font='21px monospace';c.fillText('MERIDIANI  /  SOL 5111',40,h-28);
  }else{
    c.strokeStyle='#16435d';c.lineWidth=1;
    for(let x=0;x<w;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
    for(let y=0;y<h;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
    for(let n=0;n<3;n++){
      c.strokeStyle=['#4dd0ff','#9bff9b','#ffc66f'][n];c.lineWidth=3;c.beginPath();
      for(let x=25;x<w-24;x+=4){const y=105+n*95+Math.sin(x/(20+n*14)+n)*18+Math.sin(x/7)*4;x===25?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
    }
    c.fillStyle='#a5d9ef';c.font='22px monospace';c.fillText('OPPORTUNITY   /   TELEMETRY',25,31);
  }
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;map.anisotropy=4;
  const emissive=['board','solar','mars'].includes(kind)?'#000000':'#245d77';
  return new MeshStandardMaterial({map,roughness:kind==='solar'?.4:.8,metalness:kind==='solar'?.25:0,emissive,emissiveIntensity:.4});
}
