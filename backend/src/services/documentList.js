function filters(input={},alias){
  const limit=Number(input.limit??100),offset=Number(input.offset??0);
  if(!Number.isInteger(limit)||limit<1||limit>500||!Number.isInteger(offset)||offset<0||offset>10000000)throw Object.assign(new Error('Phân trang không hợp lệ.'),{status:400});
  const clauses=[],params=[];const q=String(input.q||'').trim();
  if(q.length>120)throw Object.assign(new Error('Từ khóa quá dài.'),{status:400});
  if(q){clauses.push(`UPPER(${alias}.NAME) CONTAINING UPPER(?)`);params.push(q);}
  for(const [key,operator] of [['from','>='],['to','<=']])if(input[key]){
    const value=input[key];if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw Object.assign(new Error('Ngày lọc không hợp lệ.'),{status:400});
    clauses.push(`CAST(${alias}.NGAY AS DATE)${operator}?`);params.push(value);
  }
  if(input.from&&input.to&&input.from>input.to)throw Object.assign(new Error('Khoảng ngày không hợp lệ.'),{status:400});
  return {limit,offset,select:`FIRST ${limit+1} SKIP ${offset}`,where:clauses.length?' AND '+clauses.join(' AND '):'',params};
}
function response(rows,page){return {data:rows.slice(0,page.limit),pagination:{limit:page.limit,offset:page.offset,hasMore:rows.length>page.limit,nextOffset:page.offset+page.limit}};}
module.exports={filters,response};
