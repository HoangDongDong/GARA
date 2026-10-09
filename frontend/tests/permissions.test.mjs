import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { can, canQuickCreate, workflowPermission, functionMasks } from '../src/utils/permissions.js';
const require = createRequire(import.meta.url);
let user = '{}';
globalThis.localStorage = { getItem: () => user };
test('page actions respect independent workflow and sensitive-data grants', () => {
  user = JSON.stringify({ ISADMIN:0, ROLE:'Admin', PERMISSIONS:{ REPAIR:31,EMPLOYEES:31,SALES:31 } });
  for (const [code,bit] of [['ADMIN',1],['SETTINGS',1],['ASSIGN_REPAIR',4],['PAYMENTS',4],['COST',1],['PAYROLL',1],['EXPORT',1]]) assert.equal(can(code,bit),false,code);
  assert.equal(can('REPAIR',4),true);
  assert.equal(canQuickCreate('customer_groups'),true);
  assert.equal(canQuickCreate('units'),false);
  user=JSON.stringify({ISADMIN:0,PERMISSIONS:{APPROVE_QUOTE:4,ASSIGN_REPAIR:4,HANDOVER:4}});
  for(const stage of [1,2,3,4]) assert.equal(can(workflowPermission(stage),4),true);
  user=JSON.stringify({ISADMIN:1});assert.equal(can('SETTINGS'),true);assert.equal(can('COST'),true);
  user='invalid JSON';assert.equal(can('REPAIR'),false);
});
test('permission matrix supports exactly the server-defined action bits', () => {
  assert.deepEqual(functionMasks,require('../../backend/src/permissionPolicy.js').masks);
});
