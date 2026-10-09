import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionGuard} from '../src/utils/sessionGuard.js';
test('an old tab cannot submit its forms with a new stores token before reload',()=>{
  let token='store-a';const guard=createSessionGuard({getItem:()=>token});
  assert.equal(guard('/sales'),'store-a');token='store-b';
  assert.throws(()=>guard('/sales'),/thay đổi/);assert.throws(()=>guard('/api/workflow/transition'),/thay đổi/);
  assert.equal(guard('/auth/login'),'store-b');assert.equal(guard('/saas/info'),'store-b');
  const newPage=createSessionGuard({getItem:()=>token});assert.equal(newPage('/sales'),'store-b');
});
