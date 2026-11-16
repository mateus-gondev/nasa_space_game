import * as THREE from '/vendor/three/three.module.js';
import {LabCameraView} from '/lab-training/js/camera-view.mjs';
import {createEnhancedLabScene} from '/assets/Animations/Opportunity_Engine_3D_Enhanced/engine/environment.mjs';
import {createEnvironmentMaterials} from '/assets/Animations/Opportunity_Engine_3D_Enhanced/engine/materials.mjs';
import {createPropKit,createEnvironmentProp} from '/assets/Animations/Opportunity_Engine_3D_Enhanced/engine/props.mjs';
import {disposeScene} from '/assets/Animations/Opportunity_Engine_3D_Enhanced/engine/resources.mjs';
import {getRenderProfile} from '/assets/Animations/Opportunity_Engine_3D_Enhanced/engine/quality.mjs';

const TAU=Math.PI*2;
function random(seed){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}

function craterGeometry(radius){
  const segments=48,rings=12,vertices=[],colors=[],indices=[];
  const dark=new THREE.Color('#663d30'),light=new THREE.Color('#bb8056');
  for(let ring=0;ring<=rings;ring++)for(let i=0;i<=segments;i++){
    const r=ring/rings,a=i/segments*TAU;
    vertices.push(Math.cos(a)*r*radius,0,Math.sin(a)*r*radius);
    const color=dark.clone().lerp(light,r);colors.push(color.r,color.g,color.b);
    if(ring<rings&&i<segments){const n=ring*(segments+1)+i;indices.push(n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

function landscape(scene,map,kit,mood,quality){
  const night=mood.label==='Noite',storm=mood.label==='Tempestade';
  const horizon=night?'#293143':storm?'#9b735b':'#d4a481';
  scene.background=new THREE.Color(horizon);
  const span=Math.max(map.width,map.height),extent=span+180;
  scene.fog=new THREE.Fog(horizon,night?25:storm?12:45,storm?85:extent*.85);
  const craterProps=map.props.filter(p=>p.sprite?.startsWith('cratera')||p.sprite==='bacia_pesquisa');
  const craters=[...(map.features?.craters||[]).map(([x,z,r])=>[x,z,r]),...craterProps.map(p=>[p.x+p.w/2,p.y+p.h/2,Math.max(p.w,p.h)*.55])];
  const heightAt=(x,z)=>{
    const outside=Math.max(0,-x,x-map.width,-z,z-map.height);
    let height=(Math.sin(x*.43+map.seed)*Math.cos(z*.31)+Math.sin(x*.16+z*.28))*.055;
    height+=Math.min(1,outside/14)*(1.1+Math.sin(x*.08+z*.09)*1.1+Math.sin(x*.18-z*.04)*.65);
    for(const [cx,cz,r]of craters){const d=Math.hypot(x-cx,z-cz)/r;if(d<1.15)height+=(-Math.exp(-d*d*5)*.3+Math.exp(-Math.pow((d-.85)/.16,2))*.16)*Math.min(3,r);}
    return height;
  };
  scene.userData.heightAt=heightAt;
  // Concentra os vértices no mapa: crateras pequenas também têm profundidade real.
  const density=quality==='low'?2:span<40?4:2;
  const axis=size=>{
    const points=[];for(let i=0;i<=24;i++)points.push(-90+i*90/24);
    for(let i=1;i<=Math.ceil(size*density);i++)points.push(Math.min(size,i/density));
    for(let i=1;i<=24;i++)points.push(size+i*90/24);return points;
  };
  const xs=axis(map.width),zs=axis(map.height);
  const geometry=new THREE.PlaneGeometry(1,1,xs.length-1,zs.length-1);
  const positions=geometry.attributes.position,uv=geometry.attributes.uv,colors=[],sand=new THREE.Color('#bc825b'),rust=new THREE.Color('#874830');
  for(let i=0;i<positions.count;i++){
    const x=xs[i%xs.length],z=zs[Math.floor(i/xs.length)];positions.setXYZ(i,x,heightAt(x,z)-.025,z);
    uv.setXY(i,x/5,z/5);
    const v=.4+.22*Math.sin(x*.14+z*.17)+.17*Math.sin(x*.43-z*.31);
    const color=sand.clone().lerp(rust,THREE.MathUtils.clamp(v,0,1));colors.push(color.r,color.g,color.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const texture=kit.materials.floorMars.map;
  if(texture)texture.repeat.set(1,1);
  const groundMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',map:texture,vertexColors:true,roughness:1,metalness:0});
  const ground=new THREE.Mesh(geometry,groundMaterial);ground.name='mars-continuous-terrain';ground.receiveShadow=true;scene.add(ground);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(extent*1.5,32,20),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{zenith:{value:new THREE.Color(night?'#090f20':storm?'#624336':'#76504a')},horizon:{value:new THREE.Color(horizon)}},
    vertexShader:'varying vec3 vDirection; void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'uniform vec3 zenith; uniform vec3 horizon; varying vec3 vDirection; void main(){float h=pow(max(vDirection.y,0.0),0.48);gl_FragColor=vec4(mix(horizon,zenith,h),1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'
  }));sky.name='mars-sky';sky.position.set(map.width/2,0,map.height/2);sky.renderOrder=-1;sky.raycast=()=>{};scene.add(sky);
  const sunPosition=new THREE.Vector3(map.width/2-32,38,map.height/2-50);
  if(!night){
    const disk=new THREE.Mesh(new THREE.SphereGeometry(.7,16,12),new THREE.MeshBasicMaterial({color:'#fff1cd',fog:false}));disk.name='mars-sun';disk.position.copy(sunPosition);scene.add(disk);
    const halo=new THREE.Mesh(new THREE.SphereGeometry(1.4,16,12),new THREE.MeshBasicMaterial({color:'#ffe6b3',transparent:true,opacity:.09,depthWrite:false,fog:false}));halo.position.copy(sunPosition);scene.add(halo);
  }
  scene.add(new THREE.HemisphereLight(night?'#879abe':'#ffe3c0',night?'#3a2930':'#ad7553',night?.75:2.6));
  const sun=new THREE.DirectionalLight(night?'#a9c8ee':'#fff0db',night?.45:storm?1.1:3);sun.position.copy(sunPosition);sun.target.position.set(map.width/2,0,map.height/2);scene.add(sun.target);
  const profile=getRenderProfile(quality);sun.castShadow=profile.shadows;sun.shadow.mapSize.set(profile.shadowSize||512,profile.shadowSize||512);
  const shadowSpan=Math.max(20,span*.65);Object.assign(sun.shadow.camera,{left:-shadowSpan,right:shadowSpan,top:shadowSpan,bottom:-shadowSpan,near:.5,far:extent});sun.shadow.normalBias=.03;sun.shadow.bias=-.0001;scene.add(sun);
  // Três faixas de escarpas formam um horizonte contínuo, além da área caminhável.
  const ridgeRandom=random(map.seed+90);
  for(let layer=0;layer<3;layer++){
    const vertices=[],indices=[],segments=100,radius=Math.hypot(map.width,map.height)*.55+26+layer*16;
    const peaks=Array.from({length:segments},(_,i)=>4+layer*2+Math.sin(i/segments*TAU*7+map.seed)*2+ridgeRandom()*6);
    for(let i=0;i<=segments;i++){
      const a=i/segments*TAU,peak=peaks[i%segments];
      for(const [distance,y]of [[radius,-2],[radius+7,peak],[radius+17,peak*.9],[radius+22,-2]])vertices.push(map.width/2+Math.cos(a)*distance,y,map.height/2+Math.sin(a)*distance);
      if(i<segments)for(let row=0;row<3;row++){const n=i*4+row;indices.push(n,n+1,n+4,n+1,n+5,n+4);}
    }
    const ridge=new THREE.BufferGeometry();ridge.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));ridge.setIndex(indices);ridge.computeVertexNormals();
    const mesh=new THREE.Mesh(ridge,new THREE.MeshStandardMaterial({color:['#925d49','#a6755b','#b38a6c'][layer],roughness:1,flatShading:true,side:THREE.DoubleSide}));mesh.name='mars-horizon-'+layer;scene.add(mesh);
  }
  const rng=random(map.seed),placements=[],count=quality==='low'?160:quality==='high'?650:360;
  for(let i=0;i<count*3&&placements.length<count;i++){
    const x=-10+rng()*(map.width+20),z=-10+rng()*(map.height+20);
    if(Math.hypot(x-map.spawn[0],z-map.spawn[1])<1.8||map.props.some(p=>x>p.x-.6&&x<p.x+p.w+.6&&z>p.y-.6&&z<p.y+p.h+.6))continue;
    placements.push([x,z,.04+rng()*.18,rng()*TAU]);
  }
  const gravel=new THREE.InstancedMesh(kit.geometry.rock,kit.materials.rock,placements.length),object=new THREE.Object3D();
  placements.forEach(([x,z,s,a],i)=>{object.position.set(x,heightAt(x,z)+s*.2,z);object.scale.set(s*1.7,s,s*1.2);object.rotation.set(a,a*.7,a*.2);object.updateMatrix();gravel.setMatrixAt(i,object.matrix);});gravel.name='mars-surface-gravel';gravel.receiveShadow=true;scene.add(gravel);
}

function rocket(model,k,prop){
  const r=Math.min(prop.w,prop.h)*.32,h=r*7.4;
  k.cylinder(model,'body',[0,h*.48,0],[r*2,h*.69,r*2]);
  for(const y of [.16,.36,.79])k.cylinder(model,y===.36?'red':'trim',[0,h*y,0],[r*2.025,h*.026,r*2.025]);
  const points=[[1,.81],[.98,.87],[.8,.97],[.53,1.08],[.2,1.17],[0,1.19]].map(([x,y])=>new THREE.Vector2(r*x,h*y));
  const nose=new THREE.Mesh(new THREE.LatheGeometry(points,24),k.materials.body);nose.castShadow=true;model.add(nose);
  k.cylinder(model,'dark',[0,h*.11,0],[r*1.25,h*.18,r*1.25]);
  k.cylinder(model,'steel',[0,h*.047,0],[r*1.55,h*.07,r*1.55]);
  for(const side of [-1,1]){
    k.cylinder(model,'navy',[side*r*.38,h*.7,r*.94],[r*.4,.06,r*.4],[Math.PI/2,0,0]);
    k.ring(model,'steel',[side*r*.38,h*.7,r*.98],[r*.44,r*.44,r*.44]);
  }
  for(let i=0;i<4;i++){
    const a=i*TAU/4+Math.PI/4,x=Math.sin(a),z=Math.cos(a);
    k.link(model,'steel',[x*r*.8,h*.32,z*r*.8],[x*r*1.65,.13,z*r*1.65],r*.17);
    k.link(model,'hazard',[x*r*.86,h*.22,z*r*.86],[x*r*1.65,.13,z*r*1.65],r*.075);
    k.cylinder(model,'dark',[x*r*1.65,.065,z*r*1.65],[r*.65,.13,r*.65]);
    k.box(model,'red',[x*r*.98,h*.25,z*r*.98],[r*.13,h*.23,r*.7],[0,a,0]);
  }
  k.box(model,'navy',[0,h*.46,r*1.01],[r*.9,h*.12,.045]);
  k.label(model,'MARS 01',[0,h*.48,r*1.05],r*.83,.19);
  k.label(model,'OPPORTUNITY',[0,h*.425,r*1.05],r*.85,.09);
  for(let i=0;i<5;i++)k.box(model,'steel',[r*.64,h*(.2+i*.035),r*.8],[r*.27,.025,.06]);
  model.userData.modelType='mars-rocket';
}

function habitat(model,k,prop){
  const w=prop.w,d=prop.h,h=Math.min(2.2,w*.7),greenhouse=prop.sector==='greenhouseBuilt';
  k.cylinder(model,'trim',[0,.16,0],[w,.32,d]);
  k.sphere(model,greenhouse?'glass':'body',[0,.3,0],[w,h*1.7,d]);
  for(let i=0;i<8;i++){const a=i*TAU/8;k.link(model,'steel',[Math.sin(a)*w*.47,.3,Math.cos(a)*d*.47],[Math.sin(a)*w*.32,h*.78,Math.cos(a)*d*.32],.055);}
  k.cylinder(model,'red',[0,.38,0],[w*1.015,.12,d*1.015]);
  k.box(model,'trim',[0,.62,d*.47],[w*.38,1.25,.5]);k.box(model,'navy',[0,.62,d*.74],[w*.29,1.1,.04]);
  k.box(model,'lamp',[0,1.26,d*.75],[w*.28,.045,.04]);
  for(const side of [-1,1])k.box(model,'glass',[side*w*.32,h*.57,d*.32],[w*.18,.3,.08],[0,side*.45,0]);
  k.label(model,greenhouse?'ESTUFA':prop.name||'HABITAT',[0,1.47,d*.49],Math.min(1.4,w*.85),.16);
  model.userData.modelType=greenhouse?'mars-greenhouse':'mars-habitat';
}

function marsProp(prop,k){
  const model=new THREE.Group();model.position.set(prop.x+prop.w/2,0,prop.y+prop.h/2);
  const w=prop.w,d=prop.h,type=prop.sprite||prop.type;
  if(prop.sector&&!prop.built){
    k.box(model,'dark',[0,.025,0],[w,.05,d]);
    for(const side of [-1,1]){k.box(model,'hazard',[side*w*.48,.06,0],[.05,.07,d]);k.box(model,'hazard',[0,.06,side*d*.48],[w,.07,.05]);}
    k.label(model,'+ '+prop.name,[0,.38,-d*.25],w*.8,.23);model.userData.modelType='mars-construction-pad';
  }else if(type==='nave_perfuradora'){rocket(model,k,prop);}
  else if(type==='habitat_circular'||prop.sector){habitat(model,k,prop);}
  else if(type.startsWith('cratera')||type==='bacia_pesquisa'){
    const crater=new THREE.Mesh(craterGeometry(Math.max(w,d)*.55),new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide}));crater.receiveShadow=true;model.add(crater);model.userData.modelType='mars-crater';
  }else if(['rochas','rock','boulder','basalt','debris','minerio_ferroso','sample','deposito_rachado','amostras','cristais'].includes(type)){
    const mineral=['sample','minerio_ferroso','cristais','deposito_rachado','amostras'].includes(type),rng=random(Math.floor(prop.x*77+prop.y*31));
    for(let i=0;i<(mineral?5:3);i++){
      const s=.25+rng()*.45,x=(rng()-.5)*w*.65,z=(rng()-.5)*d*.65;
      if(type==='cristais'){
        const crystal=new THREE.Mesh(new THREE.ConeGeometry(s*.3,s*1.5,5),k.materials.sampleAmber);crystal.position.set(x,s*.6,z);crystal.rotation.z=(rng()-.5)*.5;model.add(crystal);
      }else k.rock(model,type==='basalt'?'dark':mineral?'soil':'rock',[x,s*.25,z],[s*w*.8,s*.8,s*d*.9],[rng(),rng()*TAU,rng()]);
    }
    model.userData.modelType=mineral?'mars-mineral':'mars-rocks';
  }else if(type==='baliza'||type==='beacon'){
    k.cylinder(model,'dark',[0,.07,0],[w*.7,.14,w*.7]);k.cylinder(model,'hazard',[0,.55,0],[.09,1,.09]);k.sphere(model,'ledGreen',[0,1.1,0],[.15,.15,.15]);model.userData.modelType='mars-beacon';
  }else if(type==='shipAirlock'){
    k.box(model,'ledGreen',[0,1.3,0],[w,2.6,.16]);k.label(model,'MARTE',[0,2,.09],1.8,.3);
  }else if(type==='lander'){
    k.cylinder(model,'cartonGold',[0,.6,0],[w*.5,.7,d*.5]);k.box(model,'body',[0,1.05,0],[w*.55,.2,d*.55]);
    for(const side of [-1,1])for(const end of [-1,1])k.link(model,'steel',[side*w*.2,.7,end*d*.2],[side*w*.43,.05,end*d*.43],.09);
    k.label(model,'EAGLE',[0,.8,d*.27],1,.16);model.userData.modelType='mars-lander';
  }else{
    const types={painel_solar:'solar',antena:'dish',antenna:'dish',bateria:'battery',caixa_carga:'crate',cache:'crate',archive:'crate',tanque_oxigenio:'tank',tanques_duplos:'tank',rover:'rover',extrator:'roboarm',sensor:'spec'};
    const object=createEnvironmentProp({...prop,type:types[type]||type},k);object.position.set(0,0,0);model.add(object);model.userData.modelType=types[type]||type;
  }
  model.userData.prop=prop;return model;
}

export function createMarsScene(map,config,mood,{quality='balanced'}={}){
  const library=createEnvironmentMaterials({quality}),kit=createPropKit(library.materials,{quality});
  // A luz difusa revela as peças sem exigir reflexos de um mapa HDR externo.
  for(const material of Object.values(library.materials))if(material.isMeshStandardMaterial){material.metalness=Math.min(material.metalness,.25);material.roughness=Math.max(material.roughness,.5);}
  library.materials.rock.color.set('#805643');library.materials.soil.color.set('#a25c3b');
  let scene;
  if(map.interior){
    scene=createEnhancedLabScene({...map,floorMap:map.grid.map(row=>row.map(()=>'#344b61')),props:[]},config,mood,{quality,ceiling:true,background:'#101d30'});
  }else{
    scene=new THREE.Scene();landscape(scene,map,kit,mood,quality);
    let disposed=false;scene.userData.disposeEnvironment=(extra=[])=>{if(disposed)return;disposed=true;disposeScene(scene,extra);};
    scene.userData.environment={quality,tiles:{width:map.width,height:map.height}};
  }
  for(const prop of map.props){
    if(prop.action?.startsWith('travel:'))continue;
    const model=marsProp(prop,kit);model.position.y=scene.userData.heightAt?.(model.position.x,model.position.z)||0;
    // O raycast sobe até o objeto original; nunca devolve a cópia usada pelo kit.
    model.traverse(child=>{if(child.userData.prop)child.userData.prop=prop;});
    if(model.userData.modelType==='mars-crater'){
      const geometry=model.children[0].geometry,positions=geometry.attributes.position;
      for(let i=0;i<positions.count;i++)positions.setY(i,(scene.userData.heightAt?.(model.position.x+positions.getX(i),model.position.z+positions.getZ(i))||0)-model.position.y+.012);
      geometry.computeVertexNormals();
    }
    scene.add(model);
  }
  const disposeEnvironment=scene.userData.disposeEnvironment;
  scene.userData.environment.propCount=map.props.length;scene.userData.environment.interior=!!map.interior;
  scene.userData.disposeEnvironment=()=>disposeEnvironment([...Object.values(kit.geometry),...Object.values(library.materials),...Object.values(library.textures)]);
  return scene;
}

export class MarsCameraView extends LabCameraView{
  constructor(options){super({...options,createScene:createMarsScene});this.camera.far=Math.max(700,options.map.width*5,options.map.height*5);}
  open(player,mood,target){super.open(player,mood,target);this.camera.position.y+=this.scene.userData.heightAt?.(player.x,player.y)||0;}
}
