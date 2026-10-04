const test=require('node:test');const assert=require('node:assert/strict');const {encodeConfigImage,decodeConfigImage}=require('../src/services/configImageStorage');
test('UTF-8 text blob stores base64 and decodes original image bytes without double encoding',()=>{
 const image=Buffer.from([137,80,78,71,13,10,26,10,255,0,195,40]);const stored=encodeConfigImage(image);
 assert.equal(typeof stored,'string');assert.ok(/^[\x00-\x7f]+$/.test(stored));assert.deepEqual(decodeConfigImage(Buffer.from(stored,'utf8')),image);
 assert.equal(decodeConfigImage(Buffer.from(stored)).toString('base64'),stored);
});
test('legacy binary image blobs and empty values remain readable',()=>{
 const jpeg=Buffer.from([255,216,255,224,0,16,74,70,73,70]);assert.deepEqual(decodeConfigImage(jpeg),jpeg);assert.equal(decodeConfigImage(null),null);assert.equal(encodeConfigImage(null),null);
});
