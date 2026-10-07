// Adapt the selected sales receipt, preserving its company header and bill styling.
const keys = ['MauPhieuTiepNhan','MauPhieuSuaChua','MauBaoGia','MauPhieuBanGiao','MauHoaDonSuaChua','MauPhieuXuatKho'];
const columns = { ItemName:'String', SOLUONG:'Decimal', Unit:'String', DONGIA:'Decimal', THANHTIEN:'Decimal', ValueText:'String', Note:'String' };
const parameters = ['CompanyName','CompanyAddress','CompanyPhone','DocTitle','DocDate','DocNumber','CustomerName','Contact','VehiclePlate','Description','Extra','FooterNote','In bởi','LoiCamOn','TIENHANG','TIENGIAMGIA','TILEGIAMGIA','TIENTHUE','TILETHUE','TONGCONG'];
function descriptiveTable(name, top, detail) {
 const cell=(id,text)=>`<TableCell Name="${name}${id}" Border.Lines="All" Border.Style="Dash" ${detail?'':'Fill.Color="255, 255, 192"'} Text="${text}" Font="Tahoma, 8pt${detail?'':', style=Bold'}"/>`;
 return `<TableObject Name="${name}" Left="5.45" Top="${top}" Width="245.7" Height="18.9"><TableColumn Name="${name}Column1" Width="81.27"/><TableColumn Name="${name}Column2" Width="164.43"/><TableRow Name="${name}Row" MinHeight="18.9" AutoSize="true">${cell('Label',detail?'[Table0.ItemName]':'Nội dung')}${cell('Value',detail?'[Table0.ValueText]':'Thông tin')}</TableRow></TableObject>`;
}
function compactRows(xml) {
 if(!xml.includes('Name="ReceiptItemNote"'))return xml;
 xml=xml.replace(/<ReportTitleBand\b[^>]*>/,tag=>tag.replace(/\sCanShrink="[^"]*"/g,'').replace(/>$/,' CanShrink="true">'));
 xml=xml.replace(/<DataBand\b[^>]*Name="Data1"[^>]*>/,tag=>tag.replace(/Height="[^"]*"/,'Height="18.9"').replace(/\sCanShrink="[^"]*"/g,'').replace(/>$/,' CanShrink="true">'));
 return xml.replace(/<TextObject\b[^>]*Name="ReceiptItemNote"[^>]*\/>/,tag=>tag.replace(/Top="[^"]*"/,'Top="18.9"').replace(/\s(?:VisibleExpression|ShiftMode)="[^"]*"/g,'').replace(/\/>$/,' VisibleExpression="[Table0.Note] != &quot;&quot;" ShiftMode="WhenOverlapped"/>'));
}
function template(source, type) {
 if(!keys.includes(type.key))throw Error('Loại chứng từ không hỗ trợ mẫu bill sửa chữa.');
 if(!/<ReportPage\b[^>]*PaperWidth="80"/.test(source))throw Error('Mẫu bán hàng đang chọn phải có khổ giấy 80mm.');
 if(!source.includes('Name="colHeader"')||!source.includes('Name="detail"'))throw Error('Mẫu bill bán hàng không có bảng chi tiết được hỗ trợ.');
 const descriptive=type.key==='MauPhieuTiepNhan';
 let xml=source.replace(/<Dictionary>[\s\S]*?<\/Dictionary>/,`<Dictionary><TableDataSource Name="Table0" ReferenceName="Data.Table0" DataType="System.Int32" Enabled="true">${Object.entries(columns).map(([name,dataType])=>`<Column Name="${name}" DataType="System.${dataType}"/>`).join('')}</TableDataSource><Total Name="Total SLX" Expression="[Table0.SOLUONG]" Evaluator="Data1" PrintOn="ReportSummary1"/>${parameters.map(name=>`<Parameter Name="${name}" DataType="System.${['TIENHANG','TIENGIAMGIA','TILEGIAMGIA','TIENTHUE','TILETHUE','TONGCONG'].includes(name)?'Decimal':'String'}"/>`).join('')}</Dictionary>`);
 xml=xml.replace('HÓA ĐƠN BÁN HÀNG','[DocTitle]').replace('[NGAY]','[DocDate]').replace('[NAME]','[DocNumber]').replaceAll('[DKHACHHANG_NAME]','[CustomerName]').replace('Thu ngân:','Nhân viên:').replace('Text="Mặt hàng"','Text="Hạng mục"').replace('Giảm [TILEGIAMGIA]%:', 'Giảm giá:');
 xml=xml.replace('VisibleExpression="[CustomerName]"','VisibleExpression="[CustomerName] != &quot;&quot;"');
 xml=xml.replaceAll('[[Table0.SLXUATCHUAQUYDOI]-[Table0.SLNHAPCHUAQUYDOI]]','[Table0.SOLUONG]').replaceAll('[Table0.DMATHANG_NAME]','[Table0.ItemName]').replaceAll('[Table0.DDONVITINH_NAME]','[Table0.Unit]');
 const visibility={quantity:descriptive?'false':'true',subtotal:descriptive?'false':'true',discount:'[TIENGIAMGIA] != 0',tax:'[TIENTHUE] != 0',thanks:'true'};
 xml=xml.replace(/VisibleExpression="\[PrintShow_(\w+)\]"/g,(_,key)=>`VisibleExpression="${visibility[key]||'false'}"`);
 xml=xml.replace(/Width="771\.12"/g,'Width="279.7"').replace(/(<ReportTitleBand\b[^>]*Height=")182"/,'$1226"');
 xml=xml.replace(/(<TableObject Name="colHeader"[^>]*Top=")163\.1"/,'$1207.1"');
 xml=xml.replace('</ReportTitleBand>',`<TextObject Name="ReceiptVehicle" Left="5.45" Top="163" Width="245.7" Height="20" CanGrow="true" Text="Xe: [VehiclePlate]    ĐT: [Contact]" Font="Tahoma, 8pt"/><TextObject Name="ReceiptDescription" Left="5.45" Top="184" Width="245.7" Height="20" CanGrow="true" CanShrink="true" Text="[Description]" Font="Tahoma, 8pt"/></ReportTitleBand>`);
 if(descriptive){
  xml=xml.replace(/<TableObject Name="colHeader"[\s\S]*?<\/TableObject>/,descriptiveTable('colHeader',207.1,false)).replace(/<TableObject Name="detail"[\s\S]*?<\/TableObject>/,descriptiveTable('detail',0,true));
  xml=xml.replace(/<TableRow Name="Row18"/, '<TableRow Visible="false" Name="Row18"');
 }
 xml=xml.replace('</DataBand>','<TextObject Name="ReceiptItemNote" Left="5.45" Top="19" Width="245.7" Height="14" CanGrow="true" CanShrink="true" Text="[Table0.Note]" Font="Tahoma, 7pt, style=Italic"/></DataBand>');
 xml=xml.replace(/(<DataBand Name="Data1"[^>]*Height=")18\.9"/,'$133"');
 // Keep amounts formatted like the sales bill, including its bold grand total.
 xml=xml.replace(/<TableCell\b[^>]*>/g,tag=>/Text="\[(TONGCONG|TIENTHUE)\]"/.test(tag)?tag.replace(/\sFormat(?:\.[\w]+)?="[^"]*"/g,'').replace(/\/>$/,' Format="Number" Format.UseLocale="false" Format.DecimalDigits="0" Format.DecimalSeparator="." Format.GroupSeparator=","/>'):tag);
 // Rows flow immediately after the totals as optional rows collapse or grow.
 xml=xml.replace(/<TableRow Name="Row29"/,`<TableRow Name="ReceiptExtraRow" AutoSize="true" VisibleExpression="[Extra] != &quot;&quot;"><TableCell Name="ReceiptExtraCell" Text="[Extra]" ColSpan="3" Font="Tahoma, 8pt"/><TableCell Name="ReceiptExtraEmpty1"/><TableCell Name="ReceiptExtraEmpty2"/></TableRow><TableRow Name="ReceiptSignaturesRow" Height="38" AutoSize="true"><TableCell Name="ReceiptCustomerSignature" Text="Khách hàng / người giao nhận" ColSpan="2" HorzAlign="Center" Font="Tahoma, 7pt"/><TableCell Name="ReceiptSignatureEmpty"/><TableCell Name="ReceiptStaffSignature" Text="Nhân viên GARA" HorzAlign="Center" Font="Tahoma, 7pt"/></TableRow><TableRow Name="Row29"`);
 return compactRows(xml);
}
module.exports={keys,template,compactRows};
