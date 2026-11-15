import * as THREE from 'three';
import { addMesh } from '../engine/scene.js';
import { createDragRotation } from '../engine/controls.js';
import { createExhaustParticles } from '../engine/particles.js';
import { disposeScene } from '../engine/resources.js';

export function createRocketScene({ width, height, element }) {
    const scene=new THREE.Scene();
    scene.fog=new THREE.FogExp2(0x09151f,.018);
    const camera=new THREE.PerspectiveCamera(39,width/height,.1,220);
    const lowWidth=()=>width<760;
    function cameraPosition(){ if(lowWidth()){camera.position.set(9,5.7,19);camera.lookAt(0,2.05,0);} else {camera.position.set(9,5.8,15.7);camera.lookAt(0,2,0);} }
    cameraPosition();
    scene.add(new THREE.HemisphereLight(0xb6e7ff,0x16222d,2.2));
    const key=new THREE.DirectionalLight(0xffe4c1,3.6);key.position.set(-5,12,9);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-13;key.shadow.camera.right=13;key.shadow.camera.top=14;key.shadow.camera.bottom=-12;key.shadow.bias=-.0008;scene.add(key);
    const rim=new THREE.PointLight(0x46d2eb,70,26,2);rim.position.set(5,6,-6);scene.add(rim);
    const warm=new THREE.PointLight(0xffa252,65,22,2);warm.position.set(-6,2,5);scene.add(warm);

    const mat=(color,metalness=.15,roughness=.65,extra={})=>new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});
    const shell=mat(0xbed4db,.27,.37);
    const nose=mat(0xc7dde3,.23,.45);
    const shadow=mat(0x2b4558,.5,.4);
    const deep=mat(0x102b3c,.6,.29);
    const steel=mat(0x758e9f,.72,.28);
    const blue=mat(0x3caec5,.27,.23,{emissive:0x08647a,emissiveIntensity:.65});
    const orange=mat(0xffab54,.27,.43,{emissive:0x692f10,emissiveIntensity:.12});
    const finsMat=mat(0x6e9fb5,.38,.52);
    const white=mat(0xf2eee0,.1,.65);
    const groundMat=mat(0x1d2d37,.47,.62);
    const mesh=(parent,geometry,material,pos=[0,0,0],rot=[0,0,0])=>addMesh(parent,geometry,material,{position:pos,rotation:rot,castShadow:true,receiveShadow:true});
    const cylinder=(parent,rt,rb,h,m,y,r=40)=>mesh(parent,new THREE.CylinderGeometry(rt,rb,h,r),m,[0,y,0]);

    // Foguete montado somente com geometrias nativas: zero GLB, imagens ou shaders externos.
    const rig=new THREE.Group();scene.add(rig);
    const rocket=new THREE.Group();rig.add(rocket);
    const mainBody=cylinder(rocket,1.03,1.03,4.65,shell,2.04,40);
    const lower=cylinder(rocket,1.03,1.15,.48,shadow,-.51);
    cylinder(rocket,.97,1.15,.18,steel,-.78);
    cylinder(rocket,.82,.92,.25,deep,-.92);
    cylinder(rocket,1.07,1.07,.09,steel,.02);
    cylinder(rocket,1.052,1.052,.13,deep,4.38);
    cylinder(rocket,1.064,1.064,.04,orange,4.48);
    cylinder(rocket,1.06,1.06,.24,steel,4.61);
    cylinder(rocket,0,1.06,2.12,nose,5.79,48);
    cylinder(rocket,.12,.12,.43,steel,6.98,12);
    mesh(rocket,new THREE.SphereGeometry(.16,12,8),orange,[0,7.25,0]);
    // Tubos laterais, rebites e aletas aerodinâmicas.
    for(const side of [-1,1]){
      const outline=new THREE.Shape();
      outline.moveTo(side*.84,.62);outline.lineTo(side*1.11,.55);outline.lineTo(side*2.14,-1.05);
      outline.lineTo(side*.86,-1.05);outline.lineTo(side*.83,-.32);outline.closePath();
      const finGeo=new THREE.ExtrudeGeometry(outline,{depth:.17,bevelEnabled:true,bevelThickness:.05,bevelSize:.04,bevelSegments:1,steps:1,curveSegments:1});
      mesh(rocket,finGeo,finsMat,[0,0,0]);
      mesh(rocket,new THREE.BoxGeometry(.18,3.18,.13),steel,[side*.91,1.58,.13]);
      for(let i=0;i<4;i++) mesh(rocket,new THREE.SphereGeometry(.037,8,6),deep,[side*.54,.48+i*.36, .90]);
    }
    // Aleta traseira dá volume quando o usuário gira o modelo.
    const backFin=new THREE.Shape();backFin.moveTo(.78,.45);backFin.lineTo(1.8,-1);backFin.lineTo(.76,-1);backFin.closePath();
    for(const a of [Math.PI/2,-Math.PI/2]){
      const f=mesh(rocket,new THREE.ExtrudeGeometry(backFin,{depth:.15,bevelEnabled:true,bevelThickness:.04,bevelSize:.025,bevelSegments:1}),finsMat);
      f.rotation.y=a;
    }
    // Janela frontal circular, aro metálico e brilho.
    const portGeo=new THREE.CylinderGeometry(.57,.57,.10,48);
    const port=mesh(rocket,portGeo,blue,[0,3.24,1.035],[Math.PI/2,0,0]);
    mesh(rocket,new THREE.TorusGeometry(.64,.085,10,60),steel,[0,3.24,1.09]);
    mesh(rocket,new THREE.TorusGeometry(.50,.017,8,60),white,[0,3.24,1.111]);
    mesh(rocket,new THREE.SphereGeometry(.2,20,12,0,Math.PI*.73,0,Math.PI*.55),new THREE.MeshBasicMaterial({color:0xd6ffff,transparent:true,opacity:.37}),[-.18,3.40,1.12]);
    // Painel inferior inspirado no bloco laranja da arte de referência.
    mesh(rocket,new THREE.BoxGeometry(.78,.88,.15),orange,[0,0.95,1.015]);
    mesh(rocket,new THREE.BoxGeometry(.85,.045,.20),deep,[0,1.47,1.045]);
    mesh(rocket,new THREE.BoxGeometry(.85,.045,.20),deep,[0,.44,1.045]);
    // Identificação MARS 01 em CanvasTexture, sem fontes externas.
    const tagCanvas=document.createElement('canvas');tagCanvas.width=512;tagCanvas.height=256;
    const ctx=tagCanvas.getContext('2d');ctx.clearRect(0,0,512,256);
    ctx.fillStyle='#123348';ctx.textAlign='center';ctx.font='900 72px monospace';ctx.fillText('MARS 01',256,118);
    ctx.fillStyle='#5b8091';ctx.font='bold 20px monospace';ctx.fillText('EXPLORATION PROGRAM',256,161);
    ctx.fillStyle='#edab55';ctx.fillRect(176,179,160,9);
    const tag=new THREE.CanvasTexture(tagCanvas);tag.colorSpace=THREE.SRGBColorSpace;
    const labelMesh=mesh(rocket,new THREE.PlaneGeometry(2.12,1.06),new THREE.MeshBasicMaterial({map:tag,transparent:true,depthWrite:false}),[0,2.04,1.055]);labelMesh.castShadow=false;
    // Perfil do motor e anéis de contenção.
    cylinder(rocket,.86,.78,.28,steel,-.96);
    cylinder(rocket,.68,.48,.60,deep,-1.31);
    cylinder(rocket,.5,.52,.12,orange,-1.67);
    const flameMat=new THREE.MeshBasicMaterial({color:0xffbc67,transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending});
    const innerFlameMat=new THREE.MeshBasicMaterial({color:0xffecb3,transparent:true,opacity:.96,depthWrite:false,blending:THREE.AdditiveBlending});
    const flame=mesh(rocket,new THREE.ConeGeometry(.47,2.25,14),flameMat,[0,-2.66,0],[Math.PI,0,0]);flame.castShadow=false;
    const innerFlame=mesh(rocket,new THREE.ConeGeometry(.25,1.55,14),innerFlameMat,[0,-2.37,0],[Math.PI,0,0]);innerFlame.castShadow=false;
    flame.visible=innerFlame.visible=false;
    // Plataforma de lançamento e grade técnica.
    const pad=new THREE.Group();scene.add(pad);
    mesh(pad,new THREE.CylinderGeometry(3.85,4.05,.45,64),groundMat,[0,-1.74,0]);
    mesh(pad,new THREE.CylinderGeometry(3.45,3.45,.12,64),deep,[0,-1.46,0]);
    const ring=mesh(pad,new THREE.TorusGeometry(3.46,.048,6,90),orange,[0,-1.37,0],[Math.PI/2,0,0]);ring.castShadow=false;
    for(let i=0;i<12;i++){
      const a=i*Math.PI*2/12;
      const tick=mesh(pad,new THREE.BoxGeometry(.4,.03,.09),i%2?steel:orange,[Math.cos(a)*3.13,-1.39,Math.sin(a)*3.13]);tick.rotation.y=-a;
    }
    for(let x=-3;x<=3;x++){
      const line=mesh(pad,new THREE.BoxGeometry(.01,.014,5.95),steel,[x,-1.389,0]);line.material=mat(0x66808c,.1,.8,{transparent:true,opacity:.32});
      const line2=mesh(pad,new THREE.BoxGeometry(5.95,.014,.01),steel,[0,-1.389,x]);line2.material=mat(0x66808c,.1,.8,{transparent:true,opacity:.32});
    }
    const floor=mesh(scene,new THREE.PlaneGeometry(200,200),mat(0x101c25,.08,.95),[0,-1.99,0],[-Math.PI/2,0,0]);floor.castShadow=false;
    const grid=new THREE.GridHelper(100,44,0x37505e,0x263541);grid.position.y=-1.977;grid.material.transparent=true;grid.material.opacity=.22;scene.add(grid);
    for(let i=0;i<24;i++){
      const a=i*2.399;const r=6+(i%5)*1.58;
      const rock=mesh(scene,new THREE.DodecahedronGeometry(.22+(i%4)*.11,0),mat(i%3?0x354752:0x425561,.06,.9),[Math.cos(a)*r,-1.78+((i%4)*.04),Math.sin(a)*r]);
      rock.scale.set(1.2,.4,.85);rock.rotation.y=a;
    }
    // Estrelas: um único Points, pouca geometria.
    const starPositions=[];
    for(let i=0;i<520;i++){
      const theta=Math.random()*Math.PI*2;
      const y=Math.random()*70-5;
      const d=60+Math.random()*60;
      starPositions.push(Math.cos(theta)*d,y,Math.sin(theta)*d);
    }
    const starsG=new THREE.BufferGeometry();starsG.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
    const stars=new THREE.Points(starsG,new THREE.PointsMaterial({color:0xa2cbdc,size:.32,transparent:true,opacity:.7,sizeAttenuation:true}));scene.add(stars);

    const dust = createExhaustParticles();
    scene.add(dust.group);
    const controls = createDragRotation(element);
    let previousElapsed = 0;

    function reset() {
      controls.reset();
      previousElapsed = 0;
      rig.rotation.set(0, controls.angle, 0);
      dust.reset();
    }

    function update(time, { elapsed = time, playing = false, completed = false } = {}) {
      const delta = Math.max(0, elapsed - previousElapsed);
      previousElapsed = elapsed;
      rig.rotation.y += (controls.angle + Math.sin(elapsed * 0.2) * 0.07 - rig.rotation.y) * (1 - Math.exp(-4 * delta));
      const launched = playing || completed || time > 0;
      const u = Math.min(time / 5.8, 1);
      const eased = u * u * (3 - 2 * u);
      rig.position.y = launched ? eased * 21 + Math.sin(elapsed * 36) * 0.018 : Math.sin(elapsed * 1.2) * 0.045;
      rig.rotation.z = launched ? Math.sin(elapsed * 1.4) * 0.014 * u : 0;
      flame.visible = innerFlame.visible = launched;
      flame.scale.y = 1 + Math.sin(elapsed * 27) * 0.16;
      innerFlame.scale.y = 0.9 + Math.cos(elapsed * 37) * 0.13;
      if (launched) dust.update(time, rig.position.y - 1.7);
      else dust.reset();
      return { altitude: Math.floor(eased * 18300), status: completed ? 'FLIGHT COMPLETE' : launched ? 'ASCENDING' : 'READY' };
    }

    reset();
    return {
      scene, camera, update, reset,
      resize(w, h) { width = w; height = h; cameraPosition(); },
      dispose() { controls.dispose(); disposeScene(scene); },
    };
}
