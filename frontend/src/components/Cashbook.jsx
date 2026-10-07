import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {getCashbookSnapshot,loadCashbook} from '../services/cashbookData';
import {
  ChevronDown,
  ChevronRight,
  Banknote,
  Landmark,
  CreditCard,
  Layers,
  Wallet,
  AlertCircle
} from 'lucide-react';
import './Cashbook.css';

const money = (value) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
const methods = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' };
const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'});
const day = (value) =>
  value
    ? dayFormatter.format(new Date(value))
    : '';

export default function Cashbook({ refreshKey, onManageFunds }) {
  const [snapshot]=useState(getCashbookSnapshot);
  const [data, setData] = useState(snapshot?.rows || []);
  const [hasLoaded,setHasLoaded]=useState(!!snapshot);
  const mounted=useRef(true),lastLoadAt=useRef(0),loadSequence=useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [method, setMethod] = useState('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState(null);
  const [accounts, setAccounts] = useState(snapshot?.accounts || []);
  const [accountId, setAccountId] = useState('');
  const [banksExpanded, setBanksExpanded] = useState(true);

  const load = useCallback(async () => {
    const sequence=++loadSequence.current;
    lastLoadAt.current=Date.now();
    setLoading(true);
    setError('');
    try {
      const result=await loadCashbook();
      if(!mounted.current || sequence!==loadSequence.current)return;
      setData(result.rows);
      setAccounts(result.accounts);
      setHasLoaded(true);
    } catch (failure) {
      if(mounted.current && sequence===loadSequence.current)setError(failure.response?.data?.error || 'Không tải được sổ quỹ.');
    } finally {
      if(mounted.current && sequence===loadSequence.current)setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current=true;
    load();
    return()=>{mounted.current=false;};
  }, [load, refreshKey]);

  useEffect(() => {
    const refreshOnFocus=()=>{if(Date.now()-lastLoadAt.current>5000)load();};
    window.addEventListener('focus', refreshOnFocus);
    window.addEventListener('garage-cashbook-changed',load);
    return () => {window.removeEventListener('focus', refreshOnFocus);window.removeEventListener('garage-cashbook-changed',load);};
  }, [load]);

  const rows = useMemo(
    () =>
      data.filter(
        (row) =>
          (method === 'all' || row.method === method) &&
          (!accountId || (accountId === '__unassigned__' ? !row.accountId : row.accountId === accountId)) &&
          (!from || day(row.date) >= from) &&
          (!to || day(row.date) <= to) &&
          [row.code, row.description, row.partner, row.account]
            .join(' ')
            .toLocaleLowerCase('vi')
            .includes(search.trim().toLocaleLowerCase('vi'))
      ),
    [data, method, accountId, from, to, search]
  );

  const bankNodes = useMemo(() => {
    const map = new Map(accounts.map((row) => [row.ID, row]));
    for (const row of data) {
      if (row.accountId && !map.has(row.accountId)) {
        map.set(row.accountId, { ID: row.accountId, NAME: row.account || 'Tài khoản ngừng sử dụng' });
      }
    }
    return [...map.values()];
  }, [accounts, data]);

  const counts = useMemo(() => {
    const res = { all: data.length, cash: 0, transfer: 0, card: 0, byAccount: {}, unassigned: 0 };
    for (const row of data) {
      if (row.method === 'cash') {
        res.cash++;
      } else if (row.method === 'transfer') {
        res.transfer++;
        if (row.accountId) {
          res.byAccount[row.accountId] = (res.byAccount[row.accountId] || 0) + 1;
        } else {
          res.unassigned++;
        }
      } else if (row.method === 'card') {
        res.card++;
      }
    }
    return res;
  }, [data]);

  const choose = (nextMethod, nextAccount = '') => {
    setMethod(nextMethod);
    setAccountId(nextAccount);
    setSelected(null);
  };

  const income = rows.reduce((sum, row) => sum + row.income, 0);
  const expense = rows.reduce((sum, row) => sum + row.expense, 0);

  return (
    <section className="cashbook catalog-workspace without-groups" aria-label="Quỹ tiền mặt và chuyển khoản">
      <div className="cashbook-heading">
        <strong>Quỹ tiền mặt / Chuyển khoản</strong>
        <button type="button" onClick={onManageFunds}>
          Danh mục quỹ
        </button>
        <button type="button" onClick={load} disabled={loading}>
          {loading && hasLoaded?'Đang cập nhật…':'↻ Tải lại'}
        </button>
      </div>

      <div className="cashbook-layout">
        {/* Navigation Sidebar / Tree */}
        <nav className="cashbook-tree" aria-label="Chọn quỹ và tài khoản ngân hàng">
          <div className="cashbook-tree-header">
            <div className="cashbook-tree-header-title">
              <Wallet size={14} className="cashbook-tree-header-icon" />
              <span>Phân loại quỹ</span>
            </div>
            <span className="cashbook-tree-header-badge">{data.length}</span>
          </div>

          <div className="cashbook-tree-list">
            {/* Tất cả */}
            <button
              type="button"
              className={`cashbook-nav-item ${method === 'all' ? 'active' : ''}`}
              aria-pressed={method === 'all'}
              onClick={() => choose('all')}
            >
              <span className="cashbook-nav-icon is-all">
                <Layers size={14} />
              </span>
              <span className="cashbook-nav-label">Tất cả giao dịch</span>
              <span className="cashbook-nav-count">{counts.all}</span>
            </button>

            {/* Tiền mặt */}
            <button
              type="button"
              className={`cashbook-nav-item ${method === 'cash' ? 'active' : ''}`}
              aria-pressed={method === 'cash'}
              onClick={() => choose('cash')}
            >
              <span className="cashbook-nav-icon is-cash">
                <Banknote size={14} />
              </span>
              <span className="cashbook-nav-label">Tiền mặt</span>
              <span className="cashbook-nav-count">{counts.cash}</span>
            </button>

            {/* Ngân hàng */}
            <div className="cashbook-tree-group">
              <div
                className={`cashbook-nav-item cashbook-group-header ${
                  method === 'transfer' && !accountId ? 'active' : ''
                }`}
              >
                <button
                  type="button"
                  className="cashbook-group-toggle"
                  aria-label={banksExpanded ? 'Thu gọn ngân hàng' : 'Mở rộng ngân hàng'}
                  aria-expanded={banksExpanded}
                  onClick={(e) => {
                    e.stopPropagation();
                    setBanksExpanded((v) => !v);
                  }}
                >
                  {banksExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <div
                  className="cashbook-group-label-wrap"
                  onClick={() => {
                    choose('transfer');
                    setBanksExpanded(true);
                  }}
                >
                  <span className="cashbook-nav-icon is-bank">
                    <Landmark size={14} />
                  </span>
                  <span className="cashbook-nav-label">Ngân hàng</span>
                  <span className="cashbook-nav-count">{counts.transfer}</span>
                </div>
              </div>

              {/* Sub-tree ngân hàng */}
              {banksExpanded && (
                <div className="cashbook-bank-sublist">
                  {bankNodes.map((row) => {
                    const count = counts.byAccount[row.ID] || 0;
                    return (
                      <button
                        key={row.ID}
                        type="button"
                        className={`cashbook-bank-item ${accountId === row.ID ? 'active' : ''}`}
                        aria-pressed={accountId === row.ID}
                        title={[row.NAME, row.TENNGANHANG, row.SOTAIKHOAN].filter(Boolean).join(' — ')}
                        onClick={() => choose('transfer', row.ID)}
                      >
                        <span className="cashbook-sub-dot" />
                        <span className="cashbook-bank-name">{row.NAME}</span>
                        {count > 0 && <span className="cashbook-nav-count is-sub">{count}</span>}
                      </button>
                    );
                  })}

                  {data.some((row) => row.method === 'transfer' && !row.accountId) && (
                    <button
                      type="button"
                      className={`cashbook-bank-item is-unassigned ${
                        accountId === '__unassigned__' ? 'active' : ''
                      }`}
                      aria-pressed={accountId === '__unassigned__'}
                      onClick={() => choose('transfer', '__unassigned__')}
                    >
                      <span className="cashbook-sub-dot" />
                      <AlertCircle size={12} className="cashbook-unassigned-icon" />
                      <span className="cashbook-bank-name">Chưa chọn TK</span>
                      {counts.unassigned > 0 && (
                        <span className="cashbook-nav-count is-sub">{counts.unassigned}</span>
                      )}
                    </button>
                  )}

                  {!bankNodes.length && !loading && !error && (
                    <div className="cashbook-tree-empty">Chưa có tài khoản</div>
                  )}
                </div>
              )}
            </div>

            {/* Thẻ */}
            <button
              type="button"
              className={`cashbook-nav-item ${method === 'card' ? 'active' : ''}`}
              aria-pressed={method === 'card'}
              onClick={() => choose('card')}
            >
              <span className="cashbook-nav-icon is-card">
                <CreditCard size={14} />
              </span>
              <span className="cashbook-nav-label">Thẻ thanh toán</span>
              <span className="cashbook-nav-count">{counts.card}</span>
            </button>
          </div>
        </nav>

        {/* Content table area */}
        <div className="cashbook-content">
          <div className="cashbook-filters">
            <label>
              Từ ngày
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
            <input
              type="search"
              aria-label="Tìm trong sổ quỹ"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm số phiếu, diễn giải, đối tác…"
            />
          </div>

          {accountId && (
            <div className="cashbook-account-title">
              {bankNodes.find((row) => row.ID === accountId)?.NAME || 'Chưa chọn tài khoản'}
            </div>
          )}

          {error && (
            <div className="cashbook-error" role="alert">
              {error} <button type="button" onClick={load}>Thử lại</button>
            </div>
          )}

          <div className="cashbook-table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="col-stt">STT</th>
                  <th className="col-code">Số phiếu</th>
                  <th className="col-date">Ngày</th>
                  <th className="col-desc">Diễn giải</th>
                  <th className="col-partner">Đối tác</th>
                  <th className="col-method">Hình thức</th>
                  <th className="col-account">Tài khoản</th>
                  <th className="col-income number">Thu</th>
                  <th className="col-expense number">Chi</th>
                </tr>
              </thead>
              <tbody>
                {loading && !hasLoaded ? (
                  <tr>
                    <td colSpan={9} className="empty" role="status">
                      Đang tải sổ quỹ…
                    </td>
                  </tr>
                ) : hasLoaded && rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={selected === row.id ? 'selected' : ''}
                    onClick={() => setSelected(row.id)}
                  >
                    <td className="col-stt">{index + 1}</td>
                    <td className="col-code">{row.code || '—'}</td>
                    <td className="col-date">
                      {row.date
                        ? new Date(row.date).toLocaleDateString('vi-VN', { timeZone: 'Asia/Bangkok' })
                        : '—'}
                    </td>
                    <td className="col-desc" title={row.description}>{row.description || '—'}</td>
                    <td className="col-partner" title={row.partner || ''}>{row.partner || '—'}</td>
                    <td className="col-method">{methods[row.method]}</td>
                    <td className="col-account" title={row.account || ''}>{row.account || '—'}</td>
                    <td className="col-income number income">{money(row.income)}</td>
                    <td className="col-expense number expense">{money(row.expense)}</td>
                  </tr>
                ))}
                {!loading && !error && !rows.length && (
                  <tr>
                    <td colSpan={9} className="empty">
                      Không có giao dịch phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="cashbook-totals">
            <span>{rows.length} giao dịch</span>
            <span>
              Tổng thu: <b>{error && !hasLoaded ? '—' : money(income)} đ</b>
            </span>
            <span>
              Tổng chi: <b>{error && !hasLoaded ? '—' : money(expense)} đ</b>
            </span>
            <span>
              Chênh lệch thu/chi: <b>{error && !hasLoaded ? '—' : money(income - expense)} đ</b>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
