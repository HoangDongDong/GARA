export default function PlaceholderPage({ title, icon }) {
  return (
    <div>
      <div className="page-header">
        <h1><span className="page-icon">{icon}</span> {title}</h1>
      </div>
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.3 }}>{icon}</div>
          <h2 style={{ color: '#757575', marginBottom: 8 }}>{title}</h2>
          <p style={{ color: '#9E9E9E' }}>Trang này đang được phát triển. Vui lòng quay lại sau.</p>
        </div>
      </div>
    </div>
  );
}
