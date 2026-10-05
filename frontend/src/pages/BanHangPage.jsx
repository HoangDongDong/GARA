import { openDocumentPrint } from '../components/DocumentPrintDialog';
import api from '../api';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingCart,
  Search,
  Barcode,
  FilePlus,
  ListOrdered,
  LayoutGrid,
  Cog,
  ShieldAlert,
  BatteryCharging,
  Disc,
  Droplets,
  Sparkles,
  Layers,
  FileText,
  Calendar,
  User,
  Copy,
  Plus,
  Trash2,
  CalendarDays,
  Banknote,
  Users,
  UserCheck,
  CreditCard,
  BadgeDollarSign,
  Check,
  X,
  Printer
} from 'lucide-react';
import { customers, masterData, parts, sales } from '../services';
import CustomerSelect from '../components/CustomerSelect';
import LineTaxField from '../components/LineTaxField';
import EditableSalePrice from '../components/EditableSalePrice';
import useChargeRates from '../hooks/useChargeRates';
import canEditPricing from '../utils/canEditPricing';
import { calculate, taxPolicy, discountPolicy } from '../utils/pricingPolicy';
import './BanHangPage.css';

const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const dateTime = (value) => value ? new Date(value).toLocaleString('vi-VN') : '—';

const pad = (n) => String(n).padStart(2, '0');
const defaultTicketCode = () => '';
const defaultDateStr = () => {
  const now = new Date();
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

// Danh sách phiếu bán gần đây mặc định theo mockup
const DEFAULT_RECENT_SALES = [
  { ID: 'S01', NAME: 'BH20250930-001', NGAY: '2025-09-30 14:28:00', TEN_KH: 'Khách lẻ', TONGCONG: 5340000, DATHANHTOAN: 1 },
  { ID: 'S02', NAME: 'BH20250930-002', NGAY: '2025-09-30 11:15:00', TEN_KH: 'Công ty TNHH ABC', TONGCONG: 2850000, DATHANHTOAN: 1 },
  { ID: 'S03', NAME: 'BH20250929-015', NGAY: '2025-09-29 16:40:00', TEN_KH: 'Khách lẻ', TONGCONG: 1200000, DATHANHTOAN: 1 },
  { ID: 'S04', NAME: 'BH20250928-012', NGAY: '2025-09-28 10:20:00', TEN_KH: 'Công ty TNHH XYZ', TONGCONG: 3760000, DATHANHTOAN: 1 },
];

// Map tên nhóm -> icon phù hợp (dùng cho tabs động từ DB)
const getCategoryIcon = (name = '', size = 20) => {
  const n = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('dong co') || n.includes('dong_co')) return <Cog size={size} color="#E65100" />;
  if (n.includes('gam') || n.includes('phanh')) return <ShieldAlert size={size} color="#E65100" />;
  if (n.includes('dien') || n.includes('dien tu')) return <BatteryCharging size={size} color="#E65100" />;
  if (n.includes('lop') || n.includes('ac quy') || n.includes('vỏ')) return <Disc size={size} color="#E65100" />;
  if (n.includes('dau') || n.includes('nhot')) return <Droplets size={size} color="#E65100" />;
  if (n.includes('phu kien') || n.includes('tieu hao')) return <Sparkles size={size} color="#E65100" />;
  return <MoreHorizontal size={size} color="#E65100" />;
};

