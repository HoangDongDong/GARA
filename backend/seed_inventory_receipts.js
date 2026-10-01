const db = require('./src/db');

const receiptSeeds = [
  { code: 'NK-DEMO-001', date: '2026-09-26T08:30:00', supplier: 0, warehouse: 0, items: [[0, 12], [1, 20], [2, 8]], paid: true },
  { code: 'NK-DEMO-002', date: '2026-09-27T09:15:00', supplier: 1, warehouse: 3, items: [[3, 5], [4, 10], [5, 15]], paid: false },
  { code: 'NK-DEMO-003', date: '2026-09-28T10:00:00', supplier: 2, warehouse: 1, items: [[6, 24], [7, 12], [8, 18]], paid: true },
  { code: 'NK-DEMO-004', date: '2026-09-29T13:45:00', supplier: 3, warehouse: 0, items: [[9, 20], [10, 10], [11, 6]], paid: false },
  { code: 'NK-DEMO-005', date: '2026-09-30T08:00:00', supplier: 4, warehouse: 3, items: [[0, 10], [2, 16], [5, 8], [9, 12]], paid: true },
];

(async () => {
  try {
    const result = await db.transaction(async (query, execute, uuidv4) => {
      const suppliers = await query(`SELECT ID FROM DNHACUNGCAP WHERE STATUS=1 ORDER BY MANHACUNGCAP, NAME`);
      const warehouses = await query(`SELECT ID FROM DKHOHANG WHERE STATUS=1 ORDER BY NAME`);
      const employees = await query(`SELECT ID FROM DNHANVIEN WHERE STATUS=1 ORDER BY CASE WHEN LOAINHANVIEN=3 THEN 0 ELSE 1 END, NAME`);
      const products = await query(`SELECT ID, NAME, GIANHAP, DDONVITINHID FROM DMATHANG WHERE STATUS=1 AND COALESCE(TAMKHOA,0)=0 ORDER BY CODE, NAME`);
      if (!suppliers.length || !warehouses.length || !employees.length || products.length < 3) {
        throw new Error('Thieu du lieu danh muc NCC, kho, nhan vien hoac mat hang');
      }

      let inserted = 0;
      let skipped = 0;
      for (const seed of receiptSeeds) {
        const exists = await query(`SELECT ID FROM TNHAPKHO WHERE NAME=?`, [seed.code]);
        if (exists.length) {
          skipped++;
          continue;
        }

        const lines = seed.items.map(([index, quantity]) => {
          const product = products[index % products.length];
          const price = Number(product.GIANHAP || 0);
          return { product, quantity, price, amount: price * quantity };
        });
        const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
        const discount = 0;
        const total = subtotal - discount;
        const debt = seed.paid ? 0 : Math.round(total * 0.4);
        const receiptId = uuidv4();
        const supplierId = suppliers[seed.supplier % suppliers.length].ID;
        const warehouseId = warehouses[seed.warehouse % warehouses.length].ID;
        const employeeId = employees[0].ID;

        await execute(`
          INSERT INTO TNHAPKHO
            (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, NGAY,
             DNHACUNGCAPID, DKHOHANGID, DNHANVIENID, TIENHANG,
             TILEGIAMGIA, TIENGIAMGIA, TONGCONG, LOAI, CONGNO,
             DATHANHTOAN, SOLOHANG)
          VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?, ?)`,
          [receiptId, seed.code, 'Nhap phu tung bo sung ton kho', new Date(seed.date),
           supplierId, warehouseId, employeeId, subtotal, discount, total, debt,
           seed.paid ? 1 : 0, `LO-${seed.code}`]
        );

        for (const line of lines) {
          await execute(`
            INSERT INTO TNHAPKHOCHITIET
              (ID, STATUS, USERCREATEDID, TIMECREATED, TNHAPKHOID,
               DMATHANGID, DDONVITINHID, SOLUONG, DONGIA, THANHTIEN,
               GIAVON, DKHOHANGID)
            VALUES (?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), receiptId, line.product.ID, line.product.DDONVITINHID || null,
             line.quantity, line.price, line.amount, line.price, warehouseId]
          );
        }
        inserted++;
      }
      return { inserted, skipped };
    });
    console.log(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
})();
