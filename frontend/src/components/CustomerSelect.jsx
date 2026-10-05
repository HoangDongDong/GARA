import { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { filterCustomers } from '../utils/customerSearch';
import './CustomerSelect.css';

const customerLabel = (customer) => [customer.MAKHACH, customer.NAME, customer.DIENTHOAI].filter(Boolean).join(' - ');

const CustomerSelect = forwardRef(function CustomerSelect({ customers, value, onChange }, ref) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const selected = customers.find((customer) => String(customer.ID) === String(value));
  const options = useMemo(() => [
    { ID: '', label: 'Khách lẻ' },
    ...filterCustomers(customers, search).map((customer) => ({ ID: customer.ID, label: customerLabel(customer) })),
  ], [customers, search]);

  const openList = () => {
    setSearch('');
    setActiveIndex(0);
    setOpen(true);
    inputRef.current?.focus();
  };
  useImperativeHandle(ref, () => ({ open: openList }));

  const choose = (option) => {
    onChange(option.ID);
    setOpen(false);
    setSearch('');
  };
  const move = (index) => {
    setActiveIndex(index);
    listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <div className="customer-select" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setSearch(''); }
    }}>
      <input ref={inputRef} className="pos-form-input" role="combobox" aria-label="Tìm và chọn khách hàng"
        aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off" placeholder={open ? 'Tên, mã khách, số điện thoại...' : 'Khách lẻ'}
        value={open ? search : selected ? customerLabel(selected) : 'Khách lẻ'}
        onFocus={() => { if (!open) openList(); }}
        onClick={() => { if (!open) openList(); }}
        onChange={(event) => { setSearch(event.target.value); setActiveIndex(0); setOpen(true); if (listRef.current) listRef.current.scrollTop = 0; }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setSearch(''); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) openList();
            else move(Math.max(0, Math.min(options.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1))));
          }
          if (event.key === 'Enter' && open) { event.preventDefault(); choose(options[activeIndex]); }
        }}
      />
      <button type="button" className="customer-select-toggle" tabIndex={-1} aria-label="Mở danh sách khách hàng"
        onMouseDown={(event) => event.preventDefault()} onClick={() => { if (open) { setOpen(false); setSearch(''); } else openList(); }}>
        <ChevronDown size={15} />
      </button>
      {open && <div className="customer-select-dropdown">
        <div ref={listRef} id={listId} role="listbox" aria-label="Danh sách khách hàng" className="customer-select-options">
          {options.map((option, index) => <div key={option.ID} id={`${listId}-${index}`} role="option"
            aria-selected={String(value) === String(option.ID)}
            className={`customer-select-option${activeIndex === index ? ' active' : ''}`}
            onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)}>
            {option.label}
          </div>)}
        </div>
        {options.length === 1 && <div className="customer-select-empty" role="status">Không tìm thấy khách hàng phù hợp</div>}
      </div>}
    </div>
  );
});

export default CustomerSelect;
