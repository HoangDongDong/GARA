/**
 * Tạo nơi lưu nhiều ảnh cho từng trạng thái của một lượt sửa chữa.
 * Dữ liệu ảnh nằm trong Firebird (BLOB text/data URL), không phụ thuộc file tạm.
 */
const db = require('./src/db');

async function main() {
  const existing = await db.query(
    `SELECT TRIM(RDB$RELATION_NAME) AS NAME
       FROM RDB$RELATIONS
      WHERE RDB$RELATION_NAME = 'TTRANGTHAIANH'
        AND COALESCE(RDB$SYSTEM_FLAG, 0) = 0`
  );

  if (!existing.length) {
    await db.execute(`CREATE TABLE TTRANGTHAIANH (
      ID VARCHAR(36) NOT NULL,
      TTRANGTHAIXEID VARCHAR(36) NOT NULL,
      TLICHSUTRANGTHAIID VARCHAR(36),
      DXEID VARCHAR(36) NOT NULL,
      TLENHSUACHUAID VARCHAR(36),
      TRANGTHAI INTEGER NOT NULL,
      TENFILE VARCHAR(255),
      MIME VARCHAR(100),
      DULIEUANH BLOB SUB_TYPE TEXT,
      MOTA VARCHAR(500),
      THUTU INTEGER DEFAULT 0,
      STATUS SMALLINT DEFAULT 1,
      USERCREATEDID VARCHAR(36),
      TIMECREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      USERMODIFIEDID VARCHAR(36),
      TIMEMODIFIED TIMESTAMP,
      CONSTRAINT PK_TTRANGTHAIANH PRIMARY KEY (ID)
    )`);
    await db.execute('CREATE INDEX IX_TTANH_WORKFLOW ON TTRANGTHAIANH (TTRANGTHAIXEID, TRANGTHAI)');
    await db.execute('CREATE INDEX IX_TTANH_REPAIR ON TTRANGTHAIANH (TLENHSUACHUAID)');
    console.log('Created TTRANGTHAIANH with workflow/state indexes.');
  } else {
    console.log('TTRANGTHAIANH already exists; no schema change needed.');
  }

  const columns = await db.query(
    `SELECT TRIM(RDB$FIELD_NAME) AS NAME
       FROM RDB$RELATION_FIELDS
      WHERE RDB$RELATION_NAME = 'TTRANGTHAIANH'
      ORDER BY RDB$FIELD_POSITION`
  );
  console.log('Columns:', columns.map((column) => column.NAME).join(', '));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
