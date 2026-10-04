import useDocumentNumber from '../hooks/useDocumentNumber';
export default function DocumentNumberField({type,label='Số phiếu',savedCode=''}) {
  const number=useDocumentNumber(type,!savedCode);
  return <div><label style={{fontSize:11,fontWeight:600,display:'block',marginBottom:3}}>{label}
    <input type="text" readOnly value={savedCode||number.code} placeholder={number.error?'Không tải được số phiếu':'Đang tải số phiếu…'} title={savedCode?'Số phiếu đã lưu':'Số dự kiến; cấp số chính thức khi lưu.'} style={{display:'block',width:'100%',padding:'7px 8px',border:'1px solid #cbd5e1',borderRadius:4,marginTop:3}}/>
  </label>{number.error&&<button type="button" onClick={number.refresh} title={number.error}>Thử lại</button>}</div>;
}
