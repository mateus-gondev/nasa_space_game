const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {Element}=require('./helpers/dom.cjs');
const root=path.join(__dirname,'..');
function setup(reduced=false){
  const document=new Element('document');document.body=new Element('body');document.append(document.body);
  document.createElement=tag=>{const node=new Element(tag);node.ownerDocument=document;return node;};
  document.createTextNode=text=>{const node=new Element('text');node.textContent=text;return node;};
  const timers=new Map(),events={},errors=[],storage=new Map();let next=0;
  const context=vm.createContext({document,console:{info(){},warn(){},error:e=>errors.push(e)},URLSearchParams,location:{search:'',origin:'http://game.local'},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},matchMedia:()=>({matches:reduced}),
    setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id),
    addEventListener:(name,fn)=>(events[name]??=[]).push(fn),MutationObserver:class{observe(){}},LifeUI:{mount(){}},
    GameI18n:{t:(text,values={})=>text.replace(/\{(\w+)\}/g,(_,key)=>values[key]??key)},
    GamePreferences:{playEffect(){},get:()=>({gameVolume:0,language:'pt-BR'})}
  });
  context.window=context;context.globalThis=context;
  const run=file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  run('static/assets/assistant/nova.js');
  return {context,document,timers,events,errors,storage,run,nextFrame(){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}};
}
test('NOVA uses all twelve original PNGs and stops after a short sequence',()=>{
  const {context,timers,nextFrame}=setup();
  const poses=Object.values(context.NovaAssistant.POSES).flat();assert.equal(new Set(poses).size,12);
  for(const pose of poses){const file=fs.readFileSync(path.join(root,'static',context.NovaAssistant.imagePath(pose)));assert.equal(file.readUInt32BE(16),184);assert.equal(file.readUInt32BE(20),151);}
  const nova=context.NovaAssistant.create();nova.say('Vamos explorar!');assert(nova.image.src.endsWith('_1.png'));
  nova.say('Vamos explorar!');assert.equal(timers.size,1,'repeated hints do not restart timers');
  nextFrame();assert(nova.image.src.endsWith('_2.png'));nextFrame();assert(nova.image.src.endsWith('_3.png'));assert.equal(timers.size,0);
  nova.say('Nova descoberta!',{mood:'science'});assert(nova.image.src.endsWith('_8.png'));
  nova.say('Medalha conquistada!',{mood:'success'});assert(nova.image.src.endsWith('_4.png'));
  nova.say('Não deu para abrir.');assert.equal(nova.element.dataset.mood,'warning');assert(nova.image.src.endsWith('_5.png'));nova.destroy();assert.equal(timers.size,0);
});
test('speech can be collapsed and reread; reduced motion has no animation and text stays literal',()=>{
  const {context,timers}=setup(true),nova=context.NovaAssistant.create({dismissible:true});
  nova.say('<img src=x> Vamos lá!',{key:'walk'});assert.equal(nova.text.children.length,0);assert.equal(timers.size,0);
  nova.collapse();assert(nova.bubble.hidden);assert(!nova.element.hidden);
  nova.say('<img src=x> Vamos lá!',{key:'walk'});assert(nova.bubble.hidden,'same instruction respects dismissal');
  nova.element.querySelector('.nova-portrait').click();assert(!nova.bubble.hidden);
  nova.collapse();nova.say('Agora vamos fotografar!',{key:'camera'});assert(!nova.bubble.hidden,'new goal is visible');
  nova.hide();assert(nova.element.hidden);assert.equal(timers.size,0);
});
async function bootTraining(){
  const env=setup(true),{context,document,errors,run}=env;
  document.body.innerHTML=fs.readFileSync(path.join(root,'static/lab_training/index.html'),'utf8');
  document.addEventListener=()=>{};
  context.MAP_DATA={width:1,height:1,grid:[[2]],floorMap:[[0]],props:[],roomLabels:[],floorDecals:[],destinations:[],launchRoom:{x:0,y:0,w:2,h:2,exit:{x:0,y:0}}};
  context.MapEngine=class{
    constructor({onInteract}){this.onInteract=onInteract;this.controls={keys:new Set(),inputMode:'keyboard'};this.player={x:0,y:0};this.renderer={getGuideRoute:()=>({target:null,route:[]}),drawStaticMap(){}};this.paused=false;}
    findNearbyObject(){} update(){} closeInspection(){} setAtmosphere(){} getRoomName(){return 'Atrium';}
    interact(source='keyboard'){if(this.nearObject)return this.onInteract(this.nearObject,null,source);}
    stop(){this.stopped=true;}
    getState(){return {room:'Atrium',mood:'Operacional',position:'0, 0',target:'Nenhum objeto',animation:'idle',paused:false};}
    start(){return Promise.resolve();}
  };
  run('static/lab_training/js/config.js');run('static/lab_training/js/tutorial.js');run('static/lab_training/js/app.js');await Promise.resolve();
  assert.equal(errors.length,0,errors.map(String).join('\n'));
  return env;
}
function startTraining(document){
  document.querySelector('#wearSuit').click();document.querySelector('#skipEquipmentAnimation').click();
  document.querySelector('#wearHelmet').click();document.querySelector('#skipEquipmentAnimation').click();
  document.querySelector('#cadetName').value='Lua';
  document.querySelector('#welcomeForm').listeners.submit[0]({preventDefault(){}});
}
test('training boots with assistant briefings and preparation; camera instructions use the same bubble',async()=>{
  const {document}=await bootTraining();
  assert.equal(document.querySelector('#suitFeedback').textContent,'Primeiro vista o traje e as botas. Depois coloque o capacete.');
  assert(document.querySelector('#suitSpeech').querySelector('.nova-image'));
  document.querySelector('#wearSuit').click();document.querySelector('#skipEquipmentAnimation').click();
  assert.equal(document.querySelector('#suitFeedback').textContent,'Agora coloque o capacete.');
  document.querySelector('#wearHelmet').click();document.querySelector('#skipEquipmentAnimation').click();
  assert.equal(document.querySelector('#suitFeedback').textContent,'Equipamento pronto.');
  document.querySelector('#cadetName').value='Lua';
  document.querySelector('#welcomeForm').listeners.submit[0]({preventDefault(){}});
  assert(document.querySelector('#coachDescription').textContent.includes('W, A, S, D'));
  assert(document.querySelector('#objectiveSpeech').textContent.includes('Primeiros passos'));
  assert.equal(document.querySelector('#cameraMessage').parentElement.className,'nova-bubble');
  assert.equal(document.querySelector('#coachDescription').getAttribute('aria-live'),'off','modal description does not announce twice');
});
test('merged training keeps NOVA, gamepad icons and mouse-only science while communication works with E and Cross',async()=>{
  for(const mode of ['keyboard','gamepad']){
    const {context,document}=await bootTraining();startTraining(document);
    const engine=context.labTraining.engine,tutorial=engine.renderer.tutorial;
    engine.controls.inputMode='gamepad';engine.onInputModeChange();
    assert(document.querySelector('#coachDescription').textContent.includes('analógico esquerdo'));
    assert.equal(document.querySelector('#coachKey').querySelector('.gamepad-shortcut-icon').textContent,'L');
    assert.equal(document.querySelector('#coachDescription').parentElement.className,'nova-bubble');
    document.querySelector('#continueTutorial').click();
    tutorial.phase='microscope';engine.nearObject={trainingId:'microscope',type:'micro'};
    context.labTraining.selectTool(2);document.querySelector('#continueTutorial').click();
    engine.interact('keyboard');assert.equal(tutorial.phase,'microscope','E must not bypass the new mouse science control');
    engine.interact('mouse');assert.equal(tutorial.phase,'temperature');
    assert.equal(context.labTraining.getTrainingState().inventory.length,1);
    document.querySelector('#continueTutorial').click();
    tutorial.phase='communication';for(const key of [1,2,3,4])tutorial.completedTools.add(key);
    engine.controls.inputMode=mode;engine.onInputModeChange();document.querySelector('#continueTutorial').click();
    context.labTraining.selectTool(2);engine.nearObject={trainingId:'communication',type:'console'};
    engine.paused=true;
    if(mode==='gamepad')engine.onGamepadInteract();else engine.interact();
    assert.equal(tutorial.phase,'communication','pause prevents sending');engine.paused=false;
    document.querySelector('#lifePanel').hidden=false;
    if(mode==='gamepad')engine.onGamepadInteract();else engine.interact();
    assert.equal(tutorial.phase,'communication','planning prevents sending');document.querySelector('#lifePanel').hidden=true;
    if(mode==='gamepad')engine.onGamepadInteract();else engine.interact();
    assert.equal(tutorial.phase,'ship',mode+': report reaches the next phase');assert.match(tutorial.report,/MER-B/);
    assert(document.querySelector('#coachDescription').textContent.includes(mode==='gamepad'?'analógico':'Rover Bay'));
    assert.equal(context.labTraining.getTrainingState().inventory.length,1,'report does not duplicate a science result');
  }
});
test('skipping preserves free exploration and records, and a real launch still transfers to Mars',async()=>{
  const {context,document,events,storage}=await bootTraining();startTraining(document);
  document.querySelector('#skipTutorial').click();
  const engine=context.labTraining.engine,tutorial=engine.renderer.tutorial;
  assert.equal(tutorial.phase,'skipped');assert(document.querySelector('#tutorialObjective').hidden);
  engine.nearObject={trainingId:'temperature',type:'spec'};context.labTraining.selectTool(3);engine.interact('mouse');
  assert.equal(context.labTraining.getTrainingState().inventory.length,1);assert.equal(tutorial.phase,'skipped');
  const frame=document.querySelector('#launchRoomFrame');frame.contentWindow={};
  engine.update(0);assert(!document.querySelector('#launchRoomOverlay').hidden);
  events.message[0]({source:frame.contentWindow,origin:context.location.origin,data:'rocket-animation-complete'});
  assert.equal(context.location.href,'/mars-test/?arrival=1');assert(engine.stopped);
  const handoff=JSON.parse(storage.get('opportunity.training.handoff.v1'));assert.equal(handoff.inventory.length,1);
  assert.equal(tutorial.phase,'skipped','skipping does not fabricate completed training');
});
test('LIFE places its assistant at the existing feedback position, including a loading failure',async()=>{
  const {context,document,run}=setup(true);
  document.body.innerHTML=fs.readFileSync(path.join(root,'static/lab_training/index.html'),'utf8');
  context.fetch=async()=>{throw Error('offline');};context.cancelAnimationFrame=()=>{};
  run('LIFE/browser-ui.js');
  await context.LifeUI.mount({game:{elapsed:0},isSuspended:()=>false});
  const message=document.querySelector('#lifeMessage');
  assert.equal(message.parentElement.className,'nova-bubble');
  assert.equal(message.parentElement.parentElement.parentElement.className,'life-card');
  assert.equal(message.parentElement.parentElement.dataset.mood,'warning');
  assert(message.textContent.includes('continuar o treinamento'));
});
