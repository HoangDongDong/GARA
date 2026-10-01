/**
 * Kiem tra schema DB sau khi apply SQL.
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
  if (err) { console.error(err); process.exit(1); }

  /* Kiem tra bang workflow */
  db.query(`SELECT COUNT(*) AS C FROM TWORKFLOWMAP`, [], (e1, r1) => {
    if (e1) console.log('TWORKFLOWMAP: ERR', e1.message);
    else console.log('TWORKFLOWMAP:', r1[0].C, 'rows');

    db.query(`SELECT STT_WORKFLOW, TEN, MAU, ICON, TRANGTHAI_TN, TRANGTHAI_CD, TRANGTHAI_LSC, NEXT_STT FROM TWORKFLOWMAP ORDER BY STT_WORKFLOW`, [], (e2, r2) => {
      if (!e2 && r2.length === 0) {
        console.log('>> TWORKFLOWMAP is EMPTY - need to seed');
      } else if (!e2) {
        console.table(r2.map(x => ({
          STT: x.STT_WORKFLOW, TEN: x.TEN, MAU: x.MAU,
          TN: x.TRANGTHAI_TN, CD: x.TRANGTHAI_CD, LSC: x.TRANGTHAI_LSC, NEXT: x.NEXT_STT
        })));
      }

      db.query(`SELECT COUNT(*) AS C FROM TTRANGTHAIXE`, [], (e3, r3) => {
        console.log('\nTTRANGTHAIXE:', r3[0].C, 'rows');
        db.query(`SELECT COUNT(*) AS C FROM TLICHSUTRANGTHAI`, [], (e4, r4) => {
          console.log('TLICHSUTRANGTHAI:', r4[0].C, 'rows');

          /* Kiem tra PROC */
          db.query(`SELECT TRIM(RDB$PROCEDURE_NAME) AS NAME FROM RDB$PROCEDURES WHERE RDB$PROCEDURE_NAME = 'SP_CHUYEN_TRANGTHAI'`, [], (e5, r5) => {
            console.log('SP_CHUYEN_TRANGTHAI:', r5.length > 0 ? 'EXISTS' : 'NOT FOUND');
            db.detach();
            process.exit(0);
          });
        });
      });
    });
  });
});
