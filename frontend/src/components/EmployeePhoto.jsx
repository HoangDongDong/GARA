import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { employees } from '../services';

export default function EmployeePhoto({employee, className = '', src}) {
  const url = src === undefined ? Number(employee?.CO_ANHNV) === 1 ? employees.imageUrl(employee) : '' : src;
  const [failedUrl,setFailedUrl] = useState('');
  return <div className={`employee-photo ${className}`}>
    {url && failedUrl !== url ? <img src={url} alt={`Ảnh ${employee?.NAME || 'nhân viên'}`} onError={() => setFailedUrl(url)}/> : <><UserRound aria-hidden="true" size={32}/><span>Chưa có ảnh</span></>}
  </div>;
}
