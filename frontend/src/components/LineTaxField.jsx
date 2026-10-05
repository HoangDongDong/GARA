export default function LineTaxField({ name, value, policy, onChange, disabled }) {
  const own = value != null && value !== '';
  const displayValue = own ? value : policy.taxRate;
  return <div className="line-tax-field" style={{fontSize:11,textAlign:'right',minWidth:65}} title={policy.taxSource}>
    {disabled ? <span style={{color:'#334155',padding:2}}>{displayValue}%</span>
      : <div style={{display:'flex',alignItems:'center',gap:3,justifyContent:'flex-end'}}>
        <input aria-label={`Thuế ${name} (%)`} type="number" min="0" max="100" step="0.01" style={{width:50,border:'1px solid #cbd5e1',borderRadius:4,padding:3}} value={displayValue ?? ''}
          onChange={event => onChange(event.target.value === '' ? '0' : event.target.value)} />%
      </div>}
  </div>;
}
