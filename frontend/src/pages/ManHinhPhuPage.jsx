import { compressImage, imagePolicies } from '../utils/compressImage';
import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Monitor, Megaphone, CreditCard, Wrench, ExternalLink, Maximize, Save,
  Plus, Trash2, CheckCircle2, Heart, Sparkles, ShieldCheck, Award,
  Coffee, Wifi, PhoneCall, Car, Gift, Clock, Star, Tv, ChevronRight,
  ChevronLeft, QrCode, FileText, Play, Pause, User, Activity
} from 'lucide-react';
import api from '../api';
import './ManHinhPhuPage.css';

const key = () => 'garage_secondary_displays_v1' + (() => { try { const user=JSON.parse(localStorage.getItem('garage_user') || '{}'); return user.TENANT ? ':'+user.TENANT.id : ''; } catch { return ''; } })();
const defaults = {
  headline: 'Cảm Ơn Quý Khách Đã Lựa Chọn & Đồng Hành',
  subtitle: 'Dịch vụ chuyên nghiệp · Phụ tùng chính hãng · Báo giá minh bạch · Bảo hành dài hạn',
  ticker: '🚗 KAZUKO AUTO — Kính chúc Quý khách thượng lộ bình an, vạn dặm may mắn! 🌟 Hotline cứu hộ & hỗ trợ kỹ thuật 24/7: 0917 66 4444 🌟 Trân trọng cảm ơn Quý khách đã trao trọn niềm tin!',
  seconds: 8,
  slides: [],
  repairId: '',
  repairSpeed: 8,
  repairAutoPlay: true,
  fontSizes: { 'quang-cao': 100, 'thanh-toan': 100, 'sua-chua': 100 }
};
const modes = {
  'quang-cao': { title: 'Quảng cáo', icon: Megaphone, color: 'orange', description: 'Hình ảnh, video và thông điệp dịch vụ của gara' },
  'thanh-toan': { title: 'Thanh toán', icon: CreditCard, color: 'blue', description: 'Hạng mục, chiết khấu, số tiền và mã VietQR thanh toán' },
  'sua-chua': { title: 'Sửa chữa', icon: Wrench, color: 'green', description: 'Trình chiếu chi tiết từng xe đang bảo dưỡng & sửa chữa tại xưởng' }
};
const stages = ['Tiếp nhận & Báo giá', 'Xác nhận sửa chữa', 'Đang sửa', 'Giao xe', 'Hoàn thành'];
const money = value => Number(value || 0).toLocaleString('vi-VN') + ' đ';
const fontPercent = value => Math.max(50, Math.min(300, Number(value) || 100));
function readSettings() { try { return { ...defaults, ...JSON.parse(localStorage.getItem(key()) || '{}') }; } catch { return { ...defaults }; } }
function useSettings() {
  const [settings, setSettings] = useState(readSettings);
  useEffect(() => { const update = () => setSettings(readSettings()); window.addEventListener('storage', update); window.addEventListener('garage:displays-changed', update); return () => { window.removeEventListener('storage', update); window.removeEventListener('garage:displays-changed', update); }; }, []);
  return settings;
}
function useDisplayData(repairId) {
  const [data, setData] = useState({ flows: [], order: null, company: {}, error: '', loaded: false, updated: null });
  useEffect(() => {
    let active = true, timer;
    setData(previous => ({ ...previous, order: null }));
    const load = async () => {
      try {
        const [flows, company, order] = await Promise.all([api.get('/workflow'), api.get('/system-config'), repairId ? api.get(`/repair-orders/${repairId}`) : Promise.resolve(null)]);
        if (active) setData({ flows: flows.data.data || [], company: Object.fromEntries((company.data.data || []).map(row => [row.NAME, row.value])), order: order?.data.data || null, error: '', loaded: true, updated: new Date() });
      } catch (error) { if (active) setData(previous => ({ ...previous, order: null, error: error.response?.data?.error || 'Không thể cập nhật dữ liệu. Kiểm tra kết nối.', loaded: true })); }
      finally { if (active) timer = setTimeout(load, 10000); }
    };
    load(); return () => { active = false; clearTimeout(timer); };
  }, [repairId]);
  return data;
}
function useLivePayment(enabled) {
  const [state, setState] = useState({ order:null, error:'' });
  useEffect(() => {
    if (!enabled) return;
    let active=true, timer;
    const load=async()=>{
      try { const { data }=await api.get('/secondary-payment'); if(active)setState({order:data.data,error:''}); }
      catch(error){if(active)setState({order:null,error:error.response?.data?.error || 'Không nhận được đơn thanh toán từ quầy.'});}
      finally{if(active)timer=setTimeout(load,2000);}
    };
    load();return()=>{active=false;clearTimeout(timer);};
  },[enabled]);
  return state;
}
const serviceShowcases = [
  {
    id: 'bao-duong',
    tabLabel: 'Bảo Dưỡng Định Kỳ',
    badge: 'TIÊU CHUẨN AN TOÀN 5 SAO',
    title: 'Bảo Dưỡng Định Kỳ 30 Hạng Mục Chuẩn Hãng',
    subtitle: 'Quy trình kiểm tra toàn diện, chẩn đoán sớm lỗi ẩn & tối ưu hiệu suất vận hành của xe',
    icon: Wrench,
    color: 'orange',
    items: [
      { name: 'Đọc lỗi chuyên sâu hệ thống OBD-II', desc: 'Quét toàn bộ cảm biến động cơ, hộp số, túi khí & phanh ABS' },
      { name: 'Dầu nhớt chính hãng & lọc nhớt mới', desc: 'Castrol, Motul, Mobil 1 giúp bôi trơn và bảo vệ máy tối đa' },
      { name: 'Kiểm tra hệ thống phanh, lốp & gầm', desc: 'Đo độ mòn má phanh, cân chỉnh áp suất lốp an toàn tuyệt đối' },
      { name: 'Kiểm tra ắc quy, điện chiếu sáng & nước làm mát', desc: 'Đo điện áp bình sạc và áp suất hệ thống giải nhiệt' }
    ],
    highlight: '🎁 TẶNG MIỄN PHÍ RỬA XE BỌT TUYẾT & HÚT BỤI KHI BẢO DƯỠNG'
  },
  {
    id: 'detailing',
    tabLabel: 'Detailing & Ceramic',
    badge: 'CHĂM SÓC XE CAO CẤP',
    title: 'Detailing & Phủ Ceramic 9H+ Độ Bóng Gương',
    subtitle: 'Công nghệ bảo vệ sơn xe chống trầy xước, kháng tia UV & hiệu ứng lá sen kỵ nước',
    icon: Sparkles,
    color: 'amber',
    items: [
      { name: 'Phủ Ceramic 9H+ độ cứng cao cấp', desc: 'Tạo màng gốm siêu bóng, chống ố mưa axit và tia cực tím bạc màu' },
      { name: 'Dọn nội thất da chuyên sâu & diệt khuẩn', desc: 'Giặt ghế, trần, thảm bằng máy hơi nước nóng 140°C khử mùi hôi' },
      { name: 'Vệ sinh & dưỡng khoang động cơ', desc: 'Bảo vệ đường điện chống chuột bọ cắn phá, tản nhiệt động cơ tốt hơn' },
      { name: 'Đánh bóng 3 bước xóa vết xước xoáy', desc: 'Khôi phục độ bóng sâu và độ trong suốt nguyên bản của lớp sơn' }
    ],
    highlight: '✨ BẢO HÀNH ĐỘ BÓNG & KHÁNG NƯỚC CERAMIC LÊN ĐẾN 24 THÁNG'
  },
  {
    id: 'dong-son',
    tabLabel: 'Đồng Sơn Sấy Hấp',
    badge: 'CÔNG NGHỆ CHÂU ÂU',
    title: 'Đồng Sơn Sấy Hấp & Cân Chỉnh Thước Lái 3D',
    subtitle: 'Phòng sơn sấy khép kín, pha màu vi tính Dupont chính xác 100% không lệch màu',
    icon: Car,
    color: 'blue',
    items: [
      { name: 'Phòng sơn sấy hấp hồng ngoại khép kín', desc: 'Sơn gốc nước thân thiện môi trường, bề mặt căng mịn không bám bụi' },
      { name: 'Cân chỉnh góc đặt bánh xe 3D Laser', desc: 'Triệt tiêu nhao lái, mòn lốp không đều và rung lắc tay lái' },
      { name: 'Cân bằng động mâm lốp điện tử', desc: 'Đảm bảo xe chạy đầm chắc, êm ái khi vận hành ở tốc độ cao' },
      { name: 'Nắn rút khung xe tai nạn công nghệ cao', desc: 'Phục hồi chuẩn xác từng milimet kích thước ban đầu của xe' }
    ],
    highlight: '🛡️ CAM KẾT CHUẨN MÀU SẮC 100% VỚI PHỤ KIỆN GỐC CỦA XE'
  },
  {
    id: 'uu-dai',
    tabLabel: 'Ưu Đãi & Quà Tặng',
    badge: 'TRI ÂN KHÁCH HÀNG',
    title: 'Chương Trình Khuyến Mãi & Đặc Quyền Hội Viên',
    subtitle: 'Nhiều ưu đãi thiết thực và quà tặng đặc quyền dành riêng cho khách hàng thân thiết',
    icon: Gift,
    color: 'emerald',
    items: [
      { name: 'Giảm 10% tiền công khi đặt lịch hẹn trước', desc: 'Tiết kiệm thời gian, xe được ưu tiên vào cầu nâng thi công ngay' },
      { name: 'Miễn phí kiểm tra ắc quy & đo độ mòn lốp', desc: 'Bơm khí Nitơ chuẩn áp suất giúp xe vận hành êm và tiết kiệm xăng' },
      { name: 'Tích lũy điểm VIP nâng hạng thành viên', desc: 'Nhận voucher giảm giá phụ tùng và quà tặng sinh nhật định kỳ' },
      { name: 'Hỗ trợ cứu hộ giao thông 24/7 bán kính 15km', desc: 'Kích nổ bình ắc quy, kéo xe về xưởng nhanh chóng khi gặp sự cố' }
    ],
    highlight: '🌟 ĐÁNH GIÁ 5 SAO NHẬN NGAY VOUCHER 100.000Đ DỊCH VỤ'
  }
];

