import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSampleMap} from '../demo/sample-map.mjs';
const map=createSampleMap();
assert.equal(map.grid.length,map.height);
assert.ok(map.grid.every(row=>row.length===map.width));
assert.ok(map.grid.flat().filter(v=>v===2).length>100);
assert.ok(map.grid.flat().includes(3));
assert.ok(map.props.length>=15);
assert.ok(map.props.some(p=>p.trainingId==='camera'));
for(const p of map.props){
 assert.ok(p.x>=0&&p.y>=0);
 assert.ok(p.x+p.w<=map.width&&p.y+p.h<=map.height);
 assert.ok(Number.isFinite(p.w)&&Number.isFinite(p.h));
}
const content=readFileSync(new URL('../environment.mjs',import.meta.url),'utf8');
assert.match(content,/export function createEnhancedLabScene/);
assert.match(content,/disposeEnvironment/);
assert.match(content,/InstancedMesh/);
const props=readFileSync(new URL('../props.mjs',import.meta.url),'utf8');
assert.match(props,/g\.userData\.prop\s*=\s*prop/);
console.log(`PASS: sample MAP_DATA ${map.width}x${map.height}; ${map.props.length} props; training target preserved; engine interfaces found.`);
