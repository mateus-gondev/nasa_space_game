const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
class Gradient{addColorStop(){}}
class Ctx{
  constructor(){this.counter=0;}
  measureText(text){return {width:String(text).length*7}}
  createLinearGradient(){return new Gradient()}
  createRadialGradient(){return new Gradient()}
  fillRect(){this.counter++}strokeRect(){}clearRect(){}beginPath(){}moveTo(){}lineTo(){}arc(){}ellipse(){}
  fill(){}stroke(){}roundRect(){}fillText(){}drawImage(){}save(){}restore(){}translate(){}rotate(){}
  closePath(){}setLineDash(){}quadraticCurveTo(){}
}
const canvas=()=>({width:100,height:100,getContext(){return new Ctx()}});
const sandbox={window:{},document:{createElement(type){assert.equal(type,'canvas');return canvas()}},console};vm.createContext(sandbox);
for(const f of ['js/config.js','js/map-data.js','js/renderer.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f});
const {list}=sandbox.window.MARS_WORLDS;
for(const world of list){
 const obj=new sandbox.window.MapRenderer(canvas(),sandbox.window.MAP_ENGINE_CONFIG,world);
 obj.render({time:1.5,player:{x:world.spawn[0],y:world.spawn[1],angle:0,moving:false},mood:sandbox.window.MAP_ENGINE_CONFIG.atmosphere.presets[world.weather],nearObject:null,doors:[]});
 for(const p of world.props){obj.ctx=new Ctx();obj.drawProp(p,1.5,sandbox.window.MAP_ENGINE_CONFIG.atmosphere.presets[world.weather]);}
 assert.ok(obj.staticCanvas.width>0);console.log(`RENDERER OK: ${world.id}`);
}
