import {
  Scene, Color, Fog, Group, Mesh, Object3D, InstancedMesh,
  BoxGeometry, PlaneGeometry, HemisphereLight, DirectionalLight, PointLight,
  GridHelper, AmbientLight
} from 'three';
import { createEnvironmentMaterials } from './materials.js';
import { createPropKit, createEnvironmentProp } from './props.js';
import { getRenderProfile } from './quality.js';
import { disposeScene } from './resources.js';

const FALLBACK_GRID=[
 [1,1,1,1,1,1], [1,2,2,2,2,1], [1,2,2,2,2,1],
 [1,2,2,2,2,1], [1,1,1,3,1,1]
];

function normalizeMap(map={},config={}) {
 let grid=map.grid||map.tiles||FALLBACK_GRID;
 if(!Array.isArray(grid))grid=FALLBACK_GRID;
 const width=Number(map.width)|| (Array.isArray(grid[0]) ? Math.max(...grid.map(r=>r.length)) : 0);
 const height=Number(map.height)|| (Array.isArray(grid[0]) ? grid.length : 0);
 if(!width||!height)throw new Error('MAP_DATA needs grid[][] or flat grid with width and height');
 if(!Array.isArray(grid[0])) grid=Array.from({length:height},(_,z)=>grid.slice(z*width,(z+1)*width));
 const floorMap=map.floorMap||null;
 const floorAt=(x,z)=> {
   if(!floorMap)return 'lab';
   const val=Array.isArray(floorMap[0])?floorMap[z]?.[x] : floorMap[z*width+x];
   // Índices da planta real usam a paleta do projeto, sem reinterpretar Storage como Marte.
   const configuredColor=typeof val==='number' ? config.colors?.floors?.[val] : null;
   if(configuredColor)return `color:${configuredColor}`;
   const source=(val && typeof val==='object')?(val.type||val.material||val.kind||val.color||''):val;
   const str=String(source??'').toLowerCase();
   // Preserve explicit floorMap CSS colors without needing a second manual map.
   if(/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/.test(str))return `color:${str}`;
   if(str.includes('mars')||str.includes('red')||str.includes('sand')||str.includes('rust')||val===4)return 'mars';
   if(str.includes('grate')||str.includes('metal')||str.includes('industrial')||val===3)return 'grate';
   if(str.includes('concrete')||str.includes('gray')||str.includes('grey')||val===2)return 'concrete';
   return 'lab';
 };
 return {grid,width,height,floorAt,props:Array.isArray(map.props)?map.props:[]};
}

function makeInstances(scene, geometry, material, placements, {castShadow=false,receiveShadow=true}={}) {
 if(!placements.length)return null;
 const mesh=new InstancedMesh(geometry,material,placements.length);
 mesh.castShadow=castShadow;mesh.receiveShadow=receiveShadow;
 const object=new Object3D();
 placements.forEach((a,i)=>{
   object.position.set(...a.position);
   object.scale.set(...a.scale);
   object.rotation.set(0,a.yaw||0,0);
   object.updateMatrix();mesh.setMatrixAt(i,object.matrix);
 });
 mesh.instanceMatrix.needsUpdate=true;
 scene.add(mesh);return mesh;
}

function distributeLighting(scene,model,kit,materials,quality){
 const {grid,width,height}=model;
 const p=getRenderProfile(quality), lightSpots=[];
 const candidates=[];
 for(let z=2;z<height-1;z+=5)for(let x=2;x<width-1;x+=5){
   if(Number(grid[z]?.[x])===2)candidates.push([x+.5,z+.5]);
 }
 const count=Math.min(quality==='low'?3:quality==='high'?12:8,candidates.length);
 for(let i=0;i<count;i++){
  const [x,z]=candidates[Math.floor((i+.5)*candidates.length/count)];
  const group=new Group();group.position.set(x,3.06,z);
  kit.box(group,'dark',[0,.01,0],[1.50,.12,.40]);
  kit.box(group,'lamp',[0,-.061,0],[1.24,.025,.24],[0,0,0],{castShadow:false});
  scene.add(group);
  if(i < (quality==='low'?1:quality==='high'?6:4)){
   const light=new PointLight(0xc1e9ff, quality==='high'?13:10,9,2);
   light.position.set(x,2.72,z);scene.add(light);
  }
  lightSpots.push([x,z]);
 }
 return lightSpots;
}

