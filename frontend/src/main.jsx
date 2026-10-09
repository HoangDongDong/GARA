import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App.jsx';
import './styles/global.css';
import {sessionToken} from './utils/sessionGuard';
// A different login in another tab must discard forms from the previous store.
window.addEventListener('storage', event => { if(event.key==='garage_token' && event.oldValue!==event.newValue) window.location.reload(); });

// Một số màn hình cũ gọi axios trực tiếp thay vì qua service chung.
// Gắn token ở cấp axios mặc định để các request đó vẫn được xác thực.
axios.interceptors.request.use((config) => {
  const url = new URL(config.url, window.location.origin);
  if (url.origin===window.location.origin && url.pathname.startsWith('/api/')) {
    const token = sessionToken(url.pathname);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
