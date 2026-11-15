const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const sandbox = {window:{},console};
vm.createContext(sandbox);
for(const file of ['js/config.js','js/map-data.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
const {list,byId}=sandbox.window.MARS_WORLDS;
assert.equal(list.length,5,'devem existir cinco mapas');
assert.equal(new Set(list.map(x=>x.id)).size,5,'ids únicos');
const positions=(map)=>{
 const blocked=new Set();for(const p of map.props)if(p.solid)for(let y=Math.floor(p.y);y<Math.ceil(p.y+p.h);y++)for(let x=Math.floor(p.x);x<Math.ceil(p.x+p.w);x++)blocked.add(`${x},${y}`);
 const [sx,sy]=map.spawn.map(Math.floor);assert.ok(map.grid[sy][sx]===2&&!blocked.has(`${sx},${sy}`),'spawn acessível');
 const queue=[[sx,sy]],seen=new Set([`${sx},${sy}`]);
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
 const x=queue[i][0]+dx,y=queue[i][1]+dy,key=`${x},${y}`;
 if(!map.grid[y]||map.grid[y][x]!==2||blocked.has(key)||seen.has(key))continue;
 seen.add(key);queue.push([x,y]);}
 return {seen,blocked};
};
for(const w of list){
 assert.equal(w.width,128);assert.equal(w.height,92);
 assert.equal(w.grid.length,92);assert.equal(w.floorMap[0].length,128);
 const interactive=w.props.filter(p=>p.action),scans=interactive.filter(p=>p.action==='scan'),beacons=interactive.filter(p=>p.action==='beacon');
 assert.ok(interactive.length>=9,`${w.id} deve ter ao menos nove interações`);
 assert.ok(scans.length>=3,`${w.id} deve ter três análises`);
 assert.ok(beacons.length>=1,`${w.id} deve ter uma baliza`);
 const {seen}=positions(w);
 assert.ok(seen.size>10000,`${w.id} deve ter muito terreno explorável`);
 for(const p of interactive){
  let accessible=false;
  for(let y=Math.max(1,Math.floor(p.y)-2);y<Math.min(w.height-1,Math.ceil(p.y+p.h)+2);y++){
   for(let x=Math.max(1,Math.floor(p.x)-2);x<Math.min(w.width-1,Math.ceil(p.x+p.w)+2);x++){
    if(seen.has(`${x},${y}`))accessible=true;
   }
  }
  assert.ok(accessible,`${w.id} ${p.name} deve ser acessível`);
  if(p.action?.startsWith('travel:')) assert.ok(byId[p.action.split(':')[1]],'destino válido');
 }
 console.log(`OK ${w.name}: ${w.width}x${w.height}, ${interactive.length} pontos de interesse, ${w.props.length} objetos, ${seen.size} tiles caminháveis`);
}
const total=list.reduce((acc,w)=>acc+w.props.filter(p=>p.action).length,0);
console.log(`TOTAL: ${list.length} mapas, ${total} interações, ${list.reduce((a,w)=>a+w.width*w.height,0)} tiles.`);
