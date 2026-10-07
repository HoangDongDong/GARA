/**
 * Master-data: Generic CRUD endpoints cho cac bang master
 * (Brands, Models, Suppliers, Categories, Warehouses, ...)
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * Helper: GET /api/master-data/<table>?status=1&search=...
 *   + auto JOIN tên nếu có cột NAME
 */
const TABLES = {
  brands: {
    table: 'DHANGXE',
    fk: {},
    searchCols: ['NAME', 'CODE'],
    order: 'SORTORDER, NAME',
  },
  models: {
    table: 'DDONGXE',
    fk: { brand: 'DHANGXEID' },
    join: { brand: { table: 'DHANGXE', as: 'B', on: 'B.ID = DDONGXE.DHANGXEID', select: ['B.NAME AS BRAND_NAME'] } },
    searchCols: ['NAME', 'CODE'],
    order: 'SORTORDER, NAME',
  },
  categories: {
    table: 'DNHOMMATHANG',
    fk: {},
    searchCols: ['NAME'],
    order: 'SORTORDER, NAME',
  },
  service_categories: {
    table: 'DLOAIDICHVU',
    fk: {},
    searchCols: ['NAME'],
    order: 'SORTORDER, NAME',
  },
  services: {
    table: 'DDICHVU',
    fk: { category: 'DLOAIDICHVUID' },
    join: { category: { table: 'DLOAIDICHVU', as: 'LC', on: 'LC.ID = DDICHVU.DLOAIDICHVUID AND LC.STATUS=1', select: ['LC.NAME AS CATEGORY_NAME', 'LC.NAME AS NHOM', 'LC.THUESUATRIENG AS THUENHOM'] } },
    searchCols: ['NAME', 'CODE'],
    order: 'SORTORDER, NAME',
  },
  warehouses: {
    table: 'DKHOHANG',
    fk: {},
    searchCols: ['NAME', 'NOTE'],
    order: 'SORTORDER, NAME',
  },
  locations: {
    table: 'DVITRIKHO',
    fk: { warehouse: 'DKHOHANGID' },
    join: { warehouse: { table: 'DKHOHANG', as: 'K', on: 'K.ID = DVITRIKHO.DKHOHANGID', select: ['K.NAME AS KHO_NAME'] } },
    searchCols: ['NAME'],
    order: 'SORTORDER, NAME',
  },
  units: {
    table: 'DDONVITINH',
    fk: {},
    searchCols: ['NAME', 'CODE'],
    order: 'SORTORDER, NAME',
  },
  brands_parts: {
    table: 'DHANGSANXUAT',
    fk: {},
    searchCols: ['NAME'],
    order: 'SORTORDER, NAME',
  },
  suppliers: {
    table: 'DNHACUNGCAP',
    fk: { group: 'DNHOMNHACUNGCAPID' },
    join: { group: { table: 'DNHOMNHACUNGCAP', as: 'G', on: 'G.ID = DNHACUNGCAP.DNHOMNHACUNGCAPID', select: ['G.NAME AS GROUP_NAME'] } },
    searchCols: ['NAME', 'MANHACUNGCAP'],
    order: 'SORTORDER, NAME',
  },
  supplier_groups: {
    table: 'DNHOMNHACUNGCAP',
    fk: {},
    searchCols: ['NAME'],
    order: 'SORTORDER, NAME',
  },
  customer_groups: {
    table: 'DNHOMKHACHHANG',
    fk: {},
    searchCols: ['NAME'],
    order: 'SORTORDER, NAME',
  },
  shifts: {
    table: 'DCALAMVIEC',
    fk: {},
    searchCols: ['NAME'],
    order: 'NAME',
  },
  bank_accounts: {
    table: 'DTAIKHOANNGANHANG',
    fk: {},
    searchCols: ['NAME', 'TENNGANHANG', 'SOTAIKHOAN'],
    order: 'NAME',
  },
  cash_categories: {
    table: 'DLYDOTHUCHI',
    fk: {},
    searchCols: ['NAME'],
    order: 'LOAI, NAME',
  },
};

