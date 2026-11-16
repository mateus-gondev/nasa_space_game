/* Interface, atlas, progresso persistente e ações dos cinco mundos de Marte. */
(async () => {
  await window.MARS_TILEMAP_READY;
  const config=window.MAP_ENGINE_CONFIG,worlds=window.MARS_WORLDS.list,byId=window.MARS_WORLDS.byId;
  const $=selector=>document.querySelector(selector);
  const loading=$('#toast');loading.textContent='Carregando a área de pouso…';loading.hidden=false;
  await Promise.all(worlds.filter(world=>world.tilemapImage).map(world=>new Promise(resolve=>{
    const image=new Image();image.onload=()=>{world.backgroundImage=image;resolve();};
    image.onerror=()=>{console.warn('Mapa sem imagem de fundo:',world.name);resolve();};image.src=world.tilemapImage;
  })));
  loading.hidden=true;
  const STORAGE_KEY='opportunity_mars_atlas_progress_v1';
  let saved={};try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{}}catch(_){saved={}}
  for(const world of worlds)for(const p of world.props)if(saved.completed?.[p.id])p.completed=true;
  const requestedWorld=new URLSearchParams(window.location.search).get('world');
  let campaignWorld;try{campaignWorld=JSON.parse(localStorage.getItem('opportunity.campaign.v1')||'null')?.meta?.world;}catch(_){}
  const arrival=new URLSearchParams(window.location.search).get('arrival')==='1';
  const initial=(arrival?byId.mars01_ship_interior:worlds.find(world=>world.id===requestedWorld))||worlds.find(world=>world.id===campaignWorld)||worlds[0];
  const canvas=$('#gameCanvas'),toast=$('#toast');
  const engine=new MapEngine({canvas,config,map:initial,onStateChange:updateInterface,onInspect:showInspection,onTravel:(id,spawn)=>switchWorld(id,spawn)});
  Object.assign(engine.player,{x:initial.spawn[0],y:initial.spawn[1]});
  if(Number.isFinite(saved.energy))engine.energy=Math.max(10,Math.min(100,saved.energy));
  if(Number.isFinite(saved.odometer))engine.odometer=saved.odometer;
  if(Number.isFinite(saved.collected))engine.collected=saved.collected;
  const journal=Array.isArray(saved.journal)?saved.journal.slice(0,30):[];
  if(!journal.length)journal.push({text:'MER-B ONLINE: explore as cinco regiões de Marte. Aproximar-se de um objeto permite executar a ação.',world:initial.short,time:'INICIALIZAÇÃO'});
  let activeAction=null,toastTimeout=0,atlasWasPaused=false;
  const actionTitles={scan:'ANALISAR AMOSTRA',beacon:'ATIVAR / SINCRONIZAR',charge:'RECARREGAR SISTEMAS',collect:'RECOLHER SUPRIMENTOS',log:'ARQUIVAR REGISTRO',travel:'VIAJAR PARA REGIÃO'};
  function persist(){
    const completed={};for(const w of worlds)for(const p of w.props)if(p.completed)completed[p.id]=true;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({world:engine.map.id,completed,energy:engine.energy,odometer:engine.odometer,collected:engine.collected,journal:journal.slice(0,30)}));}catch(e){console.warn('Progresso local indisponível',e)}
  }
  function notify(message){if(window.marsCampaign?.announce){toast.hidden=true;window.marsCampaign.announce(message);return;}toast.textContent=message;toast.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>toast.hidden=true,3700);}
  function addJournal(text){journal.unshift({text,world:engine.map.short,time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});while(journal.length>30)journal.pop();persist();}
  function counts(world=engine.map){const scans=world.props.filter(p=>p.action==='scan'),beacons=world.props.filter(p=>p.action==='beacon');return{scan:scans.filter(p=>p.completed).length,beacon:beacons.filter(p=>p.completed).length,total:Math.min(3,scans.filter(p=>p.completed).length)+Math.min(1,beacons.filter(p=>p.completed).length),goal:4};}
  function switchWorld(id,spawn){const target=byId[id];if(!target)return;
    if(!$('#atlasModal').hidden)closeAtlas();
    if(engine.map.id===id){notify('Este setor já está ativo.');return;}
    engine.setMap(target);
    if(spawn)Object.assign(engine.player,{x:spawn[0],y:spawn[1]});
    resizeViewport();
    updateInterface();persist();notify(`Travessia concluída: ${target.name}`);
  }
  function updateInterface(state=engine.getState()){
    const atlasOpen=!$('#atlasModal').hidden,blocked=state.paused||atlasOpen||!!engine.inspectedObject||!!engine.cameraOpen;
    const pauseOverlay=$('#pausedOverlay'),wasHidden=pauseOverlay.hidden;
    pauseOverlay.hidden=!state.paused||atlasOpen||!!engine.cameraOpen||!!$('#missionDialog')?.open;
    engine.controls.enabled=!state.paused&&!atlasOpen&&!engine.cameraOpen;
    if(blocked)engine.controls.keys.clear();
    canvas.inert=blocked;
    $('#stage').dataset.blocked=String(blocked);
    $('#interactionHint').hidden=blocked||!engine.nearObject;
    if(engine.nearObject&&!engine.inspectedObject)$('#interactionHint').textContent=`[E] ${engine.nearObject.name.toUpperCase()}`;
    if(wasHidden&&!pauseOverlay.hidden)$('#pauseButton').focus();
  }
  function showInspection(prop){
    $('#inspectCard').hidden=!prop;activeAction=prop;
    updateInterface();
    if(!prop){if(!engine.paused&&$('#atlasModal').hidden)canvas.focus();return;}
    $('#closeInspect').focus();
    $('#inspectTitle').textContent=prop.name;$('#inspectDescription').textContent=prop.description;
    const command=prop.action?.split(':')[0],isNear=engine.canAct(prop),already=prop.completed&&command!=='charge'&&command!=='travel';
    $('#inspectInfo').textContent=already?'✓ CONCLUÍDO':isNear?'● ALCANCE DE INTERAÇÃO OK':`⚠ DISTÂNCIA: ${engine.distanceTo(prop).toFixed(1)} TILES. APROXIME-SE.`;
    const btn=$('#actionButton');btn.hidden=!command;btn.disabled=!isNear||already;
    btn.textContent=already?'✓ DADOS REGISTRADOS':!isNear?'APROXIME-SE PARA INTERAGIR':actionTitles[command]||'INTERAGIR';
    $('#scanControls').hidden=command!=='scan'||already||!isNear;
    if(command==='scan'&&!already&&isNear){
      $('#scanRange').value=50;
      updateScan();
    }
  }
  function scanTarget(prop){return 25+((prop.x*11+prop.y*7+engine.map.seed)%51)}
  function updateScan(){if(!activeAction||activeAction.action!=='scan')return;
    const target=scanTarget(activeAction),value=Number($('#scanRange').value),delta=Math.abs(value-target);
    $('#scanValue').textContent=value;
    $('#scanHint').textContent=`Pico de referência: ${target} · Diferença: ${delta} · ${delta<=7?'ALINHADO ✓':'AJUSTE A FREQUÊNCIA'}`;
    $('#actionButton').disabled=!engine.canAct(activeAction)||delta>7;
  }
  $('#scanRange').addEventListener('input',updateScan);
  function act(){const prop=engine.inspectedObject;if(!prop||!prop.action)return;
    if(!engine.canAct(prop)){notify('Aproxime-se do equipamento para interagir.');return;}
    const [type,destination]=prop.action.split(':');
    if(prop.completed&&!['charge','travel'].includes(type)){notify('Registro já concluído.');return;}
    if(type==='travel'){engine.closeInspection();switchWorld(destination,prop.destinationSpawn);return;}
    if(type==='scan' && Math.abs(Number($('#scanRange').value)-scanTarget(prop))>7){notify('A frequência precisa ser alinhada antes da análise.');return;}
    if(type==='charge'){engine.restoreEnergy(35);addJournal(`Recarga efetuada em ${prop.name}: +35% de energia disponível.`);notify('Baterias recarregadas (+35%).');}
    else{
      prop.completed=true;
      if(type==='collect')engine.collected++;
      if(type==='scan')engine.energy=Math.max(3,engine.energy-2);
      if(type==='beacon')engine.energy=Math.max(3,engine.energy-1);
      const messages={scan:'Análise espectral registrada',beacon:'Enlace sincronizado',collect:'Suprimento recolhido',log:'Registro arquivado'};
      addJournal(`${messages[type]||'Ação concluída'}: ${prop.name}.`);
      notify(`${messages[type]||'Ação concluída'}!`);
    }
    showInspection(prop);updateInterface();persist();
  }
  $('#actionButton').addEventListener('click',act);
  $('#closeInspect').addEventListener('click',()=>engine.closeInspection());
  function togglePause(){engine.setPaused();if(!engine.paused)canvas.focus();}
  $('#pauseButton').addEventListener('click',togglePause);
  $('#touchMenuButton').addEventListener('click',togglePause);
  $('#resetButton').addEventListener('click',()=>{const energy=engine.energy;engine.reset();engine.energy=energy;updateInterface();persist();canvas.focus();resizeViewport();notify('Posição reiniciada neste setor.');});
  canvas.addEventListener('click',event=>{if(!$('#atlasModal').hidden)return;const rect=canvas.getBoundingClientRect(),cam=engine.renderer.cam||{x:0,y:0},view=config.camera.viewTiles,tile=config.grid.tileSize;
    engine.inspectObjectAt(cam.x/tile+(event.clientX-rect.left)/rect.width*view.w,cam.y/tile+(event.clientY-rect.top)/rect.height*view.h);
  });
  window.addEventListener('keydown',ev=>{
    if(document.querySelector('#missionDialog')?.open||engine.cameraOpen)return;
    const key=ev.key.toLowerCase();
    if(ev.repeat)return;
    if(key==='escape'){
      ev.preventDefault();ev.stopImmediatePropagation();
      if(!$('#atlasModal').hidden)closeAtlas();
      else if(engine.inspectedObject)engine.closeInspection();
      else togglePause();
    }else if(!['INPUT','TEXTAREA','SELECT'].includes(ev.target.tagName)&&['m','p'].includes(key)){
      ev.preventDefault();ev.stopImmediatePropagation();
      if(key==='m'){if($('#atlasModal').hidden)openAtlas();else closeAtlas();}
      else if($('#atlasModal').hidden&&!engine.inspectedObject)togglePause();
    }
  },true);
  const shortView=Math.min(config.camera.viewTiles.w,config.camera.viewTiles.h);
  function resizeViewport(){
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const aspect=rect.width/rect.height,tile=config.grid.tileSize;
    const viewHeight=Math.min(shortView*Math.max(1,1/aspect),engine.map.height,engine.map.width/aspect);
    const width=Math.floor(viewHeight*tile*aspect),height=Math.floor(viewHeight*tile);
    config.camera.viewTiles.w=width/tile;config.camera.viewTiles.h=height/tile;
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;engine.renderer.camera=null;}
    engine.renderer.render({time:engine.elapsed,player:engine.player,mood:engine.mood,nearObject:engine.nearObject,doors:engine.map.doors});
  }
  function drawAtlas(){const c=$('#atlasCanvas'),ctx=c.getContext('2d'),W=c.width,H=c.height;
    ctx.fillStyle='#0a0e16';ctx.fillRect(0,0,W,H);
    let n=1729;const rnd=()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};
    for(let i=0;i<170;i++){ctx.fillStyle=`rgba(243,231,210,${.12+rnd()*.4})`;ctx.fillRect(rnd()*W,rnd()*H,1.5,1.5);}
    ctx.save();ctx.beginPath();ctx.ellipse(W/2,H/2,360,143,0,0,Math.PI*2);ctx.clip();
    let grad=ctx.createLinearGradient(120,20,760,300);grad.addColorStop(0,'#7f483f');grad.addColorStop(.32,'#b56447');grad.addColorStop(.68,'#91442e');grad.addColorStop(1,'#562a28');ctx.fillStyle=grad;ctx.fillRect(70,0,720,H);
    for(let i=0;i<230;i++){const x=70+rnd()*720,y=rnd()*H,r=2+rnd()*31;ctx.fillStyle=rnd()>.5?'rgba(38,17,22,.13)':'rgba(246,190,125,.10)';ctx.beginPath();ctx.ellipse(x,y,r,r*.4,rnd()*Math.PI,0,Math.PI*2);ctx.fill();}
    for(let i=0;i<34;i++){const x=90+rnd()*670,y=10+rnd()*290,r=4+rnd()*14;ctx.strokeStyle='#f5b27a55';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#2f171744';ctx.beginPath();ctx.arc(x,y,r*.7,0,Math.PI*2);ctx.fill();}
    ctx.restore();
    const points=worlds.map((_,i)=>[95+(i%5)*166,100+Math.floor(i/5)*105]);
    ctx.strokeStyle='#f6dcb1a0';ctx.lineWidth=2;ctx.setLineDash([6,8]);ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.setLineDash([]);
    points.forEach(([x,y],i)=>{const world=worlds[i],active=world.id===engine.map.id;ctx.beginPath();ctx.arc(x,y,active?11:8,0,Math.PI*2);ctx.fillStyle=active?'#a6f2e4':'#ffd2a0';ctx.fill();ctx.strokeStyle='#171d20';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.font='bold 12px monospace';ctx.fillText(world.short,x,y-19);});
    ctx.fillStyle='#8ecbff';ctx.font='11px monospace';ctx.textAlign='left';ctx.fillText('SEUS LUGARES EM MARTE',15,H-12);
  }
  function openAtlas(){
    if(!$('#atlasModal').hidden)return;
    engine.closeInspection();atlasWasPaused=engine.paused;
    $('#atlasModal').hidden=false;engine.setPaused(true);
    $('#atlasChoices').replaceChildren(...worlds.map(w=>{const b=window.MarsUI.tile({label:w.short,icon:w.interior?'ship':'map',detail:w.id===engine.map.id?'✓ Você está aqui':'Ir para cá',onClick:()=>switchWorld(w.id)});b.className+=' atlas-choice'+(w.id===engine.map.id?' active':'');return b;}));
    drawAtlas();$('#closeAtlas').focus();
  }
  function closeAtlas(){$('#atlasModal').hidden=true;engine.controls.keys.clear();engine.setPaused(atlasWasPaused);if(!engine.paused)canvas.focus();}
  $('#atlasButton').addEventListener('click',openAtlas);$('#closeAtlas').addEventListener('click',closeAtlas);
  $('#atlasModal').addEventListener('click',e=>{if(e.target===$('#atlasModal'))closeAtlas();});
  updateInterface();resizeViewport();
  new ResizeObserver(resizeViewport).observe($('#stage'));
  canvas.focus();
  const camera=window.MarsCameraUI.mount({engine,updateInterface});
  // API compatível com a Map Engine original e extensões para o atlas.
  window.opportunityMap={engine,worlds,goToWorld:switchWorld,goToRoom:name=>engine.goToRoom(name),setAtmosphere:key=>engine.setAtmosphere(key),
    pause:()=>engine.setPaused(true),resume:()=>engine.setPaused(false),reset:()=>engine.reset(),openAtlas,openCamera:camera.open,closeCamera:camera.close,
    inspect:name=>{const p=engine.map.props.find(x=>x.name?.toLowerCase()===name.toLowerCase());if(p){engine.inspectedObject=p;engine.onInspect(p)}},
    addProp:prop=>{if(!prop?.type||!Number.isFinite(prop.x)||!Number.isFinite(prop.y))throw Error('type/x/y obrigatórios');engine.map.props.push({w:1,h:1,solid:false,...prop});engine.map.props.sort((a,b)=>(a.y+a.h)-(b.y+b.h));},
    loadAsset:(name,url)=>{const img=new Image();img.onload=()=>engine.loadAsset(name,img);img.src=url;},
    getProgress:()=>worlds.map(w=>({id:w.id,...counts(w)})),getWorld:()=>engine.map.id};
  console.info('Opportunity Mars Atlas carregado: cinco mapas + ações científicas e persistência local.');
  await window.MarsCampaignUI.mount({engine, worlds, notify, switchWorld, updateInterface, openAtlas, openCamera:camera.open});
  updateInterface();engine.start();
})().catch(error=>{console.error(error);const toast=document.querySelector('#toast');toast.textContent='Falha ao carregar os mapas. Recarregue a página para tentar novamente.';toast.hidden=false;});
