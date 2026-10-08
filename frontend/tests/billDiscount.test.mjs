import test from 'node:test';
import assert from 'node:assert/strict';
import { billDiscount } from '../src/utils/billDiscount.js';
import { calculate } from '../src/utils/pricingPolicy.js';

test('percent and money stay synchronized, use base after line discounts and preserve exact money', () => {
  const lines = [{ amount: 300000, discountRate: 10, taxRate: 10 }];
  const percent = billDiscount(lines, 10, null);
  assert.equal(percent.base, 270000);
  assert.equal(calculate(lines, { taxRate: 10, serviceRate: 0 }, percent.percent, percent.fixed).billDiscount, 27000);
  const money = billDiscount(lines, 10, 10001);
  assert.equal(money.percent, 3.7);
  assert.equal(calculate(lines, { taxRate: 10, serviceRate: 0 }, money.percent, money.fixed).billDiscount, 10001);
  assert.equal(billDiscount(lines, 0, 270000).percent, 100);
  assert.deepEqual(billDiscount([], 10, 10001), { base: 0, fixed: 0, percent: 0 });
});

test('lowering prices or removing lines clamps a fixed discount to the current bill base', () => {
  assert.deepEqual(billDiscount([{ amount: 1000 }], 0, 10001), { base: 1000, fixed: 1000, percent: 100 });
});
