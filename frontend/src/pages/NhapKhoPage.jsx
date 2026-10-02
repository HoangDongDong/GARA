import { useEffect, useState, useMemo } from 'react';
import { 
  Package, Calendar, Plus, Barcode, FileSpreadsheet, GitFork, 
  Calculator, Search, Truck, ArrowLeft, ArrowRight, Ban, Eye, 
  Printer, CreditCard, LogOut, CheckCircle, Trash2, X, Edit,
  Building2, Hash, UserCheck, AlertCircle, FileText
} from 'lucide-react';
import { employees, inventoryReceipts, masterData, parts, suppliers as supplierApi } from '../services';
import './NhapKhoPage.css';

const EMPTY_PART_FORM = {
  NAME: '', CODE: '', BARCODE: '', MAOEM: '',
  DNHOMMATHANGID: '', DDONVITINHID: '', DHANGSANXUATID: '', DVITRIKHOID: '',
  GIANHAP: '', GIABAN: '', BAOHANH: '', TONTOITHIEU: '', TONTOIDA: '',
};

const EMPTY_SUPPLIER_FORM = {
  NAME: '', MANHACUNGCAP: '', DNHOMNHACUNGCAPID: '',
  DIENTHOAI: '', EMAIL: '', DIACHI: '', WEBSITE: '', NOTE: '',
};

const mapCatalogItem = (item) => ({
  id: item.ID,
  code: item.CODE || item.MAOEM || '—',
  name: item.NAME || '—',
  unit: item.DONVI || '—',
  unitId: item.DDONVITINHID || null,
  defaultPrice: Number(item.GIANHAP || 0),
});

