export default function CommissionConfig({ form, setForm, disabled }) {
  const kind = Number(form.HHKIEU || 0);
  return <div style={{ gridColumn: '1 / -1', border: '1px solid #fed7aa', background: '#fff7ed', borderRadius: 6, padding: 10 }}>
    <b style={{ fontSize: 12, color: '#9a3412' }}>Hoa hồng nhân viên</b>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '8px 0' }}>
      {[[0, 'Không tính'], [1, 'Theo %'], [2, 'Tiền cố định / đơn vị']].map(([value, label]) => <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        <input type="radio" name="commission-kind" checked={kind === value} disabled={disabled} style={{ width: 'auto', margin: 0 }}
          onChange={() => setForm(current => ({ ...current, HHKIEU: value, HHGIATRI: 0 }))} />{label}
      </label>)}
    </div>
    {kind !== 0 && <label style={{ fontSize: 12 }}>
      {kind === 1 ? 'Tỷ lệ hoa hồng (%)' : 'Hoa hồng mỗi đơn vị (đ)'}
      <input type="number" min="0" max={kind === 1 ? 100 : 1000000000} step="0.01" value={form.HHGIATRI ?? 0} disabled={disabled}
        onChange={event => setForm(current => ({ ...current, HHGIATRI: event.target.value }))}
        style={{ display: 'block', width: '100%', marginTop: 5, border: '1px solid #cbd5e1', padding: 8, borderRadius: 4 }} />
    </label>}
    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>{kind === 1 ? 'Tính trên tiền hàng / dịch vụ sau giảm giá, trước thuế.' : kind === 2 ? 'Mức hoa hồng nhân với số lượng trong phiếu.' : 'Hạng mục này không tạo hoa hồng.'}</div>
  </div>;
}
