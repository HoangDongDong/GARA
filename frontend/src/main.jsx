import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from './App.jsx';
import './styles/global.css';

// Một số màn hình cũ gọi axios trực tiếp thay vì qua service chung.
// Gắn token ở cấp axios mặc định để các request đó vẫn được xác thực.
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('garage_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
