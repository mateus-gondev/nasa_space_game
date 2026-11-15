/** Self-contained demonstration map, NOT the application's MAP_DATA. */
export function createSampleMap(){
 const width=24,height=18;
 const grid=Array.from({length:height},(_,z)=>Array.from({length:width},(_,x)=> (z===0||z===height-1||x===0||x===width-1)?1:2));
 grid[height-1][11]=3;grid[height-1][12]=3;
 for(const [x,z] of [[6,7],[6,8],[17,7],[17,8]])grid[z][x]=1;
 const floorMap=Array.from({length:height},(_,z)=>Array.from({length:width},(_,x)=> {
   if((x>=10&&x<=13) && z>2 && z<height-1)return 'grate';
   if((x>2&&x<7&&z>10)||(x>17&&x<22&&z>10))return 'concrete';
   return 'lab';
 }));
 const props=[
  {type:'cabinet',name:'Storage Lockers',x:2,y:2,w:2,h:1},
  {type:'cabinet',x:4,y:2,w:1,h:1},
  {type:'rack',name:'Rack de dados',x:18,y:2,w:1.4,h:1},
  {type:'rack',x:20,y:2,w:1.1,h:1},
  {type:'tank',x:2,y:6,w:1,h:1},
  {type:'tank',x:4,y:6,w:1,h:1},
  {type:'monitor',x:16,y:5,w:1.5,h:1},
  {type:'monitor',x:19,y:5,w:1.5,h:1},
  {type:'instrument',x:3,y:10,w:1.5,h:1},
  {type:'instrument',x:19,y:10,w:1.5,h:1},
  {type:'bench',x:3,y:13,w:1.7,h:1.2},
  {type:'pallet',x:19,y:13,w:1.4,h:1},
  {type:'solar-panel',x:2,y:15,w:1.5,h:1.2},
  {type:'crate',x:20,y:15,w:1,h:1},
  {type:'plant',x:8,y:3,w:1,h:1},
  {type:'plant',x:15,y:3,w:1,h:1},
  {type:'mast',x:16,y:14,w:1,h:1},
  {type:'camera-target',trainingId:'camera',name:'Amostra marciana',x:10,y:6,w:1.2,h:1.2},
  {type:'monitor',x:8,y:5,w:1.3,h:1.1},
  {type:'bench',x:14,y:6,w:1.3,h:1.1}
 ];
 return {width,height,grid,floorMap,props};
}