/* Generic GET list */
router.get('/:resource', async (req, res) => {
  try {
    const def = TABLES[req.params.resource];
    if (!def) return res.status(404).json({ error: 'Resource khong ton tai' });

    const { status, search, ...filters } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (status !== undefined && status !== '') {
      where += ` AND ${def.table}.STATUS = ?`;
      params.push(parseInt(status, 10));
    }

    /* Filter qua FK (vd ?brand=xxx) */
    if (Object.keys(def.fk).length) {
      for (const key of Object.keys(def.fk)) {
        if (filters[key]) {
          where += ` AND ${def.table}.${def.fk[key]} = ?`;
          params.push(filters[key]);
        }
      }
    }

    /* Search */
    if (search && def.searchCols.length) {
      const parts = def.searchCols.map(c => `UPPER(${def.table}.${c}) LIKE ?`).join(' OR ');
      where += ` AND (${parts})`;
      for (let i = 0; i < def.searchCols.length; i++) {
        params.push(`%${search.toUpperCase()}%`);
      }
    }

    /* Optional filters theo columns */
    for (const [k, v] of Object.entries(filters)) {
      if (def.fk[k]) continue;
      if (v === '' || v === undefined || v === null) continue;
      where += ` AND ${def.table}.${k.toUpperCase()} = ?`;
      params.push(v);
    }

    /* Build SELECT with JOIN */
    let select = `SELECT ${def.table}.*`;
    if (def.join) {
      for (const join of Object.values(def.join)) {
        for (const sel of join.select) {
          select += `, ${sel}`;
        }
      }
    }
    let sql = `${select} FROM ${def.table}`;
    if (def.join) {
      for (const join of Object.values(def.join)) {
        sql += ` LEFT JOIN ${join.table} ${join.as} ON ${join.on}`;
      }
    }
    sql += ` ${where} ORDER BY ${def.order}`;

    const rows = await db.query(sql, params);
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* GET single */
router.get('/:resource/:id', async (req, res) => {
  try {
    const def = TABLES[req.params.resource];
    if (!def) return res.status(404).json({ error: 'Resource khong ton tai' });
    const rows = await db.query(`SELECT * FROM ${def.table} WHERE ID = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* POST create */
router.post('/:resource', async (req, res) => {
  try {
    const def = TABLES[req.params.resource];
    if (!def) return res.status(404).json({ error: 'Resource khong ton tai' });

    const id = uuidv4();
    require('../services/pricingPolicy').validateMaster(req.body);
    require('../services/repairCommissions').validateConfig(req.body);
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const data = { ...req.body, ID: id, STATUS: req.body.STATUS ?? 1, USERCREATEDID: actor };
    delete data.TIMECREATED;

    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map(c => data[c]);

    const sql = `INSERT INTO ${def.table} (${cols.join(', ')}, TIMECREATED) VALUES (${placeholders}, CURRENT_TIMESTAMP)`;
    await db.query(sql, values);
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* PUT update */
router.put('/:resource/:id', async (req, res) => {
  try {
    const def = TABLES[req.params.resource];
    if (!def) return res.status(404).json({ error: 'Resource khong ton tai' });

    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const data = { ...req.body, USERMODIFIEDID: actor };
    require('../services/pricingPolicy').validateMaster(data);
    require('../services/repairCommissions').validateConfig(data);
    delete data.ID;
    delete data.TIMEMODIFIED;

    const cols = Object.keys(data);
    if (!cols.length) return res.json({ ok: true });

    const set = cols.map(c => `${c} = ?`).join(', ');
    const values = cols.map(c => data[c]);
    values.push(req.params.id);

    await db.query(`UPDATE ${def.table} SET ${set}, TIMEMODIFIED = CURRENT_TIMESTAMP WHERE ID = ?`, values);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* DELETE */
router.delete('/:resource/:id', async (req, res) => {
  try {
    const def = TABLES[req.params.resource];
    if (!def) return res.status(404).json({ error: 'Resource khong ton tai' });
    const actor = String(req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    await db.query(
      `UPDATE ${def.table}
          SET STATUS = 0, USERMODIFIEDID = ?, TIMEMODIFIED = CURRENT_TIMESTAMP
        WHERE ID = ?`,
      [actor, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
