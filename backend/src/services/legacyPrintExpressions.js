const digits=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
function groupWords(value,full){const h=Math.floor(value/100),t=Math.floor(value/10)%10,u=value%10;const words=[];
 if(h||full)words.push(digits[h],'trăm');
 if(t>1){words.push(digits[t],'mươi');if(u)words.push(u===1?'mốt':u===5?'lăm':digits[u]);}
 else if(t===1){words.push('mười');if(u)words.push(u===5?'lăm':digits[u]);}
 else if(u){if(h||full)words.push('lẻ');words.push(digits[u]);}
 return words.join(' ');
}
function toVndWords(value){const number=Number(value);if(!Number.isSafeInteger(number))throw new Error('Số tiền bằng chữ phải là số nguyên trong giới hạn hỗ trợ.');if(!number)return 'Không';
 let rest=Math.abs(number);const groups=[];while(rest){groups.push(rest%1000);rest=Math.floor(rest/1000);}const scales=['','nghìn','triệu','tỷ','nghìn tỷ','triệu tỷ'];const words=[];
 for(let i=groups.length-1;i>=0;i--){if(!groups[i])continue;words.push(groupWords(groups[i],i<groups.length-1&&groups[i]<100),scales[i]);}
 const text=(number<0?'âm ':'')+words.filter(Boolean).join(' ');return text[0].toUpperCase()+text.slice(1);
}
function mapLegacyMoneyWords(xml,data){return xml.replace(/\[ToVndWords\(\[([A-Za-z0-9_]+)\]\)\]/g,(_,field)=>{if(!(field in data.parameters))throw new Error('Thiếu dữ liệu số tiền: '+field);const key='VndWords_'+field;data.parameters[key]=toVndWords(data.parameters[field]);return '['+key+']';});}
module.exports={toVndWords,mapLegacyMoneyWords};
