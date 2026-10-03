import { useState, useEffect, useRef } from 'react';
import './GlobalNumberPreview.css';

// Thêm dấu phẩy phân tách 3 chữ số hàng nghìn liên tục (100000 -> 100,000)
function formatWithCommas(val) {
  if (val === null || val === undefined || val === '') return '';
  const clean = String(val).replace(/,/g, '').trim();
  if (!clean || isNaN(Number(clean))) return '';

  const isNegative = clean.startsWith('-');
  const absClean = isNegative ? clean.slice(1) : clean;
  const parts = absClean.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (isNegative ? '-' : '') + parts.join('.');
}

// Đọc số tiền thành chữ tiếng Việt chuẩn xác
const UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(triplet, showZeroHundred = false) {
  const h = Math.floor(triplet / 100);
  const t = Math.floor((triplet % 100) / 10);
  const u = triplet % 10;
  if (triplet === 0) return '';
  let res = '';
  if (h > 0 || showZeroHundred) {
    res += DIGITS[h] + ' trăm ';
  }
  if (t === 0 && u > 0 && (h > 0 || showZeroHundred)) {
    res += 'lẻ ';
  } else if (t === 1) {
    res += 'mười ';
  } else if (t > 1) {
    res += DIGITS[t] + ' mươi ';
  }
  if (u === 1 && t > 1) {
    res += 'mốt';
  } else if (u === 5 && t >= 1) {
    res += 'lăm';
  } else if (u > 0 || (t === 0 && h === 0 && !showZeroHundred)) {
    if (u > 0) res += DIGITS[u];
  }
  return res.trim();
}

function readVietnameseNumber(n) {
  const num = Math.floor(Math.abs(Number(n)));
  if (isNaN(num) || num < 1000) return '';
  if (num > 999999999999999) return '';
  let str = String(num);
  const groups = [];
  while (str.length > 0) {
    groups.unshift(parseInt(str.slice(-3), 10));
    str = str.slice(0, -3);
  }
  const words = [];
  for (let i = 0; i < groups.length; i++) {
    const val = groups[i];
    const unitIndex = groups.length - 1 - i;
    if (val > 0) {
      const read = readThreeDigits(val, i > 0);
      words.push(read + (UNITS[unitIndex] ? ' ' + UNITS[unitIndex] : ''));
    }
  }
  const result = words.join(' ').trim();
  if (!result) return '';
  return (result.charAt(0).toUpperCase() + result.slice(1) + ' đồng').replace(/\s+/g, ' ');
}

// Kiểm tra xem ô input có phải là ô nhập số / tiền / số lượng không
function isTargetNumericInput(input) {
  if (!input || input.tagName !== 'INPUT') return false;
  if (input.readOnly || input.disabled) return false;

  const type = (input.type || 'text').toLowerCase();
  // Loại trừ các type rõ ràng không phải tiền/số
  if (['checkbox', 'radio', 'file', 'password', 'email', 'date', 'time', 'datetime-local', 'color', 'submit', 'button'].includes(type)) {
    return false;
  }

  // Loại trừ số điện thoại, biển số, mã vạch, tìm kiếm chung
  const metaText = [
    input.name,
    input.id,
    input.placeholder,
    input.className,
    input.getAttribute('aria-label')
  ].filter(Boolean).join(' ').toLowerCase();

  if (
    metaText.includes('phone') ||
    metaText.includes('dienthoai') ||
    metaText.includes('sdt') ||
    metaText.includes('bienso') ||
    metaText.includes('plate') ||
    metaText.includes('barcode') ||
    metaText.includes('sokhung') ||
    metaText.includes('somay') ||
    metaText.includes('vin') ||
    metaText.includes('timkiem') ||
    metaText.includes('search') ||
    metaText.includes('password')
  ) {
    return false;
  }

  // Các trường hợp chắc chắn là số
  if (type === 'number') return true;
  if (input.inputMode === 'numeric' || input.inputMode === 'decimal') return true;

  // Hoặc giá trị đang gõ là chuỗi số (có thể có dấu phẩy / chấm)
  const val = String(input.value || '').replace(/,/g, '').trim();
  if (val.length >= 1 && /^-?\d+(\.\d*)?$/.test(val)) {
    return true;
  }

  return false;
}

export default function GlobalNumberPreview() {
  const [tooltip, setTooltip] = useState({
    visible: false,
    formatted: '',
    words: '',
    top: 0,
    left: 0,
    placement: 'bottom',
  });

  const activeInputRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  useEffect(() => {
    const updatePreview = (input) => {
      if (!isTargetNumericInput(input)) {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const rawVal = input.value;
      if (rawVal === '' || rawVal === null || rawVal === undefined) {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const clean = String(rawVal).replace(/,/g, '').trim();
      if (!clean || isNaN(Number(clean))) {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const formatted = formatWithCommas(clean);
      const words = readVietnameseNumber(clean);

      const rect = input.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      // Tính vị trí hiển thị: ưu tiên dưới ô input, nếu sát đáy màn hình thì hiện lên trên
      let placement = 'bottom';
      let top = rect.bottom + 5;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 240));

      if (rect.bottom + 55 > window.innerHeight) {
        placement = 'top';
        top = Math.max(5, rect.top - (words ? 44 : 32));
      }

      setTooltip({
        visible: true,
        formatted,
        words,
        top,
        left,
        placement,
      });
    };

    const handleFocusIn = (e) => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      if (isTargetNumericInput(e.target)) {
        activeInputRef.current = e.target;
        updatePreview(e.target);
      }
    };

    const handleInput = (e) => {
      if (isTargetNumericInput(e.target)) {
        activeInputRef.current = e.target;
        updatePreview(e.target);
      }
    };

    const handleFocusOut = () => {
      blurTimeoutRef.current = setTimeout(() => {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        activeInputRef.current = null;
      }, 140);
    };

    const handleReposition = () => {
      if (activeInputRef.current) {
        updatePreview(activeInputRef.current);
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('input', handleInput, true);
    document.addEventListener('keyup', handleInput, true);
    document.addEventListener('focusout', handleFocusOut, true);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('keyup', handleInput, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition, true);
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  if (!tooltip.visible || !tooltip.formatted) return null;

  return (
    <div
      className={`global-number-preview-bubble placement-${tooltip.placement}`}
      style={{
        top: tooltip.top,
        left: tooltip.left,
      }}
    >
      <div className="global-number-preview-val">
        <span>{tooltip.formatted}</span>
      </div>
      {tooltip.words && (
        <div className="global-number-preview-words">
          {tooltip.words}
        </div>
      )}
    </div>
  );
}
