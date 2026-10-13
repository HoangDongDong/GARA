export default function Time24Field({id,label,value='',onChange,disabled,required}) {
  const [hour='',minute='']=String(value).split(':');
  const update=(part,raw)=>{
    const digits=raw.replace(/\D/g,'').slice(0,2);
    const hours=part==='hour' ? digits : hour;
    const minutes=part==='minute' ? digits : minute;
    onChange(hours || minutes ? `${hours}:${minutes}` : '');
  };
  const pad=(part,raw)=>{if(raw)update(part,raw.padStart(2,'0'));};
  return <div className="master-time24">
    <div className="master-time24-controls">
      <div><span>Giờ (00–23)</span><input id={id} aria-label={`${label}: giờ`} type="text" inputMode="numeric"
        value={hour} placeholder="08" maxLength={2} pattern="([01]?[0-9]|2[0-3])" title="Nhập giờ từ 00 đến 23"
        required={required || !!minute} disabled={disabled} onChange={event=>update('hour',event.target.value)} onBlur={()=>pad('hour',hour)}/></div>
      <b className="master-time24-colon">:</b>
      <div><span>Phút (00–59)</span><input aria-label={`${label}: phút`} type="text" inputMode="numeric"
        value={minute} placeholder="30" maxLength={2} pattern="[0-5]?[0-9]" title="Nhập phút từ 00 đến 59"
        required={required || !!hour} disabled={disabled} onChange={event=>update('minute',event.target.value)} onBlur={()=>pad('minute',minute)}/></div>
    </div>
    <small>Dùng giờ 24 giờ · Ví dụ: 08:30 (sáng), 17:00 (chiều)</small>
  </div>;
}
