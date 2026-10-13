// FastReport parses ISO timestamps as DateTime and formats them using the FRX.
// Send wall-clock values in the garage's timezone, independent of host timezone.
const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function normalize(data){
 if(data instanceof Date){
  if(Number.isNaN(data.getTime()))return '';
  const parts=Object.fromEntries(formatter.formatToParts(data).map(part=>[part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
 }
 if(Array.isArray(data))return data.map(normalize);
 if(data&&typeof data==='object')return Object.fromEntries(Object.entries(data).map(([key,value])=>[key,normalize(value)]));
 return data;
}
function applyTimeLabels(xml,parameters){
 const stamp=parameters.GIOTHANHTOAN;
 if(typeof stamp!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(stamp))return xml;
 return xml.replace(/<(?:TextObject|TableCell)\b[^>]*>/g,tag=>{
  if(!/Text="In lúc:\s*\[GIOTHANHTOAN\]"/i.test(tag))return tag;
  return tag.replace(/\[GIOTHANHTOAN\]/g,stamp.slice(11)).replace(/\sFormat(?:\.[\w]+)?="[^"]*"/g,'');
 });
}
module.exports={normalize,applyTimeLabels};
