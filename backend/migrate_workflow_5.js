/**
 * Chuyen workflow cu 7 buoc ve 5 buoc nghiep vu:
 * 0 Tiep nhan & Bao gia -> 1 Xac nhan sua chua -> 2 Dang sua
 * -> 3 Giao xe -> 4 Hoan thanh.
 */
const os = require('os');
const originalUserInfo = os.userInfo;
try {
  originalUserInfo();
} catch {
  os.userInfo = () => ({ username: process.env.USERNAME || 'SYSTEM' });
}

const db = require('./src/db');

const states = [
  [0, 'Tiep nhan & Bao gia', 'blue', 'inbox', 1, 2, 0, 0, 1],
  [1, 'Xac nhan sua chua', 'yellow', 'thumbs-up', 1, 3, 1, 0, 2],
  [2, 'Dang sua', 'red', 'wrench', 1, 3, 1, 0, 3],
  [3, 'Giao xe', 'purple', 'check-double', 3, 4, 5, 0, 4],
  [4, 'Hoan thanh', 'green', 'check-circle', 2, 4, 3, 1, null],
];

async function main() {
  const result = await db.transaction(async (query, execute, uuidv4) => {
    const oldRows = await query('SELECT COUNT(*) AS CNT FROM TWORKFLOWMAP WHERE STT_WORKFLOW > 4');
    const isLegacy = Number(oldRows[0]?.CNT || 0) > 0;

    if (isLegacy) {
      await execute(`UPDATE TTRANGTHAIXE SET TRANGTHAI = CASE
        WHEN TRANGTHAI <= 2 THEN 0 WHEN TRANGTHAI = 3 THEN 1
        WHEN TRANGTHAI = 4 THEN 2 WHEN TRANGTHAI = 5 THEN 3 ELSE 4 END`);
      await execute(`UPDATE TLICHSUTRANGTHAI SET TRANGTHAI_CU = CASE
        WHEN TRANGTHAI_CU IS NULL THEN NULL WHEN TRANGTHAI_CU <= 2 THEN 0
        WHEN TRANGTHAI_CU = 3 THEN 1 WHEN TRANGTHAI_CU = 4 THEN 2
        WHEN TRANGTHAI_CU = 5 THEN 3 ELSE 4 END`);
      await execute(`UPDATE TLICHSUTRANGTHAI SET TRANGTHAI_MOI = CASE
        WHEN TRANGTHAI_MOI <= 2 THEN 0 WHEN TRANGTHAI_MOI = 3 THEN 1
        WHEN TRANGTHAI_MOI = 4 THEN 2 WHEN TRANGTHAI_MOI = 5 THEN 3 ELSE 4 END`);
    }

    await execute('DELETE FROM TWORKFLOWMAP');
    for (const state of states) {
      await execute(
        `INSERT INTO TWORKFLOWMAP
          (ID, USERCREATEDID, TIMECREATED, STT_WORKFLOW, TEN, MAU, ICON,
           TRANGTHAI_TN, TRANGTHAI_CD, TRANGTHAI_LSC, IS_TERMINAL, NEXT_STT)
         VALUES (?, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), ...state]
      );
    }

    return { migratedLegacyData: isLegacy };
  });

  const rows = await db.query(
    'SELECT STT_WORKFLOW, TEN, NEXT_STT, IS_TERMINAL FROM TWORKFLOWMAP ORDER BY STT_WORKFLOW'
  );
  console.table(rows);
  console.log(result.migratedLegacyData ? 'Da chuyen du lieu 7 buoc sang 5 buoc.' : 'Da dong bo bang map 5 buoc.');
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
