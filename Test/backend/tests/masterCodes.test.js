const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../../../backend/src/db.js');
const numbers = require('../../../backend/src/services/documentNumbers.js');
const catalog = require('../../../backend/src/services/catalogData.js');

test('master codes use the configured pattern and skip codes in inactive records', async () => {
  for (const type of numbers.masterDefinitions) {
    const writes = [];
    const query = async (sql, params) => {
      if (sql.includes('FROM SCONFIG')) return [{TEXTVALUE:'CUSTOM-(***)'}];
      if (sql.includes('FROM SNUMBERCOUNTER')) return [{PERIODKEY:'ALL',SEQ:0}];
      assert.ok(sql.includes(`UPPER(TRIM(${type.field}))`));
      assert.ok(!sql.includes('STATUS'));
      return params[0] === 'CUSTOM-001' ? [{ID:'inactive'}] : [];
    };
    assert.equal(await numbers.nextInTransaction(type.key, query, async (sql, params) => writes.push([sql,params])), 'CUSTOM-002');
    assert.deepEqual(writes.at(-1)[1], ['ALL',2,type.key]);
  }
});

test('catalog creation allocates automatically, manual codes and edits preserve the counter', async () => {
  const original = {query:db.query,transaction:db.transaction};
  const writes = [];
  db.query = async () => [{FOUND:1}];
  db.transaction = async callback => callback(async sql => {
    if (sql.includes('FROM SCONFIG')) return [{TEXTVALUE:'DV(***)'}];
    if (sql.includes('FROM SNUMBERCOUNTER')) return [{PERIODKEY:'ALL',SEQ:0}];
    if (sql.includes('WHERE ID=?')) return [{NAME:'Existing',CODE:'OLD-001'}];
    return [];
  }, async (sql, params) => writes.push([sql,params]), () => 'new-id');
  try {
    await catalog.save('services',null,{NAME:'Auto service'},'SYSTEM');
    const insert = writes.find(([sql]) => sql.startsWith('INSERT INTO DDICHVU'));
    assert.ok(insert[1].includes('DV001'));
    assert.ok(writes.some(([sql]) => sql.startsWith('UPDATE SNUMBERCOUNTER')));
    writes.length = 0;
    await catalog.save('services',null,{NAME:'Manual service',CODE:'CUSTOM'},'SYSTEM');
    await catalog.save('services','existing-id',{NAME:'Renamed service'},'SYSTEM');
    assert.ok(!writes.some(([sql]) => sql.includes('SNUMBERCOUNTER')));
  } finally { Object.assign(db, original); }
});

test('Firebird customer, service and employee create together with counters; the transaction rolls back', {skip:process.env.TEST_FIREBIRD !== '1'}, async () => {
  const tenancy = require('../../../backend/src/tenancy.js');
  const platform = require('../../../backend/src/services/platform.js');
  const fs = require('fs');
  const [row] = (await platform.query('SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS')).filter(row => row.DBPATH && fs.existsSync(row.DBPATH));
  assert.ok(row, 'A store database is required');
  await tenancy.run(platform.map(row), async () => {
    const original = {query:db.query,execute:db.execute,transaction:db.transaction};
    const rollback = new Error('ROLLBACK_MASTER_CODES_TEST');
    const before = await db.query("SELECT CODE,PERIODKEY,SEQ FROM SNUMBERCOUNTER WHERE CODE IN ('KhachHang','DichVu','NhanVien','MatHang') ORDER BY CODE");
    await assert.rejects(original.transaction(async (query, execute, uuid) => {
      db.query = query; db.execute = execute; db.transaction = callback => callback(query, execute, uuid);
      const create = async (router, body) => {
        const handler = router.stack.find(layer => layer.route?.path === '/' && layer.route.methods.post).route.stack[0].handle;
        let result, status = 200;
        await handler({body,accessUser:{ID:'SYSTEM',ISADMIN:1},get:() => 'SYSTEM'}, {json(value){result=value;return this;},status(value){status=value;return this;}});
        assert.equal(status,200,result?.error);
        return result.id;
      };
      try {
        const customerRouter = require('../../../backend/src/routes/customers.js');
        const employeeRouter = require('../../../backend/src/routes/employees.js');
        const types = {
          MatHang: () => create(require('../../../backend/src/routes/parts.js'),{NAME:'Part code test'}),
          KhachHang: () => create(customerRouter,{NAME:'Master code test',MAKHACH:'KH00001',AUTO_CODE:'KH00001'}),
          DichVu: async () => (await catalog.save('services',null,{NAME:uuid()},'SYSTEM')).id,
          NhanVien: () => create(employeeRouter,{NAME:'Master code test'}),
        };
        for (const type of numbers.masterDefinitions) {
          const ids = [await types[type.key](), await types[type.key]()];
          const rows = await query(`SELECT ${type.field} AS CODE FROM ${type.table} WHERE ID IN (?,?)`, ids);
          assert.equal(rows.length,2);
          assert.ok(rows.every(row => row.CODE));
          assert.notEqual(rows[0].CODE,rows[1].CODE);
          if (type.key === 'MatHang') {
            const parts=await query('SELECT CODE,BARCODE FROM DMATHANG WHERE ID IN (?,?)',ids);
            assert.ok(parts.every(row=>row.CODE===row.BARCODE));
          }
        }
        throw rollback;
      } finally { Object.assign(db, original); }
    }), error => error === rollback);
    assert.deepEqual(await db.query("SELECT CODE,PERIODKEY,SEQ FROM SNUMBERCOUNTER WHERE CODE IN ('KhachHang','DichVu','NhanVien','MatHang') ORDER BY CODE"), before);
  });
});
