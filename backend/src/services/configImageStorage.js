// SCONFIG.BLOBVALUE is a UTF-8 text BLOB in GARAGE.FDB. Store ASCII
// Base64; continue reading old binary images from other schema versions.
function decodeConfigImage(blob) {
  if (blob == null) return null;
  const bytes = Buffer.isBuffer(blob) ? blob : Buffer.from(String(blob), 'utf8');
  const text = bytes.toString('ascii').trim();
  if (text && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) {
    const decoded = Buffer.from(text, 'base64');
    if (decoded.toString('base64') === text) return decoded;
  }
  return bytes;
}
function encodeConfigImage(bytes) { return bytes == null ? null : bytes.toString('base64'); }
module.exports = { decodeConfigImage, encodeConfigImage };
