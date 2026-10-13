const http = require('http');
http.get('http://localhost:4000/api/vehicles', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const j = JSON.parse(d);
    console.log('status:', r.statusCode);
    console.log('count:', j.data ? j.data.length : 0);
    if (j.data && j.data[0]) console.log('first:', JSON.stringify(j.data[0]));
  });
});