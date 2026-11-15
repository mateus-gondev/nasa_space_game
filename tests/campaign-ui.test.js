/* Integração do bootstrap e dos comandos da interface; não valida layout de navegador. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const {Element}=require('./helpers/dom.cjs');
async function mount(initialStorage=new Map()){
  const document=new Element('document');document.createElement=tag=>new Element(tag);document.body=new Element('body');document.append(document.body);
  document.body.innerHTML=fs.readFileSync(path.join(root,'static/opportunity-mars-five-worlds/index.html'),'utf8');
  const errors=[],storage=initialStorage,images=[];
  const context=vm.createContext({document,console:{info(){},warn(){},error:e=>errors.push(e)},URLSearchParams,
    location:{search:''},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
    setTimeout(){},clearTimeout(){},setInterval(){},requestAnimationFrame(){},addEventListener(){},
    ResizeObserver:class{observe(){}},
    Image:class{set src(url){images.push(url);const file=path.join(root,'static',decodeURIComponent(url).slice(1));queueMicrotask(()=>fs.existsSync(file)?this.onload?.():this.onerror?.());}},
    MapRenderer:class{constructor(canvas){this.canvas=canvas;this.staticCanvas={width:1,height:1};this.assets=new Map();}setAsset(key,img){this.assets.set(key,img);}render(){}},
    fetch:async url=>{const file=url.startsWith('/life/')?path.join(root,'LIFE',url.slice(6)):path.join(root,'static',url.slice(1));return {ok:fs.existsSync(file),json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};},
    Option:function(text,value){const o=new Element('option');o.textContent=text;o.value=value;return o;}
  });
  context.window=context;context.globalThis=context;
  for(const file of ['static/opportunity-mars-five-worlds/js/config.js','static/opportunity-mars-five-worlds/js/map-data.js','static/opportunity-mars-five-worlds/js/tilemap-data.js','static/opportunity-mars-five-worlds/js/ship-data.js','static/opportunity-mars-five-worlds/js/controls.js','static/opportunity-mars-five-worlds/js/engine.js','LIFE/engine.js','static/opportunity-mars-five-worlds/js/campaign.js','static/opportunity-mars-five-worlds/js/ui-components.js','static/assets/assistant/nova.js','static/opportunity-mars-five-worlds/js/campaign-ui.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  await vm.runInContext(fs.readFileSync(path.join(root,'static/opportunity-mars-five-worlds/js/app.js'),'utf8'),context);
  assert.equal(errors.length,0,errors.map(String).join('\n'));
  assert(context.marsCampaign,'campaign mounted');
  return {context,document,storage,images};
}
function click(parent,text){const aliases={'Ciência e mochila':'Mochila','Relatórios':'Mensagens','Avançar 1 passo':parent.querySelectorAll('button').some(b=>b.getAttribute('aria-label')==='Ajudar na próxima etapa')?'Ajudar na próxima etapa':'Esperar um pouquinho'};const label=aliases[text]||text,b=parent.querySelectorAll('button').find(b=>b.textContent===label||b.getAttribute('aria-label')===label);assert(b,`button: ${text}`);assert(!b.disabled,`enabled: ${text}`);b.click();}
function readingWords(node){return [node._text||'',...node.children.map(child=>readingWords(child).join(' '))].join(' ').split(/\s+/).filter(Boolean);}

test('NOVA delivers Mars guidance and events without moving the survival clock',async()=>{
  const {context,document}=await mount(),dialog=document.querySelector('#missionDialog'),c=context.marsCampaign.campaign;
  const guide=document.querySelector('#novaGuide'),before=JSON.stringify(c.engine.state),tick=c.engine.state.tick;
  assert(guide.hidden,'floating guide stays behind the management dialog');
  assert(dialog.querySelector('.nova-speech').textContent.includes('Oi, cadete'));
  document.querySelector('.mission-close').click();assert(!guide.hidden);
  assert(guide.querySelector('.nova-speech').textContent.includes('porta verde'));
  guide.querySelector('.nova-dismiss').click();assert(guide.querySelector('.nova-bubble').hidden);
  context.marsCampaign.refresh();assert(guide.querySelector('.nova-bubble').hidden,'refresh respects dismissal');
  guide.querySelector('.nova-portrait').click();assert(!guide.querySelector('.nova-bubble').hidden);
  context.marsCampaign.announce('Pouca água. Vamos reciclar!',{mood:'warning'});
  assert.equal(guide.dataset.mood,'warning');assert(guide.querySelector('.nova-image').src.endsWith('_5.png'));
  context.marsCampaign.refresh();assert(guide.textContent.includes('Vamos reciclar'),'events survive goal refresh');
  context.marsCampaign.announce('Medalha conquistada!',{mood:'success'});assert.equal(guide.dataset.mood,'success');
  guide.querySelector('.nova-action').click();assert(dialog.open);
  assert.equal(c.engine.state.tick,tick);assert.equal(JSON.stringify(c.engine.state),before,'reading and dismissing messages cannot change reserves');
});
test('arrival starts inside the ship with live LIFE reserves and an accessible management terminal',async()=>{
  const {context,document,images}=await mount();const dialog=document.querySelector('#missionDialog');assert(dialog.open);
  const engine=context.opportunityMap.engine;document.querySelector('.mission-close').click();assert(!dialog.open);assert.equal(engine.paused,false);
  assert.equal(engine.map.id,'mars01_ship_interior');assert.equal(context.marsCampaign.campaign.engine.state.systems.baseOnline,true);assert(document.querySelector('#survivalHud'));
  const terminal=engine.map.props.find(p=>p.role==='ship-control');Object.assign(engine.player,{x:terminal.x-.5,y:terminal.y+1});engine.inspectedObject=terminal;engine.onInspect(terminal);
  click(document.querySelector('#campaignActions'),'Minha base');
  const battery=context.marsCampaign.campaign.engine.state.resources.energy;assert.equal(engine.energy,battery.amount/battery.capacity*100);engine.restoreEnergy(100);assert.equal(engine.energy,battery.amount/battery.capacity*100,'legacy charging cannot create energy');
  click(dialog,'Construir');click(dialog,'Construir estufa');for(let i=0;i<3;i++)click(dialog,'Avançar 1 passo');assert.equal(context.marsCampaign.campaign.engine.state.systems.greenhouseBuilt,true);
  click(dialog,'Horta');click(dialog,'Plantar alface');click(dialog,'Avançar 1 passo');assert.equal(context.marsCampaign.campaign.engine.state.crop.cropId,'lettuce');
  assert(images.some(url=>url.includes('growing_plants/salad/salad_1.png')));
  click(dialog,'Ciência e mochila');assert(dialog.textContent.includes('Minha amostra'));
  assert.equal(context.opportunityMap.worlds.find(w=>w.id==='mapa_01_pouso').props.filter(p=>p.sector).length,3);context.marsCampaign.save();
});
test('reset has a reviewable confirmation and replaces only the campaign when confirmed',async()=>{
  const {context,document}=await mount();const dialog=document.querySelector('#missionDialog');context.marsCampaign.open('journal');
  click(dialog,'Nova tentativa');assert(dialog.textContent.includes('Começar do zero?'));
  click(dialog,'Continuar esta tentativa');assert(dialog.textContent.includes('Minha missão'));
  click(dialog,'Relatórios');click(dialog,'Nova tentativa');click(dialog,'Confirmar nova tentativa');assert.equal(context.marsCampaign.campaign.engine.state.tick,1);
});
test('corrupt campaign is preserved until an explicit save; valid saves restore position and ongoing work',async()=>{
  const storage=new Map([['opportunity.campaign.v1','{bad json']]);const first=await mount(storage);assert(first.document.querySelector('#missionDialog').textContent.includes('save não pôde'));
  first.context.marsCampaign.save();assert.equal(storage.get('opportunity.campaign.v1'),'{bad json');
  first.context.marsCampaign.open('journal');click(first.document.querySelector('#missionDialog'),'Salvar esta tentativa');
  const c=first.context.marsCampaign.campaign;c.start('buildComms');first.context.marsCampaign.save();
  const second=await mount(storage);assert.equal(second.context.marsCampaign.campaign.engine.state.activeActivity.type,'buildComms');
  assert.equal(second.context.opportunityMap.engine.player.x,first.context.opportunityMap.engine.player.x);
});
test('campaign can be completed through actual interface actions, field terminals and the return form',async()=>{
  const {context,document}=await mount(),dialog=document.querySelector('#missionDialog'),engine=context.opportunityMap.engine;
  const current=()=>context.marsCampaign.campaign;
  const panel=(section,view)=>context.marsCampaign.open(section,view);
  function steps(count){panel('base');for(let i=0;i<count;i++)click(dialog,'Avançar 1 passo');}
  function task(label,count){if(label==='Ocupar abrigo'){const habitat=engine.map.props.find(p=>p.sprite==='habitat_circular');Object.assign(engine.player,{x:habitat.x-.5,y:habitat.y+habitat.h});}panel(label==='Analisar amostra'?'science':'base',/^(Construir|Montar|Reforçar)/.test(label)?'build':/^(Plantar|Colher)/.test(label)?'plants':'care');click(dialog,label);steps(count);assert.equal(current().engine.state.activeActivity,null,label);}
  function field(sprite,label,world){
    if(dialog.open)document.querySelector('.mission-close').click();
    if(world&&engine.map.id!==world)context.opportunityMap.goToWorld(world);
    const prop=engine.map.props.find(p=>p.sprite===sprite||p.role===sprite);assert(prop,sprite);
    // Movimento e alcance da planta são cobertos pelos testes de navegação; aqui validamos os terminais.
    const positions=[{x:prop.x-.5,y:prop.y},{x:prop.x,y:prop.y+prop.h+.5},{x:prop.x+prop.w+.5,y:prop.y}];
    Object.assign(engine.player,positions.find(p=>!engine.collides(p.x,p.y))||positions[0]);
    engine.inspectedObject=prop;engine.onInspect(prop);click(document.querySelector('#campaignActions'),label);
  }
  field('ship-exit','Sair da nave');
  task('Construir estufa',3);task('Plantar alface',1);task('Montar comunicação',2);
  field('antena','Ligar antena');steps(1);
  task('Reforçar abrigo',4);task('Construir laboratório',3);
  field('minerio_ferroso','Pegar amostra');steps(2);
  panel('science');click(dialog,'Silício');click(dialog,'Ferro');click(dialog,'Registrar comparação');
  steps(3);task('Limpar painéis',2);task('Colher',1);task('Analisar amostra',3);task('Reparar filtro',4);task('Ocupar abrigo',1);
  steps(6);task('Reciclar água',2);
  field('rover','Salvar arquivos','mapa_02_mineracao');steps(3);
  panel('journal');click(dialog,'Enviar arquivos e solicitar retorno');steps(5);
  assert(current().objectives().every(o=>o.done));
  field('nave_perfuradora','Preparar volta','mapa_01_pouso');
  const input=dialog.querySelector('textarea');assert(input,'return reflection shown');input.value='Priorizei o abrigo e reservei energia para a noite; a tripulação voltou com segurança.';
  click(dialog,'Confirmar embarque e concluir missão');assert.equal(current().meta.result,'succeeded');
  assert(dialog.textContent.includes('Missão cumprida'));
});
test('LIFE consumes in the ship and every Mars region, while planning and paused game freeze the clock',async()=>{
  const {context,document}=await mount(),engine=context.opportunityMap.engine,c=context.marsCampaign.campaign;
  const start=c.engine.state.resources.food.amount;
  engine.update(20);assert.equal(c.engine.state.resources.food.amount,start,'planning is paused');
  document.querySelector('.mission-close').click();engine.update(20);assert.equal(c.engine.state.resources.food.amount,start-.5,'consumption inside ship');
  for(const id of ['mapa_01_pouso','mapa_02_mineracao','mapa_03_pesquisa','meridiani']){context.opportunityMap.goToWorld(id);const tick=c.engine.state.tick;engine.update(20);assert.equal(c.engine.state.tick,tick+1,id);}
  context.marsCampaign.open('base');const frozen=c.engine.state.tick;engine.update(40);assert.equal(c.engine.state.tick,frozen);
  assert.equal(context.lifeManagement.getState().tick,c.engine.state.tick);assert.equal(document.querySelector('#survivalHud').querySelectorAll('strong')[2].textContent,Math.round(c.engine.state.resources.food.amount/90*100)+'%');
  const meters=document.querySelector('#survivalHud').querySelectorAll('[role]').filter(n=>n.getAttribute('role')==='meter');
  for(const [i,key]of ['oxygen','waterClean','food','energy'].entries()){const r=c.engine.state.resources[key],value=Math.round(r.amount/r.capacity*100);assert.equal(meters[i].getAttribute('aria-valuenow'),String(value));assert.equal(meters[i]._fill.style.width,value+'%');}
});
test('short visual screens expose one group of actions at a time and navigation consumes no resources',async()=>{
  const {context,document}=await mount(),dialog=document.querySelector('#missionDialog'),content=document.querySelector('#missionContent'),c=context.marsCampaign.campaign;
  assert(readingWords(content).length<150,'mission has a short reading budget');
  const before=JSON.stringify(c.engine.state.resources);context.marsCampaign.open('base','care');
  assert(dialog.querySelectorAll('button').some(b=>b.getAttribute('aria-label')==='Descansar'));
  assert(!dialog.querySelectorAll('button').some(b=>b.getAttribute('aria-label')==='Construir estufa'),'construction belongs to its own group');
  click(dialog,'Construir');assert(dialog.querySelectorAll('button').some(b=>b.getAttribute('aria-label')==='Construir estufa'));
  assert(!dialog.querySelectorAll('button').some(b=>b.getAttribute('aria-label')==='Descansar'));
  click(dialog,'Horta');assert(dialog.querySelectorAll('button').some(b=>b.getAttribute('aria-label')==='Plantar alface'));
  click(dialog,'Energia');assert(readingWords(content).length<120);
  click(dialog,'Ver o que muda na próxima etapa');assert(content.textContent.includes('→'));assert.equal(JSON.stringify(c.engine.state.resources),before);
  assert(document.querySelector('#novaHint').textContent.length<140,'NOVA keeps one short goal in a speech bubble');
});
