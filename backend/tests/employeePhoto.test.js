const test = require('node:test');
const assert = require('node:assert/strict');
const {parsePhoto,imageMime} = require('../src/services/employeePhoto');
test('employee photos accept supported bytes and reject spoofed or oversized files', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPTkAAAAASUVORK5CYII=','base64');
  assert.deepEqual(parsePhoto(`data:image/png;base64,${png.toString('base64')}`),png);
  assert.equal(imageMime(png),'image/png'); assert.equal(parsePhoto(null),null);
  for (const value of ['data:image/jpeg;base64,'+png.toString('base64'),'data:image/png;base64,SGVsbG8=',{},'https://example.com/photo.png',`data:image/png;base64,${Buffer.alloc(3*1024*1024+1).toString('base64')}`]) assert.throws(()=>parsePhoto(value),{statusCode:400});
});
