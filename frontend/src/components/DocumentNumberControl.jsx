import { useEffect, useState } from 'react';
import api from '../api';

export default function DocumentNumberControl(props) {
  const [preview,setPreview]=useState(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    setPreview(null);setError('');
    const timer=setTimeout(()=>{
      api.post('/system-config/number-preview',{pattern:props.value},{signal:controller.signal})
        .then(r=>setPreview(r.data))
        .catch(e=>{if(!controller.signal.aborted)setError(e.response?.data?.error||e.message);});
    },250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[props.value]);
  return <div><input {...props} type="text" maxLength={80} spellCheck={false}/>
    {error&&<p className="config-detail" role="alert" style={{color:'#b91c1c'}}>{error}</p>}
    {preview&&<p className="config-detail">Ví dụ: <b>{preview.first}</b> đến <b>{preview.last}</b> · Đếm lại: {preview.reset.toLocaleLowerCase('vi')}. Đây là ví dụ, không phải số tiếp theo đã được cấp.</p>}
  </div>;
}
