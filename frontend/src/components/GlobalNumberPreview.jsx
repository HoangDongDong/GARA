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

// Kiểm tra xem ô input có phải là ô BẮT BUỘC NHẬP SỐ không
// TUYỆT ĐỐI không áp dụng cho ô văn bản / chuỗi (string)
function isTargetNumericInput(input) {
  if (!input || input.tagName !== 'INPUT') return false;
  if (input.readOnly || input.disabled) return false;

  const type = (input.type || 'text').toLowerCase();

  // Loại trừ tất cả các type chuỗi / phi số
  if ([
    'text', // Mặc định type=text là chuỗi, trừ khi có đánh dấu số cụ thể bên dưới
    'password', 'email', 'date', 'time', 'datetime-local',
    'checkbox', 'radio', 'file', 'color', 'submit', 'button',
    'hidden', 'range', 'search', 'url', 'tel'
  ].includes(type) && type !== 'text') {
    return false;
  }

  // 1. Nếu là type="number" thì CHẮC CHẮN là ô bắt buộc nhập số
  if (type === 'number') {
    return true;
  }

  // 2. Nếu có inputMode được cấu hình là numeric hoặc decimal
  if (input.inputMode === 'numeric' || input.inputMode === 'decimal') {
    return true;
  }

  // 3. Nếu có data-type="number" hoặc data-numeric="true"
  if (input.dataset?.type === 'number' || input.dataset?.numeric === 'true') {
    return true;
  }

  // 4. Nếu có thuộc tính chỉ số (step hoặc min kiểu số)
  if (input.hasAttribute('step') || (input.hasAttribute('min') && !isNaN(Number(input.getAttribute('min'))))) {
    return true;
  }

  // Đối với các ô input type="text":
  // TUYỆT ĐỐI KHÔNG tự động coi là ô số chỉ vì người dùng gõ số.
  // Chỉ chấp nhận nếu ô đó thực sự là ô tiền/lượng dựa vào thuộc tính định danh:
  const metaText = [
    input.name,
    input.id,
    input.className,
    input.getAttribute('aria-label')
  ].filter(Boolean).join(' ').toLowerCase();

  // Danh sách các trường chắc chắn là chuỗi văn bản (String)
  if (
    metaText.includes('search') ||
    metaText.includes('timkiem') ||
    metaText.includes('filter') ||
    metaText.includes('note') ||
    metaText.includes('ghichu') ||
    metaText.includes('diengiai') ||
    metaText.includes('mota') ||
    metaText.includes('description') ||
    metaText.includes('address') ||
    metaText.includes('diachi') ||
    metaText.includes('name') ||
    metaText.includes('hoten') ||
    metaText.includes('ten') ||
    metaText.includes('bienso') ||
    metaText.includes('plate') ||
    metaText.includes('phone') ||
    metaText.includes('dienthoai') ||
    metaText.includes('sdt') ||
    metaText.includes('barcode') ||
    metaText.includes('sokhung') ||
    metaText.includes('somay') ||
    metaText.includes('vin') ||
    metaText.includes('sophieu') ||
    metaText.includes('maphieu') ||
    metaText.includes('sku') ||
    metaText.includes('code')
  ) {
    return false;
  }

  // Chỉ kích hoạt nếu có keyword rõ ràng của ô số
  const hasNumericMarker = (
    metaText.includes('soluong') ||
    metaText.includes('quantity') ||
    metaText.includes('dongia') ||
    metaText.includes('giaban') ||
    metaText.includes('gianhap') ||
    metaText.includes('thanhtien') ||
    metaText.includes('sotien') ||
    metaText.includes('currentkm') ||
    metaText.includes('kmhientai') ||
    metaText.includes('tamung')
  );

  return hasNumericMarker;
}

export default function GlobalNumberPreview() {
  const [tooltip, setTooltip] = useState({
    visible: false,
    formatted: '',
    top: 0,
    left: 0,
    placement: 'bottom',
  });

  const activeInputRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  useEffect(() => {
    const updatePreview = (input) => {
      // Chỉ xử lý nếu đúng là ô bắt buộc nhập số
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
      if (!clean || isNaN(Number(clean)) || !isFinite(Number(clean))) {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      const formatted = formatWithCommas(clean);

      const rect = input.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      // Vị trí hiển thị: ưu tiên dưới ô input, nếu sát đáy màn hình thì hiện lên trên
      let placement = 'bottom';
      let top = rect.bottom + 4;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 180));

      if (rect.bottom + 40 > window.innerHeight) {
        placement = 'top';
        top = Math.max(5, rect.top - 32);
      }

      setTooltip({
        visible: true,
        formatted,
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
      } else {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        activeInputRef.current = null;
      }
    };

    const handleInput = (e) => {
      if (isTargetNumericInput(e.target)) {
        activeInputRef.current = e.target;
        updatePreview(e.target);
      } else {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        activeInputRef.current = null;
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
    </div>
  );
}
