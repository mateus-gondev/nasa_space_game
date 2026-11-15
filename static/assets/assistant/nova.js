/* Assistente compartilhado. As imagens do ZIP são usadas sem modificações. */
(function(root){
  const POSES={guide:[1,2,3],science:[8,9,10],success:[4,6,11],warning:[5,7,12]};
  const imagePath=pose=>'/assets/assistant/assistente_'+pose+'.png';
  function moodFor(text=''){
    if(/não|nao|falta|pouca|alerta|precisa de ajuda|atenção|failed|cannot|warning/i.test(text))return 'warning';
    if(/✓|pront|medalha|conclu|registrad|extraída|complete|ready|recorded/i.test(text))return 'success';
    return 'guide';
  }
  function create(options={}){
    const t=options.translate||((text)=>text),el=(tag,cls)=>{const e=document.createElement(tag);e.className=cls;return e;};
    const element=el('section','nova-assistant '+(options.floating?'nova-floating':'nova-inline')+(options.compact?' nova-compact':''));element.hidden=true;
    const portrait=el(options.dismissible?'button':'div','nova-portrait');
    if(options.dismissible)portrait.type='button';
    portrait.setAttribute('aria-label',t('Rever dica da NOVA'));
    const image=el('img','nova-image');image.src=imagePath(1);image.alt='';image.draggable=false;image.setAttribute('aria-hidden','true');portrait.append(image);
    const bubble=el('div','nova-bubble'),name=el('span','nova-name'),text=options.textNode||el('p','');text.className='nova-speech';name.textContent='NOVA';
    text.setAttribute('role',options.announce===false?'presentation':'status');text.setAttribute('aria-live',options.announce===false?'off':'polite');text.setAttribute('aria-atomic','true');
    const actions=el('div','nova-actions'),action=el('button','nova-action');action.type='button';action.hidden=true;actions.append(action);
    bubble.append(name,text,actions);element.append(portrait,bubble);
    let key='',lastText='',mood='guide',timer=null,collapsedKey=null,disposed=false;
    const reduced=!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const stop=()=>{if(timer!==null)root.clearTimeout(timer);timer=null;};
    const animate=(frames,index=0)=>{image.src=imagePath(frames[index]);if(!reduced&&index<frames.length-1)timer=root.setTimeout(()=>{timer=null;if(!element.hidden&&!bubble.hidden&&!disposed)animate(frames,index+1);},900);};
    function collapse(){collapsedKey=key;bubble.hidden=true;portrait.setAttribute('aria-expanded','false');stop();options.onDismiss?.();}
    if(options.dismissible){
      const dismiss=el('button','nova-dismiss');dismiss.type='button';dismiss.textContent='×';dismiss.setAttribute('aria-label',t('Recolher dica'));dismiss.onclick=collapse;bubble.append(dismiss);
      portrait.setAttribute('aria-expanded','false');portrait.onclick=()=>{if(bubble.hidden){collapsedKey=null;bubble.hidden=false;portrait.setAttribute('aria-expanded','true');animate(POSES[mood]);}else collapse();options.onInteract?.();};
    }
    function say(message,settings={}){
      if(disposed)return false;
      const value=String(message||'').trim();if(!value){hide();return false;}
      const nextMood=POSES[settings.mood]?settings.mood:moodFor(value),nextKey=settings.key||value;
      const changed=key!==nextKey||lastText!==value||mood!==nextMood;
      key=nextKey;lastText=value;mood=nextMood;element.hidden=false;element.dataset.mood=mood;
      if(text.textContent!==value)text.textContent=value;
      action.hidden=!settings.onAction;action.textContent=t(settings.actionLabel||'Ver missão');action.onclick=settings.onAction||null;
      portrait.setAttribute('aria-label',t('Rever dica da NOVA'));
      if(settings.force||collapsedKey!==key){bubble.hidden=false;portrait.setAttribute('aria-expanded','true');}
      else bubble.hidden=true;
      if(changed||settings.force){stop();if(!bubble.hidden)animate(POSES[mood]);}
      return changed;
    }
    function hide(){element.hidden=true;stop();}
    function destroy(){hide();disposed=true;action.onclick=null;portrait.onclick=null;}
    return {element,text,image,bubble,say,hide,collapse,destroy};
  }
  const api={create,POSES,imagePath,moodFor};if(typeof module==='object'&&module.exports)module.exports=api;else root.NovaAssistant=api;
})(globalThis);
