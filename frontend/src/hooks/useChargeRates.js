import { useCallback, useEffect, useState } from 'react';
import api from '../api';

export default function useChargeRates(resource, enabled = true) {
  const [rates, setRates] = useState({ taxRate: 0, serviceRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    if (!enabled) { setLoading(false); setError(''); return; }
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/${resource}/charge-rates`);
      setRates(response.data.data);
    } catch (failure) {
      setError(failure.response?.data?.error || 'Không tải được cấu hình thuế và phí dịch vụ.');
    } finally { setLoading(false); }
  }, [resource, enabled]);
  useEffect(() => {
    reload();
    window.addEventListener('focus', reload);
    window.addEventListener('garage-charge-rates-changed', reload);
    return () => {
      window.removeEventListener('focus', reload);
      window.removeEventListener('garage-charge-rates-changed', reload);
    };
  }, [reload]);
  return { rates, loading, error, reload };
}
