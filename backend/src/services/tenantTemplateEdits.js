// Tenant users edit the layout of a server-owned template, never its code,
// connections, events or executable expressions. The reference is fetched
// from the authenticated tenant database, not supplied by the client.
const { validate, fail } = require('./webReportDesigner.js');
const visual = new Set(['TextObject','PictureObject','ShapeObject','LineObject','TableObject','TableRow','TableColumn','TableCell']);
const geometry = new Set(['Left','Top','Width','Height','MinHeight','PaperWidth','PaperHeight','LeftMargin','RightMargin','TopMargin','BottomMargin','ColSpan','RowSpan']);
const common = new Set(['Font','TextFill.Color','Fill.Color','Border.Lines','HorzAlign','VertAlign','Text','Image','SizeMode','Shape']);
const children = node => Array.from(node.childNodes).filter(n => n.nodeType === 1);
const attrs = node => Object.fromEntries(Array.from(node.attributes).map(a => [a.name,a.value]));
function canonical(node) {
  if(node.nodeType!==1)return node.nodeType===3&& !node.data.trim() ? '' : `${node.nodeType}:${node.data}`;
  return JSON.stringify([node.tagName,Object.entries(attrs(node)).sort(),Array.from(node.childNodes).map(canonical).filter(Boolean)]);
}
function check(reference, content) {
  const base=validate(reference), next=validate(content);
  if(Array.from(next.getElementsByTagName('*')).length>10000)throw fail('Mẫu có quá nhiều đối tượng.');
  const originals=new Map(), names=new Set(), expressions=new Set(), fields=new Set();
  for(const n of Array.from(base.getElementsByTagName('*'))){
    if(visual.has(n.tagName)&&n.getAttribute('Name'))originals.set(n.getAttribute('Name'),n);
    if(n.tagName==='Parameter')fields.add(n.getAttribute('Name'));
    if(n.tagName==='TableDataSource')for(const col of children(n).filter(c=>c.tagName==='Column'))fields.add(`${n.getAttribute('Name')}.${col.getAttribute('Name')}`);
    if(n.hasAttribute('Text')){
      const text=n.getAttribute('Text');
      expressions.add(text);
      for(const match of text.matchAll(/\[([^\[\]]+)\]/g))if(/^[\p{L}\p{N}_. #]+$/u.test(match[1]))fields.add(match[1]);
    }
  }
  function value(key,v){
    if(geometry.has(key))return Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=10000&&(!['ColSpan','RowSpan'].includes(key)||(Number.isInteger(Number(v))&&Number(v)>=1&&Number(v)<=100));
    if(key==='Text'){
      if(v.length>16000)return false;
      if(expressions.has(v))return true;
      let remainder=v;
      for(const match of v.matchAll(/\[([^\[\]]+)\]/g)){
        if(!fields.has(match[1]))return false;
        remainder=remainder.replace(match[0],'');
      }
      return !/[\[\]]/.test(remainder);
    }
    if(key==='Font')return /^[\p{L}\p{N} _.-]{1,100}, (?:\d+(?:\.\d+)?)pt(?:, style=(?:Bold|Italic|Underline|Strikeout)(?:, (?:Bold|Italic|Underline|Strikeout))*)?$/u.test(v)&&Number(v.match(/([\d.]+)pt/)?.[1])<=200;
    if(['TextFill.Color','Fill.Color'].includes(key))return /^(?:#[a-f0-9]{6}|Black|White|Red|Blue|Green|Gray|Orange|Yellow|Purple|Transparent)$/i.test(v);
    if(key==='Border.Lines')return ['None','All','Top','Bottom','Left','Right'].includes(v);
    if(key==='HorzAlign')return ['Left','Center','Right','Justify'].includes(v);
    if(key==='VertAlign')return ['Top','Center','Bottom'].includes(v);
    if(key==='SizeMode')return ['Normal','CenterImage','StretchImage','Zoom','AutoSize'].includes(v);
    if(key==='Shape')return ['Rectangle','RoundRectangle','Ellipse','Triangle','Diamond'].includes(v);
    if(key==='Image')return v.length<=8*1024*1024&&/^(?:iVBORw0KGgo|\/9j\/)[A-Za-z0-9+/=\r\n]*$/.test(v);
    return false;
  }
  function visit(n, old, isNew=false){
    const name=n.getAttribute('Name');
    const editable=visual.has(n.tagName)||n.tagName==='ReportPage'||n.tagName.endsWith('Band');
    if(name&&editable){if(names.has(name))throw fail('Tên đối tượng bị trùng.');names.add(name);}
    if(!old){
      if(!visual.has(n.tagName)||!name||!/^[\p{L}\p{N}_ .-]{1,200}$/u.test(name))throw fail('Chỉ được thêm đối tượng bố cục trong trình thiết kế.');
      isNew=true;
    }else if(n.tagName!==old.tagName)throw fail('Không được thay loại đối tượng của mẫu.');
    if(!editable){
      if(!old||canonical(n)!==canonical(old))throw fail('Không được thay mã lệnh, kết nối hoặc từ điển dữ liệu của mẫu.');
      return;
    }
    const previous=old?attrs(old):{};
    for(const key of new Set([...Object.keys(previous),...Object.keys(attrs(n))])){
      const v=n.getAttribute(key), before=previous[key];
      if(v===before||(v===null&&before===undefined))continue;
      if(key==='Name'&&isNew)continue;
      const allowed=geometry.has(key)||(visual.has(n.tagName)&&common.has(key));
      if(!allowed||v===null||!value(key,v))throw fail(`Thuộc tính ${key} không được phép thay đổi trên SaaS.`);
    }
    const beforeChildren=old?children(old):[];
    const seen=new Set();
    for(const child of children(n)){
      let source=beforeChildren.find(c=>c.tagName===child.tagName&&c.getAttribute('Name')===child.getAttribute('Name'));
      if(!source&&child.getAttribute('Name')){
        const originalName=child.getAttribute('Name').replace(/(?:_Copy\d+)+$/,'');
        const copied=originals.get(originalName);
        if(originalName!==child.getAttribute('Name')&&copied?.tagName===child.tagName&&visual.has(child.tagName)){
          source=copied;isNew=true;
        }
        const candidate=originals.get(child.getAttribute('Name'));
        // Merged cells may move when a row/column is deleted, within one table.
        if(child.tagName==='TableCell'&&candidate?.parentNode?.parentNode?.getAttribute('Name')===child.parentNode?.parentNode?.getAttribute('Name'))source=candidate;
      }
      if(source)seen.add(source);
      visit(child,source,isNew);
    }
    for(const child of beforeChildren)if(!seen.has(child)&&!visual.has(child.tagName))throw fail('Không được xóa cấu trúc báo cáo hoặc dữ liệu.');
    for(const child of Array.from(n.childNodes).filter(c=>c.nodeType!==1&&c.nodeType!==3||c.nodeType===3&&c.data.trim())){
      if(!old||!Array.from(old.childNodes).some(c=>canonical(c)===canonical(child)))throw fail('Nội dung XML không được hỗ trợ.');
    }
  }
  // Report attributes and nonvisual children must stay exactly as supplied by
  // the server, while pages are walked for permitted layout changes.
  const oldRoot=base.documentElement, root=next.documentElement;
  if(JSON.stringify(Object.entries(attrs(root)).sort())!==JSON.stringify(Object.entries(attrs(oldRoot)).sort()))throw fail('Không được thay cấu hình thực thi báo cáo.');
  for(const child of children(root)){
    const source=children(oldRoot).find(c=>c.tagName===child.tagName&&c.getAttribute('Name')===child.getAttribute('Name'));
    visit(child,source);
  }
  for(const child of children(oldRoot))if(!children(root).some(c=>c.tagName===child.tagName&&c.getAttribute('Name')===child.getAttribute('Name')))throw fail('Không được xóa cấu trúc báo cáo.');
  return content;
}
module.exports={check};
