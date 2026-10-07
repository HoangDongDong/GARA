const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/db');
const charges = require('../src/services/defaultChargeRates');
const printing = require('../src/services/documentPrint');
const { applyServiceFeeRow } = require('../src/services/chargePrint');
const salesRouter = require('../src/routes/sales');
const repairsRouter = require('../src/routes/repairOrders');
const invoicesRouter = require('../src/routes/invoices');
const handler = (router, method, path) => router.stack.find(layer => layer.route?.path === path && layer.route.methods[method]).route.stack[0].handle;
async function call(fn, body = {}, params = {}) {
  let status = 200, result;
  await fn({ body, params, get: () => 'TEST' }, { status(code) { status = code; return this; }, json(value) { result = value; } });
  assert.equal(status, 200, result?.error);
  return result;
}

test('Firebird: POS, repair quote, invoice and print snapshots agree; test rows roll back', { skip: process.env.TEST_FIREBIRD !== '1' }, async () => {
  const originals = { query: db.query, execute: db.execute, transaction: db.transaction, queryBlob: db.queryBlob };
  // Rendering normally happens after commit. Cache the unchanged logo here so
  // its separate blob connection does not wait for this rollback-only transaction.
  const logo = process.env.RENDER_CHARGES === '1'
    ? await db.queryBlob("SELECT BLOBVALUE FROM SCONFIG WHERE NAME='CompanyLogo' AND STATUS=30", [], 'BLOBVALUE') : null;
  const rollback = new Error('CHARGE_TEST_ROLLBACK');
  const created = [];
  await assert.rejects(originals.transaction(async (query, execute, uuid) => {
    db.query = query;
    db.execute = execute;
    db.transaction = callback => callback(query, execute, uuid);
    if (process.env.RENDER_CHARGES === '1') db.queryBlob = (sql, ...args) => sql.includes('CompanyLogo') ? Promise.resolve(logo) : originals.queryBlob(sql, ...args);
    try {
      const products = await query(`SELECT M.ID,
        COALESCE((SELECT SUM(NC.SOLUONG) FROM TNHAPKHOCHITIET NC WHERE NC.DMATHANGID=M.ID),0)
        -COALESCE((SELECT SUM(XP.SOLUONG) FROM TXUATPHUTUNG XP WHERE XP.DMATHANGID=M.ID),0)
        -COALESCE((SELECT SUM(CT.SLXUAT) FROM TDONHANGCHITIET CT WHERE CT.DMATHANGID=M.ID AND CT.STATUS=1),0) AS STOCK
        FROM DMATHANG M WHERE M.STATUS=1 AND COALESCE(M.TAMKHOA,0)=0`);
      const part = products.find(row => Number(row.STOCK) >= 2);
      const [work] = await query('SELECT FIRST 1 ID FROM DDICHVU WHERE STATUS=1');
      const [customer] = await query('SELECT FIRST 1 ID FROM DKHACHHANG WHERE STATUS=1');
      assert.ok(part && work && customer, 'Test catalogs must be available');
      // Rates are changed only inside this transaction and are rolled back.
      await execute("UPDATE SCONFIG SET DECIMALVALUE=20 WHERE NAME='MacDinhThueSuat'");
      await execute("UPDATE SCONFIG SET DECIMALVALUE=10 WHERE NAME='MacDinhPhiDichVu'");
      await execute("UPDATE SCONFIG SET INTVALUE=30 WHERE NAME IN ('BanHangTinhThue','BanHangTinhPhiDichVu','SalesPrintShow_tax','SalesPrintShow_discount')");
      await execute('UPDATE DMATHANG SET THUESUATRIENG=20 WHERE ID=?', [part.ID]);
      await execute('UPDATE DDICHVU SET THUESUATRIENG=20 WHERE ID=?', [work.ID]);
      await execute('UPDATE DKHACHHANG SET GIAMGIARIENG=0 WHERE ID=?', [customer.ID]);
      const sale = await call(handler(salesRouter, 'post', '/'), {
        DKHACHHANGID: customer.ID, payments: { cashGiven: 1000000, allowDebt: true },
        TILEGIAMGIA: 10, items: [{ DMATHANGID: part.ID, SOLUONG: 2, DONGIA: 2000000 }],
      });
      created.push(['TDONHANG', sale.id]);
      assert.equal(sale.total, 4752000);
      const [saleRow] = await query('SELECT * FROM TDONHANG WHERE ID=?', [sale.id]);
      assert.equal(Number(saleRow.TIENTHUE), 792000);
      assert.equal(Number(saleRow.PHIDICHVU), 360000);
      assert.equal(Number(saleRow.TIENTHANHTOAN), 1000000);
      assert.equal(Number(saleRow.CONLAI), sale.total - 1000000);
      assert.equal(Number(saleRow.CONGNO), sale.total - 1000000);
      const [saleDetail] = await query('SELECT DONGIA FROM TDONHANGCHITIET WHERE TDONHANGID=?', [sale.id]);
      assert.equal(Number(saleDetail.DONGIA), 2000000);

      const vehicleId = uuid();
      created.push(['DXE', vehicleId]);
      await execute("INSERT INTO DXE (ID,NAME,BIENSO,DKHACHHANGID,STATUS,USERCREATEDID) VALUES (?, 'CHARGE-ROLLBACK', 'TEST-CHARGE', ?, 1, 'TEST')", [vehicleId, customer.ID]);
      const workflowRouter = require('../src/routes/workflow');
      const profileBoard = await call(handler(workflowRouter, 'get', '/board'));
      const profile = profileBoard.data.find(row => row.DXEID === vehicleId);
      assert.ok(profile?.PROFILE_ONLY, 'New vehicle profile must appear before a quote is saved');
      assert.equal(profile.TRANGTHAI, 0);
      const repair = await call(handler(repairsRouter, 'post', '/'), {
        DXEID: vehicleId, DKHACHHANGID: customer.ID, items: [
          { LOAI: 0, DMATHANGID: part.ID, SOLUONG: 1, DONGIA: 700000 },
          { LOAI: 1, DDICHVUID: work.ID, SOLUONG: 1, DONGIA: 300000 },
        ],
      });
      created.push(['TLENHSUACHUA', repair.id]);
      assert.equal(repair.workflowState, 1, 'Saved quotes must wait for repair confirmation');
      const [quoteFlow] = await query('SELECT TRANGTHAI FROM TTRANGTHAIXE WHERE ID=? AND STATUS=1', [repair.workflowId]);
      assert.equal(Number(quoteFlow.TRANGTHAI), 1);
      const board = await call(handler(require('../src/routes/workflow'), 'get', '/board'));
      assert.ok(board.data.some(row => row.TLENHSUACHUAID === repair.id && Number(row.TRANGTHAI) === 1), 'Saved quote must appear in the repair confirmation stage');
      assert.equal(board.data.filter(row => row.DXEID === vehicleId).length, 1, 'Saving a quote must replace the profile card without a duplicate');
      const order = (await call(handler(repairsRouter, 'get', '/:id'), {}, { id: repair.id })).data;
      assert.equal(Number(order.TONGCONG), 1320000);
      assert.equal(Number(order.PHIDICHVU), 100000);
      assert.equal(Number(order.TIENTHUE), 220000);
      await execute('UPDATE TTRANGTHAIXE SET TRANGTHAI=3 WHERE ID=?', [repair.workflowId]);
      const progressedBoard = await call(handler(workflowRouter, 'get', '/board'));
      assert.ok(!progressedBoard.data.some(row => row.DXEID === vehicleId && row.PROFILE_ONLY), 'A vehicle in a later stage must not reappear as a new profile');
      // Defaults change between quote and payment; saved quote rates take precedence.
      await execute("UPDATE SCONFIG SET DECIMALVALUE=0 WHERE NAME IN ('MacDinhThueSuat','MacDinhPhiDichVu')");
      const invoice = await call(handler(invoicesRouter, 'post', '/'), { TLENHSUACHUAID: repair.id, TIENMAT: 320000, ALLOW_DEBT: true });
      created.push(['THOADONSUACHUA', invoice.id]);
      assert.equal(invoice.total, 1320000);
      assert.equal(invoice.paid, false);
      assert.equal(invoice.remaining, 1000000);
      const [partial] = await query('SELECT CONLAI, CONGNO, DATHANHTOAN FROM THOADONSUACHUA WHERE ID=?', [invoice.id]);
      assert.equal(Number(partial.CONLAI), 1000000);
      assert.equal(Number(partial.CONGNO), 1000000);
      assert.equal(Number(partial.DATHANHTOAN), 0);
      const [debtFlow] = await query('SELECT TRANGTHAI FROM TTRANGTHAIXE WHERE ID=?', [repair.workflowId]);
      assert.equal(Number(debtFlow.TRANGTHAI), 4);
      const settlement = await call(handler(invoicesRouter, 'patch', '/:id/pay'), { CHUYENKHOAN: 1000000 }, { id: invoice.id });
      assert.equal(settlement.paid, true);
      const [invoiceRow] = await query('SELECT * FROM THOADONSUACHUA WHERE ID=?', [invoice.id]);
      assert.equal(Number(invoiceRow.PHIDICHVU), 100000);
      assert.equal(Number(invoiceRow.TIENTHUE), 220000);
      assert.equal(Number(invoiceRow.TILETHUE), 20);
      assert.equal(Number(invoiceRow.TILEPHIDICHVU), 10);
      assert.equal(Number(invoiceRow.TIENMAT), 320000);
      assert.equal(Number(invoiceRow.CHUYENKHOAN), 1000000);
      assert.equal(Number(invoiceRow.CONLAI), 0);
      assert.equal(Number(invoiceRow.CONGNO), 0);
      const [flow] = await query('SELECT TRANGTHAI FROM TTRANGTHAIXE WHERE ID=?', [repair.workflowId]);
      assert.equal(Number(flow.TRANGTHAI), 4);

      for (const [type, id, expected] of [
        ['MauHoaDonBanHang', sale.id, { total: 4752000, fee: 360000, tax: 792000 }],
        ['MauHoaDonSuaChua', invoice.id, { total: 1320000, fee: 100000, tax: 220000 }],
        ['MauPhieuSuaChua', repair.id, { total: 1320000, fee: 100000, tax: 220000 }],
      ]) {
        const kind = printing.typeByKey(type);
        const payload = await printing.payload(kind, id, {}, 'TEST');
        assert.equal(Number(payload.parameters.TONGCONG), expected.total);
        assert.equal(Number(payload.parameters.PHIDICHVU), expected.fee);
        assert.equal(Number(payload.parameters.TIENTHUE), expected.tax);
        assert.match(payload.parameters.SummaryText, /phí dịch vụ/);
        const template = await printing.resolve(kind);
        const xml = applyServiceFeeRow(template.content.toString('utf8'), payload.parameters);
        printing.validateBindings(xml, payload);
        if (type === 'MauHoaDonBanHang') {
          assert.match(xml, /\[PHIDICHVU\]/);
          const row = payload.tables.Table0[0];
          assert.equal(row.SLXUATCHUAQUYDOI - row.SLNHAPCHUAQUYDOI, 2);
        }
        if (process.env.RENDER_CHARGES === '1') {
          const fs = require('node:fs');
          const path = require('node:path');
          const rendered = await printing.render(kind, id, {}, 'TEST');
          assert.equal(rendered.pdf.subarray(0, 4).toString(), '%PDF');
          const folder = path.resolve(__dirname, '../tmp/pdfs');
          fs.mkdirSync(folder, { recursive: true });
          fs.writeFileSync(path.join(folder, `${type}-charges-check.pdf`), rendered.pdf);
        }
      }
      assert.deepEqual(await charges.load(query), { taxRate: 0, serviceRate: 0 });
      throw rollback;
    } finally { Object.assign(db, originals); }
  }), error => error === rollback);
  for (const [table, id] of created) assert.equal((await db.query(`SELECT ID FROM ${table} WHERE ID=?`, [id])).length, 0);
});
