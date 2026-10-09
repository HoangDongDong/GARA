import test from 'node:test';
import assert from 'node:assert/strict';
import { compressImage, imagePolicies } from '../src/utils/compressImage.js';
test('image compression bounds dimensions/bytes, retains transparent PNG and cleans object URLs on failures',async()=>{
  const originals={Image:globalThis.Image,document:globalThis.document,FileReader:globalThis.FileReader,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
  let width=4000,height=3000,failDecode=false,failEncode=false,revoked=0;
  const encodings=[];
  globalThis.Image=class {naturalWidth=width;naturalHeight=height;set src(value){queueMicrotask(()=>failDecode?this.onerror():this.onload());}};
  globalThis.FileReader=class {readAsDataURL(blob){blob.arrayBuffer().then(bytes=>{this.result='data:'+blob.type+';base64,'+Buffer.from(bytes).toString('base64');this.onload();});}};
  globalThis.document={createElement(){const canvas={width:0,height:0,getContext(){return {fillRect(){},drawImage(){}};},toBlob(callback,mime,quality){encodings.push({width:this.width,height:this.height,mime,quality});const size=Math.round(this.width*this.height*(mime==='image/png'?0.7:quality*0.5));callback(failEncode?null:new Blob([new Uint8Array(size)],{type:mime}));}};return canvas;}};
  URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>revoked++;
  try{
    const result=await compressImage(new Blob([new Uint8Array(3000000)],{type:'image/jpeg'}),imagePolicies.vehicle);
    assert.ok(result.width<=1600&&result.height<=1600);
    assert.ok(result.compressedBytes<=512*1024);
    assert.ok(result.compressedBytes<result.originalBytes);
    assert.ok(encodings.every(item=>item.width/item.height===4/3));
    assert.ok(encodings.length>1,'large/noisy images need quality and dimension retries');
    assert.ok(result.data.startsWith('data:image/jpeg;base64,'));
    width=80;height=40;
    const png=await compressImage(new Blob(['png'],{type:'image/png'}),imagePolicies.template);
    assert.equal(png.type,'image/png');assert.equal(png.width,80);assert.equal(png.height,40);
    await assert.rejects(()=>compressImage(new Blob(['not image'],{type:'video/mp4'})),/Chọn ảnh/);
    await assert.rejects(()=>compressImage('https://example.invalid/image.jpg'),/không hợp lệ/);
    await assert.rejects(()=>compressImage(new Blob([new Uint8Array(21*1024*1024)],{type:'image/jpeg'})),/20 MB/);
    failDecode=true;await assert.rejects(()=>compressImage(new Blob(['broken'],{type:'image/jpeg'})),/Không mở/);failDecode=false;
    failEncode=true;await assert.rejects(()=>compressImage(new Blob(['broken'],{type:'image/jpeg'})),/Không thể nén/);
    assert.equal(revoked,4);
  }finally{globalThis.Image=originals.Image;globalThis.document=originals.document;globalThis.FileReader=originals.FileReader;URL.createObjectURL=originals.create;URL.revokeObjectURL=originals.revoke;}
});
