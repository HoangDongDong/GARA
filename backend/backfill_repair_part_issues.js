/**
 * Tao cac dong TXUATPHUTUNG con thieu cho nhung lenh da den buoc Giao xe.
 * Co the chay lai an toan: moi cap (lenh sua chua, phu tung) chi duoc tao mot lan.
 */
const db = require('./src/db');

async function main() {
  const inserted = await db.transaction(async (query, execute, uuidv4) => {
    const rows = await query(`
      SELECT TT.DXEID, TT.TLENHSUACHUAID, CT.DMATHANGID,
             SUM(CT.SOLUONG) AS SOLUONG, MAX(CT.DONGIA) AS DONGIA,
             SUM(CT.THANHTIEN) AS THANHTIEN, MAX(M.GIANHAP) AS GIAVON,
             MAX(M.BAOHANH) AS BAOHANH, MAX(VT.DKHOHANGID) AS DKHOHANGID
        FROM TTRANGTHAIXE TT
        JOIN TLENHSUACHUACHITIET CT ON CT.TLENHSUACHUAID = TT.TLENHSUACHUAID
        LEFT JOIN DMATHANG M ON M.ID = CT.DMATHANGID
        LEFT JOIN DVITRIKHO VT ON VT.ID = M.DVITRIKHOID
       WHERE TT.STATUS=1 AND TT.TRANGTHAI>=3 AND CT.LOAI=0
         AND CT.DMATHANGID IS NOT NULL AND COALESCE(CT.STATUS, 1)=1
         AND NOT EXISTS (
           SELECT 1 FROM TXUATPHUTUNG XP
            WHERE XP.TLENHSUACHUAID=TT.TLENHSUACHUAID
              AND XP.DMATHANGID=CT.DMATHANGID AND COALESCE(XP.STATUS, 1)=1
         )
    GROUP BY TT.DXEID, TT.TLENHSUACHUAID, CT.DMATHANGID
    `);

    for (const part of rows) {
      await execute(`
        INSERT INTO TXUATPHUTUNG
          (ID, NOTE, TLENHSUACHUAID, DXEID, DMATHANGID, DKHOHANGID,
           DNHANVIENID, SOLUONG, DONGIA, THANHTIEN, GIAVON, NGAYXUAT,
           BAOHANH, DAHOANKHO, SLHOAN, STATUS, USERCREATEDID, TIMECREATED)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, CURRENT_TIMESTAMP,
                ?, 0, 0, 1, 'SYSTEM', CURRENT_TIMESTAMP)
      `, [
        uuidv4(), 'Bo sung phu tung da thay tu lenh sua chua', part.TLENHSUACHUAID,
        part.DXEID, part.DMATHANGID, part.DKHOHANGID || null,
        Number(part.SOLUONG || 0), Number(part.DONGIA || 0),
        Number(part.THANHTIEN || 0), Number(part.GIAVON || 0),
        part.BAOHANH == null ? null : String(part.BAOHANH),
      ]);
    }
    return rows.length;
  });

  console.log(`Da bo sung ${inserted} dong xuat phu tung.`);
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
