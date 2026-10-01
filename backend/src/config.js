const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: process.env.PORT || 4000,
  firebird: {
    host: process.env.FB_HOST || '127.0.0.1',
    port: parseInt(process.env.FB_PORT || '3050', 10),
    database: process.env.FB_DATABASE || 'D:/Garage/GARAGE.FDB',
    user: process.env.FB_USER || 'SYSDBA',
    password: process.env.FB_PASSWORD || 'masterkey',
    role: process.env.FB_ROLE || undefined,
    page_size: 65536,
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};