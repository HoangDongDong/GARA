const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => console.error('Browser:', error.message));
    const remoteRequests = [];
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:5188/')) remoteRequests.push(request.url());
    });
    await page.goto('http://127.0.0.1:5188/');
    await page.waitForLoadState('networkidle');
    remoteRequests.length = 0;
    const image = fs.readFileSync(path.resolve(__dirname, '../backend/assets/part-default.png')).toString('base64');
    const result = await page.evaluate(async base64 => {
      const { preparePartImage } = await import('/src/utils/partImage.js');
      let validation = false;
      try { await preparePartImage(new File(['bad'], 'bad.txt', { type: 'text/plain' })); }
      catch (error) { validation = error.message.startsWith('Chọn ảnh'); }
      const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
      const statuses = [];
      const value = await preparePartImage(new File([bytes], 'part.png', { type: 'image/png' }), status => statuses.push(status));
      const blob = await (await fetch(value)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0);
      const corners = [[0,0], [bitmap.width-1,0], [0,bitmap.height-1], [bitmap.width-1,bitmap.height-1]].map(([x,y]) => [...context.getImageData(x,y,1,1).data]);
      bitmap.close();
      return { value, validation, corners, size: blob.size, statuses };
    }, image);
    assert.equal(result.validation, true);
    assert.ok(result.value.startsWith('data:image/jpeg;base64,'));
    assert.ok(result.size < 3 * 1024 * 1024);
    assert.ok(result.corners.every(pixel => pixel.slice(0,3).every(value => value >= 245) && pixel[3] === 255));
    const output = path.resolve(__dirname, 'part-background-check.jpg');
    fs.writeFileSync(output, Buffer.from(result.value.split(',')[1], 'base64'));
    assert.deepEqual(remoteRequests, [], 'Background removal must use local assets');
    await page.goto('http://127.0.0.1:5188/scripts/part-image-form-check.html');
    const input = page.locator('input[type=file]');
    const submit = page.locator('button[type=submit]');
    await input.setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from('bad') });
    await page.getByRole('alert').waitFor();
    assert.equal(await submit.isDisabled(), true);
    await input.setInputFiles(path.resolve(__dirname, '../backend/assets/part-default.png'));
    await page.getByRole('button', { name: 'Đang tách nền...' }).waitFor();
    assert.equal(await submit.isDisabled(), true);
    await page.locator('form').dispatchEvent('submit');
    assert.equal(await page.evaluate(() => window.partImageSaved), undefined);
    await page.waitForFunction(() => window.partImageForm?.ANH?.startsWith('data:image/jpeg;base64,'), null, { timeout: 120000 });
    await page.waitForFunction(() => !document.querySelector('button[type=submit]').disabled);
    await submit.click();
    const saved = await page.evaluate(() => ({ image: window.partImageSaved?.ANH, preview: document.querySelector('img').src }));
    assert.equal(saved.image, saved.preview);
    console.log(JSON.stringify({ passed: true, bytes: result.size, whiteCorners: result.corners, localAssets: true, formUpload: true, blockedDuringProcessing: true, savedProcessedImage: true, output }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
