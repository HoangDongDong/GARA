export function financeDay(value){if(!value)return '';const date=new Date(value);if(Number.isNaN(date.getTime()))return '';const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
export function currentFinanceMonth(now=new Date()){const today=financeDay(now);return {from:today.slice(0,7)+'-01',to:today};}
export function financeOverview(rows,{from='',to='',search='',type='',category=''}={}){
  const keyword=search.trim().toLocaleLowerCase('vi');
  const filtered=rows.filter(row=>{const day=financeDay(row.date);return (!from||day>=from)&&(!to||day<=to)&&(!keyword||[row.code,row.description,row.partner].join(' ').toLocaleLowerCase('vi').includes(keyword))&&(!type||(type==='Thu'?Number(row.income)>0:Number(row.expense)>0))&&(!category||row.category===category);});
  const totals=filtered.reduce((sum,row)=>({income:sum.income+Number(row.income||0),expense:sum.expense+Number(row.expense||0)}),{income:0,expense:0});
  const balance=rows.filter(row=>(!to||financeDay(row.date)<=to)&&row.method==='cash').reduce((sum,row)=>sum+Number(row.income||0)-Number(row.expense||0),0);
  const months=new Map();for(const row of filtered){const month=financeDay(row.date).slice(0,7);if(!month)continue;const sum=months.get(month)||{thu:0,chi:0};sum.thu+=Number(row.income||0)/1e6;sum.chi+=Number(row.expense||0)/1e6;months.set(month,sum);}
  return {rows:filtered,income:totals.income,expense:totals.expense,balance,monthly:[...months].sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>({month:key.slice(5)+'/'+key.slice(0,4),...value}))};
}
