const {has}=require('../permissionPolicy');
const fields={COST:['GIANHAP','GIAVON','GIATRIKHO','GIA_TRI','SODUDAU'],PAYROLL:['LUONGCA','LUONGTHANG','LUONGCOBAN','CACHTINHLUONG','NGHITHU7','NGHICHUNHAT'],COMMISSIONS:['HOAHONG','HHKIEU','HHGIATRI']};
function protect(user,data){
  const hidden=Object.entries(fields).flatMap(([code,keys])=>has(user,code)?[]:keys);
  const visit=item=>Array.isArray(item)?item.map(visit):item&&typeof item==='object'?Object.fromEntries(Object.entries(item).filter(([key])=>!hidden.some(field=>key.toUpperCase()===field||key.toUpperCase().endsWith('_'+field))).map(([key,value])=>[key,visit(value)])):item;
  return visit(data);
}
module.exports={protect};
