/**
 * Seed: Tao 2 khach hang + 2 xe, chay workflow tu TN -> HT
 * De demo end-to-end workflow 5 trang thai.
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

function exec(db, sql, params = []) {
  return new Promise((res, rej) => db.query(sql, params, (e, r) => e ? rej(e) : res(r)));
}

async function main() {
  const db = await new Promise((res, rej) =>
    firebird.attach(config, (err, d) => err ? rej(err) : res(d))
  );

  console.log('>>> Seeding demo workflow scenarios...');

  /* === Lay ID cac bang can thiet === */
  const nhomKH = await exec(db, `SELECT ID FROM DNHOMKHACHHANG WHERE NAME = 'Khach VIP'`, []);
  const khoChinh = await exec(db, `SELECT ID FROM DKHOHANG WHERE NAME = 'Kho chinh'`, []);
  const vtri = await exec(db, `SELECT FIRST 1 ID FROM DVITRIKHO`, []);
  const ctv1 = await exec(db, `SELECT FIRST 1 ID FROM DDICHVU WHERE NAME = 'Chan doan loi bang may'`, []);
  const ctv2 = await exec(db, `SELECT FIRST 1 ID FROM DDICHVU WHERE NAME = 'Thay dau'`, []);
  const ctv3 = await exec(db, `SELECT FIRST 1 ID FROM DDICHVU WHERE NAME = 'Can chinh thuoc lai'`, []);
  const ctv4 = await exec(db, `SELECT FIRST 1 ID FROM DDICHVU WHERE NAME = 'Thay phanh truoc'`, []);
  const ctv5 = await exec(db, `SELECT FIRST 1 ID FROM DDICHVU WHERE NAME = 'Ve sinh dieu hoa'`, []);
  const mathang = await exec(db, `SELECT FIRST 1 ID FROM DMATHANG`, []);
  const dvTinh = await exec(db, `SELECT FIRST 1 ID FROM DDONVITINH`, []);
  const hsx = await exec(db, `SELECT FIRST 1 ID FROM DHANGSANXUAT`, []);
  const nv = await exec(db, `SELECT FIRST 1 ID FROM DNHANVIEN WHERE STATUS = 1`, []);
  const cuaHang = await exec(db, `SELECT FIRST 1 ID FROM DCUAHANG`, []);

  console.log('  Ref data: NV=', nv.length, ' KH=', nhomKH.length);

  if (!nv.length || !nhomKH.length) {
    console.log('  WARNING: Chua co NV/KH. Can chay seed_full.js truoc.');
    db.detach();
    return;
  }

  /* === Tạo 2 khách hàng mẫu === */
  const kh1Id = uuidv4();
  await exec(db,
    `INSERT INTO DKHACHHANG (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DNHOMKHACHHANGID, DIENTHOAI, EMAIL, DIACHI, NGAYSINH, MAKHACH)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)`,
    [kh1Id, 'Nguyen Van A', nhomKH[0].ID, '0987654321', 'a.nguyen@gmail.com',
     '123 Le Loi, Q1, TP.HCM', '1990-05-15', 'KH001']
  );

  const kh2Id = uuidv4();
  await exec(db,
    `INSERT INTO DKHACHHANG (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DNHOMKHACHHANGID, DIENTHOAI, EMAIL, DIACHI, NGAYSINH, MAKHACH)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)`,
    [kh2Id, 'Tran Thi B', nhomKH[0].ID, '0909123456', 'b.tran@gmail.com',
     '456 Nguyen Hue, Q1, TP.HCM', '1995-08-20', 'KH002']
  );

  /* === Tạo 2 xe === */
  const dongXe1 = await exec(db, `SELECT FIRST 1 ID FROM DDONGXE WHERE NAME = 'Vios'`, []);
  const dongXe2 = await exec(db, `SELECT FIRST 1 ID FROM DDONGXE WHERE NAME = 'City'`, []);

  const xe1Id = uuidv4();
  await exec(db,
    `INSERT INTO DXE (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, BIENSO, DDONGXEID, DKHACHHANGID, NAMSANXUAT, MAUXE, SOKHUNG, SOMAY, ODO, NHIENLIEU, MUCNHIENLIEU, PHIENBAN)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, 2020, 'Trang', ?, ?, 45000, 'Xang', 70, 'G')`,
    [xe1Id, 'Toyota Vios 51A-123.45', '51A-123.45', dongXe1[0].ID, kh1Id, 'RL1V1000XX', '2NR1U1234']
  );

  const xe2Id = uuidv4();
  await exec(db,
    `INSERT INTO DXE (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, BIENSO, DDONGXEID, DKHACHHANGID, NAMSANXUAT, MAUXE, SOKHUNG, SOMAY, ODO, NHIENLIEU, MUCNHIENLIEU, PHIENBAN)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, 2019, 'Den', ?, ?, 60000, 'Xang', 50, 'L')`,
    [xe2Id, 'Honda City 50H-678.90', '50H-678.90', dongXe2[0].ID, kh2Id, 'RLH1V1000YY', 'L15Z700012']
  );

  console.log('> Seeded 2 KH + 2 xe');

  /* === Tao TTIEPNHANXE cho 2 xe === */
  const tn1Id = uuidv4();
  await exec(db,
    `INSERT INTO TTIEPNHANXE (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DXEID, DKHACHHANGID, NGAY, DNHANVIENKTVID, YEUCAUKHACH, PHUKIENDETRENKXE, TRANGTHAI)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP, ?, 'Xe co tieng keo, phanh yeu', 'Co 1 tham cao su, 1 binh cuu hoa', 1)`,
    [tn1Id, 'PN001', xe1Id, kh1Id, nv[0].ID]
  );

  const tn2Id = uuidv4();
  await exec(db,
    `INSERT INTO TTIEPNHANXE (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DXEID, DKHACHHANGID, NGAY, DNHANVIENKTVID, YEUCAUKHACH, PHUKIENDETRENKXE, TRANGTHAI)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP, ?, 'Bao duong dinh ky 50k km', 'Tham cao su', 0)`,
    [tn2Id, 'PN002', xe2Id, kh2Id, nv[0].ID]
  );

  console.log('> Seeded 2 phieu tiep nhan');

  /* === Tao TCHANDOAN (chan doan) === */
  const cd1Id = uuidv4();
  await exec(db,
    `INSERT INTO TCHANDOAN (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DXEID, TTIEPNHANXEID, DNHANVIENKTVID, TRIEUCHUNG, NGUYENNHAN, PHUONGXULY, TRANGTHAI)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, 'Phanh yeu, co tieng keu', 'Phanh bi moi, can thay', 'Thay bo phanh truoc', 1)`,
    [cd1Id, 'CD001', xe1Id, tn1Id, nv[0].ID]
  );

  /* === Tao TBAOGIA (bao gia) === */
  const bg1Id = uuidv4();
  await exec(db,
    `INSERT INTO TBAOGIA (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DXEID, DKHACHHANGID, TTIEPNHANXEID, NGAY, TIENHANG, TIENTHUE, TIENGIAMGIA)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)`,
    [bg1Id, 'BG001', xe1Id, kh1Id, tn1Id, 1200000, 100000, 0]
  );

  /* Chi tiet bao gia */
  await exec(db,
    `INSERT INTO TBAOGIACHITIET (ID, NOTE, STATUS, USERCREATEDID, TIMECREATED, TBAOGIAID, DDICHVUID, SOLUONG, DONGIA, THANHTIEN, LOAI, KHACHDUYET)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, 1, ?, ?, 1, 1)`,
    [uuidv4(), 'Can chinh thuoc lai', bg1Id, ctv3[0].ID, 600000, 600000]
  );
  await exec(db,
    `INSERT INTO TBAOGIACHITIET (ID, NOTE, STATUS, USERCREATEDID, TIMECREATED, TBAOGIAID, DDICHVUID, SOLUONG, DONGIA, THANHTIEN, LOAI, KHACHDUYET)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, 1, ?, ?, 1, 1)`,
    [uuidv4(), 'Thay phanh truoc', bg1Id, ctv4[0].ID, 600000, 600000]
  );

  console.log('> Seeded chan doan + bao gia cho xe 1');

  /* === Tao TLENHSUACHUA (lenh sua chua) === */
  const lsc1Id = uuidv4();
  await exec(db,
    `INSERT INTO TLENHSUACHUA (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DXEID, DKHACHHANGID, TTIEPNHANXEID, TBAOGIAID, NGAY, BATDAU, TRANGTHAI, THOIGIAN_DUKIEN)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 240)`,
    [lsc1Id, 'LSC001', xe1Id, kh1Id, tn1Id, bg1Id]
  );

  /* Chi tiet lenh sua chua */
  await exec(db,
    `INSERT INTO TLENHSUACHUACHITIET (ID, NOTE, STATUS, USERCREATEDID, TIMECREATED, TLENHSUACHUAID, DDICHVUID, SOLUONG, DONGIA, THANHTIEN, LOAI, TRANGTHAI)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, 1, ?, ?, 1, 1)`,
    [uuidv4(), 'Can chinh thuoc lai', lsc1Id, ctv3[0].ID, 600000, 600000]
  );
  await exec(db,
    `INSERT INTO TLENHSUACHUACHITIET (ID, NOTE, STATUS, USERCREATEDID, TIMECREATED, TLENHSUACHUAID, DDICHVUID, SOLUONG, DONGIA, THANHTIEN, LOAI, TRANGTHAI)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, 1, ?, ?, 1, 1)`,
    [uuidv4(), 'Thay phanh truoc', lsc1Id, ctv4[0].ID, 600000, 600000]
  );

  console.log('> Seeded lenh sua chua + chi tiet');

  /* === Tao TTRANGTHAIXE cho xe 1 - set TRANGTHAI = 2 (Dang sua) === */
  const tt1Id = uuidv4();
  await exec(db,
    `INSERT INTO TTRANGTHAIXE (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DXEID, DKHACHHANGID, TTIEPNHANXEID, TLENHSUACHUAID, TBAOGIAID, TRANGTHAI, NGAY_VAO, NGAY_TRANGTHAI, NGAY_DUKIEN, DNHANVIENKTVID, MUCUU_TIEN, DCUAHANGID)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, 2, CAST('now' AS TIMESTAMP) - 1, CURRENT_TIMESTAMP, CAST('now' AS TIMESTAMP) + 1, ?, 1, ?)`,
    [tt1Id, 'Workflow xe 51A-123.45', xe1Id, kh1Id, tn1Id, lsc1Id, bg1Id, nv[0].ID, cuaHang[0]?.ID]
  );

  /* Lich su cho xe 1: Tiep nhan & Bao gia -> Xac nhan -> Dang sua */
  const lichSuHistory = [
    { tt_cu: null, tt_moi: 0, stt: 0, lydo: 'Tiep nhan xe va lap bao gia', ngay_expr: "CAST('now' AS TIMESTAMP) - 1" },
    { tt_cu: 0,    tt_moi: 1, stt: 1, lydo: 'Khach hang xac nhan sua chua', ngay_expr: "CAST('now' AS TIMESTAMP) - 1" },
    { tt_cu: 1,    tt_moi: 2, stt: 2, lydo: 'Bat dau sua chua', ngay_expr: "CURRENT_TIMESTAMP" },
  ];

  for (const ls of lichSuHistory) {
    await exec(db,
      `INSERT INTO TLICHSUTRANGTHAI (ID, STATUS, USERCREATEDID, TIMECREATED, TTRANGTHAIXEID, DXEID, TRANGTHAI_CU, TRANGTHAI_MOI, NGAY, DNHANVIENID, LYDO, STT)
       VALUES (?, 1, 'SYSTEM', ${ls.ngay_expr}, ?, ?, ?, ?, ${ls.ngay_expr}, ?, ?, ?)`,
      [uuidv4(), tt1Id, xe1Id, ls.tt_cu, ls.tt_moi, nv[0].ID, ls.lydo, ls.stt]
    );
  }

  console.log('> Seeded workflow xe 1 (dang sua, stt=4) voi 5 lich su');

  /* === Xe 2: moi tiep nhan (stt=0) === */
  const tt2Id = uuidv4();
  await exec(db,
    `INSERT INTO TTRANGTHAIXE (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DXEID, DKHACHHANGID, TTIEPNHANXEID, TRANGTHAI, NGAY_VAO, NGAY_TRANGTHAI, NGAY_DUKIEN, DNHANVIENKTVID, MUCUU_TIEN, DCUAHANGID)
     VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CAST('now' AS TIMESTAMP) + 1, ?, 1, ?)`,
    [tt2Id, 'Workflow xe 50H-678.90', xe2Id, kh2Id, tn2Id, nv[0].ID, cuaHang[0]?.ID]
  );

  await exec(db,
    `INSERT INTO TLICHSUTRANGTHAI (ID, STATUS, USERCREATEDID, TIMECREATED, TTRANGTHAIXEID, DXEID, TRANGTHAI_CU, TRANGTHAI_MOI, NGAY, DNHANVIENID, LYDO, STT)
     VALUES (?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, NULL, 0, CURRENT_TIMESTAMP, ?, ?, 0)`,
    [uuidv4(), tt2Id, xe2Id, nv[0].ID, 'Tiep nhan xe bao duong dinh ky']
  );

  console.log('> Seeded workflow xe 2 (moi tiep nhan, stt=0)');

  /* === Xe 1 Phu tung phu tro === */
  if (mathang.length > 0) {
    const pt1Id = uuidv4();
    await exec(db,
      `INSERT INTO DMATHANG (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, CODE, GIABAN, GIABAN2, GIABAN3, GIABAN4, GIANHAP, TONTOITHIEU, TONTOIDA, DHANGSANXUATID)
       VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, 10, 100, ?)`,
      [pt1Id, 'Loc dau dong co Toyota Vios', 'Loc dau chinh hang', 'PT001', 250000, 250000, 200000, 200000, 200000, hsx[0].ID]
    );

    const pt2Id = uuidv4();
    await exec(db,
      `INSERT INTO DMATHANG (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, CODE, GIABAN, GIABAN2, GIABAN3, GIABAN4, GIANHAP, TONTOITHIEU, TONTOIDA, DHANGSANXUATID)
       VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, 5, 50, ?)`,
      [pt2Id, 'Bo phanh truoc Vios', 'Bo phanh truoc, chinh hang', 'PT002', 600000, 600000, 450000, 450000, 450000, hsx[0].ID]
    );

    /* Xuat phu tu cho xe 1 - insert truc tiep vao TXUATPHUTUNG */
    const xpt1Id = uuidv4();
    await exec(db,
      `INSERT INTO TXUATPHUTUNG (ID, NOTE, STATUS, USERCREATEDID, TIMECREATED, TLENHSUACHUAID, DXEID, DMATHANGID, DKHOHANGID, DNHANVIENID, SOLUONG, DONGIA, THANHTIEN, NGAYXUAT)
       VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP)`,
      [xpt1Id, 'Xuat phanh truoc cho xe 1', lsc1Id, xe1Id, pt2Id, khoChinh[0].ID, nv[0].ID, 600000, 600000]
    );

    console.log('> Seeded 2 phu tung + 1 phieu xuat');
  }

  console.log('\n=== SEED WORKFLOW DONE ===');
  db.detach();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
