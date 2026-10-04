// Used only by the shared part form; vehicle/workflow images are unchanged.
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_EDGE = 1600;

export async function preparePartImage(file, onProgress = () => {}) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > MAX_BYTES) {
    throw new Error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 3 MB.');
  }
  onProgress('Đang tách nền ảnh mặt hàng…');
  const { removeBackground } = await import('@imgly/background-removal');
  const foreground = await removeBackground(file, {
    publicPath: new URL('/part-image-model/', window.location.origin).href,
    model: 'isnet_fp16',
    device: 'cpu',
    output: { format: 'image/png', type: 'foreground' },
    progress: (key, current, total) => {
      if (key.startsWith('fetch:')) {
        const percent = total > 0 ? Math.round(current / total * 100) : 0;
        onProgress(`Đang chuẩn bị tách nền… ${percent}%`);
      } else {
        onProgress('Đang tách nền ảnh mặt hàng…');
      }
    },
  });
  onProgress('Đang tạo ảnh nền trắng…');
  const bitmap = await createImageBitmap(foreground);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const value = canvas.toDataURL('image/jpeg', 0.92);
    if (Math.ceil(value.split(',')[1].length * 3 / 4) > MAX_BYTES) {
      throw new Error('Ảnh sau xử lý vượt quá 3 MB. Vui lòng chọn ảnh nhỏ hơn.');
    }
    return value;
  } finally {
    bitmap.close();
  }
}
