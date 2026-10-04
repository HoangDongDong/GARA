// Compress before saving: PNG retains transparency, JPEG remains JPEG.
const TARGET_BYTES = 256 * 1024;
const MAX_EDGE = 800;
const encode = (canvas, mime, quality) => new Promise((resolve, reject) => {
  canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Không thể nén logo.')), mime, quality);
});
const readBase64 = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = () => reject(new Error('Không thể đọc logo đã nén.'));
  reader.readAsDataURL(blob);
});
export async function compressCompanyLogo(file) {
  if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 20 * 1024 * 1024) {
    throw new Error('Chọn logo PNG hoặc JPG tối đa 20 MB; ảnh sẽ được tự động nén trước khi lưu.');
  }
  const url = URL.createObjectURL(file);
  try {
    const picture = new Image();
    await new Promise((resolve, reject) => {
      picture.onload = resolve;
      picture.onerror = () => reject(new Error('Không đọc được ảnh logo. Hãy chọn ảnh PNG hoặc JPG hợp lệ.'));
      picture.src = url;
    });
    const longest = Math.max(picture.naturalWidth, picture.naturalHeight);
    if (!longest) throw new Error('Ảnh logo không có kích thước hợp lệ.');
    let scale = Math.min(1, MAX_EDGE / longest);
    let best = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Trình duyệt không hỗ trợ nén logo.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(picture, 0, 0, canvas.width, canvas.height);
      for (const quality of file.type === 'image/jpeg' ? [0.85, 0.75, 0.65] : [undefined]) {
        const candidate = await encode(canvas, file.type, quality);
        if (!best || candidate.size < best.size) best = candidate;
        if (best.size <= TARGET_BYTES) break;
      }
      if (best.size <= TARGET_BYTES) break;
      scale *= 0.8;
    }
    // An already-small optimized logo should not grow during re-encoding.
    if (longest <= MAX_EDGE && file.size < best.size) best = file;
    if (best.size > TARGET_BYTES) throw new Error('Không thể giảm logo về dung lượng phù hợp. Hãy chọn ảnh khác.');
    return { base64: await readBase64(best), originalBytes: file.size, compressedBytes: best.size };
  } finally {
    URL.revokeObjectURL(url);
  }
}
