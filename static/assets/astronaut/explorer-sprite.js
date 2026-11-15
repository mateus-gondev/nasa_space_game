/* O mesmo atlas direcional no laboratório e em todos os mapas de Marte. */
(function(root){
  const frame=(image,angle,moving,time)=>{
    const dx=Math.cos(angle),dy=Math.sin(angle);
    const row=Math.abs(dx)>Math.abs(dy)?dx>=0?1:3:dy>=0?0:2;
    const column=moving?1+Math.floor(time*8)%3:0;
    return {x:column*image.width/4,y:row*image.height/4,w:image.width/4,h:image.height/4,row,column};
  };
  function draw(ctx,image,player,time,tile,size=64){
    const f=frame(image,player.angle,player.moving,time);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(player.x*tile),Math.round(player.y*tile));
    ctx.fillStyle='rgba(9,25,37,.3)';ctx.beginPath();ctx.ellipse(0,size*.17,size*.19,size*.07,0,0,Math.PI*2);ctx.fill();
    ctx.drawImage(image,f.x,f.y,f.w,f.h,-size/2,-size*.68,size,size);ctx.restore();
  }
  const api={frame,draw};if(typeof module==='object'&&module.exports)module.exports=api;else root.ExplorerSprite=api;
})(globalThis);
