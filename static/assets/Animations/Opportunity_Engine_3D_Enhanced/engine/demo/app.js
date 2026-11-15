import * as THREE from 'three';
import {createSampleMap} from './sample-map.js';
import {createEnhancedLabScene} from '../environment.js';
import {configureQualityRenderer,getRenderProfile} from '../quality.js';

const viewport=document.getElementById('view');
const label=document.getElementById('targetName');
const stats=document.getElementById('stats');
const errorBox=document.getElementById('error');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.domElement.style.touchAction='none';viewport.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(70,1,.05,110);
camera.rotation.order='YXZ';
let yaw=-.05,pitch=-.03,targetYaw=yaw,targetPitch=pitch,zoom=1,targetZoom=1;
let scene=null,quality='balanced',pointer=null,lastX=0,lastY=0,frames=0,lastFpsAt=performance.now(),fps=0;
const map=createSampleMap();
const raycaster=new THREE.Raycaster();
function resize(){
 const w=Math.max(1,viewport.clientWidth),h=Math.max(1,viewport.clientHeight);
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}
function load(qualityName){
 if(scene){scene.userData.disposeEnvironment?.();scene=null;}
 quality=qualityName;
 configureQualityRenderer(quality)(renderer);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,getRenderProfile(quality).maxPixelRatio));
 scene=createEnhancedLabScene(map,{}, {lightOpacity:1,lightColor:'#fff0dc'}, {quality,ceiling:true});
 camera.position.set(11.5,1.6,15.6);
 resize();
}
function pointerDown(e){ if(pointer!==null)return;pointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(pointer);}
function pointerMove(e){
 if(pointer!==e.pointerId)return;
 targetYaw-=(e.clientX-lastX)*.0045;
 targetPitch-=(e.clientY-lastY)*.0045;
 targetPitch=THREE.MathUtils.clamp(targetPitch,-1.37,1.37);
 lastX=e.clientX;lastY=e.clientY;
}
function pointerUp(e){if(pointer!==e.pointerId)return;pointer=null;try{renderer.domElement.releasePointerCapture(e.pointerId)}catch{}}
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',pointerDown);
canvas.addEventListener('pointermove',pointerMove);
canvas.addEventListener('pointerup',pointerUp);
canvas.addEventListener('pointercancel',pointerUp);
canvas.addEventListener('wheel',e=>{e.preventDefault();targetZoom=THREE.MathUtils.clamp(targetZoom+(e.deltaY>0?-.2:.2),1,4);},{passive:false});
function reset(){targetYaw=-.05;targetPitch=-.03;targetZoom=1;}
window.addEventListener('keydown',e=>{if(e.code==='KeyR')reset();});
document.getElementById('reset').addEventListener('click',reset);
document.getElementById('quality').addEventListener('change',e=>load(e.target.value));
window.addEventListener('resize',resize);
function animate(now){
 requestAnimationFrame(animate);
 const factor=.12;
 yaw+= (targetYaw-yaw)*factor; pitch+=(targetPitch-pitch)*factor;zoom+=(targetZoom-zoom)*factor;
 camera.rotation.set(pitch,yaw,0,'YXZ');
 camera.fov=70/zoom;camera.updateProjectionMatrix();
 if(scene){
  renderer.render(scene,camera);
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);
  const hits=raycaster.intersectObjects(scene.children,true);
  let found=null;
  // Only the first visible surface counts: foreground objects occlude targets.
  if(hits.length){
    let node=hits[0].object;
    while(node&&!node.userData?.prop)node=node.parent;
    found=node?.userData?.prop||null;
  }
  label.textContent=found?`Alvo: ${found.name||found.type}`:'Câmera científica — Laboratório';
 }
 frames++;
 if(now-lastFpsAt>650){fps=Math.round(frames*1000/(now-lastFpsAt));frames=0;lastFpsAt=now;}
 stats.textContent=`CAM POV · ${quality.toUpperCase()}\nZOOM ${zoom.toFixed(1)}x · FOV ${camera.fov.toFixed(0)}°\n${fps} FPS`;
 stats.style.whiteSpace='pre-line';
}
try{load('balanced');requestAnimationFrame(animate);}catch(error){console.error(error);errorBox.style.display='block';errorBox.textContent=`Não foi possível iniciar a visualização 3D: ${error.message}. Execute em um servidor local e verifique o acesso ao módulo Three.js.`;}
