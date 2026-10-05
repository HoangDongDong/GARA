export default function ChargeSummary({ subtotal, discount = 0, discountControl, totals, rates, loading, error, onRetry }) {
  const money = value => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
  const row = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0' };
  return <div style={{ padding: '6px 12px', fontSize: 12, color: '#475569', flexShrink: 0 }}>
    <div style={row}><span>Tiền hàng / dịch vụ</span><span>{money(subtotal)}</span></div>
    {discountControl || (discount > 0 && <div style={row}><span>Giảm giá</span><span>{money(discount)}</span></div>)}
    {rates.serviceEnabled !== false && <div style={row}><span>Phí dịch vụ ({rates.serviceRate}%)</span><span>{money(totals.serviceFee)}</span></div>}
    {rates.taxEnabled !== false && (totals.taxGroups?.length ? totals.taxGroups.map(group => <div style={row} key={group.rate}><span>VAT {group.rate}%</span><span>{money(group.amount)}</span></div>) : <div style={row}><span>Thuế ({rates.taxRate}%)</span><span>{money(totals.tax)}</span></div>)}
    {loading && <div role="status">Đang tải thuế và phí dịch vụ…</div>}
    {error && <div role="alert" style={{ color: '#b91c1c' }}>{error} <button type="button" onClick={onRetry}>Thử lại</button></div>}
  </div>;
}
