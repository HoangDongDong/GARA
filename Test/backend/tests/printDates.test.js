const test=require('node:test');const assert=require('node:assert/strict');
const {protect}=require('../../../backend/src/services/printPrivacy.js');const {normalize}=require('../../../backend/src/services/printDates.js');
test('legacy print time labels use local 24-hour time and preserve other date bindings',()=>{
 const {applyTimeLabels}=require('../../../backend/src/services/printDates.js');
 const source='<TextObject Text="In lúc: [GIOTHANHTOAN]" Format="Time"/><TextObject Text="Ngày [NGAY]"/>';
 assert.equal(applyTimeLabels(source,{GIOTHANHTOAN:'2026-10-09T14:45:41'}),'<TextObject Text="In lúc: 14:45:41"/><TextObject Text="Ngày [NGAY]"/>');
});
test('print privacy retains timestamps for admin and limited accounts while hiding restricted amounts',()=>{
 const date=new Date('2026-10-09T07:45:41.152Z');
 const data={parameters:{NGAY:date,GIOTHANHTOAN:date,GIAVON:120},tables:{Table0:[{TIMECREATED:date,HOAHONG:20}]}};
 const limited=protect({permissions:{}},data);
 assert.equal(limited.parameters.NGAY,date);assert.equal(limited.parameters.GIOTHANHTOAN,date);
 assert.equal(limited.tables.Table0[0].TIMECREATED,date);assert.equal(limited.parameters.GIAVON,undefined);assert.equal(limited.tables.Table0[0].HOAHONG,undefined);
 const admin=protect({ISADMIN:1},data);assert.equal(admin.parameters.NGAY,date);assert.equal(admin.parameters.GIAVON,120);
 assert.equal(JSON.parse(JSON.stringify(limited)).parameters.NGAY,'2026-10-09T07:45:41.152Z');
});
test('FastReport receives the garage local date and time across the UTC date boundary',()=>{
 const data={NGAY:new Date('2026-10-08T18:01:03Z'),rows:[{GIOTHANHTOAN:new Date('2026-10-09T07:45:41Z')}],text:'2026-10-09',missing:null};
 const result=normalize(data);
 assert.equal(result.NGAY,'2026-10-09T01:01:03');assert.equal(result.rows[0].GIOTHANHTOAN,'2026-10-09T14:45:41');
 assert.equal(result.text,data.text);assert.equal(result.missing,null);assert.ok(data.NGAY instanceof Date);
});
