const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config.js');
const db = require('./db.js');
const tenancy = require('./tenancy.js');
db.enablePool();

const app = express();
if (tenancy.enabled()) app.set('trust proxy', 'loopback');

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '35mb' }));
app.use((req,res,next)=>{
  if(tenancy.enabled()){
    const writeHead=res.writeHead;
    res.writeHead=function(...args){this.setHeader('Cache-Control','private, no-store');this.vary('Authorization');return writeHead.apply(this,args);};
  }
  next();
});
morgan.token('safe-url',req=>String(req.originalUrl||req.url).replace(/([?&]access_token=)[^&]*/gi,'$1[hidden]'));
app.use(morgan(':method :safe-url :status :response-time ms'));

app.get('/api/health', async (req, res) => {
  try {
    const result = tenancy.enabled() ? await require('./services/platform.js').query('SELECT 1 AS OK FROM RDB$DATABASE') : await db.ping();
    res.json({ ok: true, firebird: result });
  } catch (e) {
    res.status(503).json({ ok: false, error: 'Database chưa sẵn sàng.' });
  }
});

app.use('/api/saas', require('./routes/saas.js'));
app.use('/api/auth',           require('./routes/auth.js'));
// Agent credentials are separate from user login tokens.
app.use('/api/print-agent', require('./routes/printAgent.js').agent);
const { authenticate, authorize } = require('./accessControl.js');
app.use('/api', authenticate, tenancy.guard, authorize);
app.use('/api/admin-access',   require('./routes/adminAccess.js'));
app.use('/api/customers',      require('./routes/customers.js'));
app.use('/api/vehicles',       require('./routes/vehicles.js'));
app.use('/api/repair-orders',  require('./routes/repairOrders.js'));
app.use('/api/employees',      require('./routes/employees.js'));
app.use('/api/parts',          require('./routes/parts.js'));
app.use('/api/invoices',       require('./routes/invoices.js'));
app.use('/api/reports',        require('./routes/reports.js'));
app.use('/api/finance',        require('./routes/finance.js'));
app.use('/api/print-templates', require('./routes/printTemplates.js'));
app.use('/api/workflow',       require('./routes/workflow.js'));
app.use('/api/master-data',    require('./routes/masterData.js'));
app.use('/api/catalog',        require('./routes/catalog.js'));
app.use('/api/suppliers',      require('./routes/suppliers.js'));
app.use('/api/sales',          require('./routes/sales.js'));
app.use('/api/secondary-payment', require('./routes/secondaryPayment.js'));
app.use('/api/inventory-receipts', require('./routes/inventoryReceipts.js'));
app.use('/api/ocr',            require('./routes/ocr.js'));
app.use('/api/system-config',  require('./routes/systemConfig.js'));
app.use('/api/printing',       require('./routes/printing.js'));
app.use('/api/print-control', require('./routes/printAgent.js').users);
const printMaintenance=setInterval(async()=>{
  try {
    if (!tenancy.enabled()) return await require('./services/printAgent.js').maintenance();
    const rows=await require('./services/platform.js').query("SELECT ID,SLUG,NAME,DBPATH,STATE,ENDSAT FROM SAAS_TENANTS WHERE STATE='active'");
    for (const row of rows) {
      try { await tenancy.run(require('./services/platform.js').map(row),()=>require('./services/printAgent.js').maintenance()); }
      catch(error) { console.error('Tenant print retention:',row.ID,error.message); }
    }
  } catch(error) {console.error('Print retention:',error.message);}
},60*60*1000);
printMaintenance.unref();
app.use('/api/document-numbers', require('./routes/documentNumbers.js'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || err.statusCode || 500).json({ error: tenancy.enabled() && !err.status && !err.statusCode ? 'Hệ thống tạm thời chưa sẵn sàng.' : err.message });
});

async function start() {
  if (tenancy.enabled()) {
    await require('./services/platform.js').query('SELECT FIRST 1 ID FROM SAAS_TENANTS');
    await require('./services/platform.js').query('SELECT FIRST 1 LOGINKEY FROM SAAS_LOGINS');
    require('./services/saasWorker.js').manifest();
    if(process.env.SAAS_REGISTRATION_ENABLED==='true' && !require('./services/saasRegistration.js').registrationReady())throw Error('Cần cấu hình chế độ đăng ký hoặc dịch vụ email trước khi mở đăng ký.');
    if(process.env.SAAS_EMBEDDED_WORKER==='true') {
      let pending=false;
      const tick=async()=>{if(pending)return;pending=true;try{await require('./services/saasWorker.js').processOne();}catch(error){console.error('Provisioning:',error.message);}finally{pending=false;}};
      const timer=setInterval(tick,2000);timer.unref();tick();
    }
  }
  app.listen(config.port, process.env.API_BIND_HOST || (tenancy.enabled() ? '127.0.0.1' : '0.0.0.0'), () => {
  console.log(`>>> Garage API running at http://localhost:${config.port}`);
  console.log(`>>> Firebird DB: ${config.firebird.database}`);
});
}
if(require.main===module)start().catch(error=>{console.error('Startup:',error.message);process.exitCode=1;});
module.exports={app,start};