const goldenCommitments = [
  { icon: ShieldCheck, title: 'Phụ tùng 100% chính hãng', desc: 'Bảo hành minh bạch từ 6 – 24 tháng theo hãng' },
  { icon: Award, title: 'Báo giá chuẩn xác trước khi làm', desc: 'Chi tiết từng hạng mục, tuyệt đối không phát sinh' },
  { icon: Wrench, title: 'Kỹ thuật viên lành nghề', desc: 'Được đào tạo bài bản, chẩn đoán đúng bệnh dứt điểm' },
  { icon: CheckCircle2, title: 'Bàn giao đúng hẹn chuẩn 5S', desc: 'Vệ sinh xe sạch sẽ và kiểm tra 2 vòng trước khi giao' }
];

const vipLoungePerks = [
  { icon: Coffee, title: 'Cà phê & Trà thơm miễn phí', desc: 'Phục vụ chu đáo tại quầy lounge' },
  { icon: Wifi, title: 'Wi-Fi VIP Siêu Tốc', desc: 'KAZUKO_VIP · MK: 88888888' },
  { icon: Clock, title: 'Ghế massage thư giãn', desc: 'Phòng chờ máy lạnh êm ái' },
  { icon: Tv, title: 'Camera xem xe trực tiếp', desc: 'Theo dõi thợ làm xe minh bạch' }
];

function QrCodeGraphic() {
  return (
    <svg viewBox="0 0 100 100" className="sd-qr-svg" aria-hidden="true">
      <rect width="100" height="100" fill="#08101e" rx="10" />
      <rect x="8" y="8" width="28" height="28" fill="#ea580c" rx="4" />
      <rect x="13" y="13" width="18" height="18" fill="#08101e" rx="2" />
      <rect x="17" y="17" width="10" height="10" fill="#f97316" rx="2" />

      <rect x="64" y="8" width="28" height="28" fill="#ea580c" rx="4" />
      <rect x="69" y="13" width="18" height="18" fill="#08101e" rx="2" />
      <rect x="73" y="17" width="10" height="10" fill="#f97316" rx="2" />

      <rect x="8" y="64" width="28" height="28" fill="#ea580c" rx="4" />
      <rect x="13" y="69" width="18" height="18" fill="#08101e" rx="2" />
      <rect x="17" y="73" width="10" height="10" fill="#f97316" rx="2" />

      <rect x="42" y="10" width="7" height="7" fill="#fed7aa" rx="1.5" />
      <rect x="52" y="10" width="7" height="7" fill="#f97316" rx="1.5" />
      <rect x="42" y="21" width="17" height="6" fill="#f97316" rx="1.5" />
      <rect x="42" y="31" width="7" height="7" fill="#fed7aa" rx="1.5" />
      <rect x="52" y="31" width="7" height="7" fill="#fed7aa" rx="1.5" />

      <rect x="10" y="42" width="7" height="7" fill="#fed7aa" rx="1.5" />
      <rect x="21" y="42" width="16" height="7" fill="#f97316" rx="1.5" />
      <rect x="10" y="52" width="17" height="6" fill="#fed7aa" rx="1.5" />
      <rect x="31" y="52" width="7" height="7" fill="#f97316" rx="1.5" />

      <rect x="41" y="41" width="18" height="18" fill="#c2410c" rx="4" />
      <circle cx="50" cy="50" r="4.5" fill="#ffffff" />

      <rect x="64" y="42" width="9" height="7" fill="#fed7aa" rx="1.5" />
      <rect x="77" y="42" width="15" height="7" fill="#f97316" rx="1.5" />
      <rect x="64" y="52" width="18" height="7" fill="#fed7aa" rx="1.5" />
      <rect x="85" y="52" width="7" height="7" fill="#f97316" rx="1.5" />

      <rect x="42" y="64" width="7" height="15" fill="#fed7aa" rx="1.5" />
      <rect x="52" y="64" width="7" height="9" fill="#f97316" rx="1.5" />
      <rect x="52" y="77" width="7" height="15" fill="#fed7aa" rx="1.5" />
      <rect x="42" y="83" width="7" height="9" fill="#f97316" rx="1.5" />

      <rect x="64" y="64" width="11" height="7" fill="#f97316" rx="1.5" />
      <rect x="79" y="64" width="13" height="7" fill="#fed7aa" rx="1.5" />
      <rect x="64" y="75" width="18" height="7" fill="#fed7aa" rx="1.5" />
      <rect x="85" y="75" width="7" height="17" fill="#f97316" rx="1.5" />
      <rect x="64" y="86" width="17" height="6" fill="#f97316" rx="1.5" />
    </svg>
  );
}

