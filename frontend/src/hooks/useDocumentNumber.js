import { useEffect, useState } from 'react';
import api from '../api';

export default function useDocumentNumber(type, enabled = true, context = '') {
  const [result,setResult]=useState({type:'',code:'',error:''});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!enabled)return;
    const controller=new AbortController();
    setResult({type,code:'',error:''});
    api.get(`/document-numbers/${encodeURIComponent(type)}/next`,{signal:controller.signal})
      .then(r=>{if(!controller.signal.aborted)setResult({type,code:r.data.code,error:''});})
      .catch(e=>{if(!controller.signal.aborted)setResult({type,code:'',error:e.response?.data?.error||'Không tải được số phiếu.'});});
    return()=>controller.abort();
  },[type,enabled,context,revision]);
  useEffect(()=>{
    if(!enabled)return;
    const refresh=()=>setRevision(v=>v+1);
    window.addEventListener('focus',refresh);
    return()=>window.removeEventListener('focus',refresh);
  },[enabled]);
  return {code:result.type===type?result.code:'',error:result.type===type?result.error:'',refresh:()=>setRevision(v=>v+1)};
}
