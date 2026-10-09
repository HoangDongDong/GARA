export function createSessionGuard(storage) {
  const initial = storage.getItem('garage_token');
  return url => {
    const token = storage.getItem('garage_token');
    const path = String(url || '').replace(/^\/api/, '');
    const publicRequest = /^\/auth\/login\/?$/.test(path) || /^\/saas\//.test(path);
    if (!publicRequest && token !== initial) throw new Error('Phiên cửa hàng đã thay đổi. Vui lòng tải lại trang trước khi thao tác.');
    return token;
  };
}
export const sessionToken = createSessionGuard(typeof localStorage === 'undefined' ? {getItem:()=>null} : localStorage);
