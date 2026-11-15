import {
 Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry,
 IcosahedronGeometry, PlaneGeometry, DoubleSide
} from 'three';
import {createSignMaterial} from './materials.js';

/** Shared low-poly/medium-poly mesh kit with no downloaded models or textures. */
export function createPropKit(materials,{quality='balanced'}={}) {
  const segments=quality==='low'?10:quality==='high'?28:18;
  const geometry={
    box:new BoxGeometry(1,1,1), cylinder:new CylinderGeometry(.5,.5,1,segments),
    sphere:new SphereGeometry(.5,segments,Math.max(8,segments/2)),
    rock:new IcosahedronGeometry(.5,1),torus:new TorusGeometry(.5,.05,8,24),
    plane:new PlaneGeometry(1,1)
  };
  function piece(parent,kind,mat,position=[0,0,0],scale=[1,1,1],rotation=[0,0,0],options={}){
    const m=new Mesh(geometry[kind],materials[mat]||mat);
    m.position.set(...position);m.scale.set(...scale);m.rotation.set(...rotation);
    m.castShadow=options.castShadow!==false;
    m.receiveShadow=options.receiveShadow!==false;
    parent.add(m);return m;
  }
  const box=(p,m,pos,scale,rot=[0,0,0],o)=>piece(p,'box',m,pos,scale,rot,o);
  const cylinder=(p,m,pos,scale,rot=[0,0,0],o)=>piece(p,'cylinder',m,pos,scale,rot,o);
  const sphere=(p,m,pos,scale,rot=[0,0,0],o)=>piece(p,'sphere',m,pos,scale,rot,o);
  const torus=(p,m,pos,scale,rot=[0,0,0],o)=>piece(p,'torus',m,pos,scale,rot,o);
  const rock=(p,m,pos,scale,rot=[0,0,0],o)=>piece(p,'rock',m,pos,scale,rot,o);
  const label=(p,text,pos=[0,1,0],w=.65,h=.16)=>{
    const mat=createSignMaterial(text);
    const mesh=new Mesh(geometry.plane,mat);mesh.scale.set(w,h,1);mesh.position.set(...pos);mesh.material.side=DoubleSide;
    p.add(mesh);return mesh;
  };
  return {piece,box,cylinder,sphere,torus,rock,label,geometry,dispose(){Object.values(geometry).forEach(g=>g.dispose())}};
}

