const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {Campaign,createScenario}=require('../static/opportunity-mars-five-worlds/js/campaign');
const {MissionEngine}=require('../LIFE/engine');
const base=require('../LIFE/scenario-mars.json');
function fresh(){return new Campaign(createScenario(base));}
function task(c,type,payload){c.start(type,payload);let steps=0;while(c.engine.state.activeActivity&&c.meta.result==='active'&&steps++<16)c.advance();assert.equal(c.engine.state.activeActivity,null,`${type} completed`);}
function reach(c,tick){while(c.engine.state.tick<tick&&c.meta.result==='active')c.advance();}
function play(c){
  task(c,'activateBase');task(c,'buildGreenhouse');task(c,'plant',{cropId:'lettuce'});
  task(c,'buildComms');task(c,'connectComms');c.report();task(c,'buildShelter');task(c,'buildLab');
  task(c,'collectSample');c.command('compareSample',{selected:[0,3]});reach(c,20);task(c,'cleanPanels');task(c,'harvest');task(c,'analyzeSample');
  reach(c,26);task(c,'repairFilter');task(c,'transferToShelter');
  reach(c,37);task(c,'recycleWater');task(c,'recoverRover');c.report(true);reach(c,c.engine.state.tick+5);
}
test('complete campaign: allocation, science, food, storm, maintenance, shelter, archives and return',()=>{
  const c=fresh();assert.throws(()=>c.finish('resposta suficiente'),/checklist/);play(c);
  assert.equal(c.meta.result,'active');assert(c.objectives().every(o=>o.done));
  assert(c.engine.state.team.exposure<25);assert(c.engine.state.resources.waterClean.amount>0);
  c.finish('Reservei energia para a noite e priorizei o abrigo durante a radiação.');
  assert.equal(c.meta.result,'succeeded');assert.throws(()=>c.advance(),/encerrada/);
});
test('forecast does not mutate the campaign and exactly matches the next four decisions',()=>{
  const c=fresh();task(c,'activateBase');task(c,'buildGreenhouse');c.start('plant',{cropId:'potato'});
  const before=JSON.stringify(c.save()),predicted=c.forecast(4);assert.equal(JSON.stringify(c.save()),before);
  c.advance(4);assert.deepEqual(c.engine.state.resources,predicted.resources);assert.deepEqual(c.engine.state.crop,predicted.crop);
});
test('solar day/night and shared priorities produce different consequences without free energy',()=>{
  const a=fresh();task(a,'activateBase');reach(a,11);const before=a.engine.state.resources.energy.amount;a.advance();
  assert.equal(a.engine.state.power.lastGeneration,0);assert(a.engine.state.resources.energy.amount<before);
  const b=fresh();task(b,'activateBase');task(b,'buildGreenhouse');task(b,'plant',{cropId:'potato'});
  reach(b,14);const priorities={...b.engine.state.priorities,cultivation:1,oxygenProduction:7};
  b.command('setPowerPriorities',{priorities});const s=b.forecast(4);assert(s.resources.energy.amount<=b.engine.state.resources.energy.amount);
});
test('energy reserved for construction survives distribution and cancellation releases it',()=>{
  const c=fresh();task(c,'activateBase');c.start('buildLab');const energy=c.engine.state.resources.energy;
  assert.equal(energy.reserved,3);c.advance();assert.equal(c.engine.state.resources.energy.reserved,3);
  c.command('cancelActivity',{activityId:c.engine.state.activeActivity.id});assert.equal(c.engine.state.resources.energy.reserved,0);
});
test('dormitory investment shortens the actual rest and its preview consistently',()=>{
  const c=fresh();task(c,'activateBase');assert.equal(c.engine.availableActions().rest.durationTicks,6);
  task(c,'buildDormitory');assert.equal(c.engine.availableActions().rest.durationTicks,3);assert.equal(c.engine.estimateActivity('rest').durationTicks,3);
  c.start('rest');assert.equal(c.engine.state.activeActivity.totalTicks,3);c.advance(3);assert.equal(c.engine.state.activeActivity,null);
});
test('crop choices reserve distinct water costs; failed crops cannot be harvested',()=>{
  const a=fresh(),b=fresh();for(const c of [a,b]){task(c,'activateBase');task(c,'buildGreenhouse');}
  a.start('plant',{cropId:'lettuce'});b.start('plant',{cropId:'potato'});
  assert.equal(a.engine.state.resources.waterClean.reserved,3);assert.equal(b.engine.state.resources.waterClean.reserved,6);
  a.advance();a.engine.state.crop.failed=true;a.engine.state.crop.remainingTicks=0;
  assert.throws(()=>a.start('harvest'),/pronto/);a.command('discardCrop');assert.equal(a.engine.state.crop,null);
});
test('occupying the shelter protects the crew; missing the alert interrupts the mission',()=>{
  const protectedCrew=fresh(),exposed=fresh();for(const c of [protectedCrew,exposed])task(c,'activateBase');
  task(protectedCrew,'buildShelter');task(protectedCrew,'transferToShelter');
  reach(protectedCrew,37);reach(exposed,37);
  assert.equal(protectedCrew.engine.state.team.location,'shelter');assert.equal(protectedCrew.meta.result,'active');
  assert.equal(exposed.meta.result,'failed');assert.match(exposed.engine.state.eventHistory.at(-1).message,/exposição/);
});
test('save/restore at an unfinished task preserves inventory, context, reservations and deterministic outcome',()=>{
  const a=fresh();task(a,'activateBase');a.start('buildLab');a.advance();a.meta.position={x:3.5,y:8};a.meta.training=[{title:'Câmera',result:'Registro guardado'}];
  const b=new Campaign(a.scenario,JSON.parse(JSON.stringify(a.save())));assert.deepEqual(b.save(),a.save());
  a.advance(4);b.advance(4);assert.deepEqual(b.save(),a.save());
  assert.throws(()=>new Campaign(a.scenario,{version:2}),/incompatível/);
  const invalid=a.save();invalid.meta.position.x=null;assert.throws(()=>new Campaign(a.scenario,invalid),/Posição/);
});
test('supplies are finite, consume no parallel counters and cannot be claimed twice',()=>{
  const s=createScenario(base);s.supplies.crate={materials:6,energy:10};const c=new Campaign(s);task(c,'activateBase');
  const before=c.engine.state.resources.materials.amount;c.command('claimSupply',{id:'crate'});
  assert.equal(c.engine.state.resources.materials.amount,before+6);assert.throws(()=>c.command('claimSupply',{id:'crate'}),/recolhido/);
  assert.throws(()=>c.command('claimSupply',{id:'inexistente'}),/indisponível/);
});
test('scientific analysis requires the sample and a correct comparison of evidence',()=>{
  const c=fresh();assert.throws(()=>c.command('compareSample',{selected:[0,3]}),/Extraia/);
  task(c,'activateBase');task(c,'buildLab');task(c,'collectSample');
  assert.throws(()=>c.start('analyzeSample'),/comparação/);
  assert.throws(()=>c.command('compareSample',{selected:[1,2]}),/picos/);
  assert.equal(c.engine.state.systems.sampleCompared,undefined);
  c.command('compareSample',{selected:[3,0]});task(c,'analyzeSample');assert.equal(c.engine.state.systems.sampleAnalyzed,true);
});
test('campaign rules also load in the browser and a finished attempt remains finished after restoration',()=>{
  const context=vm.createContext({globalThis:{LifeEngine:{MissionEngine}}});vm.runInContext(fs.readFileSync(path.join(__dirname,'../static/opportunity-mars-five-worlds/js/campaign.js'),'utf8'),context);
  assert.equal(typeof context.globalThis.OpportunityCampaign.Campaign,'function');const c=fresh();play(c);c.finish('Priorizei suporte vital e economizei água com reciclagem.');
  const restored=new Campaign(c.scenario,c.save());assert.equal(restored.meta.result,'succeeded');assert.equal(restored.meta.reflection,c.meta.reflection);
});
test('all browser JavaScript parses and every cataloged local asset exists',()=>{
  for(const file of ['campaign-ui.js','campaign.js','app.js','renderer.js'])new vm.Script(fs.readFileSync(path.join(__dirname,'../static/opportunity-mars-five-worlds/js',file),'utf8'));
  const catalog=require('../static/assets/catalog.json');assert(catalog.entries.length>800);
  for(const asset of catalog.entries)assert(fs.existsSync(path.join(__dirname,'../static',asset.file)),asset.path);
});
test('live survival starts automatically on arrival, pauses safely and restores a partial clock',()=>{
  const c=fresh();c.beginMars();assert.equal(c.engine.state.systems.baseOnline,true);assert.equal(c.meta.world,'mars01_ship_interior');
  const food=c.engine.state.resources.food.amount;c.elapse(12);c.elapse(30,true);assert.equal(c.engine.state.resources.food.amount,food);
  const restored=new Campaign(c.scenario,c.save());restored.elapse(8);assert.equal(restored.engine.state.resources.food.amount,food-.5);assert.equal(restored.meta.liveSeconds,0);
  const a=fresh(),b=fresh();a.beginMars();b.beginMars();for(let i=0;i<1200;i++)a.elapse(1/30);for(let i=0;i<5760;i++)b.elapse(1/144);
  assert.equal(a.engine.state.tick,3);assert.equal(b.engine.state.tick,3);assert.deepEqual(a.engine.state.resources,b.engine.state.resources);
});
test('junior energy plans preserve essential consumers and earned badges survive a crop setback',()=>{
  const c=fresh();c.beginMars();for(const mode of ['safety','garden','science']){c.applyPowerMode(mode);assert.equal(c.engine.state.priorities.lifeSupport,1);assert.equal(c.engine.state.priorities.oxygenProduction,2);}
  task(c,'buildGreenhouse');task(c,'plant',{cropId:'lettuce'});assert(c.badges().find(b=>b.id==='first-seed').done);
  c.command('discardCrop');assert(c.badges().find(b=>b.id==='first-seed').done);assert.throws(()=>c.applyPowerMode('unknown'),/plano/);
});
