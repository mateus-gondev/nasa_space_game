class Element {
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={setProperty(key,value){this[key]=value;}};this.attributes={};this.listeners={};this.hidden=false;this.disabled=false;this.open=false;this.value='';this._text='';}
  append(...nodes){for(let node of nodes){if(typeof node==='string'){const text=new Element('text');text._text=node;node=text;}if(node===this||node.contains(this))throw Error('HierarchyRequestError');if(node.parentElement){const list=node.parentElement.children;list.splice(list.indexOf(node),1);}node.parentElement=this;this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
  set textContent(value){this._text=String(value);this.children=[];}
  get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
  set innerHTML(html){this.replaceChildren();const stack=[this],voids=new Set(['img','input','br','meta','link']);for(const token of html.match(/<[^>]+>|[^<]+/g)||[]){
    if(token.startsWith('</')){if(stack.length>1)stack.pop();}
    else if(/^<[a-z]/i.test(token)){const tag=token.match(/^<([^\s/>]+)/)[1],node=new Element(tag);for(const match of token.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){if(match.index<=1)continue;node.setAttribute(match[1],match[2]??'');}stack.at(-1).append(node);if(!voids.has(tag)&&!token.endsWith('/>'))stack.push(node);}
    else if(!token.startsWith('<'))stack.at(-1)._text+=token;
  }}
  setAttribute(key,value){this.attributes[key]=String(value);if(key==='id')this.id=value;if(key==='class')this.className=value;if(key==='hidden')this.hidden=true;if(key==='disabled')this.disabled=true;if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;}
  getAttribute(key){return this.attributes[key];}
  removeAttribute(key){delete this.attributes[key];}
  matches(selector){if(selector.startsWith('#'))return this.id===selector.slice(1);if(selector.startsWith('.'))return (this.className||'').split(' ').includes(selector.slice(1));if(selector.startsWith('[')){const key=selector.slice(1,-1).split('=')[0];return key.startsWith('data-')?this.dataset[key.slice(5)]!==undefined:this.attributes[key]!==undefined;}return this.tagName===selector.toUpperCase();}
  querySelectorAll(selector){const parts=selector.split(/\s+/);const result=[];const visit=node=>{for(const child of node.children){if(child.matches(parts.at(-1))){let parent=child.parentElement,index=parts.length-2;while(index>=0&&parent){if(parent.matches(parts[index]))index--;parent=parent.parentElement;}if(index<0)result.push(child);}visit(child);}};visit(this);return result;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  get nextSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
  insertBefore(node,anchor){this.append(node);if(anchor){this.children.pop();this.children.splice(this.children.indexOf(anchor),0,node);}}
  get classList(){const node=this;return {add(name){if(!node.matches('.'+name))node.className=(node.className||'')+' '+name;},remove(name){node.className=(node.className||'').split(' ').filter(n=>n!==name).join(' ');},toggle(name,force){if(force)this.add(name);else this.remove(name);}};}
  getContext(){return new Proxy({}, {get:(target,key)=>target[key]||(()=>{})});}
  getClientRects(){return this.hidden?[]:[{}];}
  focus(){if(this.ownerDocument)this.ownerDocument.activeElement=this;}
  setCustomValidity(){}
  reportValidity(){return true;}
  showModal(){this.open=true;}
  close(){this.open=false;}
  getBoundingClientRect(){return {width:1280,height:800,left:0,top:0};}
  click(){if(this.disabled)return;this.onclick?.();for(const fn of this.listeners.click||[])fn({target:this});}
}
module.exports={Element};
