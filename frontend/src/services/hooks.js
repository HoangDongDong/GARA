import { useState, useEffect, useCallback } from 'react';

/**
 * useApi - Hook goi API tu dong, co refresh + error handling
 *  - data: du lieu tra ve (mac dinh [])
 *  - loading: dang goi
 *  - error: loi (neu co)
 *  - refresh: goi lai
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async () => {
    if (!fetcher) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(Array.isArray(result) ? result : (result ?? []));
    } catch (e) {
      console.error('useApi error:', e);
      setError(e);
      setData([]);
    } finally {
      setLoading(false);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, refresh: run, setData };
}

/**
 * useToast - Toast notification don gian
 */
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success', duration = 3000) => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), duration);
  }, []);

  return { toast, showToast };
}

/**
 * useFormState - quan ly form don gian (values + reset)
 */
export function useFormState(initial = {}) {
  const [values, setValues] = useState(initial);
  const reset = useCallback((next = initial) => setValues(next), [initial]);
  const setField = useCallback((key, value) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);
  const setFields = useCallback((patch) => {
    setValues(prev => ({ ...prev, ...patch }));
  }, []);
  return { values, setValues, setField, setFields, reset };
}

/**
 * useModal - quan ly modal open/close
 */
export function useModal(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, openModal: () => setOpen(true), closeModal: () => setOpen(false) };
}

/**
 * formatMoney - dinh dang VND
 */
export function formatMoney(v) {
  if (v === null || v === undefined || v === '') return '0';
  const n = Number(v);
  if (isNaN(n)) return '0';
  return n.toLocaleString('vi-VN');
}

/**
 * formatDate - dd/mm/yyyy HH:mm
 */
export function formatDate(d) {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(x.getDate())}/${pad(x.getMonth()+1)}/${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

/**
 * formatDateShort - dd/mm/yyyy
 */
export function formatDateShort(d) {
  if (!d) return '';
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(x.getDate())}/${pad(x.getMonth()+1)}/${x.getFullYear()}`;
}
