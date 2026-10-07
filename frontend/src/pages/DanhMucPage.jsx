import { Folder, Folders, Layers, Search, Plus, Pencil, Ban, RotateCcw, Info, ChevronRight } from 'lucide-react';
import useCatalogController, { ALL, UNGROUPED } from '../hooks/useCatalogController';
import CatalogForms from '../components/CatalogForms';
import {useState} from 'react';
import Cashbook from '../components/Cashbook';
import './DanhMucPage.css';

export default function DanhMucPage() {
  const controller = useCatalogController();
  const [fundsView,setFundsView]=useState('ledger');
  const [fundsRefresh,setFundsRefresh]=useState(0);
  const { data, type, definition, group, setGroup, search, setSearch, status, setStatus, setSelectedId, shownRows, selected, notice, loading, error, saving, groupOptions, groupName, groupTitle, groupAddLabel, listTitle, selectType, openEditor, toggleActive, load } = controller;
  const isFundsLedger=type==='funds' && fundsView==='ledger';
  return (
    <div className="catalog-page">
      <header className="catalog-page-heading">
        <div className="catalog-heading-left">
          <div className="catalog-heading-icon"><Folders size={22} /></div>
          <div>
            <h1>Danh mục hệ thống</h1>
            <p>Quản lý dữ liệu dùng chung toàn diện của gara</p>
          </div>
        </div>
        <div className="catalog-heading-actions">
          <button type="button" className="catalog-secondary catalog-reset" disabled={(!isFundsLedger && loading) || saving} onClick={() => {
            if(isFundsLedger)setFundsRefresh(value=>value+1);else load(type);
          }}>
            <RotateCcw size={14} /> Tải lại
          </button>
        </div>
      </header>

      {!isFundsLedger && (loading || error || definition.available === false || definition.sourceNote) && <div className="catalog-demo-note" role={error ? 'alert' : 'status'}>
        <div className="catalog-demo-note-content"><Info size={15}/><span>{loading ? 'Đang tải dữ liệu…' : error || definition.sourceNote || 'Danh mục chưa có bảng trong database hiện tại. Đã chuẩn bị luồng tải và form nhập.'}</span></div>
      </div>}

      <div className="catalog-layout">
        <nav className="catalog-types" aria-label="Danh sách danh mục">
          <div className="catalog-panel-heading">
            <span className="catalog-panel-heading-title">Danh sách danh mục</span>
            <span className="catalog-panel-heading-badge">{Object.keys(data).length}</span>
          </div>
          <div className="catalog-types-list">
            {Object.entries(data).map(([key, item]) => (
              <button
                key={key}
                type="button"
                className={`catalog-type ${key === type ? 'is-active' : ''}`}
                aria-pressed={key === type}
                disabled={saving}
                onClick={() => selectType(key)}
              >
                <Folder size={14} className="catalog-type-icon" />
                <span className="catalog-type-text">{item.name}</span>
                {key === type && <ChevronRight size={13} className="catalog-type-arrow" />}
              </button>
            ))}
          </div>
        </nav>

        {isFundsLedger ? <Cashbook refreshKey={fundsRefresh} onManageFunds={()=>setFundsView('catalog')}/> : <section className={`catalog-workspace ${definition.simple ? 'without-groups' : ''}`}>
          {!definition.simple && (
            <aside className="catalog-groups">
              <div className="catalog-panel-heading">
                <span className="catalog-panel-heading-title">{groupTitle}</span>
              </div>
              {definition.groupResource && <div className="catalog-group-toolbar">
                <button type="button" className="catalog-secondary catalog-btn-add-group" disabled={loading || saving || !!error} onClick={() => openEditor('add-group')}>
                  <Plus size={13} /> {groupAddLabel}
                </button>
                <button
                  type="button"
                  className="catalog-secondary catalog-btn-icon"
                  aria-label={`Sửa ${groupTitle.toLowerCase()}`}
                  disabled={loading || saving || !!error || [ALL, UNGROUPED].includes(group)}
                  onClick={() => openEditor('edit-group')}
                  title="Sửa tên nhóm"
                >
                  <Pencil size={13} />
                </button>
              </div>}
              <div className="catalog-group-list">
                {groupOptions.map((item) => {
                  const label = item === ALL ? 'Tất cả' : item === UNGROUPED ? 'Chưa phân nhóm' : definition.groups.find((row) => String(row.ID) === item)?.NAME || ''; 
                  const count = definition.rows.filter((row) => (status === 'all' || row.active === (status === 'active')) && (item === ALL || row.groupId === (item === UNGROUPED ? '' : item))).length;
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`catalog-group ${group === item ? 'is-active' : ''}`}
                      aria-pressed={group === item}
                      onClick={() => { setGroup(item); setSelectedId(null); }}
                    >
                      {item === ALL ? <Layers size={14} /> : <Folder size={14} />}
                      <span className="catalog-group-label">{label}</span>
                      <small className="catalog-group-count">{count}</small>
                    </button>
                  );
                })}
              </div>
            </aside>
          )}

          <section className="catalog-records">
            <div className="catalog-panel-heading catalog-record-title">
              {type==='funds' && <button type="button" className="catalog-secondary" onClick={()=>setFundsView('ledger')}>← Sổ quỹ</button>}
              <span className="catalog-record-title-main">{listTitle}</span>
              {!definition.simple && <span className="catalog-record-title-sub">/ {groupName}</span>}
              <span className="catalog-record-count-pill">{shownRows.length} mục</span>
            </div>

            <div className="catalog-toolbar">
              <label className="catalog-search">
                <Search size={15} />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo mã, tên…"
                  aria-label="Tìm kiếm danh sách"
                />
              </label>

              <select
                className="catalog-status-select"
                value={status}
                aria-label="Trạng thái bản ghi"
                onChange={(event) => { setStatus(event.target.value); setSelectedId(null); }}
              >
                <option value="active">Đang sử dụng</option>
                <option value="inactive">Ngừng sử dụng</option>
                <option value="all">Tất cả trạng thái</option>
              </select>

              {!definition.readonly && (
                <div className="catalog-record-actions">
                  <button type="button" className="catalog-primary catalog-btn-action" disabled={loading || saving || !!error} onClick={() => openEditor('add')}>
                    <Plus size={14} /> Thêm mới
                  </button>
                  <button type="button" className="catalog-secondary catalog-btn-action" disabled={!selected || loading || saving || !!error} onClick={() => openEditor('edit')}>
                    <Pencil size={14} /> Sửa
                  </button>
                  <button type="button" className="catalog-secondary catalog-btn-action" disabled={!selected || loading || saving || !!error || definition.statusReadonly} onClick={toggleActive}>
                    {selected?.active !== false ? <Ban size={14} /> : <RotateCcw size={14} />}
                    {selected?.active !== false ? 'Ngừng sử dụng' : 'Khôi phục'}
                  </button>
                </div>
              )}
            </div>

            <div className="catalog-table-wrap">
              <table className="catalog-table">
                <thead>
                  <tr>
                    <th className="catalog-row-number">STT</th>
                    {definition.columns.map((column, idx) => (
                      <th key={column} className={`col-${idx}`}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shownRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={row.id === selected?.id ? 'is-selected' : ''}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="catalog-row-number">{index + 1}</td>
                      {row.values.map((value, i) => (
                        <td key={i} className={`col-${i} ${i === 0 ? 'col-code' : ''}`}>
                          {i === 1 ? (
                            <button type="button" className="catalog-row-select" onClick={() => setSelectedId(row.id)}>
                              {value || '—'}
                            </button>
                          ) : definition.columnFields[i] === 'STATUS' ? (
                            <span className={row.active ? 'status-pill active' : 'status-pill inactive'}>
                              {row.active ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                            </span>
                          ) : (
                            value || '—'
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!shownRows.length && (
                    <tr>
                      <td colSpan={definition.columns.length + 1} className="catalog-empty">
                        Không có dữ liệu phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="catalog-table-footer">
              <span>Hiển thị <strong>{shownRows.length}</strong> bản ghi</span>
              {notice && <span className="catalog-feedback" role="status">{notice}</span>}
              <span className="catalog-hint">Nhấp vào dòng để xem chi tiết thông tin bên dưới</span>
            </div>

            <section className="catalog-detail">
              <div className="catalog-detail-heading">
                <span>Thông tin chi tiết:</span>
                <strong>{selected?.raw.NAME || selected?.raw.BIENSO || 'Chưa chọn'}</strong>
                {selected && (
                  <span className={`detail-status-pill ${selected.active !== false ? 'active' : 'inactive'}`}>
                    {selected.active !== false ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                  </span>
                )}
              </div>
              {selected ? (
                <dl className="catalog-detail-grid">
                  {definition.columns.map((column, i) => (
                    <div key={column} className="catalog-detail-item">
                      <dt>{column}</dt>
                      <dd>
                        {definition.columnFields[i] === 'STATUS' ? (
                          selected.active ? 'Đang sử dụng' : 'Ngừng sử dụng'
                        ) : (
                          selected.values[i] || '—'
                        )}
                      </dd>
                    </div>
                  ))}
                  {!definition.simple && (
                    <div className="catalog-detail-item">
                      <dt>Trạng thái</dt>
                      <dd className={selected.active ? 'catalog-active-status' : ''}>
                        {selected.active ? 'Đang sử dụng' : 'Ngừng sử dụng'}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="catalog-empty">Chưa có bản ghi được chọn.</p>
              )}
            </section>
          </section>
        </section>}
      </div>

      <CatalogForms controller={controller}/>
    </div>
  );
}
