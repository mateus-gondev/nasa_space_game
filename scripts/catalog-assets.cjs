// Catálogo local reproduzível: nenhuma cópia ou redistribuição adicional dos assets.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../static');
const entries=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else{
  const relative=path.relative(root,file).split(path.sep).join('/');
  if(relative==='assets/catalog.json')continue;
  const ext=path.extname(file).toLowerCase();
  const media=['.png','.jpg','.jpeg','.webp','.gif','.svg','.mp3','.wav','.ogg','.glb','.gltf','.woff','.woff2'].includes(ext);
  if(!relative.startsWith('assets/')&&!relative.includes('/assets/')&&!media)continue;
  const url=relative.replace(/^main_menu\//,'main-menu/').replace(/^lab_training\//,'lab-training/').replace(/^opportunity-mars-five-worlds\//,'mars-test/');
  entries.push({path:'/'+url,file:relative,group:relative.startsWith('assets/')?relative.split('/')[1]:relative.split('/')[0],name:item.name,kind:['.png','.jpg','.jpeg','.webp','.gif','.svg'].includes(ext)?'image':['.mp3','.wav','.ogg'].includes(ext)?'audio':ext==='.html'?'scene':'source'});
}}}
walk(root);
entries.sort((a,b)=>a.path.localeCompare(b.path));
fs.writeFileSync(path.join(root,'assets/catalog.json'),JSON.stringify({version:1,note:'Inventário de arquivos locais. Licenças variam por conjunto; consulte os documentos originais. Variantes de resolução e folhas de sprites são preservadas.',entries},null,2)+'\n');
console.log(`${entries.length} assets catalogados.`);
