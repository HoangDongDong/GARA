const {test}=require('node:test'),assert=require('node:assert/strict'),{recoverLedger}=require('../ledger');
test('network loss after spool submission preserves evidence and retries only reporting',async()=>{
 const ledger={a:{state:'submitted',completedCopies:1,spoolIds:[42]}};let calls=0;
 await assert.rejects(recoverLedger(ledger,async()=>{calls++;throw Error('offline');},()=>{}),/offline/);
 assert.deepEqual(ledger.a.spoolIds,[42]);assert.equal(ledger.a.state,'submitted');assert.equal(ledger.a.reported,undefined);
 await recoverLedger(ledger,async(id,state)=>{calls++;assert.equal(id,'a');assert.equal(state,'submitted');},()=>{});
 assert.equal(ledger.a.reported,true);await recoverLedger(ledger,()=>{throw Error('should not report again');},()=>{});assert.equal(calls,2);
});
test('cancelled server job does not block later reports; uncertain crash never becomes queued',async()=>{
 const ledger={a:{state:'failed'},b:{state:'dispatching',completedCopies:1}};const seen=[];
 await recoverLedger(ledger,async(id,state)=>{seen.push([id,state]);if(id==='a')throw Object.assign(Error('cancelled'),{status:409});},()=>{});
 assert.equal(ledger.a.reported,true);assert.equal(ledger.b.state,'needs_review');assert.equal(ledger.b.completedCopies,1);assert.equal(ledger.b.reported,true);assert.deepEqual(seen,[['a','failed'],['b','needs_review']]);
});
