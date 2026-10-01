const firebird = require('node-firebird');
const config = { host: '127.0.0.1', port: 3050, database: 'D:/Garage/GARAGE.FDB', user: 'SYSDBA', password: 'masterkey' };
async function run() {
  const db = await new Promise((res,rej) => firebird.attach(config,(err,d)=>err?rej(err):res(d)));
  await new Promise(res=>db.query(
    `SELECT FIRST 5 BH.ID, BH.NAME, BH.NGAYBATDAU, BH.NGAYKETTHUC, BH.LOAI, BH.TRANGTHAI, BH.DXEID,
            M.NAME AS TEN_MATHANG, DV.NAME AS TEN_DICHVU, LS.NAME AS SO_PHIEU
       FROM TBAOHANH BH
       LEFT JOIN DMATHANG M ON M.ID = BH.DMATHANGID
       LEFT JOIN DDICHVU DV ON DV.ID = BH.DDICHVUID
       LEFT JOIN TLENHSUACHUA LS ON LS.ID = BH.TLENHSUACHUAID
      WHERE BH.STATUS = 1
      ORDER BY BH.NGAYBATDAU DESC`,
    [],(e,rows)=>{ 
      if(e){console.error('ERR:',e.message);}
      else{console.log('Sample TBAOHANH data:',JSON.stringify(rows,null,2));}
      res(); 
    }
  ));
  // Also check what vehicles exist
  await new Promise(res=>db.query('SELECT FIRST 3 ID, BIENSO FROM DXE WHERE STATUS=1',[],
    (e,rows)=>{ if(e){console.error('ERR:',e.message);}else{console.log('Sample vehicles:',rows);} res(); }
  ));
  db.detach();
}
run().catch(e=>{console.error(e);process.exit(1)});
