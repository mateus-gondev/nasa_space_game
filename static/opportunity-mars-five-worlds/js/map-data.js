/*
 * MARS WORLD ATLAS — cinco mapas 128x92 na API da Map Engine V2.
 * Coordenadas em tiles. Geração determinística por seed, sem sprites externos.
 * Cenários estilizados inspirados na travessia do Opportunity (não topografia exata).
 */
window.MARS_WORLDS = (() => {
  const W = 128, H = 92;
  const defs = [
    {id:'meridiani',name:'01 · Meridiani Planum',short:'MERIDIANI',subtitle:'O pouso e a primeira descoberta',chapter:'2004 · O DESPERTAR',seed:101,weather:'clear',spawn:[70,51],color:'#dc8757',palette:['#ad603c','#c47548','#8f4938','#e0a16b','#703a32','#d99b66','#b77953'],
     zones:['Cratera Eagle','Plataforma de Pouso','Planície dos Hematitos','Campo de Antenas'],craters:[[23,25,12],[105,21,8],[27,75,10],[105,73,13],[79,15,5]],ridges:[[9,51,30,14],[89,64,19,7]],
     points:[
       ['lander',59,42,8,6,'Módulo de pouso Eagle','A plataforma que trouxe o rover à superfície. Inspecione as estruturas e os airbags já recolhidos.','log'],
       ['solar',43,53,7,4,'Painel solar de campanha','Recolha energia para continuar as operações científicas.','charge'],
       ['antenna',85,39,5,5,'Antena de retransmissão','Estabeleça uma janela de contato com o controle na Terra.','beacon'],
       ['sample',22,39,3,3,'Blueberries de hematita','Esférulas ricas em hematita encontradas na região: pistas sobre processos antigos envolvendo água.','scan'],
       ['sample',31,62,3,3,'Camadas de sedimento','Rochas estratificadas sugerem uma longa história geológica.','scan'],
       ['sample',103,57,3,3,'Afloramento salino','Depósitos ricos em sulfatos formam parte do enigma da água no passado.','scan'],
       ['sensor',16,65,3,3,'Estação de análise do solo','Ative os sensores de composição e registre os resultados.','beacon'],
       ['archive',78,24,3,3,'Arquivo de navegação','Registro dos primeiros sóis marcianos e da preparação das operações.','log'],
       ['cache',97,77,3,3,'Caixa de instrumentos','Suprimentos deixados para calibrações.','collect'],
       ['relay',111,44,4,4,'Sinal para Purgatory','Trilha de travessia até as dunas do setor seguinte.','travel:purgatory']
     ]},
    {id:'purgatory',name:'02 · Dunas de Purgatory',short:'PURGATORY',subtitle:'Areia, risco e resiliência',chapter:'2005 · A TRAVESSIA',seed:203,weather:'dust',spawn:[18,44],color:'#dfb37a',palette:['#b76b43','#d58c54','#9b5438','#e5aa69','#75422f','#edc085','#ad6b45'],
     zones:['Mar de Dunas','Purgatory Dune','Planície de Travessia','Observatório Oeste'],craters:[[14,23,9],[112,76,11],[90,18,7]],ridges:[[40,20,44,13],[36,56,52,16],[80,42,40,15]],
     points:[
       ['rover',56,46,6,4,'Rastro do atolamento','Uma armadilha de areia: rodas giram, mas quase não há deslocamento.','scan'],
       ['sensor',66,59,3,3,'Sensor de derrapagem','Compare deslocamento real e rotação das rodas para calibrar a navegação.','scan'],
       ['sample',38,28,3,3,'Amostra de areia fina','Analise a granulometria da duna e documente os riscos de tração.','scan'],
       ['sample',106,37,3,3,'Camada de poeira eólica','Depósitos do vento preservam padrões de deslocamento de sedimentos.','scan'],
       ['beacon',22,64,3,3,'Baliza da Rota Segura','Marque a trilha de retorno em um campo de dunas instável.','beacon'],
       ['antenna',98,65,4,4,'Estação de telemetria','Envie os dados de navegação à equipe na Terra.','beacon'],
       ['solar',15,51,6,3,'Recarga de segurança','Recupere energia antes da travessia pelas dunas.','charge'],
       ['cache',82,76,3,3,'Contêiner de manutenção','Kit de revisão para os testes após o atolamento.','collect'],
       ['archive',30,15,3,3,'Diário de Purgatory','A recuperação do Opportunity levou mais de cinco semanas.','log'],
       ['relay',117,49,3,4,'Rota para Victoria','Saída para a cratera Victoria.','travel:victoria'],
       ['relay',8,45,3,4,'Retorno a Meridiani','Trilha de volta à planície de pouso.','travel:meridiani']
     ]},
    {id:'victoria',name:'03 · Cratera Victoria',short:'VICTORIA',subtitle:'A grande borda e a poeira',chapter:'2006–2008 · O ABISMO',seed:307,weather:'sunset',spawn:[18,47],color:'#ba7550',palette:['#97503a','#ac6245','#713729','#cb875d','#522825','#d99b71','#875348'],
     zones:['Margem Ocidental','Cratera Victoria','Penhascos Estratificados','Acampamento de Pesquisa'],craters:[[70,45,29],[19,20,7],[111,75,8]],ridges:[[92,9,28,9],[104,48,16,25],[14,74,32,8]],
     points:[
       ['beacon',32,34,3,3,'Ponto Duck Bay','Marque um ponto de orientação na borda da cratera.','beacon'],
       ['sample',56,23,3,3,'Estratos da borda norte','Observe a sucessão de camadas expostas na encosta.','scan'],
       ['sample',87,68,3,3,'Afloramento sul','Identifique diferenças na textura das rochas.','scan'],
       ['sample',102,34,3,3,'Bloco erodido','Registre uma rocha isolada sobre a borda oriental.','scan'],
       ['antenna',20,60,5,4,'Retransmissor Victoria','Ative o enlace de dados de longa distância.','beacon'],
       ['sensor',75,78,3,3,'Medidor de opacidade','A poeira atmosférica reduz a luz solar disponível.','scan'],
       ['solar',11,37,6,4,'Refúgio de energia','Carregue as baterias durante uma pausa nas operações.','charge'],
       ['archive',39,72,3,3,'Relatório da tempestade','Em 2007, tempestades de poeira obrigaram o Opportunity a reduzir operações.','log'],
       ['cache',114,17,3,3,'Caixa de amostras','Instrumentos de referência para observações.','collect'],
       ['relay',116,57,3,4,'Travessia para Endeavour','Continuação da expedição até a próxima grande cratera.','travel:endeavour'],
       ['relay',7,49,3,4,'Voltar às dunas','Rota de retorno pelo campo de areia.','travel:purgatory']
     ]},
    {id:'endeavour',name:'04 · Borda de Endeavour',short:'ENDEAVOUR',subtitle:'Basalto, escarpas e novas pistas',chapter:'2011–2016 · ALÉM DO HORIZONTE',seed:409,weather:'clear',spawn:[17,47],color:'#bb6b53',palette:['#90473b','#a95a49','#603431','#c17a5c','#422b2c','#d58e67','#7b4b45'],
     zones:['Cape York','Cinturão Basáltico','Endeavour Rim','Planície de Sulfatos'],craters:[[96,42,32],[27,70,14],[40,17,6]],ridges:[[23,30,41,11],[29,73,38,13],[106,10,16,23]],
     points:[
       ['beacon',30,43,3,3,'Marco Cape York','Registre o ponto de chegada ao bordo da imensa cratera.','beacon'],
       ['sample',39,26,3,3,'Veio mineral claro','Estrutura mineral associada à circulação antiga de fluidos.','scan'],
       ['sample',64,72,3,3,'Rocha basáltica','Amostra escura de terreno vulcânico.','scan'],
       ['sample',106,22,3,3,'Argilas antigas','Investigue minerais que podem registrar condições aquosas antigas.','scan'],
       ['antenna',18,63,5,4,'Nó de comunicações','Sincronize os relatórios da nova etapa da missão.','beacon'],
       ['solar',21,36,6,3,'Plataforma de recarga','Ponto de recuperação energética durante a jornada.','charge'],
       ['sensor',68,26,3,3,'Estação espectral','Recolha dados sobre as diferenças entre camadas geológicas.','scan'],
       ['archive',47,61,3,3,'Diário dos 42 quilômetros','Em 2015, o Opportunity completou a distância de uma maratona em Marte.','log'],
       ['cache',93,79,3,3,'Ferramentas de campo','Conjunto de peças e consumíveis de missão.','collect'],
       ['relay',117,49,3,4,'Acesso a Perseverance','Entrada para o vale de exploração final.','travel:perseverance'],
       ['relay',7,48,3,4,'Retornar a Victoria','Volte ao perímetro da cratera anterior.','travel:victoria']
     ]},
    {id:'perseverance',name:'05 · Perseverance Valley',short:'PERSEVERANCE',subtitle:'Um vale, um último horizonte',chapter:'2017–2018 · O ÚLTIMO VALE',seed:503,weather:'storm',spawn:[15,48],color:'#ab6149',palette:['#8b4838','#ab674c','#63342f','#c58a62','#432829','#d29b72','#775247'],
     zones:['Entrada do Vale','Terraços Erodidos','Perseverance Valley','Mirante da Tempestade'],craters:[[18,19,10],[109,75,13],[95,16,8]],ridges:[[31,20,14,55],[56,10,14,75],[79,19,20,55]],
     points:[
       ['beacon',25,44,3,3,'Baliza do Vale','Registre o último corredor de navegação.','beacon'],
       ['sample',44,28,3,3,'Camada clara da encosta','Documente os sedimentos expostos no vale.','scan'],
       ['sample',73,51,3,3,'Depósito aluvial possível','Observe formas compatíveis com processos geológicos antigos.','scan'],
       ['sample',94,70,3,3,'Rocha da encosta oriental','Fotografe e registre o material da borda.','scan'],
       ['sensor',75,27,3,3,'Monitor de opacidade','A luz disponível diminui à medida que a poeira aumenta.','scan'],
       ['antenna',108,43,5,5,'Antena de emergência','Teste o enlace de comunicação da última região.','beacon'],
       ['solar',18,60,6,4,'Última estação solar','Faça uma recarga antes de seguir pelo vale.','charge'],
       ['archive',55,73,3,3,'Diário da missão','O último contato do Opportunity ocorreu em 10 de junho de 2018.','log'],
       ['cache',109,23,3,3,'Reserva de instrumentos','Kit de manutenção e telemetria.','collect'],
       ['relay',7,47,3,4,'Rota de Endeavour','Trilha que retorna à região anterior.','travel:endeavour']
     ]}
  ];
  const hash=(x,y,s)=>{let n=Math.imul((x|0)^s,374761393)+Math.imul((y|0)+s,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295};
  function rng(seed){let v=seed>>>0;return ()=>{v=(Math.imul(1664525,v)+1013904223)>>>0;return v/4294967296;};}
  function build(def){
    const rand=rng(def.seed);const grid=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>x===0||y===0||x===W-1||y===H-1?1:2));
    const floorMap=Array.from({length:H},()=>Array(W).fill(0));
    for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
      const broad=Math.sin(x*.085+def.seed)*.37+Math.sin(y*.115+def.seed*.12)*.32+Math.cos((x+y)*.052)*.17;
      const fine=(hash(x>>2,y>>2,def.seed)-.5)*.72+(hash(x,y,def.seed)-.5)*.12;
      const dunes=def.id==='purgatory'?Math.sin(x*.24+y*.14)*.46:0;
      const v=broad+fine+dunes;
      let type=v>.56?5:v>.19?3:v<-.62?4:v<-.30?2:v>.01?1:0;
      for(const [cx,cy,r] of def.craters){const d=Math.hypot(x-cx,y-cy);if(d<r*.73)type=4;else if(d<r*.88)type=2;else if(d<r*1.1)type=5;}
      for(const [cx,cy,rx,ry] of def.ridges){const v=Math.abs((x-cx)/rx)+Math.abs((y-cy)/ry);if(v<.78 && Math.sin(x*.16+y*.23)>.1)type=6;}
      floorMap[y][x]=type;
    }
    const props=[];
    const add=(type,x,y,w,h,name,description,action=null,extra={})=>props.push({id:`${def.id}-${props.length}`,type,x,y,w,h,name,description,solid:false,action,completed:false,...extra});
    // Esta é a malha de pontos de interesse; todos têm feedback e ações reais.
    def.points.forEach(([type,x,y,w,h,name,desc,action])=>add(type,x,y,w,h,name,desc,action,{important:true,solid:type==='lander'||type==='solar'}));
    // Pedras, rastros, depósitos e cascalho determinísticos (sem dependência de PNG externo).
    for(let i=0;i<290;i++){
      const x=3+Math.floor(rand()*(W-8)),y=3+Math.floor(rand()*(H-8));
      if(Math.hypot(x-def.spawn[0],y-def.spawn[1])<9)continue;
      if(props.some(p=>p.important&&Math.hypot(x-p.x,y-p.y)<5))continue;
      const roll=rand();const type=roll<.46?'rock':roll<.70?'boulder':roll<.89?'basalt':'debris';
      const w=type==='boulder'?1.4+rand()*1.1:.5+rand()*1.1;
      add(type,x,y,w,w*.8,null,'',null,{solid:false,decoration:true,variant:Math.floor(rand()*100)});
    }
    // Marcas de trilhas, sinais do terreno e anéis de crateras em escala de mapa.
    props.sort((a,b)=>(a.y+a.h)-(b.y+b.h));
    const floorDecals=[
      {k:'lane',pts:[[def.spawn[0],def.spawn[1]],[Math.min(W-6,def.spawn[0]+16),def.spawn[1]+4]],c:'rgba(250,191,124,.21)',w:2,dash:[3,12]},
      ...def.points.filter(p=>p[6]?.startsWith('travel')).map(p=>({k:'text',x:p[1]+1,y:p[2]-1,s:'SAÍDA',c:'rgba(250,204,139,.60)'}))
    ];
    const zones=def.zones.map((name,i)=>({name,tag:name.toUpperCase(),x1:(i%2)*64,y1:Math.floor(i/2)*46,x2:(i%2)*64+63,y2:Math.floor(i/2)*46+45,floor:0}));
    const destinations=[{name:'Pouso / Entrada',x:def.spawn[0],y:def.spawn[1]},
      {name:'Setor norte',x:W*.52,y:15},{name:'Setor sul',x:W*.50,y:H-14},
      {name:'Setor leste',x:W-16,y:H*.50}];
    return {id:def.id,worldId:def.id,name:def.name,short:def.short,subtitle:def.subtitle,chapter:def.chapter,weather:def.weather,color:def.color,seed:def.seed,spawn:def.spawn,
      width:W,height:H,palette:def.palette,grid,floorMap,props,doors:[],rooms:zones,roomLabels:[],lights:[],decals:[],floorDecals,destinations,
      features:{craters:def.craters,ridges:def.ridges},zones,goal:3};
  }
  const result=defs.map(build);
  return {list:result,byId:Object.fromEntries(result.map(w=>[w.id,w]))};
})();
window.MAP_DATA=window.MARS_WORLDS.list[0];
