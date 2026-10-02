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
    // Ảnh workflow được lưu trong BLOB SUB_TYPE TEXT dưới dạng data URL.
    // Tùy chọn này giúp node-firebird đọc BLOB text trước khi nhả connection.
    blobAsText: true,
    // Firebird 2.5 closes the wire connection with 64 KB BLOB segments.
    // 16 KB remains efficient and is compatible with the legacy protocol.
    blobChunkSize: 16384,
    blobReadChunkSize: 16384,
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
