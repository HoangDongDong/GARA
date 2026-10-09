// randomUUID requires a secure context; getRandomValues also works on LAN HTTP.
export function createPrintJobKey(cryptoProvider = globalThis.crypto) {
  if (typeof cryptoProvider?.randomUUID === 'function') return cryptoProvider.randomUUID();
  if (typeof cryptoProvider?.getRandomValues !== 'function') {
    throw new Error('Trình duyệt không hỗ trợ tạo mã lệnh in. Hãy cập nhật trình duyệt.');
  }
  const bytes = cryptoProvider.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
