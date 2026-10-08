export default function DiscountFields({ name, percent, amount, base, disabled, onPercent, onAmount }) {
  const style = { width: 116, height: 30, padding: '4px 6px', textAlign: 'right', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, color: '#334155', boxSizing: 'border-box' };
  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '4px 0' }}>
      <span>Giảm giá (%)</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <input aria-label={`Giảm giá ${name} (%)`} type="number" min="0" max="100" step="0.01" inputMode="decimal"
          style={style} value={percent} disabled={disabled}
          onFocus={event => event.currentTarget.select()}
          onChange={event => {
            const value = event.target.value;
            if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) return;
            onPercent(value === '' ? 0 : Number(value));
          }} /><span style={{ width: 12 }}>%</span>
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '4px 0' }}>
      <span>Tiền giảm</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <input aria-label={`Tiền giảm ${name} (đ)`} type="number" min="0" max={base} step="0.01" inputMode="decimal"
          style={style} value={amount} disabled={disabled}
          onFocus={event => event.currentTarget.select()}
          onChange={event => {
            const value = event.target.value;
            if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > base)) return;
            onAmount(value === '' ? 0 : Number(value));
          }} /><span style={{ width: 12 }}>đ</span>
      </div>
    </div>
  </>;
}
