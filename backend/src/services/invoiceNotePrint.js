const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const supported=new Set(['MauHoaDonBanHang','MauHoaDonSuaChua','MauPhieuTamTinh','MauBaoGia','MauPhieuSuaChua','MauPhieuTiepNhan','MauPhieuBanGiao','MauPhieuXuatKho']);
function italic(font){const value=font||'Arial, 9pt';return /style=/.test(value)?value.replace(/style=([^,]+)/,(_,styles)=>`style=${styles.includes('Italic')?styles:styles+', Italic'}`):value+', style=Italic';}
function apply(xml,parameters,type){
 if(!supported.has(type))return xml;
 parameters.InvoiceNote=String(parameters.NOTE||parameters.Description||'').trim();
 const doc=new DOMParser().parseFromString(xml.replace(/^\uFEFF/,''),'text/xml');
 const existing=Array.from(doc.getElementsByTagName('*')).filter(node=>['TextObject','TableCell'].includes(node.tagName)&&/^(?:Ghi chú:\s*)?\[(?:NOTE|Description|InvoiceNote)\]$/.test((node.getAttribute('Text')||'').trim()));
 if(existing.length){
  for(const node of existing){node.setAttribute('Text','Ghi chú: [InvoiceNote]');node.setAttribute('Font',italic(node.getAttribute('Font')));node.setAttribute('CanGrow','true');node.setAttribute('CanShrink','true');node.setAttribute('VisibleExpression','[InvoiceNote] != ""');}
 }else if(parameters.InvoiceNote){
  const band=Array.from(doc.getElementsByTagName('DataBand')).find(node=>node.getAttribute('DataSource')==='Table0');
  const summary=doc.getElementsByTagName('ReportSummaryBand')[0];
  const target=band||summary;
  if(!target)return xml;
  const footer=doc.createElement(band?'DataFooterBand':'ChildBand');
  const width=Number(target.getAttribute('Width'))||718;
  for(const [key,value] of Object.entries({Name:'InvoiceNoteBand',Width:width,Height:26,CanGrow:'true',CanShrink:'true',KeepTogether:'true'}))footer.setAttribute(key,String(value));
  const note=doc.createElement('TextObject');
  for(const [key,value] of Object.entries({Name:'InvoiceNoteText',Left:0,Top:4,Width:width,Height:20,Text:'Ghi chú: [InvoiceNote]',Font:width<350?'Arial, 8pt, style=Italic':'Arial, 9pt, style=Italic',CanGrow:'true',CanShrink:'true',WordWrap:'true'}))note.setAttribute(key,String(value));
  footer.appendChild(note);target.appendChild(footer);
 }
 return new XMLSerializer().serializeToString(doc);
}
module.exports={apply,italic};
