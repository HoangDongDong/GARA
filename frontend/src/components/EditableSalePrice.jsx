import { useState } from 'react';

export default function EditableSalePrice({ value, name, disabled, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [original, setOriginal] = useState(value);
  if (!editing) return <button type="button" className="pos-price-display" disabled={disabled}
    title="Bấm để sửa đơn giá" aria-label={`Sửa đơn giá ${name}`}
    onClick={() => { setOriginal(value); setDraft(String(value)); setEditing(true); }}>
    {Number(value).toLocaleString('vi-VN')}
  </button>;

  const valid = /^\d+$/.test(draft) && Number.isSafeInteger(Number(draft));
  return <input autoFocus type="text" inputMode="numeric" className="pos-price-input"
    aria-label={`Đơn giá ${name}`} aria-invalid={!valid} value={draft}
    onFocus={(event) => event.target.select()} disabled={disabled}
    onChange={(event) => {
      const next = event.target.value.replace(/[.,\s₫đ]/gi, '');
      setDraft(next);
      if (/^\d+$/.test(next) && Number.isSafeInteger(Number(next))) onChange(Number(next));
    }}
    onBlur={() => { if (!valid) onChange(original); setEditing(false); }}
    onKeyDown={(event) => {
      if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); }
      if (event.key === 'Escape') { event.preventDefault(); onChange(original); setEditing(false); }
    }}
  />;
}