export default function BanHangPage() {
  const canEditPolicy = canEditPricing('SALES');
  const chargeConfig = useChargeRates('sales');
  const [productList, setProductList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [customerGroups, setCustomerGroups] = useState([]);
  const [warehouseList, setWarehouseList] = useState([]);
  const [partCategories, setPartCategories] = useState([]);  // nhóm mặt hàng từ DB
  const [recentSales, setRecentSales] = useState(DEFAULT_RECENT_SALES);

  // Bộ lọc & tìm kiếm
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');

  // Thông tin phiếu bán
  const [saleCode, setSaleCode] = useState(defaultTicketCode);
  const [saleDate] = useState(defaultDateStr);
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [note, setNote] = useState('');

  // Giỏ hàng luôn trống khi mở trang; chỉ thêm mặt hàng do người dùng chọn.
  const [cart, setCart] = useState([]);

  // Thanh toán
  const [discountPercent, setDiscountPercent] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(0); // 0: Tiền mặt
  const [processing, setProcessing] = useState(false);

  // Modals & UI helpers
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const customerSelectRef = useRef(null);
  const [showSaleListModal, setShowSaleListModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  // Trang in HTML sinh từ chứng từ đã lưu và khổ giấy của mẫu mặc định.
  const [savedSale, setSavedSale] = useState(null);
  const [numberRefresh,setNumberRefresh]=useState(0);
  const [numberError,setNumberError]=useState('');
  useEffect(()=>{
    if(savedSale?.id)return;
    const controller=new AbortController();
    setSaleCode('');setNumberError('');
    api.get('/sales/next-number',{signal:controller.signal})
      .then(response=>{if(!controller.signal.aborted)setSaleCode(response.data.code);})
      .catch(error=>{if(!controller.signal.aborted)setNumberError(error.response?.data?.error||'Không tải được số phiếu.');});
    return()=>controller.abort();
  },[numberRefresh,savedSale?.id]);
  const [invoicePrint, setInvoicePrint] = useState({ loading: false, url: '', error: '' });
  const invoicePdfRef = useRef('');
  const invoiceGeneration = useRef(0);
  useEffect(() => () => { invoiceGeneration.current++; if (invoicePdfRef.current) URL.revokeObjectURL(invoicePdfRef.current); }, []);
  const [copiedCode, setCopiedCode] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    NAME: '', MAKHACH: '', DIENTHOAI: '', EMAIL: '', MASOTHUE: '', DIACHI: '', DNHOMKHACHHANGID: '',
  });
  const [customerFormError, setCustomerFormError] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Load dữ liệu thực từ backend API
  const loadData = async () => {
    try {
      const [productRows, customerRows, warehouses, saleRows, groupRows, categoryRows] = await Promise.all([
        parts.list().catch(() => []),
        customers.list().catch(() => []),
        masterData.warehouses().catch(() => []),
        sales.list().catch(() => []),
        masterData.customerGroups().catch(() => []),
        masterData.categories().catch(() => []),   // Nhóm mặt hàng thực từ DNHOMMATHANG
      ]);

      setCustomerList(Array.isArray(customerRows) ? customerRows : []);
      setCustomerGroups(Array.isArray(groupRows) ? groupRows : []);
      setPartCategories(Array.isArray(categoryRows) ? categoryRows : []);

      if (Array.isArray(warehouses) && warehouses.length) {
        setWarehouseList(warehouses);
        if (!warehouseId) setWarehouseId(warehouses[0].ID);
      }

      // Ảnh và thông tin mặt hàng được lấy từ database.
      if (Array.isArray(productRows) && productRows.length) {
        const enriched = productRows.map((item) => {
          return {
            ...item,
            IMAGE: Number(item.CO_ANH) === 1 ? parts.imageUrl(item.ID) : '',
            TON_KHO: Number(item.TON_KHO ?? 0),
            GIABAN: Number(item.GIABAN || 0),
          };
        });
        setProductList(enriched);
      } else {
        setProductList([]);
      }

      // Phiếu bán hàng gần đây
      if (Array.isArray(saleRows) && saleRows.length) {
        setRecentSales([...saleRows, ...DEFAULT_RECENT_SALES].slice(0, 10));
      }
    } catch (err) {
      console.error('POS loadData error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Tabs danh mục — build động từ nhóm thực trong DB
  // Nếu nhóm có SIMAGE (SVG string) thì dùng trực tiếp, không cần map tên nữa
  const categoryTabs = useMemo(() => [
    { key: 'all', label: 'Tất cả', icon: <LayoutGrid size={20} color="#E65100" />, simage: null },
    ...partCategories.map((cat) => ({
      key: cat.ID,
      label: cat.NAME,
      icon: cat.SIMAGE ? null : getCategoryIcon(cat.NAME),
      simage: cat.SIMAGE || null,
    })),
  ], [partCategories]);

  // Lọc và sắp xếp sản phẩm
  const filteredProducts = useMemo(() => {
    let list = [...productList];

    // Lọc theo từ khóa
    const kw = search.trim().toLowerCase();
    if (kw) {
      list = list.filter((p) =>
        (p.NAME || '').toLowerCase().includes(kw) ||
        (p.CODE || '').toLowerCase().includes(kw) ||
        (p.MAOEM || '').toLowerCase().includes(kw) ||
        (p.BARCODE || '').toLowerCase().includes(kw)
      );
    }

    // Lọc theo Tab Danh mục — dùng DNHOMMATHANGID thực từ DB
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.DNHOMMATHANGID === activeCategory);
    }

    // Sắp xếp
    list.sort((a, b) => {
      if (sortBy === 'name-asc') return (a.NAME || '').localeCompare(b.NAME || '', 'vi');
      if (sortBy === 'name-desc') return (b.NAME || '').localeCompare(a.NAME || '', 'vi');
      if (sortBy === 'price-asc') return Number(a.GIABAN || 0) - Number(b.GIABAN || 0);
      if (sortBy === 'price-desc') return Number(b.GIABAN || 0) - Number(a.GIABAN || 0);
      if (sortBy === 'stock-desc') return Number(b.TON_KHO || 0) - Number(a.TON_KHO || 0);
      return 0;
    });

    return list;
  }, [productList, search, activeCategory, sortBy]);

  // Tính toán tiền giỏ hàng
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.GIABAN || 0) * (item.quantity || 1), 0);
  }, [cart]);

  const selectedCustPolicy = customerList.find(customer => customer.ID === customerId);
  const appliedDiscount = discountPolicy(selectedCustPolicy, discountPercent);
  const chargeRates = savedSale ? { taxRate: savedSale.taxRate, serviceRate: savedSale.serviceRate, taxEnabled: savedSale.taxEnabled, serviceEnabled: savedSale.serviceEnabled } : chargeConfig.rates;
  const pricedCart = cart.map(item => ({...item, amount: Number(item.GIABAN || 0) * (item.quantity || 1),
    ...taxPolicy(item, chargeRates, item.TILETHUE)}));
  const chargeTotals = savedSale || calculate(pricedCart, chargeRates, appliedDiscount.discountRate);
  const discountAmount = chargeTotals.discount;
  const otherFees = chargeTotals.serviceFee;
  const taxAmount = chargeTotals.tax;
  const total = chargeTotals.total;
  useEffect(() => { setDiscountPercent(null); }, [customerId]);

  // Thêm vào giỏ
  const addProductToCart = (p) => {
    if (Number(p.TON_KHO || 0) <= 0) {
      alert(`Sản phẩm "${p.NAME}" hiện đã hết hàng trong kho!`);
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.ID === p.ID || item.CODE === p.CODE);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: (next[idx].quantity || 1) + 1 };
        return next;
      }
      return [
        ...prev,
        {
          ...p,
          ID: p.ID,
          NAME: p.NAME,
          CODE: p.CODE || p.MAOEM || '—',
          GIABAN: Number(p.GIABAN || 0),
          quantity: 1,
        },
      ];
    });
    setToastMsg(`Đã thêm "${p.NAME}" vào đơn hàng!`);
    setTimeout(() => setToastMsg(''), 2200);
  };

  const updateQuantity = (id, nextQty) => {
    if (nextQty === '') {
      setCart((prev) => prev.map((item) => (item.ID === id ? { ...item, quantity: '' } : item)));
      return;
    }
    const qty = Number(nextQty);
    if (!Number.isFinite(qty)) return;
    const validQty = Math.max(1, Math.floor(qty));
    setCart((prev) => prev.map((item) => (item.ID === id ? { ...item, quantity: validQty } : item)));
  };

  const normalizeQuantity = (id) => {
    setCart((prev) => prev.map((item) => {
      if (item.ID !== id) return item;
      const qty = Number(item.quantity);
      return { ...item, quantity: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1 };
    }));
  };

  const updatePrice = (id, price) => {
    if (!Number.isSafeInteger(price) || price < 0 || processing) return;
    setCart((prev) => prev.map((item) => item.ID === id ? { ...item, GIABAN: price } : item));
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.ID !== id));
  };

  const clearCart = () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả sản phẩm trong đơn hàng?')) {
      setCart([]);
    }
  };

  // Tạo phiếu mới
  const resetSale = () => {
    chargeConfig.reload();
    setCart([]);
    setDiscountPercent(null);
    setNote('');
    setSaleCode(defaultTicketCode());
    setSavedSale(null);
    setNumberRefresh(current=>current+1);
  };

  // Copy mã phiếu
  const copySaleCode = () => {
    navigator.clipboard.writeText(saleCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Xử lý quét barcode
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const query = barcodeInput.trim().toLowerCase();
    if (!query) return;
    const found = productList.find(
      (p) =>
        (p.BARCODE || '').toLowerCase() === query ||
        (p.CODE || '').toLowerCase() === query ||
        (p.MAOEM || '').toLowerCase() === query
    );
    if (found) {
      addProductToCart(found);
      setBarcodeInput('');
      setShowBarcodeModal(false);
    } else {
      alert(`Không tìm thấy phụ tùng có mã vạch: "${barcodeInput}"`);
    }
  };

  const openCustomerModal = () => {
    const retailGroup = customerGroups.find((group) =>
      String(group.NAME || '').toLowerCase().replace(/\s/g, '').includes('khachle')
    );
    setCustomerForm({
      NAME: '', MAKHACH: '', DIENTHOAI: '', EMAIL: '', MASOTHUE: '', DIACHI: '',
      DNHOMKHACHHANGID: retailGroup?.ID || '',
    });
    setCustomerFormError('');
    setShowCustomerModal(true);
  };

  const handleAddCustomerGroup = async () => {
    const name = window.prompt('Nhập tên nhóm khách hàng mới:');
    if (!name?.trim()) return;
    if (customerGroups.some((group) => String(group.NAME || '').trim().toLowerCase() === name.trim().toLowerCase())) {
      setCustomerFormError('Nhóm khách hàng này đã tồn tại.');
      return;
    }
    try {
      const result = await masterData.create('customer_groups', { NAME: name.trim() });
      const groups = await masterData.customerGroups();
      setCustomerGroups(Array.isArray(groups) ? groups : []);
      setCustomerForm((current) => ({ ...current, DNHOMKHACHHANGID: result?.id || '' }));
      setCustomerFormError('');
    } catch (error) {
      setCustomerFormError(error?.response?.data?.error || error.message || 'Không thể thêm nhóm khách hàng.');
    }
  };

  const handleCreateCustomer = async (event) => {
    event.preventDefault();
    if (!customerForm.NAME.trim()) {
      setCustomerFormError('Vui lòng nhập tên khách hàng.');
      return;
    }
    const code = customerForm.MAKHACH.trim().toUpperCase();
    if (code && customerList.some((customer) => String(customer.MAKHACH || '').trim().toUpperCase() === code)) {
      setCustomerFormError('Mã khách hàng đã tồn tại. Vui lòng nhập mã khác.');
      return;
    }
    setSavingCustomer(true);
    setCustomerFormError('');
    try {
      const payload = Object.fromEntries(
        Object.entries(customerForm).map(([key, value]) => [key, String(value || '').trim() || null])
      );
      const result = await customers.create(payload);
      const rows = await customers.list();
      setCustomerList(Array.isArray(rows) ? rows : []);
      setCustomerId(result?.id || '');
      setShowCustomerModal(false);
      setToastMsg(`Đã thêm khách hàng "${customerForm.NAME.trim()}" thành công.`);
      setTimeout(() => setToastMsg(''), 2500);
    } catch (error) {
      setCustomerFormError(error?.response?.data?.error || error.message || 'Không thể thêm khách hàng.');
    } finally {
      setSavingCustomer(false);
    }
  };

  const loadInvoicePrint = async (saleId) => {
    const version = ++invoiceGeneration.current;
    if (invoicePdfRef.current) URL.revokeObjectURL(invoicePdfRef.current);
    invoicePdfRef.current = '';
    setInvoicePrint({ loading: true, url: '', error: '' });
    try {
      const pdf = await sales.printPdf(saleId);
      if (version !== invoiceGeneration.current) return;
      invoicePdfRef.current = URL.createObjectURL(pdf);
      setInvoicePrint({ loading: false, url: invoicePdfRef.current, error: '' });
    } catch (error) {
      let message = error?.message || 'Không tạo được bản in.';
      const data = error?.response?.data;
      if (data instanceof Blob) {
        try { message = JSON.parse(await data.text())?.error || message; } catch { /* ignore */ }
      }
      if (typeof data === 'string') {
        try { message = JSON.parse(data)?.error || message; } catch { /* ignore */ }
      }
      if (version === invoiceGeneration.current) setInvoicePrint({ loading: false, url: '', error: message });
    }
  };

  const closeInvoiceModal = () => {
    invoiceGeneration.current++;
    if (invoicePdfRef.current) URL.revokeObjectURL(invoicePdfRef.current);
    invoicePdfRef.current = '';
    setShowInvoiceModal(false);
    setInvoicePrint({ loading: false, url: '', error: '' });
  };

  // Thanh toán: lưu phiếu -> backend render mẫu in mặc định -> xem/in
  const handleCheckout = async () => {
    if (!cart.length || processing) return;
    if (chargeConfig.loading || chargeConfig.error) {
      setToastMsg(chargeConfig.error || 'Đang tải cấu hình thuế và phí dịch vụ.');
      return;
    }
    setProcessing(true);
    try {
      const result = await sales.create({
        DKHACHHANGID: customerId || null,
        DKHOXUATID: warehouseId || null,
        NOTE: note,
        TILEGIAMGIA: discountPercent == null ? null : Number(discountPercent || 0),
        LOAITHANHTOAN: paymentMethod,
        TILETHUE: chargeRates.taxRate,
        TILEPHIDICHVU: chargeRates.serviceRate,
        items: cart.map((item) => ({ DMATHANGID: item.ID, SOLUONG: item.quantity, DONGIA: item.GIABAN, TILETHUE: item.TILETHUE })),
      });
      if (!result?.id) throw new Error('Máy chủ không trả về mã phiếu bán hàng.');
      setSavedSale({ ...result });
      setSaleCode(result.code);
      setShowInvoiceModal(true);
      loadInvoicePrint(result.id);
      await loadData();
    } catch (err) {
      console.error(err);
      setToastMsg(`Thanh toán thất bại: ${err?.response?.data?.error || err.message}`);
      setTimeout(() => setToastMsg(''), 4000);
    } finally {
      setProcessing(false);
    }
  };

  // Bắt phím F5 để thanh toán nhanh
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        if (cart.length && !processing) {
          handleCheckout();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, processing, customerId, warehouseId, note, discountPercent, paymentMethod, chargeRates.taxRate, chargeRates.serviceRate, chargeConfig.loading, chargeConfig.error]);

  const selectedCustObj = customerList.find((c) => c.ID === customerId);
  const currentSeller = (() => {
    try {
      return JSON.parse(localStorage.getItem('garage_user') || '{}').USERNAME || 'admin';
    } catch {
      return 'admin';
    }
  })();

  return (
    <div className="pos-wrapper">
      {/* 1. TOP ACTION BAR */}
      <div className="pos-top-bar">
        <div className="pos-title-badge">
          <div className="pos-title-icon">
            <ShoppingCart size={18} />
          </div>
          <span className="pos-title-text">Bán hàng (POS)</span>
        </div>

        <div className="pos-search-box">
          <input
            type="text"
            className="pos-search-input"
            placeholder="Tìm mã hàng, tên hàng, mã OEM, barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={17} className="pos-search-icon" />
        </div>

        <div className="pos-top-actions">
          <button className="btn-pos-barcode" onClick={() => setShowBarcodeModal(true)}>
            <Barcode size={17} />
            <span>Quét mã vạch</span>
          </button>

          <button className="btn-pos-white" onClick={resetSale}>
            <FilePlus size={16} color="#E65100" />
            <span>Tạo phiếu</span>
          </button>

          <button className="btn-pos-white" onClick={() => setShowSaleListModal(true)}>
            <ListOrdered size={16} color="#4b5563" />
            <span>Danh sách phiếu</span>
          </button>

          <select
            className="pos-wh-select"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            {warehouseList.length > 0 ? (
              warehouseList.map((w) => (
                <option key={w.ID} value={w.ID}>
                  Kho: {w.NAME}
                </option>
              ))
            ) : (
              <option value="">Kho: Kho chính</option>
            )}
          </select>
        </div>
      </div>

      {/* 2. CATEGORY TABS — build động từ nhóm mặt hàng trong DB */}
      <div className="pos-categories-bar">
        {categoryTabs.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <div
              key={cat.key}
              className={`pos-cat-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              <div className="pos-cat-icon">
                {cat.simage
                  ? <span dangerouslySetInnerHTML={{ __html: cat.simage }} style={{ display: 'flex', alignItems: 'center' }} />
                  : cat.icon
                }
              </div>
              <span className="pos-cat-label">{cat.label}</span>
            </div>
          );
        })}
      </div>

      {/* 3. MAIN CONTENT: 3 CỘT CHUẨN */}
      <div className="pos-content-grid">
        {/* CỘT TRÁI (4.3): DANH SÁCH SẢN PHẨM & PHIẾU BÁN GẦN ĐÂY */}
        <div className="pos-col-left">
          {/* Card: Danh sách sản phẩm */}
          <div className="pos-box pos-products-box">
            <div className="pos-box-header">
              <div className="pos-box-title">
                <Layers size={17} className="header-icon" />
                <span>Danh sách sản phẩm</span>
              </div>
              <div className="pos-sort-wrap">
                {cart.length > 0 && (
                  <button
                    type="button"
                    className="btn-quick-view-cart"
                    onClick={() => {
                      const el = document.getElementById('pos-cart-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    title="Xem chi tiết đơn hàng"
                  >
                    <ShoppingCart size={13} />
                    <span>{cart.length} món</span>
                  </button>
                )}
                <span>Sắp xếp:</span>
                <select
                  className="pos-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name-asc">Tên A-Z</option>
                  <option value="name-desc">Tên Z-A</option>
                  <option value="price-asc">Giá: Thấp &rarr; Cao</option>
                  <option value="price-desc">Giá: Cao &rarr; Thấp</option>
                  <option value="stock-desc">Tồn kho nhiều nhất</option>
                </select>
              </div>
            </div>

            <div className="pos-products-scroll">
              <div className="pos-products-grid">
                {filteredProducts.map((p) => {
                  const outOfStock = Number(p.TON_KHO || 0) <= 0;
                  return (
                    <div
                      key={p.ID || p.CODE}
                      className="pos-product-card"
                      onClick={() => addProductToCart(p)}
                      style={{ opacity: outOfStock ? 0.6 : 1 }}
                      title={outOfStock ? 'Hết hàng trong kho' : 'Click để thêm vào đơn hàng'}
                    >
                      <div className="pos-card-img-wrap">
                        <img
                          src={p.IMAGE || '/parts/no-image.svg'}
                          alt={p.NAME}
                          className="pos-card-img"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/parts/no-image.svg';
                          }}
                        />
                      </div>
                      <div className="pos-card-name">{p.NAME}</div>
                      <div className="pos-card-code">Mã: {p.CODE || p.MAOEM || '—'}</div>
                      <div className="pos-card-bottom">
                        <span className="pos-card-price">{money(p.GIABAN)}đ</span>
                        <span className="pos-card-stock">Tồn: {p.TON_KHO ?? 0}</span>
                      </div>
                    </div>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      color: '#9ca3af',
                      padding: '30px 0',
                    }}
                  >
                    Không tìm thấy phụ tùng phù hợp
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* CỘT GIỮA: THÔNG TIN PHIẾU, CHI TIẾT ĐƠN HÀNG, THỐNG KÊ */}
        <div className="pos-col-middle">
          {/* Box 1: Thông tin phiếu bán hàng (Dạng 2 cột gọn gàng) */}
          <div className="pos-box pos-sale-info-box">
            <div className="pos-box-header">
              <div className="pos-box-title">
                <FileText size={16} className="header-icon" />
                <span>Thông tin phiếu bán hàng</span>
              </div>
            </div>
            <div className="pos-form-compact-grid">
              <div className="pos-form-field">
                <span className="pos-form-label">Số phiếu</span>
                <div className="pos-form-input-wrap">
                  <input type="text" className="pos-form-input" value={saleCode} placeholder={numberError?'Không tải được số phiếu':'Đang tải số phiếu…'} title={savedSale?.id?'Số phiếu đã lưu':'Số dự kiến theo cấu hình; hệ thống cấp số chính thức khi lưu.'} readOnly />
                  {numberError&&<button type="button" className="btn-pos-white" title={numberError} onClick={()=>setNumberRefresh(current=>current+1)}>Thử lại</button>}
                </div>
              </div>

              <div className="pos-form-field">
                <span className="pos-form-label">Ngày bán</span>
                <div className="pos-form-input-wrap">
                  <input type="text" className="pos-form-input" value={saleDate} readOnly />
                </div>
              </div>

              <div className="pos-form-field">
                <span className="pos-form-label">Khách hàng</span>
                <div className="pos-form-input-wrap">
                  <CustomerSelect ref={customerSelectRef} customers={customerList} value={customerId} onChange={setCustomerId} />
                  <button
                    type="button"
                    className="pos-btn-compact-add"
                    onClick={openCustomerModal}
                    title="Thêm khách hàng mới"
                  >
                    <Plus size={14} strokeWidth={2.8} /> Thêm
                  </button>
                </div>
              </div>

              <div className="pos-form-field">
                <span className="pos-form-label">Người bán</span>
                <div className="pos-form-input-wrap">
                  <input type="text" className="pos-form-input" value={currentSeller} readOnly />
                </div>
              </div>

              <div className="pos-form-field full-width">
                <span className="pos-form-label">Ghi chú</span>
                <div className="pos-form-input-wrap">
                  <input
                    type="text"
                    className="pos-form-input"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Chi tiết đơn hàng (Cart Table) - ĐẶT ID VÀ KHÔNG GIAN ĐẦY ĐỦ */}
          <div id="pos-cart-section" className="pos-box pos-cart-box">
            <div className="pos-box-header">
              <div className="pos-box-title">
                <ShoppingCart size={17} className="header-icon" />
                <span>Chi tiết đơn hàng {cart.length > 0 ? `(${cart.length} món)` : ''}</span>
              </div>
              {cart.length > 0 && (
                <span className="pos-cart-badge-count">
                  Tổng SL: {cart.reduce((s, i) => s + Number(i.quantity || 1), 0)}
                </span>
              )}
            </div>

            <div className="pos-cart-table-wrap table-responsive">
              <table className="pos-cart-table">
                <thead>
                  <tr>
                    <th style={{ width: 30, textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: 120, textAlign: 'left' }}>Tên phụ tùng</th>
                    <th style={{ width: 75, textAlign: 'left' }}>Mã hàng</th>
                    <th style={{ width: 72, textAlign: 'center' }}>Số lượng</th>
                    <th style={{ width: 80, textAlign: 'right' }}>Đơn giá</th>
                    {chargeRates.taxEnabled !== false && <th style={{width: 85, textAlign: "right"}}>Thuế</th>}
                    <th style={{ width: 88, textAlign: 'right' }}>Thành tiền</th>
                    <th style={{ width: 32, textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={item.ID || idx}>
                      <td style={{ textAlign: 'center', color: '#6b7280', fontSize: '11px' }}>{idx + 1}</td>
                      <td className="pos-cart-name-cell" title={item.NAME}>
                        <div className="pos-cart-item-title">{item.NAME}</div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#374151', fontSize: '11px' }}>{item.CODE}</td>
                      <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            aria-label={`Số lượng ${item.NAME}`}
                            className="pos-qty-input"
                            value={item.quantity ?? 1}
                            onChange={(e) => updateQuantity(item.ID, e.target.value)}
                            onBlur={() => normalizeQuantity(item.ID)}
                          />
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '11.5px' }}>
                        <EditableSalePrice value={item.GIABAN} name={item.NAME} disabled={processing}
                          onChange={(price) => updatePrice(item.ID, price)} />
                      </td>
                      {chargeRates.taxEnabled !== false && <td className="pos-line-tax">
                        <LineTaxField name={item.NAME} value={item.TILETHUE} policy={pricedCart[idx]} disabled={processing || !!savedSale || !canEditPolicy}
                          onChange={value => setCart(current => current.map(row => row.ID === item.ID ? {...row,TILETHUE:value} : row))} />
                      </td>}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#E65100', fontSize: '11.5px' }}>
                        {money(Number(item.GIABAN || 0) * (item.quantity || 1))}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-remove-row"
                          onClick={() => removeFromCart(item.ID)}
                          title="Xóa phụ tùng khỏi đơn"
                        >
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td
                        colSpan={chargeRates.taxEnabled === false ? 7 : 8}
                        style={{ textAlign: 'center', color: '#9ca3af', padding: '36px 12px' }}
                      >
                        <div style={{ fontSize: '28px', marginBottom: '6px' }}>🛒</div>
                        <div style={{ fontWeight: 600, color: '#4b5563' }}>Chưa có sản phẩm nào trong đơn hàng</div>
                        <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '2px' }}>
                          Nhấp chọn phụ tùng ở danh sách bên trái hoặc quét mã vạch để thêm
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pos-cart-footer">
              <button
                className="btn-cart-add-more"
                onClick={() => {
                  const input = document.querySelector('.pos-search-input');
                  if (input) input.focus();
                }}
              >
                + Thêm hàng
              </button>
              {cart.length > 0 && (
                <button className="btn-cart-clear-all" onClick={clearCart}>
                  <Trash2 size={13} />
                  <span>Xóa tất cả</span>
                </button>
              )}
            </div>
          </div>

          {/* Thống kê nhanh */}
          <div className="pos-bottom-split">
            <div className="pos-box pos-stats-box">
              <div className="pos-box-header">
                <div className="pos-box-title">
                  <Banknote size={16} className="header-icon" />
                  <span>Thống kê nhanh</span>
                </div>
              </div>
              <div className="pos-stats-grid">
                <div className="pos-stat-item">
                  <CalendarDays size={18} className="pos-stat-icon" />
                  <span className="pos-stat-label">Hôm nay</span>
                  <span className="pos-stat-val">12</span>
                  <span className="pos-stat-sub">Đơn hàng</span>
                </div>
                <div className="pos-stat-item">
                  <Banknote size={18} className="pos-stat-icon" />
                  <span className="pos-stat-label">Tổng tiền</span>
                  <span className="pos-stat-val" style={{ fontSize: '12px' }}>
                    18.650.000đ
                  </span>
                </div>
                <div className="pos-stat-item">
                  <Users size={18} className="pos-stat-icon" />
                  <span className="pos-stat-label">Khách hàng</span>
                  <span className="pos-stat-val">8</span>
                  <span className="pos-stat-sub">Lượt mua</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* CỘT PHẢI (2.6): KHÁCH HÀNG, TỔNG TIỀN, PHƯƠNG THỨC THANH TOÁN & NÚT F5 */}
        <div className="pos-col-right">
          {/* Card: Thông tin khách hàng */}
          <div className="pos-box pos-cust-box">
            <div className="pos-box-header">
              <div className="pos-box-title">
                <UserCheck size={17} className="header-icon" />
                <span>Thông tin khách hàng</span>
              </div>
            </div>
            <div className="pos-cust-content">
              <div className="pos-cust-row">
                <User size={15} color="#4b5563" />
                <span style={{ fontWeight: 600 }}>{selectedCustObj?.NAME || 'Khách lẻ'}</span>
              </div>
              <div className="pos-cust-row phone">
                <span style={{ fontSize: 13 }}>📞</span>
                <span>{selectedCustObj?.DIENTHOAI || '-'}</span>
              </div>
              <button type="button" className="btn-cust-action" onClick={() => customerSelectRef.current?.open()}>
                <User size={14} />
                <span>Tạo / Chọn khách hàng</span>
              </button>
            </div>
          </div>

          {/* Card: Tổng tiền hàng */}
          <div className="pos-box pos-summary-box">
            <div className="pos-summary-body">
              <div className="pos-sum-row bold">
                <span>Tổng tiền hàng</span>
                <span>{money(subtotal)} đ</span>
              </div>
              <div className="pos-sum-row">
                <span>Giảm giá</span>
                <div className="pos-discount-input-wrap">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="pos-discount-input"
                    disabled={!!savedSale || !canEditPolicy}
                    value={discountPercent ?? appliedDiscount.discountRate}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                  />
                  <select className="pos-discount-select">
                    <option value="%">%</option>
                  </select>
                </div>
              </div>
              <div className="pos-sum-row">
                <span style={{ color: '#6b7280' }}>Tiền giảm</span>
                <span style={{ color: '#6b7280' }}>{money(discountAmount)} đ</span>
              </div>
              {chargeRates.serviceEnabled !== false && <div className="pos-sum-row">
                <span style={{ color: '#6b7280' }}>Phí dịch vụ ({chargeRates.serviceRate}%)</span>
                <span style={{ color: '#6b7280' }}>{money(otherFees)} đ</span>
              </div>}
              {chargeRates.taxEnabled !== false && (chargeTotals.taxGroups || []).map(group => <div className="pos-sum-row" key={group.rate}>
                <span style={{color:'#6b7280'}}>VAT {group.rate}%</span><span>{money(group.amount)} đ</span>
              </div>)}
              {chargeConfig.loading && <div role="status">Đang tải thuế và phí dịch vụ…</div>}
              {chargeConfig.error && <div role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>{chargeConfig.error} <button type="button" onClick={chargeConfig.reload}>Thử lại</button></div>}

              <hr className="pos-sum-divider" />

              <div className="pos-total-row">
                <span className="pos-total-label">Tổng thanh toán</span>
                <span className="pos-total-val">{money(total)} đ</span>
              </div>
            </div>
          </div>

          {/* Card: Phương thức thanh toán */}
          <div className="pos-box pos-payment-box">
            <div className="pos-box-header">
              <div className="pos-box-title">
                <CreditCard size={17} className="header-icon" />
                <span>Phương thức thanh toán</span>
              </div>
            </div>
            <div className="pos-payment-body">
              <label className={`pos-pm-label ${paymentMethod === 0 ? 'active' : ''}`}>
                <div className="pos-pm-left">
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethod === 0}
                    onChange={() => setPaymentMethod(0)}
                  />
                  <span>Tiền mặt</span>
                </div>
                <span className={`pos-pm-amount ${paymentMethod === 0 ? '' : 'muted'}`}>
                  {paymentMethod === 0 ? `${money(total)} đ` : '0 đ'}
                </span>
              </label>

              <label className={`pos-pm-label ${paymentMethod === 1 ? 'active' : ''}`}>
                <div className="pos-pm-left">
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethod === 1}
                    onChange={() => setPaymentMethod(1)}
                  />
                  <span>Chuyển khoản</span>
                </div>
                <span className={`pos-pm-amount ${paymentMethod === 1 ? '' : 'muted'}`}>
                  {paymentMethod === 1 ? `${money(total)} đ` : '0 đ'}
                </span>
              </label>

              <label className={`pos-pm-label ${paymentMethod === 2 ? 'active' : ''}`}>
                <div className="pos-pm-left">
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethod === 2}
                    onChange={() => setPaymentMethod(2)}
                  />
                  <span>Thẻ ngân hàng</span>
                </div>
                <span className={`pos-pm-amount ${paymentMethod === 2 ? '' : 'muted'}`}>
                  {paymentMethod === 2 ? `${money(total)} đ` : '0 đ'}
                </span>
              </label>

              <label className={`pos-pm-label ${paymentMethod === 3 ? 'active' : ''}`}>
                <div className="pos-pm-left">
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethod === 3}
                    onChange={() => setPaymentMethod(3)}
                  />
                  <span>Ví điện tử</span>
                </div>
                <span className={`pos-pm-amount ${paymentMethod === 3 ? '' : 'muted'}`}>
                  {paymentMethod === 3 ? `${money(total)} đ` : '0 đ'}
                </span>
              </label>

              <label className={`pos-pm-label ${paymentMethod === 4 ? 'active' : ''}`}>
                <div className="pos-pm-left">
                  <input
                    type="radio"
                    name="pm"
                    checked={paymentMethod === 4}
                    onChange={() => setPaymentMethod(4)}
                  />
                  <span>Thanh toán khác</span>
                </div>
                <span className={`pos-pm-amount ${paymentMethod === 4 ? '' : 'muted'}`}>
                  {paymentMethod === 4 ? `${money(total)} đ` : '0 đ'}
                </span>
              </label>
            </div>
          </div>

          {/* Nút Thanh toán F5 */}
          <button
            className="btn-pos-checkout"
            onClick={handleCheckout}
            disabled={!cart.length || processing || chargeConfig.loading || !!chargeConfig.error}
          >
            <BadgeDollarSign size={20} />
            <span>{processing ? 'Đang thanh toán...' : 'Thanh toán (F5)'}</span>
          </button>
        </div>
      </div>

      {/* ===== POPUP: QUÉT MÃ VẠCH ===== */}
      {showBarcodeModal && (
        <div className="pos-modal-overlay" onClick={() => setShowBarcodeModal(false)}>
          <div className="pos-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <h4>Quét mã vạch / Mã OEM phụ tùng</h4>
              <button className="pos-modal-close" onClick={() => setShowBarcodeModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleBarcodeSubmit}>
              <div className="pos-modal-body">
                <p style={{ fontSize: 13, color: '#4b5563' }}>
                  Quét bằng máy đọc mã vạch hoặc nhập mã phụ tùng / mã vạch rồi nhấn Enter:
                </p>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ví dụ: 90915-YZZD3, 04465-0K340, 122647..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    border: '1.5px solid #E65100',
                    borderRadius: 6,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
              <div className="pos-modal-footer">
                <button
                  type="button"
                  className="btn-pos-white"
                  onClick={() => setShowBarcodeModal(false)}
                >
                  Đóng
                </button>
                <button type="submit" className="btn-pos-barcode">
                  Thêm vào đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== POPUP: TẠO / CHỌN KHÁCH HÀNG ===== */}
      {showCustomerModal && (
        <div className="pos-modal-overlay" onClick={() => !savingCustomer && setShowCustomerModal(false)}>
          <div className="pos-modal-box" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <h4>THÊM KHÁCH HÀNG</h4>
              <button type="button" className="pos-modal-close" disabled={savingCustomer} onClick={() => setShowCustomerModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="pos-modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600 }}>
                  Tên khách hàng <span style={{ color: '#D32F2F' }}>*</span>
                  <input autoFocus value={customerForm.NAME} onChange={(e) => setCustomerForm({ ...customerForm, NAME: e.target.value })} placeholder="Nhập tên khách hàng..." style={{ marginTop: 4 }} />
                </label>

                <label style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600 }}>
                  Nhóm khách hàng
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <select value={customerForm.DNHOMKHACHHANGID} onChange={(e) => setCustomerForm({ ...customerForm, DNHOMKHACHHANGID: e.target.value })}>
                      <option value="">-- Chọn nhóm khách hàng --</option>
                      {customerGroups.map((group) => <option key={group.ID} value={group.ID}>{group.NAME}</option>)}
                    </select>
                    <button type="button" onClick={handleAddCustomerGroup} title="Thêm nhóm khách hàng" style={{ flexShrink: 0, justifyContent: 'center', padding: '0 12px', background: '#E65100', color: '#fff', border: 0, borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>＋ Thêm</button>
                  </div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600 }}>Mã khách hàng
                  <input value={customerForm.MAKHACH} onChange={(e) => setCustomerForm({ ...customerForm, MAKHACH: e.target.value })} placeholder="Ví dụ: KH001" style={{ marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 11, fontWeight: 600 }}>Số điện thoại
                  <input value={customerForm.DIENTHOAI} onChange={(e) => setCustomerForm({ ...customerForm, DIENTHOAI: e.target.value })} placeholder="Nhập số điện thoại..." style={{ marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 11, fontWeight: 600 }}>Email
                  <input type="email" value={customerForm.EMAIL} onChange={(e) => setCustomerForm({ ...customerForm, EMAIL: e.target.value })} placeholder="email@example.com" style={{ marginTop: 4 }} />
                </label>
                <label style={{ fontSize: 11, fontWeight: 600 }}>CCCD / Mã số thuế
                  <input value={customerForm.MASOTHUE} onChange={(e) => setCustomerForm({ ...customerForm, MASOTHUE: e.target.value })} placeholder="Nhập CCCD hoặc mã số thuế..." style={{ marginTop: 4 }} />
                </label>
                <label style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600 }}>Địa chỉ
                  <textarea rows={3} value={customerForm.DIACHI} onChange={(e) => setCustomerForm({ ...customerForm, DIACHI: e.target.value })} placeholder="Nhập địa chỉ..." style={{ marginTop: 4, resize: 'vertical' }} />
                </label>

                {customerFormError && <div style={{ gridColumn: '1 / -1', padding: '7px 9px', background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 4, fontSize: 11 }}>{customerFormError}</div>}
              </div>
              <div className="pos-modal-footer">
                <button type="button" className="btn-pos-white" disabled={savingCustomer} onClick={() => setShowCustomerModal(false)}>Hủy</button>
                <button type="submit" className="btn-pos-barcode" disabled={savingCustomer}>{savingCustomer ? 'Đang lưu...' : 'Thêm khách hàng'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== POPUP: DANH SÁCH TẤT CẢ PHIẾU BÁN HÀNG ===== */}
      {showSaleListModal && (
        <div className="pos-modal-overlay" onClick={() => setShowSaleListModal(false)}>
          <div
            className="pos-modal-box"
            style={{ maxWidth: 700 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header">
              <h4>Danh sách phiếu bán hàng</h4>
              <button className="pos-modal-close" onClick={() => setShowSaleListModal(false)}>
                &times;
              </button>
            </div>
            <div className="pos-modal-body" style={{ maxHeight: 380 }}>
              <table className="pos-recent-table">
                <thead>
                  <tr>
                    <th>Số phiếu</th>
                    <th>Ngày bán</th>
                    <th>Khách hàng</th>
                    <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((r, i) => (
                    <tr key={r.ID || i}>
                      <td style={{ fontWeight: 600 }}>{r.NAME}</td>
                      <td>{r.NGAY ? (r.NGAY.includes('/') ? r.NGAY : dateTime(r.NGAY)) : '30/09/2025'}</td>
                      <td>{r.TEN_KH || 'Khách lẻ'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(r.TONGCONG)}đ</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge-tag-success">Hoàn thành</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pos-modal-footer">
              <button className="btn-pos-white" onClick={() => setShowSaleListModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP: HÓA ĐƠN XUẤT SAU THANH TOÁN ===== */}
      {showInvoiceModal && (
        <div className="pos-modal-overlay" onClick={closeInvoiceModal}>
          <div
            className="pos-modal-box"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header" style={{ background: '#FFF7ED' }}>
              <h4 style={{ color: '#E65100', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={18} color="#15803d" /> Thanh toán thành công!
              </h4>
              <button className="pos-modal-close" onClick={closeInvoiceModal}>
                &times;
              </button>
            </div>
            <div className="pos-modal-body">
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 13, color: '#6b7280' }}>HÓA ĐƠN BÁN HÀNG</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{savedSale?.code || saleCode}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{saleDate}</div>
              </div>

              {invoicePrint.loading && (
                <div id="invoice-print-loading" style={{ textAlign: 'center', padding: 24, color: '#6b7280', fontSize: 13 }}>
                  Đang tạo bản in từ mẫu mặc định...
                </div>
              )}
              {invoicePrint.url && (
                <iframe
                  id="invoice-print-frame"
                  title="Bản in hóa đơn"
                  src={invoicePrint.url}
                  style={{ width: '100%', height: 460, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}
                />
              )}
              {invoicePrint.error && (
                <div id="invoice-print-error" style={{ margin: '8px 0', padding: '8px 10px', background: '#FEF2F2', color: '#B91C1C', borderRadius: 6, fontSize: 12, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span>{invoicePrint.error}</span>
                  {savedSale?.id && (
                    <button type="button" className="btn-pos-white" onClick={() => loadInvoicePrint(savedSale.id)}>Thử lại</button>
                  )}
                </div>
              )}

              {!invoicePrint.url && !invoicePrint.loading && (<>
              <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: 10, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Khách hàng:</span>
                  <b>{selectedCustObj?.NAME || 'Khách lẻ'}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Thu ngân:</span>
                  <span>{currentSeller}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Phương thức:</span>
                  <span>{paymentMethod === 0 ? 'Tiền mặt' : 'Chuyển khoản'}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '4px 0' }}>Tên hàng</th>
                      <th style={{ textAlign: 'center', width: 40 }}>SL</th>
                      <th style={{ textAlign: 'right', width: 90 }}>T.Tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '6px 0' }}>{item.NAME}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>
                          {money(Number(item.GIABAN || 0) * (item.quantity || 1))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  borderTop: '2px solid #111827',
                  paddingTop: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 15,
                  fontWeight: 800,
                  color: '#E65100',
                }}
              >
                <span>TỔNG CỘNG:</span>
                <span>{money(total)} đ</span>
              </div>
              </>)}
            </div>
            <div className="pos-modal-footer">
              <button
                id="invoice-print-button"
                className="btn-pos-white"
                disabled={invoicePrint.loading}
                onClick={() => openDocumentPrint({type:'MauHoaDonBanHang',id:savedSale?.id})}
              >
                <Printer size={15} />
                <span>In hóa đơn</span>
              </button>
              <button
                className="btn-pos-barcode"
                onClick={() => {
                  closeInvoiceModal();
                  resetSale();
                }}
              >
                Tạo đơn mới
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast thông báo thêm hàng */}
      {toastMsg && (
        <div className="pos-toast-msg">
          <Check size={16} color="#15803d" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Floating Bottom Bar trên Mobile khi có hàng trong đơn */}
      {cart.length > 0 && (
        <div className="pos-mobile-cart-bar">
          <div className="mobile-cart-info">
            <span className="mobile-cart-count">🛒 <strong>{cart.length}</strong> món</span>
            <span className="mobile-cart-total">{money(total)} đ</span>
          </div>
          <button
            type="button"
            className="mobile-cart-action-btn"
            onClick={() => {
              const el = document.getElementById('pos-cart-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Chi tiết đơn hàng &darr;
          </button>
        </div>
      )}
    </div>
  );
}
