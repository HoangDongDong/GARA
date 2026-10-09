import { useEffect } from 'react';

export const interfaceScaleKey = 'garage_interface_scale';
export const interfaceScaleId = 'local-interface-scale';
export function normalizeInterfaceScale(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 50 && number <= 200 ? Math.round(number) : 100;
}
export function readInterfaceScale() {
  try { return normalizeInterfaceScale(localStorage.getItem(interfaceScaleKey)); }
  catch { return 100; }
}
export function saveInterfaceScale(value) {
  localStorage.setItem(interfaceScaleKey, String(normalizeInterfaceScale(value)));
  window.dispatchEvent(new Event('garage-interface-scale-changed'));
}

export default function GlobalInterfaceScale() {
  useEffect(() => {
    const update = () => document.documentElement.style.setProperty('--garage-interface-scale', readInterfaceScale() / 100);
    update();
    window.addEventListener('storage', update);
    window.addEventListener('garage-interface-scale-changed', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('garage-interface-scale-changed', update);
    };
  }, []);
  return null;
}
