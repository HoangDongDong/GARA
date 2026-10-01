const db = require('./src/db');

const u = db.uuidv4;
const now = () => 'CURRENT_TIMESTAMP';

async function seed() {
  // ---- Hang xe ----
  const hxIds = {};
  const brands = ['Toyota','Honda','Mazda','Hyundai','Ford','Kia'];
  for (const n of brands) {
    const id = u();
    hxIds[n] = id;
    await db.execute(
      `INSERT INTO DHANGXE (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, SORTORDER)
       VALUES (?, ?, 1, 'SYSTEM', ${now()}, ?)`,
      [id, n, n]
    );
  }
  console.log('> Seeded', brands.length, 'hang xe');

  // ---- Dong xe ----
  const dxIds = {};
  const models = [
    ['Vios','Toyota'],['Innova','Toyota'],['Camry','Toyota'],
    ['City','Honda'],['Civic','Honda'],['CR-V','Honda'],
    ['CX-5','Mazda'],['Mazda3','Mazda'],
    ['Accent','Hyundai'],['Tucson','Hyundai'],
    ['Ranger','Ford'],['Everest','Ford'],
    ['Morning','Kia'],['Cerato','Kia'],
  ];
  for (const [name, brand] of models) {
    const id = u();
    dxIds[name] = id;
    await db.execute(
      `INSERT INTO DDONGXE (ID, NAME, DHANGXEID, STATUS, USERCREATEDID, TIMECREATED, SORTORDER)
       VALUES (?, ?, ?, 1, 'SYSTEM', ${now()}, ?)`,
      [id, name, hxIds[brand], name]
    );
  }
  console.log('> Seeded', models.length, 'dong xe');

  // ---- Khach hang ----
  const khIds = [];
  const kh = [
    ['KH001','Nguyen Van A','0901234567','a@gmail.com','12 Le Loi, Q1, HCM','0312456789'],
    ['KH002','Tran Thi B','0912345678','b@gmail.com','45 Nguyen Hue, Q1, HCM','0312345678'],
    ['KH003','Le Van C','0923456789','c@gmail.com','78 Tran Hung Dao, HN','0313456789'],
    ['KH004','Pham Thi D','0934567890','d@gmail.com','99 Cach Mang Thang 8, Q3, HCM',''],
    ['KH005','Hoang Van E','0945678901','e@gmail.com','15 Phan Xich Long, Binh Thanh, HCM',''],
  ];
  for (const [ma, name, phone, email, addr, mst] of kh) {
    const id = u();
    khIds.push(id);
    await db.execute(
      `INSERT INTO DKHACHHANG (ID, NAME, MAKHACH, DIENTHOAI, EMAIL, DIACHI, MASOTHUE,
                              STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'SYSTEM', ${now()})`,
      [id, name, ma, phone, email, addr, mst]
    );
  }
  console.log('> Seeded', kh.length, 'khach hang');

  // ---- Xe ----
  const xeIds = [];
  const xe = [
    ['51A-12345','Vios',   'Toyota','2018','Trang', 'VIN001', khIds[0]],
    ['51A-67890','City',   'Honda', '2020','Den',   'VIN002', khIds[0]],
    ['30B-11111','CX-5',   'Mazda', '2022','Do',    'VIN003', khIds[1]],
    ['30B-22222','Accent', 'Hyundai','2019','Bac',   'VIN004', khIds[2]],
    ['43C-33333','Ranger', 'Ford',  '2021','Xanh',  'VIN005', khIds[3]],
    ['43C-44444','Morning','Kia',   '2017','Vang',  'VIN006', khIds[4]],
    ['60D-55555','Innova', 'Toyota','2023','Bac',   'VIN007', khIds[1]],
  ];
  for (const [bs, model, brand, year, color, vin, khId] of xe) {
    const id = u();
    xeIds.push(id);
    await db.execute(
      `INSERT INTO DXE (ID, NAME, BIENSO, DHANGXEID, DDONGXEID, PHIENBAN,
                        NAMSANXUAT, MAUXE, SOKHUNG, SOMAY, ODO, NHIENLIEU,
                        DKHACHHANGID, STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'SYSTEM', ${now()})`,
      [id, bs, bs, hxIds[brand], dxIds[model], 'Standard',
       year, color, vin, 'ENG' + bs.replace(/[^0-9]/g,''), 50000 + Math.floor(Math.random()*100000),
       'Xang', khId]
    );
  }
  console.log('> Seeded', xe.length, 'xe');

  // ---- Nhan vien ----
  const nvIds = [];
  const nv = [
    ['NV001','Nguyen Ky Thuat',  '0901111222','Q1 HCM', 'May',     1, 300000, 8000000],
    ['NV002','Tran Co Van',      '0902222333','Q3 HCM', 'Dien',    2, 0,     12000000],
    ['NV003','Le Thu Kho',       '0903333444','Binh Thanh','Kho',  3, 250000, 7000000],
    ['NV004','Pham Thu Ngan',    '0904444555','Tan Binh','Ngan',   4, 0,     9000000],
    ['NV005','Hoang Ky Thuat 2', '0905555666','Q1 HCM', 'Gam',     1, 280000, 8500000],
    ['NV006','Vu Lao Tiep',      '0906666777','Q7 HCM', 'Tong',    0, 200000, 6000000],
  ];
  for (const [code, name, phone, addr, cm, loai, luongca, luongthang] of nv) {
    const id = u();
    nvIds.push(id);
    await db.execute(
      `INSERT INTO DNHANVIEN (ID, NAME, CODE, DIENTHOAI, DIACHI, CHUYENMON,
                              LOAINHANVIEN, LUONGCA, LUONGTHANG, CACHTINHLUONG,
                              STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 'SYSTEM', ${now()})`,
      [id, name, code, phone, addr, cm, loai, luongca, luongthang]
    );
  }
  console.log('> Seeded', nv.length, 'nhan vien');

  // ---- Hang SX (phu tung) ----
  const hsxIds = {};
  const hsx = ['Bosch','Denso','NGK','Toyota Genuine','Honda Genuine','Mazda Genuine'];
  for (const n of hsx) {
    const id = u();
    hsxIds[n] = id;
    await db.execute(
      `INSERT INTO DHANGSANXUAT (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, SORTORDER)
       VALUES (?, ?, 1, 'SYSTEM', ${now()}, ?)`,
      [id, n, n]
    );
  }

  // ---- Vi tri kho ----
  const vtIds = {};
  const vt = ['Kho A1','Kho A2','Kho B1','Kho B2','Kho C','Ke Trung Bay'];
  for (const n of vt) {
    const id = u();
    vtIds[n] = id;
    await db.execute(
      `INSERT INTO DVITRIKHO (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, SORTORDER)
       VALUES (?, ?, 1, 'SYSTEM', ${now()}, ?)`,
      [id, n, n]
    );
  }

  // ---- Don vi tinh ----
  const dvtIds = {};
  const dvt = ['Cai','Bo','Chiec','Lit','Kg','Hop'];
  for (const n of dvt) {
    const id = u();
    dvtIds[n] = id;
    await db.execute(
      `INSERT INTO DDONVITINH (ID, NAME, CODE, STATUS, USERCREATEDID, TIMECREATED, SORTORDER)
       VALUES (?, ?, ?, 1, 'SYSTEM', ${now()}, ?)`,
      [id, n, n.toUpperCase(), n]
    );
  }

  // ---- Phu tung ----
  const pt = [
    ['PT001','Loc gio dieu hoa',      'Cai',  50000,  90000,  'Bosch',      'Kho A1', '12 thang'],
    ['PT002','Loc gio dong co',       'Cai',  80000,  150000, 'Bosch',      'Kho A1', '12 thang'],
    ['PT003','Bugi (cay)',            'Cai',  60000,  120000, 'NGK',        'Kho A2', '24 thang'],
    ['PT004','Day cua roa',           'Bo',   120000, 220000, 'Toyota Genuine','Kho B1','12 thang'],
    ['PT005','Bo phanh truoc',        'Bo',   350000, 580000, 'Denso',      'Kho B1', '12 thang'],
    ['PT006','Day an toai',           'Bo',   800000, 1200000,'Honda Genuine','Kho B2','24 thang'],
    ['PT007','Nhot dong co 5W-30',    'Lit',  120000, 200000, 'Toyota Genuine','Kho C','12 thang'],
    ['PT008','Ac quy 12V 60Ah',       'Cai',  1500000,2200000,'Denso',     'Kho C',  '18 thang'],
    ['PT009','Den pha LED',           'Cai',  1800000,2500000,'Mazda Genuine','Ke Trung Bay','24 thang'],
    ['PT010','Gat mua',               'Bo',   180000, 280000, 'Bosch',      'Ke Trung Bay','6 thang'],
  ];
  for (const [code, name, dvt, gianhap, giaban, hang, vitri, bh] of pt) {
    const id = u();
    await db.execute(
      `INSERT INTO DMATHANG (ID, NAME, CODE, GIANHAP, GIABAN, GIABAN2,
                            DHANGSANXUATID, DVITRIKHOID, DDONVITINHID,
                            BAOHANH, TONTOITHIEU, TONTOIDA, BARCODE,
                            STATUS, TAMKHOA, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5, 100, ?, 1, 0, 'SYSTEM', ${now()})`,
      [id, name, code, gianhap, giaban, giaban*0.9, hsxIds[hang], vtIds[vitri],
       dvtIds[dvt], bh, code.replace('PT','')]
    );
  }
  console.log('> Seeded', pt.length, 'phu tung');

  // ---- Phieu tiep nhan xe ----
  const tnIds = [];
  for (let i = 0; i < 5; i++) {
    const id = u();
    tnIds.push(id);
    await db.execute(
      `INSERT INTO TTIEPNHANXE (ID, NAME, NGAY, DXEID, DKHACHHANGID,
                                DNHANVIENCOOVANID, DNHANVIENKTVID, ODO,
                                TINHTRANGXE, YEUCAUKHACH, PHUKIENDETRENKXE,
                                TRANGTHAI, STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ${now()}, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 'SYSTEM', ${now()})`,
      [
        id,
        'TN' + (Date.now() + i).toString().slice(-8),
        xeIds[i], khIds[i], nvIds[1], nvIds[0],
        50000 + i*3000,
        'Xe bi hu` bo` phanh, khoi dong kho',
        'Khach yeu cau kiem tra tong the',
        '01 bong den LED treo tren xe',
      ]
    );
  }
  console.log('> Seeded', tnIds.length, 'phieu tiep nhan');

  // ---- Lenh sua chua + chi tiet ----
  for (let i = 0; i < 3; i++) {
    const id = u();
    const tienCong = 500000 + i*200000;
    const tienPT = 350000 + i*150000;
    const tong = tienCong + tienPT;
    await db.execute(
      `INSERT INTO TLENHSUACHUA (ID, NAME, NGAY, DXEID, DKHACHHANGID,
                                 TTIEPNHANXEID, TONGTIENCONG, TONGTIENPHUTUNG,
                                 TONGCONG, TRANGTHAI, STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ${now()}, ?, ?, ?, ?, ?, ?, ?, 1, 'SYSTEM', ${now()})`,
      [
        id,
        'LSC' + (Date.now() + i).toString().slice(-8),
        xeIds[i], khIds[i], tnIds[i],
        tienCong, tienPT, tong,
        i === 0 ? 1 : (i === 1 ? 3 : 0),
      ]
    );
    // 2 detail rows
    await db.execute(
      `INSERT INTO TLENHSUACHUACHITIET (ID, TLENHSUACHUAID, DMATHANGID, SOLUONG,
                                        DONGIA, THANHTIEN, LOAI, TRANGTHAI,
                                        STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, 1, 90000, 90000, 0, 2, 1, 'SYSTEM', ${now()})`,
      [u(), id, null]
    );
    await db.execute(
      `INSERT INTO TLENHSUACHUACHITIET (ID, TLENHSUACHUAID, DMATHANGID, SOLUONG,
                                        DONGIA, THANHTIEN, LOAI, TRANGTHAI,
                                        STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ?, 1, ?, ?, 1, 2, 1, 'SYSTEM', ${now()})`,
      [u(), id, null, tienCong, tienCong]
    );
  }
  console.log('> Seeded 3 lenh sua chua + 6 chi tiet');

  // ---- Hoa don ----
  for (let i = 0; i < 2; i++) {
    const id = u();
    const tienPT = 350000 + i*150000;
    const tienCong = 500000 + i*200000;
    const tongTruocGiam = tienPT + tienCong;
    const tienThue = Math.round(tongTruocGiam * 0.1);
    const tongCong = tongTruocGiam + tienThue;
    const daTT = i === 0 ? 1 : 0;
    await db.execute(
      `INSERT INTO THOADONSUACHUA (ID, NAME, NGAY, DXEID, DKHACHHANGID,
                                   TIENPHUTUNG, TIENCONG, TIENTHUE, TONGCONG,
                                   CONLAI, TIENMAT, DATHANHTOAN,
                                   STATUS, USERCREATEDID, TIMECREATED)
       VALUES (?, ?, ${now()}, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'SYSTEM', ${now()})`,
      [
        id,
        'HD' + (Date.now() + i).toString().slice(-8),
        xeIds[i], khIds[i],
        tienPT, tienCong, tienThue, tongCong,
        daTT ? 0 : tongCong,
        daTT ? tongCong : 0,
        daTT,
      ]
    );
  }
  console.log('> Seeded 2 hoa don');

  console.log('\n=== SEED HOAN TAT ===');
}

seed().then(() => process.exit(0)).catch((e) => { console.error('ERR:', e.message); process.exit(1); });