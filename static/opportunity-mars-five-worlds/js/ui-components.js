/* Peças visuais compartilhadas: ícones locais, barras em blocos e slots de ação. */
window.MarsUI=(()=>{
  const hud='/assets/visuals/hud_assets/png/',mars='/assets/marte_tilemap/sprites/';
  const files={oxygen:hud+'icone_oxigenio_1x.png',waterClean:hud+'icone_agua_1x.png',waterUsed:hud+'icone_agua_1x.png',food:hud+'icone_alimentacao_1x.png',energy:hud+'icone_energia_1x.png',build:hud+'acao_1_obra_1x.png',repair:hud+'acao_2_reparo_1x.png',science:hud+'acao_3_pesquisa_1x.png',map:hud+'acao_4_mapa_1x.png',avatar:hud+'avatar_astronauta_1x.png',materials:mars+'caixa_carga.png',repairParts:hud+'acao_2_reparo_1x.png',seeds:'/assets/250 pixel Veggie/32x32/lettuce_01.png',antenna:mars+'antena.png',shelter:mars+'habitat_circular.png',ship:mars+'rocket.webp',rover:mars+'rover.png',sample:mars+'amostras.png',solar:mars+'painel_solar.png',lettuce:'/assets/250 pixel Veggie/32x32/lettuce_05.png',potato:'/assets/250 pixel Veggie/32x32/potato_05.png',tomato:'/assets/250 pixel Veggie/32x32/tomato_05.png'};
  const names={oxygen:'Ar',waterClean:'Água',waterUsed:'Água usada',food:'Comida',energy:'Energia',materials:'Materiais',repairParts:'Peças',seeds:'Sementes'};
  function node(tag,cls,text){const e=document.createElement(tag);e.className=cls||'';if(text!==undefined)e.textContent=text;return e;}
  function icon(key){const image=node('img','pixel-icon');image.src=files[key]||key;image.alt='';image.setAttribute('aria-hidden','true');return image;}
  function setMeter(meter,value){const percent=Math.max(0,Math.min(100,Math.round(value)));meter.setAttribute('aria-valuenow',String(percent));meter._fill.style.width=percent+'%';}
  function meter(value,label,key='oxygen'){
    const e=node('div','pixel-meter');e.dataset.resource=key;e.setAttribute('role','meter');e.setAttribute('aria-label',label);e.setAttribute('aria-valuemin','0');e.setAttribute('aria-valuemax','100');e._fill=node('span','pixel-fill');e.append(e._fill);setMeter(e,value);return e;
  }
  function resource(key,resource){const percent=Math.round(resource.amount/resource.capacity*100),e=node('div','pixel-resource');e.dataset.resource=key;e.dataset.level=percent<25?'low':percent<50?'watch':'good';e.append(icon(key),node('span','pixel-resource-name',names[key]),node('strong','pixel-resource-value',percent+'%'),meter(percent,names[key],key));return e;}
  function chip(key,amount){const e=node('span','pixel-chip');const label=`${amount} ${names[key]||key}`;e.title=label;e.setAttribute('aria-label',label);e.append(icon(key),node('strong','',String(amount)));return e;}
  function tile({label,icon:art,detail='',ariaLabel=label,onClick,disabled=false,state=''}){
    const b=node('button','pixel-slot');b.type='button';b.disabled=disabled;b.setAttribute('aria-label',ariaLabel);b.dataset.state=state;if(art)b.append(icon(art));b.append(node('strong','slot-name',label));if(detail)b.append(node('small','slot-detail',detail));if(state==='done')b.append(node('span','slot-check','✓'));if(onClick)b.onclick=onClick;return b;
  }
  return {node,icon,meter,setMeter,resource,chip,tile,names};
})();
