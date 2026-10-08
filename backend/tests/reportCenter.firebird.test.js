// Opt-in, read-only integration check; no test documents are inserted.
const {test}=require('node:test');const assert=require('node:assert/strict');
const db=require('../src/db');const {reports}=require('../src/services/reportCatalog');const {run}=require('../src/services/reportData');
test('all connected reports query the current Firebird schema', {skip:process.env.TEST_REPORTS_FIREBIRD!=='1'},async()=>{
 const cache=new Map();const query=(sql,params=[])=>{const k=sql+JSON.stringify(params);if(!cache.has(k))cache.set(k,db.query(sql,params));return cache.get(k);};
 for(const report of reports.filter(r=>r.available!==false)){const result=await run(report.id,{from:'2026-10-01',to:'2026-10-08'},{ISADMIN:1},query);assert.ok(Array.isArray(result.rows),report.id);assert.ok(result.createdAt,report.id);}
});
