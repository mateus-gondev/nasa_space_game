/* Campanha determinística. Recursos pertencem exclusivamente à LIFE. */
(function (root) {
  'use strict';
  const { MissionEngine } = typeof module === 'object' && module.exports ? require('../../../LIFE/engine') : root.LifeEngine;
  const KEY = 'opportunity.campaign.v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const LABELS = {activateBase:'Ativar suporte da base',buildGreenhouse:'Construir estufa',buildLab:'Construir laboratório',buildComms:'Montar comunicação',buildDormitory:'Ampliar dormitório',buildShelter:'Reforçar abrigo',transferToShelter:'Ocupar abrigo',repairFilter:'Reparar filtro',cleanPanels:'Limpar painéis',collectSample:'Extrair amostra',analyzeSample:'Analisar amostra',recoverRover:'Recuperar arquivos MER-B',recycleWater:'Reciclar água',rest:'Descansar',plant:'Plantar',harvest:'Colher',connectComms:'Estabelecer enlace'};
  const CROPS = {
    lettuce:{label:'Alface',growthTicks:6,yield:12,plantWater:3,waterPerTick:0.25,art:'/assets/250 pixel Veggie/32x32/lettuce_05.png',plant:'salad',frames:7},
    potato:{label:'Batata',growthTicks:12,yield:24,plantWater:6,waterPerTick:0.5,art:'/assets/250 pixel Veggie/32x32/potato_05.png',plant:'potato',frames:7},
    tomato:{label:'Tomate',growthTicks:9,yield:18,plantWater:4,waterPerTick:0.4,art:'/assets/250 pixel Veggie/32x32/tomato_05.png',plant:'tomat',frames:20}
  };
  function createScenario(base) {
    const s = clone(base);
    s.scenarioId='opportunity-campaign'; s.version='1.0.0';
    s.clock={tickMinutes:90,missionDurationTicks:96,maxAdvanceTicks:16};
    s.resources.energy={amount:36,capacity:48};
    s.resources.waterClean={amount:110,capacity:140};
    s.resources.food={amount:42,capacity:90};
    s.resources.oxygen={amount:50,capacity:90};
    s.resources.materials={amount:30,capacity:70};
    s.resources.seeds={amount:5,capacity:12};
    s.rates.fatigueWork=1;s.rates.fatigueRest=5;
    s.rates.outsideExposure=0;s.restUpgradeTicks=3;
    s.systemLabels={baseOnline:'base ativada',greenhouseBuilt:'estufa construída',labBuilt:'laboratório construído',commsBuilt:'antena montada',contactOnline:'enlace estabelecido',sampleCollected:'amostra extraída',sampleCompared:'comparação do espectro',sampleAnalyzed:'análise concluída'};
    s.resourceLabels={energy:'Energia',materials:'Materiais',waterClean:'Água limpa',seeds:'Sementes',repairParts:'Peças'};
    s.sample={id:'AM-01',elements:['Silício','Enxofre','Cálcio','Ferro'],peaks:[82,36,21,68],note:'Espectro ilustrativo não calibrado, inspirado na atividade APXS do protótipo narrativo.'};
    s.power.baseGeneration=12;s.power.cycle={ticks:16,daylightTicks:12};
    s.power.consumers.waterRecycler={demand:1,priority:4};
    s.limits.waterCritical=true;s.limits.exposureCritical=65;
    s.radiation={startAt:32,endAt:36,baseRate:0.05,stormRate:15};
    s.events=[{id:'solar-dust',type:'solarDust',warningAt:9,startAt:12,endAt:20,solarMultiplier:0.3,settledSolarCondition:0.65},{id:'filter-failure',type:'filterFailure',warningAt:24,startAt:26},{id:'communications-outage',type:'communicationsOutage',warningAt:39,startAt:40,endAt:43}];
    const task=(durationTicks,reserved,requires,systems,explanation,powerConsumer=null)=>({durationTicks,reserved,requires,powerConsumer,once:Object.keys(systems)[0],effects:{systems},explanation});
    Object.assign(s.activities,{
      activateBase:task(1,{},[],{baseOnline:true},'A nave fornece as reservas iniciais. A partir de agora, cada passo consome água, alimento e oxigênio.'),
      buildGreenhouse:task(3,{materials:6,energy:3},['baseOnline'],{greenhouseBuilt:true},'A estufa ocupa materiais que também poderiam proteger o abrigo. O cultivo ainda exige água e energia.'),
      buildLab:task(3,{materials:6,energy:3},['baseOnline'],{labBuilt:true},'O laboratório permite testar amostras, mas disputa materiais com a estufa e a blindagem.'),
      buildComms:task(2,{materials:4,energy:2},['baseOnline'],{commsBuilt:true},'A antena permite enviar relatórios. As respostas da Terra levam cinco passos.'),
      buildDormitory:task(2,{materials:4},['baseOnline'],{dormitoryBuilt:true},'O dormitório reduz a duração do descanso de seis para três passos.'),
      connectComms:task(1,{energy:1},['commsBuilt'],{contactOnline:true},'O enlace foi estabelecido; transmitir não elimina o atraso de comunicação.'),
      collectSample:task(2,{energy:2},['baseOnline'],{sampleCollected:true},'Uma amostra identificada foi extraída. Sua aparência ainda não comprova a composição.'),
      analyzeSample:task(3,{energy:2},['labBuilt','sampleCollected'],{sampleAnalyzed:true},'Os testes simulados revelam grãos e sais compatíveis com alteração por água; a hipótese exige outras evidências.','research'),
      recoverRover:task(3,{energy:3},['contactOnline','sampleAnalyzed'],{roverRecovered:true},'Arquivos históricos foram copiados de um módulo fictício MER-B. Não se trata de um novo sinal real do rover.'),
      cleanPanels:{durationTicks:2,reserved:{},requires:['baseOnline'],powerConsumer:null,effects:{systems:{solarCondition:1,panelsCleaned:true}},explanation:'Remover poeira exige trabalho externo e tempo; não remove a poeira suspensa da tempestade.'}
    });
    for (const [type,def] of Object.entries(s.activities)) def.label=LABELS[type]||type;
    s.activities.buildShelter.durationTicks=4;s.activities.buildShelter.requires=['baseOnline'];
    s.activities.plant.requires=['greenhouseBuilt'];
    s.activities.analyzeSample.requires.push('sampleCompared');
    s.activities.plant.reserved.waterClean=0;
    s.activities.recycleWater.powerConsumer='waterRecycler';
    s.activities.recycleWater.effects={systems:{waterRecycled:true}};
    s.activities.transferToShelter.effects={systems:{shelterVisited:true}};
    s.activities.repairFilter.effects={systems:{filterRepaired:true}};
    for(const type of ['collectSample','recoverRover','cleanPanels'])s.activities[type].location='outside';
    s.crops=clone(CROPS);
    s.supplies={'ship-emergency':{oxygen:20,waterClean:18,food:12,energy:12,repairParts:1}};
    return s;
  }
  class Campaign {
    constructor(scenario, saved, profile={}) {
      this.scenario=scenario;
      this.meta={version:1,name:String(profile.name||'Cadete').slice(0,40),training:[],report:null,world:'mars01_ship_interior',position:null,sample:null,finalMessage:null,reflection:'',result:'active',decisions:[],liveSeconds:0,powerMode:'safety',arrived:false};
      if(saved){
        if(saved.version!==1||!saved.meta||!Array.isArray(saved.meta.decisions)||!Array.isArray(saved.meta.training)||!['active','succeeded','failed'].includes(saved.meta.result)||typeof saved.meta.name!=='string')throw Error('Campanha incompatível.');
        this.engine=MissionEngine.restore(saved.life,scenario);
        const state=this.engine.state;
        if(!Object.keys(scenario.resources).every(key=>state.resources[key]&&state.resources[key].capacity===scenario.resources[key].capacity)||!['messages','resourceLedger','eventHistory','explanations'].every(key=>Array.isArray(state[key]))||![state.team?.fatigue,state.team?.exposure,state.systems?.co2].every(Number.isFinite)||state.activeActivity&&(!scenario.activities[state.activeActivity.type]||!Number.isInteger(state.activeActivity.remainingTicks)||state.activeActivity.remainingTicks<1))throw Error('Estado da missão inválido.');
        if(saved.meta.training.some(item=>!item||typeof item.title!=='string')||saved.meta.decisions.some(item=>!item||!Number.isInteger(item.tick)||typeof item.text!=='string'))throw Error('Registros inválidos.');
        this.meta={...this.meta,...clone(saved.meta)};
        if(!Number.isFinite(this.meta.liveSeconds)||this.meta.liveSeconds<0||this.meta.liveSeconds>=20)throw Error('Relógio inválido.');
        if(this.meta.position&&(!Number.isFinite(this.meta.position.x)||!Number.isFinite(this.meta.position.y)))throw Error('Posição inválida.');
      } else this.engine=MissionEngine.createMission({scenario,seed:7});
      this.sync();
    }
    command(type,payload={}) {
      if(this.meta.result!=='active')throw Error('A missão foi encerrada. Inicie uma nova tentativa.');
      const s=this.engine.state;
      return this.engine.execute({commandId:`campaign-${s.stateVersion+1}`,expectedStateVersion:s.stateVersion,type,payload});
    }
    beginMars(){
      if(this.meta.result!=='active')return;
      if(!this.engine.state.systems.baseOnline){
        if(!this.engine.state.activeActivity)this.start('activateBase');
        this.advance(this.engine.state.activeActivity.remainingTicks);
      }
      this.meta.arrived=true;
    }
    elapse(seconds,suspended=false){
      if(!Number.isFinite(seconds)||seconds<0)throw Error('Tempo inválido.');
      if(suspended||this.meta.result!=='active'||!this.engine.state.systems.baseOnline)return false;
      this.meta.liveSeconds+=Math.min(seconds,60);
      let changed=false;
      while(this.meta.liveSeconds+1e-9>=20&&this.meta.result==='active'){
        this.meta.liveSeconds=Math.max(0,this.meta.liveSeconds-20);this.advance();changed=true;
      }
      if(this.meta.result!=='active')this.meta.liveSeconds=0;
      return changed;
    }
    setLocation(location){
      if(this.meta.result!=='active'||this.engine.state.activeActivity?.type==='explore'||this.scenario.activities[this.engine.state.activeActivity?.type]?.location)return;
      if(this.engine.state.team.location!==location)this.command('setCrewLocation',{location});
    }
    applyPowerMode(mode){
      const modes={safety:{lifeSupport:1,airFilter:2,oxygenProduction:2,thermal:3,cultivation:5,research:6,waterRecycler:4},garden:{lifeSupport:1,airFilter:2,oxygenProduction:2,thermal:3,cultivation:3,research:6,waterRecycler:4},science:{lifeSupport:1,airFilter:2,oxygenProduction:2,thermal:3,cultivation:5,research:3,waterRecycler:4}};
      if(!modes[mode])throw Error('Escolha um plano de energia.');
      this.command('setPowerPriorities',{priorities:modes[mode]});this.meta.powerMode=mode;
      this.meta.decisions.push({tick:this.engine.state.tick,text:{safety:'Plano: cuidar da equipe',garden:'Plano: cuidar da horta',science:'Plano: descobrir'}[mode]});
    }
    badges(){
      const s=this.engine.state;
      return [{id:'landing',label:'Pouso tranquilo',icon:'🚀',done:this.meta.arrived},{id:'first-seed',label:'Minha primeira planta',icon:'🌱',done:s.eventHistory.some(e=>e.type==='cropPlanted')},{id:'evidence',label:'Olhar de cientista',icon:'🔎',done:!!s.systems.sampleCompared},...this.objectives().map((o,i)=>({id:'goal-'+i,label:['Equipe conectada','Cientista de Marte','Jardineiro espacial','Guardião da água','Equipe de reparos','Lugar seguro','Amigo do Opportunity','Pronto para voltar'][i],icon:['📡','🔬','🥬','💧','🔧','🛡','🤖','🌍'][i],done:o.done}))];
    }
    advice(){
      const s=this.engine.state,x=s.systems;
      if(this.meta.result!=='active')return {title:'Vamos ver nossa aventura!',text:'Suas escolhas estão guardadas no diário.',section:'mission'};
      if((s.resources.oxygen.amount<15||s.resources.food.amount<8||s.resources.waterClean.amount<15)&&!x.claimedSupplies?.includes('ship-emergency'))return {title:'Nossa reserva precisa de ajuda!',text:'Volte à nave e pegue a caixa de ajuda. Ela tem reservas para cuidar da equipe.',target:'ship-supply',section:'base'};
      if(s.activeActivity)return {title:'Nossa equipe está trabalhando!',text:`${LABELS[s.activeActivity.type]}. Você pode explorar ou ajudar a terminar.`,section:'base'};
      if(s.tick>=28&&s.tick<=36&&!x.shelterBuilt)return {title:'Vamos preparar um lugar seguro!',text:'Um alerta de radiação está chegando. Reforce o abrigo antes de continuar.',action:'buildShelter',section:'base'};
      if(s.tick>=29&&s.tick<=36&&s.team.location!=='shelter')return {title:'Hora de entrar no abrigo!',text:'Vá até o abrigo redondo e proteja a equipe.',action:'transferToShelter',target:'habitat_circular',section:'base'};
      if(s.tick>=29&&s.tick<=36&&s.team.location==='shelter')return {title:'Nossa equipe está protegida!',text:'Fique no abrigo até o alerta passar. Você pode planejar nossa próxima descoberta.',section:'base'};
      if(x.filterCondition===0)return {title:'O filtro precisa de uma peça!',text:'Vamos consertá-lo para deixar o ar limpo de novo.',action:'repairFilter',section:'base'};
      if(s.crop?.remainingTicks===0&&!s.crop.failed)return {title:'A horta está pronta!',text:'Hora de colher comida para seus amigos.',action:'harvest',section:'base'};
      if(s.resources.waterClean.amount<35&&s.resources.waterUsed.amount>=10)return {title:'Vamos salvar nossa água!',text:'O reciclador transforma a água usada em água limpa.',action:'recycleWater',section:'base'};
      if(s.tick>=20&&!x.panelsCleaned)return {title:'Tire a poeira dos painéis!',text:'Com painéis limpos, a luz do Sol vira mais energia.',action:'cleanPanels',section:'base'};
      if(!x.commsBuilt)return {title:'Vamos conversar com a Terra!',text:'Monte a antena para mandar notícias de Marte.',action:'buildComms',section:'base'};
      if(!x.contactOnline)return {title:'Ligue nossa antena!',text:'Encontre a antena na área de pouso e aperte E.',target:'antena',section:'mission'};
      if(!x.greenhouseBuilt)return {title:'Vamos fazer uma horta espacial!',text:'Construa a estufa para suas plantas ficarem protegidas.',action:'buildGreenhouse',section:'base'};
      if(!s.crop&&!s.objectives.cropHarvested)return {title:'Escolha sua primeira plantinha!',text:'Alface fica pronta mais rápido. Batata dá mais comida, mas usa mais água.',section:'base'};
      if(!x.shelterBuilt)return {title:'Um abraço de proteção!',text:'Reforce o abrigo para cuidar da equipe nos dias de alerta.',action:'buildShelter',section:'base'};
      if(!x.labBuilt)return {title:'Vamos montar um laboratório!',text:'Lá você vai conhecer os segredos das amostras.',action:'buildLab',section:'base'};
      if(!x.sampleCollected)return {title:'Caça às amostras!',text:'Encontre uma rocha brilhante, chegue perto e aperte E.',target:'minerio_ferroso',section:'science'};
      if(!x.sampleAnalyzed)return {title:'O que a rocha pode contar?',text:'Compare as barras mais altas e faça a análise no laboratório.',section:'science'};
      if(!x.roverRecovered)return {title:'Encontre o Opportunity!',text:'Explore a mineração e copie os arquivos do robozinho.',target:'rover',section:'mission'};
      return {title:'Quase prontos para voltar!',text:'Confira suas medalhas, mande o relatório e volte à nave.',section:'journal'};
    }
    start(type,payload={}) {
      const s=this.engine.state;
      if(type!=='activateBase'&&!s.systems.baseOnline)throw Error('Ative primeiro o abrigo da área de pouso.');
      if(type==='cleanPanels'&&s.tick<20)throw Error('Aguarde o fim da tempestade no passo 20 para limpar os painéis.');
      const result=this.command('startActivity',{activity:type,...payload});
      this.meta.decisions.push({tick:s.tick,text:LABELS[type]||type});
      return result;
    }
    advance(ticks=1) {
      if(!this.engine.state.systems.baseOnline&&this.engine.state.activeActivity?.type!=='activateBase')throw Error('Inicie a ativação da base no abrigo.');
      const result=this.command('advanceTime',{ticks});this.sync();return result;
    }
    forecast(ticks=1) {
      const preview=MissionEngine.restore(this.engine.save(),this.scenario);
      preview.execute({commandId:`preview-${preview.state.stateVersion}`,expectedStateVersion:preview.state.stateVersion,type:'advanceTime',payload:{ticks}});
      return preview.getState();
    }
    report(final=false) {
      if(!this.engine.state.systems.contactOnline)throw Error('Estabeleça o enlace na antena primeiro.');
      if(final&&!this.engine.state.systems.roverRecovered)throw Error('Recupere os arquivos antes de enviar o relatório final.');
      if(final&&this.meta.finalMessage)throw Error('O relatório final já foi enviado. Aguarde a resposta.');
      const result=this.command('sendEarthMessage',{text:final?'MER-B: arquivos recuperados. Solicito retorno da tripulação.':'Base Opportunity operacional. Seguem registros de campo e situação das reservas.'});
      if(final)this.meta.finalMessage=result.result.messageId;
      this.meta.decisions.push({tick:this.engine.state.tick,text:final?'Relatório final transmitido':'Relatório de situação transmitido'});
    }
    objectives() {
      const s=this.engine.state,x=s.systems;
      return [
        ['Ativar base e comunicação',!!x.baseOnline&&!!x.contactOnline,'Pouso: abrigo → antena.'],
        ['Extrair e analisar uma amostra',!!x.sampleAnalyzed,'Mineração/pesquisa: amostra; pouso: laboratório.'],
        ['Cultivar e colher alimento',s.objectives.cropHarvested,'Construa a estufa, escolha a cultura e reserve água.'],
        ['Reciclar água',!!x.waterRecycled,'A reciclagem usa energia e devolve 9 de cada 10 unidades.'],
        ['Atravessar poeira e reparar sistemas',s.tick>=28&&!!x.panelsCleaned&&!!x.filterRepaired,'Poeira: passos 12–20; filtro falha no passo 26.'],
        ['Reforçar e ocupar o abrigo',!!s.objectives.shelterBuilt&&!!x.shelterVisited&&s.tick>=36,'Alerta de radiação: passos 32–36. Permaneça no abrigo.'],
        ['Recuperar arquivos do Opportunity',!!x.roverRecovered,'Rover na bacia de mineração; exige análise e enlace.'],
        ['Receber autorização de retorno',s.messages.some(m=>m.id===this.meta.finalMessage&&m.status==='delivered'),'Envie relatório final; aguarde pelo menos cinco passos.']
      ].map(([label,done,hint])=>({label,done,hint}));
    }
    finish(reflection) {
      if(this.meta.result!=='active')throw Error('Esta tentativa já foi encerrada.');
      if(this.objectives().some(o=>!o.done))throw Error('Conclua o checklist antes de embarcar.');
      if(typeof reflection!=='string'||reflection.trim().length<12)throw Error('Registre uma escolha, seu custo e sua consequência (mínimo 12 caracteres).');
      this.meta.reflection=reflection.trim().slice(0,600);this.meta.result='succeeded';
    }
    sync(){if(this.engine.state.status!=='active'&&this.meta.result==='active')this.meta.result='failed';}
    save(){return {version:1,meta:clone(this.meta),life:this.engine.save()};}
  }
  const api={Campaign,createScenario,CROPS,LABELS,KEY};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.OpportunityCampaign=api;
})(globalThis);
