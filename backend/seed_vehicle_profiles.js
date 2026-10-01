/* eslint-disable no-console */
require('os').userInfo = () => ({ username: 'acer' });

const db = require('./src/db');

const CREATED_BY = 'SEED_HOSOXE';
const REPAIR_COUNT_PER_VEHICLE = 3;

function dateDaysAgo(days, hour = 9) {
  const value = new Date();
  value.setHours(hour, 0, 0, 0);
  value.setDate(value.getDate() - days);
  return value;
}

function plateKey(plate) {
  return String(plate || 'XE').replace(/[^0-9A-Z]/gi, '').toUpperCase();
}

async function seed() {
  const summary = await db.transaction(async (query, execute, uuidv4) => {
    const vehicles = await query(`
      SELECT FIRST 7 V.ID, V.BIENSO, V.ODO, V.DKHACHHANGID
        FROM DXE V
        JOIN DKHACHHANG KH ON KH.ID = V.DKHACHHANGID
       WHERE V.STATUS = 1 AND KH.STATUS = 1
       ORDER BY V.TIMECREATED, V.ID
    `);
    const services = await query(`
      SELECT FIRST 8 ID, NAME, COALESCE(GIA, 0) AS GIA
        FROM DDICHVU
       WHERE STATUS = 1 AND COALESCE(GIA, 0) > 0
       ORDER BY CODE, NAME
    `);
    const parts = await query(`
      SELECT FIRST 8 ID, NAME, CODE, DDONVITINHID,
             COALESCE(GIABAN, 0) AS GIABAN, COALESCE(GIANHAP, 0) AS GIANHAP,
             COALESCE(BAOHANH, 6) AS BAOHANH
        FROM DMATHANG
       WHERE STATUS = 1 AND COALESCE(GIABAN, 0) > 0
       ORDER BY CODE, NAME
    `);
    const employees = await query(`
      SELECT FIRST 4 ID, NAME
        FROM DNHANVIEN
       WHERE STATUS = 1
       ORDER BY TIMECREATED, ID
    `);
    const warehouses = await query(`SELECT FIRST 1 ID FROM DKHOHANG WHERE STATUS=1 ORDER BY NAME`);
    const stores = await query(`SELECT FIRST 1 ID FROM DCUAHANG WHERE STATUS=1 ORDER BY NAME`);

    if (!vehicles.length || !services.length || !parts.length) {
      throw new Error('Khong du xe, dich vu hoac mat hang de tao du lieu lien ket');
    }

    const warehouseId = warehouses[0]?.ID || null;
    const storeId = stores[0]?.ID || null;
    const advisorId = employees[0]?.ID || null;
    const technicianId = employees[1]?.ID || employees[0]?.ID || null;
    const stats = { vehicles: vehicles.length, receptions: 0, repairs: 0, details: 0, issues: 0, warranties: 0, media: 0, skipped: 0 };

    for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex += 1) {
      const vehicle = vehicles[vehicleIndex];
      const key = plateKey(vehicle.BIENSO);

      for (let visitIndex = 0; visitIndex < REPAIR_COUNT_PER_VEHICLE; visitIndex += 1) {
        const repairName = `SC-HSX-${key}-${visitIndex + 1}`;
        const existing = await query(
          `SELECT FIRST 1 ID FROM TLENHSUACHUA WHERE NAME = ? AND STATUS = 1`,
          [repairName]
        );
        if (existing.length) {
          stats.skipped += 1;
          continue;
        }

        const receptionId = uuidv4();
        const repairId = uuidv4();
        const service = services[(vehicleIndex + visitIndex) % services.length];
        const part = parts[(vehicleIndex * 2 + visitIndex) % parts.length];
        const serviceQty = 1;
        const partQty = visitIndex === 2 && part.CODE === 'PT003' ? 4 : 1;
        const servicePrice = Number(service.GIA || 0);
        const partPrice = Number(part.GIABAN || 0);
        const laborTotal = serviceQty * servicePrice;
        const partsTotal = partQty * partPrice;
        const total = laborTotal + partsTotal;
        const visitDate = dateDaysAgo((vehicleIndex * 11) + (visitIndex * 47) + 4, 8 + visitIndex);
        const finishDate = new Date(visitDate.getTime() + (2 + visitIndex) * 60 * 60 * 1000);
        const odo = Math.max(0, Number(vehicle.ODO || 0) - ((visitIndex + 1) * 3200));
        const receptionName = `TN-HSX-${key}-${visitIndex + 1}`;

        await execute(`
          INSERT INTO TTIEPNHANXE
            (ID, NAME, NGAY, DXEID, DKHACHHANGID, DNHANVIENCOOVANID,
             DNHANVIENKTVID, ODO, MUCNHIENLIEU, TINHTRANGXE, YEUCAUKHACH,
             PHUKIENDETRENKXE, TRANGTHAI, DCUAHANGID,
             STATUS, USERCREATEDID, TIMECREATED)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
        `, [
          receptionId, receptionName, visitDate, vehicle.ID, vehicle.DKHACHHANGID,
          advisorId, technicianId, odo, 50 + (visitIndex * 15),
          visitIndex === 0 ? 'Xe hoat dong binh thuong, can bao duong dinh ky' : 'Kiem tra tong the truoc khi sua chua',
          `Khach hang yeu cau ${service.NAME.toLowerCase()} va kiem tra ${part.NAME.toLowerCase()}`,
          '01 chia khoa, giay to xe', 2, storeId, CREATED_BY,
        ]);
        stats.receptions += 1;

        await execute(`
          INSERT INTO TLENHSUACHUA
            (ID, NAME, NOTE, NGAY, DXEID, DKHACHHANGID, TTIEPNHANXEID,
             BATDAU, KETTHUC, THOIGIAN_DUKIEN, THOIGIAN_THUCTE, TRANGTHAI,
             TONGTIENCONG, TONGTIENPHUTUNG, TONGCONG, DCUAHANGID,
             STATUS, USERCREATEDID, TIMECREATED)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
        `, [
          repairId, repairName, `Bao duong va sua chua ${vehicle.BIENSO}`,
          visitDate, vehicle.ID, vehicle.DKHACHHANGID, receptionId,
          visitDate, finishDate, 120 + (visitIndex * 30), 120 + (visitIndex * 25),
          laborTotal, partsTotal, total, storeId, CREATED_BY,
        ]);
        stats.repairs += 1;

        await execute(`
          INSERT INTO TLENHSUACHUACHITIET
            (ID, TLENHSUACHUAID, DDICHVUID, SOLUONG, DONGIA, THANHTIEN,
             LOAI, TRANGTHAI, NOTE, STATUS, USERCREATEDID, TIMECREATED)
          VALUES (?, ?, ?, ?, ?, ?, 1, 2, ?, 1, ?, CURRENT_TIMESTAMP)
        `, [uuidv4(), repairId, service.ID, serviceQty, servicePrice, laborTotal, `Dich vu: ${service.NAME}`, CREATED_BY]);

        await execute(`
          INSERT INTO TLENHSUACHUACHITIET
            (ID, TLENHSUACHUAID, DMATHANGID, DDONVITINHID, SOLUONG,
             DONGIA, THANHTIEN, LOAI, TRANGTHAI, NOTE,
             STATUS, USERCREATEDID, TIMECREATED)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, 2, ?, 1, ?, CURRENT_TIMESTAMP)
        `, [
          uuidv4(), repairId, part.ID, part.DDONVITINHID || null, partQty,
          partPrice, partsTotal, `Phu tung thay the: ${part.NAME}`, CREATED_BY,
        ]);
        stats.details += 2;

        await execute(`
          INSERT INTO TXUATPHUTUNG
            (ID, NOTE, TLENHSUACHUAID, DXEID, DMATHANGID, DKHOHANGID,
             DNHANVIENID, SOLUONG, DONGIA, THANHTIEN, GIAVON, NGAYXUAT,
             BAOHANH, DAHOANKHO, SLHOAN, STATUS, USERCREATEDID, TIMECREATED)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 1, ?, CURRENT_TIMESTAMP)
        `, [
          uuidv4(), `Xuat cho ${repairName}`, repairId, vehicle.ID, part.ID,
          warehouseId, technicianId, partQty, partPrice, partsTotal,
          Number(part.GIANHAP || 0), visitDate, Number(part.BAOHANH || 6), CREATED_BY,
        ]);
        stats.issues += 1;

        if (visitIndex < 2) {
          const warrantyEnd = new Date(visitDate);
          warrantyEnd.setMonth(warrantyEnd.getMonth() + Number(part.BAOHANH || 6));
          await execute(`
            INSERT INTO TBAOHANH
              (ID, NAME, NOTE, DXEID, DKHACHHANGID, TLENHSUACHUAID,
               DMATHANGID, NGAYBATDAU, NGAYKETTHUC, LOAI, TRANGTHAI, CHIPHI,
               STATUS, USERCREATEDID, TIMECREATED)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 0, 1, ?, CURRENT_TIMESTAMP)
          `, [
            uuidv4(), `BH-HSX-${key}-${visitIndex + 1}`,
            `Bao hanh phu tung ${part.NAME}`, vehicle.ID, vehicle.DKHACHHANGID,
            repairId, part.ID, visitDate, warrantyEnd, CREATED_BY,
          ]);
          stats.warranties += 1;
        }

        for (const media of [
          { type: 0, text: `Anh xe ${vehicle.BIENSO} truoc sua chua` },
          { type: 2, text: `Anh xe ${vehicle.BIENSO} sau hoan thien` },
        ]) {
          await execute(`
            INSERT INTO TTIEPNHANXEHINH
              (ID, TTIEPNHANXEID, LOAIHINH, MOTA, NOTE,
               STATUS, USERCREATEDID, TIMECREATED)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
          `, [uuidv4(), receptionId, media.type, media.text, repairName, CREATED_BY, visitDate]);
          stats.media += 1;
        }
      }

      await execute(`
        UPDATE DXE
           SET GHICHU = COALESCE(GHICHU, 'Ho so xe da dong bo du lieu sua chua'),
               USERMODIFIEDID = ?, TIMEMODIFIED = CURRENT_TIMESTAMP
         WHERE ID = ?
      `, [CREATED_BY, vehicle.ID]);
    }

    return stats;
  });

  console.log(JSON.stringify(summary, null, 2));
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
