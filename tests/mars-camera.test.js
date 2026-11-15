const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');

test('every Mars sector builds a 3D scene at the real coordinates and releases its resources once',async t=>{
  const original=global.document;
  global.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{}})})};
  t.after(()=>{global.document=original;});
  const three=pathToFileURL(require.resolve('three').replace(/three\.cjs$/,'three.module.js')).href;
  const localImports=source=>source.replaceAll('/vendor/three/three.module.js',three)
    .replace(/(['"])(\/assets\/[^'"]+)\1/g,(_,quote,file)=>quote+pathToFileURL(path.join(root,'static',file.slice(1))).href+quote);
  const lab=data(localImports(read('static/lab_training/js/camera-view.js')));
  const {createMarsScene}=await import(data(localImports(read('static/opportunity-mars-five-worlds/js/camera-view.js')).replace('/lab-training/js/camera-view.js',lab)));
  const context=vm.createContext({window:{},fetch:async()=>({ok:true,json:async()=>JSON.parse(read('static/assets/marte_tilemap/scene_manifest.json'))})});
  for(const name of ['config','map-data','tilemap-data','ship-data'])vm.runInContext(read('static/opportunity-mars-five-worlds/js/'+name+'.js'),context);
  await context.window.MARS_TILEMAP_READY;
  const {MAP_ENGINE_CONFIG:config,MARS_WORLDS:worlds}=context.window;
  const landing=worlds.byId.mapa_01_pouso;
  const expansion={...landing,props:[...landing.props,
    {id:'test-pad',type:'campaignSector',sector:'labBuilt',name:'Laboratório',x:1,y:1,w:2,h:2,built:false},
    {id:'test-greenhouse',type:'campaignSector',sector:'greenhouseBuilt',name:'Estufa',x:3,y:1,w:2,h:2,built:true}]};
  const cases=worlds.list.map(map=>({map,quality:'low',mood:config.atmosphere.presets.clear}));
  cases.push({map:expansion,quality:'balanced',mood:config.atmosphere.presets.night},{map:landing,quality:'high',mood:config.atmosphere.presets.storm});
  for(const {map,quality,mood} of cases){
    const scene=createMarsScene(map,config,mood,{quality});
    assert.equal(scene.userData.environment.interior,!!map.interior,map.id);
    if(!map.interior){
      const ground=scene.getObjectByName('mars-continuous-terrain');assert(ground?.isMesh,'continuous terrain replaces tile boxes');
      assert(ground.geometry.attributes.color,'geological color variation');
      assert.equal(!!ground.material.map,quality!=='low');
      const heights=Array.from(ground.geometry.attributes.position.array).filter((_,i)=>i%3===1);
      assert(Math.max(...heights)-Math.min(...heights)>.5,'real relief');
      assert(scene.getObjectByName('mars-sky'));for(let i=0;i<3;i++)assert(scene.getObjectByName('mars-horizon-'+i));
      assert.equal(!!scene.getObjectByName('mars-sun'),mood.label!=='Noite');
      assert(scene.getObjectByName('mars-surface-gravel').count<=650,'bounded decoration budget');
      assert.equal(scene.children.find(child=>child.isDirectionalLight).castShadow,quality!=='low');
    }
    for(const prop of map.props.filter(p=>!p.action?.startsWith('travel:'))){
      const model=scene.children.find(child=>child.userData.prop===prop);assert(model,map.id+': '+prop.id);
      assert.equal(model.position.x,prop.x+prop.w/2);assert.equal(model.position.z,prop.y+prop.h/2);
      model.traverse(child=>{if(child.userData.prop)assert.equal(child.userData.prop,prop,'photo metadata keeps the original prop');});
      if(prop.sprite?.startsWith('cratera'))assert.equal(model.userData.modelType,'mars-crater');
      if(prop.type==='rock'||prop.sprite==='rochas')assert.equal(model.userData.modelType,'mars-rocks');
      if(prop.sprite==='nave_perfuradora')assert.equal(model.userData.modelType,'mars-rocket');
      if(prop.sector)assert.equal(model.userData.modelType,prop.built?'mars-greenhouse':'mars-construction-pad');
    }
    const resources=new Set();scene.traverse(object=>{
      if(object.geometry)resources.add(object.geometry);if(object.isInstancedMesh)resources.add(object);
      for(const material of [object.material].flat().filter(Boolean)){resources.add(material);for(const value of Object.values(material))if(value?.isTexture)resources.add(value);}
    });
    const counts=new Map();for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)||0)+1));
    scene.userData.disposeEnvironment();scene.userData.disposeEnvironment();
    for(const resource of resources)assert.equal(counts.get(resource),1,map.id+': '+resource.type);
  }
});
