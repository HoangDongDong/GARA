/**
 * Inspect schema thuc te cua GARAGE.FDB
 * Liet ke cac bang, cot, va so dong.
 */
const firebird = require('node-firebird');

const config = {
  host: '127.0.0.1',
  port: 3050,
  database: 'D:/Garage/GARAGE.FDB',
  user: 'SYSDBA',
  password: 'masterkey',
  page_size: 65536,
};

firebird.attach(config, (err, db) => {
  if (err) {
    console.error('Connect ERR:', err.message);
    process.exit(1);
  }
  console.log('>>> Connected to GARAGE.FDB');

  db.query(
    `SELECT TRIM(r.RDB\$RELATION_NAME) AS TBNAME
       FROM RDB\$RELATIONS r
      WHERE COALESCE(r.RDB\$SYSTEM_FLAG, 0) = 0
        AND r.RDB\$VIEW_BLR IS NULL
   ORDER BY r.RDB\$RELATION_NAME`,
    (err, tables) => {
      if (err) { console.error(err); db.detach(); return; }
      console.log('>>> Tables:', tables.length);

      let pending = tables.length;
      const colsOfTable = {};

      tables.forEach((t, i) => {
        const name = t.TBNAME.trim();
        db.query(
          `SELECT TRIM(rf.RDB\$FIELD_NAME) AS COLNAME,
                  rf.RDB\$FIELD_POSITION AS POS
             FROM RDB\$RELATION_FIELDS rf
            WHERE rf.RDB\$RELATION_NAME = ?
         ORDER BY rf.RDB\$FIELD_POSITION`,
          [name],
          (err2, cols) => {
            if (err2) {
              colsOfTable[name] = ['ERR: ' + err2.message];
            } else {
              colsOfTable[name] = cols.map((c) => c.COLNAME.trim());
            }
            // dem so dong
            db.query(`SELECT COUNT(*) AS C FROM "${name}"`, [], (err3, cnt) => {
              const rowCount = (cnt && cnt[0]) ? cnt[0].C : 0;
              console.log(`\n=== ${name} (${rowCount} rows, ${colsOfTable[name].length} cols) ===`);
              console.log('  ' + colsOfTable[name].join(', '));
              pending--;
              if (pending === 0) {
                db.detach();
                console.log('\n>>> DONE');
                process.exit(0);
              }
            });
          }
        );
      });
    }
  );
});
