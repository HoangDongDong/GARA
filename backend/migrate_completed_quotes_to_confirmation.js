const db = require('./src/db');

async function run() {
  const result = await db.transaction(async (query, execute, uuidv4) => {
    const rows = await query(
      `SELECT ID, DXEID
         FROM TTRANGTHAIXE
        WHERE STATUS=1
          AND TRANGTHAI=0
          AND TLENHSUACHUAID IS NOT NULL`
    );

    for (const row of rows) {
      const sequenceRows = await query(
        `SELECT COALESCE(MAX(STT), 0) + 1 AS NEXT_STT
           FROM TLICHSUTRANGTHAI
          WHERE TTRANGTHAIXEID=?`,
        [row.ID]
      );
      const nextSequence = Number(sequenceRows[0]?.NEXT_STT || 1);

      await execute(
        `UPDATE TTRANGTHAIXE
            SET TRANGTHAI=1,
                NGAY_TRANGTHAI=CURRENT_TIMESTAMP,
                LYDO=?,
                USERMODIFIEDID='MIGRATION',
                TIMEMODIFIED=CURRENT_TIMESTAMP
          WHERE ID=? AND TRANGTHAI=0 AND TLENHSUACHUAID IS NOT NULL`,
        ['Da hoan tat tiep nhan va bao gia, cho xac nhan sua chua', row.ID]
      );

      await execute(
        `INSERT INTO TLICHSUTRANGTHAI
           (ID, TTRANGTHAIXEID, DXEID, TRANGTHAI_CU, TRANGTHAI_MOI,
            NGAY, DNHANVIENID, LYDO, GHICHU, STT,
            STATUS, USERCREATEDID, TIMECREATED)
         VALUES (?, ?, ?, 0, 1, CURRENT_TIMESTAMP, NULL, ?, NULL, ?, 1, 'MIGRATION', CURRENT_TIMESTAMP)`,
        [uuidv4(), row.ID, row.DXEID,
          'Hoan tat tiep nhan va bao gia, chuyen sang xac nhan sua chua', nextSequence]
      );
    }

    return rows.length;
  });

  console.log(`Da chuyen ${result} ho so da co bao gia sang Xac nhan sua chua.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
