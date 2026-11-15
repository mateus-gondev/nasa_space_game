/* Interface sob demanda, terminais do mapa e persistência da jornada. */
window.MarsCampaignUI={async mount({engine,worlds,notify,switchWorld}){
  const {Campaign,createScenario,CROPS,LABELS,KEY}=window.OpportunityCampaign;
  const UI=window.MarsUI;
  const TASKS={activateBase:['Ligar base','energy'],buildGreenhouse:['Estufa','lettuce'],buildLab:['Laboratório','science'],buildComms:['Antena','antenna'],buildDormitory:['Dormitório','shelter'],buildShelter:['Abrigo','shelter'],transferToShelter:['Entrar no abrigo','shelter'],repairFilter:['Consertar filtro','repair'],cleanPanels:['Limpar painéis','solar'],collectSample:['Pegar amostra','sample'],analyzeSample:['Analisar','science'],recoverRover:['Salvar arquivos','rover'],recycleWater:['Reciclar água','waterClean'],rest:['Descansar','avatar'],plant:['Plantar','seeds'],harvest:['Colher','food'],connectComms:['Ligar antena','antenna']};
  const $=s=>document.querySelector(s),n=v=>Number(v).toLocaleString('pt-BR',{maximumFractionDigits:2});
  const response=await fetch('/life/scenario-mars.json');if(!response.ok)throw Error('Cenário LIFE indisponível.');
  const scenario=createScenario(await response.json());
  const names={energy:'Energia',oxygen:'Oxigênio',waterClean:'Água limpa',waterUsed:'Água usada',food:'Alimento',materials:'Materiais',seeds:'Sementes',repairParts:'Peças'};
  const consumers={lifeSupport:'Suporte vital',airFilter:'Filtro de ar',oxygenProduction:'Produção de O₂',thermal:'Controle térmico',cultivation:'Cultivo',research:'Pesquisa',waterRecycler:'Reciclagem'};
  const icons={energy:'energia',oxygen:'oxigenio',waterClean:'agua',food:'alimentacao'};
  const storageRead=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
  const profile=storageRead('opportunity.labTraining.profile')||{};
  for(const world of worlds)for(const prop of world.props){
    if(!prop.id)continue;
    if(prop.resource==='energia')scenario.supplies[prop.id]={energy:18};
    else if(prop.resource==='oxigenio')scenario.supplies[prop.id]={oxygen:20};
    else if(prop.id!=='ship-emergency'&&(prop.resource==='suprimentos'||prop.action==='collect'))scenario.supplies[prop.id]={materials:6,food:6,repairParts:1,seeds:1};
    else if(prop.resource?.startsWith('gelo'))scenario.supplies[prop.id]={waterUsed:10};
    else if(['ferro','cristal','mineral_raro'].includes(prop.resource))scenario.supplies[prop.id]={materials:4};
  }
  let campaign,loadWarning='',hasSaved=false;
  try{
    const raw=localStorage.getItem(KEY);hasSaved=!!raw;
    campaign=new Campaign(scenario,raw?JSON.parse(raw):null,profile);
  }catch(error){
    loadWarning='O save não pôde ser restaurado. Uma nova tentativa foi aberta; o save anterior será preservado até você escolher salvar ou reiniciar.';
    campaign=new Campaign(scenario,null,profile);
  }
  const handoff=storageRead('opportunity.training.handoff.v1');
  if(!hasSaved&&handoff?.version===1&&Array.isArray(handoff.inventory)){
    campaign.meta.training=handoff.inventory.slice(0,4);
    campaign.meta.report=typeof handoff.report==='string'?handoff.report.slice(0,1000):null;
    campaign.meta.name=String(handoff.name||profile.name||'Cadete').slice(0,40);
  }
  const requestedWorld=new URLSearchParams(window.location.search).get('world');
  if(worlds.some(w=>w.id===requestedWorld)){campaign.meta.world=requestedWorld;campaign.meta.position=null;}
  if(new URLSearchParams(window.location.search).get('arrival')==='1'){campaign.meta.world='mars01_ship_interior';campaign.meta.position=null;}
  campaign.beginMars();
  let preserveBadSave=!!loadWarning,tab='mission',baseView='care',special=null,wasPaused=false,assets=null,assetGroup='',assetQuery='',assetPage=0;
  let knownBadges=new Set(campaign.badges().filter(b=>b.done).map(b=>b.id));
  const launcher=document.createElement('button');launcher.className='mission-launcher';launcher.type='button';launcher.id='missionOpen';
  launcher.innerHTML='<img src="/assets/visuals/hud_assets/png/avatar_astronauta_1x.png" alt=""><span><strong>MINHA MISSÃO</strong><small id="missionCompact">B · abrir</small></span>';
  document.body.append(launcher);
  const dialog=document.createElement('dialog');dialog.className='mission-dialog';dialog.id='missionDialog';dialog.setAttribute('aria-labelledby','missionTitle');
  dialog.innerHTML='<header><div><div class="mission-eyebrow">B · MISSÃO EM MARTE</div><h1 id="missionTitle">Minha missão</h1><div id="missionClock" class="mission-clock"></div></div><button type="button" class="mission-close" aria-label="Fechar gestão">×</button></header><nav class="mission-nav" aria-label="Seções da missão"></nav><div class="mission-content" id="missionContent"></div><div class="mission-status" id="missionFeedback" role="status" aria-live="polite">Escolha uma ação.</div>';
  document.body.append(dialog);
  const content=dialog.querySelector('.mission-content'),feedback=$('#missionFeedback');
  feedback.hidden=true;feedback.setAttribute('aria-live','off');
  const dialogAssistant=window.NovaAssistant.create({compact:true});dialog.append(dialogAssistant.element);
  function setFeedback(message,mood){feedback.textContent=message;dialogAssistant.say(message,{mood});}
  const sections={mission:'Missão',base:'Base',science:'Mochila',journal:'Mensagens',assets:'Coleção'};
  for(const [key,label]of Object.entries(sections)){
    const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.append(UI.icon({mission:'map',base:'build',science:'science',journal:'antenna',assets:'materials'}[key]),UI.node('span','',label));b.dataset.tab=key;b.setAttribute('aria-pressed','false');
    b.onclick=()=>{tab=key;special=null;render();};dialog.querySelector('nav').append(b);
  }
  const hud=element('section','survival-hud');hud.id='survivalHud';hud.setAttribute('aria-label','Recursos da equipe em Marte');
  const hudMeters={};
  for(const key of ['oxygen','waterClean','food','energy']){
    const item=element('button','survival-meter');item.type='button';item.onclick=()=>open('base');
    const img=element('img','');img.src=`/assets/visuals/hud_assets/png/icone_${icons[key]}_1x.png`;img.alt='';
    const label=element('span','',key==='oxygen'?'Ar':key==='waterClean'?'Água':names[key]);
    const amount=element('strong',''),track=UI.meter(0,names[key],key);item.dataset.resource=key;
    item.append(img,label,amount,track);hud.append(item);hudMeters[key]={item,amount,track};
  }
  const liveClock=element('span','survival-clock');liveClock.id='survivalClock';hud.append(liveClock);document.body.append(hud);
  const guide=window.NovaAssistant.create({floating:true,compact:true,dismissible:true,onDismiss:()=>$('#gameCanvas').focus(),onInteract:()=>$('#gameCanvas').focus()});
  guide.element.id='novaGuide';guide.text.id='novaHint';document.body.append(guide.element);
  let speechTimer=null,eventSpeech=null;
  function goalSpeech(){
    if(dialog.open||engine.inspectedObject){guide.hide();return;}
    if(eventSpeech){guide.say(eventSpeech.message,eventSpeech.settings);return;}
    const goal=nextGoal(),message=goal.target==='ship-exit'?'Vamos explorar Marte! Vá até a porta verde e aperte E.':goal.title+'. '+goal.hint+'.';
    guide.say(message,{key:goal.title+goal.hint,mood:['sample','science'].includes(goal.icon)?'science':'guide',onAction:()=>open(goal.section||'mission',goal.view)});
  }
  function announce(message,settings={}){
    if(dialog.open){setFeedback(message,settings.mood);return;}
    if(engine.inspectedObject){fieldAssistant.say(message,settings);return;}
    clearTimeout(speechTimer);eventSpeech={message,settings:{...settings,onAction:()=>open('mission')}};goalSpeech();
    speechTimer=setTimeout(()=>{eventSpeech=null;goalSpeech();},7000);
  }
  function save(){
    campaign.meta.world=engine.map.id;campaign.meta.position={x:engine.player.x,y:engine.player.y};
    if(preserveBadSave)return;
    try{localStorage.setItem(KEY,JSON.stringify(campaign.save()));}catch{setFeedback('Não deu para guardar seu progresso. Em Mensagens, use Baixar.','warning');launcher.dataset.alert='true';}
  }
  function element(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
  function card(title,wide=false){const c=element('section','mission-card'+(wide?' wide':''));if(title)c.append(element('h3','',title));return c;}
  function button(parent,label,fn,disabled=false){const b=element('button','',label);b.type='button';b.setAttribute('aria-label',label);b.disabled=disabled;b.onclick=()=>run(fn);parent.append(b);return b;}
  function slot(parent,label,art,fn,detail='',disabled=false,ariaLabel=label){const b=UI.tile({label,icon:art,detail,disabled,ariaLabel,onClick:()=>run(fn)});parent.append(b);return b;}
  function resourceStrip(parent){const strip=element('div','resource-strip');for(const key of ['oxygen','waterClean','energy','food'])strip.append(UI.resource(key,campaign.engine.state.resources[key]));parent.append(strip);}
  function nextGoal(){
    const s=campaign.engine.state,a=campaign.advice(),first=engine.map.interior&&!campaign.meta.exitedShip&&s.tick<9;
    if(first)return {title:'Sair da nave',hint:'Porta verde · E',icon:'ship',target:'ship-exit'};
    if(s.activeActivity)return {title:TASKS[s.activeActivity.type]?.[0]||'Trabalhando',hint:s.activeActivity.remainingTicks+' etapas',icon:TASKS[s.activeActivity.type]?.[1]||'repair',section:'base',view:'care'};
    if(a.action)return {title:({buildComms:'Monte a antena',connectComms:'Ligue a antena',buildGreenhouse:'Monte a estufa',buildLab:'Monte o laboratório',buildShelter:'Prepare o abrigo',transferToShelter:'Entre no abrigo',repairFilter:'Conserte o filtro',cleanPanels:'Limpe os painéis',harvest:'Hora de colher',recycleWater:'Recicle a água'})[a.action]||TASKS[a.action]?.[0]||'Minha base',hint:a.target?'Chegue perto · E':'Escolha uma ação',icon:TASKS[a.action]?.[1]||'repair',target:a.target,section:a.section,view:a.action.startsWith('build')?'build':'care'};
    if(a.target)return {title:({rover:'Ache o robô',minerio_ferroso:'Pegue uma rocha',antena:'Ligue a antena','ship-supply':'Pegue a caixa de ajuda'})[a.target]||'Próxima missão',hint:a.target==='rover'?'Mineração · E':'Chegue perto · E',icon:a.target==='rover'?'rover':a.target==='ship-supply'?'materials':a.target==='antena'?'antenna':'sample',target:a.target,section:a.section};
    if(!s.crop&&!s.objectives.cropHarvested&&s.systems.greenhouseBuilt)return {title:'Plante uma semente',hint:'Escolha sua planta',icon:'seeds',section:'base',view:'plants'};
    if(a.section==='science')return {title:'Estude a rocha',hint:'Abra a mochila',icon:'sample',section:'science'};
    return {title:a.section==='journal'?'Fale com a Terra':'Cuide da equipe',hint:'Escolha uma ação',icon:a.section==='journal'?'antenna':'repair',section:a.section,view:'care'};
  }
  function run(fn){try{const message=fn();campaign.sync();const badge=refresh();save();render();const text=badge?'Você ganhou a medalha '+badge.label+'! +50 estrelas':typeof message==='string'?message:'Pronto! Vamos para a próxima etapa.';if(dialog.open)setFeedback(text,badge?'success':undefined);else announce(text,{mood:badge?'success':undefined});}catch(error){announce(error.message,{mood:'warning'});}}
  function open(section='mission',view){
    tab=section;if(view)baseView=view;special=null;
    if(!dialog.open){wasPaused=engine.paused;engine.closeInspection();engine.controls.keys.clear();engine.setPaused(true);dialog.showModal();}
    guide.hide();
    render();dialog.querySelector('.mission-close').focus();
  }
  function close(){dialog.close();dialogAssistant.hide();goalSpeech();engine.controls.keys.clear();engine.setPaused(wasPaused);if(!engine.paused)$('#gameCanvas').focus();save();}
  launcher.onclick=()=>open();dialog.querySelector('.mission-close').onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('keydown',event=>event.stopPropagation());dialog.addEventListener('keyup',event=>event.stopPropagation());
  window.addEventListener('keydown',event=>{if(event.key.toLowerCase()==='b'&&!event.repeat&&!['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)){event.preventDefault();event.stopImmediatePropagation();if(dialog.open)close();else open();}},true);
  const atBase=()=>engine.map.id==='mapa_01_pouso'||engine.map.interior;
  function available(type){const a=campaign.engine.availableActions()[type],habitat=engine.map.props.find(p=>p.sprite==='habitat_circular');return campaign.meta.result==='active'&&a?.enabled&&atBase()&&(type!=='transferToShelter'||habitat&&engine.canAct(habitat));}
  function action(parent,type,payload={}){
    const def=scenario.activities[type],s=campaign.engine.state,block=campaign.engine.availableActions()[type];
    const done=!!(def.once&&s.systems[def.once])||type==='buildShelter'&&s.systems.shelterBuilt||type==='cleanPanels'&&s.systems.panelsCleaned&&s.systems.solarCondition>=1;
    let hint=done?'✓ Feito':s.activeActivity?'Equipe ocupada':!atBase()?'Volte à base':type==='transferToShelter'&&!available(type)?'Chegue ao abrigo':block.reasons[0]?.replace(/^Requer: /,'Falta ').replace(/^Recursos insuficientes: /,'Falta ').replace(/\.$/,'')||block.durationTicks+' etapas';
    if(type==='harvest'&&!block.enabled)hint=s.crop?'Crescendo…':'Plante primeiro';
    if(type==='repairFilter'&&!block.enabled&&!s.activeActivity)hint='Filtro OK';
    if(type==='cleanPanels'&&s.tick<20)hint='Depois da poeira';
    const b=slot(parent,TASKS[type]?.[0]||LABELS[type],TASKS[type]?.[1]||'repair',()=>campaign.start(type,payload),hint,done||!available(type)||type==='cleanPanels'&&s.tick<20,LABELS[type]);
    b.dataset.state=done?'done':'';
    const cost=element('div','cost-row');for(const [key,value]of Object.entries(def.reserved))if(value>0)cost.append(UI.chip(key,value));cost.append(element('small','time-cost',block.durationTicks+' etapas'));b.append(cost);
    return b;
  }
  function render(){
    const s=campaign.engine.state;
    const prompts={mission:'Oi, cadete! Vamos cuidar da equipe e explorar Marte juntos?',base:'Escolha um desenho para cuidar da nossa base.',science:'Vamos investigar! Guarde e compare suas descobertas aqui.',journal:'Vamos contar nossas descobertas para a Terra!',assets:'Veja os desenhos e sons da nossa aventura.',badges:'Olha só o que você já conquistou!',forecast:'Veja o que muda antes de dar o próximo passo.',technical:'Aqui estão os detalhes da nossa base.',reset:'Quer começar de novo? Você pode baixar seu progresso antes.',return:'Qual foi sua descoberta? Escolha um desenho ou escreva.'};
    dialogAssistant.say(prompts[special||tab],{key:special||tab,mood:tab==='science'?'science':special==='badges'?'success':'guide'});
    $('#missionTitle').textContent=({badges:'Minhas medalhas',forecast:'Antes e depois',technical:'Detalhes da base',reset:'Nova aventura',return:'Voltar para casa'})[special]||({mission:'Minha missão',base:'Minha base',science:'Minha mochila',journal:'Falar com a Terra',assets:'Minha coleção'})[tab];
    $('#missionClock').textContent=`Sol ${Math.floor(s.tick/16)+1} · ${s.tick%16<12?'Dia':'Noite'} · ${engine.map.interior?'Nave':engine.map.short}`;
    for(const b of dialog.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',String(b.dataset.tab===tab));
    content.replaceChildren();
    if(special==='reset'){openReset();return;}
    if(special==='return'){renderReturn();return;}
    if(special==='technical'){renderTechnicalBase();return;}
    if(special==='forecast'){renderForecast();return;}
    if(special==='badges'){renderBadges();return;}
    if(tab==='mission')renderMission();if(tab==='base')renderBase();if(tab==='science')renderScience();if(tab==='journal')renderJournal();if(tab==='assets')renderAssets();
  }
  function renderMission(){
    const s=campaign.engine.state,next=nextGoal(),earned=campaign.badges().filter(b=>b.done);
    const top=element('div','mission-overview'),profile=card('Cadete'),identity=element('div','cadet-profile'),avatar=element('div','cadet-sprite');avatar.setAttribute('role','img');avatar.setAttribute('aria-label','Seu astronauta');
    const info=element('div','cadet-info');info.append(element('small','','OPPORTUNITY'),element('strong','',campaign.meta.name),element('small','',engine.map.interior?'Nave MARS 01':engine.map.short));identity.append(avatar,info);profile.append(identity);
    const status=card('Status da equipe');for(const key of ['oxygen','waterClean','energy','food'])status.append(UI.resource(key,s.resources[key]));top.append(profile,status);content.append(top);
    const progress=element('div','mission-progress');progress.append(element('strong','',campaign.objectives().filter(o=>o.done).length+'/8 missões'));button(progress,earned.length*50+' ★',()=>{special='badges';}).setAttribute('aria-label','Ver medalhas');content.append(progress);
    if(campaign.meta.result==='active'){
      const grid=element('div','mission-shortcuts');slot(grid,next.title,next.icon,()=>{if(next.target){close();highlight(next.target);}else{tab=next.section;baseView=next.view||'care';}},next.hint);
      slot(grid,'Construir','build',()=>{tab='base';baseView='build';});slot(grid,'Mochila','science',()=>{tab='science';});content.append(grid);
    }else{
      const result=card(campaign.meta.result==='succeeded'?'Missão cumprida!':'Vamos tentar de novo?');result.append(UI.icon(campaign.meta.result==='succeeded'?'rover':'ship'));
      if(campaign.meta.result==='failed'){const cause=s.eventHistory.filter(e=>e.type==='missionInterrupted').at(-1)?.message||'';result.append(element('p','',cause.includes('oxigênio')?'Faltou ar.':cause.includes('alimento')?'Faltou comida.':cause.includes('água')?'Faltou água.':cause.includes('exposição')?'Precisamos usar o abrigo.':cause.includes('ar')?'O filtro precisava de conserto.':'Hora de tentar outra aventura.'));}
      button(result,'Nova aventura',()=>openReset());content.append(result);
    }
    const goals=element('div','goal-grid'),labels=['Falar com a Terra','Estudar a rocha','Colher comida','Reciclar água','Cuidar da base','Usar o abrigo','Ajudar o robô','Voltar para casa'],art=['antenna','sample','food','waterClean','repair','shelter','rover','ship'];
    campaign.objectives().forEach((goal,index)=>{const tile=UI.tile({label:labels[index],icon:art[index],detail:goal.done?'✓ Feito':`${index+1}/8`,state:goal.done?'done':'',onClick:()=>run(()=>{if(index===6){close();highlight('rover');}else{tab=index===1?'science':index===7?'journal':'base';baseView=index===2?'plants':index===0?'build':'care';}})});goals.append(tile);});content.append(goals);
    if(loadWarning)content.append(element('p','mission-warning',loadWarning));
  }
  function renderBadges(){
    const grid=element('div','badge-grid');for(const badge of campaign.badges()){const item=element('div','junior-badge'+(badge.done?' earned':''));item.append(UI.icon(badge.id==='landing'?'ship':badge.id==='first-seed'?'lettuce':badge.id==='evidence'?'science':['antenna','sample','food','waterClean','repair','shelter','rover','ship'][Number(badge.id.split('-')[1])]||'avatar'),element('strong','',badge.label),element('small','',badge.done?'✓ +50 ★':'—'));grid.append(item);}content.append(grid);button(content,'Voltar',()=>{special=null;});
  }
  function highlight(target){
    const prop=engine.map.props.find(p=>p.role===target||p.sprite===target);
    if(prop){engine.renderer.guideTarget=prop;notify('Siga o círculo azul: '+prop.name);}
    else notify(target==='rover'?'Vá à Mineração · M':target==='ship-supply'?'Volte à nave · M':'Volte ao pouso · M');
  }
  function advance(ticks){
    const before=campaign.engine.getState();campaign.advance(ticks);
    const s=campaign.engine.state;
    const finished=before.activeActivity&&!s.activeActivity;
    notify(finished?'✓ Tarefa pronta!':'✓ Mais uma etapa!');
    if(campaign.meta.result!=='active')tab='mission';
    const event=s.eventHistory.slice(before.eventHistory.length).filter(e=>['missionInterrupted','systemFailure','environmentalWarning','environmentalEventStarted','environmentalEventEnded','communicationsOutageStarted','communicationsRestored'].includes(e.type)).at(-1);
    return event?.type==='missionInterrupted'?'Vamos pedir ajuda na nave.':finished?'✓ Tarefa pronta!':'✓ Mais uma etapa!';
  }
  function renderBase(){
    const s=campaign.engine.state;resourceStrip(content);
    const nav=element('nav','base-tabs');nav.setAttribute('aria-label','Cuidados da base');
    for(const [key,label,art]of [['care','Cuidar','repair'],['build','Construir','build'],['plants','Horta','lettuce'],['power','Energia','energy']]){const b=button(nav,label,()=>{baseView=key;});b.append(UI.icon(art));b.setAttribute('aria-pressed',String(baseView===key));}content.append(nav);
    const work=element('section','work-strip');
    if(s.activeActivity){const task=s.activeActivity;work.append(UI.icon(TASKS[task.type]?.[1]||'repair'),element('strong','',TASKS[task.type]?.[0]||'Trabalhando'),UI.meter((task.totalTicks-task.remainingTicks)/task.totalTicks*100,'Trabalho da equipe'),element('small','',task.remainingTicks+' etapas'));button(work,'▶ Ajudar',()=>advance(1),campaign.meta.result!=='active').setAttribute('aria-label','Ajudar na próxima etapa');button(work,'×',()=>campaign.command('cancelActivity',{activityId:task.id}),campaign.meta.result!=='active').setAttribute('aria-label','Parar esta tarefa');}
    else{work.append(UI.icon(nextGoal().icon),element('strong','',nextGoal().title));button(work,'▶ Esperar',()=>advance(1),campaign.meta.result!=='active').setAttribute('aria-label','Esperar um pouquinho');}
    button(work,'↗ Prever',()=>{special='forecast';},campaign.meta.result!=='active').setAttribute('aria-label','Ver o que muda na próxima etapa');content.append(work);
    const grid=element('div','action-grid');
    if(baseView==='care'){
      for(const type of ['recycleWater','repairFilter','cleanPanels','rest','transferToShelter'])action(grid,type);
      if(!available('transferToShelter'))slot(grid,'Achar abrigo','map',()=>{close();highlight(engine.map.interior?'ship-exit':'habitat_circular');});
    }else if(baseView==='build')for(const type of ['buildComms','connectComms','buildGreenhouse','buildLab','buildShelter','buildDormitory'])action(grid,type);
    else if(baseView==='plants')renderCrops(grid);
    else for(const [mode,label,art]of [['safety','Equipe','shelter'],['garden','Horta','lettuce'],['science','Pesquisa','science']]){const b=slot(grid,label,art,()=>campaign.applyPowerMode(mode),campaign.meta.powerMode===mode?'✓ Ligado':'Usar este plano',campaign.meta.result!=='active');b.setAttribute('aria-pressed',String(campaign.meta.powerMode===mode));}
    content.append(grid);const more=element('div','panel-footer');button(more,'Detalhes',()=>{special='technical';}).setAttribute('aria-label','Ver números e ajustes');content.append(more);
  }
  function renderForecast(){
    const s=campaign.engine.state,next=campaign.forecast(1),grid=element('div','forecast-grid');
    for(const key of ['oxygen','waterClean','energy','food']){const c=card(UI.names[key]),before=s.resources[key],after=next.resources[key];c.append(UI.icon(key),element('strong','forecast-value',Math.round(before.amount/before.capacity*100)+'% → '+Math.round(after.amount/after.capacity*100)+'%'),UI.meter(after.amount/after.capacity*100,'Previsão de '+UI.names[key],key));grid.append(c);}content.append(grid);
    if(next.status!=='active')content.append(element('p','mission-warning','Pouca reserva. Peça ajuda na nave.'));
    button(content,'▶ Continuar',()=>{special=null;return advance(1);},campaign.meta.result!=='active');button(content,'← Planejar',()=>{special=null;});
  }
  function renderTechnicalBase(){
    const s=campaign.engine.state,grid=element('div','mission-grid');content.append(element('h2','','Sistemas conectados'),element('p','','As mesmas reservas alimentam todos os setores. Não existe recarga gratuita: a bateria recebe o excedente solar e alimenta a base à noite.'));
    for(const key of ['energy','waterClean','oxygen','food']){
      const r=s.resources[key],c=card(),row=element('div',`mission-resource${r.amount/r.capacity<.2?' low':''}`),img=element('img','');img.src=`/assets/visuals/hud_assets/png/icone_${icons[key]}_1x.png`;img.alt='';
      const text=element('div','');text.append(element('span','',names[key]),element('strong','',`${n(r.amount)} / ${r.capacity}`));row.append(img,text);c.append(row);
      const meter=element('progress','');meter.max=r.capacity;meter.value=r.amount;meter.setAttribute('aria-label',names[key]);c.append(meter);
      c.append(element('small','',`Reservado: ${n(r.reserved)} · disponível: ${n(r.amount-r.reserved)} un.`));grid.append(c);
      if(key==='food'||key==='oxygen')c.append(element('small','',`Sem reposição: cerca de ${Math.floor((r.amount-r.reserved)/(key==='food'?scenario.rates.foodUse:scenario.rates.oxygenUse))} passos de consumo da equipe.`));
    }
    const clock=card('Próximos passos',true);clock.append(element('p','',s.activeActivity?`${LABELS[s.activeActivity.type]||s.activeActivity.type}: ${s.activeActivity.remainingTicks} passos restantes.`:'Equipe disponível. Escolha uma tarefa ou avance para aguardar eventos e mensagens.'));
    const able=campaign.meta.result==='active'&&(s.systems.baseOnline||s.activeActivity?.type==='activateBase');
    for(const ticks of [1,4]){
      const line=element('div','mission-forecast');let forecast;
      if(able){forecast=campaign.forecast(ticks);for(const key of ['energy','waterClean','oxygen','food']){const delta=forecast.resources[key].amount-s.resources[key].amount;line.append(element('span','',`${names[key]} ${delta>=0?'+':''}${n(delta)} → ${n(forecast.resources[key].amount)}`));}line.append(element('span','',`Exposição → ${n(forecast.team.exposure)}/65`));}
      clock.append(line);button(clock,`Avançar ${ticks} ${ticks===1?'passo':'passos (¼ de sol)'}`,()=>advance(ticks),!able);
      if(forecast?.status!=='active'&&forecast)clock.append(element('p','mission-warning','Esta previsão encerra a missão. Revise suas reservas antes de avançar.'));
    }
    clock.append(element('small','','Previsão calculada pela LIFE, com as prioridades e eventos conhecidos. Planejar não altera o relógio.'));
    if(s.activeActivity)button(clock,'Cancelar tarefa e liberar reservas',()=>campaign.command('cancelActivity',{activityId:s.activeActivity.id}),campaign.meta.result!=='active');grid.append(clock);
    const supply=card('Estoque e equipe');for(const key of ['materials','seeds','repairParts','waterUsed'])supply.append(element('p','',`${names[key]}: ${n(s.resources[key].amount)} (${n(s.resources[key].reserved)} reservados)`));
    supply.append(element('p','',`Fadiga: ${n(s.team.fatigue)}% · CO₂: ${n(s.systems.co2)} · filtro: ${n(s.systems.filterCondition*100)}%`));
    supply.append(element('p','',`Exposição pedagógica: ${n(s.team.exposure)} / 65 · local da equipe: ${s.team.location==='shelter'?'abrigo reforçado':s.team.location==='outside'?'atividade externa':'habitat'}`));grid.append(supply);
    const power=card('Distribuição de energia');power.append(element('p','',`Geração no último passo: ${s.power.lastGeneration} · bateria: 48 un. · menor prioridade numérica recebe primeiro.`));
    const selects={};for(const [key,label]of Object.entries(consumers)){
      const row=element('label','mission-priority',`${label} (${scenario.power.consumers[key].demand}/passo)`),select=element('select','');select.setAttribute('aria-label',`Prioridade de ${label}`);
      for(let i=1;i<=7;i++){const o=element('option','',String(i));o.value=i;select.append(o);}select.value=s.priorities[key];selects[key]=select;row.append(select);power.append(row);
    }
    button(power,'Aplicar prioridades',()=>campaign.command('setPowerPriorities',{priorities:Object.fromEntries(Object.entries(selects).map(([k,v])=>[k,Number(v.value)]))}),campaign.meta.result!=='active');
    for(const [key,value]of Object.entries(s.power.lastAllocation))if(!value)power.append(element('small','mission-warning',`${consumers[key]||key} ficou sem energia.`));grid.append(power);
    const weather=card('Previsão e manutenção');weather.append(element('p','','Poeira: passos 12–20 (30% da geração). Filtro: falha no passo 26. Radiação: passos 32–36. Comunicação interrompida nos passos 40–43.'));
    weather.append(element('p','','Reforce o abrigo antes do alerta. Ocupar o abrigo reduz a exposição em 80%. A poeira suspensa reduz a geração mesmo após uma limpeza.'));
    for(const type of ['cleanPanels','repairFilter','recycleWater','rest','transferToShelter'])action(weather,type);grid.append(weather);
    const build=card('Construir setores');build.append(element('p','','Os setores usam plataformas demarcadas no pouso. Custos são reservados ao iniciar e consumidos ao concluir. Construa e aguarde os passos indicados.'));
    for(const type of ['buildComms','buildGreenhouse','buildLab','buildShelter','buildDormitory'])action(build,type);grid.append(build);
    const crops=card('Estufa pressurizada',true);renderCrops(crops);grid.append(crops);content.append(grid);
  }
  function renderCrops(parent){
    const s=campaign.engine.state;
    if(s.crop){
      const crop=CROPS[s.crop.cropId]||CROPS.lettuce,c=card(crop.label);c.className+=' crop-status';c.append(UI.icon(crop.art),element('strong','',s.crop.failed?'Precisa replantar':s.crop.remainingTicks?s.crop.remainingTicks+' etapas':'Pronta!'),UI.meter(s.crop.failed?0:(crop.growthTicks-s.crop.remainingTicks)/crop.growthTicks*100,'Crescimento'));
      if(s.crop.failed)button(c,'Replantar',()=>campaign.command('discardCrop'),campaign.meta.result!=='active');else action(c,'harvest');parent.append(c);
    }else for(const [id,crop]of Object.entries(CROPS)){
      const b=slot(parent,crop.label,id,()=>campaign.start('plant',{cropId:id}),id==='lettuce'?'Rápida':id==='potato'?'Mais comida':'Espera média',!available('plant')||s.resources.waterClean.amount-s.resources.waterClean.reserved<crop.plantWater,'Plantar '+crop.label.toLowerCase());
      const cost=element('div','cost-row');cost.append(UI.chip('waterClean',crop.plantWater),UI.chip('seeds',1),element('span','crop-arrow','→'),UI.chip('food','+'+crop.yield));b.append(cost);
    }
  }
  function renderScience(){
    const s=campaign.engine.state,grid=element('div','science-grid'),sample=card('Minha amostra');
    sample.className+=' sample-panel';sample.append(UI.icon('sample'),element('strong','sample-code',s.systems.sampleCollected?'AM-01':'—'));
    const flow=element('div','sample-flow');for(const [label,done]of [['Pegar',s.systems.sampleCollected],['Comparar',s.systems.sampleCompared],['Analisar',s.systems.sampleAnalyzed]])flow.append(element('span',done?'done':'',label+(done?' ✓':'')));sample.append(flow);
    if(!s.systems.sampleCollected)button(sample,'Achar uma rocha',()=>{close();highlight('minerio_ferroso');});
    else if(s.systems.sampleAnalyzed)sample.append(element('strong','sample-result','✓ Amostra estudada!'));
    else action(sample,'analyzeSample');grid.append(sample);
    const test=card(s.systems.sampleCompared?'Comparação feita!':'Toque nas 2 maiores');
    if(s.systems.sampleCollected&&!s.systems.sampleCompared){
      const selected=new Set(),bars=element('div','spectrum-bars');
      scenario.sample.peaks.forEach((value,index)=>{const column=element('div','spectrum-column'),bar=element('span','');bar.style.height=value+'px';column.append(bar);const b=element('button','',scenario.sample.elements[index]);b.type='button';b.setAttribute('aria-pressed','false');b.onclick=()=>{if(selected.has(index))selected.delete(index);else if(selected.size<2)selected.add(index);b.setAttribute('aria-pressed',String(selected.has(index)));};column.append(b);bars.append(column);});test.append(bars);button(test,'Conferir',()=>campaign.command('compareSample',{selected:[...selected]}),campaign.meta.result!=='active').setAttribute('aria-label','Registrar comparação');
    }else test.append(UI.icon(s.systems.sampleCompared?'science':'map'),element('p','',s.systems.sampleCompared?'Próximo: laboratório.':'Primeiro, pegue uma amostra.'));grid.append(test);content.append(grid);
    const inventory=element('div','inventory-grid'),tools=[['camera','Câmera'],['microscope','Microscópio'],['temperature','Temperatura'],['drill','Furadeira']];
    tools.forEach(([icon,title],index)=>{const item=campaign.meta.training[index],c=element('article','inventory-slot');c.append(element('small','slot-number','SLOT 0'+(index+1)),UI.icon('/assets/visuals/hud_assets/svg/tool_'+icon+'.svg'),element('strong','',title),element('small','',item?'✓ Guardado':'Vazio'));if(item){const detail=element('details','slot-record');detail.append(element('summary','','Ver registro'),element('p','',item.result||''));if(typeof item.photo==='string'&&item.photo.startsWith('data:image/')){const img=element('img','inventory-photo');img.src=item.photo;img.alt='Foto do treino';detail.append(img);}c.append(detail);}inventory.append(c);});content.append(inventory);
    const policy=element('details','secondary-details');policy.append(element('summary','','Sobre esta experiência'),element('p','','Teste ilustrativo. Uma amostra sozinha não prova água ou vida. O cenário e os valores são educativos.'));const a=element('a','','Fontes e modelo');a.href='/life/scenario-mars.json';a.target='_blank';a.rel='noopener';policy.append(a);content.append(policy);
  }
  function renderJournal(){
    const s=campaign.engine.state,actions=element('div','message-actions');
    slot(actions,'Enviar notícias','antenna',()=>campaign.report(),s.systems.contactOnline?'Terra ↔ Marte':'Ligue a antena',!s.systems.contactOnline||campaign.meta.result!=='active','Transmitir situação da base');
    slot(actions,'Pedir volta','ship',()=>campaign.report(true),s.systems.roverRecovered?'Arquivos prontos':'Ache o robô',!s.systems.roverRecovered||!!campaign.meta.finalMessage||campaign.meta.result!=='active','Enviar arquivos e solicitar retorno');content.append(actions);
    const inbox=element('div','message-list');if(!s.messages.length)inbox.append(element('div','empty-message','Sem mensagens.'));
    for(const m of s.messages.slice(-4).reverse()){
      const c=card(m.id===campaign.meta.finalMessage?'Volta para casa':'Notícias da base');c.className+=' message-card';c.append(UI.icon(m.status==='delivered'?'ship':'antenna'),element('strong','',m.status==='delivered'?m.id===campaign.meta.finalMessage?'✓ Pode voltar!':'✓ Terra recebeu':m.status==='waitingForChannel'?'Esperando sinal…':'Enviando…'));
      const stage=m.status==='delivered'?100:m.status==='outbound'?25:m.status==='processing'?50:75;c.append(UI.meter(stage,'Entrega da mensagem'));if(m.status!=='delivered')c.append(element('small','',Math.max(0,m.deliveryDueAt-s.tick)+' etapas'));inbox.append(c);
    }content.append(inbox);
    const log=element('details','secondary-details');log.append(element('summary','','Diário da equipe'));for(const d of campaign.meta.decisions.slice(-12))log.append(element('p','',d.text));if(campaign.meta.reflection)log.append(element('p','',campaign.meta.reflection));if(campaign.meta.report)log.append(element('p','',campaign.meta.report));content.append(log);
    const saved=element('details','secondary-details');saved.append(element('summary','','Meu progresso'));
    button(saved,'Baixar',()=>download('opportunity-campanha.json',JSON.stringify(campaign.save(),null,2))).setAttribute('aria-label','Exportar progresso');
    button(saved,'Guardar',()=>{preserveBadSave=false;loadWarning='';save();}).setAttribute('aria-label','Salvar esta tentativa');button(saved,'Nova aventura',()=>openReset()).setAttribute('aria-label','Nova tentativa');
    const label=element('label','import-save','Abrir progresso '),input=element('input','');input.type='file';input.accept='.json,application/json';input.onchange=async()=>{try{const file=input.files[0];if(!file)return;if(file.size>5000000)throw Error('Arquivo muito grande.');campaign=new Campaign(scenario,JSON.parse(await file.text()));preserveBadSave=false;loadWarning='';restorePosition();syncLocation();refresh();save();render();setFeedback('Progresso aberto! Vamos continuar a aventura.','success');}catch{setFeedback('Não deu para abrir este progresso. Tente outro arquivo.','warning');}};label.append(input);saved.append(label);content.append(saved);
  }
  function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=element('a','');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function openReset(){
    tab='mission';special='reset';content.replaceChildren();
    const c=card('Começar do zero?');c.append(element('p','','Seu progresso atual será trocado.'));button(c,'Baixar progresso',()=>download('opportunity-campanha.json',JSON.stringify(campaign.save(),null,2))).setAttribute('aria-label','Exportar tentativa atual');
    button(c,'Começar',()=>{const training=campaign.meta.training,report=campaign.meta.report;campaign=new Campaign(scenario,null,profile);campaign.meta.training=training;campaign.meta.report=report;campaign.beginMars();preserveBadSave=false;loadWarning='';special=null;restorePosition();syncLocation();save();render();}).setAttribute('aria-label','Confirmar nova tentativa');button(c,'Voltar',()=>{special=null;}).setAttribute('aria-label','Continuar esta tentativa');content.append(c);
  }
  async function renderAssets(){
    const credits=element('details','secondary-details');credits.append(element('summary','','Créditos'),element('p','','Space Runner: Matt Walkden, CC0. Tilemap: arte adaptada e fornecida ao projeto; referências de KipperFalcon têm restrições próprias. Demais imagens, agricultura e áudio: materiais locais fornecidos ao projeto, sem licença uniforme confirmada.'));
    for(const [label,url]of [['Origem e licença dos mapas','/assets/marte_tilemap/LEIA-ME.md'],['Licença Space Runner','/assets/Space Runner Assets - 27-11-20/License.txt'],['Notas do HUD','/assets/visuals/hud_assets/LEIAME.md']]){const a=element('a','',label);a.href=url;a.target='_blank';a.rel='noopener';credits.append(a,element('br',''));}content.append(credits);
    if(!assets){const loading=element('p','','Abrindo coleção…');content.append(loading);try{const r=await fetch('/assets/catalog.json');if(!r.ok)throw Error();assets=await r.json();if(tab==='assets'&&dialog.open)render();}catch{loading.textContent='Não deu para abrir.';button(content,'Tentar de novo',()=>{assets=null;});}return;}
    const filters=element('div','asset-controls'),select=element('select','');select.setAttribute('aria-label','Tipo de desenho');select.append(new Option('Todos',''));
    const groups={assistant:'NOVA',Animations:'Animações','250 pixel Veggie':'Alimentos',growing_plants:'Plantas',marte_tilemap:'Marte',visuals:'Ícones',audio:'Música',astronaut:'Astronauta',farming:'Horta','Space Runner Assets - 27-11-20':'Exploração',main_menu:'Capa',lab_training:'Treino','opportunity-mars-five-worlds':'Mapas'};
    for(const g of [...new Set(assets.entries.map(e=>e.group))])select.append(new Option(groups[g]||'Outros',g));select.value=assetGroup;select.onchange=()=>{assetGroup=select.value;assetPage=0;render();};
    const search=element('input','asset-search');search.placeholder='Buscar';search.setAttribute('aria-label','Buscar desenho');search.value=assetQuery;
    const go=element('button','','Buscar');go.onclick=()=>{assetQuery=search.value;assetPage=0;render();};search.onkeydown=e=>{if(e.key==='Enter')go.click();};filters.append(select,search,go);content.append(filters);
    const matching=assets.entries.filter(e=>e.kind!=='source'&&(!assetGroup||e.group===assetGroup)&&e.name.toLowerCase().includes(assetQuery.toLowerCase()));
    content.append(element('div','asset-page',`${assetPage+1} / ${Math.max(1,Math.ceil(matching.length/36))}`));
    const gallery=element('div','asset-gallery');for(const asset of matching.slice(assetPage*36,(assetPage+1)*36)){
      const tile=element('figure','asset-tile');if(asset.kind==='image'){const img=element('img','');img.src=asset.path;img.alt=asset.name;img.loading='lazy';tile.append(img);}
      if(asset.kind==='audio'){const audio=element('audio','');audio.src=asset.path;audio.controls=true;audio.preload='none';tile.append(audio);}
      const caption=element('figcaption',''),a=element('a','',asset.name);a.href=asset.path;a.target='_blank';a.rel='noopener';caption.append(a);tile.append(caption);gallery.append(tile);
    }content.append(gallery);const nav=element('div','mission-actions');button(nav,'Página anterior',()=>{assetPage--;},assetPage===0);button(nav,'Próxima página',()=>{assetPage++;},(assetPage+1)*36>=matching.length);content.append(nav);
  }
  const inspectArt=UI.icon('map');inspectArt.className+=' inspect-preview';$('#inspectCard').append(inspectArt);
  const fieldActions=element('div','');fieldActions.id='campaignActions';$('#inspectCard').append(fieldActions);
  const fieldAssistant=window.NovaAssistant.create({compact:true});$('#inspectCard').append(fieldAssistant.element);
  $('#inspectInfo').hidden=true;$('#inspectInfo').setAttribute('aria-live','off');
  const originalInspect=engine.onInspect;
  function inspect(prop){
    originalInspect(prop);fieldActions.replaceChildren();inspectArt.hidden=!prop||!!prop.action?.startsWith('travel:');$('#inspectDescription').hidden=true;if(!prop){fieldAssistant.hide();goalSpeech();return;}
    guide.hide();fieldAssistant.say(engine.canAct(prop)?'O que vamos fazer? Escolha uma ação.':'Vamos chegar mais perto deste lugar?',{key:(prop.id||prop.name)+engine.canAct(prop)});
    if(prop.action?.startsWith('travel:')){$('#actionButton').textContent='Ir para lá';return;}
    $('#actionButton').hidden=true;$('#scanControls').hidden=true;
    const near=engine.canAct(prop),s=campaign.engine.state;
    inspectArt.src=prop.sprite==='nave_perfuradora'?'/assets/marte_tilemap/sprites/rocket.webp':prop.sprite?'/assets/marte_tilemap/sprites/'+prop.sprite+'.png':UI.icon(prop.role==='ship-control'?'build':prop.role==='ship-rest'?'avatar':prop.role==='ship-supply'?'materials':prop.role==='ship-exit'?'ship':'map').src;
    function field(label,fn,blocked=false,task){const b=button(fieldActions,label,()=>{if(!engine.canAct(prop))throw Error('Chegue mais perto.');const world=engine.map.id;fn();if(!dialog.open&&engine.map.id===world&&engine.inspectedObject===prop)inspect(prop);},!near||blocked||!!(task&&!campaign.engine.availableActions()[task].enabled)||campaign.meta.result!=='active');if(task){const cost=element('div','cost-row');for(const [key,value]of Object.entries(scenario.activities[task].reserved))if(value)cost.append(UI.chip(key,value));cost.append(element('small','time-cost',scenario.activities[task].durationTicks+' etapas'));b.append(cost);}}
    if(prop.role==='ship-exit'){
      field('Sair da nave',()=>{engine.closeInspection();switchWorld('mapa_01_pouso');});
    }else if(prop.role==='ship-control'){
      field('Minha base',()=>open('base'));
      if(campaign.objectives().every(o=>o.done))field('Voltar à Terra',()=>{open('mission');renderReturn();});
    }else if(prop.role==='ship-rest'){
      field('Descansar',()=>campaign.start('rest'),false,'rest');
    }else if(prop.role==='ship-window'){
      field('Minha missão',()=>open('mission'));
    }else if(prop.sprite==='habitat_circular'){
      $('#inspectDescription').textContent='Terminal de suporte vital. Ative a base, reforce o abrigo e administre os recursos compartilhados.';
      if(!s.systems.baseOnline)field('Ligar base',()=>campaign.start('activateBase'),false,'activateBase');
      else field('Minha base',()=>open('base'));
    }else if(prop.sprite==='antena'){
      if(!s.systems.commsBuilt)field('Montar antena',()=>campaign.start('buildComms'),false,'buildComms');
      else if(!s.systems.contactOnline)field('Ligar antena',()=>campaign.start('connectComms'),false,'connectComms');
      else field('Mensagens',()=>open('journal'));
    }else if(prop.sprite==='nave_perfuradora'){
      field('Entrar na nave',()=>{engine.closeInspection();switchWorld('mars01_ship_interior');});
      field('Preparar volta',()=>{open('mission');renderReturn();},campaign.objectives().some(o=>!o.done));
      field('Minha missão',()=>open());
    }else if(prop.sprite==='rover'||prop.type==='rover'){
      $('#inspectDescription').textContent='Módulo fictício de arquivos do Opportunity / MER-B. Recupere os dados após analisar uma amostra e estabelecer comunicação.';
      field('Salvar arquivos',()=>campaign.start('recoverRover'),!!s.systems.roverRecovered,'recoverRover');
    }else if(prop.sector){field('Abrir setor',()=>open(prop.sector==='labBuilt'?'science':'base',prop.sector==='greenhouseBuilt'?'plants':'care'));}
    else if(prop.sprite==='painel_solar')field('Ver energia',()=>open('base','power'));
    if(scenario.supplies[prop.id]){
      const claimed=s.systems.claimedSupplies?.includes(prop.id),supply=scenario.supplies[prop.id];
      const rewards=element('div','inspect-supply');for(const [key,value]of Object.entries(supply))rewards.append(UI.chip(key,'+'+value));fieldActions.append(rewards);field(claimed?'✓ Peguei':'Pegar recursos',()=>campaign.command('claimSupply',{id:prop.id}),claimed);
    }
    if((prop.action==='scan'||prop.resource==='amostras')&&!s.systems.sampleCollected){field('Pegar amostra',()=>{campaign.start('collectSample');campaign.meta.sample={id:'AM-01',location:engine.map.name,material:prop.resource||prop.name};},false,'collectSample');}
    if(!fieldActions.children.length)field('Ver descoberta',()=>open('science'));
    if(s.activeActivity)fieldActions.append(element('small','inspect-work',`${TASKS[s.activeActivity.type]?.[0]||'Trabalhando'} · ${s.activeActivity.remainingTicks} etapas`));
    $('#inspectInfo').textContent=near?'Escolha uma ação.':'Chegue mais perto.';
  }
  engine.onInspect=inspect;
  function renderReturn(){
    special='return';
    content.replaceChildren();const c=card('O que você aprendeu?',true),input=element('textarea',''),choices=element('div','action-grid'),buttons=[];input.maxLength=600;input.setAttribute('aria-label','Minha descoberta');
    for(const [label,art,text]of [['Guardei energia','energy','Guardei energia para a noite e cuidei da equipe.'],['Reciclei água','waterClean','Reciclei a água para ter mais água limpa.'],['Usei o abrigo','shelter','Protegi meus amigos dentro do abrigo.']]){const b=UI.tile({label,icon:art,onClick:()=>{input.value=text;for(const other of buttons)other.setAttribute('aria-pressed',String(other===b));}});b.setAttribute('aria-pressed','false');buttons.push(b);choices.append(b);}c.append(choices);
    const detail=element('details','secondary-details');detail.append(element('summary','','Escrever do meu jeito'),input);c.append(detail);
    button(c,'Voltar à Terra',()=>{const ship=engine.map.props.find(p=>p.sprite==='nave_perfuradora'||p.role==='ship-control');if(!atBase()||!engine.canAct(ship))throw Error('Volte à nave.');campaign.finish(input.value);tab='mission';special=null;}).setAttribute('aria-label','Confirmar embarque e concluir missão');content.append(c);
  }
  function refresh(){
    const s=campaign.engine.state;
    const earned=campaign.badges().filter(b=>b.done),newBadge=earned.find(b=>!knownBadges.has(b.id));
    knownBadges=new Set(earned.map(b=>b.id));
    if(newBadge)notify(`${newBadge.icon} Medalha: ${newBadge.label}! +50 estrelas`);
    for(const [key,meter]of Object.entries(hudMeters)){const r=s.resources[key],percent=Math.round(r.amount/r.capacity*100);meter.amount.textContent=percent+'%';UI.setMeter(meter.track,percent);meter.item.dataset.level=percent<25?'low':percent<50?'watch':'good';meter.item.setAttribute('aria-label',`${names[key]}: ${percent}%. Abrir cuidados da equipe.`);}
    goalSpeech();
    updateClock();
    const alert=s.tick>=29&&s.tick<=36?s.team.location==='shelter'?'RADIAÇÃO · equipe protegida':'RADIAÇÃO · ocupe o abrigo':s.systems.filterCondition===0?'FILTRO · manutenção necessária':s.tick>=12&&s.tick<20?'POEIRA · confira a bateria':'';
    $('#missionCompact').textContent=alert?`${alert} · B`:`SOL ${Math.floor(s.tick/16)+1} · ${campaign.objectives().filter(o=>o.done).length}/8 objetivos · B`;
    launcher.dataset.alert=String(!!alert||campaign.meta.result==='failed'||['oxygen','waterClean','food'].some(k=>s.resources[k].amount/s.resources[k].capacity<.2));
    for(const world of worlds)for(const prop of world.props){
      if(prop.sector)prop.built=!!s.systems[prop.sector];
      prop.completed=!!s.systems.claimedSupplies?.includes(prop.id)||(prop.sprite==='rover'&&!!s.systems.roverRecovered)||(prop.sprite==='antena'&&!!s.systems.contactOnline);
    }
    const storm=s.tick>=12&&s.tick<20;
    engine.moodKey=engine.map.interior?'clear':storm?'storm':s.tick%16>=12?'night':engine.map.weather;
    engine.renderer.campaignState=s;
    const crop=CROPS[s.crop?.cropId];if(crop){const frame=Math.max(1,Math.min(crop.frames,Math.ceil((1-s.crop.remainingTicks/crop.growthTicks)*crop.frames)));loadImage(`crop-${crop.plant}-${frame}`,`/assets/growing_plants/${crop.plant}/${crop.plant}_${frame}.png`).then(img=>{if(img)engine.renderer.cropImage=img;});}else engine.renderer.cropImage=null;
    return newBadge;
  }
  const images=new Map();
  function loadImage(key,url){if(!images.has(key))images.set(key,new Promise(resolve=>{const img=new Image();img.onload=()=>{engine.loadAsset(key,img);resolve(img);};img.onerror=()=>{console.warn('Asset indisponível:',url);notify('Um desenho não carregou. Você pode continuar a aventura!');resolve(null);};img.src=url;}));return images.get(key);}
  loadImage('landed-rocket','/assets/marte_tilemap/sprites/rocket.webp');
  loadImage('mars-terrain','/assets/marte_tilemap/tileset_terreno.png');
  loadImage('crew-hd','/assets/astronaut/explorer-v2.png').then(image=>{if(!image){loadImage('crew-idle','/assets/Space Runner Assets - 27-11-20/Astronaut/Astronaut_Idle.png');loadImage('crew-run','/assets/Space Runner Assets - 27-11-20/Astronaut/Astronaut_Run.png');}});
  const landing=worlds.find(w=>w.id==='mapa_01_pouso');
  // Plataformas não bloqueiam o caminho. Procura áreas livres para não cobrir assets existentes.
  for(const [sector,name,asset]of [['greenhouseBuilt','Estufa','habitat_circular'],['labBuilt','Laboratório','bacia_pesquisa'],['dormitoryBuilt','Dormitório','habitat_circular']]){
    let point=null;for(let y=2;y<landing.height-3&&!point;y++)for(let x=12;x<landing.width-4;x++){
      const free=[0,1,2].every(dy=>[0,1,2].every(dx=>landing.grid[y+dy][x+dx]>1));
      if(free&&!landing.props.some(p=>x<p.x+p.w+.4&&x+2.5>p.x-.4&&y<p.y+p.h+.4&&y+2.5>p.y-.4)){point={x,y};break;}
    }
    if(point){landing.props.push({id:'sector-'+sector,type:'campaignSector',sector,name,description:'Plataforma de expansão da base. A construção exige materiais, energia e tempo.',x:point.x,y:point.y,w:2.5,h:2.5,solid:false,important:true,action:'log',asset:'structure-'+sector});loadImage('structure-'+sector,`/assets/marte_tilemap/sprites/${asset}.png`);}
  }
  landing.props.sort((a,b)=>(a.y+a.h)-(b.y+b.h));
  engine.campaignMode=true;
  // Compatibilidade com a API do atlas: percentual derivado, sem segundo saldo.
  Object.defineProperty(engine,'energy',{configurable:true,get(){const r=campaign.engine.state.resources.energy;return r.amount/r.capacity*100;},set(){}});
  function restorePosition(){
    const world=worlds.find(w=>w.id===campaign.meta.world)||landing;
    const p=campaign.meta.position;switchWorld(world.id);
    if(p&&p.x>=0&&p.y>=0&&p.x<world.width&&p.y<world.height&&!engine.collides(p.x,p.y))Object.assign(engine.player,p);
    else Object.assign(engine.player,{x:world.spawn[0],y:world.spawn[1]});
  }
  function updateClock(){liveClock.textContent=campaign.meta.result!=='active'?'FIM DA MISSÃO':engine.paused||dialog.open||engine.inspectedObject?'Ⅱ PAUSA':'▶ VIDA ATIVA · '+Math.ceil(20-campaign.meta.liveSeconds)+'s';}
  function syncLocation(){
    if(engine.map.interior)campaign.setLocation('ship');
    else if(campaign.engine.state.team.location==='ship')campaign.setLocation('outside');
    else if(engine.player.moving&&campaign.engine.state.team.location==='shelter'&&!engine.map.props.some(p=>p.sprite==='habitat_circular'&&engine.canAct(p)))campaign.setLocation('outside');
  }
  restorePosition();syncLocation();refresh();
  const originalSetMap=engine.setMap.bind(engine);engine.setMap=map=>{if(engine.map.interior&&!map.interior)campaign.meta.exitedShip=true;originalSetMap(map);syncLocation();refresh();save();};
  const update=engine.update.bind(engine);let hudTimer=0;
  engine.update=delta=>{
    update(delta);syncLocation();
    const changed=campaign.elapse(delta,engine.paused||document.hidden||dialog.open||!!engine.inspectedObject);
    if(changed){const badge=refresh();save();if(campaign.meta.result==='failed'){open('mission');setFeedback('A equipe precisa descansar. Vamos ver o que aconteceu e tentar de novo?','warning');}else if(!badge)notify(campaign.advice().title);}
    hudTimer+=delta;if(hudTimer>.2){hudTimer=0;updateClock();}
  };
  window.addEventListener('pagehide',()=>{save();clearTimeout(speechTimer);guide.hide();dialogAssistant.hide();});setInterval(save,3000);
  window.marsCampaign={get campaign(){return campaign;},open,save,refresh,inspect,announce};
  window.lifeManagement={getState:()=>campaign.engine.getState(),save:()=>campaign.save()};
  if(!hasSaved||loadWarning||campaign.meta.result!=='active')open();
}};
