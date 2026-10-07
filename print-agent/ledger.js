'use strict';
// Network retry is a report retry, never a second physical submission.
async function recoverLedger(ledger,report,persist){
 for(const [id,row] of Object.entries(ledger)){
  if(row.reported)continue;
  if(row.state==='dispatching'){row.state='needs_review';row.detail='Agent khởi động lại trong lúc gửi; kiểm tra giấy trước khi in lại.';persist();}
  if(!['submitted','failed','needs_review'].includes(row.state))continue;
  try{await report(id,row.state,row.detail);}catch(e){
   if(![404,409].includes(e.status))throw e;
   row.reportNotice='Máy chủ đã kết thúc lệnh hoặc lệnh không thuộc trạm hiện tại.';
  }
  row.reported=true;persist();
 }
}
module.exports={recoverLedger};
