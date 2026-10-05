import { useState } from 'react';

export default function MuaLinhKienPage() {
  const [activeTab, setActiveTab] = useState('donmuahang');

  return (
    <div className="dashboard" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 10 }}>
        <h1>
          <span className="page-icon">📦</span>
          Mua linh kiện & Kho phụ tùng
        </h1>
        <div className="page-actions" style={{ display: 'flex', gap: 8 }}>
           <button className="btn" style={{ background: '#E65100', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 4, fontWeight: 600 }}>+ Tạo đơn mua hàng</button>
           <button className="btn" style={{ background: 'white', border: '1px solid #E0E0E0', padding: '6px 12px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6 }}>📊 Import Excel</button>
           <select className="btn" style={{ background: 'white', border: '1px solid #E0E0E0', padding: '6px 12px', borderRadius: 4, minWidth: 120 }}><option>Báo cáo</option></select>
           <button className="btn" style={{ background: 'white', border: '1px solid #E0E0E0', padding: '6px 12px', borderRadius: 4 }}>...</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-scroll-container" style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
         {[
           { id: 'danhsach', label: 'Danh sách mua hàng' },
           { id: 'donmuahang', label: '📝 Đơn mua hàng' },
           { id: 'nhapkho', label: 'Nhập kho' },
           { id: 'khophutung', label: 'Kho phụ tùng' },
           { id: 'nhacungcap', label: 'Nhà cung cấp' },
           { id: 'congno', label: 'Công nợ NCC' }
         ].map((t) => (
            <div key={t.id} onClick={() => setActiveTab(t.id)} style={{ 
               padding: '7px 14px',
               background: activeTab === t.id ? '#E65100' : 'white',
               color: activeTab === t.id ? 'white' : '#424242',
               border: '1px solid #E0E0E0',
               borderRadius: 4,
               cursor: 'pointer',
               fontSize: 12,
               fontWeight: activeTab === t.id ? 700 : 500,
               flex: '0 0 auto',
               whiteSpace: 'nowrap'
            }}>
               {t.label}
            </div>
         ))}
      </div>

      {/* Filters */}
      <div className="responsive-filter-bar" style={{ marginBottom: 10 }}>
         <div className="filter-search-col"><label>Tìm kiếm</label><input type="text" placeholder="Mã đơn, NCC, tên hàng, mã phụ tùng..." /></div>
         <div className="filter-col"><label>Từ ngày</label><input type="date" defaultValue="2025-09-01" /></div>
         <div className="filter-col"><label>Đến ngày</label><input type="date" defaultValue="2025-09-30" /></div>
         <div className="filter-col"><label>Trạng thái</label><select><option>Tất cả</option></select></div>
         <div className="filter-col"><label>NCC</label><select><option>Tất cả</option></select></div>
         <div className="filter-btn-col">
            <button style={{ background: '#E65100', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, fontWeight: 600, height: 35, width: '100%', cursor: 'pointer' }}>🔍 Tìm kiếm</button>
         </div>
      </div>

      <div className="mlk-main-split">
        
        {/* Left Column */}
        <div className="mlk-col-left">
          
          <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
               <h3><span className="icon">📄</span> Danh sách đơn mua hàng</h3>
            </div>
            <div className="card-body no-padding table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
              <table className="table" style={{ border: 'none', minWidth: 620 }}>
                 <thead><tr><th>STT</th><th>Mã đơn</th><th>Ngày đặt</th><th>Nhà cung cấp</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                 <tbody>
                    <tr style={{ background: '#FFF3E0' }}><td>1</td><td>PO-2025-0012</td><td>30/09/2025</td><td>Công ty TNHH Phụ Tùng A</td><td className="text-right">125.600.000</td><td><span className="badge badge-warning">Đang xử lý</span></td><td>👁️ ⚙️ ⋮</td></tr>
                    <tr><td>2</td><td>PO-2025-0011</td><td>28/09/2025</td><td>Công ty TNHH Nhật Minh</td><td className="text-right">86.750.000</td><td><span className="badge badge-success">Đã nhập kho</span></td><td>👁️ ⚙️ ⋮</td></tr>
                    <tr><td>3</td><td>PO-2025-0010</td><td>25/09/2025</td><td>Công ty TNHH Auto Parts</td><td className="text-right">210.450.000</td><td><span className="badge badge-success">Đã nhập kho</span></td><td>👁️ ⚙️ ⋮</td></tr>
                    <tr><td>4</td><td>PO-2025-0009</td><td>22/09/2025</td><td>Phụ tùng Ô tô Thành Công</td><td className="text-right">56.300.000</td><td><span className="badge badge-success">Đã nhập kho</span></td><td>👁️ ⚙️ ⋮</td></tr>
                    <tr><td>5</td><td>PO-2025-0008</td><td>18/09/2025</td><td>Công ty TNHH Phụ Tùng A</td><td className="text-right">98.000.000</td><td><span className="badge badge-success">Đã nhập kho</span></td><td>👁️ ⚙️ ⋮</td></tr>
                    <tr><td>6</td><td>PO-2025-0007</td><td>15/09/2025</td><td>Công ty TNHH Nhật Minh</td><td className="text-right">47.820.000</td><td><span className="badge badge-success">Đã nhập kho</span></td><td>👁️ ⚙️ ⋮</td></tr>
                    <tr><td>7</td><td>PO-2025-0006</td><td>12/09/2025</td><td>Công ty TNHH Auto Parts</td><td className="text-right">133.600.000</td><td><span className="badge badge-success">Đã nhập kho</span></td><td>👁️ ⚙️ ⋮</td></tr>
                    <tr><td>8</td><td>PO-2025-0005</td><td>08/09/2025</td><td>Phụ tùng Ô tô Thành Công</td><td className="text-right">75.300.000</td><td><span className="badge badge-success">Đã nhập kho</span></td><td>👁️ ⚙️ ⋮</td></tr>
                    <tr><td>9</td><td>PO-2025-0004</td><td>05/09/2025</td><td>Công ty TNHH Phụ Tùng A</td><td className="text-right">112.000.000</td><td><span className="badge badge-success">Đã nhập kho</span></td><td>👁️ ⚙️ ⋮</td></tr>
                    <tr><td>10</td><td>PO-2025-0003</td><td>01/09/2025</td><td>Công ty TNHH Nhật Minh</td><td className="text-right">64.750.000</td><td><span className="badge badge-success">Đã nhập kho</span></td><td>👁️ ⚙️ ⋮</td></tr>
                 </tbody>
              </table>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span>Tổng cộng: 10 đơn</span>
               <div className="pagination">
                 <button className="btn btn-ghost">&lt;</button>
                 <button className="btn active" style={{ background: '#E65100', color: 'white', border: 'none' }}>1</button>
                 <button className="btn btn-ghost">&gt;</button>
               </div>
            </div>
          </div>

          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
               <h3><span className="icon">📝</span> Tạo đơn mua hàng</h3>
            </div>
            <div className="card-body mlk-create-body" style={{ flex: 1, overflowY: 'auto' }}>
               
               <div className="mlk-create-info">
                  <h4 style={{ margin: 0, fontSize: 13, color: '#E65100' }}>Thông tin chung</h4>
                  <div>
                     <label>Nhà cung cấp <span className="required">*</span></label>
                     <div style={{ display: 'flex', gap: 4 }}>
                        <select style={{ flex: 1 }}><option>Chọn nhà cung cấp</option></select>
                        <button style={{ background: '#E65100', color: 'white', border: 'none', borderRadius: 4, width: 28, cursor: 'pointer' }}>+</button>
                     </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                     <div style={{ flex: 1 }}><label>Ngày đặt <span className="required">*</span></label><input type="text" defaultValue="30/09/2025" /></div>
                     <div style={{ flex: 1 }}><label>Người đặt <span className="required">*</span></label><input type="text" defaultValue="admin" /></div>
                  </div>
                  <div>
                     <label>Ghi chú</label>
                     <textarea rows="3" style={{ resize: 'none' }}></textarea>
                  </div>
               </div>
               
               <div className="mlk-create-items">
                  <h4 style={{ margin: 0, fontSize: 13, color: '#E65100' }}>Thêm hàng hóa</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                     <input type="text" placeholder="Quét mã vạch / Nhập mã phụ tùng" style={{ flex: 1 }} />
                     <button style={{ background: '#E65100', color: 'white', border: 'none', borderRadius: 4, padding: '0 16px', fontSize: 12, cursor: 'pointer' }}>🔍 Thêm</button>
                  </div>
                  <div className="table-responsive" style={{ border: '1px solid #eee', borderRadius: 4, flex: 1 }}>
                     <table className="table" style={{ border: 'none', minWidth: 500 }}>
                        <thead><tr><th>STT</th><th>Mã phụ tùng</th><th>Tên phụ tùng</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>Xóa</th></tr></thead>
                        <tbody>
                           <tr><td>1</td><td>TOY-17801-0T040</td><td>Lọc dầu Toyota</td><td className="text-center">10</td><td className="text-right">250.000</td><td className="text-right">2.500.000</td><td className="text-center" style={{color:'red'}}>❌</td></tr>
                           <tr><td>2</td><td>HON-15400-PLC-004</td><td>Lọc gió Honda</td><td className="text-center">10</td><td className="text-right">180.000</td><td className="text-right">1.800.000</td><td className="text-center" style={{color:'red'}}>❌</td></tr>
                           <tr><td>3</td><td>BOS-0986B02-360</td><td>Bố thắng trước</td><td className="text-center">5</td><td className="text-right">680.000</td><td className="text-right">3.400.000</td><td className="text-center" style={{color:'red'}}>❌</td></tr>
                           <tr><td>4</td><td>DENSO-90919-02258</td><td>Bugi Denso</td><td className="text-center">10</td><td className="text-right">320.000</td><td className="text-right">3.200.000</td><td className="text-center" style={{color:'red'}}>❌</td></tr>
                        </tbody>
                     </table>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                     <button style={{ background: 'white', border: '1px solid #E65100', color: '#E65100', borderRadius: 4, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ Thêm hàng</button>
                     <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                           <div style={{ fontSize: 10, color: '#757575' }}>Tổng tiền (VND)</div>
                           <div style={{ fontSize: 18, fontWeight: 700, color: '#E65100' }}>10.900.000</div>
                        </div>
                        <button style={{ background: '#E65100', color: 'white', border: 'none', borderRadius: 4, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>Lưu đơn</button>
                     </div>
                  </div>
               </div>

            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="mlk-col-right">
          
          <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ flexWrap: 'wrap', gap: 6 }}>
               <h3><span className="icon">📄</span> Chi tiết đơn <span style={{ color: '#E65100' }}>PO-2025-0012</span> <span className="badge badge-warning" style={{ marginLeft: 6 }}>Đang xử lý</span></h3>
               <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" style={{ border: '1px solid #eee' }}>✏️ Sửa</button>
                  <button className="btn btn-ghost btn-sm" style={{ border: '1px solid #eee', color: 'red' }}>🗑️ Xóa</button>
                  <button className="btn btn-ghost btn-sm" style={{ border: '1px solid #eee' }}>🖨️ In</button>
               </div>
            </div>
            <div className="card-body" style={{ flex: 1, overflowY: 'auto' }}>
               <div className="responsive-grid-2" style={{ gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                     <div className="detail-row"><div className="detail-label" style={{ width: 80 }}>Nhà cung cấp</div><div className="detail-value">Công ty TNHH Phụ Tùng A</div></div>
                     <div className="detail-row"><div className="detail-label" style={{ width: 80 }}>Ngày đặt</div><div className="detail-value">30/09/2025 09:15</div></div>
                     <div className="detail-row"><div className="detail-label" style={{ width: 80 }}>Người đặt</div><div className="detail-value">Nguyễn Văn A</div></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                     <div className="detail-row"><div className="detail-label" style={{ width: 80 }}>Tổng tiền</div><div className="detail-value" style={{ fontWeight: 700 }}>125.600.000đ</div></div>
                     <div className="detail-row"><div className="detail-label" style={{ width: 80 }}>Thanh toán</div><div className="detail-value" style={{ color: 'red', fontWeight: 600 }}>Chưa thanh toán</div></div>
                     <div className="detail-row"><div className="detail-label" style={{ width: 80 }}>Ghi chú</div><div className="detail-value" style={{ fontSize: 11 }}></div></div>
                  </div>
               </div>

               <h4 style={{ margin: '0 0 8px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{color:'#E65100'}}>📦</span> Danh sách hàng hóa</h4>
               <div className="table-responsive">
                 <table className="table" style={{ border: '1px solid #eee', minWidth: 600 }}>
                    <thead><tr><th>STT</th><th>Mã phụ tùng</th><th>Tên phụ tùng</th><th>Hãng</th><th>SL đặt</th><th>Đơn giá</th><th>Thành tiền</th><th>Trạng thái</th></tr></thead>
                    <tbody>
                       <tr><td>1</td><td>TOY-17801-0T040</td><td>Lọc dầu</td><td>Toyota</td><td className="text-center">10</td><td className="text-right">250.000</td><td className="text-right">2.500.000</td><td><span className="badge badge-warning">Đang xử lý</span></td></tr>
                       <tr><td>2</td><td>HON-15400-PLC-004</td><td>Lọc gió</td><td>Honda</td><td className="text-center">10</td><td className="text-right">180.000</td><td className="text-right">1.800.000</td><td><span className="badge badge-warning">Đang xử lý</span></td></tr>
                       <tr><td>3</td><td>BOS-0986B02-360</td><td>Bố thắng trước</td><td>Bosch</td><td className="text-center">5</td><td className="text-right">680.000</td><td className="text-right">3.400.000</td><td><span className="badge badge-warning">Đang xử lý</span></td></tr>
                       <tr><td>4</td><td>DENSO-90919-02258</td><td>Bugi</td><td>Denso</td><td className="text-center">10</td><td className="text-right">320.000</td><td className="text-right">3.200.000</td><td><span className="badge badge-warning">Đang xử lý</span></td></tr>
                       <tr><td>5</td><td>KYB-343310</td><td>Giảm xóc trước</td><td>KYB</td><td className="text-center">2</td><td className="text-right">2.800.000</td><td className="text-right">5.600.000</td><td><span className="badge badge-warning">Đang xử lý</span></td></tr>
                    </tbody>
                 </table>
               </div>
            </div>
          </div>

          <div className="mlk-bottom-split">
             <div className="card" style={{ flex: 2, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
               <div className="card-header"><h3><span className="icon">📦</span> Tồn kho & giá tham khảo</h3></div>
               <div className="card-body no-padding table-responsive" style={{ flex: 1, overflowY: 'auto' }}>
                 <table className="table" style={{ border: 'none', minWidth: 440 }}>
                    <thead><tr><th>Mã phụ tùng</th><th>Tên phụ tùng</th><th>Tồn kho</th><th>Giá nhập</th><th>Giá bán</th></tr></thead>
                    <tbody>
                       <tr><td>TOY-17801-0T040</td><td>Lọc dầu Toyota</td><td className="text-center">45</td><td className="text-right">180.000</td><td className="text-right">250.000</td></tr>
                       <tr><td>HON-15400-PLC-004</td><td>Lọc gió Honda</td><td className="text-center">38</td><td className="text-right">120.000</td><td className="text-right">180.000</td></tr>
                       <tr><td>BOS-0966B02-360</td><td>Bố thắng trước</td><td className="text-center">25</td><td className="text-right">450.000</td><td className="text-right">680.000</td></tr>
                       <tr><td>DENSO-90919-02258</td><td>Bugi Denso</td><td className="text-center">60</td><td className="text-right">220.000</td><td className="text-right">320.000</td></tr>
                       <tr><td>KYB-343310</td><td>Giảm xóc trước</td><td className="text-center">12</td><td className="text-right">1.800.000</td><td className="text-right">2.800.000</td></tr>
                    </tbody>
                 </table>
                 
                 <div style={{ padding: '8px 12px' }}>
                   <h4 style={{ margin: '0 0 8px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{color:'#E65100'}}>📝</span> Phiếu nhập liên quan</h4>
                   <div className="table-responsive">
                     <table className="table" style={{ border: '1px solid #eee', minWidth: 320 }}>
                        <thead><tr><th>Mã phiếu</th><th>Ngày nhập</th><th>Số lượng</th><th>Trạng thái</th></tr></thead>
                        <tbody>
                           <tr><td>PN-2025-0032</td><td>28/09/2025</td><td className="text-center">50</td><td><span className="badge badge-success">Đã nhập</span></td></tr>
                           <tr><td>PN-2025-0031</td><td>20/09/2025</td><td className="text-center">30</td><td><span className="badge badge-success">Đã nhập</span></td></tr>
                           <tr><td>PN-2025-0028</td><td>12/09/2025</td><td className="text-center">40</td><td><span className="badge badge-success">Đã nhập</span></td></tr>
                        </tbody>
                     </table>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
               <div className="card-header"><h3><span className="icon">🖼️</span> Hình ảnh minh họa</h3></div>
               <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                 <div style={{ width: '100%', maxWidth: 200, aspectRatio: '1', background: '#F5F5F5', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#ccc' }}>Image</span>
                 </div>
                 <div style={{ display: 'flex', gap: 4, width: '100%', maxWidth: 200 }}>
                    <button style={{ padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, flex: 1, cursor: 'pointer' }}>&lt;</button>
                    <div style={{ height: 24, width: 24, background: '#F5F5F5', borderRadius: 2 }}></div>
                    <div style={{ height: 24, width: 24, background: '#F5F5F5', borderRadius: 2 }}></div>
                    <button style={{ padding: '2px 6px', border: '1px solid #ccc', borderRadius: 4, flex: 1, cursor: 'pointer' }}>&gt;</button>
                 </div>
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
