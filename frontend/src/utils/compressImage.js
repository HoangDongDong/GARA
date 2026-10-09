export const imagePolicies={
  vehicle:{maxEdge:1600,maxBytes:512*1024},
  workflow:{maxEdge:1600,maxBytes:512*1024},
  employee:{maxEdge:800,maxBytes:200*1024},
  part:{maxEdge:1200,maxBytes:300*1024},
  advertising:{maxEdge:1920,maxBytes:512*1024},
  configuration:{maxEdge:1200,maxBytes:256*1024,preserveTransparency:true},
  template:{maxEdge:1200,maxBytes:256*1024,preserveTransparency:true},
};
const read=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Không đọc được ảnh sau khi nén.'));r.readAsDataURL(blob);});
export async function compressImage(source,options={}){
  const {maxEdge=1600,maxBytes=512*1024,preserveTransparency=false}=options;
  let file=source;
  if(typeof source==='string'){
    if(!/^data:image\/(jpeg|png|webp|gif);base64,/i.test(source))throw Error('Dữ liệu ảnh không hợp lệ.');
    if(source.length>40*1024*1024)throw Error('Ảnh gốc vượt quá 20 MB.');
    file=await (await fetch(source)).blob();
  }
  if(!(file instanceof Blob)||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||!file.size||file.size>20*1024*1024)throw Error('Chọn ảnh JPG, PNG, WebP hoặc GIF tối đa 20 MB.');
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Không mở được ảnh. Hãy chọn ảnh hợp lệ.'));image.src=url;});
    if(!image.naturalWidth||!image.naturalHeight)throw Error('Ảnh không có kích thước hợp lệ.');
    const mime=preserveTransparency&&file.type!=='image/jpeg'?'image/png':'image/jpeg';
    let scale=Math.min(1,maxEdge/Math.max(image.naturalWidth,image.naturalHeight)),best;
    for(let attempt=0;attempt<12;attempt++){
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      const context=canvas.getContext('2d');if(!context)throw Error('Trình duyệt không hỗ trợ nén ảnh.');
      context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
      if(mime==='image/jpeg'){context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);}
      context.drawImage(image,0,0,canvas.width,canvas.height);
      for(const quality of mime==='image/png'?[undefined]:[0.84,0.74,0.64]){
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Không thể nén ảnh.')),mime,quality));
        best={blob,width:canvas.width,height:canvas.height};if(blob.size<=maxBytes)break;
      }
      if(best.blob.size<=maxBytes)break;scale*=0.8;
    }
    if(!best||best.blob.size>maxBytes)throw Error('Không thể giảm ảnh về dung lượng phù hợp. Hãy chọn ảnh khác.');
    // Already small images should never become heavier or be enlarged.
    if(file.type===mime&&file.size<best.blob.size&&file.size<=maxBytes&&Math.max(image.naturalWidth,image.naturalHeight)<=maxEdge)best={blob:file,width:image.naturalWidth,height:image.naturalHeight};
    const data=String(await read(best.blob));
    return {data,base64:data.split(',')[1],type:best.blob.type,blob:best.blob,width:best.width,height:best.height,originalBytes:file.size,compressedBytes:best.blob.size};
  }finally{URL.revokeObjectURL(url);}
}
