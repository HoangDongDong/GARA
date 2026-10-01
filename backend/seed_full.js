/**
 * Seed toan bo du lieu mau cho GARAGE.FDB
 * Chay mot lan de co du lieu demo cho cac trang frontend.
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
  const u = uuidv4;

  try {
    /* ==== 1. DCUAHANG ==== */
    const chk1 = await exec(db, `SELECT COUNT(*) C FROM DCUAHANG`, []);
    if (chk1[0].C === 0) {
      const id = u();
      await exec(db, `INSERT INTO DCUAHANG (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DIACHI, DIENTHOAI, CODE) VALUES (?, 'KAZUKO AUTO', 1, 'SYSTEM', CURRENT_TIMESTAMP, '925/15 Au Co, Tan Son Nhi, TP.HCM', '0917664444', 'KAZUKO')`, [id]);
      console.log('> Seeded DCUAHANG: 1 row');
    } else {
      console.log('> DCUAHANG already has data, skip');
    }

    /* ==== 2. DKHOHANG ==== */
    const chk2 = await exec(db, `SELECT COUNT(*) C FROM DKHOHANG`, []);
    if (chk2[0].C === 0) {
      const khos = [
        { name: 'Kho chinh', note: 'Kho phu tung chinh' },
        { name: 'Kho phu tung', note: 'Phu tung thay the' },
        { name: 'Kho dau nhot', note: 'Dau nhot, hoa chat' },
        { name: 'Kho loi bao hanh', note: 'Hang loi/bao hanh' },
      ];
      for (const k of khos) {
        await exec(db, `INSERT INTO DKHOHANG (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, SORTORDER, CHOPHEPAMKHO) VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, 0)`, [u(), k.name, k.note, k.name]);
      }
      console.log('> Seeded DKHOHANG:', khos.length);
    }

    /* ==== 3. DVITRIKHO ==== */
    const chk3 = await exec(db, `SELECT COUNT(*) C FROM DVITRIKHO`, []);
    if (chk3[0].C === 0) {
      const vtris = ['Kho A1','Kho A2','Kho B1','Kho B2','Kho C','Ke Trung Bay'];
      for (const vt of vtris) {
        await exec(db, `INSERT INTO DVITRIKHO (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, SORTORDER) VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?)`, [u(), vt, vt, vt]);
      }
      console.log('> Seeded DVITRIKHO:', vtris.length);
    }

    /* ==== 4. DDONVITINH ==== */
    const chk4 = await exec(db, `SELECT COUNT(*) C FROM DDONVITINH`, []);
    if (chk4[0].C === 0) {
      const dvts = ['Cai','Bo','Chiec','Lit','Kg','Hop','Cay','Thung'];
      for (const dvt of dvts) {
        await exec(db, `INSERT INTO DDONVITINH (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, SORTORDER) VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?)`, [u(), dvt, dvt, dvt]);
      }
      console.log('> Seeded DDONVITINH:', dvts.length);
    }

    /* ==== 5. DHANGSANXUAT ==== */
    const chk5 = await exec(db, `SELECT COUNT(*) C FROM DHANGSANXUAT`, []);
    if (chk5[0].C === 0) {
      const hsxs = ['Bosch','Denso','NGK','Toyota Genuine','Honda Genuine','Mazda Genuine','GS','Michelin'];
      for (const h of hsxs) {
        await exec(db, `INSERT INTO DHANGSANXUAT (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, SORTORDER) VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?)`, [u(), h, h, h]);
      }
      console.log('> Seeded DHANGSANXUAT:', hsxs.length);
    }

    /* ==== 6. DNHOMMATHANG ==== */
    const chk6 = await exec(db, `SELECT COUNT(*) C FROM DNHOMMATHANG`, []);
    if (chk6[0].C === 0) {
      const nhoms = [
        { name: 'Phu tung dong co', coban: 1, cotonkho: 1 },
        { name: 'Phu tung gam', coban: 1, cotonkho: 1 },
        { name: 'Phu tung dien', coban: 1, cotonkho: 1 },
        { name: 'Dau nhot - hoa chat', coban: 1, cotonkho: 1 },
        { name: 'Lop - ac quy', coban: 1, cotonkho: 1 },
        { name: 'Phu kien trang tri', coban: 0, cotonkho: 0 },
      ];
      for (const n of nhoms) {
        await exec(db, `INSERT INTO DNHOMMATHANG (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, SORTORDER) VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?)`, [u(), n.name, n.name, n.name]);
      }
      console.log('> Seeded DNHOMMATHANG:', nhoms.length);
    }

    /* ==== 7. DLOAIDICHVU ==== */
    const chk7 = await exec(db, `SELECT COUNT(*) C FROM DLOAIDICHVU`, []);
    if (chk7[0].C === 0) {
      const loais = ['Bao duong dinh ky', 'Sua chua dong co', 'Sua chua gam', 'Sua chua dien', 'Dong son', 'Noi that', 'Chan doan loi'];
      for (const l of loais) {
        await exec(db, `INSERT INTO DLOAIDICHVU (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, SORTORDER) VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?)`, [u(), l, l, l]);
      }
      console.log('> Seeded DLOAIDICHVU:', loais.length);
    }

    /* ==== 8. DDICHVU ==== */
    const chk8 = await exec(db, `SELECT COUNT(*) C FROM DDICHVU`, []);
    if (chk8[0].C === 0) {
      const loaiRows = await exec(db, `SELECT ID, NAME FROM DLOAIDICHVU WHERE STATUS = 1`, []);
      const loaiMap = {};
      for (const r of loaiRows) loaiMap[r.NAME] = r.ID;

      const dichvus = [
        { name: 'Thay dau',                       code: 'DV001', gia: 250000,  tg: 30,  loai: 'Bao duong dinh ky' },
        { name: 'Thay loc dau',                   code: 'DV002', gia: 100000,  tg: 15,  loai: 'Bao duong dinh ky' },
        { name: 'Thay loc gio dong co',           code: 'DV003', gia: 150000,  tg: 20,  loai: 'Bao duong dinh ky' },
        { name: 'Thay bugi',                      code: 'DV004', gia: 200000,  tg: 30,  loai: 'Bao duong dinh ky' },
        { name: 'Dai tu dong co',                 code: 'DV005', gia: 5000000, tg: 480, loai: 'Sua chua dong co' },
        { name: 'Chan doan loi bang may',         code: 'DV006', gia: 500000,  tg: 60,  loai: 'Chan doan loi' },
        { name: 'Can chinh thuoc lai',            code: 'DV007', gia: 600000,  tg: 90,  loai: 'Sua chua gam' },
        { name: 'Thay phanh truoc',               code: 'DV008', gia: 800000,  tg: 120, loai: 'Sua chua gam' },
        { name: 'Thay ac quy',                    code: 'DV009', gia: 200000,  tg: 20,  loai: 'Sua chua dien' },
        { name: 'Son va phuc hoi than vo',        code: 'DV010', gia: 3500000, tg: 720, loai: 'Dong son' },
        { name: 'Ve sinh dieu hoa',               code: 'DV011', gia: 300000,  tg: 60,  loai: 'Noi that' },
        { name: 'Kiem tra tong the 50 diem',      code: 'DV012', gia: 350000,  tg: 45,  loai: 'Bao duong dinh ky' },
      ];
      for (const d of dichvus) {
        await exec(db,
          `INSERT INTO DDICHVU (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, SORTORDER, DLOAIDICHVUID, GIA, THOIGIAN)
           VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?)`,
          [u(), d.name, d.name, d.name, loaiMap[d.loai] || null, d.gia, d.tg]
        );
      }
      console.log('> Seeded DDICHVU:', dichvus.length);
    }

    /* ==== 9. DNHOMNHACUNGCAP + DNHACUNGCAP ==== */
    const chk9 = await exec(db, `SELECT COUNT(*) C FROM DNHACUNGCAP`, []);
    if (chk9[0].C === 0) {
      const nhomNCC = { id: u(), name: 'NCC phu tung o to VN' };
      await exec(db, `INSERT INTO DNHOMNHACUNGCAP (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, SORTORDER) VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?)`, [nhomNCC.id, nhomNCC.name, nhomNCC.name]);

      const nccs = [
        { ma: 'NCC001', name: 'Cong ty TNHH Phu Tung O To An Phat',   phone: '02838123456', email: 'anphat@gmail.com',    address: 'Quan 5, TP.HCM' },
        { ma: 'NCC002', name: 'Cong ty TNHH Vat Tu O To Minh Long',   phone: '02838456789', email: 'minhlong@gmail.com',  address: 'Quan Tan Binh, TP.HCM' },
        { ma: 'NCC003', name: 'Cong ty Co phan Phu Tung Sai Gon',      phone: '02838789012', email: 'saigonpt@gmail.com',  address: 'Quan 1, TP.HCM' },
        { ma: 'NCC004', name: 'Cong ty TNHH Kim Thanh',                phone: '02838901234', email: 'kimthanh@gmail.com',  address: 'Binh Thanh, TP.HCM' },
        { ma: 'NCC005', name: 'Cong ty TNHH Takata Viet Nam',          phone: '02838111222', email: 'takata@gmail.com',    address: 'KCN Tan Thuan, Q7' },
      ];
      for (const n of nccs) {
        await exec(db,
          `INSERT INTO DNHACUNGCAP (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, DNHOMNHACUNGCAPID, MANHACUNGCAP, DIACHI, DIENTHOAI, EMAIL)
           VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)`,
          [u(), n.name, nhomNCC.id, n.ma, n.address, n.phone, n.email]
        );
      }
      console.log('> Seeded DNHACUNGCAP:', nccs.length);
    }

    /* ==== 10. DNHOMKHACHHANG ==== */
    const chk10 = await exec(db, `SELECT COUNT(*) C FROM DNHOMKHACHHANG`, []);
    if (chk10[0].C === 0) {
      const nhoms = [
        { name: 'Khach le',     tile: 0, diem: 0 },
        { name: 'Khach VIP',    tile: 5, diem: 1 },
        { name: 'Doanh nghiep', tile: 3, diem: 0 },
      ];
      for (const n of nhoms) {
        await exec(db,
          `INSERT INTO DNHOMKHACHHANG (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, SORTORDER, TILEGIAMGIA, DIEMTICHLUY)
           VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?)`,
          [u(), n.name, n.name, n.tile, n.diem]
        );
      }
      console.log('> Seeded DNHOMKHACHHANG:', nhoms.length);
    }

    /* ==== 11. DCALAMVIEC ==== */
    const chk11 = await exec(db, `SELECT COUNT(*) C FROM DCALAMVIEC`, []);
    if (chk11[0].C === 0) {
      const calam = [
        { name: 'Ca sang',  start: '2025-01-01 08:00:00', end: '2025-01-01 12:00:00' },
        { name: 'Ca chieu', start: '2025-01-01 13:00:00', end: '2025-01-01 17:30:00' },
        { name: 'Ca toi',   start: '2025-01-01 18:00:00', end: '2025-01-01 21:00:00' },
      ];
      for (const c of calam) {
        await exec(db,
          `INSERT INTO DCALAMVIEC (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, GIOBATDAU, GIOKETTHUC)
           VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?)`,
          [u(), c.name, c.start, c.end]
        );
      }
      console.log('> Seeded DCALAMVIEC:', calam.length);
    }

    /* ==== 12. DTAIKHOANNGANHANG ==== */
    const chk12 = await exec(db, `SELECT COUNT(*) C FROM DTAIKHOANNGANHANG`, []);
    if (chk12[0].C === 0) {
      const tks = [
        { name: 'TK VCB chinh',      stk: '0071001234567', bank: 'Vietcombank', cn: 'TP.HCM' },
        { name: 'TK Techcombank',    stk: '19031234567890', bank: 'Techcombank', cn: 'TP.HCM' },
        { name: 'TK ACB',            stk: '123456789', bank: 'ACB', cn: 'TP.HCM' },
      ];
      for (const t of tks) {
        await exec(db,
          `INSERT INTO DTAIKHOANNGANHANG (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, SOTAIKHOAN, TENNGANHANG, CHINHANH)
           VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?, ?)`,
          [u(), t.name, t.stk, t.bank, t.cn]
        );
      }
      console.log('> Seeded DTAIKHOANNGANHANG:', tks.length);
    }

    /* ==== 13. DLYDOTHUCHI ==== */
    const chk13 = await exec(db, `SELECT COUNT(*) C FROM DLYDOTHUCHI`, []);
    if (chk13[0].C === 0) {
      const lys = [
        { name: 'Thu tu khach hang',      loai: 0 },
        { name: 'Thu no NCC',             loai: 0 },
        { name: 'Thu khac',               loai: 0 },
        { name: 'Chi nhap hang',          loai: 1 },
        { name: 'Chi luong nhan vien',   loai: 1 },
        { name: 'Chi dien nuoc',          loai: 1 },
        { name: 'Chi phi khac',           loai: 1 },
      ];
      for (const l of lys) {
        await exec(db,
          `INSERT INTO DLYDOTHUCHI (ID, NAME, STATUS, USERCREATEDID, TIMECREATED, LOAI)
           VALUES (?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?)`,
          [u(), l.name, l.loai]
        );
      }
      console.log('> Seeded DLYDOTHUCHI:', lys.length);
    }

    /* ==== 14. DHANGXE ==== */
    const chk14 = await exec(db, `SELECT COUNT(*) C FROM DHANGXE`, []);
    if (chk14[0].C === 0) {
      const brands = ['Toyota','Honda','Mazda','Hyundai','Ford','Kia','VinFast','Mercedes','BMW','Lexus'];
      const brandIds = {};
      for (const b of brands) {
        const id = u();
        brandIds[b] = id;
        await exec(db,
          `INSERT INTO DHANGXE (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, SORTORDER)
           VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?)`,
          [id, b, b, b]
        );
      }
      console.log('> Seeded DHANGXE:', brands.length);

      /* ==== 15. DDONGXE ==== */
      const models = [
        { name: 'Vios',     brand: 'Toyota'  },
        { name: 'Innova',   brand: 'Toyota'  },
        { name: 'Camry',    brand: 'Toyota'  },
        { name: 'Fortuner', brand: 'Toyota'  },
        { name: 'Corolla',  brand: 'Toyota'  },
        { name: 'City',     brand: 'Honda'   },
        { name: 'Civic',    brand: 'Honda'   },
        { name: 'CR-V',     brand: 'Honda'   },
        { name: 'HR-V',     brand: 'Honda'   },
        { name: 'CX-5',     brand: 'Mazda'   },
        { name: 'Mazda3',   brand: 'Mazda'   },
        { name: 'CX-8',     brand: 'Mazda'   },
        { name: 'Accent',   brand: 'Hyundai' },
        { name: 'Tucson',   brand: 'Hyundai' },
        { name: 'Santafe',  brand: 'Hyundai' },
        { name: 'Ranger',   brand: 'Ford'    },
        { name: 'Everest',  brand: 'Ford'    },
        { name: 'Morning',  brand: 'Kia'     },
        { name: 'Cerato',   brand: 'Kia'     },
        { name: 'Seltos',   brand: 'Kia'     },
        { name: 'VF8',      brand: 'VinFast' },
        { name: 'VF9',      brand: 'VinFast' },
        { name: 'C-Class',  brand: 'Mercedes'},
        { name: '3 Series', brand: 'BMW'     },
        { name: 'RX',       brand: 'Lexus'   },
      ];
      for (const m of models) {
        await exec(db,
          `INSERT INTO DDONGXE (ID, NAME, NOTE, STATUS, USERCREATEDID, TIMECREATED, SORTORDER, DHANGXEID)
           VALUES (?, ?, ?, 1, 'SYSTEM', CURRENT_TIMESTAMP, ?, ?)`,
          [u(), m.name, m.name, m.name, brandIds[m.brand]]
        );
      }
      console.log('> Seeded DDONGXE:', models.length);
    }

    console.log('\n=== SEED FULL DONE ===');
  } catch (e) {
    console.error('FAIL:', e.message);
  } finally {
    db.detach();
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
