/* Interior caminhável da MARS 01. A porta liga a nave à área externa. */
window.MARS_TILEMAP_READY=window.MARS_TILEMAP_READY.then(()=>{
  const width=26,height=18,grid=Array.from({length:height},()=>Array(width).fill(0));
  function room(x,y,w,h){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)grid[yy][xx]=2;}
  room(8,2,10,4);room(3,6,20,7);room(10,13,6,3);
  const floors=grid.map(row=>[...row]);
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++)if(!floors[y][x]&&[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([a,b])=>floors[b][a]===2))grid[y][x]=1;
  const props=[
    {id:'ship-control',type:'console',x:10,y:2.5,w:6,h:1,solid:true,name:'Painel da nave',role:'ship-control',description:'Aqui você cuida da equipe. Ar, água, comida e energia já estão funcionando!',action:'log'},
    {id:'ship-bed-left',type:'bench',x:3.5,y:8,w:3,h:1,solid:true,name:'Cantinho do descanso',role:'ship-rest',description:'Uma pausa ajuda toda a equipe a recuperar as forças.',action:'log'},
    {id:'ship-bed-right',type:'bench',x:19.5,y:8,w:3,h:1,solid:true,name:'Cantinho do descanso',role:'ship-rest',description:'Uma pausa ajuda toda a equipe a recuperar as forças.',action:'log'},
    {id:'ship-emergency',type:'crate',x:4,y:11,w:1.5,h:1,solid:true,name:'Caixa de ajuda',role:'ship-supply',description:'Uma reserva para quando a equipe precisar. Você pode usá-la uma vez.',action:'collect'},
    {id:'ship-window',type:'screen',x:10,y:5,w:6,h:1,solid:true,name:'Janela para Marte',role:'ship-window',description:'Você chegou! Prepare sua equipe e descubra o planeta vermelho.',action:'log'},
    {id:'ship-airlock',type:'shipAirlock',x:11,y:14,w:4,h:1,solid:false,name:'Porta para Marte',role:'ship-exit',description:'O traje está pronto. Abra a porta para explorar a área de pouso.',action:'log'}
  ].map(p=>({...p,important:true,completed:false}));
  const ship={id:'mars01_ship_interior',name:'Dentro da nave MARS 01',short:'MINHA NAVE',subtitle:'Seu primeiro lar em Marte',interior:true,width,height,spawn:[13,10.5],weather:'clear',seed:777,grid,floorMap:grid.map(row=>row.map(()=>2)),props,doors:[],transitions:[],lights:[[5,7],[20,7],[11,13],[14,13]],rooms:[{name:'Nave MARS 01',x1:0,y1:0,x2:25,y2:17}],roomLabels:[],decals:[],floorDecals:[],destinations:[{name:'Entrada',x:13,y:10.5}]};
  window.MARS_WORLDS.list.unshift(ship);window.MARS_WORLDS.byId[ship.id]=ship;
});
