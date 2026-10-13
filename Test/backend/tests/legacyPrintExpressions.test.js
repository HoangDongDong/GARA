const test=require('node:test');const assert=require('node:assert/strict');const {toVndWords,mapLegacyMoneyWords}=require('../../../backend/src/services/legacyPrintExpressions.js');
test('legacy currency expression reads Vietnamese groups correctly',()=>{assert.equal(toVndWords(0),'Không');assert.equal(toVndWords(15),'Mười lăm');assert.equal(toVndWords(21),'Hai mươi mốt');assert.equal(toVndWords(1005),'Một nghìn không trăm lẻ năm');assert.equal(toVndWords(12345000),'Mười hai triệu ba trăm bốn mươi lăm nghìn');assert.equal(toVndWords(1000000001),'Một tỷ không trăm lẻ một');assert.equal(toVndWords(1.5),'Một phẩy năm');});
test('decimal repair total renders without changing the original amount',()=>{
 const data={parameters:{TONGCONG:362999.99}};
 assert.equal(mapLegacyMoneyWords('[ToVndWords([TONGCONG])]',data),'[VndWords_TONGCONG]');
 assert.equal(data.parameters.VndWords_TONGCONG,'Ba trăm sáu mươi hai nghìn chín trăm chín mươi chín phẩy chín chín');
 assert.equal(data.parameters.TONGCONG,362999.99);
 assert.equal(toVndWords(0.05),'Không phẩy không năm');
 assert.equal(toVndWords(145200.00000001),'Một trăm bốn mươi lăm nghìn hai trăm');
 for(const value of [NaN,Infinity,'invalid',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>toVndWords(value));
});
test('ToVndWords becomes a mapped parameter without changing numeric totals',()=>{const data={parameters:{TONGCONG:150000}};const xml=mapLegacyMoneyWords('Bằng chữ: [ToVndWords([TONGCONG])] đồng',data);assert.equal(xml,'Bằng chữ: [VndWords_TONGCONG] đồng');assert.equal(data.parameters.VndWords_TONGCONG,'Một trăm năm mươi nghìn');assert.equal(data.parameters.TONGCONG,150000);});
