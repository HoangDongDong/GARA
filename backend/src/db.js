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

/*
 * node-firebird connections are cheap enough for this local application.
 * Open one connection per operation and always detach it afterwards.
 *
 * The previous hand-written queue stored Promise resolver functions and later
 * returned those functions as database connections when requests arrived in
 * parallel. That made db.query undefined and also left queued requests hanging.
 */

function newConnection() {
  return new Promise((resolve, reject) => {
    firebird.attach(config.firebird, (err, db) => {
      if (err) return reject(err);
      resolve(db);
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

module.exports = { query, execute, transaction, ping, uuidv4 };
