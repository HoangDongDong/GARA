const os = require('os');

// node-firebird reads os.userInfo() while opening a connection. Some managed
// Windows sessions can throw ERR_SYSTEM_ERROR here, which would terminate the
// API process before Firebird returns a normal connection error.
try {
  os.userInfo();
} catch {
  os.userInfo = () => ({ username: process.env.USERNAME || 'SYSTEM' });
}

const firebird = require('node-firebird');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

// Use the driver's pool in the API; standalone scripts retain short-lived
// connections so migrations and CLI checks exit without holding open sockets.
let pooling = false;
const pools = new Map();
const tenancy = require('./tenancy');
const originalDetach = Symbol('originalDetach');
function enablePool() {
  pooling = true;
}
async function closePool() {
  pooling = false;
  await Promise.all([...pools.values()].map(entry => new Promise((resolve, reject) => entry.pool.destroy(error => error ? reject(error) : resolve()))));
  pools.clear();
}

function newConnection() {
  const options = { ...config.firebird, database: tenancy.database() };
  return new Promise((resolve, reject) => {
    const ready=(err, db) => {
      if (err) return reject(err);
      resolve(db);
    };
    if (!pooling) return firebird.attach(options, ready);
    const poolKey = tenancy.key();
    let entry = pools.get(poolKey);
    if (entry && entry.database !== options.database) return reject(new Error('Database tenant đã thay đổi; cần đóng pool trước khi chuyển.'));
    if (!entry) {
      const limit = Math.max(1, Math.min(100, Number(process.env.SAAS_MAX_POOLS) || 20));
      for (const [id, candidate] of pools) {
        if (!candidate.active && Date.now() - candidate.used > 60000) { pools.delete(id); candidate.pool.destroy(() => {}); }
      }
      if (pools.size >= limit) return reject(Object.assign(new Error('Hệ thống đang bận. Vui lòng thử lại.'), { status: 503 }));
      entry = { database: options.database, active: 0, used: Date.now(), pool: firebird.pool(3, { ...options, idleTimeoutMillis: 60000 }) };
      pools.set(poolKey, entry);
    }
    entry.active++;
    entry.pool.get((error, connection) => {
      if (error) { entry.active--; entry.used = Date.now(); return ready(error); }
      if (!connection[originalDetach]) connection[originalDetach] = connection.detach.bind(connection);
      const detach = connection[originalDetach];
      let released = false;
      connection.detach = (...args) => {
        if (!released) { released = true; entry.active--; entry.used = Date.now(); }
        return detach(...args);
      };
      ready(null, connection);
    });
  });
}

function release(db) {
  try {
    db.detach();
  } catch (e) { /* ignore */ }
}

async function acquireWrap() {
  return newConnection();
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    acquireWrap().then((db) => {
      db.query(sql, params, (err, rows) => {
        release(db);
        if (err) return reject(err);
        resolve(rows || []);
      });
    }).catch(reject);
  });
}

function execute(sql, params = []) {
  return new Promise((resolve, reject) => {
    acquireWrap().then((db) => {
      db.query(sql, params, (err, result) => {
        release(db);
        if (err) return reject(err);
        resolve(result);
      });
    }).catch(reject);
  });
}

// Binary BLOBs are returned by node-firebird as reader functions tied to the
// live connection. Keep that connection open until the stream is consumed.
function queryBlob(sql, params = [], fieldName) {
  return new Promise((resolve, reject) => {
    acquireWrap().then((db) => {
      db.query(sql, params, (err, rows) => {
        if (err) { release(db); return reject(err); }
        const row = rows?.[0];
        if (!row || row[fieldName] == null) { release(db); return resolve(null); }
        const blob = row[fieldName];
        if (Buffer.isBuffer(blob)) { release(db); return resolve(blob); }
        if (typeof blob !== 'function') { release(db); return resolve(Buffer.from(String(blob), 'utf8')); }
        blob((blobError, name, stream) => {
          if (blobError) { release(db); return reject(blobError); }
          const chunks = [];
          let length = 0;
          stream.on('data', (chunk) => { chunks.push(chunk); length += chunk.length; });
          stream.on('error', (streamError) => { release(db); reject(streamError); });
          stream.on('end', () => { release(db); resolve(Buffer.concat(chunks, length)); });
        });
      });
    }).catch(reject);
  });
}

function transaction(fn) {
  return new Promise((resolve, reject) => {
    acquireWrap().then((db) => {
      db.transaction(
        firebird.ISOLATION_READ_COMMITTED,
        (err, tr) => {
          if (err) { release(db); return reject(err); }
          const tq = (sql, params = []) =>
            new Promise((res, rej) => tr.query(sql, params, (e, r) => e ? rej(e) : res(r || [])));
          const texec = (sql, params = []) =>
            new Promise((res, rej) => tr.query(sql, params, (e, r) => e ? rej(e) : res(r)));
          fn(tq, texec, uuidv4)
            .then((data) => tr.commit((e) => {
              release(db);
              if (e) return reject(e);
              resolve(data);
            }))
            .catch((e) => tr.rollback(() => {
              release(db);
              reject(e);
            }));
        }
      );
    }).catch(reject);
  });
}

async function ping() {
  const rows = await query('SELECT 1 AS OK FROM RDB$DATABASE');
  return rows[0];
}

module.exports = { query, queryBlob, execute, transaction, ping, uuidv4, enablePool, closePool };
