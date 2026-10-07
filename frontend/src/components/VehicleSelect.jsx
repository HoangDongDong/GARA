import { useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './VehicleSelect.css';

const vehicleLabel = (vehicle) => `${vehicle.BIENSO || ''} - ${vehicle.TEN_KH || 'Chưa có chủ xe'}`;
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]/g, '');

export default function VehicleSelect({ vehicles, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const selected = vehicles.find((vehicle) => String(vehicle.ID) === String(value));
  const options = useMemo(() => {
    const query = normalize(search);
    return vehicles.filter((vehicle) => !query || normalize(vehicleLabel(vehicle)).includes(query));
  }, [vehicles, search]);
  const close = () => { setOpen(false); setSearch(''); };
  const openList = () => {
    setSearch('');
    setActiveIndex(0);
    setOpen(true);
    inputRef.current?.focus();
  };
  const choose = (vehicle) => {
    if (!vehicle) return;
    onChange(vehicle.ID);
    close();
  };

  return (
    <div className="repair-vehicle-select" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) close();
    }}>
      <input ref={inputRef} role="combobox" aria-label="Tìm và chọn xe"
        aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off" placeholder={open ? 'Nhập biển số hoặc tên khách hàng...' : '-- Chọn xe --'}
        value={open ? search : selected ? vehicleLabel(selected) : ''}
        onFocus={() => { if (!open) openList(); }}
        onClick={() => { if (!open) openList(); }}
        onChange={(event) => {
          setSearch(event.target.value); setActiveIndex(0); setOpen(true);
          if (listRef.current) listRef.current.scrollTop = 0;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); close(); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) openList();
            else if (options.length) {
              const index = Math.max(0, Math.min(options.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1)));
              setActiveIndex(index);
              listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
            }
          }
          if (event.key === 'Enter' && open) { event.preventDefault(); choose(options[activeIndex]); }
        }}
      />
      <button type="button" className="repair-vehicle-select-toggle" tabIndex={-1} aria-label="Mở danh sách xe"
        onMouseDown={(event) => event.preventDefault()} onClick={() => { if (open) close(); else openList(); }}>
        <ChevronDown size={15} />
      </button>
      {open && <div className="repair-vehicle-select-dropdown">
        <div ref={listRef} id={listId} role="listbox" aria-label="Danh sách xe" className="repair-vehicle-select-options">
          {options.map((vehicle, index) => <div key={vehicle.ID} id={`${listId}-${index}`} role="option"
            aria-selected={String(value) === String(vehicle.ID)}
            className={`repair-vehicle-select-option${activeIndex === index ? ' active' : ''}`}
            onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(vehicle)}>
            {vehicleLabel(vehicle)}
          </div>)}
        </div>
        {!options.length && <div className="repair-vehicle-select-empty" role="status">Không tìm thấy xe phù hợp</div>}
      </div>}
    </div>
  );
}
