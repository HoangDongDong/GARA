const relocationRequire = require('node:module').createRequire(require('node:path').resolve(__dirname, '../../../backend/package.json'));
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const {DOMParser}=relocationRequire('@xmldom/xmldom');
const {apply}=require('../../../backend/src/services/quoteConfirmationPrint.js');
for(const format of ['gara','receipt80'])test(`quote ${format}: checkbox column fits original width and is not duplicated`,()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../../backend/templates',format,'MauBaoGia.frx'),'utf8');
 const output=apply(source),doc=new DOMParser().parseFromString(output,'text/xml');
 assert.match(output,/Text="Xác nhận"/);
 assert.equal(apply(output),output);
 assert.ok(Array.from(doc.getElementsByTagName('ShapeObject')).some(node=>node.getAttribute('Name').startsWith('QuoteConfirmationBox')));
 for(const table of Array.from(doc.getElementsByTagName('TableObject'))){
  const columns=Array.from(table.childNodes).filter(node=>node.nodeType===1&&node.tagName==='TableColumn');
  if(!columns.some(node=>node.getAttribute('Name').startsWith('QuoteConfirmationColumn')))continue;
  assert.ok(Math.abs(columns.reduce((sum,node)=>sum+Number(node.getAttribute('Width')),0)-Number(table.getAttribute('Width')))<0.1);
  for(const row of Array.from(table.childNodes).filter(node=>node.nodeType===1&&node.tagName==='TableRow'))assert.equal(Array.from(row.childNodes).filter(node=>node.nodeType===1&&node.tagName==='TableCell').length,columns.length);
 }
});
