import { pathToFileURL } from 'node:url';
import { readdir } from 'node:fs/promises';
const puppeteer = (await import(process.env.PUPPETEER_MODULE ? pathToFileURL(process.env.PUPPETEER_MODULE).href : 'puppeteer-core')).default;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  page.on('pageerror', error => console.error('Browser:', error.message));
  const builtWorker = process.env.TEST_BUILT_WORKER ? (await readdir(new URL('../dist/assets/',import.meta.url))).find(name=>name.startsWith('partImage.worker-')) : '';
  await page.goto(process.env.TEST_URL || 'http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async builtWorker => {
    const preparePartImage = builtWorker ? (()=>{
      const worker=new Worker(`/assets/${builtWorker}`,{type:'module'});
      let id=0;
      return (file,onProgress)=>new Promise((resolve,reject)=>{
        const jobId=++id;
        worker.onmessage=({data})=>{if(data.id!==jobId)return;if(data.progress)onProgress(data.progress);else if(data.error)reject(new Error(data.error));else resolve(data.value);};
        worker.onerror=event=>reject(new Error(event.message));
        worker.postMessage({id:jobId,file,publicPath:new URL('/part-image-model/',location.origin).href});
      });
    })() : (await import('/src/utils/partImage.js')).preparePartImage;
    const canvas = document.createElement('canvas'); canvas.width=2000; canvas.height=1500;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#cccccc';ctx.fillRect(0,0,2000,1500);
    ctx.fillStyle='#ef6000';ctx.fillRect(650,250,700,1000);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
    const file=new File([blob],'part-test.jpg',{type:'image/jpeg'});
    const input=document.createElement('input');document.body.append(input);
    const reports=[];
    for(let run=0;run<2;run++) {
      let previous=performance.now(),maxGap=0,ticks=0,progressMessages=0;
      const start=performance.now();
      const timer=setInterval(()=>{const now=performance.now();maxGap=Math.max(maxGap,now-previous);previous=now;ticks++;input.value+='a';input.dispatchEvent(new Event('input',{bubbles:true}));},20);
      let value;
      try {value=await preparePartImage(file,()=>progressMessages++);}finally{clearInterval(timer);}
      const output=await createImageBitmap(await (await fetch(value)).blob());
      const sample=new OffscreenCanvas(output.width,output.height);const sampleCtx=sample.getContext('2d');sampleCtx.drawImage(output,0,0);
      const rgb=[...sampleCtx.getImageData(0,0,1,1).data];
      reports.push({run,elapsedMs:Math.round(performance.now()-start),maxUiGapMs:Math.round(maxGap),inputTicks:ticks,progressMessages,width:output.width,height:output.height,corner:rgb,jpeg:value.startsWith('data:image/jpeg;base64,')});output.close();
    }
    return reports;
  },builtWorker);
  console.log(JSON.stringify(result));
  if(result.some(r=>!r.jpeg||r.width>1600||r.height>1600||r.inputTicks<2||r.maxUiGapMs>1000||r.corner.slice(0,3).some(v=>v<245)))throw new Error('Image/response checks failed');
}finally{await browser.close();}

