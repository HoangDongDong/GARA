import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareRequest,finishRequest} from '../src/utils/requestSafety.js';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
test('uncertain retries share a key, success allows another identical sale and stale responses preserve the new key',()=>{
  const state=storage();let count=0;const request=()=>prepareRequest({method:'post',url:'/sales',data:{items:['p']},headers:{}},state,()=>`key-${++count}`);
  const first=request(),retry=request();assert.equal(first.headers['Idempotency-Key'],retry.headers['Idempotency-Key']);
  finishRequest(first,state);const second=request();assert.notEqual(second.headers['Idempotency-Key'],first.headers['Idempotency-Key']);
  finishRequest(retry,state);assert.equal(request().headers['Idempotency-Key'],second.headers['Idempotency-Key']);
});
test('changed request content gets another key; lookups are unaffected',()=>{
  const state=storage();let count=0;
  const request=amount=>prepareRequest({method:'post',url:'/finance/debts/payments',data:{amount},headers:{}},state,()=>`key-${++count}`);
  assert.notEqual(request(10).headers['Idempotency-Key'],request(20).headers['Idempotency-Key']);
  assert.equal(prepareRequest({method:'get',url:'/sales',headers:{}},state).headers['Idempotency-Key'],undefined);
});
test('identical requests and user IDs in different stores use separate retry keys',()=>{
  const state=storage();let count=0;
  const request=()=>prepareRequest({method:'post',url:'/sales',data:{amount:100},headers:{}},state,()=>`key-${++count}`);
  state.setItem('garage_user',JSON.stringify({ID:'same-user',TENANT:{id:'tenant-a'}}));const a=request();
  state.setItem('garage_user',JSON.stringify({ID:'same-user',TENANT:{id:'tenant-b'}}));const b=request();assert.notEqual(a.headers['Idempotency-Key'],b.headers['Idempotency-Key']);
  state.setItem('garage_user',JSON.stringify({ID:'same-user',TENANT:{id:'tenant-a'}}));assert.equal(request().headers['Idempotency-Key'],a.headers['Idempotency-Key']);
});
