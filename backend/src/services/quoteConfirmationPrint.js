const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const children=node=>Array.from(node.childNodes || []).filter(child=>child.nodeType===1);
const number=(node,key)=>Number(node.getAttribute(key)||0);
const set=(node,key,value)=>node.setAttribute(key,String(Math.round(value*100)/100));
const text=node=>Array.from(node.getElementsByTagName('*')).map(child=>child.getAttribute('Text')||'').join(' ');

// Add a paper approval column at render time, including saved/imported FRX.
// Use a drawn square so the check box does not depend on font glyph support.
function apply(xml) {
  if(xml.includes('Name="QuoteConfirmationBox'))return xml;
  const doc=new DOMParser().parseFromString(xml,'text/xml');
  let sequence=0;
  const create=(tag,attributes)=>{const node=doc.createElement(tag);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));return node;};
  const headers=Array.from(doc.getElementsByTagName('TableObject')).filter(table=>/Thành tiền|T[.\s]*tiền/i.test(text(table))&&!/\[Table0\./.test(text(table)));
  for(const band of Array.from(doc.getElementsByTagName('DataBand'))) {
    if(!/Table0/.test(band.getAttribute('DataSource')||''))continue;
    const table=children(band).find(node=>node.tagName==='TableObject' && /\[Table0\./.test(text(node)));
    if(table){
      const columns=children(table).filter(node=>node.tagName==='TableColumn');
      const width=columns.reduce((sum,col)=>sum+number(col,'Width'),0);
      if(width<=0)continue;
      const reserve=width<350?40:62;
      const factor=(width-reserve)/width;
      const adapt=(target,header)=>{
        const targetColumns=children(target).filter(node=>node.tagName==='TableColumn');
        targetColumns.forEach(col=>set(col,'Width',number(col,'Width')*factor));
        const column=create('TableColumn',{Name:`QuoteConfirmationColumn${++sequence}`,Width:reserve});
        target.insertBefore(column,children(target).find(node=>node.tagName==='TableRow')||null);
        for(const row of children(target).filter(node=>node.tagName==='TableRow'))row.appendChild(create('TableCell',{
          Name:`QuoteConfirmationCell${++sequence}`,Text:header?'Xác nhận':'',Font:'Arial, 7pt, style=Bold',HorzAlign:'Center',VertAlign:'Center','Border.Lines':'All',CanGrow:'true'
        }));
        for(const cell of Array.from(target.getElementsByTagName('TableCell')))cell.setAttribute('CanGrow','true');
      };
      for(const header of headers.filter(header=>children(header).filter(node=>node.tagName==='TableColumn').length===columns.length && Math.abs(number(header,'Width')-number(table,'Width'))<2))adapt(header,true);
      adapt(table,false);
      const firstRow=children(table).find(node=>node.tagName==='TableRow');
      band.appendChild(create('ShapeObject',{Name:`QuoteConfirmationBox${++sequence}`,Left:number(table,'Left')+width-reserve+(reserve-11)/2,Top:number(table,'Top')+Math.max(2,(number(firstRow||table,'Height')-11)/2),Width:11,Height:11,Shape:'Rectangle','Border.Lines':'All','Border.Width':1.5}));
    }else{
      const cells=children(band).filter(node=>node.tagName==='TextObject' && number(node,'Top')===0);
      if(!cells.some(node=>/\[Table0\./.test(node.getAttribute('Text')||'')))continue;
      const width=Math.max(...cells.map(node=>number(node,'Left')+number(node,'Width')));
      const reserve=width<350?40:62,factor=(width-reserve)/width;
      for(const cell of cells){set(cell,'Left',number(cell,'Left')*factor);set(cell,'Width',number(cell,'Width')*factor);cell.setAttribute('CanGrow','true');}
      const header=children(band).find(node=>node.tagName==='DataHeaderBand');
      if(header){for(const cell of children(header).filter(node=>node.tagName==='TextObject')){set(cell,'Left',number(cell,'Left')*factor);set(cell,'Width',number(cell,'Width')*factor);cell.setAttribute('CanGrow','true');}
        header.appendChild(create('TextObject',{Name:`QuoteConfirmationHeading${++sequence}`,Left:width-reserve,Width:reserve,Height:number(header,'Height')||28,Text:'Xác nhận',Font:'Arial, 8pt, style=Bold',HorzAlign:'Center',VertAlign:'Center','Border.Lines':'All'}));}
      band.appendChild(create('TextObject',{Name:`QuoteConfirmationCell${++sequence}`,Left:width-reserve,Width:reserve,Height:27,'Border.Lines':'All'}));
      band.appendChild(create('ShapeObject',{Name:`QuoteConfirmationBox${++sequence}`,Left:width-reserve+(reserve-11)/2,Top:8,Width:11,Height:11,Shape:'Rectangle','Border.Lines':'All','Border.Width':1.5}));
    }
  }
  return new XMLSerializer().serializeToString(doc);
}
module.exports={apply};
