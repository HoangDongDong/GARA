import useChargeRates from '../hooks/useChargeRates';
import './RatePolicyField.css';
export default function RatePolicyField({ label, value, onChange, inheritLabel = 'Theo cấu hình', inheritedRate, inheritedSource, disabled }) {
  const own = value != null && value !== '';
  const config = useChargeRates('parts', !own && label === 'Thuế' && inheritedRate == null);
  const applied = own ? value : inheritedRate ?? (label === 'Thuế' ? config.rates.taxRate : 0);
  return <div className="rate-policy-field"><label>{label}<div className="rate-policy-controls">
    <select aria-label={label + ': cách áp dụng'} disabled={disabled || (!own && label === 'Thuế' && inheritedRate == null && config.loading)} value={own ? 'own' : 'inherit'} onChange={event => onChange(event.target.value === 'own' ? String(applied ?? 0) : '')}>
      <option value="inherit">{inheritLabel}</option><option value="own">Đặt riêng</option>
    </select>
    {own && <><input aria-label={label + ' riêng (%)'} type="number" min="0" max="100" step="0.01" required disabled={disabled} value={value} onChange={event => onChange(event.target.value === '' ? '0' : event.target.value)} /><span>%</span></>}
  </div></label><small>{!own && label === 'Thuế' && inheritedRate == null && config.loading ? 'Đang tải thuế mặc định…' : <>Đang áp dụng: <b>{applied}%</b> · {own ? 'Đặt riêng' : inheritedSource || inheritLabel}</>}</small>
    {!own && label === 'Thuế' && inheritedRate == null && config.error && <small role="alert">{config.error}</small>}
  </div>;
}
