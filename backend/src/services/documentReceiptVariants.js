// Detail discounts are already allocated in repair records; do not deduct them twice.
function prepare(data) {
 let discount=0;
 for(const row of data.tables.Table0){
  row.LineDiscountAmount=Math.min(Math.max(Number(row.TIENGIAMGIA||0),0),Math.max(Number(row.THANHTIEN||0),0));
  row.LineDiscountRate=row.LineDiscountAmount?Number(row.TILEGIAMGIA||0):0;
  row.LineDiscountText=row.LineDiscountRate?`${row.LineDiscountRate}%`:'';
  row.LineNetAmount=Number(row.THANHTIEN||0)-row.LineDiscountAmount;
  discount+=row.LineDiscountAmount;
 }
 data.parameters.TIENHANG=Number(data.parameters.TIENHANG||0)-discount;
 data.parameters.TIENGIAMGIA=Math.max(0,Number(data.parameters.TIENGIAMGIA||0)-discount);
}
module.exports={prepare};
