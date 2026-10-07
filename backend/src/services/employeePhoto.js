const MAX_BYTES = 3 * 1024 * 1024;
function imageMime(bytes) {
  if (!Buffer.isBuffer(bytes)) return null;
  if (bytes.length >= 8 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') return 'image/webp';
  return null;
}
function parsePhoto(value) {
  if (value === null || value === '') return null;
  const fail = () => { throw Object.assign(new Error('Ảnh nhân viên phải là JPG, PNG hoặc WebP, tối đa 3 MB.'), {statusCode:400}); };
  if (typeof value !== 'string' || value.length > MAX_BYTES * 4 / 3 + 100) return fail();
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return fail();
  const bytes = Buffer.from(match[2],'base64');
  if (!bytes.length || bytes.length > MAX_BYTES || bytes.toString('base64') !== match[2] || imageMime(bytes) !== match[1]) return fail();
  return bytes;
}
async function storePhoto(execute, uuid, bytes, actor, employeeName) {
  if (!bytes) return null;
  const id = uuid();
  await execute('INSERT INTO SIMAGE (ID,NAME,IMAGE,STATUS,USERCREATEDID,TIMECREATED) VALUES (?,?,?,1,?,CURRENT_TIMESTAMP)', [id,`Ảnh ${employeeName}`.slice(0,255),bytes,actor]);
  return id;
}
module.exports = {parsePhoto,imageMime,storePhoto};