function decorateWalls(scene,model,kit,quality){
 if(quality==='low')return;
 const {width,height,grid}=model;
 const skip=quality==='high'?3:5;
 for(let z=1;z<height-1;z++)for(let x=1;x<width-1;x++){
  if(Number(grid[z]?.[x])!==1 || ((x*7+z*3)%skip))continue;
  const sides=[{dx:0,dz:1,yaw:0},{dx:0,dz:-1,yaw:Math.PI},{dx:1,dz:0,yaw:Math.PI/2},{dx:-1,dz:0,yaw:-Math.PI/2}];
  for(const {dx,dz,yaw} of sides){
   const adj=Number(grid[z+dz]?.[x+dx]);
   if(adj!==2&&adj!==3)continue;
   const panel=new Group();panel.position.set(x+.5+dx*.51,0,z+.5+dz*.51);panel.rotation.y=yaw;
   kit.box(panel,'wallPanel',[0,1.72,0],[.82,1.23,.045],undefined,{castShadow:false});
   kit.box(panel,'trim',[0,1.10,.033],[.88,.055,.05],undefined,{castShadow:false});
   kit.box(panel,'trim',[0,2.34,.033],[.88,.05,.05],undefined,{castShadow:false});
   kit.box(panel,'screen',[0,2.16,.038],[.44,.065,.014],undefined,{castShadow:false});
   scene.add(panel);
  }
 }
}


function addInfrastructure(scene,model,kit,quality){
 const {width,height,grid}=model;
 // Mechanical conduits along the roof: curved profiles, not more cuboid furniture.
 if(quality!=='low'&&width>9){
  const zFront=.62;
  for(const [i,heightY] of [2.68,2.89].entries()){
   const pipe=new Group();pipe.position.set(width/2,heightY,zFront+i*.14);
   kit.cylinder(pipe,i?'trim':'metal',[0,0,0],[.10,width-2,.10],[0,0,Math.PI/2],{castShadow:false});
   for(let x=3;x<width-2;x+=4){
    kit.box(pipe,'dark',[x-width/2+.5,-.10,0],[.06,.20,.16],undefined,{castShadow:false});
   }
   scene.add(pipe);
  }
 }
 // Doors keep their passage open while acquiring frames, guides and signage.
 for(let z=0;z<height;z++)for(let x=0;x<width;x++){
  if(Number(grid[z]?.[x])!==3)continue;
  const frame=new Group();frame.position.set(x+.5,0,z+.5);
  for(const px of [-.47,.47]){
   kit.box(frame,'dark',[px,1.35,0],[.09,2.7,.13],undefined,{castShadow:false});
   for(let j=0;j<5;j++)kit.box(frame,'hazard',[px, .34+j*.37,.071],[.075,.075,.018],undefined,{castShadow:false});
  }
  kit.box(frame,'trim',[0,2.73,0],[1.04,.13,.18],undefined,{castShadow:false});
  kit.box(frame,'lamp',[0,2.76,.095],[.40,.04,.015],undefined,{castShadow:false});
  if(quality!=='low')kit.label(frame,'ACCESS',[0,2.95,.095],.57,.13);
  scene.add(frame);
 }
}

function addAtmosphere(scene,model,kit,quality){
 const {width,height,floorAt,grid}=model;
 const p=getRenderProfile(quality), density=p.decorativeDensity;
 if(density===0)return;
 const maxRocks=quality==='high'?90:quality==='balanced'?45:18;
 let placed=0;
 for(let z=0;z<height;z++)for(let x=0;x<width;x++){
  if(placed>=maxRocks)break;
  if(Number(grid[z]?.[x])!==2 || floorAt(x,z)!=='mars')continue;
  if(((x*17+z*29)%7)!==0)continue;
  const group=new Group();group.position.set(x+.23+(x%3)*.10,0,z+.2+(z%4)*.09);
  const s=.07+((x*3+z*11)%7)*.019;
  kit.rock(group,'rock',[0,s*.58,0],[s*1.5,s,s*1.25],[.2+x*.17,z*.14,.2]);
  scene.add(group);placed++;
 }
}

/**
 * Build an enhanced standalone Three.Scene from the Lab Training MAP_DATA contract.
 * Tile (x,y) becomes world (X,Z); original prop metadata is retained for raycasts.
 * `createLabScene(map,config,mood)` in older code can be replaced by this export.
 */