function workbench(g,k,{computer=false}={}){
  const {box,cylinder}=k;
  box(g,'metal',[0,.78,0],[1.06,.12,.72]);
  box(g,'steel',[0,.86,0],[1.08,.055,.75]);
  for(const x of [-.43,.43])for(const z of [-.28,.28])box(g,'dark',[x,.39,z],[.065,.75,.065]);
  box(g,'trim',[0,.23,0],[.9,.055,.54]);
  if(computer){
    box(g,'dark',[-.21,1.19,-.14],[.44,.32,.06]);
    box(g,'screen',[-.21,1.19,-.105],[.37,.24,.01]);
    box(g,'metal',[-.21,1.01,-.14],[.06,.17,.05]);
    box(g,'rubber',[-.17,.91,.10],[.4,.025,.15]);
  } else {
    box(g,'dark',[.22,.98,-.14],[.28,.18,.22]);
    box(g,'metal',[.22,1.08,-.14],[.25,.038,.20]);
  }
}
function cabinet(g,k){
 const {box,cylinder,label}=k;
 box(g,'rubber',[0,1.06,0],[.88,2.1,.62]);
 box(g,'steel',[0,1.06,0],[.82,2.02,.57]);
 for(const x of [-.21,.21]){
  box(g,'wallPanel',[x,1.06,.294],[.385,1.84,.025]);
  box(g,'dark',[x>0?.04:-.04,1.05,.315],[.025,.27,.034]);
  for(let j=0;j<5;j++)box(g,'trim',[x,1.66-j*.062,.315],[.23,.011,.03]);
 }
 box(g,'dark',[0,2.09,0],[.93,.075,.68]);
 for(const x of [-.34,.34])for(const z of [-.22,.22])cylinder(g,'dark',[x,.037,z],[.085,.075,.085]);
 label(g,'STORAGE',[0,1.91,.326],.48,.10);
}
function rack(g,k){
 const {box,label}=k;
 for(const x of [-.43,.43])for(const z of [-.32,.32])box(g,'dark',[x,1.04,z],[.06,2.08,.06]);
 for(let i=0;i<5;i++){
  const y=.23+i*.4;
  box(g,'metal',[0,y,0],[.93,.055,.72]);
  if(i<4){
   box(g,'rubber',[0,y+.21,-.05],[.76,.31,.47]);
   box(g,'steel',[0,y+.20,.197],[.72,.25,.035]);
   for(let j=0;j<4;j++)box(g,j%3===0?'screen':'dark',[-.26+j*.17,y+.20,.22],[.045,.035,.009]);
   for(let j=0;j<3;j++)box(g,'trim',[-.24+j*.22,y+.28,.22],[.13,.014,.009]);
  }
 }
 label(g,'DATA RACK',[0,2.19,.23],.75,.1);
}
function tank(g,k){
 const {box,cylinder,torus,label}=k;
 cylinder(g,'steel',[0,1.04,0],[.9,1.64,.9]);
 cylinder(g,'dark',[0,.15,0],[.77,.22,.77]);
 for(const y of [.53,1.47])torus(g,'trim',[0,y,0],[.85,.85,.85],[Math.PI/2,0,0]);
 cylinder(g,'metal',[0,1.92,0],[.36,.19,.36]);
 cylinder(g,'hazard',[0,2.06,0],[.15,.16,.15]);
 box(g,'dark',[.21,1.55,.40],[.27,.27,.06]);
 cylinder(g,'detail',[.21,1.56,.44],[.24,.03,.24],[Math.PI/2,0,0]);
 box(g,'hazard',[0,1.05,.46],[.23,.13,.012]);
 label(g,'OXYGEN',[0,.71,.455],.45,.105);
}
function monitor(g,k){
 const {box,label}=k;
 workbench(g,k,{computer:true});
 box(g,'rubber',[.29,.96,.12],[.17,.025,.16]);
 box(g,'hazard',[.30,1.16,-.14],[.08,.035,.09]);
 label(g,'DIAGNOSTICS',[0,.47,.39],.55,.1);
}
function solarPanel(g,k){
 const {box}=k;
 box(g,'metal',[0,.2,0],[.12,.38,.12]);
 box(g,'rubber',[0,.41,0],[1.25,.09,.79],[.24,0,0]);
 box(g,'steel',[0,.422,-.002],[1.18,.065,.72],[.24,0,0]);
 for(let i=0;i<5;i++)for(let j=0;j<3;j++){
   box(g,'screen',[-.46+i*.23,.47+j*.055,-.23+j*.23],[.19,.015,.2],[.24,0,0]);
 }
}
function pallet(g,k){
 const {box}=k;
 for(const x of [-.4,0,.4])box(g,'metal',[x,.075,0],[.12,.15,.85]);
 for(const z of [-.31,0,.31])box(g,'steel',[0,.18,z],[1.05,.075,.26]);
 box(g,'rubber',[0,.44,0],[.68,.42,.55]);
 box(g,'trim',[0,.67,0],[.76,.04,.62]);
}
function plant(g,k){
 const {box,cylinder,sphere}=k;
 cylinder(g,'metal',[0,.33,0],[.5,.66,.5]);
 cylinder(g,'soil',[0,.66,0],[.46,.08,.46]);
 for(let i=0;i<7;i++){
  const theta=i*Math.PI*2/7;
  const leaf=cylinder(g,'green',[Math.sin(theta)*.2,.9,Math.cos(theta)*.2],[.12,.5,.11],[Math.cos(theta)*.5,0,-Math.sin(theta)*.5]);
  leaf.castShadow=false;
 }
 sphere(g,'green',[0,1.2,0],[.38,.32,.38]);
}
function mast(g,k){
 const {box,cylinder,sphere}=k;
 box(g,'dark',[0,.065,0],[.57,.12,.57]);
 cylinder(g,'metal',[0,1.15,0],[.10,2.2,.10]);
 cylinder(g,'hazard',[0,2.1,0],[.19,.23,.19]);
 sphere(g,'glass',[0,2.27,0],[.32,.32,.32]);
 for(const x of [-.26,.26])box(g,'trim',[x,1.45,0],[.46,.035,.035]);
}
function instrument(g,k){
 const {box,cylinder,sphere,label}=k;
 workbench(g,k);
 cylinder(g,'metal',[-.15,1.05,-.05],[.18,.29,.18]);
 cylinder(g,'dark',[-.15,1.24,-.05],[.11,.26,.11]);
 cylinder(g,'steel',[-.10,1.41,-.02],[.23,.16,.23],[.4,0,-.3]);
 sphere(g,'glass',[-.02,1.41,.02],[.16,.16,.16]);
 label(g,'SENSOR',[0,.48,.383],.39,.1);
}
function specimen(g,k,{training=false}={}){
 const {box,cylinder,rock,torus,label}=k;
 box(g,'dark',[0,.38,0],[1.13,.76,.86]);
 box(g,'steel',[0,.79,0],[1.17,.09,.90]);
 box(g,'soil',[0,.86,0],[.9,.07,.66]);
 for(let i=0;i<5;i++){
  const x=Math.sin(i*2.4)*.26, z=Math.cos(i*2.3)*.20;
  rock(g,'rock',[x,.98+.025*(i%3),z],[.24+i*.028,.20+i*.02,.21+i*.02],[i*.35,i*.5,i*.7]);
 }
 box(g,'rubber',[0,.37,.46],[.80,.22,.04]);
 label(g,'SAMPLE 01',[0,.37,.49],.55,.12);
 if(training){
  const halo=torus(g,'hazard',[0,.93,0],[.75,.61,.75],[Math.PI/2,0,0]);halo.castShadow=false;
 }
}
function crate(g,k){
 const {box,label}=k;
 box(g,'rubber',[0,.43,0],[.92,.86,.81]);
 box(g,'metal',[0,.45,0],[.85,.78,.74]);
 for(const y of [.13,.75])box(g,'trim',[0,y,.38],[.90,.055,.05]);
 for(const x of [-.33,.33])box(g,'dark',[x,.43,.4],[.055,.76,.04]);
 box(g,'hazard',[0,.61,.404],[.15,.12,.01]);
 label(g,'CARGO',[0,.33,.419],.4,.1);
}