export default function NhapKhoPage() {
  // Toast thông báo
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Thông tin phiếu nhập
  const [receiptInfo, setReceiptInfo] = useState({
    date: '',
    code: '',
    staff: '',
    supplier: '',
    description: '',
    warehouse: '',
    note: ''
  });

  // Danh sách nhà cung cấp
  const [suppliers, setSuppliers] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [supplierRecords, setSupplierRecords] = useState([]);
  const [employeeRecords, setEmployeeRecords] = useState([]);
  const [warehouseRecords, setWarehouseRecords] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [currentReceiptId, setCurrentReceiptId] = useState(null);
  const [savingReceipt, setSavingReceipt] = useState(false);

  // Modal thêm NCC nhanh (đồng bộ với NhaCungCapPage)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [supplierGroups, setSupplierGroups] = useState([]);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);
  const [showAddSupplierGroupModal, setShowAddSupplierGroupModal] = useState(false);
  const [newSupplierGroupName, setNewSupplierGroupName] = useState('');
  const [supplierGroupError, setSupplierGroupError] = useState('');
  const [savingSupplierGroup, setSavingSupplierGroup] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierFormError, setSupplierFormError] = useState('');

  // Modal thêm mới mặt hàng
  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [partForm, setPartForm] = useState(EMPTY_PART_FORM);
  const [partMeta, setPartMeta] = useState({ hangsx: [], vitri: [], nhom: [], dvt: [] });
  const [partFormError, setPartFormError] = useState('');
  const [savingPart, setSavingPart] = useState(false);
  const [partOptionType, setPartOptionType] = useState(null);
  const [newPartOptionName, setNewPartOptionName] = useState('');
  const [savingPartOption, setSavingPartOption] = useState(false);

  // Danh mục hàng hóa (cột bên trái) - 10 dòng chuẩn như ảnh
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogItems, setCatalogItems] = useState([]);

  // Lọc catalog
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return catalogItems;
    const q = catalogSearch.toLowerCase();
    return catalogItems.filter(item => 
      item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [catalogSearch, catalogItems]);

  // Chi tiết hàng hóa trong phiếu (cột bên phải) - Giữ chính xác dữ liệu như ảnh
  const [detailItems, setDetailItems] = useState([]);

  // Thanh thêm nhanh
  const [quickInput, setQuickInput] = useState({
    search: '',
    qty: 1,
    price: 0
  });

  // Chiết khấu, thuế, phí vận chuyển
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [productRows, supplierRows, employeeRows, warehouses, receiptRows, groupRows] = await Promise.all([
        parts.list().catch(() => []),
        supplierApi.list().catch(() => []),
        employees.list().catch(() => []),
        masterData.warehouses().catch(() => []),
        inventoryReceipts.list().catch(() => []),
        supplierApi.groups().catch(() => []),
      ]);
      const products = Array.isArray(productRows) ? productRows : [];
      const supplierData = Array.isArray(supplierRows) ? supplierRows : [];
      const employeeData = Array.isArray(employeeRows) ? employeeRows : [];
      const warehouseData = Array.isArray(warehouses) ? warehouses : [];
      const receiptData = Array.isArray(receiptRows) ? receiptRows : [];

      setCatalogItems(products.map(mapCatalogItem));
      setSupplierRecords(supplierData);
      setSupplierGroups(Array.isArray(groupRows) ? groupRows : []);
      setEmployeeRecords(employeeData);
      setWarehouseRecords(warehouseData);
      setSuppliers(supplierData.map((item) => item.NAME).filter(Boolean));
      setStaffOptions(employeeData.map((item) => item.NAME).filter(Boolean));
      setWarehouseOptions(warehouseData.map((item) => item.NAME).filter(Boolean));
      setReceipts(receiptData);

      const now = new Date();
      const dateValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const suffix = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      setCurrentReceiptId(null);
      setReceiptInfo({
        date: dateValue,
        code: `NK${dateValue.replace(/-/g, '')}-${suffix}`,
        staff: employeeData[0]?.NAME || '',
        supplier: supplierData[0]?.NAME || '',
        description: '',
        warehouse: warehouseData[0]?.NAME || '',
        note: '',
      });
      setDetailItems([]);
      setTaxAmount(0);
      setDiscountAmount(0);
      setShippingFee(0);
    };
    load().catch((error) => console.error('Load inventory receipt error', error));
  }, []);

  // Tính tổng tiền
  const goodsTotal = useMemo(() => {
    return detailItems.reduce((acc, it) => {
      const lineTotal = it.qty * it.price * (1 - (it.discount || 0) / 100);
      return acc + lineTotal;
    }, 0);
  }, [detailItems]);

  const grandTotal = goodsTotal - discountAmount + taxAmount + shippingFee;

  const applyReceipt = async (receiptId) => {
    const data = await inventoryReceipts.get(receiptId);
    const receipt = data?.receipt;
    if (!receipt) throw new Error('Không tìm thấy phiếu nhập kho');
    const receiptDate = receipt.NGAY ? new Date(receipt.NGAY) : null;
    const dateValue = receiptDate && !Number.isNaN(receiptDate.getTime())
      ? `${receiptDate.getFullYear()}-${String(receiptDate.getMonth() + 1).padStart(2, '0')}-${String(receiptDate.getDate()).padStart(2, '0')}`
      : '';
    setCurrentReceiptId(receipt.ID);
    setReceiptInfo({
      date: dateValue,
      code: receipt.NAME || '',
      staff: receipt.TEN_NHANVIEN || '',
      supplier: receipt.TEN_NCC || '',
      description: receipt.NOTE || '',
      warehouse: receipt.TEN_KHO || '',
      note: receipt.SOLOHANG || '',
    });
    setDetailItems((data.items || []).map((item) => ({
      id: item.ID,
      productId: item.DMATHANGID,
      unitId: item.DDONVITINHID || null,
      code: item.CODE || '—',
      name: item.TEN_MATHANG || '—',
      unit: item.TEN_DVT || '—',
      qty: Number(item.SOLUONG || 0),
      price: Number(item.DONGIA || 0),
      discount: 0,
    })));
    setDiscountAmount(Number(receipt.TIENGIAMGIA || 0));
    setTaxAmount(0);
    setShippingFee(0);
  };

  const prepareNewReceipt = (showNotification = true) => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const suffix = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    setCurrentReceiptId(null);
    setDetailItems([]);
    setDiscountAmount(0);
    setTaxAmount(0);
    setShippingFee(0);
    setQuickInput({ search: '', selectedItem: null, qty: 1, price: 0 });
    setReceiptInfo((current) => ({
      ...current,
      date,
      code: `NK${date.replace(/-/g, '')}-${suffix}`,
      description: '',
      note: '',
    }));
    if (showNotification) showToast('Đã khởi tạo phiếu nhập kho mới.');
  };

  const saveReceipt = async (paid) => {
    if (savingReceipt) return false;
    if (currentReceiptId) {
      if (!paid) {
        showToast('Phiếu nhập kho này đã được lưu.');
        return true;
      }
      setSavingReceipt(true);
      try {
        await inventoryReceipts.pay(currentReceiptId);
        const nextReceipts = await inventoryReceipts.list();
        setReceipts(Array.isArray(nextReceipts) ? nextReceipts : []);
        showToast('Thanh toán thành công. Phiếu không ghi công nợ.');
        return true;
      } catch (error) {
        showToast(error?.response?.data?.error || error.message || 'Không thể thanh toán phiếu.');
        return false;
      } finally {
        setSavingReceipt(false);
      }
    }

    const supplier = supplierRecords.find((item) => item.NAME === receiptInfo.supplier);
    const employee = employeeRecords.find((item) => item.NAME === receiptInfo.staff);
    const warehouse = warehouseRecords.find((item) => item.NAME === receiptInfo.warehouse);
    if (!receiptInfo.code.trim() || !receiptInfo.date || !supplier || !employee || !warehouse) {
      showToast('Vui lòng nhập đủ ngày, số phiếu, nhân viên, nhà cung cấp và kho nhập.');
      return false;
    }
    if (!detailItems.length || detailItems.some((item) => !item.productId || Number(item.qty) <= 0)) {
      showToast('Phiếu phải có ít nhất một mặt hàng hợp lệ trong danh mục.');
      return false;
    }

    setSavingReceipt(true);
    try {
      const result = await inventoryReceipts.create({
        NAME: receiptInfo.code.trim(),
        NGAY: receiptInfo.date,
        NOTE: receiptInfo.description || null,
        SOLOHANG: receiptInfo.note || null,
        DNHACUNGCAPID: supplier.ID,
        DKHOHANGID: warehouse.ID,
        DNHANVIENID: employee.ID,
        TIENHANG: goodsTotal,
        TIENGIAMGIA: Number(discountAmount || 0),
        TONGCONG: grandTotal,
        DATHANHTOAN: paid ? 1 : 0,
        items: detailItems.map((item) => ({
          DMATHANGID: item.productId,
          DDONVITINHID: item.unitId || null,
          SOLUONG: Number(item.qty || 0),
          DONGIA: Number(item.price || 0),
          THANHTIEN: Number(item.qty || 0) * Number(item.price || 0) * (1 - Number(item.discount || 0) / 100),
        })),
      });
      setCurrentReceiptId(result.id);
      const nextReceipts = await inventoryReceipts.list();
      setReceipts(Array.isArray(nextReceipts) ? nextReceipts : []);
      showToast(paid
        ? 'Tạo phiếu và thanh toán thành công. Không ghi công nợ.'
        : `Tạo phiếu thành công. Đã ghi công nợ ${formatMoney(result.debt)}.`);
      return true;
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể lưu phiếu nhập kho.');
      return false;
    } finally {
      setSavingReceipt(false);
    }
  };

  const navigateReceipt = async (direction) => {
    if (!receipts.length) return;
    const currentIndex = receipts.findIndex((item) => item.ID === currentReceiptId);
    if (currentIndex < 0) {
      try {
        await applyReceipt(receipts[0].ID);
      } catch (error) {
        showToast(error.message || 'Không thể tải phiếu nhập kho.');
      }
      return;
    }
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= receipts.length) {
      showToast(direction < 0 ? 'Đã ở phiếu mới nhất.' : 'Đã ở phiếu cũ nhất.');
      return;
    }
    try {
      await applyReceipt(receipts[nextIndex].ID);
    } catch (error) {
      showToast(error.message || 'Không thể tải phiếu nhập kho.');
    }
  };

  const searchReceipt = async () => {
    const keyword = window.prompt('Nhập số phiếu cần tìm:');
    if (!keyword?.trim()) return;
    const found = receipts.find((item) => String(item.NAME || '').toLowerCase().includes(keyword.trim().toLowerCase()));
    if (!found) {
      showToast('Không tìm thấy phiếu nhập kho.');
      return;
    }
    await applyReceipt(found.ID);
  };

  const cancelReceipt = async () => {
    if (!currentReceiptId) {
      prepareNewReceipt();
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn hủy phiếu này không?')) return;
    try {
      await inventoryReceipts.remove(currentReceiptId);
      const nextReceipts = await inventoryReceipts.list();
      const rows = Array.isArray(nextReceipts) ? nextReceipts : [];
      setReceipts(rows);
      if (rows.length) await applyReceipt(rows[0].ID);
      else prepareNewReceipt();
      showToast('Đã hủy phiếu nhập kho và cập nhật lại tồn kho.');
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Không thể hủy phiếu.');
    }
  };

  // Format số tiền
  const formatMoney = (val) => {
    return (val || 0).toLocaleString('vi-VN') + 'đ';
  };

  const formatNumber = (val) => {
    return (val || 0).toLocaleString('vi-VN');
  };

  // Chọn từ catalog bên trái để thêm vào phiếu
  const handleSelectFromCatalog = (item) => {
    setQuickInput({
      search: `${item.code} - ${item.name}`,
      selectedItem: item,
      qty: 1,
      price: item.defaultPrice
    });
  };

  // Thêm nhanh vào bảng chi tiết
  const handleAddQuickItem = () => {
    if (!quickInput.search.trim()) {
      showToast('Vui lòng chọn hoặc nhập tên mặt hàng!');
      return;
    }
    const found = quickInput.selectedItem || catalogItems.find(
      c => quickInput.search.toLowerCase().includes(c.code.toLowerCase()) ||
           quickInput.search.toLowerCase().includes(c.name.toLowerCase())
    );

    if (!found) {
      showToast('Vui lòng chọn mặt hàng có trong danh mục!');
      return;
    }

    const quantity = Number(quickInput.qty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      showToast('Số lượng phải lớn hơn 0!');
      return;
    }

    const newItem = {
      id: Date.now(),
      productId: found.id,
      unitId: found.unitId || null,
      code: found.code,
      name: found.name,
      unit: found.unit,
      qty: quantity,
      price: Number(quickInput.price) || found.defaultPrice || 0,
      discount: 0
    };

    const existingItem = detailItems.find((item) => item.productId === newItem.productId);
    setDetailItems((prev) => existingItem
      ? prev.map((item) => item.productId === newItem.productId
        ? { ...item, qty: Number(item.qty || 0) + quantity, price: newItem.price }
        : item)
      : [...prev, newItem]);
    setQuickInput({ search: '', selectedItem: null, qty: 1, price: 0 });
    showToast(existingItem
      ? `Đã cộng thêm ${quantity} vào số lượng ${newItem.name}.`
      : `Đã thêm ${newItem.name} vào phiếu nhập!`);
  };

  const openAddPartForm = async () => {
    setPartForm({ ...EMPTY_PART_FORM });
    setPartFormError('');
    setShowAddPartModal(true);
    try {
      const meta = await parts.meta();
      setPartMeta({
        hangsx: Array.isArray(meta?.hangsx) ? meta.hangsx : [],
        vitri: Array.isArray(meta?.vitri) ? meta.vitri : [],
        nhom: Array.isArray(meta?.nhom) ? meta.nhom : [],
        dvt: Array.isArray(meta?.dvt) ? meta.dvt : [],
      });
    } catch (error) {
      setPartFormError(error?.response?.data?.error || 'Không thể tải danh mục mặt hàng.');
    }
  };

  const handleCreatePart = async (event) => {
    event.preventDefault();
    const name = partForm.NAME.trim();
    const code = partForm.CODE.trim();
    if (!name || !code) {
      setPartFormError('Vui lòng nhập tên và mã mặt hàng.');
      return;
    }
    if (catalogItems.some((item) => item.code.trim().toUpperCase() === code.toUpperCase())) {
      setPartFormError('Mã mặt hàng đã tồn tại. Vui lòng nhập mã khác.');
      return;
    }

    setSavingPart(true);
    setPartFormError('');
    try {
      const payload = {
        ...partForm,
        NAME: name,
        CODE: code,
        GIANHAP: Number(partForm.GIANHAP || 0),
        GIABAN: Number(partForm.GIABAN || 0),
        BAOHANH: Number(partForm.BAOHANH || 0),
        TONTOITHIEU: Number(partForm.TONTOITHIEU || 0),
        TONTOIDA: Number(partForm.TONTOIDA || 0),
      };
      const result = await parts.create(payload);
      const rows = await parts.list();
      const mapped = (Array.isArray(rows) ? rows : []).map(mapCatalogItem);
      setCatalogItems(mapped);
      const created = mapped.find((item) => item.id === result?.id);
      if (created) handleSelectFromCatalog(created);
      setShowAddPartModal(false);
      showToast(`Đã thêm mặt hàng ${code} - ${name}`);
    } catch (error) {
      setPartFormError(error?.response?.data?.error || error.message || 'Không thể thêm mặt hàng.');
    } finally {
      setSavingPart(false);
    }
  };

  const partOptionConfig = {
    group: { label: 'nhóm mặt hàng', resource: 'categories', metaKey: 'nhom', field: 'DNHOMMATHANGID' },
    unit: { label: 'đơn vị tính', resource: 'units', metaKey: 'dvt', field: 'DDONVITINHID' },
    manufacturer: { label: 'hãng sản xuất', resource: 'brands_parts', metaKey: 'hangsx', field: 'DHANGSANXUATID' },
    location: { label: 'vị trí kho', resource: 'locations', metaKey: 'vitri', field: 'DVITRIKHOID' },
  };

  const openAddPartOption = (type) => {
    setPartOptionType(type);
    setNewPartOptionName('');
  };

  const handleCreatePartOption = async (event) => {
    event.preventDefault();
    const config = partOptionConfig[partOptionType];
    const name = newPartOptionName.trim();
    if (!config || !name) return showToast('Vui lòng nhập tên danh mục.');
    const selectedWarehouse = warehouseRecords.find((item) => item.NAME === receiptInfo.warehouse);
    if (partOptionType === 'location' && !selectedWarehouse?.ID) return showToast('Vui lòng chọn Kho nhập trước khi thêm vị trí kho.');
    const existing = partMeta[config.metaKey].find((item) => String(item.NAME || '').trim().toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'));
    if (existing) {
      setPartForm((current) => ({ ...current, [config.field]: existing.ID }));
      setPartOptionType(null);
      return showToast(`${name} đã tồn tại và đã được chọn.`);
    }
    setSavingPartOption(true);
    try {
      const payload = { NAME: name, SORTORDER: partMeta[config.metaKey].length + 1 };
      if (partOptionType === 'location') {
        payload.DKHOHANGID = selectedWarehouse.ID;
      }
      const result = await masterData.create(config.resource, payload);
      const meta = await parts.meta();
      setPartMeta({
        hangsx: Array.isArray(meta?.hangsx) ? meta.hangsx : [],
        vitri: Array.isArray(meta?.vitri) ? meta.vitri : [],
        nhom: Array.isArray(meta?.nhom) ? meta.nhom : [],
        dvt: Array.isArray(meta?.dvt) ? meta.dvt : [],
      });
      setPartForm((current) => ({ ...current, [config.field]: result.id }));
      setPartOptionType(null);
      showToast(`Đã thêm ${config.label}: ${name}.`);
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || `Không thể thêm ${config.label}.`);
    } finally {
      setSavingPartOption(false);
    }
  };

  // Cập nhật số lượng trong bảng
  const handleUpdateQty = (id, newQty) => {
    const val = Math.max(1, parseInt(newQty) || 1);
    setDetailItems(prev => prev.map(it => it.id === id ? { ...it, qty: val } : it));
  };

  // Cập nhật đơn giá
  const handleUpdatePrice = (id, newPrice) => {
    const val = Math.max(0, parseInt(newPrice) || 0);
    setDetailItems(prev => prev.map(it => it.id === id ? { ...it, price: val } : it));
  };

  // Cập nhật giảm giá %
  const handleUpdateDiscount = (id, newDiscount) => {
    const val = Math.min(100, Math.max(0, parseInt(newDiscount) || 0));
    setDetailItems(prev => prev.map(it => it.id === id ? { ...it, discount: val } : it));
  };

  // Xóa dòng
  const handleDeleteItem = (id) => {
    setDetailItems(prev => prev.filter(it => it.id !== id));
    showToast('Đã xóa mặt hàng khỏi phiếu');
  };

  // Thêm NCC mới
  const openAddSupplierModal = async () => {
    setSupplierForm({ ...EMPTY_SUPPLIER_FORM });
    setSupplierFormError('');
    setShowAddSupplierModal(true);
    try {
      const groups = await supplierApi.groups();
      setSupplierGroups(Array.isArray(groups) ? groups : []);
    } catch (e) {
      console.error('Error fetching supplier groups', e);
    }
  };

  // Thêm nhanh nhóm nhà cung cấp
  const handleSaveSupplierGroup = async (e) => {
    if (e) e.preventDefault();
    const name = newSupplierGroupName.trim();
    if (!name) {
      setSupplierGroupError('Vui lòng nhập tên nhóm nhà cung cấp.');
      return;
    }
    if (supplierGroups.some((group) => String(group.NAME || '').trim().toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi'))) {
      setSupplierGroupError('Nhóm nhà cung cấp này đã tồn tại.');
      return;
    }

    setSavingSupplierGroup(true);
    setSupplierGroupError('');
    try {
      const res = await supplierApi.createGroup({ NAME: name });
      const nextGroups = await supplierApi.groups();
      setSupplierGroups(Array.isArray(nextGroups) ? nextGroups : []);
      if (res?.id) {
        setSupplierForm(prev => ({ ...prev, DNHOMNHACUNGCAPID: res.id }));
      }
      setShowAddSupplierGroupModal(false);
      setNewSupplierGroupName('');
      showToast(`Đã thêm nhóm "${name}"`);
    } catch (err) {
      setSupplierGroupError(err?.response?.data?.error || err.message || 'Không thể thêm nhóm nhà cung cấp');
    } finally {
      setSavingSupplierGroup(false);
    }
  };

  const handleSaveSupplier = async (e) => {
    if (e) e.preventDefault();
    const name = supplierForm.NAME.trim();
    const code = supplierForm.MANHACUNGCAP.trim();
    if (!name || !code) {
      setSupplierFormError('Vui lòng nhập tên và mã nhà cung cấp.');
      return;
    }

    const duplicate = supplierRecords.some((item) =>
      String(item.MANHACUNGCAP || '').trim().toUpperCase() === code.toUpperCase()
    );
    if (duplicate) {
      setSupplierFormError('Mã nhà cung cấp đã tồn tại. Vui lòng nhập mã khác.');
      return;
    }

    setSavingSupplier(true);
    setSupplierFormError('');
    const payload = Object.fromEntries(
      Object.entries(supplierForm).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value])
    );
    try {
      await supplierApi.create(payload);
      const supplierRows = await supplierApi.list().catch(() => []);
      const supplierData = Array.isArray(supplierRows) ? supplierRows : [];
      setSupplierRecords(supplierData);
      setSuppliers(supplierData.map((item) => item.NAME).filter(Boolean));
      setReceiptInfo(prev => ({ ...prev, supplier: name }));
      setShowAddSupplierModal(false);
      showToast(`Đã thêm nhà cung cấp "${name}" thành công!`);
    } catch (err) {
      setSupplierFormError(err?.response?.data?.error || err.message || 'Không thể lưu nhà cung cấp.');
    } finally {
      setSavingSupplier(false);
    }
  };

  // Modals phụ
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  return (
    <div className="page-responsive-container" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(4px, 0.7vh, 8px)',
      height: '100%',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
      fontSize: 'clamp(11px, 0.85vw, 13px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 20,
          background: '#2E7D32',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 600,
          fontSize: 13
        }}>
          <CheckCircle size={16} />
          {toastMessage}
        </div>
      )}

      {/* Header trang: Phiếu nhập kho */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0
      }}>
        <div style={{
          width: 26,
          height: 26,
          borderRadius: 5,
          background: '#E65100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <Package size={15} />
        </div>
        <h1 style={{ margin: 0, fontSize: 'clamp(15px, 1.2vw, 17px)', fontWeight: 700, color: '#1E293B' }}>
          Phiếu nhập kho
        </h1>
      </div>

      {/* Phần Thông tin phiếu nhập kho (2 cột: Trái ~73% thông tin, Phải ~27% Tổng cộng) */}
      <div className="nk-top-split" style={{
        display: 'flex',
        gap: 'clamp(6px, 0.8vw, 10px)',
        flexShrink: 0
      }}>
        {/* Khối bên trái: Các trường nhập liệu phiếu */}
        <div style={{
          flex: '1 1 73%',
          background: '#FFFFFF',
          borderRadius: 6,
          border: '1px solid #E0E0E0',
          padding: 'clamp(6px, 0.8vh, 8px) clamp(8px, 1vw, 12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(3px, 0.5vh, 6px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div className="nk-form-grid">
            {/* Cột 1: Ngày * */}
            <div className="nk-field-col1" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ width: 95, flexShrink: 0, color: '#333', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Ngày <span style={{ color: '#E53935' }}>*</span>
              </label>
              <input
                type="date"
                value={receiptInfo.date}
                onChange={(e) => setReceiptInfo({ ...receiptInfo, date: e.target.value })}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(26px, 3.2vh, 30px)',
                  padding: '0 6px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Cột 2: Số phiếu * */}
            <div className="nk-field-col2" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ width: 68, flexShrink: 0, color: '#333', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Số phiếu <span style={{ color: '#E53935' }}>*</span>
              </label>
              <input
                type="text"
                value={receiptInfo.code}
                onChange={(e) => setReceiptInfo({ ...receiptInfo, code: e.target.value })}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(26px, 3.2vh, 30px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#F8FAFC'
                }}
              />
            </div>

            {/* Cột 3: Nhân viên nhập * */}
            <div className="nk-field-col3" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ width: 95, flexShrink: 0, color: '#333', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Nhân viên <span style={{ color: '#E53935' }}>*</span>
              </label>
              <select
                value={receiptInfo.staff}
                onChange={(e) => setReceiptInfo({ ...receiptInfo, staff: e.target.value })}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(26px, 3.2vh, 30px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  background: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Chọn nhân viên --</option>
                {staffOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            {/* Cột 1 & 2: Nhà cung cấp * (+ Thêm) */}
            <div className="nk-field-col1-2" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ width: 95, flexShrink: 0, color: '#333', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Nhà cung cấp <span style={{ color: '#E53935' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0, alignItems: 'center' }}>
                <select
                  value={receiptInfo.supplier}
                  onChange={(e) => setReceiptInfo({ ...receiptInfo, supplier: e.target.value })}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 'clamp(26px, 3.2vh, 30px)',
                    padding: '0 6px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 4,
                    fontSize: 'inherit',
                    outline: 'none',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  title="Thêm nhanh nhà cung cấp"
                  onClick={() => openAddSupplierModal()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '0 10px',
                    height: 'clamp(26px, 3.2vh, 30px)',
                    background: '#E65100',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  + Thêm
                </button>
              </div>
            </div>

            {/* Cột 3: Kho nhập * */}
            <div className="nk-field-col3" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ width: 95, flexShrink: 0, color: '#333', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Kho nhập <span style={{ color: '#E53935' }}>*</span>
              </label>
              <select
                value={receiptInfo.warehouse}
                onChange={(e) => setReceiptInfo({ ...receiptInfo, warehouse: e.target.value })}
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(26px, 3.2vh, 30px)',
                  padding: '0 6px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  background: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Chọn kho nhập --</option>
                {warehouseOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            {/* Cột 1 & 2: Diễn giải */}
            <div className="nk-field-col1-2" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ width: 95, flexShrink: 0, color: '#333', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Diễn giải
              </label>
              <input
                type="text"
                value={receiptInfo.description}
                onChange={(e) => setReceiptInfo({ ...receiptInfo, description: e.target.value })}
                placeholder="Nhập diễn giải phiếu..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(26px, 3.2vh, 30px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Cột 3: Ghi chú */}
            <div className="nk-field-col3" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ width: 95, flexShrink: 0, color: '#333', fontWeight: 500, whiteSpace: 'nowrap' }}>
                Ghi chú
              </label>
              <input
                type="text"
                value={receiptInfo.note}
                onChange={(e) => setReceiptInfo({ ...receiptInfo, note: e.target.value })}
                placeholder="Nhập ghi chú..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: 'clamp(26px, 3.2vh, 30px)',
                  padding: '0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Hàng 4: Các nút tác vụ nhanh */}
            <div className="nk-field-actions nk-top-actions" style={{ marginTop: 2 }}>
              <button
                type="button"
                onClick={async () => {
                  const saved = await saveReceipt(false);
                  if (saved) setShowBarcodeModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 14px',
                  height: 'clamp(26px, 3.2vh, 30px)',
                  background: '#E65100',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 'inherit'
                }}
              >
                <Barcode size={15} />
                Lưu và in mã vạch
              </button>

              <button
                type="button"
                onClick={() => showToast('Đã xuất dữ liệu phiếu nhập ra file Excel!')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 12px',
                  height: 'clamp(26px, 3.2vh, 30px)',
                  background: '#FFFFFF',
                  color: '#E65100',
                  border: '1px solid #E65100',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 'inherit'
                }}
              >
                <FileSpreadsheet size={15} color="#E65100" />
                Xuất Excel
              </button>

              <button
                type="button"
                onClick={() => showToast('Đang mở chức năng chia kho chi tiết...')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 12px',
                  height: 'clamp(26px, 3.2vh, 30px)',
                  background: '#FFFFFF',
                  color: '#E65100',
                  border: '1px solid #E65100',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 'inherit'
                }}
              >
                <GitFork size={15} color="#E65100" />
                Chia kho
              </button>
            </div>
          </div>
        </div>

        {/* Khối bên phải: Tổng cộng thanh toán */}
        <div style={{
          flex: '0 0 27%',
          background: '#FFFFFF',
          borderRadius: 6,
          border: '1px solid #E0E0E0',
          padding: 'clamp(6px, 0.8vh, 8px) clamp(8px, 1vw, 12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'clamp(3px, 0.5vh, 6px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {/* Header Tổng cộng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: '#E65100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Calculator size={12} />
            </div>
            <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 'clamp(12px, 0.9vw, 13.5px)' }}>
              Tổng cộng
            </span>
          </div>

          {/* Danh sách các dòng tiền */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2px, 0.4vh, 4px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569' }}>Tiền hàng</span>
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 4,
                padding: '2px 8px',
                minWidth: 110,
                textAlign: 'right',
                fontWeight: 600,
                color: '#1E293B'
              }}>
                {formatMoney(goodsTotal)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569' }}>Giảm giá</span>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 4,
                padding: '2px 8px',
                minWidth: 110,
                textAlign: 'right',
                color: '#64748B'
              }}>
                {formatMoney(discountAmount)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569' }}>Thuế</span>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 4,
                padding: '2px 8px',
                minWidth: 110,
                textAlign: 'right',
                color: '#64748B'
              }}>
                {formatMoney(taxAmount)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569' }}>Phí vận chuyển</span>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 4,
                padding: '2px 8px',
                minWidth: 110,
                textAlign: 'right',
                color: '#64748B'
              }}>
                {formatMoney(shippingFee)}
              </div>
            </div>

            {/* Dòng Tổng cộng nổi bật */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 0',
              borderTop: '1px dashed #E2E8F0',
              borderBottom: '1px dashed #E2E8F0',
              margin: '2px 0'
            }}>
              <span style={{ fontWeight: 700, color: '#E65100' }}>Tổng cộng</span>
              <span style={{
                fontSize: 'clamp(14px, 1.1vw, 16px)',
                fontWeight: 700,
                color: '#E65100'
              }}>
                {formatMoney(grandTotal)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#475569' }}>Tiền thanh toán</span>
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 4,
                padding: '2px 8px',
                minWidth: 110,
                textAlign: 'right',
                fontWeight: 600,
                color: '#1E293B'
              }}>
                {formatMoney(grandTotal)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phần Danh sách hàng hóa nhập kho (Chiếm flex: 1 trọn vẹn chiều cao) */}
      <div className="nk-main-section" style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(3px, 0.5vh, 6px)'
      }}>
        {/* Tiêu đề mục */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            background: '#E65100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Package size={13} />
          </div>
          <span style={{ fontWeight: 700, color: '#1E293B', fontSize: 'clamp(12px, 0.9vw, 14px)' }}>
            Danh sách hàng hóa nhập kho
          </span>
        </div>

        {/* 2 bảng song song: Trái (Catalog ~35%), Phải (Chi tiết phiếu nhập ~65%) */}
        <div className="responsive-2col" style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          gap: 'clamp(6px, 0.8vw, 10px)'
        }}>
          {/* Bảng trái: Danh mục tra cứu nhanh */}
          <div className="nk-catalog-card">
            {/* Thanh tìm kiếm danh mục */}
            <div style={{
              padding: '6px 8px',
              borderBottom: '1px solid #E0E0E0',
              display: 'flex',
              alignItems: 'center',
              position: 'relative'
            }}>
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Tìm kiếm mã hàng, tên hàng..."
                style={{
                  width: '100%',
                  height: 'clamp(24px, 3vh, 28px)',
                  padding: '0 26px 0 8px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Search
                size={14}
                color="#64748B"
                style={{ position: 'absolute', right: 14, pointerEvents: 'none' }}
              />
            </div>

            {/* Bảng dữ liệu catalog */}
            <div className="table-responsive" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table style={{ width: '100%', minWidth: 260, borderCollapse: 'collapse', fontSize: 'inherit' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#FFE0B2', color: '#BF360C', fontWeight: 700 }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #FFCC80', width: '28%' }}>Mã hàng</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #FFCC80' }}>Tên hàng</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #FFCC80', width: '18%' }}>ĐVT</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((item, idx) => (
                    <tr
                      key={item.code}
                      onClick={() => handleSelectFromCatalog(item)}
                      style={{
                        background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                        borderBottom: '1px solid #F1F5F9',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FFF3E0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'}
                    >
                      <td style={{ padding: '5px 8px', fontWeight: 600, color: '#1E293B' }}>{item.code}</td>
                      <td style={{ padding: '5px 8px', color: '#334155' }}>{item.name}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748B' }}>{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Đáy bảng catalog */}
            <div style={{
              padding: '4px 8px',
              borderTop: '1px solid #E0E0E0',
              background: '#F8FAFC',
              fontSize: '11px',
              color: '#64748B',
              fontWeight: 500
            }}>
              Tổng số dòng: {filteredCatalog.length}
            </div>
          </div>

          {/* Bảng phải: Chi tiết các mặt hàng trong phiếu nhập */}
          <div className="nk-details-card">
            {/* Thanh thao tác thêm nhanh dòng sản phẩm */}
            <div className="nk-quick-input-bar">
              {/* Input tìm mã/tên hàng */}
              <div className="nk-quick-input-search">
                <input
                  type="text"
                  value={quickInput.search}
                  onChange={(e) => setQuickInput({ ...quickInput, search: e.target.value })}
                  placeholder="Tìm mã hàng / tên hàng (F3)..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddQuickItem();
                  }}
                  style={{
                    width: '100%',
                    height: 'clamp(24px, 3vh, 28px)',
                    padding: '0 26px 0 8px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 4,
                    fontSize: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Search
                  size={14}
                  color="#64748B"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
              </div>

              <div className="nk-quick-controls">
                {/* Số lượng */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#475569', whiteSpace: 'nowrap' }}>Số lượng <span style={{ color: '#E53935' }}>*</span></span>
                  <input
                    type="number"
                    min="1"
                    value={quickInput.qty}
                    onChange={(e) => setQuickInput({ ...quickInput, qty: e.target.value })}
                    style={{
                      width: 55,
                      height: 'clamp(24px, 3vh, 28px)',
                      padding: '0 6px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 4,
                      textAlign: 'center',
                      fontSize: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Đơn giá nhập */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#475569', whiteSpace: 'nowrap' }}>Đơn giá <span style={{ color: '#E53935' }}>*</span></span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={quickInput.price}
                    onChange={(e) => setQuickInput({ ...quickInput, price: e.target.value })}
                    style={{
                      width: 95,
                      height: 'clamp(24px, 3vh, 28px)',
                      padding: '0 6px',
                      border: '1px solid #CBD5E1',
                      borderRadius: 4,
                      textAlign: 'right',
                      fontSize: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Nút + Thêm */}
                <button
                  type="button"
                  onClick={handleAddQuickItem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    height: 'clamp(24px, 3vh, 28px)',
                    padding: '0 12px',
                    background: '#E65100',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    fontWeight: 600,
                    fontSize: 'inherit',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <Plus size={14} />
                  Thêm
                </button>

                {/* Nút Mở mặt hàng NCC */}
                <button
                  type="button"
                  onClick={openAddPartForm}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    height: 'clamp(24px, 3vh, 28px)',
                    padding: '0 10px',
                    background: '#FFFFFF',
                    color: '#E65100',
                    border: '1px solid #E65100',
                    borderRadius: 4,
                    fontWeight: 500,
                    fontSize: 'inherit',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <Truck size={14} />
                  Mặt hàng NCC
                </button>
              </div>
            </div>

            {/* Bảng chi tiết */}
            <div className="table-responsive" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: 'inherit' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#FFE0B2', color: '#BF360C', fontWeight: 700 }}>
                    <th style={{ padding: '6px 6px', textAlign: 'center', borderBottom: '1px solid #FFCC80', width: 40 }}>STT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #FFCC80', width: 75 }}>Mã hàng</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #FFCC80' }}>Tên mặt hàng</th>
                    <th style={{ padding: '6px 6px', textAlign: 'center', borderBottom: '1px solid #FFCC80', width: 50 }}>ĐVT</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #FFCC80', width: 75 }}>Số lượng</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #FFCC80', width: 95 }}>Đơn giá nhập</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #FFCC80', width: 75 }}>Giảm giá %</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', borderBottom: '1px solid #FFCC80', width: 105 }}>Thành tiền</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center', borderBottom: '1px solid #FFCC80', width: 35 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {detailItems.map((it, idx) => {
                    const lineTotal = it.qty * it.price * (1 - (it.discount || 0) / 100);
                    return (
                      <tr
                        key={it.id}
                        style={{
                          background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                          borderBottom: '1px solid #F1F5F9'
                        }}
                      >
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                        <td style={{ padding: '4px 8px', fontWeight: 600, color: '#1E293B' }}>{it.code}</td>
                        <td style={{ padding: '4px 8px', color: '#334155' }}>{it.name}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'center', color: '#64748B' }}>{it.unit}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'center', color: '#1E293B' }}>
                          {it.qty}
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#1E293B' }}>
                          {formatNumber(it.price)}
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'center', color: '#1E293B' }}>
                          {it.discount}
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 500, color: '#1E293B' }}>
                          {formatNumber(lineTotal)}
                        </td>
                        <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                          <button
                            type="button"
                            title="Xóa dòng"
                            onClick={() => handleDeleteItem(it.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Dòng tổng tiền góc dưới bên phải */}
            <div style={{
              padding: '6px 14px',
              borderTop: '1px solid #FFE0B2',
              background: '#FFF3E0',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 12
            }}>
              <span style={{ fontWeight: 600, color: '#BF360C' }}>Tổng tiền hàng:</span>
              <span style={{ fontSize: 'clamp(14px, 1.1vw, 17px)', fontWeight: 700, color: '#E65100' }}>
                {formatMoney(goodsTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thanh công cụ chân trang (Action Footer Bar) */}
      <div className="nk-footer-bar">
        {/* Cụm nút bên trái */}
        <div className="nk-footer-left">
          <button
            type="button"
            onClick={async () => {
              if (!currentReceiptId && detailItems.length) {
                const saved = await saveReceipt(false);
                if (saved) prepareNewReceipt(false);
                return;
              }
              prepareNewReceipt();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '0 12px',
              height: 'clamp(26px, 3.2vh, 30px)',
              background: '#E65100',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 'inherit'
            }}
          >
            <Plus size={14} />
            Tạo mới
          </button>

          <button
            type="button"
            onClick={() => navigateReceipt(1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px',
              height: 'clamp(26px, 3.2vh, 30px)',
              background: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
          >
            <ArrowLeft size={13} />
            Trước
          </button>

          <button
            type="button"
            onClick={() => navigateReceipt(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px',
              height: 'clamp(26px, 3.2vh, 30px)',
              background: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
          >
            Sau
            <ArrowRight size={13} />
          </button>

          <button
            type="button"
            onClick={searchReceipt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px',
              height: 'clamp(26px, 3.2vh, 30px)',
              background: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
          >
            <Search size={13} />
            Tìm kiếm
          </button>
        </div>

        {/* Cụm nút bên phải */}
        <div className="nk-footer-right">
          <button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 12px',
              height: 'clamp(26px, 3.2vh, 30px)',
              background: '#E65100',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 'inherit'
            }}
          >
            <CreditCard size={14} />
            Thanh toán (F12)
          </button>

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px',
              height: 'clamp(26px, 3.2vh, 30px)',
              background: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
          >
            <Eye size={13} />
            Xem in
          </button>

          <button
            type="button"
            onClick={() => {
              showToast('Đang gửi lệnh in phiếu...');
              setTimeout(() => window.print(), 300);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px',
              height: 'clamp(26px, 3.2vh, 30px)',
              background: '#FFFFFF',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
          >
            <Printer size={13} />
            In lại phiếu (Ctrl+P)
          </button>

          <button
            type="button"
            onClick={cancelReceipt}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px',
              height: 'clamp(26px, 3.2vh, 30px)',
              background: '#FFFFFF',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
          >
            <Ban size={13} />
            Hủy phiếu
          </button>

          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px',
              height: 'clamp(26px, 3.2vh, 30px)',
              background: '#FFFFFF',
              color: '#DC2626',
              border: '1px solid #FCA5A5',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 'inherit'
            }}
          >
            <LogOut size={13} />
            Thoát
          </button>
        </div>
      </div>

      {/* Modal Thêm mới mặt hàng */}
      {showAddPartModal && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingPart) setShowAddPartModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10020, padding: 16 }}
        >
          <div style={{ width: 720, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 1, background: '#E65100', color: 'white', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 700 }}><Package size={17} /> THÊM MỚI MẶT HÀNG</div>
              <button type="button" onClick={() => !savingPart && setShowAddPartModal(false)} disabled={savingPart} style={{ border: 0, background: 'transparent', color: 'white', cursor: 'pointer', display: 'flex' }}><X size={19} /></button>
            </div>

            <form onSubmit={handleCreatePart} style={{ padding: 15 }}>
              <div className="responsive-grid-2" style={{ gap: 10 }}>
                <label style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Tên mặt hàng <span style={{ color: '#D32F2F' }}>*</span>
                  <input autoFocus value={partForm.NAME} onChange={(event) => setPartForm({ ...partForm, NAME: event.target.value })} placeholder="Nhập tên mặt hàng..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Mã mặt hàng <span style={{ color: '#D32F2F' }}>*</span>
                  <input value={partForm.CODE} onChange={(event) => setPartForm({ ...partForm, CODE: event.target.value })} placeholder="Ví dụ: PT009" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Mã vạch
                  <input value={partForm.BARCODE} onChange={(event) => setPartForm({ ...partForm, BARCODE: event.target.value })} placeholder="Nhập mã vạch..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Mã OEM
                  <input value={partForm.MAOEM} onChange={(event) => setPartForm({ ...partForm, MAOEM: event.target.value })} placeholder="Nhập mã OEM..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Nhóm mặt hàng
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}><select value={partForm.DNHOMMATHANGID} onChange={(event) => setPartForm({ ...partForm, DNHOMMATHANGID: event.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, background: 'white' }}>
                    <option value="">-- Chọn nhóm mặt hàng --</option>
                    {partMeta.nhom.map((item) => <option key={item.ID} value={item.ID}>{item.NAME}</option>)}
                  </select><button type="button" onClick={() => openAddPartOption('group')} style={{ padding: '0 12px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ Thêm</button></div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Đơn vị tính
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}><select value={partForm.DDONVITINHID} onChange={(event) => setPartForm({ ...partForm, DDONVITINHID: event.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, background: 'white' }}>
                    <option value="">-- Chọn đơn vị tính --</option>
                    {partMeta.dvt.map((item) => <option key={item.ID} value={item.ID}>{item.NAME}</option>)}
                  </select><button type="button" onClick={() => openAddPartOption('unit')} style={{ padding: '0 12px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ Thêm</button></div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Hãng sản xuất
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}><select value={partForm.DHANGSANXUATID} onChange={(event) => setPartForm({ ...partForm, DHANGSANXUATID: event.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, background: 'white' }}>
                    <option value="">-- Chọn hãng sản xuất --</option>
                    {partMeta.hangsx.map((item) => <option key={item.ID} value={item.ID}>{item.NAME}</option>)}
                  </select><button type="button" onClick={() => openAddPartOption('manufacturer')} style={{ padding: '0 12px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ Thêm</button></div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Vị trí kho
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}><select value={partForm.DVITRIKHOID} onChange={(event) => setPartForm({ ...partForm, DVITRIKHOID: event.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, background: 'white' }}>
                    <option value="">-- Chọn vị trí kho --</option>
                    {partMeta.vitri.map((item) => <option key={item.ID} value={item.ID}>{item.NAME}</option>)}
                  </select><button type="button" onClick={() => openAddPartOption('location')} style={{ padding: '0 12px', border: 0, borderRadius: 4, background: '#E65100', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>＋ Thêm</button></div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Giá nhập
                  <input type="number" min="0" value={partForm.GIANHAP} onChange={(event) => setPartForm({ ...partForm, GIANHAP: event.target.value })} placeholder="0" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Giá bán
                  <input type="number" min="0" value={partForm.GIABAN} onChange={(event) => setPartForm({ ...partForm, GIABAN: event.target.value })} placeholder="0" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Bảo hành (tháng)
                  <input type="number" min="0" value={partForm.BAOHANH} onChange={(event) => setPartForm({ ...partForm, BAOHANH: event.target.value })} placeholder="0" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Tồn tối thiểu
                  <input type="number" min="0" value={partForm.TONTOITHIEU} onChange={(event) => setPartForm({ ...partForm, TONTOITHIEU: event.target.value })} placeholder="0" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                  Tồn tối đa
                  <input type="number" min="0" value={partForm.TONTOIDA} onChange={(event) => setPartForm({ ...partForm, TONTOIDA: event.target.value })} placeholder="0" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12 }} />
                </label>
              </div>

              {partFormError && <div style={{ marginTop: 10, padding: '7px 9px', background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 4, fontSize: 11 }}>{partFormError}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button type="button" onClick={() => setShowAddPartModal(false)} disabled={savingPart} style={{ padding: '6px 14px', border: '1px solid #CBD5E1', borderRadius: 4, background: 'white', color: '#475569', fontSize: 11, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={savingPart} style={{ padding: '6px 18px', border: 0, borderRadius: 4, background: '#E65100', color: 'white', fontSize: 11, fontWeight: 700, cursor: savingPart ? 'wait' : 'pointer', opacity: savingPart ? 0.7 : 1 }}>
                  {savingPart ? 'Đang lưu...' : 'Thêm mặt hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {partOptionType && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget && !savingPartOption) setPartOptionType(null); }} style={{ position: 'fixed', inset: 0, zIndex: 10040, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form onSubmit={handleCreatePartOption} style={{ width: 'min(430px, 96vw)', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 12px 36px rgba(0,0,0,0.3)' }}>
            <div style={{ background: '#E65100', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <b style={{ fontSize: 13 }}>＋ THÊM {partOptionConfig[partOptionType]?.label.toUpperCase()} MỚI</b>
              <button type="button" disabled={savingPartOption} onClick={() => setPartOptionType(null)} style={{ border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 14 }}>
              {partOptionType === 'location' && <div style={{ marginBottom: 9, padding: '7px 9px', borderRadius: 4, background: '#FFF7ED', color: '#9A3412', fontSize: 11 }}>Kho áp dụng: <b>{receiptInfo.warehouse || 'Chưa chọn kho'}</b></div>}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, fontWeight: 600, color: '#475569' }}>
                Tên {partOptionConfig[partOptionType]?.label} <span style={{ color: '#D32F2F' }}>*</span>
                <input autoFocus value={newPartOptionName} onChange={(event) => setNewPartOptionName(event.target.value)} placeholder={`Nhập tên ${partOptionConfig[partOptionType]?.label}...`} style={{ height: 34, padding: '0 9px', border: '1px solid #CBD5E1', borderRadius: 4, fontSize: 12, outlineColor: '#E65100' }} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button type="button" disabled={savingPartOption} onClick={() => setPartOptionType(null)} style={{ padding: '6px 14px', border: '1px solid #CBD5E1', borderRadius: 4, background: '#fff', color: '#475569' }}>Hủy</button>
                <button type="submit" disabled={savingPartOption} style={{ padding: '6px 16px', border: 0, borderRadius: 4, background: savingPartOption ? '#FDBA74' : '#E65100', color: '#fff', fontWeight: 700 }}>{savingPartOption ? 'Đang lưu...' : 'Thêm mới'}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal Thêm nhà cung cấp - đồng bộ với trang Nhà Cung Cấp */}
      {showAddSupplierModal && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingSupplier) setShowAddSupplierModal(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ width: 620, maxWidth: '100%', background: 'white', borderRadius: 7, overflow: 'hidden', boxShadow: '0 10px 32px rgba(0,0,0,0.25)' }}>
            <div style={{ background: '#E65100', color: 'white', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>🏢 THÊM NHÀ CUNG CẤP</div>
              <button type="button" onClick={() => setShowAddSupplierModal(false)} disabled={savingSupplier} style={{ border: 0, background: 'transparent', color: 'white', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSaveSupplier} style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                <label style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Tên nhà cung cấp <span style={{ color: '#D32F2F' }}>*</span>
                  <input autoFocus value={supplierForm.NAME} onChange={(event) => setSupplierForm({ ...supplierForm, NAME: event.target.value })} placeholder="Nhập tên nhà cung cấp..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Mã nhà cung cấp <span style={{ color: '#D32F2F' }}>*</span>
                  <input value={supplierForm.MANHACUNGCAP} onChange={(event) => setSupplierForm({ ...supplierForm, MANHACUNGCAP: event.target.value })} placeholder="Ví dụ: NCC001" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Nhóm nhà cung cấp
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    <select value={supplierForm.DNHOMNHACUNGCAPID} onChange={(event) => setSupplierForm({ ...supplierForm, DNHOMNHACUNGCAPID: event.target.value })} style={{ flex: 1, minWidth: 0, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, background: 'white' }}>
                      <option value="">-- Chọn nhóm nhà cung cấp --</option>
                      {supplierGroups.map((group) => <option key={group.ID} value={group.ID}>{group.NAME}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setNewSupplierGroupName(''); setSupplierGroupError(''); setShowAddSupplierGroupModal(true); }}
                      title="Thêm nhóm nhà cung cấp"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 10px',
                        background: '#E65100',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      + Thêm
                    </button>
                  </div>
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Số điện thoại
                  <input value={supplierForm.DIENTHOAI} onChange={(event) => setSupplierForm({ ...supplierForm, DIENTHOAI: event.target.value })} placeholder="Nhập số điện thoại..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Email
                  <input type="email" value={supplierForm.EMAIL} onChange={(event) => setSupplierForm({ ...supplierForm, EMAIL: event.target.value })} placeholder="email@example.com" style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Website
                  <input value={supplierForm.WEBSITE} onChange={(event) => setSupplierForm({ ...supplierForm, WEBSITE: event.target.value })} placeholder="https://..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Địa chỉ
                  <input value={supplierForm.DIACHI} onChange={(event) => setSupplierForm({ ...supplierForm, DIACHI: event.target.value })} placeholder="Nhập địa chỉ..." style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
                </label>

                <label style={{ gridColumn: '1 / -1', fontSize: 11, fontWeight: 600, color: '#424242' }}>
                  Ghi chú
                  <textarea value={supplierForm.NOTE} onChange={(event) => setSupplierForm({ ...supplierForm, NOTE: event.target.value })} placeholder="Nhập ghi chú..." rows={3} style={{ width: '100%', marginTop: 3, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11, resize: 'vertical' }} />
                </label>
              </div>

              {supplierFormError && <div style={{ marginTop: 10, padding: '7px 9px', background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 4, fontSize: 11 }}>{supplierFormError}</div>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button type="button" onClick={() => setShowAddSupplierModal(false)} disabled={savingSupplier} style={{ padding: '6px 14px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#424242', fontSize: 11, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={savingSupplier} style={{ padding: '6px 18px', border: 0, borderRadius: 4, background: '#E65100', color: 'white', fontSize: 11, fontWeight: 700, cursor: savingSupplier ? 'wait' : 'pointer', opacity: savingSupplier ? 0.7 : 1 }}>
                  {savingSupplier ? 'Đang lưu...' : 'Thêm nhà cung cấp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm nhóm nhà cung cấp */}
      {showAddSupplierGroupModal && (
        <div
          onMouseDown={(event) => { if (event.target === event.currentTarget && !savingSupplierGroup) setShowAddSupplierGroupModal(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ width: 410, maxWidth: '100%', background: 'white', borderRadius: 7, overflow: 'hidden', boxShadow: '0 10px 32px rgba(0,0,0,0.28)' }}>
            <div style={{ background: '#E65100', color: 'white', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>📂 THÊM NHÓM NHÀ CUNG CẤP</div>
              <button type="button" onClick={() => !savingSupplierGroup && setShowAddSupplierGroupModal(false)} disabled={savingSupplierGroup} style={{ border: 0, background: 'transparent', color: 'white', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleSaveSupplierGroup} style={{ padding: 15 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#424242' }}>
                Tên nhóm nhà cung cấp <span style={{ color: '#D32F2F' }}>*</span>
                <input autoFocus value={newSupplierGroupName} onChange={(event) => setNewSupplierGroupName(event.target.value)} placeholder="Nhập tên nhóm nhà cung cấp..." style={{ width: '100%', marginTop: 4, padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, fontSize: 11 }} />
              </label>
              {supplierGroupError && <div style={{ marginTop: 9, padding: '7px 9px', background: '#FFEBEE', color: '#C62828', border: '1px solid #FFCDD2', borderRadius: 4, fontSize: 11 }}>{supplierGroupError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 13 }}>
                <button type="button" onClick={() => setShowAddSupplierGroupModal(false)} disabled={savingSupplierGroup} style={{ padding: '6px 14px', border: '1px solid #ccc', borderRadius: 4, background: 'white', color: '#424242', fontSize: 11, cursor: 'pointer' }}>Hủy</button>
                <button type="submit" disabled={savingSupplierGroup} style={{ padding: '6px 18px', border: 0, borderRadius: 4, background: '#E65100', color: 'white', fontSize: 11, fontWeight: 700, cursor: savingSupplierGroup ? 'wait' : 'pointer', opacity: savingSupplierGroup ? 0.7 : 1 }}>
                  {savingSupplierGroup ? 'Đang lưu...' : 'Thêm nhóm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal In mã vạch */}
      {showBarcodeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 8,
            width: 520,
            padding: 20,
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Barcode size={20} color="#E65100" />
                <h3 style={{ margin: 0, fontSize: 16, color: '#1E293B' }}>In mã vạch tem phụ tùng</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#64748B', fontSize: 12, margin: '0 0 14px 0' }}>
              Phiếu nhập <b>{receiptInfo.code}</b> có {detailItems.length} mặt hàng ({detailItems.reduce((a,b)=>a+b.qty,0)} đơn vị tem).
            </p>

            <div style={{
              maxHeight: 240,
              overflowY: 'auto',
              border: '1px solid #E2E8F0',
              borderRadius: 6,
              padding: 8
            }}>
              {detailItems.slice(0, 4).map(it => (
                <div key={it.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderBottom: '1px dashed #E2E8F0'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#1E293B' }}>{it.code} - {it.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>Đơn giá: {formatMoney(it.price)} | ĐVT: {it.unit}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: 16,
                      letterSpacing: 2,
                      background: '#F1F5F9',
                      padding: '2px 6px',
                      borderRadius: 4
                    }}>
                      ||| | | |||| |
                    </div>
                    <span style={{ fontSize: 11, color: '#475569' }}>{it.qty} tem</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 4,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBarcodeModal(false);
                  showToast('Đang xuất lệnh in tới máy in mã vạch...');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 16px',
                  borderRadius: 4,
                  border: 'none',
                  background: '#E65100',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Printer size={15} />
                Bắt đầu in mã vạch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem in phiếu nhập kho */}
      {showPreviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 8,
            width: 720,
            maxHeight: '90vh',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#1E293B' }}>Xem trước mẫu in - Phiếu nhập kho</h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#E65100' }}>CÔNG TY TNHH THƯƠNG MẠI KAZUKO VIỆT NAM</h2>
                <p style={{ margin: '4px 0', fontSize: 12, color: '#64748B' }}>Đ/c: 925/15 Âu Cơ, P. Tân Sơn Nhì, Q. Tân Phú, TP.HCM - Hotline: 0917 66 4444</p>
                <h1 style={{ margin: '14px 0 4px', fontSize: 20, color: '#1E293B', fontWeight: 700 }}>PHIẾU NHẬP KHO</h1>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>Số phiếu: <b>{receiptInfo.code}</b> - Ngày: {receiptInfo.date}</p>
              </div>

              <div className="responsive-grid-2" style={{ gap: 10, fontSize: 12, marginBottom: 14 }}>
                <div><b>Nhà cung cấp:</b> {receiptInfo.supplier}</div>
                <div><b>Nhân viên nhập:</b> {receiptInfo.staff}</div>
                <div><b>Kho nhập:</b> {receiptInfo.warehouse}</div>
                <div><b>Diễn giải:</b> {receiptInfo.description}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                    <th style={{ padding: '6px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Mã hàng</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Tên mặt hàng</th>
                    <th style={{ padding: '6px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>SL</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Đơn giá</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {detailItems.map((it, idx) => (
                    <tr key={it.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '5px' }}>{it.code}</td>
                      <td style={{ padding: '5px' }}>{it.name}</td>
                      <td style={{ padding: '5px', textAlign: 'center' }}>{it.unit}</td>
                      <td style={{ padding: '5px', textAlign: 'right' }}>{it.qty}</td>
                      <td style={{ padding: '5px', textAlign: 'right' }}>{formatNumber(it.price)}</td>
                      <td style={{ padding: '5px', textAlign: 'right', fontWeight: 600 }}>{formatNumber(it.qty * it.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 13, gap: 16 }}>
                <span>Tổng tiền hàng:</span>
                <span style={{ fontWeight: 700, color: '#E65100', fontSize: 15 }}>{formatMoney(goodsTotal)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setShowPreviewModal(false);
                }}
                style={{ padding: '6px 16px', borderRadius: 4, border: 'none', background: '#E65100', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                In phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thanh toán (F12) */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 8,
            width: 460,
            padding: 20,
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={20} color="#E65100" />
                <h3 style={{ margin: 0, fontSize: 16, color: '#1E293B' }}>Xác nhận thanh toán nhập kho</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#FFF3E0', padding: 12, borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: '#BF360C' }}>Tổng số tiền cần thanh toán cho NCC:</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#E65100', marginTop: 4 }}>
                  {formatMoney(grandTotal)}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Hình thức thanh toán
                </label>
                <select style={{
                  width: '100%',
                  height: 34,
                  padding: '0 10px',
                  border: '1px solid #CBD5E1',
                  borderRadius: 4,
                  fontSize: 13,
                  outline: 'none'
                }}>
                  <option value="tm">Tiền mặt (Quỹ tiền mặt gara)</option>
                  <option value="ck">Chuyển khoản ngân hàng</option>
                  <option value="no">Ghi nhận công nợ nhà cung cấp</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                  Ghi chú thanh toán
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đã chuyển khoản theo ủy nhiệm chi..."
                  style={{
                    width: '100%',
                    height: 34,
                    padding: '0 10px',
                    border: '1px solid #CBD5E1',
                    borderRadius: 4,
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 4,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingReceipt}
                onClick={async () => {
                  const saved = await saveReceipt(true);
                  if (saved) setShowPaymentModal(false);
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 4,
                  border: 'none',
                  background: '#E65100',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  cursor: savingReceipt ? 'wait' : 'pointer',
                  opacity: savingReceipt ? 0.7 : 1
                }}
              >
                {savingReceipt ? 'Đang thanh toán...' : 'Xác nhận thanh toán'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
