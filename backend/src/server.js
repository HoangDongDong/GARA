const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const db = require('./db');

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '35mb' }));
app.use(morgan('dev'));

app.get('/api/health', async (req, res) => {
  try {
    const result = await db.ping();
    res.json({ ok: true, firebird: result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use('/api/auth',           require('./routes/auth'));
const { authenticate, authorize } = require('./accessControl');
app.use('/api', authenticate, authorize);
app.use('/api/admin-access',   require('./routes/adminAccess'));
app.use('/api/customers',      require('./routes/customers'));
app.use('/api/vehicles',       require('./routes/vehicles'));
app.use('/api/repair-orders',  require('./routes/repairOrders'));
app.use('/api/employees',      require('./routes/employees'));
app.use('/api/parts',          require('./routes/parts'));
app.use('/api/invoices',       require('./routes/invoices'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/workflow',       require('./routes/workflow'));
app.use('/api/master-data',    require('./routes/masterData'));
app.use('/api/suppliers',      require('./routes/suppliers'));
app.use('/api/sales',          require('./routes/sales'));
app.use('/api/inventory-receipts', require('./routes/inventoryReceipts'));
app.use('/api/ocr',            require('./routes/ocr'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`>>> Garage API running at http://localhost:${config.port}`);
  console.log(`>>> Firebird DB: ${config.firebird.database}`);
  try { require('./routes/ocr').ensureOcrService(); } catch (e) {}
});