const ROUTES=[
 [/camera|photo|sample|rock|specimen|rocha|amostra/i,specimen],
 [/rack|server|servidor/i,rack],
 [/cabinet|locker|arm[aá]rio|storage|guardar/i,cabinet],
 [/tank|oxygen|tanque|reservat[oó]rio|cilindro/i,tank],
 [/monitor|computer|console|terminal|screen|computador|tela/i,monitor],
 [/solar|painel/i,solarPanel],
 [/pallet|palete|caixa.*transporte/i,pallet],
 [/plant|planta|vaso|vegetal/i,plant],
 [/mast|antena|mastro/i,mast],
 [/instrument|sensor|science|microsco|tool|equip|experimento/i,instrument],
 [/bench|table|mesa|bancada/i,workbench],
 [/crate|cargo|box|container|caixa/i,crate],
];

/** Creates a detailed object from MAP_DATA prop without changing its metadata. */
export function createEnvironmentProp(prop,kit,{quality='balanced'}={}){
 const g=new Group();g.name=`map-prop:${String(prop.type||prop.name||'equipment')}`;
 g.userData.prop=prop;
 const type=String(prop.type||prop.kind||prop.name||'equipment');
 const training=prop.trainingId==='camera' || prop.trainingId==='photo';
 const route=training ? specimen : ROUTES.find(([rx])=>rx.test(type))?.[1] || instrument;
 route(g,kit,{training});
 const w=Number(prop.w)||1, h=Number(prop.h)||1;
 g.scale.set(Math.max(.48,Math.min(w,3)),1,Math.max(.48,Math.min(h,3)));
 g.position.set((Number(prop.x)||0)+w/2,0,(Number(prop.y)||0)+h/2);
 if(Number.isFinite(prop.angle))g.rotation.y=-prop.angle;
 return g;
}