export function createEnhancedLabScene(map,config={},mood={},options={}){
 const quality=options.quality||'balanced';
 const profile=getRenderProfile(quality);
 const model=normalizeMap(map,config);
 const {grid,width,height,props,floorAt}=model;
 const scene=new Scene();
 const outdoors=options.outdoors===true;
 const sky=options.background||mood.background||(outdoors?'#553f38':'#10212b');
 scene.background=new Color(sky);
 if(profile.fog&&options.fog!==false)scene.fog=new Fog(sky, Math.max(18,Math.min(width,height)*1.4),Math.max(45,Math.max(width,height)*2.3));
 const library=createEnvironmentMaterials({quality});
 const kit=createPropKit(library.materials,{quality});
 const meshes=[];
 const cube=new BoxGeometry(1,1,1);
 const floors=new Map(),walls=[],doors=[];
 for(let z=0;z<height;z++)for(let x=0;x<width;x++){
  const v=Number(grid[z]?.[x]);
  if(v===1){walls.push({position:[x+.5,1.6,z+.5],scale:[.99,3.2,.99]});continue;}
  if(v!==2&&v!==3)continue;
  const kind=floorAt(x,z);
  if(!floors.has(kind))floors.set(kind,[]);
  floors.get(kind).push({position:[x+.5,-.071,z+.5],scale:[.99,.12,.99]});
  if(v===3)doors.push({position:[x+.5,2.88,z+.5],scale:[.99,.45,.99]});
 }
 for(const [kind,placements] of floors){
  const key={lab:'floorLab',concrete:'floorConcrete',grate:'floorGrate',mars:'floorMars'}[kind];
  let material=library.materials[key];
  if(kind.startsWith('color:')){
    material=library.materials.floorConcrete.clone();
    material.color.set(kind.slice(6));
  }
  if(!material)material=library.materials.floorLab;
  const m=makeInstances(scene,cube,material,placements);if(m)meshes.push(m);
 }
 const wallMesh=makeInstances(scene,cube,library.materials.wall,walls,{castShadow:profile.shadows});if(wallMesh)meshes.push(wallMesh);
 const doorMesh=makeInstances(scene,cube,library.materials.trim,doors);if(doorMesh)meshes.push(doorMesh);
 // Recessed roof with emissive strips. No shadow cast: practical interior lighting stays affordable.
 if(!outdoors && options.ceiling!==false){
   const ceiling=new Mesh(cube,library.materials.dark);
   ceiling.position.set(width/2,3.23,height/2);ceiling.scale.set(width,.14,height);
   ceiling.receiveShadow=true;ceiling.castShadow=false;
   scene.add(ceiling);
 }
 const rawLightOpacity=Number(mood.lightOpacity);
 const lightOpacity=Math.max(.3,Number.isFinite(rawLightOpacity)?rawLightOpacity:1);
 const hemi=new HemisphereLight(0xd7ecfb,0x3d4b50,1.2*lightOpacity);scene.add(hemi);
 const sun=new DirectionalLight(mood.lightColor||0xffe9c7,outdoors?2.5:1.85);
 sun.position.set(width*.28+3,Math.max(13,height*.62),height*.2+2);
 sun.castShadow=profile.shadows;
 if(sun.castShadow){
  sun.shadow.mapSize.set(profile.shadowSize,profile.shadowSize);
  sun.shadow.camera.left=-Math.max(width,height)*.62;
  sun.shadow.camera.right=Math.max(width,height)*.62;
  sun.shadow.camera.top=Math.max(width,height)*.62;
  sun.shadow.camera.bottom=-Math.max(width,height)*.62;
  sun.shadow.camera.near=.5;sun.shadow.camera.far=Math.max(70,Math.max(width,height)*3);
  sun.shadow.normalBias=.025;sun.shadow.bias=-.0001;
  sun.target.position.set(width/2,0,height/2);scene.add(sun.target);
 }
 scene.add(sun);
 if(!outdoors)distributeLighting(scene,model,kit,library.materials,quality);
 if(!outdoors){
  decorateWalls(scene,model,kit,quality);
  addInfrastructure(scene,model,kit,quality);
 }
 addAtmosphere(scene,model,kit,quality);
 for(const prop of props){
  if(!prop || !Number.isFinite(Number(prop.x))||!Number.isFinite(Number(prop.y)))continue;
  scene.add(createEnvironmentProp(prop,kit,{quality}));
 }
 scene.userData.environment={quality,tiles:{width,height},propCount:props.length,instanceCount:meshes.length};
 // The existing camera raycaster climbs parents until it finds userData.prop.
 let disposed=false;
 scene.userData.disposeEnvironment=(extra=[])=>{
  if(disposed)return;
  disposed=true;
  disposeScene(scene,[...Object.values(kit.geometry),...Object.values(library.materials),...Object.values(library.textures),cube,...extra]);
 };
 return scene;
}
export const createLabScene=createEnhancedLabScene;
