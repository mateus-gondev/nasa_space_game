const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const sprite=require('../static/assets/astronaut/explorer-sprite');
test('explorer atlas has true transparency and visible content in all sixteen cells',()=>{
  const png=fs.readFileSync(path.join(__dirname,'../static/assets/astronaut/explorer-v2.png'));
  assert.equal(png.toString('ascii',1,4),'PNG');assert.equal(png[24],8);assert.equal(png[25],6);
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20),chunks=[];assert.equal(width,height);assert(width>=1024);
  for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);if(type==='IDAT')chunks.push(png.subarray(offset+8,offset+8+length));offset+=12+length;}
  const data=zlib.inflateSync(Buffer.concat(chunks)),stride=width*4,counts=Array(16).fill(0);let previous=Buffer.alloc(stride),transparent=0;
  const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
  for(let y=0;y<height;y++){const filter=data[y*(stride+1)],row=Buffer.from(data.subarray(y*(stride+1)+1,(y+1)*(stride+1)));for(let x=0;x<stride;x++){const a=x>=4?row[x-4]:0,b=previous[x],c=x>=4?previous[x-4]:0;row[x]=(row[x]+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0))&255;}
    for(let x=0;x<width;x++){const alpha=row[x*4+3];if(alpha===0)transparent++;if(alpha>128)counts[Math.floor(y/height*4)*4+Math.floor(x/width*4)]++;}previous=row;
  }
  assert(transparent>width*height*.25,'background is transparent');assert(counts.every(count=>count>1000),'every pose has pixels');
});
test('directional frames use the correct row, preserve the idle pose and stay inside the sheet',()=>{
  const image={width:1254,height:1254};for(const [angle,row]of [[Math.PI/2,0],[0,1],[-Math.PI/2,2],[Math.PI,3]]){
    assert.equal(sprite.frame(image,angle,false,4).row,row);assert.equal(sprite.frame(image,angle,false,4).column,0);
    const cells=new Set();for(let i=0;i<24;i++){const f=sprite.frame(image,angle,true,i/8);assert(f.x>=0&&f.x+f.w<=image.width);assert(f.y>=0&&f.y+f.h<=image.height);cells.add(f.column);}assert.deepEqual([...cells],[1,2,3]);
  }
});
