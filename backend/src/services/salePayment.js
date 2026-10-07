const fail=message=>Object.assign(new Error(message),{status:400});
function calculate(total,input={},customerId) {
  const explicit=input.payments;
  const method=Number(input.LOAITHANHTOAN || 0);
  const values=explicit || {cashGiven:method===0?total:0,card:method===2?total:0,transfer:method===1?total:0};
  const amounts=['cashGiven','card','transfer'].map(key=>Number(values[key] || 0));
  if(amounts.some(value=>!Number.isFinite(value) || value<0 || value>Number.MAX_SAFE_INTEGER || Math.abs(value*100-Math.round(value*100))>1e-6))throw fail('Số tiền thanh toán không hợp lệ, tối đa 2 chữ số thập phân.');
  const [cashGiven,card,transfer]=amounts;
  if(Number(values.prepaid || 0)!==0)throw fail('Chưa có dữ liệu thẻ trả trước để thanh toán.');
  if(card+transfer>total)throw fail('Tiền thẻ và chuyển khoản không được vượt tổng thanh toán.');
  if(explicit && transfer>0 && !input.DTAIKHOANNGANHANGID)throw fail('Vui lòng chọn tài khoản nhận chuyển khoản.');
  const cash=Math.min(cashGiven,Math.max(0,total-card-transfer));
  const paid=Math.round((cash+card+transfer)*100)/100;
  const debt=Math.round((total-paid)*100)/100;
  if(debt>0 && (!explicit || values.allowDebt!==true))throw fail('Số tiền chưa đủ. Tích Cho phép khách nợ nếu ghi nhận công nợ.');
  if(debt>0 && !customerId)throw fail('Vui lòng chọn khách hàng để ghi nhận công nợ.');
  return {cashGiven,cash,card,transfer,change:Math.round((cashGiven-cash)*100)/100,paid,debt,
    method:[cash,transfer,card].filter(value=>value>0).length>1?4:card>0?2:transfer>0?1:0};
}
module.exports={calculate};
