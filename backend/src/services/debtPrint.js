const debts=require('./debts');
const day=value=>value instanceof Date ? `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}` : String(value||'').slice(0,10);
function summarize(history,from,to) {
  let opening=0; const rows=[];
  for(const entry of history) {
    const date=day(entry.date || entry.created),amount=Math.round((entry.total-entry.payment)*100)/100;
    if(date<from){opening+=amount;continue;}
    if(date>to)continue;
    rows.push({ItemName:entry.code,Amount:amount,Note:`${date}; ${entry.description||''}; phát sinh ${entry.total}; thanh toán ${entry.payment}`});
  }
  opening=Math.round(opening*100)/100;
  rows.unshift({ItemName:'Số dư đầu kỳ',Amount:opening,Note:`Trước ${from}`});
  return {rows,total:Math.round(rows.reduce((sum,row)=>sum+row.Amount,0)*100)/100};
}
async function load(kind,id,from,to) {
  const ledger=await debts.ledger();
  return summarize(ledger[kind].find(row=>row.id===id)?.history || [],from,to);
}
module.exports={summarize,load};
