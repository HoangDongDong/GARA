const db = require('./src/db');
const u = db.uuidv4;
(async () => {
  try {
    // Lay 1 mathang
    const mh = await db.query('SELECT FIRST 3 ID, NAME FROM DMATHANG');
    const nhapId = u();
    await db.execute(
      `INSERT INTO TNHAPKHO (ID, NAME, NGAY, TONGCONG, STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, 'NK001', CURRENT_TIMESTAMP, 5000000, 1, 'SYSTEM', CURRENT_TIMESTAMP)`,
      [nhapId]
    );
    for (const m of mh) {
      await db.execute(
        `INSERT INTO TNHAPKHOCHITIET (ID, TNHAPKHOID, DMATHANGID, SOLUONG, DONGIA, THANHTIEN,
                                      STATUS, USERCREATEDID, TIMECREATED)
         VALUES (?, ?, ?, 50, 100000, 5000000, 1, 'SYSTEM', CURRENT_TIMESTAMP)`,
        [u(), nhapId, m.ID]
      );
    }
    console.log('> Seeded 1 phieu nhap kho voi 3 mat hang, moi mat 50 cai');
    process.exit(0);
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();