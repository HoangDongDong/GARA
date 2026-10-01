const http = require('http');

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      host: 'localhost', port: 4000, path, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch (e) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  console.log('--- LOGIN ---');
  const login = await req('POST', '/api/auth/login', { username: 'admin', password: '123456' });
  console.log(login.status, JSON.stringify(login.body).slice(0, 200));

  console.log('\n--- DASHBOARD ---');
  const dash = await req('GET', '/api/reports/dashboard');
  console.log(dash.status, JSON.stringify(dash.body));

  console.log('\n--- CUSTOMERS (count) ---');
  const c = await req('GET', '/api/customers');
  console.log(dash.status, 'rows:', c.body.data?.length);

  console.log('\n--- VEHICLES ---');
  const v = await req('GET', '/api/vehicles');
  console.log('rows:', v.body.data?.length);

  console.log('\n--- PARTS ---');
  const p = await req('GET', '/api/parts');
  console.log('rows:', p.body.data?.length, 'sample TON_KHO:', p.body.data?.[0]?.TON_KHO);

  console.log('\n--- REPAIR-ORDERS ---');
  const ro = await req('GET', '/api/repair-orders');
  console.log('rows:', ro.body.data?.length);

  console.log('\n--- INVOICES ---');
  const inv = await req('GET', '/api/invoices');
  console.log('rows:', inv.body.data?.length);

  console.log('\n--- EMPLOYEES ---');
  const e = await req('GET', '/api/employees');
  console.log('rows:', e.body.data?.length);

  console.log('\n--- REVENUE ---');
  const rev = await req('GET', '/api/reports/revenue?from=2026-01-01&to=2026-12-31');
  console.log('rows:', rev.body.data?.length);
})();