function Advertisement({ settings, company }) {
  const hasCustomSlides = settings.slides && settings.slides.length > 0;
  const [slideIndex, setSlideIndex] = useState(0);
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const [slideFailed, setSlideFailed] = useState(false);
  const [timerProgress, setTimerProgress] = useState(0);

  const durationSec = Math.max(5, Number(settings.seconds || 8));

  // Auto rotation for custom slides
  useEffect(() => {
    if (!hasCustomSlides || settings.slides.length < 2) return;
    const interval = setInterval(() => {
      setSlideIndex(prev => (prev + 1) % settings.slides.length);
    }, durationSec * 1000);
    return () => clearInterval(interval);
  }, [hasCustomSlides, settings.slides, durationSec]);

  // Auto rotation for showcase tabs when no custom slides
  useEffect(() => {
    if (hasCustomSlides) return;
    const stepMs = 100;
    const totalSteps = (durationSec * 1000) / stepMs;
    let stepCount = 0;

    const timer = setInterval(() => {
      stepCount += 1;
      setTimerProgress(Math.min(100, Math.round((stepCount / totalSteps) * 100)));
      if (stepCount >= totalSteps) {
        stepCount = 0;
        setTimerProgress(0);
        setShowcaseIndex(prev => (prev + 1) % serviceShowcases.length);
      }
    }, stepMs);

    return () => clearInterval(timer);
  }, [hasCustomSlides, durationSec, showcaseIndex]);

  const currentSlide = hasCustomSlides ? settings.slides[slideIndex] : null;
  const currentShowcase = serviceShowcases[showcaseIndex];
  const CurrentIcon = currentShowcase.icon;

  useEffect(() => setSlideFailed(false), [currentSlide?.url]);

  return (
    <div className="sd-ad sd-ad-modern">
      {/* 1. TOP HERO GRATITUDE BANNER */}
      <section className="sd-ad-hero-thankyou">
        <div className="sd-ad-hero-glow" />
        <div className="sd-ad-thankyou-content">
          <div className="sd-ad-thankyou-badge">
            <Heart size={18} className="sd-heart-beat" />
            <span>TRI ÂN KHÁCH HÀNG — TRAO TRỌN NIỀM TIN</span>
            <Sparkles size={18} className="sd-sparkle-spin" />
          </div>
          <h1 className="sd-ad-hero-headline">
            {settings.headline || 'CẢM ƠN QUÝ KHÁCH ĐÃ ĐỒNG HÀNH CÙNG KAZUKO AUTO'}
          </h1>
          <p className="sd-ad-hero-subtitle">
            {settings.subtitle || 'Sự an tâm và an toàn của Quý khách trên mỗi chặng đường là niềm tự hào & sứ mệnh lớn nhất của chúng tôi.'}
          </p>
        </div>

        <div className="sd-ad-hero-metrics">
          <div className="sd-metric-pill">
            <Star size={24} className="text-amber" />
            <div>
              <strong>4.9 / 5.0</strong>
              <small>Hài Lòng Dịch Vụ</small>
            </div>
          </div>
          <div className="sd-metric-pill">
            <Car size={24} className="text-orange" />
            <div>
              <strong>15.000+</strong>
              <small>Lượt Xe Phục Vụ</small>
            </div>
          </div>
          <div className="sd-metric-pill">
            <ShieldCheck size={24} className="text-emerald" />
            <div>
              <strong>Bảo Hành 24T</strong>
              <small>Phụ Tùng Chuẩn Hãng</small>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MAIN COCKPIT GRID */}
      <div className="sd-ad-cockpit-grid">
        {/* LEFT COLUMN: DYNAMIC SHOWCASE / CUSTOM MEDIA */}
        <section className="sd-ad-left-spotlight">
          {hasCustomSlides && currentSlide && !slideFailed ? (
            /* Custom Media Player Mode */
            <div className="sd-custom-media-frame">
              <div className="sd-media-container">
                {currentSlide.kind === 'video' ? (
                  <video
                    key={currentSlide.url}
                    src={currentSlide.url}
                    autoPlay
                    muted
                    playsInline
                    loop={settings.slides.length === 1}
                    onError={() => setSlideFailed(true)}
                  />
                ) : (
                  <img
                    src={currentSlide.url}
                    alt={currentSlide.title || 'Quảng cáo Gara'}
                    onError={() => setSlideFailed(true)}
                  />
                )}
                <div className="sd-media-overlay-gradient" />
                <div className="sd-media-info-bar">
                  <div className="sd-media-info-tag">
                    <Sparkles size={16} />
                    <span>HÌNH ẢNH / VIDEO NỔI BẬT ({slideIndex + 1}/{settings.slides.length})</span>
                  </div>
                  <h3>{currentSlide.title || 'Dịch Vụ & Trang Thiết Bị Hiện Đại'}</h3>
                </div>
              </div>
              {settings.slides.length > 1 && (
                <div className="sd-media-nav-dots">
                  {settings.slides.map((s, i) => (
                    <button
                      key={i}
                      className={`sd-media-dot ${i === slideIndex ? 'active' : ''}`}
                      onClick={() => setSlideIndex(i)}
                      title={`Xem ${s.title || `nội dung ${i + 1}`}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Dynamic Automotive Showcase Carousel Mode */
            <div className="sd-showcase-card">
              {/* Tabs Navigator */}
              <div className="sd-showcase-tabs">
                {serviceShowcases.map((srv, idx) => {
                  const TabIcon = srv.icon;
                  const isActive = idx === showcaseIndex;
                  return (
                    <button
                      key={srv.id}
                      className={`sd-showcase-tab ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setShowcaseIndex(idx);
                        setTimerProgress(0);
                      }}
                    >
                      <TabIcon size={20} />
                      <span>{srv.tabLabel}</span>
                      {isActive && (
                        <div
                          className="sd-tab-progressbar"
                          style={{ width: `${timerProgress}%` }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Showcase Content Body */}
              <div className="sd-showcase-body">
                <div className="sd-showcase-header">
                  <div className="sd-showcase-badge">
                    <CurrentIcon size={18} />
                    <span>{currentShowcase.badge}</span>
                  </div>
                  <h2 className="sd-showcase-title">{currentShowcase.title}</h2>
                  <p className="sd-showcase-subtitle">{currentShowcase.subtitle}</p>
                </div>

                <div className="sd-showcase-features-grid">
                  {currentShowcase.items.map((item, i) => (
                    <div key={i} className="sd-feature-card">
                      <div className="sd-feature-index">0{i + 1}</div>
                      <div className="sd-feature-text">
                        <h4>{item.name}</h4>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sd-showcase-highlight-ribbon">
                  <Sparkles size={22} className="sd-sparkle-spin" />
                  <strong>{currentShowcase.highlight}</strong>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: 4 COMMITMENTS + VIP LOUNGE + HOTLINE & QR */}
        <section className="sd-ad-right-sidebar">
          {/* Block 1: 4 Golden Commitments */}
          <div className="sd-side-card sd-commitments-card">
            <div className="sd-side-card-title">
              <Award size={22} className="text-amber" />
              <h3>4 CAM KẾT VÀNG KAZUKO</h3>
            </div>
            <div className="sd-commitments-list">
              {goldenCommitments.map((c, i) => {
                const Icon = c.icon;
                return (
                  <div key={i} className="sd-commitment-item">
                    <span className="sd-commit-icon"><Icon size={20} /></span>
                    <div>
                      <b>{c.title}</b>
                      <small>{c.desc}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Block 2: VIP Lounge Perks */}
          <div className="sd-side-card sd-lounge-card">
            <div className="sd-side-card-title">
              <Coffee size={22} className="text-orange" />
              <h3>TIỆN ÍCH DÀNH CHO QUÝ KHÁCH</h3>
            </div>
            <div className="sd-lounge-grid">
              {vipLoungePerks.map((p, i) => {
                const Icon = p.icon;
                return (
                  <div key={i} className="sd-lounge-item">
                    <Icon size={22} />
                    <div>
                      <b>{p.title}</b>
                      <span>{p.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Block 3: Emergency Rescue 24/7 & Zalo QR */}
          <div className="sd-side-card sd-contact-rescue-card">
            <div className="sd-rescue-row">
              <div className="sd-rescue-pulse-box">
                <span className="sd-radar-pulse" />
                <PhoneCall size={28} className="sd-phone-icon" />
              </div>
              <div className="sd-rescue-info">
                <span>CỨU HỘ & TƯ VẤN 24/7</span>
                <strong className="sd-hotline-number">
                  {company.CompanyPhone || '0917 66 4444'}
                </strong>
              </div>
            </div>

            <div className="sd-qr-row">
              <div className="sd-qr-wrapper">
                <QrCodeGraphic />
              </div>
              <div className="sd-qr-caption">
                <b>QUÉT MÃ ZALO OA</b>
                <p>Đặt lịch trước nhận ngay ưu đãi 10% công & theo dõi tiến độ xe</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
function VietQrGraphic({ amount = 0, memo = '', bankName = 'VIETCOMBANK', accountNo = '8888 6666 9999', accountName = 'KAZUKO AUTO' }) {
  return (
    <div className="sd-vietqr-box">
      <div className="sd-vietqr-header">
        <div className="sd-vietqr-brand">
          <span className="sd-vietqr-napas">NAPAS 247</span>
          <span className="sd-vietqr-tag">VietQR</span>
        </div>
        <small className="sd-vietqr-quick">Quét mã chuyển khoản 24/7</small>
      </div>

      <div className="sd-vietqr-code-wrapper">
        <QrCodeGraphic />
        <div className="sd-vietqr-center-logo">
          <Car size={16} />
        </div>
      </div>

      <div className="sd-vietqr-details">
        <div className="sd-vietqr-line">
          <span>Ngân hàng:</span>
          <b>{bankName}</b>
        </div>
        <div className="sd-vietqr-line">
          <span>Số tài khoản:</span>
          <b className="sd-vietqr-acc">{accountNo}</b>
        </div>
        <div className="sd-vietqr-line">
          <span>Chủ tài khoản:</span>
          <b>{accountName}</b>
        </div>
        {memo && (
          <div className="sd-vietqr-line sd-vietqr-memo-line">
            <span>Nội dung CK:</span>
            <mark>{memo}</mark>
          </div>
        )}
      </div>
    </div>
  );
}

function Payment({ order, loading, company = {} }) {
  if (!order) {
    return (
      <div className="sd-payment-standby">
        <div className="sd-standby-glow" />
        <div className="sd-standby-card">
          <div className="sd-standby-badge">
            <Sparkles size={16} className="sd-sparkle-spin" />
            <span>QUẦY DỊCH VỤ & THU NGÂN KAZUKO AUTO</span>
          </div>

          <div className="sd-standby-aura-ring">
            <div className="sd-standby-pulse-circle" />
            <CreditCard size={56} className="sd-standby-icon" />
          </div>

          <h1 className="sd-standby-title">
            {loading ? 'Đang Tải Dữ Liệu Phiếu…' : 'Kính Chào Quý Khách Hàng'}
          </h1>
          <p className="sd-standby-subtitle">
            Hệ thống hiển thị đối soát & thanh toán dịch vụ minh bạch chuẩn 5S
          </p>

          <div className="sd-standby-hint">
            <span className="sd-hint-dot" />
            <p>
              Chi tiết các hạng mục và hóa đơn sẽ tự động xuất hiện tại đây ngay khi nhân viên quầy chọn phiếu.
            </p>
          </div>

          <div className="sd-standby-features-row">
            <div className="sd-standby-pill">
              <ShieldCheck size={22} className="text-emerald" />
              <div>
                <b>Báo Giá Minh Bạch</b>
                <small>Chi tiết từng phụ tùng & công thợ</small>
              </div>
            </div>
            <div className="sd-standby-pill">
              <QrCode size={22} className="text-orange" />
              <div>
                <b>Thanh Toán VietQR</b>
                <small>Quét mã 24/7 đúng số tiền</small>
              </div>
            </div>
            <div className="sd-standby-pill">
              <Heart size={22} className="text-rose" />
              <div>
                <b>Tích Điểm Tri Ân</b>
                <small>Đặc quyền hội viên thân thiết</small>
              </div>
            </div>
          </div>

          <div className="sd-standby-methods">
            <span>PHƯƠNG THỨC THANH TOÁN TẠI QUẦY:</span>
            <b>VietQR 24/7</b> · <b>Thẻ ATM / Visa / Mastercard</b> · <b>Tiền Mặt</b>
          </div>
        </div>
      </div>
    );
  }

  const totals = order.invoice || order;
  const total = Number(totals.TONGCONG || 0);
  const paid = order.invoice && Number(order.invoice.DATHANHTOAN) === 1;
  const remaining = order.invoice ? Number(order.invoice.CONLAI ?? total) : total;
  const discount = Number(totals.TIENGIAMGIA || 0);
  const serviceFee = Number(totals.PHIDICHVU || 0);
  const vatTax = Number(totals.TIENTHUE || 0);
  const subTotal = (order.details || []).reduce((sum, r) => sum + Number(r.THANHTIEN || 0), 0);

  const displayTitle = order.BIENSO || (order.displaySale ? 'Thanh Toán Bán Hàng & Phụ Tùng' : 'Thanh Toán Dịch Vụ Sửa Chữa');
  const orderCode = order.NAME || 'PHIẾU THANH TOÁN';
  const customerName = order.KHACHHANG || (order.displaySale ? 'Khách lẻ tại quầy' : 'Khách hàng dịch vụ');

  return (
    <div className="sd-payment-modern">
      {/* 1. TOP ORDER HEADER BANNER */}
      <div className="sd-payment-top-banner">
        <div className="sd-payment-title-group">
          <div className="sd-payment-status-pill">
            {paid ? (
              <span className="sd-status-paid">
                <CheckCircle2 size={16} /> ĐÃ HOÀN TẤT THANH TOÁN
              </span>
            ) : order.displaySaved ? (
              <span className="sd-status-saved">
                <ShieldCheck size={16} /> PHIẾU ĐÃ LƯU & XÁC NHẬN
              </span>
            ) : (
              <span className="sd-status-pending">
                <Sparkles size={16} className="sd-sparkle-spin" /> PHIẾU TẠM TÍNH TẠI QUẦY
              </span>
            )}
          </div>

          <div className="sd-payment-main-title">
            <span className="sd-car-plate-badge"><Car size={26} /></span>
            <h1>{displayTitle}</h1>
          </div>

          <div className="sd-payment-meta-badges">
            <span className="sd-meta-chip">
              Mã phiếu: <b>{orderCode}</b>
            </span>
            <span className="sd-meta-chip">
              Khách hàng: <b>{customerName}</b>
            </span>
            <span className="sd-meta-chip sd-items-count-chip">
              Tổng cộng <b>{(order.details || []).length} hạng mục</b>
            </span>
          </div>
        </div>

        <div className="sd-payment-assurance-badge">
          <ShieldCheck size={28} className="text-emerald" />
          <div>
            <b>BÁO GIÁ MINH BẠCH</b>
            <small>Tiêu chuẩn kỹ thuật KAZUKO AUTO</small>
          </div>
        </div>
      </div>

      {/* 2. MAIN SPLIT COCKPIT: TABLE (LEFT) & BILLING ASIDE (RIGHT) */}
      <div className="sd-payment-cockpit-grid">
        {/* LEFT COLUMN: DETAILED INVOICE TABLE */}
        <section className="sd-payment-lines-card">
          <div className="sd-lines-card-header">
            <div>
              <h3>CHI TIẾT DỊCH VỤ & PHỤ TÙNG</h3>
              <p>Quý khách vui lòng đối soát trực tiếp cùng thu ngân</p>
            </div>
            <span className="sd-lines-count-pill">{(order.details || []).length} mục</span>
          </div>

          <div className="sd-payment-table-scroll">
            <table className="sd-payment-table">
              <thead>
                <tr>
                  <th style={{ width: '64px', textAlign: 'center' }}>STT</th>
                  <th>Hạng Mục / Phụ Tùng</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>SL</th>
                  <th style={{ width: '180px', textAlign: 'right' }}>Đơn Giá</th>
                  <th style={{ width: '200px', textAlign: 'right' }}>Thành Tiền</th>
                </tr>
              </thead>
              <tbody>
                {(order.details || []).map((row, idx) => (
                  <tr key={row.ID || idx}>
                    <td className="sd-col-stt">
                      <span className="sd-stt-badge">{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                    </td>
                    <td className="sd-col-name">
                      <b>{row.TEN_DV || row.TEN_PT || 'Hạng mục'}</b>
                      {row.TEN_DV && <small className="sd-kind-service">Dịch vụ kỹ thuật</small>}
                      {row.TEN_PT && !row.TEN_DV && <small className="sd-kind-part">Phụ tùng chính hãng</small>}
                    </td>
                    <td className="sd-col-qty">
                      <span className="sd-qty-pill">{Number(row.SOLUONG || 0)}</span>
                    </td>
                    <td className="sd-col-price">{money(row.DONGIA)}</td>
                    <td className="sd-col-total">
                      <strong>{money(row.THANHTIEN)}</strong>
                    </td>
                  </tr>
                ))}
                {(!order.details || !order.details.length) && (
                  <tr>
                    <td colSpan={5} className="sd-table-empty">
                      Chưa có hạng mục chi tiết trên phiếu này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="sd-lines-card-footer">
            <Sparkles size={18} className="text-amber" />
            <span>Cam kết 100% phụ tùng chính hãng · Bảo hành minh bạch theo tiêu chuẩn KAZUKO AUTO</span>
          </div>
        </section>

        {/* RIGHT COLUMN: FINANCIAL TOTALS & VIETQR / SETTLEMENT */}
        <aside className="sd-payment-aside-sidebar">
          {/* Block 1: Financial breakdown */}
          <div className="sd-bill-summary-card">
            <div className="sd-bill-header">
              <Award size={20} className="text-orange" />
              <h3>TỔNG KẾT HÓA ĐƠN</h3>
            </div>

            <div className="sd-bill-rows">
              <div className="sd-bill-row">
                <span>Tổng tiền hàng & DV</span>
                <b>{money(subTotal || total)}</b>
              </div>

              {discount > 0 && (
                <div className="sd-bill-row sd-discount-row">
                  <span>Chiết khấu / Giảm giá</span>
                  <b>- {money(discount)}</b>
                </div>
              )}

              {serviceFee > 0 && (
                <div className="sd-bill-row">
                  <span>Phí dịch vụ</span>
                  <b>+ {money(serviceFee)}</b>
                </div>
              )}

              {vatTax > 0 && (
                <div className="sd-bill-row">
                  <span>Thuế VAT</span>
                  <b>+ {money(vatTax)}</b>
                </div>
              )}
            </div>

            <div className="sd-bill-grand-total">
              <span className="sd-grand-label">
                {paid ? 'SỐ TIỀN ĐÃ THANH TOÁN' : 'CÒN PHẢI THANH TOÁN'}
              </span>
              <strong className="sd-grand-amount">
                {money(remaining)}
              </strong>
            </div>
          </div>

          {/* Block 2: VietQR Transfer or Success Celebration */}
          {paid ? (
            <div className="sd-bill-paid-celebration">
              <CheckCircle2 size={54} className="sd-paid-check sd-heart-beat" />
              <h4>CẢM ƠN QUÝ KHÁCH!</h4>
              <p>Hóa đơn đã được thanh toán và hoàn tất thành công trên hệ thống.</p>
              <div className="sd-paid-wish">
                <Heart size={16} />
                <span>Kính chúc Quý khách thượng lộ bình an & vạn dặm may mắn!</span>
              </div>
            </div>
          ) : (
            <div className="sd-bill-qr-card">
              <VietQrGraphic
                amount={remaining}
                memo={orderCode}
                bankName={company.BankName || 'VIETCOMBANK'}
                accountNo={company.BankAccount || '8888 6666 9999'}
                accountName={company.CompanyName || 'KAZUKO AUTO'}
              />
            </div>
          )}

          {/* Block 3: Payment methods supported badge */}
          <div className="sd-payment-methods-strip">
            <small>HỖ TRỢ THANH TOÁN LINH HOẠT:</small>
            <div className="sd-methods-badges">
              <span>📱 VietQR 24/7</span>
              <span>💳 Thẻ ATM / Visa</span>
              <span>💵 Tiền Mặt</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
function maskPhone(phone) {
  if (!phone) return '';
  const clean = String(phone).trim();
  if (clean.length < 7) return clean;
  return clean.slice(0, 4) + '***' + clean.slice(-3);
}

function formatDateTime(d) {
  if (!d) return '--:--';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + dt.toLocaleDateString('vi-VN');
  } catch {
    return String(d);
  }
}

function RepairBoard({ flows = [], settings = {}, company = {} }) {
  // Lọc chỉ các xe đang trong trạng thái ĐANG SỬA (TRANGTHAI === 2)
  const repairingVehicles = useMemo(() => {
    return (flows || []).filter(row => Number(row.TRANGTHAI) === 2);
  }, [flows]);

  const defaultDuration = Math.max(3, Number(settings.repairSpeed || 8));
  const [speedSec, setSpeedSec] = useState(defaultDuration);
  const [isPlaying, setIsPlaying] = useState(settings.repairAutoPlay !== false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Đồng bộ tốc độ khi cài đặt thay đổi từ ngoài
  useEffect(() => {
    if (settings.repairSpeed) {
      setSpeedSec(Math.max(3, Number(settings.repairSpeed)));
    }
  }, [settings.repairSpeed]);

  // Giới hạn index nếu số lượng xe thay đổi
  useEffect(() => {
    if (currentIndex >= repairingVehicles.length) {
      setCurrentIndex(0);
    }
  }, [repairingVehicles.length, currentIndex]);

  // Vòng lặp trình chiếu tự động có thanh progress đếm mượt
  useEffect(() => {
    if (!isPlaying || repairingVehicles.length <= 1) {
      setProgress(0);
      return;
    }

    const stepMs = 100;
    const totalSteps = (speedSec * 1000) / stepMs;
    let step = 0;

    const timer = setInterval(() => {
      step += 1;
      setProgress(Math.min(100, Math.round((step / totalSteps) * 100)));
      if (step >= totalSteps) {
        step = 0;
        setProgress(0);
        setCurrentIndex(prev => (prev + 1) % repairingVehicles.length);
      }
    }, stepMs);

    return () => clearInterval(timer);
  }, [isPlaying, speedSec, repairingVehicles.length, currentIndex]);

  const handlePrev = () => {
    setProgress(0);
    setCurrentIndex(prev => (prev - 1 + repairingVehicles.length) % repairingVehicles.length);
  };

  const handleNext = () => {
    setProgress(0);
    setCurrentIndex(prev => (prev + 1) % repairingVehicles.length);
  };

  const handleSelectCar = (index) => {
    setProgress(0);
    setCurrentIndex(index);
  };

  // Trường hợp không có xe nào đang sửa
  if (!repairingVehicles.length) {
    return (
      <div className="sd-repair-empty-wrap">
        <div className="sd-repair-empty-box">
          <div className="sd-repair-empty-icon">
            <Wrench size={54} />
          </div>
          <h2>KHOANG SỬA CHỮA SẴN SÀNG TIẾP NHẬN</h2>
          <p>Hiện tại tất cả xe đã hoàn tất sửa chữa hoặc đang chờ giao xe. Khu vực cầu nâng sẵn sàng phục vụ Quý khách.</p>
          <div className="sd-repair-empty-badge">
            <ShieldCheck size={18} />
            <span>Tiêu chuẩn kỹ thuật bảo dưỡng & dịch vụ sửa chữa KAZUKO 5S</span>
          </div>
        </div>
      </div>
    );
  }

  const currentCar = repairingVehicles[currentIndex] || repairingVehicles[0];

  return (
    <div className="sd-repair-spotlight-container">
      {/* 1. THANH TIÊU ĐỀ, BỘ ĐẾM XE & BẢNG ĐIỀU KHIỂN TỐC ĐỘ */}
      <div className="sd-spotlight-top-bar">
        <div className="sd-spotlight-headline-group">
          <div className="sd-spotlight-tag">
            <span className="sd-spotlight-pulse-dot" />
            <span>TIẾN ĐỘ THỰC TẾ TẠI XƯỞNG</span>
          </div>
          <h2>Xe Đang Sửa Chữa Trực Tiếp</h2>
        </div>

        {/* Bộ đếm xe đang chiếu */}
        <div className="sd-spotlight-counter">
          <span className="sd-counter-label">ĐANG CHIẾU XE:</span>
          <strong>{currentIndex + 1 < 10 ? `0${currentIndex + 1}` : currentIndex + 1}</strong>
          <small>/ {repairingVehicles.length < 10 ? `0${repairingVehicles.length}` : repairingVehicles.length} XE</small>
        </div>

        {/* Thanh công cụ chỉnh tốc độ & điều hướng */}
        <div className="sd-spotlight-controls">
          <div className="sd-speed-presets">
            <span className="sd-speed-label"><Clock size={14} /> Tốc độ:</span>
            {[5, 8, 10, 15].map(s => (
              <button
                key={s}
                className={`sd-speed-btn ${speedSec === s ? 'active' : ''}`}
                onClick={() => { setSpeedSec(s); setProgress(0); }}
                title={`Chiếu ${s} giây / xe`}
              >
                {s}s
              </button>
            ))}
          </div>

          <div className="sd-playback-btns">
            <button
              className="sd-ctrl-nav-btn"
              onClick={handlePrev}
              title="Xe trước đó"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <button
              className={`sd-ctrl-play-btn ${isPlaying ? 'playing' : 'paused'}`}
              onClick={() => setIsPlaying(p => !p)}
              title={isPlaying ? "Tạm dừng chiếu" : "Tiếp tục tự động chiếu"}
            >
              {isPlaying ? <Pause size={17} strokeWidth={2.5} /> : <Play size={17} strokeWidth={2.5} />}
              <span>{isPlaying ? 'Dừng' : 'Chạy'}</span>
            </button>
            <button
              className="sd-ctrl-nav-btn"
              onClick={handleNext}
              title="Xe tiếp theo"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Thanh tiến trình đếm nhịp chuyển xe */}
      <div className="sd-spotlight-progress-track">
        <div
          className="sd-spotlight-progress-bar"
          style={{ width: `${progress}%`, transition: isPlaying ? 'width 0.1s linear' : 'none' }}
        />
      </div>

      {/* 2. BỐ CỤC CHÍNH: CARD CHI TIẾT XE ĐANG CHIẾU (TRÁI) & DANH SÁCH XE (PHẢI) */}
      <div className="sd-repair-cockpit-grid">
        {/* CỘT TRÁI: CARD TRÌNH CHIẾU XE HIỆN TẠI */}
        <div className="sd-spotlight-hero-card">
          <div className="sd-spotlight-glow-aura" />

          {/* Biển số xe & Tên dòng xe */}
          <div className="sd-spotlight-plate-container">
            <div className="sd-spotlight-badge-live">
              <Wrench size={16} className="sd-wrench-spin" />
              <span>ĐANG THAO TÁC SỬA CHỮA</span>
            </div>

            <div className="sd-spotlight-plate-box">
              <span className="sd-spotlight-plate-nation">VN</span>
              <h1 className="sd-spotlight-plate-number">
                {currentCar.BIENSO || 'CHƯA CÓ BIỂN SỐ'}
              </h1>
            </div>

            <p className="sd-spotlight-car-model">
              <Car size={22} />
              <span>{currentCar.PHIENBAN || 'Xe dịch vụ kỹ thuật tiêu chuẩn'}</span>
            </p>
          </div>

          {/* Các thẻ thông số kỹ thuật then chốt */}
          <div className="sd-spotlight-meta-grid">
            <div className="sd-spotlight-meta-card">
              <div className="sd-meta-card-icon user-icon">
                <User size={22} />
              </div>
              <div className="sd-meta-card-body">
                <small>CHỦ XE / KHÁCH HÀNG</small>
                <strong>{currentCar.TEN_KH || 'Khách hàng dịch vụ'}</strong>
                <span>{currentCar.DIENTHOAI ? maskPhone(currentCar.DIENTHOAI) : 'Khách vãn lai'}</span>
              </div>
            </div>

            <div className="sd-spotlight-meta-card">
              <div className="sd-meta-card-icon tech-icon">
                <Wrench size={22} />
              </div>
              <div className="sd-meta-card-body">
                <small>KỸ THUẬT VIÊN PHỤ TRÁCH</small>
                <strong className="text-amber">{currentCar.TEN_KTV || 'Đội ngũ KTV Kazuko'}</strong>
                <span>Cố vấn: {currentCar.TEN_CV || 'Chuyên trách dịch vụ'}</span>
              </div>
            </div>

            <div className="sd-spotlight-meta-card">
              <div className="sd-meta-card-icon time-in-icon">
                <Clock size={22} />
              </div>
              <div className="sd-meta-card-body">
                <small>THỜI GIAN VÀO XƯỞNG</small>
                <strong>{formatDateTime(currentCar.NGAY_VAO || currentCar.NGAY_TRANGTHAI)}</strong>
                <span>Tiếp nhận & kiểm tra</span>
              </div>
            </div>

            <div className="sd-spotlight-meta-card">
              <div className="sd-meta-card-icon time-out-icon">
                <CheckCircle2 size={22} />
              </div>
              <div className="sd-meta-card-body">
                <small>DỰ KIẾN HOÀN THÀNH</small>
                <strong className="text-emerald">
                  {currentCar.NGAY_DUKIEN ? formatDateTime(currentCar.NGAY_DUKIEN) : 'Quy trình chuẩn 5S'}
                </strong>
                <span>Bàn giao & kiểm tra chất lượng</span>
              </div>
            </div>
          </div>

          {/* Hộp nội dung chi tiết & ghi chú kỹ thuật */}
          <div className="sd-spotlight-details-box">
            <div className="sd-spotlight-details-title">
              <ShieldCheck size={18} className="text-orange" />
              <span>NỘI DUNG & HẠNG MỤC SỬA CHỮA</span>
            </div>
            <p className="sd-spotlight-details-text">
              {currentCar.LYDO || currentCar.GHICHU || 'Đang thực hiện quy trình kiểm tra, sửa chữa và thay thế phụ tùng theo phiếu dịch vụ đã duyệt.'}
            </p>
          </div>

          {/* Dải cam kết chuẩn gara */}
          <div className="sd-spotlight-commitment">
            <Sparkles size={16} className="text-amber" />
            <span>KAZUKO AUTO cam kết kiểm soát chất lượng 100% từng hạng mục trước khi bàn giao xe</span>
          </div>
        </div>

        {/* CỘT PHẢI: DANH SÁCH TOÀN BỘ CÁC XE ĐANG SỬA */}
        <aside className="sd-spotlight-queue-sidebar">
          <div className="sd-queue-header">
            <h3>DANH SÁCH XE ĐANG SỬA</h3>
            <span className="sd-queue-badge">{repairingVehicles.length} xe</span>
          </div>

          <div className="sd-queue-list-scroll">
            {repairingVehicles.map((car, idx) => {
              const isActive = idx === currentIndex;
              return (
                <div
                  key={car.ID || idx}
                  className={`sd-queue-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectCar(idx)}
                >
                  <div className="sd-queue-stt">
                    {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                  </div>
                  <div className="sd-queue-info">
                    <div className="sd-queue-plate-row">
                      <strong>{car.BIENSO || 'Chưa có biển'}</strong>
                      {isActive && (
                        <span className="sd-broadcasting-tag">
                          <Activity size={12} /> ĐANG CHIẾU
                        </span>
                      )}
                    </div>
                    <p>{car.PHIENBAN || car.TEN_KH || 'Xe dịch vụ'}</p>
                    <small>KTV: {car.TEN_KTV || 'Đội KTV Kazuko'}</small>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sd-queue-footer-tip">
            <small>Chạm hoặc bấm vào xe bất kỳ để xem chi tiết ngay</small>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function SecondaryDisplayScreen() {
  const { mode } = useParams();
  const settings = useSettings();
  const data = useDisplayData(mode === 'thanh-toan' ? settings.repairId : '');
  const livePayment = useLivePayment(mode === 'thanh-toan');
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  if (!modes[mode]) return <div className="sd-wait"><h1>Không có màn hình này</h1><Link to="/man-hinh-phu">Về quản lý màn hình</Link></div>;
  return (
    <div className={`sd-screen sd-screen-${mode}`} style={{ '--sd-font-scale': fontPercent(settings.fontSizes?.[mode]) / 100 }}>
      <header className="sd-screen-header">
        <div className="sd-header-brand-block">
          <span className="sd-brand-badge-icon"><Car size={28} /></span>
          <div>
            <b>{data.company.CompanyName || 'KAZUKO AUTO'}</b>
            <span className="sd-brand-sub-title">{data.company.CompanyAddress || 'Trung Tâm Chăm Sóc & Sửa Chữa Ô Tô Tiêu Chuẩn'}</span>
          </div>
        </div>
        <div className="sd-header-status-badge">
          <Sparkles size={18} className="sd-sparkle-spin" />
          <span>{modes[mode].title}</span>
        </div>
        <time>{now.toLocaleTimeString('vi-VN')}</time>
        <button title="Toàn màn hình" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
          <Maximize size={22} />
        </button>
      </header>

      {(data.error || livePayment.error) && (
        <div className="sd-error" role="alert">
          {data.error || livePayment.error} · Dữ liệu hiển thị có thể chưa được cập nhật.
        </div>
      )}

      <main>
        {mode === 'quang-cao' ? (
          <Advertisement settings={settings} company={data.company} />
        ) : mode === 'thanh-toan' ? (
          <Payment order={livePayment.order || data.order} loading={!data.loaded} company={data.company} />
        ) : (
          <RepairBoard flows={data.flows} settings={settings} company={data.company} />
        )}
      </main>

      <footer className="sd-screen-footer">
        <div className="sd-footer-ticker-lane">
          <span className="sd-ticker-tag">
            <Heart size={18} className="sd-heart-beat" /> TRI ÂN
          </span>
          <div className="sd-ticker-marquee-track">
            <span className="sd-ticker-marquee-text">
              {settings.ticker || 'KAZUKO AUTO — Cảm ơn quý khách đã tin tưởng và đồng hành! Kính chúc quý khách Thượng lộ bình an — Vạn dặm hanh thông!'}
            </span>
          </div>
        </div>
        <small>{data.updated ? `Đồng bộ ${data.updated.toLocaleTimeString('vi-VN')}` : 'Đang kết nối…'}</small>
      </footer>
    </div>
  );
}

export default function ManHinhPhuPage() {
  const saved = useSettings();
  const [draft, setDraft] = useState(saved);
  const [tab, setTab] = useState('quang-cao');
  const [notice, setNotice] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaKind, setMediaKind] = useState('image');
  const data = useDisplayData(draft.repairId);
  const [orders, setOrders] = useState([]);
  useEffect(() => { let active = true; api.get('/repair-orders').then(({ data }) => { if (active) setOrders(data.data || []); }).catch(() => { if (active) setNotice('Không tải được danh sách phiếu thanh toán.'); }); return () => { active = false; }; }, []);
  const change = (field, value) => { setDraft(previous => ({ ...previous, [field]: value })); setNotice(''); };
  const save = () => { try { localStorage.setItem(key(), JSON.stringify(draft)); window.dispatchEvent(new Event('garage:displays-changed')); setNotice('Đã lưu. Các cửa sổ màn hình phụ trong cùng trình duyệt đã được cập nhật.'); } catch { setNotice('Không lưu được: dung lượng trình duyệt đã đầy. Hãy giảm số ảnh tải lên.'); } };
  const addUrl = () => { try { const parsed = new URL(mediaUrl); if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error(); change('slides', [...draft.slides, { kind: mediaKind, url: parsed.href, title: mediaTitle }]); setMediaUrl(''); setMediaTitle(''); } catch { setNotice('Nhập đường dẫn ảnh hoặc video hợp lệ bắt đầu bằng http hoặc https.'); } };
  const upload = async event => {const file=event.target.files?.[0];event.target.value='';if(!file)return;try{const result=await compressImage(file,imagePolicies.advertising);setDraft(previous=>({...previous,slides:[...previous.slides,{kind:'image',url:result.data,title:file.name}]}));setNotice('');}catch(error){setNotice(error.message);}};
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const repairingCount = (data.flows || []).filter(row => Number(row.TRANGTHAI) === 2).length;

  return <div className="sd-manager"><header className="sd-manager-header"><div className="sd-heading-icon"><Monitor size={26} /></div><div><h1>Màn hình phụ</h1><p>Kết nối trải nghiệm tại quầy với khách hàng của gara</p></div><span className="sd-chip">3 màn hình riêng</span></header>
    <div className="sd-cards">{Object.entries(modes).map(([mode, item], index) => { const Icon = item.icon; return <article className={`sd-card ${item.color} ${tab === mode ? 'selected' : ''}`} key={mode}><div className="sd-card-top"><span><Icon size={20} /></span><small>MÀN HÌNH 0{index + 1}</small></div><h2>{item.title}</h2><p>{item.description}</p><div className="sd-mini">{mode === 'quang-cao' ? <><b>KAZUKO AUTO</b><strong>Chăm sóc xe tận tâm</strong><span>Dịch vụ · Bảo dưỡng · Phụ tùng</span></> : mode === 'thanh-toan' ? <><span>PHIẾU TẠM TÍNH</span><b>{data.order?.BIENSO || 'Chờ chọn phiếu'}</b><strong>{data.order ? money(data.order.invoice?.CONLAI ?? data.order.TONGCONG) : 'Sẵn sàng thanh toán'}</strong></> : <><span>TIẾN ĐỘ SỬA CHỮA</span><strong>{repairingCount} xe đang sửa</strong><span>Chiếu xoay vòng từng xe trực tiếp</span></>}</div><div className="sd-card-actions"><button onClick={() => setTab(mode)}>Thiết lập</button><a href={`/man-hinh-phu/xem/${mode}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={15} />Mở màn hình</a></div></article>; })}</div>
    {notice && <p className="sd-notice" role="status">{notice}</p>}{data.error && <p className="sd-error" role="alert">{data.error}</p>}
    <div className="sd-editor"><nav>{Object.entries(modes).map(([mode, item]) => <button className={tab === mode ? 'active' : ''} key={mode} onClick={() => setTab(mode)}>{item.title}</button>)}</nav><div className="sd-editor-body">
      <div className="sd-font-settings">
        <label>Cỡ chữ màn hình {modes[tab].title.toLowerCase()} (%)
          <input type="number" min="50" max="300" step="10" value={draft.fontSizes?.[tab] ?? 100}
            onFocus={event => event.target.select()}
            onChange={event => change('fontSizes', { ...draft.fontSizes, [tab]: event.target.value === '' ? '' : fontPercent(event.target.value) })}
            onBlur={() => change('fontSizes', { ...draft.fontSizes, [tab]: fontPercent(draft.fontSizes?.[tab]) })} />
        </label>
        <div className="sd-font-presets">{[100, 125, 150, 175, 200].map(percent => <button type="button" key={percent}
          aria-pressed={Number(draft.fontSizes?.[tab] ?? 100) === percent}
          onClick={() => change('fontSizes', { ...draft.fontSizes, [tab]: percent })}>{percent}%</button>)}</div>
        <p className="sd-help">100% là cỡ chữ hiện tại. Chọn riêng cho từng màn hình rồi bấm Lưu thiết lập.</p>
      </div>
      {tab === 'quang-cao' && <><div className="sd-editor-title"><h2>Nội dung quảng cáo</h2><span>Luân phiên ảnh và video</span></div><div className="sd-form-grid"><label>Thông điệp chính<input value={draft.headline} onChange={e => change('headline', e.target.value)} /></label><label>Mô tả ngắn<input value={draft.subtitle} onChange={e => change('subtitle', e.target.value)} /></label><label>Thời gian mỗi nội dung (giây)<input type="number" min="5" max="300" value={draft.seconds} onChange={e => change('seconds', Math.max(5, Math.min(300, Number(e.target.value) || 10)))} /></label><label>Dòng chữ cuối màn hình<input value={draft.ticker} onChange={e => change('ticker', e.target.value)} /></label></div><div className="sd-media-add"><select aria-label="Loại nội dung" value={mediaKind} onChange={e => setMediaKind(e.target.value)}><option value="image">Hình ảnh</option><option value="video">Video</option></select><input aria-label="Đường dẫn quảng cáo" placeholder="Đường dẫn trực tiếp đến ảnh / video" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} /><input aria-label="Tiêu đề quảng cáo" placeholder="Tiêu đề (tùy chọn)" value={mediaTitle} onChange={e => setMediaTitle(e.target.value)} /><button onClick={addUrl}><Plus size={16} />Thêm</button></div><label className="sd-upload">Hoặc tải ảnh từ máy (tự nén ≤ 512 KB, tối đa 1920 px)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} /></label><div className="sd-media-list">{draft.slides.map((slide, index) => <div key={index}><span>{index + 1}</span>{slide.kind === 'image' ? <img src={slide.url} alt="" /> : <Monitor size={28} />}<b>{slide.title || (slide.kind === 'video' ? 'Video quảng cáo' : 'Ảnh quảng cáo')}</b><button aria-label={`Xóa quảng cáo ${index + 1}`} onClick={() => change('slides', draft.slides.filter((_, i) => i !== index))}><Trash2 size={16} /></button></div>)}</div>{!draft.slides.length && <p className="sd-help">Chưa thêm ảnh/video: màn hình sẽ hiện thông điệp thương hiệu KAZUKO AUTO.</p>}</>}
      {tab === 'thanh-toan' && <><div className="sd-editor-title"><h2>Phiếu hiển thị cho khách</h2><span>Cập nhật số tiền mỗi 10 giây</span></div><label className="sd-order-select">Chọn phiếu sửa chữa<select value={draft.repairId} onChange={e => change('repairId', e.target.value)}><option value="">Màn hình chờ — chưa chọn phiếu</option>{orders.map(order => <option key={order.ID} value={order.ID}>{order.NAME} · {order.BIENSO} · {money(order.TONGCONG)}</option>)}</select></label><p className="sd-help">Bấm Lưu thiết lập để gửi phiếu sang màn hình khách. Chọn màn hình chờ sau khi phục vụ xong. QR sẽ được bổ sung khi tài khoản ngân hàng thật kết nối.</p><div className="sd-payment-preview"><Payment order={data.order} loading={!data.loaded} company={data.company} /></div></>}
      {tab === 'sua-chua' && <><div className="sd-editor-title"><h2>Trình chiếu xe đang sửa chữa</h2><span>Tự động chiếu xoay vòng từng xe trong khoang dịch vụ</span></div>
        <div className="sd-form-grid">
          <label>Thời gian chiếu mỗi xe (giây)
            <input type="number" min="3" max="120" value={draft.repairSpeed || 8} onChange={e => change('repairSpeed', Math.max(3, Math.min(120, Number(e.target.value) || 8)))} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28, cursor: 'pointer' }}>
            <input type="checkbox" checked={draft.repairAutoPlay !== false} onChange={e => change('repairAutoPlay', e.target.checked)} style={{ width: 20, height: 20, cursor: 'pointer' }} />
            <span>Tự động chuyển xe xoay vòng liên tục</span>
          </label>
        </div>
        <div className="sd-speed-presets" style={{ marginTop: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>Chọn nhanh:</span>
          {[5, 8, 10, 15, 20].map(sec => (
            <button
              key={sec}
              type="button"
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid #d4dfea',
                background: (draft.repairSpeed || 8) === sec ? '#ea580c' : '#fff',
                color: (draft.repairSpeed || 8) === sec ? '#fff' : '#334155',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              onClick={() => change('repairSpeed', sec)}
            >
              {sec} giây
            </button>
          ))}
        </div>
        <p className="sd-help">Màn hình tự động lọc và chiếu danh sách <strong>{repairingCount} xe đang sửa</strong>. Khách có thể theo dõi tiến độ xe của mình trên TV phòng chờ. Bấm Lưu thiết lập để cập nhật sang TV.</p>
        <div className="sd-board-preview"><RepairBoard flows={data.flows} settings={draft} company={data.company} /></div>
      </>}
    </div><footer><p>{dirty ? 'Có thay đổi chưa lưu' : 'Thiết lập đã đồng bộ trên trình duyệt này'}</p><button disabled={!dirty} onClick={save}><Save size={17} />Lưu thiết lập</button></footer></div><p className="sd-help sd-manager-footnote">Mở từng màn hình bằng nút phía trên, kéo cửa sổ sang màn hình tương ứng rồi bấm Toàn màn hình. Bản hiện tại đồng bộ trong cùng trình duyệt; TV/thiết bị riêng sẽ cần bước kết nối thêm.</p>
  </div>;
}

