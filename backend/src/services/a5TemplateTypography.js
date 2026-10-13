const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').trim().toLowerCase();
const children=n=>Array.from(n.childNodes).filter(c=>c.nodeType===1);
const num=(n,key,fallback=0)=>n.hasAttribute(key)&&Number.isFinite(Number(n.getAttribute(key)))?Number(n.getAttribute(key)):fallback;
const textTypes=new Set(['TextObject','TableCell']);
function longDate(value){
 if(!value||Number.isNaN(new Date(value).getTime()))return '';
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date(value));
 const part=type=>parts.find(p=>p.type===type).value;
 return `Ngày ${part('day')} tháng ${part('month')} năm ${part('year')}`;
}
function read(xml){return new DOMParser({onError:e=>{throw Error(String(e));}}).parseFromString(xml.replace(/^\uFEFF/,''),'application/xml');}
function isA5(xml,name=''){
 const doc=read(xml),pages=Array.from(doc.getElementsByTagName('ReportPage'));
 return pages.length>0&&pages.every(p=>{
  const w=num(p,'PaperWidth',210),h=num(p,'PaperHeight',297);
  return (Math.abs(w-148)<=2&&Math.abs(h-210)<=2)||(Math.abs(w-210)<=2&&Math.abs(h-148)<=2)||(!p.hasAttribute('PaperWidth')&&/\bA5\b/i.test(name));
 });
}
function headerRow(row){
 const cells=children(row).filter(n=>n.tagName==='TableCell');
 const labels=['stt','ten hang','ten hang / hang muc','mat hang','hang muc','dvt','sl','s.luong','so luong','don gia','gia','thanh tien','t tien','ck%','ck %','chiet khau'];
 return cells.filter(c=>labels.includes(clean(c.getAttribute('Text')))).length>=2&&cells.every(c=>!/(?:Table0\.|\[Row|\[Index)/i.test(c.getAttribute('Text')||''));
}
function role(n){
 const text=n.getAttribute('Text')||'',t=clean(text).replace(/[:\s]+$/,'');
 if(/\[DocTitle\]/i.test(text))return 'title';
 if(t==='tong'||t==='tong cong'||/^\s*\[(?:TONGCONG|TotalNumberText|GrandTotal)\]\s*$/i.test(text))return 'total';
 // Older FRX templates use a literal title rather than DocTitle.
 if(/^(hoa don|phieu |bao gia|bien ban|lenh sua chua)/.test(t)&&text===text.toUpperCase()&&!text.includes('['))return 'title';
 if(n.tagName==='TableCell'&&headerRow(n.parentNode))return 'header';
 for(let p=n.parentNode;p?.nodeType===1;p=p.parentNode)if(p.tagName==='DataHeaderBand')return 'header';
 return 'body';
}
function apply(xml){
 const doc=read(xml),textNodes=Array.from(doc.getElementsByTagName('*')).filter(n=>textTypes.has(n.tagName));
 let changed=0;
 let hasLongDate=false;
 const roles={title:0,total:0,header:0,body:0};
 const heights=new Map();
 for(const n of textNodes){
  const oldText=n.getAttribute('Text')||'';
  if(/^(?:ngày\s*:?\s*)?\[(?:DocDate|NGAY)\]$/i.test(oldText.trim())||/^Ngày\s.*\btháng\b.*\bnăm\b/i.test(oldText.trim())&&/\[/.test(oldText)){
   n.setAttribute('Text','[DocDateLong]');
   for(const a of Array.from(n.attributes))if(/^Format(?:\.|$)/.test(a.name))n.removeAttribute(a.name);
   changed++;
  }
  if(n.getAttribute('Text')==='[DocDateLong]')hasLongDate=true;
  const r=role(n),size=['title','total'].includes(r)?14:r==='header'?9:10;
  roles[r]++;
  const old=n.getAttribute('Font')||'';
  const styles=['Bold','Italic','Underline','Strikeout'].filter(s=>new RegExp(s,'i').test(old));
  if(['title','total','header'].includes(r)&&!styles.includes('Bold'))styles.unshift('Bold');
  const font=`Tahoma, ${size}pt${styles.length?', style='+styles.join(', '):''}`;
  if(old!==font){n.setAttribute('Font',font);changed++;}
  if(n.tagName==='TableCell'){
   const padding=(n.getAttribute('Padding')||'0,0,0,0').split(',').map(Number);
   const required=Math.ceil(size*96/72*1.15+(padding[1]||0)+(padding[3]||0));
   heights.set(n.parentNode,Math.max(heights.get(n.parentNode)||0,required));
  }else{
   const required=Math.ceil(size*96/72*1.15);
   if(n.hasAttribute('Height')&&num(n,'Height')<required){n.setAttribute('Height',required);changed++;}
  }
 }
 if(hasLongDate){
  let dictionary=doc.getElementsByTagName('Dictionary')[0];
  if(!dictionary){dictionary=doc.createElement('Dictionary');doc.documentElement.insertBefore(dictionary,doc.getElementsByTagName('ReportPage')[0]);}
  if(!Array.from(dictionary.getElementsByTagName('Parameter')).some(n=>n.getAttribute('Name')==='DocDateLong')){
   const p=doc.createElement('Parameter');p.setAttribute('Name','DocDateLong');p.setAttribute('DataType','System.String');dictionary.appendChild(p);changed++;
  }
 }
 for(const table of Array.from(doc.getElementsByTagName('TableObject'))){
  const rows=children(table).filter(n=>n.tagName==='TableRow');
  const oldHeight=num(table,'Height'),fallback=rows.length?oldHeight/rows.length:0;
  let growth=0;
  for(const row of rows){
   const before=num(row,'Height',num(row,'MinHeight',fallback||18.9));
   const required=heights.get(row)||0;
   if(before<required){
    row.setAttribute(row.hasAttribute('Height')?'Height':'MinHeight',required);
    growth+=required-before;changed++;
   }
  }
  if(growth>0){
   table.setAttribute('Height',String(Math.round((oldHeight+growth)*100)/100));
   const parent=table.parentNode;
   if(parent?.tagName?.endsWith('Band')){
    const bottom=num(table,'Top')+oldHeight;
    for(const sibling of children(parent))if(sibling!==table&&!sibling.tagName.endsWith('Band')&&num(sibling,'Top')>=bottom-0.01)sibling.setAttribute('Top',String(Math.round((num(sibling,'Top')+growth)*100)/100));
    parent.setAttribute('Height',String(Math.round((num(parent,'Height')+growth)*100)/100));
   }
  }
 }
 const serialized=changed?new XMLSerializer().serializeToString(doc):xml;
 return {xml:serialized.startsWith('<?xml')?serialized:'<?xml version="1.0" encoding="utf-8"?>\n'+serialized,changed,roles};
}
module.exports={isA5,apply,role,longDate};
