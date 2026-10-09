import test from 'node:test';
import assert from 'node:assert/strict';
import {financeOverview,currentFinanceMonth} from '../src/utils/financeOverview.js';
test('empty store has zero finances and no fabricated transactions/months',()=>{
 assert.deepEqual(financeOverview([]),{rows:[],income:0,expense:0,balance:0,monthly:[]});
});
test('real cashbook honors period/type/search/category and excludes bank payments from cash balance',()=>{
 const rows=[
 {date:'2026-09-30T03:00:00Z',income:100,expense:0,method:'cash',description:'Trước kỳ'},
 {date:'2026-10-01T03:00:00Z',income:200,expense:0,method:'cash',description:'Sửa xe',category:'Sửa chữa'},
 {date:'2026-10-02T03:00:00Z',income:500,expense:0,method:'transfer',description:'Bán hàng',category:'Bán hàng'},
 {date:'2026-10-03T03:00:00Z',income:0,expense:50,method:'cash',description:'Mua hàng',category:'Nhập kho'},
 ];
 const total=financeOverview(rows,{from:'2026-10-01',to:'2026-10-09'});
 assert.equal(total.income,700);assert.equal(total.expense,50);assert.equal(total.balance,250);
 assert.equal(total.rows.length,3);assert.equal(total.monthly[0].month,'10/2026');
 assert.equal(financeOverview(rows,{type:'Chi'}).rows.length,1);
 assert.equal(financeOverview(rows,{search:'sỬA',category:'Sửa chữa'}).income,200);
 assert.deepEqual(currentFinanceMonth(new Date('2026-09-30T18:00:00Z')),{from:'2026-10-01',to:'2026-10-01'});
});
