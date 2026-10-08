const groups = [
 ['cash','Quỹ & Thu chi'],['catalog','Danh mục'],['sales','Bán hàng & Doanh thu'],['orders','Đặt hàng'],['stock','Kho hàng'],['debts','Công nợ'],['workshop','Sửa chữa & Xưởng'],['vehicles','Xe, Bảo hành & Bảo dưỡng'],['staff','Nhân viên & Kỹ thuật viên'],['management','Quản trị'],['charts','Biểu đồ'],
].map(([id,name])=>({id,name}));
const labels={code:'Số phiếu / Mã',date:'Ngày',name:'Tên / Nội dung',partner:'Khách hàng / NCC',plate:'Biển số',employee:'Nhân viên',group:'Nhóm',warehouse:'Kho',reason:'Lý do',method:'Phương thức',account:'Tài khoản',phone:'Điện thoại',address:'Địa chỉ',unit:'ĐVT',oem:'Mã OEM',quantity:'Số lượng',price:'Đơn giá',amount:'Giá trị',subtotal:'Tiền hàng / Công',discount:'Giảm giá',tax:'Thuế',fee:'Phí dịch vụ',paid:'Đã thanh toán',remaining:'Còn lại',income:'Thu',expense:'Chi',opening:'Đầu kỳ',closing:'Cuối kỳ',received:'Nhập',issued:'Xuất',minimum:'Tồn tối thiểu',status:'Trạng thái',due:'Ngày hẹn / Hạn',start:'Bắt đầu',end:'Kết thúc',odo:'ODO',allocated:'Hoa hồng phân bổ',eligible:'Đủ điều kiện',pending:'Chưa đủ điều kiện',base:'Lương cơ bản',bonus:'Thưởng',deduction:'Khấu trừ',jobs:'Số lệnh',count:'Số chứng từ',source:'Nguồn',value:'Giá trị',result:'Kết quả xử lý',last:'Xuất gần nhất',days:'Ngày chưa xuất',estimated:'Giá trị ước tính'};
const money=new Set(['price','amount','subtotal','discount','tax','fee','paid','remaining','income','expense','opening','closing','allocated','eligible','pending','base','bonus','deduction','estimated','value']);
const numbers=new Set(['quantity','received','issued','minimum','odo','jobs','count','days']);
const dates=new Set(['date','due','start','end','last']);
const reports=[];
function add(group,id,name,source,cols,options={}){reports.push({id,group,name,source,columns:cols.split(' ').map(key=>({key,label:labels[key]||key,type:money.has(key)?'money':numbers.has(key)?'number':dates.has(key)?'date':'text'})),filters:['from','to','q','partner','plate','employee','warehouse','status','account','method'],...options});}
function missing(group,id,name,reason){add(group,id,name,null,'name',{available:false,reason,filters:[]});}
add('cash','receipts','Phiếu thu','receipts','code date partner reason method account income');
add('cash','payments','Phiếu chi','payments','code date partner reason method account expense');
add('cash','cash-day','Thu chi theo ngày','cash','name income expense',{aggregate:'date'});
add('cash','cash-reason','Thu chi theo lý do (phiếu thu chi)','vouchers','name income expense',{aggregate:'reason'});
add('cash','cash-method','Thanh toán theo phương thức','cash','name income expense',{aggregate:'method'});
add('cash','cashbook','Sổ quỹ tiền mặt','cash','code date partner income expense closing',{ledger:'cash'});
add('cash','bankbook','Sổ tài khoản ngân hàng','cash','code date partner account income expense closing',{ledger:'bank'});
missing('cash','deposits','Đặt cọc, tạm ứng & Hoàn tiền','Chưa có sổ giao dịch riêng xác định ngày đặt cọc/hoàn tiền và liên kết hóa đơn.');
add('catalog','customers','Danh mục khách hàng','customers','code name group phone address',{period:false});
add('catalog','cars','Danh mục xe','cars','plate partner name odo',{period:false});
add('catalog','parts','Phụ tùng & Mã OEM','parts','code name oem group unit price warehouse minimum',{period:false});
add('catalog','services','Dịch vụ sửa chữa','services','code name group price',{period:false});
add('catalog','suppliers','Nhà cung cấp','suppliers','code name group phone address',{period:false});
add('catalog','employees','Nhân viên','employees','code name phone status',{period:false});
add('catalog','locations','Kho & Vị trí','locations','name warehouse',{period:false});
const invoiceCols='code date source partner plate subtotal discount tax fee amount paid remaining';
add('sales','repair-invoices','Hóa đơn sửa chữa','repairInvoices',invoiceCols);
add('sales','sale-invoices','Hóa đơn bán phụ tùng','saleInvoices',invoiceCols);
add('sales','revenue-day','Giá trị hóa đơn theo ngày','invoices','name count subtotal discount tax fee amount paid remaining',{aggregate:'date'});
add('sales','revenue-month','Giá trị hóa đơn theo tháng','invoices','name count subtotal discount tax fee amount paid remaining',{aggregate:'month'});
add('sales','revenue-customer','Giá trị hóa đơn theo khách hàng','invoices','name count amount paid remaining',{aggregate:'partner'});
add('sales','revenue-vehicle','Giá trị hóa đơn sửa chữa theo xe','repairInvoices','name count amount paid remaining',{aggregate:'plate'});
add('sales','sold-parts','Mặt hàng bán','soldParts','code date partner name group quantity price amount');
add('sales','used-parts','Phụ tùng thực xuất cho sửa chữa','repairMovements','code date plate name quantity price amount');
add('sales','service-detail','Dịch vụ theo lệnh sửa chữa','repairServices','code date plate name quantity price amount');
add('sales','charges','Giảm giá, Thuế & Phí','invoices',invoiceCols);
add('sales','payment-detail','Thanh toán nhiều lần','paymentDetails','code date source partner method account amount');
missing('orders','customer-orders','Phụ tùng khách đặt','Database hiện tại chưa có phiếu khách đặt độc lập với hóa đơn bán hàng.');
missing('orders','purchase-orders','Đơn đặt mua & Nhận hàng','Chưa có quan hệ đơn đặt mua – dòng nhận hàng; không dùng phiếu nhập thay cho đơn đặt mua.');
missing('orders','part-needs','Nhu cầu phụ tùng theo lệnh','Cần quy tắc xác định dòng phụ tùng đã duyệt và liên kết từng lần xuất để tính số còn thiếu.');
missing('orders','overdue-orders','Đơn đặt hàng quá hẹn','Chưa có đơn đặt hàng và ngày hẹn nhận.');
add('stock','stock-in','Nhập phụ tùng','receiptMovements','code date partner warehouse name quantity price amount');
add('stock','stock-out','Xuất phụ tùng theo nguồn','outMovements','code date source plate warehouse name quantity amount');
add('stock','stock-balance','Nhập – Xuất – Tồn','stock','code name warehouse unit opening received issued closing');
add('stock','stock-card','Thẻ kho phụ tùng','movements','code date source warehouse name received issued closing',{stockLedger:true});
add('stock','stock-value','Giá trị tồn (ước tính theo giá nhập hiện tại)','stock','code name warehouse closing price estimated',{sensitive:'cost'});
add('stock','stock-low','Hàng dưới định mức','stock','code name warehouse closing minimum',{stockFilter:'low'});
add('stock','stock-negative','Tồn âm','stock','code name warehouse closing',{stockFilter:'negative'});
add('stock','stock-slow','Hàng tồn lâu','stock','code name warehouse closing last days',{stockFilter:'slow'});
missing('stock','stock-count','Kiểm kê & Chênh lệch','Chưa xác minh luồng phiếu kiểm kê thực tế của gara và đơn vị quy đổi.');
missing('stock','stock-transfer','Chuyển kho','Chưa có nghiệp vụ chuyển kho độc lập được xác minh.');
for(const [kind,title] of [['customer','khách hàng'],['supplier','nhà cung cấp']]){
 add('debts',kind+'-debt','Tổng hợp công nợ '+title,kind+'Debt','name opening amount paid closing');
 add('debts',kind+'-ledger','Đối chiếu công nợ '+title,kind+'Ledger','code date partner source amount paid closing');
 add('debts',kind+'-advance','Trả trước / Trả thừa '+title,kind+'Debt','name opening amount paid closing',{advance:true});
}
missing('debts','overdue-debt','Công nợ quá hạn','Chưa có hạn thanh toán trên hóa đơn/phiếu nhập.');
add('workshop','receptions','Xe tiếp nhận','receptions','code date plate partner employee odo status');
add('workshop','quotes','Báo giá & Chờ duyệt','quotes','code date plate partner amount status');
add('workshop','supplements','Hạng mục bổ sung','supplements','code date plate name status');
add('workshop','repairs','Lệnh sửa chữa','repairs','code date plate partner start end status amount');
add('workshop','progress','Tiến độ xưởng hiện tại','workflow','code date plate partner employee status due',{period:false});
add('workshop','completed','Hoàn thành & Bàn giao','workflow','code date plate partner employee status due',{completed:true});
add('workshop','late-cars','Xe đang làm quá ngày hẹn','workflow','code date plate partner employee status due',{late:true,period:false});
missing('workshop','waiting-parts','Xe chờ phụ tùng','Chưa có trạng thái chờ phụ tùng được ghi nhận rõ ràng.');
add('vehicles','vehicle-history','Lịch sử sửa chữa theo xe','repairs','code date plate partner start end amount');
add('vehicles','vehicle-parts','Phụ tùng đã thay theo xe','repairMovements','code date plate name quantity amount');
add('vehicles','warranties','Bảo hành','warranties','code date plate partner name end status');
add('vehicles','warranty-active','Bảo hành còn hiệu lực','warranties','code date plate partner name end status',{activeWarranty:true,period:false});
add('vehicles','warranty-expiring','Bảo hành sắp hết hạn','warranties','code date plate partner name end status',{expiring:true,period:false});
add('vehicles','warranty-handling','Xử lý bảo hành','warranties','code date plate name result amount');
add('vehicles','maintenance','Lịch bảo dưỡng','maintenance','code date plate partner name odo due',{period:false});
add('vehicles','maintenance-due','Xe đến hạn bảo dưỡng','maintenance','code date plate partner name odo due',{maintenanceDue:true,period:false});
add('staff','assignments','Phân công & Hoa hồng','commissions','code date plate partner employee allocated eligible pending',{sensitive:'salary'});
add('staff','staff-productivity','Số lệnh theo kỹ thuật viên','commissions','name jobs',{aggregate:'employee',productivity:true});
add('staff','staff-commission','Hoa hồng theo nhân viên','commissions','name jobs allocated eligible pending',{aggregate:'employee',sensitive:'salary'});
add('staff','payroll','Bảng lương đã lưu','payroll','code date employee base allocated bonus deduction amount',{sensitive:'salary'});
missing('staff','salary-paid','Đối chiếu lương / Hoa hồng đã chi','Chưa có liên kết phiếu chi với bảng lương và khoản hoa hồng.');
missing('staff','labor-time','Năng suất theo giờ làm','Chưa xác minh ghi nhận thời gian làm việc thực tế đầy đủ.');
add('management','overview','Tổng quan hóa đơn gara','invoices','name count amount paid remaining',{aggregate:'source'});
add('management','repair-effect','Giá trị hóa đơn theo lệnh sửa chữa','repairInvoices','code date plate partner subtotal discount tax fee amount remaining');
add('management','customer-return','Khách hàng quay lại sửa chữa','repairs','name jobs amount',{aggregate:'partner'});
add('management','warranty-cost','Chi phí bảo hành đã ghi nhận','warranties','code date plate name amount',{sensitive:'cost'});
missing('management','profit','Lãi phụ tùng / Hóa đơn','Có trường giá vốn nhưng chưa xác minh dữ liệu lịch sử và quy tắc phân bổ giảm giá/thuế.');
missing('management','business-result','Kết quả kinh doanh / Lợi nhuận','Cần xác minh giá vốn và phân loại chi phí trước khi tính lợi nhuận.');
for(const [id,title,source,aggregate,cols] of [
 ['chart-revenue','Giá trị hóa đơn theo tháng','invoices','month','name count amount'],['chart-cash','Thu chi theo ngày','cash','date','name income expense'],['chart-workshop','Xe theo trạng thái hiện tại','workflow','status','name count'],['chart-revenue-source','Cơ cấu hóa đơn sửa chữa / Bán phụ tùng','invoices','source','name count amount'],['chart-parts','Phụ tùng bán nhiều','soldParts','name','name quantity amount'],['chart-staff','Số lệnh theo KTV','commissions','employee','name jobs']
]) add('charts',id,title,source,cols,{aggregate,chart:true,period:source!=='workflow',productivity:source==='commissions'});
for(const r of reports){if(r.group==='stock')r.filters=['from','to','q','warehouse'];if(r.source==='payroll')r.filters=['from','to','q','employee'];}
function permitted(user,report,print=false){if(Number(user?.ISADMIN)===1)return true;const p=user?.permissions||{};return (Number(p.REPORTS)&(print?17:1))===(print?17:1)&&(!(report.group==='staff'||report.id==='employees'||report.id==='chart-staff')||(Number(p.EMPLOYEES)&1)===1)&&(!report.sensitive||(report.sensitive==='salary'?(Number(p.EMPLOYEES)&1)===1:(Number(p.INVENTORY)&1)===1&&(Number(p.FINANCE)&1)===1));}
module.exports={groups,reports,permitted};
