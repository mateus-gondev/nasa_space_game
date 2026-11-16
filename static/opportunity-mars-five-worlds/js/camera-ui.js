/* A câmera observa o setor atual; o mapa e o relógio ficam suspensos. */
window.MarsCameraUI={mount({engine,updateInterface,loadView=()=>import('./camera-view.mjs')}){
  const $=selector=>document.querySelector(selector),dialog=$('#marsCamera');
  let view=null,wasPaused=false,request=0;
  const controls=[$('#cameraReset'),$('#cameraZoom'),$('#cameraCapture')];
  function ready(value){for(const control of controls)control.disabled=!value;}
  function close(){
    if(!dialog.open)return;
    request++;view?.dispose();view=null;dialog.close();engine.cameraOpen=false;
    engine.controls.keys.clear();engine.setPaused(wasPaused);updateInterface();
    if(!engine.paused)$('#gameCanvas').focus();
  }
  async function open(){
    if(dialog.open||document.querySelector('#missionDialog')?.open)return;
    const current=++request;wasPaused=engine.paused;
    engine.closeInspection();engine.cameraOpen=true;engine.controls.keys.clear();
    dialog.showModal();engine.setPaused(true);updateInterface();ready(false);
    $('#cameraLocation').textContent=engine.map.name;
    $('#cameraMessage').textContent='Carregando ambiente 3D…';$('#cameraMessage').hidden=false;
    $('#cameraPhoto').hidden=true;$('#cameraZoom').value=1;$('#cameraClose').focus();
    try{
      const {MarsCameraView}=await loadView();
      if(current!==request||!dialog.open)return;
      view=new MarsCameraView({container:$('#cameraViewport'),map:engine.map,config:engine.config,
        onChange:state=>{$('#cameraZoom').value=state.zoom;}});
      view.open(engine.player,engine.mood,engine.nearObject);
      $('#cameraMessage').hidden=true;ready(true);
    }catch(error){
      view?.dispose();view=null;console.error('Câmera de Marte:',error);
      $('#cameraMessage').textContent='A visão 3D precisa de WebGL 2. Volte ao mapa e tente novamente.';
    }
  }
  $('#cameraClose').onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  $('#cameraReset').onclick=()=>view?.controller.reset({zoom:true});
  $('#cameraZoom').addEventListener('input',event=>view?.controller.setZoom(Number(event.target.value)));
  $('#cameraCapture').onclick=()=>{
    try{
      const photo=view?.capture();if(!photo)return;
      $('#cameraPreview').src=photo.image;$('#cameraPhoto').href=photo.image;$('#cameraPhoto').hidden=false;
      $('#cameraMessage').textContent=photo.prop?.name?'Foto: '+photo.prop.name:'Fotografia do ambiente registrada.';
      $('#cameraMessage').hidden=false;
    }catch(error){console.error(error);$('#cameraMessage').textContent='Não foi possível fotografar. Tente novamente.';$('#cameraMessage').hidden=false;}
  };
  window.addEventListener('keydown',event=>{
    if(!dialog.open)return;
    const key=event.key.toLowerCase();
    if(key==='escape'){event.preventDefault();event.stopImmediatePropagation();close();}
    else if(['b','m','p','c','1','e',' '].includes(key)&&!['INPUT','BUTTON','SELECT'].includes(event.target.tagName)){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  window.addEventListener('pagehide',()=>view?.dispose());
  return {open,close,get active(){return dialog.open;}};
}};
