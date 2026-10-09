import { compressImage, imagePolicies } from './compressImage';
const MAX_BYTES = 20 * 1024 * 1024;
let worker;
let sequence = 0;
const jobs = new Map();
function stopWorker(error) {
  worker?.terminate(); worker = undefined;
  for (const job of jobs.values()) { clearTimeout(job.timeout); job.reject(error); }
  jobs.clear();
}
function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./partImage.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    const job = jobs.get(data.id);
    if (!job) return;
    if (data.progress) { job.onProgress(data.progress); return; }
    clearTimeout(job.timeout); jobs.delete(data.id);
    if (data.error) job.reject(new Error(data.error));
    else job.resolve(data.value);
  };
  worker.onerror = () => stopWorker(new Error('Không khởi động được xử lý ảnh nền. Vui lòng thử lại.'));
  worker.onmessageerror = () => stopWorker(new Error('Không nhận được ảnh sau xử lý.'));
  return worker;
}
export async function preparePartImage(file, onProgress = () => {}) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > MAX_BYTES) {
    return Promise.reject(new Error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 20 MB.'));
  }
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return Promise.reject(new Error('Trình duyệt chưa hỗ trợ xử lý ảnh nền. Vui lòng dùng Chrome hoặc Edge mới.'));
  }
  onProgress('Đang giảm kích thước ảnh…');
  const prepared=await compressImage(file,imagePolicies.part);
  file=prepared.blob;
  const id = ++sequence;
  onProgress('Đang tách nền ảnh mặt hàng…');
  const value=await new Promise((resolve, reject) => {
    try {
      const activeWorker = getWorker();
      const timeout = setTimeout(() => stopWorker(new Error('Xử lý ảnh quá lâu. Vui lòng thử lại.')), 180000);
      jobs.set(id, { resolve, reject, onProgress, timeout });
      activeWorker.postMessage({ id, file, publicPath: new URL('/part-image-model/', window.location.origin).href });
    } catch (error) {
      const job = jobs.get(id); clearTimeout(job?.timeout); jobs.delete(id); reject(error);
    }
  });
  return (await compressImage(value,imagePolicies.part)).data;
}
