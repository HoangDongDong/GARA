const firebird = require('node-firebird');
const config = { host: '127.0.0.1', port: 3050, database: 'D:/Garage/GARAGE.FDB', user: 'SYSDBA', password: 'masterkey' };
const stmts = [
  'CREATE TABLE TBAOHANH (ID VARCHAR(36) NOT NULL, NAME VARCHAR(255), NOTE VARCHAR(1000), STATUS INTEGER DEFAULT 1 NOT NULL, USERMODIFIEDID VARCHAR(36), TIMEMODIFIED TIMESTAMP, TIMECREATED TIMESTAMP DEFAULT CURRENT_TIMESTAMP, USERCREATEDID VARCHAR(36), DXEID VARCHAR(36), DKHACHHANGID VARCHAR(36), TLENHSUACHUAID VARCHAR(36), DMATHANGID VARCHAR(36), DDICHVUID VARCHAR(36), NGAYBATDAU DATE, NGAYKETTHUC DATE, LOAI INTEGER DEFAULT 1, TRANGTHAI INTEGER DEFAULT 1, KETQUAXULY VARCHAR(500), CHIPHI NUMERIC(15,2) DEFAULT 0, CONSTRAINT PK_TBAOHANH PRIMARY KEY (ID))',
  'CREATE INDEX IDX_TBAOHANH_XE ON TBAOHANH (DXEID, STATUS)',
  'CREATE INDEX IDX_TBAOHANH_NGAY ON TBAOHANH (NGAYKETTHUC)',
  'CREATE INDEX IDX_TBAOHANH_LSC ON TBAOHANH (TLENHSUACHUAID)',
];
async function run() {
  const db = await new Promise((res,rej) => firebird.attach(config,(err,d)=>err?rej(err):res(d)));
  for(const stmt of stmts){
    await new Promise(res=>db.query(stmt,[],(e)=>{
      if(e){ if(e.gdscode===335544351||String(e.message).includes('already')){console.log('SKIP:',stmt.slice(0,60));}else{console.error('FAIL:',e.message);} }
      else{console.log('OK:',stmt.slice(0,60));}
      res();
    }));
  }
  db.detach();
  console.log('DONE');
}
run().catch(e=>{console.error(e);process.exit(1)});
