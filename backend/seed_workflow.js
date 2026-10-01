/**
 * Seed du lieu cho TWORKFLOWMAP (5 trang thai workflow).
 * Su dung UUID tu Node.js thay vi GEN_UUID().
 */
const { v4: uuidv4 } = require('uuid');
const firebird = require('node-firebird');

const config = {
  host: '127.0.0.1',
  port: 3050,
  database: 'D:/Garage/GARAGE.FDB',
  user: 'SYSDBA',
  password: 'masterkey',
  page_size: 65536,
};

const STATES = [
  { stt: 0, ten: 'Tiep nhan & Bao gia',  mau: 'blue',   icon: 'inbox',        tt: 1, cd: 2, lsc: 0, terminal: 0, next: 1 },
  { stt: 1, ten: 'Xac nhan sua chua',    mau: 'yellow', icon: 'thumbs-up',    tt: 1, cd: 3, lsc: 1, terminal: 0, next: 2 },
  { stt: 2, ten: 'Dang sua',             mau: 'red',    icon: 'wrench',       tt: 1, cd: 3, lsc: 1, terminal: 0, next: 3 },
  { stt: 3, ten: 'Giao xe',              mau: 'purple', icon: 'check-double', tt: 3, cd: 4, lsc: 5, terminal: 0, next: 4 },
  { stt: 4, ten: 'Hoan thanh',           mau: 'green',  icon: 'check-circle', tt: 2, cd: 4, lsc: 3, terminal: 1, next: null },
];

function exec(db, sql, params) {
  return new Promise((res, rej) => db.query(sql, params, (e, r) => e ? rej(e) : res(r)));
}

async function main() {
  const db = await new Promise((res, rej) =>
    firebird.attach(config, (err, d) => err ? rej(err) : res(d))
  );

  console.log('>>> Checking existing data...');
  const existing = await exec(db, `SELECT COUNT(*) AS C FROM TWORKFLOWMAP`, []);
  if (existing[0].C > 0) {
    console.log(`>>> TWORKFLOWMAP already has ${existing[0].C} rows. Clearing first...`);
    await exec(db, `DELETE FROM TWORKFLOWMAP`, []);
  }

  console.log('>>> Inserting 5 workflow states...');
  for (const s of STATES) {
    const id = uuidv4();
    try {
      await exec(
        db,
        `INSERT INTO TWORKFLOWMAP
           (ID, USERCREATEDID, TIMECREATED, STT_WORKFLOW, TEN, MAU, ICON,
            TRANGTHAI_TN, TRANGTHAI_CD, TRANGTHAI_LSC, IS_TERMINAL, NEXT_STT)
         VALUES (?, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, s.stt, s.ten, s.mau, s.icon, s.tt, s.cd, s.lsc, s.terminal, s.next]
      );
      console.log(`  OK [${s.stt}] ${s.ten} (mau=${s.mau})`);
    } catch (e) {
      console.error(`  FAIL [${s.stt}] ${s.ten}: ${e.message}`);
    }
  }

  const check = await exec(db, `SELECT COUNT(*) AS C FROM TWORKFLOWMAP`, []);
  console.log(`\n>>> Done. TWORKFLOWMAP now has ${check[0].C} rows.`);
  db.detach();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
