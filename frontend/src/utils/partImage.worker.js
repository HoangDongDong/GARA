import { removeBackground } from '@imgly/background-removal';
const MAX_EDGE = 1600;
const MAX_BYTES = 3 * 1024 * 1024;
// Reuse the model/runtime; serialize inference to limit memory.
let queue = Promise.resolve();
self.onmessage = ({ data }) => { queue = queue.then(() => processImage(data)); };
async function resize(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return blob;
    const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.convertToBlob({ type: 'image/png' });
  } finally { bitmap.close(); }
}
async function processImage({ id, file, publicPath }) {
  let lastProgress = '', lastTime = 0;
  const progress = (message, force = false) => {
    const now = performance.now();
    if (message === lastProgress || (!force && now - lastTime < 200)) return;
    lastProgress = message; lastTime = now;
    self.postMessage({ id, progress: message });
  };
  try {
    const source = await resize(file);
    const foreground = await removeBackground(source, {
      publicPath, model: 'isnet_fp16', device: 'cpu',
      output: { format: 'image/png', type: 'foreground' },
      progress: (key, current, total) => progress(key.startsWith('fetch:')
        ? `Đang chuẩn bị tách nền… ${total > 0 ? Math.round(current / total * 100) : 0}%`
        : 'Đang tách nền ảnh mặt hàng…'),
    });
    progress('Đang tạo ảnh nền trắng…', true);
    const bitmap = await createImageBitmap(foreground);
    let output;
    try {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0);
      output = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
    } finally { bitmap.close(); }
    if (output.size > MAX_BYTES) throw new Error('Ảnh sau xử lý vượt quá 3 MB. Vui lòng chọn ảnh nhỏ hơn.');
    const value = new FileReaderSync().readAsDataURL(output);
    self.postMessage({ id, value });
  } catch (error) { self.postMessage({ id, error: error.message || 'Không thể xử lý ảnh.' }); }
}
