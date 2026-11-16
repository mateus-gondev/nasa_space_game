import * as THREE from 'three';
import { createEnvironmentMaterials } from '../materials.mjs';
import { createPropKit, createEnvironmentProp } from '../props.mjs';
import { configureQualityRenderer, getRenderProfile } from '../quality.mjs';
import { disposeScene } from '../resources.mjs';

const $ = id => document.getElementById(id), viewport = $('modelViewport');
const names = {
  screen:'Painel de voo',console:'Console de comando',rover:'Rover Opportunity',crate:'Caixa de suprimentos',
  spec:'Espectrômetro',telescope:'Pancam',dish:'Antena parabólica',bench:'Bancada',solar:'Painel solar',rtg:'Gerador RTG',
  rack:'Rack de dados',tank:'Cilindro',cart:'Carrinho de ferramentas',shelf:'Prateleiras',micro:'Microscópio',globe:'Globo de Marte',
  desk:'Mesa de trabalho',chair:'Cadeira',plant:'Planta',locker:'Armários de equipamento',holotable:'Mesa holográfica',
  whiteboard:'Quadro de resultados',rockcase:'Vitrine de rochas',pallet:'Palete de peças',battery:'Banco de baterias',
  transformer:'Transformador',roboarm:'Braço robótico',wheelrack:'Rodas sobressalentes',coffee:'Máquina de café',cabinet:'Arquivo de gavetas',launchEntrance:'Entrada MARS 01',
};
const representatives = new Map();
for (const prop of window.MAP_DATA.props) {
  if (prop.trainingId === 'camera') continue;
  const previous = representatives.get(prop.type);
  if (!previous || prop.w * prop.h > previous.w * previous.h) representatives.set(prop.type, prop);
}
representatives.set('photoTarget', window.MAP_DATA.props.find(p => p.trainingId === 'camera'));
names.photoTarget = 'Alvo fotográfico';
let scene, kit, library, object, selected = new URLSearchParams(location.search).get('type') || 'rover';
let yaw = .68, elevation = .42, zoom = 1, baseDistance = 5, radius = 1;
const target = new THREE.Vector3();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', 'Modelo 3D. Arraste para girar; use as setas para orientar a vista.');
viewport.append(renderer.domElement);
const camera = new THREE.PerspectiveCamera(40, 1, .01, 200);
function draw() {
  if (!scene) return;
  const w = viewport.clientWidth, h = viewport.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  const fov = Math.min(THREE.MathUtils.degToRad(camera.fov), 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect));
  baseDistance = radius / Math.sin(fov / 2) * 1.14;
  const distance = baseDistance / zoom;
  camera.position.copy(target).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(elevation), Math.sin(elevation), Math.cos(yaw) * Math.cos(elevation)).multiplyScalar(distance));
  camera.lookAt(target); camera.updateProjectionMatrix(); renderer.render(scene, camera);
  $('modelStats').textContent = `${renderer.info.render.calls} chamadas de desenho · ${renderer.info.render.triangles.toLocaleString('pt-BR')} triângulos`;
}
function release() {
  if (!scene) return;
  disposeScene(scene, [...Object.values(kit.geometry), ...Object.values(library.materials), ...Object.values(library.textures)]);
  scene.clear(); scene = null;
}
function choose(type, reset = true) {
  if (!representatives.has(type)) type = 'rover';
  release(); selected = type;
  const quality = $('quality').value;
  configureQualityRenderer(quality)(renderer);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, getRenderProfile(quality).maxPixelRatio));
  scene = new THREE.Scene(); scene.background = new THREE.Color('#172533');
  scene.add(new THREE.HemisphereLight('#edf8ff', '#707784', 2.4));
  const key = new THREE.DirectionalLight('#fff2de', 3.7); key.position.set(4, 8, 5); scene.add(key);
  const rim = new THREE.DirectionalLight('#9bd4ff', 2); rim.position.set(-4, 4, -4); scene.add(rim);
  library = createEnvironmentMaterials({ quality }); kit = createPropKit(library.materials, { quality });
  const source = representatives.get(type), prop = { ...source, x: -source.w / 2, y: -source.h / 2 };
  object = createEnvironmentProp(prop, kit); scene.add(object);
  const bounds = new THREE.Box3().setFromObject(object), sphere = bounds.getBoundingSphere(new THREE.Sphere());
  target.copy(sphere.center); radius = sphere.radius;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(8, source.w * 2), Math.max(8, source.h * 2)), new THREE.MeshStandardMaterial({ color:'#283b4a',roughness:1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.018; scene.add(ground);
  const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-source.w / 2, .005, -source.h / 2),new THREE.Vector3(source.w / 2, .005, -source.h / 2),
    new THREE.Vector3(source.w / 2, .005, source.h / 2),new THREE.Vector3(-source.w / 2, .005, source.h / 2),
  ]),new THREE.LineBasicMaterial({color:'#54778b'}));scene.add(outline);
  if (reset) { yaw = type === 'rover' ? 2.5 : .68; elevation = .42; zoom = 1; }
  $('modelName').textContent = names[type] || source.name || type;
  $('modelDimensions').textContent = `${source.w} × ${source.h} tiles no mapa · ${source.name || 'Decoração da instalação'}`;
  $('referenceNote').textContent = type === 'photoTarget' ? 'O alvo do tutorial conserva a bandeja de terreno usada para a fotografia. Os demais objetos reproduzem o tipo do desenho 2D.' : 'Mesma forma e paleta do mapa, com volume e detalhes visíveis de todos os lados.';
  for (const button of $('modelList').children) button.setAttribute('aria-pressed', String(button.dataset.type === type));
  const sprite = $('sprite'); sprite.width = Math.ceil(source.w * 40 + 8); sprite.height = Math.ceil(source.h * 40 + 8);
  const reference = Object.create(window.MapRenderer.prototype);
  Object.assign(reference, { ctx: sprite.getContext('2d'), tile: 40, config: window.MAP_ENGINE_CONFIG, assets: new Map() });
  reference.ctx.translate(4, 4); reference.drawProp({ ...source, x: 0, y: 0 }, 0, window.MAP_ENGINE_CONFIG.atmosphere.presets.clean);
  draw();
}
for (const [type] of [...representatives].sort(([a], [b]) => (names[a] || a).localeCompare(names[b] || b, 'pt-BR'))) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = names[type] || type;
  button.dataset.type = type; button.addEventListener('click', () => choose(type)); $('modelList').append(button);
}
let drag;
renderer.domElement.addEventListener('pointerdown', event => { drag = { id:event.pointerId,x:event.clientX,y:event.clientY };renderer.domElement.setPointerCapture(event.pointerId); });
renderer.domElement.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  yaw -= (event.clientX - drag.x) * .008; elevation = THREE.MathUtils.clamp(elevation + (event.clientY - drag.y) * .006, .05, 1.55);
  drag.x = event.clientX; drag.y = event.clientY; draw();
});
for (const type of ['pointerup','pointercancel','lostpointercapture']) renderer.domElement.addEventListener(type, () => { drag = null; });
renderer.domElement.addEventListener('wheel', event => { event.preventDefault();zoom = THREE.MathUtils.clamp(zoom * Math.exp(-event.deltaY * .001),.5,3);draw(); },{passive:false});
renderer.domElement.addEventListener('keydown', event => {
  if (!event.key.startsWith('Arrow')) return;
  event.preventDefault();if(event.key==='ArrowLeft')yaw-=.1;if(event.key==='ArrowRight')yaw+=.1;
  if(event.key==='ArrowUp')elevation=Math.min(1.55,elevation+.1);if(event.key==='ArrowDown')elevation=Math.max(.05,elevation-.1);draw();
});
$('quality').addEventListener('change', () => choose(selected, false));
$('viewTop').addEventListener('click', () => { yaw = 0; elevation = 1.55; zoom = 1; draw(); });
$('resetView').addEventListener('click', () => { yaw = selected === 'rover' ? 2.5 : .68; elevation = .42; zoom = 1; draw(); });
const observer = new ResizeObserver(draw);observer.observe(viewport);
window.addEventListener('pagehide', () => {observer.disconnect();release();renderer.dispose();},{once:true});
try { choose(selected); } catch (error) { console.error(error);const message=document.createElement('p');message.className='error';message.textContent='Não foi possível iniciar a galeria 3D. Verifique o suporte a WebGL 2.';viewport.append(message); }
